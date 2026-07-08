import path from 'node:path';
import { readAmindFile } from '../amind/amindFileService.node.js';
import { readXmindAsAmindDoc } from '../amind/xmindFileService.node.js';

export function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function getActiveBoard(doc, boardId) {
  const mind = doc?.mind;
  const resolvedBoardId = boardId || mind?.activeMindId || mind?.order?.[0];
  const board = resolvedBoardId ? mind?.minds?.[resolvedBoardId] : null;
  if (!board) throw new Error(`Mind board not found: ${resolvedBoardId || '<active>'}`);
  return { boardId: resolvedBoardId, board };
}

export function getNodeText(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text;
  const richText = node.richText;
  if (Array.isArray(richText)) {
    return richText.map((run) => (typeof run?.text === 'string' ? run.text : '')).join('');
  }
  return '';
}

export function getNodeNote(node) {
  if (!node || typeof node !== 'object') return null;
  const note = node.note ?? node.notes ?? node.remark ?? null;
  return typeof note === 'string' ? note : note == null ? null : cloneJson(note);
}

export function getImageSummary(node) {
  const summaries = [];
  if (node?.image && typeof node.image === 'object') {
    summaries.push({
      assetId: node.image.assetId ?? null,
      ext: node.image.ext ?? null,
      width: node.image.w ?? node.image.width ?? null,
      height: node.image.h ?? node.image.height ?? null,
    });
  }
  if (Array.isArray(node?.images)) {
    node.images.forEach((image) => {
      if (!image || typeof image !== 'object') return;
      summaries.push({
        assetId: image.assetId ?? null,
        ext: image.ext ?? null,
        width: image.w ?? image.width ?? null,
        height: image.h ?? image.height ?? null,
      });
    });
  }
  return summaries;
}

function findParentId(board, nodeId) {
  for (const [parentId, parent] of Object.entries(board?.nodes || {})) {
    if (Array.isArray(parent?.children) && parent.children.includes(nodeId)) return parentId;
  }
  return null;
}

export function serializeNode(board, nodeId, options = {}) {
  const node = board?.nodes?.[nodeId];
  if (!node) return null;
  const children = Array.isArray(node.children) ? node.children : [];
  const base = {
    id: nodeId,
    text: getNodeText(node),
    parentId: node.parentId ?? findParentId(board, nodeId),
    childIds: children,
    hasChildren: children.length > 0,
  };
  if (options.includeNotes) base.note = getNodeNote(node);
  if (options.includeImages) {
    const images = getImageSummary(node);
    base.images = images;
    base.imageCount = images.length;
  }
  if (options.includeMetadata) {
    base.metadata = {
      collapsed: !!node.collapsed,
      icon: node.icon ?? null,
      markers: cloneJson(node.markers ?? node.markerKeys ?? null),
      style: cloneJson(node.style ?? null),
      secrecy: cloneJson(node.secrecy ?? null),
      nodeKind: node.nodeKind ?? null,
    };
  }
  return base;
}

export function buildOutlineNode(board, nodeId, depth, maxDepth) {
  const node = board?.nodes?.[nodeId];
  if (!node) return null;
  const result = {
    id: nodeId,
    text: getNodeText(node),
    childCount: Array.isArray(node.children) ? node.children.length : 0,
  };
  if (maxDepth == null || depth < maxDepth) {
    const children = (Array.isArray(node.children) ? node.children : [])
      .map((childId) => buildOutlineNode(board, childId, depth + 1, maxDepth))
      .filter(Boolean);
    if (children.length) result.children = children;
  }
  return result;
}

export function summarizeMindDoc(doc, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const roots = Array.isArray(board.roots) ? board.roots : [];
  return {
    title: doc?.manifest?.title ?? board?.title ?? null,
    boardId,
    nodeCount: Object.keys(board.nodes || {}).length,
    roots: roots.map((root) => buildOutlineNode(board, root.rootId, 0, options.depth)),
  };
}

export function getMindDocNode(doc, nodeId, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = serializeNode(board, nodeId, options);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return { boardId, node };
}

export function getMindDocSubtree(doc, nodeId, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const maxDepth = Number.isInteger(options.depth) ? options.depth : null;
  function walk(currentId, depth) {
    const node = serializeNode(board, currentId, options);
    if (!node) return null;
    if (maxDepth == null || depth < maxDepth) {
      node.children = node.childIds.map((childId) => walk(childId, depth + 1)).filter(Boolean);
    }
    return node;
  }
  const subtree = walk(nodeId, 0);
  if (!subtree) throw new Error(`Node not found: ${nodeId}`);
  return { boardId, subtree };
}

export function getMindDocNodes(doc, nodeIds, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  return {
    boardId,
    nodes: (Array.isArray(nodeIds) ? nodeIds : [])
      .map((nodeId) => serializeNode(board, nodeId, options))
      .filter(Boolean),
  };
}

export function getMindDocChildren(doc, nodeId, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return {
    boardId,
    parentId: nodeId,
    children: (Array.isArray(node.children) ? node.children : [])
      .map((childId) => serializeNode(board, childId, options))
      .filter(Boolean),
  };
}

export function getMindDocParentChain(doc, nodeId, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  if (!board?.nodes?.[nodeId]) throw new Error(`Node not found: ${nodeId}`);
  const chain = [];
  let currentId = nodeId;
  const seen = new Set();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const node = serializeNode(board, currentId, options);
    if (!node) break;
    chain.unshift(node);
    currentId = node.parentId;
  }
  return { boardId, nodeId, chain };
}

export function searchMindDocNodes(doc, query, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const needle = String(query || '').trim();
  if (!needle) throw new Error('query is required');
  const caseSensitive = options.caseSensitive === true;
  const normalizedNeedle = caseSensitive ? needle : needle.toLowerCase();
  const limit = Math.max(1, Math.min(200, Number.parseInt(String(options.limit ?? 50), 10) || 50));
  const results = [];
  for (const [nodeId, node] of Object.entries(board.nodes || {})) {
    const text = getNodeText(node);
    const note = typeof getNodeNote(node) === 'string' ? getNodeNote(node) : '';
    const haystack = caseSensitive ? `${text}\n${note}` : `${text}\n${note}`.toLowerCase();
    if (!haystack.includes(normalizedNeedle)) continue;
    results.push(serializeNode(board, nodeId, {
      includeNotes: options.includeNotes === true,
      includeImages: options.includeImages === true,
      includeMetadata: false,
    }));
    if (results.length >= limit) break;
  }
  return { boardId, query: needle, results };
}

export function findMindDocNodesByFilter(doc, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const textIncludes = String(options.textIncludes || '').trim();
  const noteIncludes = String(options.noteIncludes || '').trim();
  const hasChildren = options.hasChildren;
  const limit = Math.max(1, Math.min(200, Number.parseInt(String(options.limit ?? 50), 10) || 50));
  const results = [];
  for (const [nodeId, node] of Object.entries(board.nodes || {})) {
    const text = getNodeText(node);
    const note = typeof getNodeNote(node) === 'string' ? getNodeNote(node) : '';
    const childCount = Array.isArray(node.children) ? node.children.length : 0;
    if (textIncludes && !text.includes(textIncludes)) continue;
    if (noteIncludes && !note.includes(noteIncludes)) continue;
    if (typeof hasChildren === 'boolean' && (childCount > 0) !== hasChildren) continue;
    results.push(serializeNode(board, nodeId, {
      includeNotes: options.includeNotes === true,
      includeImages: options.includeImages === true,
      includeMetadata: options.includeMetadata === true,
    }));
    if (results.length >= limit) break;
  }
  return { boardId, results };
}

export function outlineToMarkdown(outline) {
  const lines = [];
  function walk(node, depth) {
    if (!node) return;
    lines.push(`${'  '.repeat(depth)}- ${node.text || '(空节点)'}`);
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child, depth + 1));
    }
  }
  (outline?.roots || []).forEach((root) => walk(root, 0));
  return lines.join('\n');
}

function makeNodeId(board, base = 'mcp-node') {
  let index = 1;
  let id = `${base}-${Date.now().toString(36)}-${index}`;
  while (board.nodes?.[id]) {
    index += 1;
    id = `${base}-${Date.now().toString(36)}-${index}`;
  }
  return id;
}

function touchDoc(doc) {
  if (!doc.manifest || typeof doc.manifest !== 'object') doc.manifest = {};
  doc.manifest.updatedAt = new Date().toISOString();
  return doc;
}

function collectSubtreeIds(board, nodeId, result = []) {
  if (!board?.nodes?.[nodeId]) return result;
  result.push(nodeId);
  const children = Array.isArray(board.nodes[nodeId].children) ? board.nodes[nodeId].children : [];
  children.forEach((childId) => collectSubtreeIds(board, childId, result));
  return result;
}

export function updateMindDocNodeText(doc, nodeId, text, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  node.text = String(text ?? '');
  delete node.richText;
  touchDoc(doc);
  return { boardId, ok: true, node: serializeNode(board, nodeId, { includeNotes: true, includeImages: true, includeMetadata: true }) };
}

export function updateMindDocNodeNote(doc, nodeId, note, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  node.note = String(note ?? '');
  touchDoc(doc);
  return { boardId, ok: true, node: serializeNode(board, nodeId, { includeNotes: true, includeImages: true, includeMetadata: true }) };
}

export function updateMindDocNodeMetadata(doc, nodeId, metadata = {}, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  if (metadata && typeof metadata === 'object') {
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined) continue;
      if (key === 'metadata') continue;
      node[key] = cloneJson(value);
    }
  }
  touchDoc(doc);
  return { boardId, ok: true, node: serializeNode(board, nodeId, { includeNotes: true, includeImages: true, includeMetadata: true }) };
}

export function createMindDocNode(doc, parentId, text, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const parent = board?.nodes?.[parentId];
  if (!parent) throw new Error(`Parent node not found: ${parentId}`);
  if (!board.nodes) board.nodes = {};
  const nodeId = makeNodeId(board);
  board.nodes[nodeId] = {
    id: nodeId,
    text: String(text ?? ''),
    parentId,
    children: [],
    images: [],
  };
  if (!Array.isArray(parent.children)) parent.children = [];
  const index = Number.isInteger(options.index) ? Math.max(0, Math.min(options.index, parent.children.length)) : parent.children.length;
  parent.children.splice(index, 0, nodeId);
  touchDoc(doc);
  return { boardId, ok: true, nodeId, node: serializeNode(board, nodeId, { includeNotes: true, includeImages: true, includeMetadata: true }) };
}

function normalizeNodeSpec(spec) {
  if (typeof spec === 'string') return { text: spec };
  return spec && typeof spec === 'object' ? spec : { text: '' };
}

function applyNodeSpecToNode(node, spec) {
  if (spec?.note != null) node.note = String(spec.note);
  if (Array.isArray(spec?.markers)) node.markers = [...new Set(spec.markers.map(String).filter(Boolean))];
  if (spec?.secrecy !== undefined) node.secrecy = spec.secrecy == null ? null : cloneJson(spec.secrecy);
  if (spec?.metadata && typeof spec.metadata === 'object') {
    Object.assign(node, cloneJson(spec.metadata));
  }
}

function countNodeSpecs(nodes) {
  let count = 0;
  for (const rawSpec of Array.isArray(nodes) ? nodes : []) {
    const spec = normalizeNodeSpec(rawSpec);
    count += 1 + countNodeSpecs(spec.children);
  }
  return count;
}

function createMindDocNodeTree(doc, board, parentId, rawSpec, created, idMap, options = {}) {
  const spec = normalizeNodeSpec(rawSpec);
  const result = createMindDocNode(doc, parentId, spec.text ?? spec.title ?? '', { index: spec.index });
  const node = board.nodes[result.nodeId];
  applyNodeSpecToNode(node, spec);
  if (spec.id || spec.sourceId || spec.clientId) idMap[String(spec.id || spec.sourceId || spec.clientId)] = result.nodeId;
  created.push({
    nodeId: result.nodeId,
    parentId,
    text: node.text,
    sourceId: spec.id || spec.sourceId || spec.clientId || null,
  });
  if (Array.isArray(spec.children)) {
    spec.children.forEach((child) => createMindDocNodeTree(doc, board, result.nodeId, child, created, idMap, options));
  }
  return result.nodeId;
}

export function createMindDocNodes(doc, parentId, nodes, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  if (!board?.nodes?.[parentId]) throw new Error(`Parent node not found: ${parentId}`);
  const createdCount = countNodeSpecs(nodes);
  const maxNodes = Math.max(1, Math.min(5000, Number.parseInt(String(options.maxNodes ?? 1000), 10) || 1000));
  if (createdCount > maxNodes) throw new Error(`Too many nodes: ${createdCount}. maxNodes is ${maxNodes}`);
  const created = [];
  const idMap = {};
  const rootNodeIds = [];
  (Array.isArray(nodes) ? nodes : []).forEach((spec) => {
    rootNodeIds.push(createMindDocNodeTree(doc, board, parentId, spec, created, idMap, options));
  });
  touchDoc(doc);
  return {
    boardId,
    ok: true,
    parentId,
    createdCount,
    rootNodeIds,
    idMap,
    created,
    dirty: true,
  };
}

export function deleteMindDocNode(doc, nodeId, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  if ((board.roots || []).some((root) => root.rootId === nodeId)) throw new Error('Cannot delete root node');
  const childIds = Array.isArray(node.children) ? node.children : [];
  if (childIds.length && options.deleteSubtree !== true) throw new Error('Node has children; set deleteSubtree=true');
  const parentId = node.parentId ?? findParentId(board, nodeId);
  const parent = parentId ? board.nodes?.[parentId] : null;
  if (parent && Array.isArray(parent.children)) parent.children = parent.children.filter((id) => id !== nodeId);
  const deletedIds = collectSubtreeIds(board, nodeId, []);
  deletedIds.forEach((id) => delete board.nodes[id]);
  touchDoc(doc);
  return { boardId, ok: true, deletedIds };
}

export function moveMindDocNode(doc, nodeId, newParentId, index, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  const node = board?.nodes?.[nodeId];
  const newParent = board?.nodes?.[newParentId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  if (!newParent) throw new Error(`New parent node not found: ${newParentId}`);
  if ((board.roots || []).some((root) => root.rootId === nodeId)) throw new Error('Cannot move root node');
  if (collectSubtreeIds(board, nodeId, []).includes(newParentId)) throw new Error('Cannot move a node under its own subtree');
  const oldParentId = node.parentId ?? findParentId(board, nodeId);
  const oldParent = oldParentId ? board.nodes?.[oldParentId] : null;
  if (oldParent && Array.isArray(oldParent.children)) oldParent.children = oldParent.children.filter((id) => id !== nodeId);
  if (!Array.isArray(newParent.children)) newParent.children = [];
  const insertIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, newParent.children.length)) : newParent.children.length;
  newParent.children.splice(insertIndex, 0, nodeId);
  node.parentId = newParentId;
  touchDoc(doc);
  return { boardId, ok: true, node: serializeNode(board, nodeId, { includeNotes: true, includeImages: true, includeMetadata: true }) };
}

export function copyMindDocSubtree(doc, nodeId, newParentId, index, options = {}) {
  const { boardId, board } = getActiveBoard(doc, options.boardId);
  if (!board?.nodes?.[nodeId]) throw new Error(`Node not found: ${nodeId}`);
  const newParent = board?.nodes?.[newParentId];
  if (!newParent) throw new Error(`New parent node not found: ${newParentId}`);
  const idMap = new Map();
  function cloneNode(oldId, parentId) {
    const oldNode = board.nodes[oldId];
    const newId = makeNodeId(board, 'mcp-copy');
    idMap.set(oldId, newId);
    const copied = cloneJson(oldNode);
    copied.id = newId;
    copied.parentId = parentId;
    copied.children = [];
    board.nodes[newId] = copied;
    (Array.isArray(oldNode.children) ? oldNode.children : []).forEach((childId) => {
      const childCopyId = cloneNode(childId, newId);
      copied.children.push(childCopyId);
    });
    return newId;
  }
  const rootCopyId = cloneNode(nodeId, newParentId);
  if (!Array.isArray(newParent.children)) newParent.children = [];
  const insertIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, newParent.children.length)) : newParent.children.length;
  newParent.children.splice(insertIndex, 0, rootCopyId);
  touchDoc(doc);
  return { boardId, ok: true, rootCopyId, idMap: Object.fromEntries(idMap.entries()) };
}

function resolveMindFileDoc(filePath) {
  if (!filePath || typeof filePath !== 'string') throw new Error('filePath is required');
  const abs = path.resolve(filePath);
  const ext = path.extname(abs).toLowerCase();
  return { abs, ext };
}

async function readMindFileDoc(filePath) {
  const { abs, ext } = resolveMindFileDoc(filePath);
  const source = ext === '.xmind'
    ? await readXmindAsAmindDoc(abs)
    : await readAmindFile(abs);
  return {
    path: source.path || abs,
    fileType: ext === '.xmind' ? 'xmind' : 'amind',
    doc: source.doc,
  };
}

export async function importMindFileSubtree(targetDoc, params = {}) {
  const source = await readMindFileDoc(params.sourceFilePath);
  const { boardId: sourceBoardId, board: sourceBoard } = getActiveBoard(source.doc, params.sourceBoardId);
  const sourceNodeId = params.sourceNodeId || sourceBoard?.roots?.[0]?.rootId;
  if (!sourceNodeId || !sourceBoard?.nodes?.[sourceNodeId]) {
    throw new Error(`Source node not found: ${sourceNodeId || '<root>'}`);
  }

  const { boardId: targetBoardId, board: targetBoard } = getActiveBoard(targetDoc, params.targetBoardId || params.boardId);
  const targetParentId = params.targetParentId || params.parentId;
  const targetParent = targetParentId ? targetBoard?.nodes?.[targetParentId] : null;
  if (!targetParent) throw new Error(`Target parent node not found: ${targetParentId || '<required>'}`);

  const includeNotes = params.includeNotes !== false;
  const includeImages = params.includeImages === true;
  const idMap = {};
  let importedCount = 0;

  function cloneSourceNode(oldId, parentId, isRoot = false) {
    const oldNode = sourceBoard.nodes[oldId];
    const newId = makeNodeId(targetBoard, 'mcp-import');
    idMap[oldId] = newId;
    const copied = cloneJson(oldNode);
    copied.id = newId;
    copied.parentId = parentId;
    if (isRoot && params.titleOverride != null) {
      copied.text = String(params.titleOverride);
      delete copied.richText;
    } else {
      copied.text = getNodeText(copied);
    }
    if (!includeNotes) {
      delete copied.note;
      delete copied.notes;
      delete copied.remark;
    }
    if (!includeImages) {
      delete copied.image;
      copied.images = [];
    }
    copied.children = [];
    targetBoard.nodes[newId] = copied;
    importedCount += 1;
    (Array.isArray(oldNode.children) ? oldNode.children : []).forEach((childId) => {
      const childCopyId = cloneSourceNode(childId, newId, false);
      copied.children.push(childCopyId);
    });
    return newId;
  }

  const rootNodeId = cloneSourceNode(sourceNodeId, targetParentId, true);
  if (!Array.isArray(targetParent.children)) targetParent.children = [];
  const index = Number.isInteger(params.index) ? Math.max(0, Math.min(params.index, targetParent.children.length)) : targetParent.children.length;
  targetParent.children.splice(index, 0, rootNodeId);
  touchDoc(targetDoc);
  return {
    ok: true,
    sourceFilePath: source.path,
    sourceFileType: source.fileType,
    sourceBoardId,
    sourceNodeId,
    targetBoardId,
    targetParentId,
    rootNodeId,
    importedCount,
    idMap,
    dirty: true,
  };
}

export async function readMindFileContent(filePath, options = {}) {
  const source = await readMindFileDoc(filePath);
  const doc = source.doc;
  let mode = options.mode || 'outline';
  if (!options.mode && options.nodeId && options.depth !== undefined) mode = 'subtree';
  if (!options.mode && options.query) mode = 'search';
  const common = {
    filePath: source.path,
    fileType: source.fileType,
    title: doc?.manifest?.title ?? null,
  };
  if (mode === 'rawJson') return { ...common, doc };
  if (mode === 'node') return { ...common, ...getMindDocNode(doc, options.nodeId, options) };
  if (mode === 'subtree') return { ...common, ...getMindDocSubtree(doc, options.nodeId, options) };
  if (mode === 'search') return { ...common, ...searchMindDocNodes(doc, options.query, options) };
  const outline = summarizeMindDoc(doc, options);
  if (options.format === 'markdown') return { ...common, markdown: outlineToMarkdown(outline), outline };
  return { ...common, outline };
}
