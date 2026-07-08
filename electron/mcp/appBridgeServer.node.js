import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { writeAmindFile } from '../amind/amindFileService.node.js';
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
  return {
    code,
    message: error instanceof Error ? error.message : String(error || 'Unknown error'),
    recoverable: isRecoverableBridgeErrorCode(code),
    suggestedAction: getBridgeErrorSuggestedAction(code),
  };
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
  return 'UNKNOWN_ERROR';
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
    case 'FILE_ALREADY_EXISTS':
      return 'Pass overwrite=true or choose another filePath.';
    case 'FILE_PERMISSION_DENIED':
      return 'Choose a writable filePath.';
    case 'INVALID_ARGUMENT':
      return 'Check required parameters and retry.';
    case 'REVISION_MISMATCH':
      return 'Read the latest document state, then retry with the current revision.';
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
        nodeCount: board?.nodes ? Object.keys(board.nodes).length : null,
        focused: win.isFocused(),
        minimized: win.isMinimized(),
      };
    })
    .filter(Boolean);
}

async function listMindWindowsDetailed(context) {
  const windows = listMindWindows(context);
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
    await saveOpenMindEntry(context, docId, entry);
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

function markOpenDocChanged(entry) {
  if (!entry?.doc) return;
  if (!entry.doc.manifest || typeof entry.doc.manifest !== 'object') entry.doc.manifest = {};
  entry.doc.manifest.updatedAt = new Date().toISOString();
}

function updateOpenWindowTitle(context, windowKey, entry) {
  const win = context.windowManager.get(windowKey);
  if (!win) return;
  const label = entry?.filePath
    ? `AsyncTest Mind - ${path.basename(entry.filePath)}`
    : 'AsyncTest Mind';
  win.setTitle(label);
}

function notifyOpenMindDocumentUpdated(context, windowKey, docId, entry) {
  const win = context.windowManager.get(windowKey);
  if (!win) return;
  win.webContents.send('mind:mcp-doc-updated', {
    docId,
    windowKey,
    filePath: entry.filePath ?? null,
    doc: entry.doc,
  });
}

async function saveOpenMindEntry(context, docId, entry) {
  if (!entry.filePath) return { ok: false, needSaveAs: true, docId, filePath: null };
  const { path: abs, doc: saved } = await writeAmindFile(entry.filePath, entry.doc);
  context.amindMain.docStore.setFilePath(docId, abs);
  context.amindMain.docStore.setDoc(docId, saved);
  entry.filePath = abs;
  entry.doc = saved;
  return {
    ok: true,
    needSaveAs: false,
    docId,
    filePath: abs,
    savedAt: saved?.manifest?.updatedAt ?? null,
    title: saved?.manifest?.title ?? null,
  };
}

async function saveOpenMindEntryAs(context, docId, entry, params = {}) {
  const result = await context.amindMain.saveAsDocument({
    docId,
    filePath: params.filePath,
    doc: entry.doc,
    overwrite: params.overwrite !== false,
  });
  entry.filePath = result.filePath;
  entry.doc = context.amindMain.docStore.mustGet(docId).doc;
  updateOpenWindowTitle(context, entry.windowKey, entry);
  return result;
}

function setDocTitle(doc, title) {
  if (!doc.manifest || typeof doc.manifest !== 'object') doc.manifest = {};
  doc.manifest.title = String(title ?? '').trim() || '思维导图';
  doc.manifest.updatedAt = new Date().toISOString();
  return doc.manifest.title;
}

function setBoardTitle(doc, boardId, title) {
  const targetBoardId = boardId || doc?.mind?.activeMindId || doc?.mind?.order?.[0];
  const board = targetBoardId ? doc?.mind?.minds?.[targetBoardId] : null;
  if (!board) throw new Error(`Mind board not found: ${targetBoardId || '<active>'}`);
  board.title = String(title ?? '').trim() || '思维导图';
  if (!doc.manifest || typeof doc.manifest !== 'object') doc.manifest = {};
  doc.manifest.updatedAt = new Date().toISOString();
  return { boardId: targetBoardId, title: board.title };
}

async function handleOpenMindDocumentRequest(context, method, params = {}) {
  const { docId, entry, windowKey } = getOpenMindEntry(context, params);
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
      return summarizeMindDoc(doc, params);
    case 'mind.getNode':
      return getMindDocNode(doc, params.nodeId, params);
    case 'mind.getNodes':
      return getMindDocNodes(doc, params.nodeIds, params);
    case 'mind.getSubtree':
      return getMindDocSubtree(doc, params.nodeId, params);
    case 'mind.getParentChain':
      return getMindDocParentChain(doc, params.nodeId, params);
    case 'mind.getChildren':
      return getMindDocChildren(doc, params.nodeId, params);
    case 'mind.searchNodes':
      return searchMindDocNodes(doc, params.query, params);
    case 'mind.findNodesByFilter':
      return findMindDocNodesByFilter(doc, params);
    case 'mind.getSelection':
      return openDocumentSelections.get(windowKey) || { nodeIds: [], primaryId: null };
    case 'mind.setSelection': {
      const nodeIds = Array.isArray(params.nodeIds) ? params.nodeIds : [];
      const primaryId = params.primaryId ?? nodeIds[nodeIds.length - 1] ?? null;
      const selection = { nodeIds, primaryId };
      openDocumentSelections.set(windowKey, selection);
      return selection;
    }
    case 'mind.updateNodeText': {
      const result = updateMindDocNodeText(doc, params.nodeId, params.text, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.updateNodeNote': {
      const result = updateMindDocNodeNote(doc, params.nodeId, params.note, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.updateNodeMetadata': {
      const result = updateMindDocNodeMetadata(doc, params.nodeId, params.metadata, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.createNode': {
      const result = createMindDocNode(doc, params.parentId, params.text, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.createNodes': {
      const result = createMindDocNodes(doc, params.parentId, params.nodes, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      const saved = params.saveAfterApply === true ? await saveOpenMindEntry(context, docId, entry) : null;
      return { ...result, windowKey, saved };
    }
    case 'mind.deleteNode': {
      const result = deleteMindDocNode(doc, params.nodeId, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.moveNode': {
      const result = moveMindDocNode(doc, params.nodeId, params.newParentId, params.index, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.copySubtree': {
      const result = copyMindDocSubtree(doc, params.nodeId, params.newParentId, params.index, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return result;
    }
    case 'mind.applyNodeOperations': {
      const operations = Array.isArray(params.operations) ? params.operations : [];
      const results = [];
      const expectedRevision = params.expectedRevision;
      if (expectedRevision && doc?.manifest?.updatedAt && expectedRevision !== doc.manifest.updatedAt) {
        const error = new Error(`Document revision mismatch. Expected ${expectedRevision}, current ${doc.manifest.updatedAt}`);
        error.code = 'REVISION_MISMATCH';
        throw error;
      }
      const beforeDoc = params.rollbackOnError === true ? cloneJson(doc) : null;
      try {
        for (const op of operations) {
          if (!op || typeof op !== 'object') continue;
          const merged = { ...op, windowKey };
          if (op.type === 'update_text') results.push(await handleOpenMindDocumentRequest(context, 'mind.updateNodeText', merged));
          else if (op.type === 'update_note') results.push(await handleOpenMindDocumentRequest(context, 'mind.updateNodeNote', merged));
          else if (op.type === 'update_metadata') results.push(await handleOpenMindDocumentRequest(context, 'mind.updateNodeMetadata', merged));
          else if (op.type === 'set_markers') results.push(await handleOpenMindDocumentRequest(context, 'mind.setNodeMarkers', merged));
          else if (op.type === 'add_marker') results.push(await handleOpenMindDocumentRequest(context, 'mind.addNodeMarker', merged));
          else if (op.type === 'remove_marker') results.push(await handleOpenMindDocumentRequest(context, 'mind.removeNodeMarker', merged));
          else if (op.type === 'set_root_secrecy') results.push(await handleOpenMindDocumentRequest(context, 'mind.setRootSecrecy', merged));
          else if (op.type === 'create_node') results.push(await handleOpenMindDocumentRequest(context, 'mind.createNode', merged));
          else if (op.type === 'create_nodes') results.push(await handleOpenMindDocumentRequest(context, 'mind.createNodes', merged));
          else if (op.type === 'delete_node') results.push(await handleOpenMindDocumentRequest(context, 'mind.deleteNode', merged));
          else if (op.type === 'move_node') results.push(await handleOpenMindDocumentRequest(context, 'mind.moveNode', merged));
          else if (op.type === 'copy_subtree') results.push(await handleOpenMindDocumentRequest(context, 'mind.copySubtree', merged));
          else throw new Error(`Unsupported operation type: ${op.type}`);
        }
      } catch (error) {
        if (beforeDoc) {
          context.amindMain.docStore.setDoc(docId, beforeDoc);
          entry.doc = beforeDoc;
          notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
        }
        throw error;
      }
      const saved = params.saveAfterApply === true ? await saveOpenMindEntry(context, docId, entry) : null;
      return { ok: true, results, saved };
    }
    case 'mind.saveDocument': {
      const saved = await saveOpenMindEntry(context, docId, entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return saved;
    }
    case 'mind.saveAsDocument': {
      const saved = await saveOpenMindEntryAs(context, docId, entry, params);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { ...saved, windowKey, dirty: false };
    }
    case 'mind.updateDocumentTitle': {
      const title = setDocTitle(doc, params.title);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { ok: true, docId, windowKey, title };
    }
    case 'mind.updateBoardTitle': {
      const result = setBoardTitle(doc, params.boardId, params.title);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { ok: true, ...result };
    }
    case 'mind.setNodeMarkers': {
      const { boardId, board } = getActiveBoard(doc, params.boardId);
      const node = board?.nodes?.[params.nodeId];
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      node.markers = Array.isArray(params.markers) ? [...new Set(params.markers.map(String).filter(Boolean))] : [];
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { boardId, ok: true, node: getMindDocNode(doc, params.nodeId, { boardId, includeMetadata: true }).node };
    }
    case 'mind.addNodeMarker': {
      const { boardId, board } = getActiveBoard(doc, params.boardId);
      const node = board?.nodes?.[params.nodeId];
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const markerKey = String(params.markerKey ?? '').trim();
      if (!markerKey) throw new Error('markerKey is required');
      const current = Array.isArray(node.markers) ? node.markers : [];
      node.markers = current.includes(markerKey) ? current : [...current, markerKey];
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { boardId, ok: true, node: getMindDocNode(doc, params.nodeId, { boardId, includeMetadata: true }).node };
    }
    case 'mind.removeNodeMarker': {
      const { boardId, board } = getActiveBoard(doc, params.boardId);
      const node = board?.nodes?.[params.nodeId];
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const markerKey = String(params.markerKey ?? '').trim();
      node.markers = (Array.isArray(node.markers) ? node.markers : []).filter((item) => item !== markerKey);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { boardId, ok: true, node: getMindDocNode(doc, params.nodeId, { boardId, includeMetadata: true }).node };
    }
    case 'mind.setRootSecrecy': {
      const { boardId, board } = getActiveBoard(doc, params.boardId);
      const rootId = params.nodeId || board?.roots?.[0]?.rootId;
      const node = rootId ? board?.nodes?.[rootId] : null;
      if (!node) throw new Error(`Root node not found: ${rootId || '<active>'}`);
      node.secrecy = params.secrecy == null ? null : cloneJson(params.secrecy);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      return { boardId, ok: true, node: getMindDocNode(doc, rootId, { boardId, includeMetadata: true }).node };
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
      const result = await importMindFileSubtree(doc, params);
      markOpenDocChanged(entry);
      notifyOpenMindDocumentUpdated(context, windowKey, docId, entry);
      const saved = params.saveAfterApply === true ? await saveOpenMindEntry(context, docId, entry) : null;
      return { ...result, docId, windowKey, saved };
    }
    case 'mind.exportDocument': {
      const format = params.format || 'outline';
      if (format === 'rawJson') return { doc: cloneJson(doc) };
      const outline = summarizeMindDoc(doc, params);
      if (format === 'markdown') return { markdown: outlineToMarkdown(outline) };
      return { outline };
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
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRendererRequests.delete(requestId);
      reject(new Error(`Timed out waiting for Mind window response: ${method}`));
    }, RENDERER_REQUEST_TIMEOUT_MS);
    pendingRendererRequests.set(requestId, { windowKey, resolve, reject, timer });
    win.webContents.send('mind:mcp-request', { requestId, method, params: { ...params, windowKey } });
  });
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
    pending.reject(new Error(payload.error?.message || 'Mind renderer request failed'));
  }
  return true;
}

async function handleMindBridgeRequest(context, method, params = {}) {
  const { amindMain, windowManager } = context;
  if (!amindMain || !windowManager) throw new Error('AsyncTest Mind is not ready');

  switch (method) {
    case 'mind.status':
      return {
        ok: true,
        bridge: 'ready',
        windows: await listMindWindowsDetailed(context),
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
          overwrite: params.overwrite === true,
          openWindow: params.open === true || params.openWindow === true,
        });
      }
      return await amindMain.newAndOpenWindow({
        title: params.title,
        rootText: params.rootText,
        children: params.children,
      });
    }

    case 'mind.listWindows':
      return await listMindWindowsDetailed(context);

    case 'mind.getActiveWindow': {
      const windows = await listMindWindowsDetailed(context);
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
    case 'mind.readOpenDocument':
    case 'mind.exportDocument':
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
}

export function initMindMcpAppBridgeServer({ amindMain, windowManager }) {
  const endpoints = getAsyncTestMindBridgeEndpoints();
  const servers = [];
  const activeEndpoints = [];
  const processingFiles = new Set();
  let fileBridgeTimer = null;

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
