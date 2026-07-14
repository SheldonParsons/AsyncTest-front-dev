import { randomUUID } from 'node:crypto';
import {
  cloneJson,
  copyMindDocSubtree,
  createMindDocNode,
  createMindDocNodes,
  deleteMindDocNode,
  moveMindDocNode,
  updateMindDocNodeMetadata,
  updateMindDocNodeNote,
  updateMindDocNodeText,
} from './mindContentService.node.js';

const OPERATION_METHODS = {
  update_text: (doc, op) => updateMindDocNodeText(doc, op.nodeId, op.text, op),
  update_note: (doc, op) => updateMindDocNodeNote(doc, op.nodeId, op.note, op),
  update_metadata: (doc, op) => updateMindDocNodeMetadata(doc, op.nodeId, op.metadata, op),
  set_markers: (doc, op) => updateMindDocNodeMetadata(doc, op.nodeId, { markers: op.markers }, op),
  add_marker: (doc, op) => {
    const current = getNode(doc, op.nodeId);
    const markers = new Set(normalizeMarkers(current?.markers ?? current?.markerKeys));
    markers.add(String(op.markerKey || ''));
    markers.delete('');
    return updateMindDocNodeMetadata(doc, op.nodeId, { markers: [...markers] }, op);
  },
  remove_marker: (doc, op) => {
    const current = getNode(doc, op.nodeId);
    const markers = normalizeMarkers(current?.markers ?? current?.markerKeys)
      .filter((marker) => marker !== String(op.markerKey || ''));
    return updateMindDocNodeMetadata(doc, op.nodeId, { markers }, op);
  },
  set_root_secrecy: (doc, op) => updateMindDocNodeMetadata(doc, op.nodeId || getRootNodeId(doc, op.boardId), { secrecy: op.secrecy }, op),
  create_node: (doc, op) => createMindDocNode(doc, op.parentId, op.text, op),
  create_nodes: (doc, op) => createMindDocNodes(doc, op.parentId, op.nodes, op),
  delete_node: (doc, op) => deleteMindDocNode(doc, op.nodeId, op),
  move_node: (doc, op) => moveMindDocNode(doc, op.nodeId, op.newParentId, op.index, op),
  copy_subtree: (doc, op) => copyMindDocSubtree(doc, op.nodeId, op.newParentId, op.index, op),
  update_document_title: (doc, op) => {
    if (!doc.manifest || typeof doc.manifest !== 'object') doc.manifest = {};
    doc.manifest.title = String(op.title ?? '').trim() || '思维导图';
    return { ok: true, title: doc.manifest.title };
  },
  update_board_title: (doc, op) => {
    const board = getBoard(doc, op.boardId);
    if (!board) throw new Error(`Mind board not found: ${op.boardId || '<active>'}`);
    board.title = String(op.title ?? '').trim() || '思维导图';
    return { ok: true, boardId: board.id, title: board.title };
  },
};

function normalizeMarkers(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function getBoard(doc, boardId) {
  const targetBoardId = boardId || doc?.mind?.activeMindId || doc?.mind?.order?.[0];
  return targetBoardId ? doc?.mind?.minds?.[targetBoardId] : null;
}

function getNode(doc, nodeId, boardId) {
  return getBoard(doc, boardId)?.nodes?.[nodeId] ?? null;
}

function getRootNodeId(doc, boardId) {
  const board = getBoard(doc, boardId);
  const rootId = board?.roots?.[0]?.rootId;
  if (!rootId) throw new Error('Root node not found');
  return rootId;
}

function collectNodeState(doc) {
  const state = new Map();
  const boards = doc?.mind?.minds && typeof doc.mind.minds === 'object' ? doc.mind.minds : {};
  for (const [boardId, board] of Object.entries(boards)) {
    const nodes = board?.nodes && typeof board.nodes === 'object' ? board.nodes : {};
    for (const [nodeId, node] of Object.entries(nodes)) {
      state.set(`${boardId}:${nodeId}`, {
        boardId,
        nodeId,
        parentId: node?.parentId ?? null,
        json: JSON.stringify(node),
      });
    }
  }
  return state;
}

export function summarizeMindDocumentChanges(beforeDoc, afterDoc, maxAffectedNodeIds = 24) {
  const before = collectNodeState(beforeDoc);
  const after = collectNodeState(afterDoc);
  const created = [];
  const deleted = [];
  const updated = [];
  const moved = [];

  for (const [key, item] of after) {
    const previous = before.get(key);
    if (!previous) {
      created.push(item.nodeId);
      continue;
    }
    if (previous.parentId !== item.parentId) moved.push(item.nodeId);
    if (previous.json !== item.json) updated.push(item.nodeId);
  }
  for (const [key, item] of before) {
    if (!after.has(key)) deleted.push(item.nodeId);
  }

  const affectedNodeIds = [...new Set([...created, ...updated, ...deleted, ...moved])];
  return {
    created: created.length,
    updated: updated.length,
    deleted: deleted.length,
    moved: moved.length,
    affectedNodeIds: affectedNodeIds.slice(0, maxAffectedNodeIds),
    affectedNodeCount: affectedNodeIds.length,
    truncated: affectedNodeIds.length > maxAffectedNodeIds,
  };
}

function validateOperations(operations) {
  if (!Array.isArray(operations)) throw new Error('operations must be an array');
  if (!operations.length) throw new Error('operations must not be empty');
  if (operations.length > 5000) {
    const error = new Error('operations exceeds the maximum of 5000');
    error.code = 'TOO_MANY_OPERATIONS';
    throw error;
  }
  operations.forEach((operation, index) => {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
      throw new Error(`operations[${index}] must be an object`);
    }
    if (!OPERATION_METHODS[operation.type]) {
      throw new Error(`Unsupported operation type: ${operation.type}`);
    }
  });
}

export function buildMindDocumentTransaction({ beforeDoc, operations, transactionId, includeResults = false }) {
  validateOperations(operations);
  const afterDoc = cloneJson(beforeDoc);
  const results = [];
  for (const operation of operations) {
    results.push(OPERATION_METHODS[operation.type](afterDoc, operation));
  }
  if (!afterDoc.manifest || typeof afterDoc.manifest !== 'object') afterDoc.manifest = {};
  afterDoc.manifest.updatedAt = new Date().toISOString();

  return buildPreparedMindDocumentTransaction({
    beforeDoc,
    afterDoc,
    transactionId,
    appliedCount: operations.length,
    ...(includeResults ? { results } : {}),
  });
}

export function buildPreparedMindDocumentTransaction({
  beforeDoc,
  afterDoc,
  transactionId,
  appliedCount = 1,
  results,
}) {
  const resolvedTransactionId = transactionId || `mind-tx-${randomUUID()}`;
  const changed = summarizeMindDocumentChanges(beforeDoc, afterDoc);
  return {
    transactionId: resolvedTransactionId,
    afterDoc,
    changed,
    appliedCount,
    ...(Array.isArray(results) ? { results } : {}),
  };
}
