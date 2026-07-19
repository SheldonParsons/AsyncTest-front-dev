import { createMindControlRevokedError } from './mindAgentControlManager.node.js';

const operationByWindow = new Map();
const blockedWindows = new Map();
const journalByTransaction = new Map();
const latestTransactionByWindow = new Map();
const MAX_JOURNAL_ENTRIES = 100;

function userStoppedError(windowKey) {
  const blocked = blockedWindows.get(windowKey);
  if (blocked?.reason === 'control-exited') {
    const error = createMindControlRevokedError();
    error.stop = blocked;
    return error;
  }
  const error = new Error('User stopped AsyncTest Mind MCP operations for this window.');
  error.code = 'USER_STOPPED';
  error.recoverable = true;
  error.retryAllowed = false;
  error.suggestedAction = 'Stop the current operation. Do not retry this window until the user explicitly resumes it in AsyncTest.';
  error.stop = blocked || null;
  return error;
}

function trimJournal() {
  while (journalByTransaction.size > MAX_JOURNAL_ENTRIES) {
    const oldest = journalByTransaction.keys().next().value;
    journalByTransaction.delete(oldest);
  }
}

function compactChangedCounts(changed) {
  if (!changed || typeof changed !== 'object') return null;
  return {
    created: changed.created ?? 0,
    updated: changed.updated ?? 0,
    deleted: changed.deleted ?? 0,
    moved: changed.moved ?? 0,
    affectedNodeCount: changed.affectedNodeCount ?? 0,
  };
}

export function beginMindOperation({ windowKey, transactionId, clientId, totalCount = 0 }) {
  if (blockedWindows.has(windowKey)) throw userStoppedError(windowKey);
  const current = operationByWindow.get(windowKey);
  if (current?.status === 'running' || current?.status === 'stopping') {
    const error = new Error(`Another AsyncTest Mind operation is already running: ${current.transactionId}`);
    error.code = 'OPERATION_IN_PROGRESS';
    error.recoverable = true;
    throw error;
  }
  const operation = {
    windowKey,
    transactionId,
    clientId: clientId || null,
    status: 'running',
    totalCount,
    completedCount: 0,
    currentNodeId: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    cancelRequested: false,
  };
  operationByWindow.set(windowKey, operation);
  return operation;
}

export function assertMindOperationActive(operation) {
  if (!operation || operation.cancelRequested || blockedWindows.has(operation.windowKey)) {
    throw userStoppedError(operation?.windowKey);
  }
}

export function updateMindOperationProgress(operation, progress = {}) {
  if (!operation) return;
  Object.assign(operation, {
    completedCount: progress.completedCount ?? operation.completedCount,
    currentNodeId: progress.currentNodeId ?? operation.currentNodeId,
  });
}

export function updateMindOperationProgressForWindow(windowKey, progress = {}) {
  const operation = operationByWindow.get(windowKey);
  if (!operation) return getMindOperationStatus(windowKey);
  assertMindOperationActive(operation);
  updateMindOperationProgress(operation, progress);
  return getMindOperationStatus(windowKey);
}

export function completeMindOperation(operation, result = {}) {
  if (!operation) return;
  operation.status = 'completed';
  operation.completedCount = operation.totalCount;
  operation.currentNodeId = null;
  operation.finishedAt = new Date().toISOString();
  const journal = {
    transactionId: operation.transactionId,
    windowKey: operation.windowKey,
    status: 'completed',
    changed: result.changed ?? null,
    appliedCount: result.appliedCount ?? operation.completedCount,
    revision: result.revision ?? null,
    saved: !!result.saved,
    startedAt: operation.startedAt,
    finishedAt: operation.finishedAt,
  };
  journalByTransaction.set(operation.transactionId, journal);
  latestTransactionByWindow.set(operation.windowKey, operation.transactionId);
  trimJournal();
}

export function failMindOperation(operation, error, result = {}) {
  if (!operation) return;
  const stopped = error?.code === 'USER_STOPPED' || operation.cancelRequested;
  operation.status = stopped ? 'stopped' : 'failed';
  operation.finishedAt = new Date().toISOString();
  operation.errorCode = error?.code || 'UNKNOWN_ERROR';
  operation.errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
  if (stopped) {
    const journal = {
      transactionId: operation.transactionId,
      windowKey: operation.windowKey,
      status: 'stopped',
      changed: result.changed ?? null,
      plannedChanged: compactChangedCounts(result.plannedChanged),
      appliedCount: result.appliedCount ?? operation.completedCount,
      completedCount: result.completedCount ?? operation.completedCount,
      skippedCount: result.skippedCount ?? Math.max(0, operation.totalCount - operation.completedCount),
      revision: result.revision ?? null,
      saved: false,
      startedAt: operation.startedAt,
      finishedAt: operation.finishedAt,
    };
    journalByTransaction.set(operation.transactionId, journal);
    latestTransactionByWindow.set(operation.windowKey, operation.transactionId);
    trimJournal();
  }
}

export function stopMindOperation(windowKey, reason = 'user') {
  if (!windowKey) throw new Error('windowKey is required');
  const operation = operationByWindow.get(windowKey);
  if (operation) {
    operation.cancelRequested = true;
    operation.status = operation.status === 'running' ? 'stopping' : 'stopped';
  }
  const stop = {
    windowKey,
    transactionId: operation?.transactionId ?? null,
    reason,
    stoppedAt: new Date().toISOString(),
    totalCount: operation?.totalCount ?? 0,
    completedCount: operation?.completedCount ?? 0,
  };
  blockedWindows.set(windowKey, stop);
  return { ok: true, code: 'USER_STOPPED', ...stop };
}

export function resumeMindOperations(windowKey) {
  if (!windowKey) throw new Error('windowKey is required');
  const resumed = blockedWindows.delete(windowKey);
  const operation = operationByWindow.get(windowKey);
  if (operation && ['stopping', 'stopped'].includes(operation.status)) {
    operation.status = 'idle';
    operation.cancelRequested = false;
  }
  return { ok: true, windowKey, resumed };
}

export function getMindOperationStatus(windowKey) {
  const operation = windowKey ? operationByWindow.get(windowKey) : null;
  const blocked = windowKey ? blockedWindows.get(windowKey) : null;
  if (!operation && !blocked) return { status: 'idle', windowKey: windowKey || null, blocked: false };
  return {
    status: blocked ? (operation?.status === 'stopping' ? 'stopping' : 'stopped') : (operation?.status || 'idle'),
    windowKey,
    blocked: !!blocked,
    transactionId: operation?.transactionId ?? blocked?.transactionId ?? null,
    totalCount: operation?.totalCount ?? 0,
    completedCount: operation?.completedCount ?? 0,
    currentNodeId: operation?.currentNodeId ?? null,
    startedAt: operation?.startedAt ?? null,
    finishedAt: operation?.finishedAt ?? null,
    stop: blocked || null,
  };
}

export function getMindChangedSummary({ transactionId, windowKey } = {}) {
  const resolvedId = transactionId || (windowKey ? latestTransactionByWindow.get(windowKey) : null);
  if (!resolvedId) return null;
  return journalByTransaction.get(resolvedId) || null;
}
