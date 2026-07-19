import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { getAsyncTestMindMcpCapabilities } from './asynctest-mind-mcp.mjs';
import {
  assertMindAgentControlEnabled,
  beginMindAgentExecution,
  endMindAgentSession,
  endMindAgentExecution,
  getMindAgentControlState,
  pruneExpiredMindAgentSessions,
  registerMindAgentClient,
  requestMindAgentControlRestore,
  subscribeMindAgentControl,
  touchMindAgentSession,
  unregisterMindAgentClient,
} from './mindAgentControlManager.node.js';
import {
  beginMindMcpDiagnostic,
  finishMindMcpDiagnostic,
  getMindMcpDiagnostics,
  recordMindMcpDiagnosticPhase,
} from './mindMcpDiagnostics.node.js';
import { assertMindMcpIdentityCompatible, normalizeMindMcpError } from './mindMcpProtocol.node.js';
import {
  isMindWindowWriteMethod,
  resolveMindExecutionWindowKey,
  resolveMindWriteWindowKey,
} from './mindWindowTargeting.node.js';
import {
  buildMindDocumentTransaction,
  buildPreparedMindDocumentTransaction,
  summarizeMindDocumentChanges,
} from './mindTransactionService.node.js';
import {
  assertMindOperationActive,
  beginMindOperation,
  completeMindOperation,
  failMindOperation,
  getMindChangedSummary,
  getMindOperationStatus,
} from './mindOperationManager.node.js';
import {
  cloneJson,
  copyMindDocSubtree,
  createMindDocNode,
  createMindDocNodes,
  deleteMindDocNode,
  findMindDocNodesByFilter,
  getActiveBoard,
  getMindDocChildren,
  getMindDocNode,
  getMindDocNodes,
  getMindDocParentChain,
  getMindDocSubtree,
  getMindBoardNodeStatistics,
  importMindFileSubtree,
  moveMindDocNode,
  outlineToMarkdown,
  readMindFileContent,
  searchMindDocNodes,
  summarizeMindDoc,
  updateMindDocNodeMetadata,
  updateMindDocNodeNote,
  updateMindDocNodeText,
} from './mindContentService.node.js';

const FILE_BRIDGE_POLL_MS = 120;
const FILE_BRIDGE_MAX_AGE_MS = 30000;
const RENDERER_REQUEST_TIMEOUT_MS = 30000;
const pendingRendererRequests = new Map();
const openDocumentSelections = new Map();

export function getAsyncTestMindBridgeEndpoint() {
  return getAsyncTestMindBridgeEndpoints()[0];
}

export function getAsyncTestMindBridgeEndpoints() {
  if (process.platform === 'win32') {
    return [
      { type: 'pipe', path: '\\\\.\\pipe\\asynctest-mind-mcp' },
      { type: 'tcp', host: '127.0.0.1', port: 37651 },
    ];
  }
  const baseDir = process.platform === 'darwin' ? '/private/tmp' : os.tmpdir();
  return [
    { type: 'socket', path: path.join(baseDir, 'asynctest-mind-mcp.sock') },
    { type: 'tcp', host: '127.0.0.1', port: 37651 },
  ];
}

function toErrorPayload(error) {
  const code = error?.code || classifyBridgeError(error);
  return normalizeMindMcpError({
    code,
    message: error instanceof Error ? error.message : String(error || 'Unknown error'),
    recoverable: error?.recoverable ?? isRecoverableBridgeErrorCode(code),
    retryAllowed: error?.retryAllowed,
    suggestedAction: error?.suggestedAction || getBridgeErrorSuggestedAction(code),
    details: error?.details,
  }, code === 'UNKNOWN_ERROR' ? 'INTERNAL_ERROR' : code);
}

function classifyBridgeError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/not ready/i.test(message)) return 'BRIDGE_NOT_READY';
  if (/window.*not found|Mind window not found|Not a Mind window/i.test(message)) return 'WINDOW_NOT_FOUND';
  if (/needSaveAs|need save as|filePath is required/i.test(message)) return 'NEED_SAVE_AS';
  if (/close mode.*required|mode.*required/i.test(message)) return 'CLOSE_MODE_REQUIRED';
  if (/permission|EACCES|EPERM/i.test(message)) return 'FILE_PERMISSION_DENIED';
  if (/already exists/i.test(message)) return 'FILE_ALREADY_EXISTS';
  if (/required|invalid/i.test(message)) return 'INVALID_ARGUMENT';
  return 'INTERNAL_ERROR';
}

function isRecoverableBridgeErrorCode(code) {
  return [
    'APP_NOT_RUNNING',
    'BRIDGE_NOT_READY',
    'NEED_SAVE_AS',
    'CLOSE_MODE_REQUIRED',
    'WINDOW_NOT_FOUND',
    'FILE_ALREADY_EXISTS',
    'FILE_PERMISSION_DENIED',
    'INVALID_ARGUMENT',
    'REVISION_MISMATCH',
    'USER_STOPPED',
    'OPERATION_IN_PROGRESS',
    'MCP_CONTROL_REVOKED',
    'MCP_CLIENT_ID_REQUIRED',
    'AMBIGUOUS_WINDOW',
  ].includes(code);
}

function getBridgeErrorSuggestedAction(code) {
  switch (code) {
    case 'APP_NOT_RUNNING':
    case 'BRIDGE_NOT_READY':
      return 'Open AsyncTest and retry.';
    case 'NEED_SAVE_AS':
      return 'Call mind_save_as_document with a target filePath. Do not close the window unless the user explicitly asks.';
    case 'CLOSE_MODE_REQUIRED':
      return 'Only call mind_close_window when the user explicitly asks to close a window, and pass mode as save, discard, or prompt.';
    case 'WINDOW_NOT_FOUND':
      return 'Call mind_list_windows and choose an existing windowKey.';
    case 'AMBIGUOUS_WINDOW':
      return 'Call mind_list_windows, choose the intended windowKey, then retry the write with that explicit windowKey.';
    case 'FILE_ALREADY_EXISTS':
      return 'Pass overwrite=true or choose another filePath.';
    case 'FILE_PERMISSION_DENIED':
      return 'Choose a writable filePath.';
    case 'INVALID_ARGUMENT':
      return 'Check required parameters and retry.';
    case 'REVISION_MISMATCH':
      return 'Read the latest document state, then retry with the current revision.';
    case 'USER_STOPPED':
      return 'Do not call AsyncTest Mind write tools again until the user explicitly resumes in AsyncTest.';
    case 'OPERATION_IN_PROGRESS':
      return 'Wait for the current AsyncTest Mind operation to finish or be stopped by the user.';
    default:
      return null;
  }
}

function getFileBridgeDir() {
  return path.join(os.tmpdir(), 'asynctest-mind-mcp-bridge');
}

async function appendBridgeLog(message, detail) {
  try {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      pid: process.pid,
      message,
      ...(detail === undefined ? {} : { detail }),
    });
    await fsp.appendFile(path.join(os.tmpdir(), 'asynctest-mind-bridge.log'), `${line}\n`, 'utf8');
  } catch {
    // Bridge logging must never break app startup.
  }
}

function isPathInside(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function listMindWindows({ amindMain, windowManager }) {
  const docs = amindMain?.docStore?.entries?.() || [];
  return docs
    .map(([docId, entry]) => {
      const windowKey = entry?.windowKey || null;
      const win = windowKey ? windowManager.get(windowKey) : null;
      if (!windowKey || !win) return null;
      const doc = entry?.doc || null;
      const activeBoardId = doc?.mind?.activeMindId;
      const board = activeBoardId ? doc?.mind?.minds?.[activeBoardId] : null;
      const nodeStatistics = getMindBoardNodeStatistics(board);
      return {
        docId,
        windowKey,
        filePath: entry?.filePath || null,
        title: doc?.manifest?.title ?? board?.title ?? win.getTitle(),
        windowTitle: win.getTitle(),
        dirty: null,
        isDirty: null,
        isSaving: null,
        isUnsaved: !entry?.filePath,
        ...nodeStatistics,
        focused: win.isFocused(),
        minimized: win.isMinimized(),
      };
    })
    .filter(Boolean);
}

async function listMindWindowsDetailed(context) {
  const windows = listMindWindows(context);
  if (context?.includeRuntimeState !== true) return windows;
  return await Promise.all(
    windows.map(async (item) => {
      try {
        const detail = await requestMindRenderer(context, 'mind.getWindowDocument', { windowKey: item.windowKey });
        return {
          ...item,
          title: detail?.title ?? item.title,
          dirty: typeof detail?.isDirty === 'boolean' ? detail.isDirty : item.dirty,
          isDirty: typeof detail?.isDirty === 'boolean' ? detail.isDirty : item.isDirty,
          isSaving: typeof detail?.isSaving === 'boolean' ? detail.isSaving : item.isSaving,
        };
      } catch {
        return item;
      }
    })
  );
}

async function closeMindWindow({ windowManager }, windowKey) {
  if (!windowKey || typeof windowKey !== 'string') {
    throw new Error('windowKey is required');
  }
  if (!windowKey.startsWith('mind:')) {
    throw new Error(`Not a Mind window: ${windowKey}`);
  }
  return await windowManager.requestManagedClose(windowKey, {
    source: 'mcp',
    forceSaveBeforeClose: true,
  });
}

async function closeMindWindowWithPolicy(context, params = {}) {
  const windowKey = params.windowKey;
  if (!windowKey || typeof windowKey !== 'string') throw new Error('windowKey is required');
  if (!windowKey.startsWith('mind:')) throw new Error(`Not a Mind window: ${windowKey}`);
  const mode = params.mode || (params.save === true ? 'save' : params.discard === true ? 'discard' : null);
  if (!['save', 'discard', 'prompt'].includes(mode)) {
    const error = new Error('close mode is required: save, discard, or prompt');
    error.code = 'CLOSE_MODE_REQUIRED';
    throw error;
  }
  const docs = context.amindMain?.docStore?.entries?.() || [];
  const match = docs.find(([, entry]) => entry?.windowKey === windowKey);
  if (!match) throw new Error(`Mind window not found: ${windowKey}`);
  const [docId, entry] = match;
  if (mode === 'prompt') {
    try {
      const detail = await requestMindRenderer(context, 'mind.getWindowDocument', { windowKey });
      if (detail?.isDirty === true) {
        return { ok: false, needDecision: true, windowKey, docId, reason: 'dirty' };
      }
    } catch {
      return { ok: false, needDecision: true, windowKey, docId, reason: 'unknownDirtyState' };
    }
  }
  if (mode === 'save') {
    if (!entry.filePath) {
      const error = new Error('Document needs save-as before closing');
      error.code = 'NEED_SAVE_AS';
      throw error;
    }
    await saveOpenMindRendererDocument(context, { docId, entry, windowKey });
  }
  const closed = await context.windowManager.requestManagedClose(windowKey, {
    source: 'mcp',
    forceSaveBeforeClose: mode === 'save',
    discardChanges: mode === 'discard',
  });
  return { ok: closed, windowKey, docId, mode, saved: mode === 'save', discarded: mode === 'discard' };
}

function resolveWindowKeyFromParams(context, params = {}) {
  if (typeof params.windowKey === 'string' && params.windowKey) return params.windowKey;
  const windows = listMindWindows(context);
  const focused = windows.find((item) => item.focused);
  if (focused?.windowKey) return focused.windowKey;
  if (windows.length === 1) return windows[0].windowKey;
  throw new Error('windowKey is required when zero or multiple Mind windows are open');
}

function getOpenMindEntry(context, params = {}) {
  const windowKey = resolveWindowKeyFromParams(context, params);
  const docs = context.amindMain?.docStore?.entries?.() || [];
  const match = docs.find(([, entry]) => entry?.windowKey === windowKey);
  if (!match) throw new Error(`Mind document not found for window: ${windowKey}`);
  const [docId, entry] = match;
  return { docId, entry, windowKey };
}

function updateOpenWindowTitle(context, windowKey, entry) {
  const win = context.windowManager.get(windowKey);
  if (!win) return;
  const label = entry?.filePath
    ? `AsyncTest Mind - ${path.basename(entry.filePath)}`
    : 'AsyncTest Mind';
  win.setTitle(label);
}

function notifyMindOperation(context, windowKey, payload) {
  const win = context.windowManager.get(windowKey);
  if (!win || win.isDestroyed()) return;
  win.webContents.send('mind:mcp-operation', payload);
}

async function syncOpenMindEntryFromRenderer(context, openEntry, traceId = null) {
  const { docId, entry, windowKey } = openEntry;
  const snapshot = await requestMindRenderer(context, 'mind.getSaveSnapshot', { windowKey, mcpTraceId: traceId });
  if (!snapshot?.doc || typeof snapshot.doc !== 'object') {
    throw new Error('Mind renderer did not return a document snapshot for saving');
  }
  context.amindMain.docStore.setDoc(docId, snapshot.doc);
  entry.doc = context.amindMain.docStore.mustGet(docId).doc;
  return snapshot;
}

async function saveOpenMindRendererDocument(context, openEntry, traceId = null) {
  const { docId, entry, windowKey } = openEntry;
  if (!entry.filePath) return { ok: false, needSaveAs: true, docId, filePath: null };
  const startedAt = performance.now();
  const result = await requestMindRenderer(context, 'mind.saveDocument', { windowKey, mcpTraceId: traceId });
  recordMindMcpDiagnosticPhase(traceId, 'saveMs', performance.now() - startedAt);
  if (result?.ok !== true) {
    throw new Error('AsyncTest Mind window failed to save the current document');
  }
  const latestEntry = context.amindMain.docStore.mustGet(docId);
  entry.filePath = latestEntry.filePath;
  entry.doc = latestEntry.doc;
  return {
    ok: true,
    needSaveAs: false,
    docId,
    filePath: latestEntry.filePath ?? result.filePath ?? null,
    savedAt: latestEntry.doc?.manifest?.updatedAt ?? result.savedAt ?? null,
    title: latestEntry.doc?.manifest?.title ?? result.title ?? null,
  };
}

async function saveOpenMindEntryAs(context, openEntry, params = {}) {
  const { docId, entry } = openEntry;
  const startedAt = performance.now();
  await syncOpenMindEntryFromRenderer(context, openEntry, params.mcpTraceId);
  const result = await context.amindMain.saveAsDocument({
    docId,
    filePath: params.filePath,
    doc: entry.doc,
    overwrite: params.overwrite !== false,
  });
  entry.filePath = result.filePath;
  entry.doc = context.amindMain.docStore.mustGet(docId).doc;
  updateOpenWindowTitle(context, entry.windowKey, entry);
  recordMindMcpDiagnosticPhase(params.mcpTraceId, 'saveMs', performance.now() - startedAt);
  return result;
}

function assertMindExpectedRevision(snapshot, params = {}) {
  const expectedRevision = params.expectedRevision == null ? null : String(params.expectedRevision);
  if (expectedRevision != null && expectedRevision !== String(snapshot.revision)) {
    const error = new Error(`Document revision mismatch. Expected ${expectedRevision}, current ${snapshot.revision}`);
    error.code = 'REVISION_MISMATCH';
    throw error;
  }
}

async function commitPreparedMindTransaction(context, openEntry, transaction, snapshot, params = {}) {
  const { docId, entry, windowKey } = openEntry;
  if (params.dryRun === true) {
    const result = {
      ok: true,
      dryRun: true,
      transactionId: transaction.transactionId,
      windowKey,
      docId,
      appliedCount: transaction.appliedCount,
      changed: transaction.changed,
      dirty: snapshot.isDirty === true,
      revision: String(snapshot.revision),
    };
    if (params.includeResults === true) result.results = transaction.results;
    return result;
  }
  const operation = beginMindOperation({
    windowKey,
    transactionId: transaction.transactionId,
    clientId: params.mcpClientId,
    totalCount: transaction.changed.affectedNodeCount || transaction.appliedCount,
  });
  notifyMindOperation(context, windowKey, {
    status: 'running',
    transactionId: operation.transactionId,
    totalCount: operation.totalCount,
    completedCount: 0,
    currentNodeId: null,
  });
  try {
    assertMindOperationActive(operation);
    const committed = await requestMindRenderer(context, 'mind.commitDocumentTransaction', {
      windowKey,
      mcpTraceId: params.mcpTraceId,
      transactionId: transaction.transactionId,
      expectedRevision: snapshot.revision,
      afterDoc: transaction.afterDoc,
      changed: transaction.changed,
      totalCount: operation.totalCount,
    });
    entry.doc = context.amindMain.docStore.mustGet(docId).doc;
    const saved = params.saveAfterApply === true
      ? await saveOpenMindRendererDocument(context, openEntry, params.mcpTraceId)
      : null;
    const result = {
      ok: true,
      transactionId: transaction.transactionId,
      windowKey,
      docId,
      appliedCount: transaction.appliedCount,
      changed: transaction.changed,
      dirty: params.saveAfterApply !== true,
      revision: committed.revision,
      saved,
    };
    if (params.includeOperationResult === true && transaction.results?.[0]) {
      Object.assign(result, transaction.results[0]);
    } else if (params.includeResults === true) {
      result.results = transaction.results;
    }
    completeMindOperation(operation, result);
    notifyMindOperation(context, windowKey, {
      status: 'completed',
      transactionId: operation.transactionId,
      totalCount: operation.totalCount,
      completedCount: operation.totalCount,
      currentNodeId: null,
    });
    return result;
  } catch (error) {
    let partialChanged = null;
    if (error?.code === 'USER_STOPPED') {
      entry.doc = context.amindMain.docStore.mustGet(docId).doc;
      partialChanged = summarizeMindDocumentChanges(snapshot.doc, entry.doc);
      error.details = {
        ...(error.details && typeof error.details === 'object' ? error.details : {}),
        changed: partialChanged,
      };
    }
    failMindOperation(operation, error, {
      changed: partialChanged,
      plannedChanged: transaction.changed,
      appliedCount: transaction.appliedCount,
      completedCount: error?.details?.completedCount,
      skippedCount: error?.details?.skippedCount,
      revision: error?.details?.revision,
    });
    notifyMindOperation(context, windowKey, {
      status: error?.code === 'USER_STOPPED' ? 'stopped' : 'failed',
      transactionId: operation.transactionId,
      totalCount: operation.totalCount,
      completedCount: operation.completedCount,
      currentNodeId: operation.currentNodeId,
      errorMessage: error instanceof Error ? error.message : String(error || 'Unknown error'),
    });
    throw error;
  }
}

async function commitMindOperations(context, openEntry, operations, params = {}) {
  const snapshot = await requestMindRenderer(context, 'mind.getTransactionSnapshot', {
    windowKey: openEntry.windowKey,
    mcpTraceId: params.mcpTraceId,
  });
  assertMindExpectedRevision(snapshot, params);
  const computeStartedAt = performance.now();
  const transaction = buildMindDocumentTransaction({
    beforeDoc: snapshot.doc,
    operations,
    transactionId: params.transactionId,
    includeResults: params.includeResults === true || params.includeOperationResult === true,
  });
  recordMindMcpDiagnosticPhase(params.mcpTraceId, 'transactionComputeMs', performance.now() - computeStartedAt);
  return await commitPreparedMindTransaction(context, openEntry, transaction, snapshot, params);
}

async function handleOpenMindDocumentRequest(context, method, params = {}) {
  const openEntry = getOpenMindEntry(context, params);
  const { docId, entry, windowKey } = openEntry;
  const doc = entry.doc;
  switch (method) {
    case 'mind.getWindowDocument':
      const summary = summarizeMindDoc(doc, params);
      return {
        docId,
        windowKey,
        filePath: entry.filePath ?? null,
        title: doc?.manifest?.title ?? null,
        isUnsaved: !entry.filePath,
        dirty: null,
        isDirty: null,
        isSaving: null,
        nodeCount: summary.nodeCount,
      };
    case 'mind.getDocumentOutline':
      return { windowKey, ...summarizeMindDoc(doc, params) };
    case 'mind.getNode':
      return { windowKey, ...getMindDocNode(doc, params.nodeId, params) };
    case 'mind.getNodes':
      return { windowKey, ...getMindDocNodes(doc, params.nodeIds, params) };
    case 'mind.getSubtree':
      return { windowKey, ...getMindDocSubtree(doc, params.nodeId, params) };
    case 'mind.getParentChain':
      return { windowKey, ...getMindDocParentChain(doc, params.nodeId, params) };
    case 'mind.getChildren':
      return { windowKey, ...getMindDocChildren(doc, params.nodeId, params) };
    case 'mind.searchNodes':
      return { windowKey, ...searchMindDocNodes(doc, params.query, params) };
    case 'mind.findNodesByFilter':
      return { windowKey, ...findMindDocNodesByFilter(doc, params) };
    case 'mind.getSelection':
      return { windowKey, ...(openDocumentSelections.get(windowKey) || { nodeIds: [], primaryId: null }) };
    case 'mind.setSelection': {
      const nodeIds = Array.isArray(params.nodeIds) ? params.nodeIds : [];
      const primaryId = params.primaryId ?? nodeIds[nodeIds.length - 1] ?? null;
      const selection = { nodeIds, primaryId };
      openDocumentSelections.set(windowKey, selection);
      return { ok: true, windowKey, ...selection };
    }
    case 'mind.updateNodeText': {
      return await commitMindOperations(context, openEntry, [{ type: 'update_text', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.updateNodeNote': {
      return await commitMindOperations(context, openEntry, [{ type: 'update_note', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.updateNodeMetadata': {
      return await commitMindOperations(context, openEntry, [{ type: 'update_metadata', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.createNode': {
      return await commitMindOperations(context, openEntry, [{ type: 'create_node', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.createNodes': {
      return await commitMindOperations(context, openEntry, [{ type: 'create_nodes', ...params }], {
        ...params,
        includeOperationResult: params.includeCreated === true,
      });
    }
    case 'mind.deleteNode': {
      return await commitMindOperations(context, openEntry, [{ type: 'delete_node', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.moveNode': {
      return await commitMindOperations(context, openEntry, [{ type: 'move_node', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.copySubtree': {
      return await commitMindOperations(context, openEntry, [{ type: 'copy_subtree', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.applyNodeOperations': {
      const operations = Array.isArray(params.operations) ? params.operations : [];
      return await commitMindOperations(context, openEntry, operations, params);
    }
    case 'mind.saveDocument': {
      return await saveOpenMindRendererDocument(context, openEntry, params.mcpTraceId);
    }
    case 'mind.saveAsDocument': {
      const saved = await saveOpenMindEntryAs(context, openEntry, params);
      const rendererState = await requestMindRenderer(context, 'mind.applySaveResult', {
        windowKey,
        mcpTraceId: params.mcpTraceId,
        filePath: saved.filePath,
        savedAt: saved.savedAt,
        title: saved.title,
      });
      return { ...saved, windowKey, dirty: rendererState?.isDirty === true };
    }
    case 'mind.updateDocumentTitle': {
      return await commitMindOperations(context, openEntry, [{ type: 'update_document_title', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.updateBoardTitle': {
      return await commitMindOperations(context, openEntry, [{ type: 'update_board_title', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.setNodeMarkers': {
      return await commitMindOperations(context, openEntry, [{ type: 'set_markers', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.addNodeMarker': {
      return await commitMindOperations(context, openEntry, [{ type: 'add_marker', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.removeNodeMarker': {
      return await commitMindOperations(context, openEntry, [{ type: 'remove_marker', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.setRootSecrecy': {
      return await commitMindOperations(context, openEntry, [{ type: 'set_root_secrecy', ...params }], {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.readOpenDocument': {
      const mode = params.mode || 'outline';
      if (mode === 'rawJson') return { docId, windowKey, filePath: entry.filePath ?? null, doc: cloneJson(doc) };
      if (mode === 'node') return { docId, windowKey, filePath: entry.filePath ?? null, ...getMindDocNode(doc, params.nodeId, params) };
      if (mode === 'subtree') return { docId, windowKey, filePath: entry.filePath ?? null, ...getMindDocSubtree(doc, params.nodeId, params) };
      if (mode === 'search') return { docId, windowKey, filePath: entry.filePath ?? null, ...searchMindDocNodes(doc, params.query, params) };
      const outline = summarizeMindDoc(doc, params);
      if (params.format === 'markdown') return { docId, windowKey, filePath: entry.filePath ?? null, markdown: outlineToMarkdown(outline), outline };
      return { docId, windowKey, filePath: entry.filePath ?? null, outline };
    }
    case 'mind.importFileSubtree': {
      const snapshot = await requestMindRenderer(context, 'mind.getTransactionSnapshot', {
        windowKey,
        mcpTraceId: params.mcpTraceId,
      });
      assertMindExpectedRevision(snapshot, params);
      const computeStartedAt = performance.now();
      const afterDoc = cloneJson(snapshot.doc);
      const importResult = await importMindFileSubtree(afterDoc, params);
      if (params.includeIdMap !== true) delete importResult.idMap;
      const transaction = buildPreparedMindDocumentTransaction({
        beforeDoc: snapshot.doc,
        afterDoc,
        transactionId: params.transactionId,
        appliedCount: 1,
        results: [importResult],
      });
      recordMindMcpDiagnosticPhase(params.mcpTraceId, 'transactionComputeMs', performance.now() - computeStartedAt);
      return await commitPreparedMindTransaction(context, openEntry, transaction, snapshot, {
        ...params,
        includeOperationResult: true,
      });
    }
    case 'mind.exportDocument': {
      const format = params.format || 'outline';
      if (format === 'rawJson') return { windowKey, doc: cloneJson(doc) };
      const outline = summarizeMindDoc(doc, params);
      if (format === 'markdown') return { windowKey, markdown: outlineToMarkdown(outline) };
      return { windowKey, outline };
    }
    default:
      throw new Error(`Unsupported open Mind document method: ${method}`);
  }
}

async function requestMindRenderer(context, method, params = {}) {
  const windowKey = resolveWindowKeyFromParams(context, params);
  const win = context.windowManager.get(windowKey);
  if (!win) throw new Error(`Mind window not found: ${windowKey}`);
  const requestId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = performance.now();
  try {
    return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRendererRequests.delete(requestId);
      reject(new Error(`Timed out waiting for Mind window response: ${method}`));
    }, RENDERER_REQUEST_TIMEOUT_MS);
    pendingRendererRequests.set(requestId, { windowKey, resolve, reject, timer });
    win.webContents.send('mind:mcp-request', { requestId, method, params: { ...params, windowKey } });
    });
  } finally {
    recordMindMcpDiagnosticPhase(params?.mcpTraceId, 'rendererMs', performance.now() - startedAt);
  }
}

export function handleMindMcpRendererResponse(senderWindowKey, payload = {}) {
  const requestId = payload?.requestId;
  const pending = requestId ? pendingRendererRequests.get(requestId) : null;
  if (!pending) return false;
  if (senderWindowKey && pending.windowKey !== senderWindowKey) return false;
  clearTimeout(pending.timer);
  pendingRendererRequests.delete(requestId);
  if (payload.ok) {
    pending.resolve(payload.result);
  } else {
    const error = new Error(payload.error?.message || 'Mind renderer request failed');
    if (payload.error?.code) error.code = payload.error.code;
    if (typeof payload.error?.recoverable === 'boolean') error.recoverable = payload.error.recoverable;
    if (typeof payload.error?.retryAllowed === 'boolean') error.retryAllowed = payload.error.retryAllowed;
    if (payload.error?.suggestedAction) error.suggestedAction = payload.error.suggestedAction;
    if (payload.error?.details) error.details = payload.error.details;
    pending.reject(error);
  }
  return true;
}

async function handleMindBridgeRequest(context, method, params = {}) {
  const { amindMain, windowManager } = context;
  if (!amindMain || !windowManager) throw new Error('AsyncTest Mind is not ready');

  if (method === 'mind.controlStatus') return getMindAgentControlState();
  if (method === 'mind.endAgentSession') {
    return endMindAgentSession(params?.mcpClientId, params?.reason || 'agent-finished');
  }
  if (method === 'mind.requestControlRestore') {
    return requestMindAgentControlRestore(params?.mcpClientId);
  }
  if (method === 'mind.touchAgentSession') {
    return touchMindAgentSession({
      clientId: params?.mcpClientId,
      toolName: params?.mcpToolName || method,
      identity: params?.mcpIdentity,
    });
  }
  if (method === 'mind.registerMcpClient') {
    return registerMindAgentClient({
      clientId: params?.mcpClientId,
      toolName: 'initialize',
      identity: params?.mcpIdentity,
      establishSession: params?.establishSession !== false,
    });
  }
  if (method === 'mind.unregisterMcpClient') {
    return unregisterMindAgentClient(params?.mcpClientId, params?.reason || 'transport-closed');
  }
  assertMindAgentControlEnabled();
  if (method === 'mind.capabilities') {
    touchMindAgentSession({
      clientId: params?.mcpClientId,
      toolName: params?.mcpToolName || method,
      identity: params?.mcpIdentity,
    });
    return getAsyncTestMindMcpCapabilities();
  }
  try {
    assertMindMcpIdentityCompatible(params?.mcpIdentity);
  } catch (error) {
    touchMindAgentSession({
      clientId: params?.mcpClientId,
      toolName: params?.mcpToolName || method,
      identity: params?.mcpIdentity,
    });
    throw error;
  }
  let targetWindowKey = null;
  if (isMindWindowWriteMethod(method)) {
    targetWindowKey = resolveMindWriteWindowKey(params, listMindWindows(context));
    params = { ...params, windowKey: targetWindowKey };
  }
  const traceId = params?.mcpTraceId || `${params?.mcpClientId || 'unknown'}:${Date.now()}`;
  params = { ...params, mcpTraceId: traceId };
  beginMindMcpDiagnostic({
    traceId,
    toolName: params?.mcpToolName,
    method,
    windowKey: targetWindowKey,
  });
  const executionWindowKey = targetWindowKey || resolveMindExecutionWindowKey(method, params, listMindWindows(context));
  beginMindAgentExecution({
    clientId: params?.mcpClientId,
    toolName: params?.mcpToolName || method,
    traceId,
    windowKey: executionWindowKey,
    locksWindow: !!targetWindowKey,
    identity: params?.mcpIdentity,
  });

  let requestError = null;
  try {
    switch (method) {
    case 'mind.diagnostics':
      return getMindMcpDiagnostics(params || {});

    case 'mind.operationStatus': {
      const windowKey = params?.windowKey || resolveWindowKeyFromParams(context, params || {});
      return getMindOperationStatus(windowKey);
    }

    case 'mind.changedSummary': {
      const windowKey = params?.windowKey || (!params?.transactionId ? resolveWindowKeyFromParams(context, params || {}) : null);
      const summary = getMindChangedSummary({ transactionId: params?.transactionId, windowKey });
      if (!summary) {
        const error = new Error('No completed AsyncTest Mind transaction summary found.');
        error.code = 'TRANSACTION_NOT_FOUND';
        throw error;
      }
      return summary;
    }

    case 'mind.status':
      return {
        ok: true,
        bridge: 'ready',
        mcp: getAsyncTestMindMcpCapabilities(),
        windows: await listMindWindowsDetailed({ ...context, includeRuntimeState: params?.includeRuntimeState === true }),
      };

    case 'mind.recentFiles':
      return await amindMain.recentStore.loadRendererEntries();

    case 'mind.createWindow':
      return await amindMain.newAndOpenWindow(params?.payload || {});

    case 'mind.createFile': {
      const { filePath } = params || {};
      if (!filePath || typeof filePath !== 'string') throw new Error('filePath is required');
      return await amindMain.createFileAt(filePath, {
        title: params.title,
        rootText: params.rootText,
        children: params.children,
        rootMarkers: params.rootMarkers,
        rootSecrecy: params.rootSecrecy,
        overwrite: params.overwrite === true,
        openWindow: params.openWindow === true,
      });
    }

    case 'mind.createDocument': {
      if (params.filePath) {
        return await amindMain.createFileAt(params.filePath, {
          title: params.title,
          rootText: params.rootText,
          children: params.children,
          rootMarkers: params.rootMarkers,
          rootSecrecy: params.rootSecrecy,
          overwrite: params.overwrite === true,
          openWindow: params.open === true || params.openWindow === true,
        });
      }
      return await amindMain.newAndOpenWindow({
        title: params.title,
        rootText: params.rootText,
        children: params.children,
        rootMarkers: params.rootMarkers,
        rootSecrecy: params.rootSecrecy,
      });
    }

    case 'mind.listWindows':
      return await listMindWindowsDetailed({ ...context, includeRuntimeState: params?.includeRuntimeState === true });

    case 'mind.getActiveWindow': {
      const windows = await listMindWindowsDetailed({ ...context, includeRuntimeState: params?.includeRuntimeState === true });
      return windows.find((item) => item.focused) || windows[0] || null;
    }

    case 'mind.getWindowDocument':
    case 'mind.getDocumentOutline':
    case 'mind.getNode':
    case 'mind.getNodes':
    case 'mind.getSubtree':
    case 'mind.getParentChain':
    case 'mind.getChildren':
    case 'mind.searchNodes':
    case 'mind.findNodesByFilter':
    case 'mind.getSelection':
    case 'mind.setSelection':
    case 'mind.readOpenDocument':
    case 'mind.exportDocument':
      return await requestMindRenderer(context, method, params || {});

    case 'mind.updateNodeText':
    case 'mind.updateNodeNote':
    case 'mind.updateNodeMetadata':
    case 'mind.setNodeMarkers':
    case 'mind.addNodeMarker':
    case 'mind.removeNodeMarker':
    case 'mind.setRootSecrecy':
    case 'mind.createNode':
    case 'mind.createNodes':
    case 'mind.importFileSubtree':
    case 'mind.deleteNode':
    case 'mind.moveNode':
    case 'mind.copySubtree':
    case 'mind.applyNodeOperations':
    case 'mind.saveDocument':
    case 'mind.saveAsDocument':
    case 'mind.updateDocumentTitle':
    case 'mind.updateBoardTitle':
      return await handleOpenMindDocumentRequest(context, method, params || {});

    case 'mind.readFile':
    case 'mind.readFileOutline':
    case 'mind.readFileSubtree':
    case 'mind.searchFileNodes':
      return await readMindFileContent(params?.filePath, params || {});

    case 'mind.focusWindow': {
      const { windowKey } = params || {};
      if (!windowKey) throw new Error('windowKey is required');
      if (!windowKey.startsWith('mind:')) throw new Error(`Not a Mind window: ${windowKey}`);
      windowManager.focus(windowKey);
      return { ok: true, windowKey };
    }

    case 'mind.closeWindow': {
      return await closeMindWindowWithPolicy(context, params || {});
    }

    case 'mind.closeAllWindows': {
      const windows = listMindWindows(context);
      const results = [];
      for (const item of windows) {
        const result = await closeMindWindowWithPolicy(context, {
          windowKey: item.windowKey,
          mode: params?.mode || (params?.save === true ? 'save' : params?.discard === true ? 'discard' : null),
        });
        results.push(result);
      }
      return { ok: results.every((item) => item.ok), results };
    }

    case 'mind.openAmindFile': {
      const { filePath } = params || {};
      if (!filePath || typeof filePath !== 'string') throw new Error('filePath is required');
      return await amindMain.openFileInWindow(filePath);
    }

    case 'mind.openXmindFile': {
      const { filePath } = params || {};
      if (!filePath || typeof filePath !== 'string') throw new Error('filePath is required');
      return await amindMain.importXmindFileInWindow(filePath);
    }

    default:
      throw new Error(`Unknown bridge method: ${method}`);
    }
  } catch (error) {
    requestError = error;
    throw error;
  } finally {
    finishMindMcpDiagnostic(traceId, {
      status: requestError ? 'error' : 'ok',
      errorCode: requestError?.code || null,
      windowKey: targetWindowKey,
    });
    endMindAgentExecution({
      clientId: params?.mcpClientId,
      traceId,
    });
  }
}

export function initMindMcpAppBridgeServer({ amindMain, windowManager }) {
  const endpoints = getAsyncTestMindBridgeEndpoints();
  const servers = [];
  const activeEndpoints = [];
  const processingFiles = new Set();
  let fileBridgeTimer = null;
  const unsubscribeControl = subscribeMindAgentControl((state) => {
    windowManager.broadcast('mind:mcp-control', state);
  });
  const controlSessionTimer = setInterval(() => {
    pruneExpiredMindAgentSessions();
  }, 15000);

  function createServer() {
    return net.createServer((socket) => {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');
        if (!line) continue;

        void (async () => {
          let request;
          try {
            request = JSON.parse(line);
            const result = await handleMindBridgeRequest(
              { amindMain, windowManager },
              request.method,
              request.params || {}
            );
            socket.write(`${JSON.stringify({ id: request.id, ok: true, result })}\n`);
          } catch (error) {
            socket.write(`${JSON.stringify({
              id: request?.id ?? null,
              ok: false,
              error: toErrorPayload(error),
            })}\n`);
          }
        })();
      }
    });
  });
  }

  function listenEndpoint(endpoint) {
    if (endpoint.type !== 'tcp' && process.platform !== 'win32' && fs.existsSync(endpoint.path)) {
      try { fs.unlinkSync(endpoint.path); } catch {}
    }

    const server = createServer();
    server.once('error', (error) => {
      void appendBridgeLog('socket-listen-error', {
        endpoint,
        message: error instanceof Error ? error.message : String(error),
        code: error?.code,
      });
      console.error('[mind-mcp-bridge] server error:', error);
    });
    servers.push({ server, endpoint });

    if (endpoint.type === 'tcp') {
      server.listen(endpoint.port, endpoint.host, () => {
        activeEndpoints.push(endpoint);
        void appendBridgeLog('socket-listening', endpoint);
        console.info('[mind-mcp-bridge] listening:', `${endpoint.host}:${endpoint.port}`);
      });
      return;
    }

    server.listen(endpoint.path, () => {
      activeEndpoints.push(endpoint);
      void appendBridgeLog('socket-listening', endpoint);
      console.info('[mind-mcp-bridge] listening:', endpoint.path);
    });
  }

  for (const endpoint of endpoints) {
    listenEndpoint(endpoint);
  }

  async function writeFileBridgeResponse(responsePath, payload) {
    const bridgeDir = getFileBridgeDir();
    if (!responsePath || !isPathInside(bridgeDir, responsePath)) {
      throw new Error('Invalid MCP response path');
    }
    const tmpPath = `${responsePath}.tmp`;
    await fsp.writeFile(tmpPath, JSON.stringify(payload), 'utf8');
    await fsp.rename(tmpPath, responsePath);
  }

  async function handleFileBridgeRequest(fileName) {
    const bridgeDir = getFileBridgeDir();
    const requestPath = path.join(bridgeDir, fileName);
    if (!isPathInside(bridgeDir, requestPath) || processingFiles.has(requestPath)) return;

    processingFiles.add(requestPath);
    try {
      const raw = await fsp.readFile(requestPath, 'utf8');
      const request = JSON.parse(raw);
      const age = Date.now() - Number(request.createdAt || 0);
      if (age > FILE_BRIDGE_MAX_AGE_MS) {
        await fsp.rm(requestPath, { force: true });
        return;
      }

      try {
        const result = await handleMindBridgeRequest(
          { amindMain, windowManager },
          request.method,
          request.params || {}
        );
        await writeFileBridgeResponse(request.responsePath, { id: request.id, ok: true, result });
      } catch (error) {
        await writeFileBridgeResponse(request.responsePath, {
          id: request.id,
          ok: false,
          error: toErrorPayload(error),
        });
      } finally {
        await fsp.rm(requestPath, { force: true }).catch(() => {});
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn('[mind-mcp-file-bridge] request failed:', error);
      }
    } finally {
      processingFiles.delete(requestPath);
    }
  }

  async function pollFileBridge() {
    const bridgeDir = getFileBridgeDir();
    try {
      await fsp.mkdir(bridgeDir, { recursive: true });
      const files = await fsp.readdir(bridgeDir);
      await Promise.all(
        files
          .filter((fileName) => fileName.startsWith('request-') && fileName.endsWith('.json'))
          .map((fileName) => handleFileBridgeRequest(fileName))
      );
    } catch (error) {
      console.warn('[mind-mcp-file-bridge] poll failed:', error);
    }
  }

  fileBridgeTimer = setInterval(() => {
    void pollFileBridge();
  }, FILE_BRIDGE_POLL_MS);
  void appendBridgeLog('file-bridge-start', { bridgeDir: getFileBridgeDir() });
  void pollFileBridge();

  return {
    get endpoint() {
      return activeEndpoints[0] || endpoints[0];
    },
    get endpoints() {
      return [...activeEndpoints];
    },
    close: () => {
      clearInterval(controlSessionTimer);
      unsubscribeControl();
      if (fileBridgeTimer) {
        clearInterval(fileBridgeTimer);
        fileBridgeTimer = null;
      }
      for (const { server, endpoint } of servers) {
        server.close();
        if (endpoint?.type !== 'tcp' && process.platform !== 'win32' && fs.existsSync(endpoint.path)) {
          try { fs.unlinkSync(endpoint.path); } catch {}
        }
      }
    },
  };
}
