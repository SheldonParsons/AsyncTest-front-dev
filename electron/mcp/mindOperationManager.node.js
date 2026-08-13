import { createMindControlRevokedError } from './mindAgentControlManager.node.js';
import { normalizeMindMcpError } from './mindMcpProtocol.node.js';

const operationByWindow = new Map();
const blockedWindows = new Map();
const journalByTransaction = new Map();
const latestTransactionByWindow = new Map();
const MAX_JOURNAL_ENTRIES = 100;
const POSSIBLY_STALLED_AFTER_MS = 15000;

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

export function beginMindOperation({ windowKey, transactionId, clientId, totalCount = 0, status = 'running' }) {
  if (blockedWindows.has(windowKey)) throw userStoppedError(windowKey);
  const current = operationByWindow.get(windowKey);
  if (['preparing', 'running', 'stopping'].includes(current?.status)) {
    const error = new Error(`Another AsyncTest Mind operation is already running: ${current.transactionId}`);
    error.code = 'OPERATION_IN_PROGRESS';
    error.recoverable = true;
    error.retryAllowed = false;
    error.suggestedAction = 'Call mind_get_operation_status, wait for the current transaction to finish, and do not submit a duplicate write.';
    error.details = {
      windowKey,
      transactionId: current.transactionId,
      completedCount: current.completedCount,
      totalCount: current.totalCount,
      lastProgressAt: current.lastProgressAt,
    };
    throw error;
  }
  const startedAt = new Date().toISOString();
  const operation = {
    windowKey,
    transactionId,
    clientId: clientId || null,
    status,
    totalCount,
    completedCount: 0,
    currentNodeId: null,
    startedAt,
    lastProgressAt: startedAt,
    finishedAt: null,
    cancelRequested: false,
  };
  operationByWindow.set(windowKey, operation);
  return operation;
}

export function startMindOperation(operation, { totalCount } = {}) {
  if (!operation) return;
  assertMindOperationActive(operation);
  operation.status = 'running';
  if (Number.isFinite(Number(totalCount))) operation.totalCount = Number(totalCount);
  operation.lastProgressAt = new Date().toISOString();
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
    lastProgressAt: new Date().toISOString(),
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
  operation.lastProgressAt = operation.finishedAt;
  operation.retryAllowed = false;
  operation.suggestedAction = 'The transaction completed. Continue from the returned revision; do not repeat the same write.';
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
  const normalizedError = normalizeMindMcpError(error);
  const stopped = error?.code === 'USER_STOPPED' || operation.cancelRequested;
  operation.status = stopped ? 'stopped' : 'failed';
  operation.finishedAt = new Date().toISOString();
  operation.errorCode = normalizedError.code;
  operation.errorMessage = normalizedError.message;
  operation.retryAllowed = normalizedError.retryAllowed;
  operation.suggestedAction = normalizedError.suggestedAction;
  if (Number.isFinite(Number(result.completedCount))) {
    operation.completedCount = Number(result.completedCount);
  }
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
    operation.status = ['preparing', 'running'].includes(operation.status) ? 'stopping' : 'stopped';
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
  if (!operation && !blocked) {
    return {
      status: 'idle',
      health: 'idle',
      windowKey: windowKey || null,
      blocked: false,
      inProgress: false,
      terminal: true,
      retryAllowed: true,
      agentAction: 'continue',
      suggestedAction: 'No visual write operation is running. A new operation may be started.',
    };
  }
  const status = blocked ? (operation?.status === 'stopping' ? 'stopping' : 'stopped') : (operation?.status || 'idle');
  const now = Date.now();
  const startedAtMs = Date.parse(operation?.startedAt || '');
  const lastProgressAtMs = Date.parse(operation?.lastProgressAt || operation?.startedAt || '');
  const elapsedMs = Number.isFinite(startedAtMs) ? Math.max(0, now - startedAtMs) : null;
  const idleForMs = Number.isFinite(lastProgressAtMs) ? Math.max(0, now - lastProgressAtMs) : null;
  const inProgress = ['preparing', 'running', 'stopping'].includes(status);
  const totalCount = operation?.totalCount ?? 0;
  const completedCount = operation?.completedCount ?? 0;
  const progressPercent = totalCount > 0
    ? Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 10000) / 100))
    : (status === 'completed' ? 100 : 0);
  let health = status;
  let agentAction = 'inspect';
  let retryAllowed = operation?.retryAllowed === true;
  let suggestedAction = operation?.suggestedAction || null;

  if (status === 'preparing') {
    health = 'preparing';
    agentAction = 'wait';
    retryAllowed = false;
    suggestedAction = 'The transaction is being prepared. Wait and poll this status again; do not submit a duplicate write.';
  } else if (status === 'running') {
    health = idleForMs != null && idleForMs >= POSSIBLY_STALLED_AFTER_MS ? 'possibly_stalled' : 'working';
    agentAction = 'wait';
    retryAllowed = false;
    suggestedAction = health === 'possibly_stalled'
      ? 'The renderer has not reported progress recently. Wait and poll this status again; do not repeat the write while it remains in progress.'
      : 'The renderer is still applying the transaction. Wait and poll this status again; do not retry the write.';
  } else if (status === 'completed') {
    health = 'completed';
    agentAction = 'continue';
    retryAllowed = false;
    suggestedAction ||= 'The transaction completed. Continue from the returned revision; do not repeat the same write.';
  } else if (status === 'failed') {
    health = 'failed';
    agentAction = operation?.errorCode === 'RENDERER_RESPONSE_TIMEOUT' ? 'verify' : (retryAllowed ? 'retry' : 'inspect');
    if (operation?.errorCode === 'RENDERER_RESPONSE_TIMEOUT') {
      retryAllowed = false;
      suggestedAction = 'The final renderer outcome is uncertain. Read the current document and changed summary before deciding whether a retry is needed.';
    }
  } else if (['stopping', 'stopped'].includes(status)) {
    health = status;
    agentAction = 'stop';
    retryAllowed = false;
    suggestedAction ||= 'Do not retry until the user explicitly resumes operations for this document.';
  } else {
    health = 'idle';
    agentAction = 'continue';
    retryAllowed = true;
    suggestedAction ||= 'No visual write operation is running. A new operation may be started.';
  }
  return {
    status,
    health,
    windowKey,
    blocked: !!blocked,
    inProgress,
    terminal: !inProgress,
    transactionId: operation?.transactionId ?? blocked?.transactionId ?? null,
    totalCount,
    completedCount,
    progressPercent,
    currentNodeId: operation?.currentNodeId ?? null,
    startedAt: operation?.startedAt ?? null,
    lastProgressAt: operation?.lastProgressAt ?? null,
    finishedAt: operation?.finishedAt ?? null,
    elapsedMs,
    idleForMs,
    errorCode: operation?.errorCode ?? null,
    errorMessage: operation?.errorMessage ?? null,
    retryAllowed,
    agentAction,
    suggestedAction,
    recommendedPollAfterMs: inProgress ? 1000 : null,
    stop: blocked || null,
  };
}

export function getMindChangedSummary({ transactionId, windowKey } = {}) {
  const resolvedId = transactionId || (windowKey ? latestTransactionByWindow.get(windowKey) : null);
  if (!resolvedId) return null;
  return journalByTransaction.get(resolvedId) || null;
}

export function resetMindOperationsForTests() {
  operationByWindow.clear();
  blockedWindows.clear();
  journalByTransaction.clear();
  latestTransactionByWindow.clear();
}
