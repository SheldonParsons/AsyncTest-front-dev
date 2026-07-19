const MIND_WINDOW_WRITE_METHODS = new Set([
  'mind.setSelection',
  'mind.updateNodeText',
  'mind.updateNodeNote',
  'mind.updateNodeMetadata',
  'mind.setNodeMarkers',
  'mind.addNodeMarker',
  'mind.removeNodeMarker',
  'mind.setRootSecrecy',
  'mind.createNode',
  'mind.createNodes',
  'mind.importFileSubtree',
  'mind.deleteNode',
  'mind.moveNode',
  'mind.copySubtree',
  'mind.applyNodeOperations',
  'mind.saveDocument',
  'mind.saveAsDocument',
  'mind.updateDocumentTitle',
  'mind.updateBoardTitle',
  'mind.closeWindow',
]);

const MIND_WINDOW_READ_METHODS = new Set([
  'mind.getWindowDocument',
  'mind.getDocumentOutline',
  'mind.getNode',
  'mind.getNodes',
  'mind.getSubtree',
  'mind.getParentChain',
  'mind.getChildren',
  'mind.searchNodes',
  'mind.findNodesByFilter',
  'mind.getSelection',
  'mind.readOpenDocument',
  'mind.exportDocument',
  'mind.focusWindow',
]);

function compactWindow(window) {
  return {
    windowKey: window.windowKey,
    docId: window.docId ?? null,
    title: window.title ?? window.windowTitle ?? null,
    filePath: window.filePath ?? null,
    focused: window.focused === true,
  };
}

function windowTargetError(code, message, windows) {
  const error = new Error(message);
  error.code = code;
  error.recoverable = true;
  error.retryAllowed = true;
  error.suggestedAction = 'Call mind_list_windows, choose the intended windowKey, then retry the write with that explicit windowKey.';
  error.details = { windows: windows.map(compactWindow) };
  return error;
}

export function isMindWindowWriteMethod(method) {
  return MIND_WINDOW_WRITE_METHODS.has(method);
}

export function resolveMindExecutionWindowKey(method, params = {}, windows = []) {
  if (!MIND_WINDOW_WRITE_METHODS.has(method) && !MIND_WINDOW_READ_METHODS.has(method)) return null;
  const explicitWindowKey = typeof params.windowKey === 'string' ? params.windowKey.trim() : '';
  if (explicitWindowKey && windows.some((window) => window.windowKey === explicitWindowKey)) return explicitWindowKey;
  return windows.length === 1 ? windows[0].windowKey : null;
}

export function resolveMindWriteWindowKey(params = {}, windows = []) {
  const explicitWindowKey = typeof params.windowKey === 'string' ? params.windowKey.trim() : '';
  if (explicitWindowKey) {
    if (windows.some((window) => window.windowKey === explicitWindowKey)) return explicitWindowKey;
    throw windowTargetError(
      'WINDOW_NOT_FOUND',
      `Mind window not found: ${explicitWindowKey}`,
      windows
    );
  }
  if (windows.length === 1) return windows[0].windowKey;
  if (windows.length === 0) {
    throw windowTargetError('WINDOW_NOT_FOUND', 'No AsyncTest Mind window is open.', windows);
  }
  throw windowTargetError(
    'AMBIGUOUS_WINDOW',
    'Multiple AsyncTest Mind windows are open. windowKey is required for write operations.',
    windows
  );
}

export { MIND_WINDOW_READ_METHODS, MIND_WINDOW_WRITE_METHODS };
