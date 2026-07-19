import { compareMindMcpIdentity, createMindMcpError } from './mindMcpProtocol.node.js';

const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_CLIENT_STALE_TIMEOUT_MS = 90 * 1000;

const sessionsByClient = new Map();
const executionsByClient = new Map();
const clientsById = new Map();
const listeners = new Set();
let controlMode = 'enabled';
let revokedAt = null;
let revokedReason = null;
let restoreRequestedAt = null;
let restoreRequestedBy = null;

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function emitChange() {
  const snapshot = getMindAgentControlState();
  for (const listener of listeners) {
    try { listener(snapshot); } catch {}
  }
  return snapshot;
}

export function createMindControlRevokedError() {
  return createMindMcpError(
    'MCP_CONTROL_REVOKED',
    '用户已主动退出 AsyncTest Mind MCP 控制。请立即停止调用 AsyncTest Mind 工具，不要在当前对话中自行恢复。只有用户明确要求恢复后，才可以调用 mind_request_control_restore；该函数仍需用户在 AsyncTest 中确认。'
  );
}

export function assertMindAgentControlEnabled() {
  if (controlMode !== 'enabled') throw createMindControlRevokedError();
}

function updateMindAgentClient({ clientId, identity, now = Date.now() } = {}) {
  const resolvedClientId = String(clientId || '').trim();
  if (!resolvedClientId) {
    const error = new Error('mcpClientId is required for Agent control sessions');
    error.code = 'MCP_CLIENT_ID_REQUIRED';
    throw error;
  }
  clientsById.set(resolvedClientId, {
    clientId: resolvedClientId,
    identity: identity || clientsById.get(resolvedClientId)?.identity || null,
    connectedAt: clientsById.get(resolvedClientId)?.connectedAt || nowIso(now),
    lastSeenAt: nowIso(now),
  });
  return resolvedClientId;
}

function updateMindAgentSession({ clientId, toolName, identity, now = Date.now() } = {}) {
  assertMindAgentControlEnabled();
  const resolvedClientId = updateMindAgentClient({ clientId, identity, now });
  const previous = sessionsByClient.get(resolvedClientId);
  sessionsByClient.set(resolvedClientId, {
    clientId: resolvedClientId,
    startedAt: previous?.startedAt || nowIso(now),
    lastActivityAt: nowIso(now),
    lastToolName: toolName || previous?.lastToolName || null,
    expiresAt: nowIso(now + DEFAULT_SESSION_IDLE_TIMEOUT_MS),
    identity: identity || previous?.identity || null,
  });
  return resolvedClientId;
}

export function touchMindAgentSession(options = {}) {
  updateMindAgentSession(options);
  return emitChange();
}

export function registerMindAgentClient(options = {}) {
  updateMindAgentClient(options);
  if (options.establishSession === false || controlMode !== 'enabled') return emitChange();
  return touchMindAgentSession({ ...options, toolName: options.toolName || 'initialize' });
}

export function unregisterMindAgentClient(clientId, reason = 'transport-closed') {
  const resolvedClientId = String(clientId || '').trim();
  const unregistered = resolvedClientId ? clientsById.delete(resolvedClientId) : false;
  if (resolvedClientId) {
    sessionsByClient.delete(resolvedClientId);
    executionsByClient.delete(resolvedClientId);
  }
  return { ok: true, unregistered, reason, ...emitChange() };
}

export function beginMindAgentExecution({ clientId, toolName, traceId, windowKey, locksWindow = false, identity, now = Date.now() } = {}) {
  const resolvedClientId = updateMindAgentSession({ clientId, toolName, identity, now });
  const resolvedTraceId = String(traceId || `${resolvedClientId}:${now}:${toolName || 'tool'}`);
  const executions = executionsByClient.get(resolvedClientId) || new Map();
  executions.set(resolvedTraceId, {
    traceId: resolvedTraceId,
    toolName: toolName || null,
    windowKey: String(windowKey || '').trim() || null,
    locksWindow: locksWindow === true,
    startedAt: nowIso(now),
  });
  executionsByClient.set(resolvedClientId, executions);
  return { traceId: resolvedTraceId, ...emitChange() };
}

export function endMindAgentExecution({ clientId, traceId, now = Date.now() } = {}) {
  const resolvedClientId = String(clientId || '').trim();
  const executions = executionsByClient.get(resolvedClientId);
  const ended = executions?.delete(String(traceId || '')) || false;
  if (executions && executions.size === 0) executionsByClient.delete(resolvedClientId);
  const session = sessionsByClient.get(resolvedClientId);
  if (session) {
    session.lastActivityAt = nowIso(now);
    session.expiresAt = nowIso(now + DEFAULT_SESSION_IDLE_TIMEOUT_MS);
  }
  return { ok: true, ended, ...emitChange() };
}

export function endMindAgentSession(clientId, reason = 'agent-finished') {
  const resolvedClientId = String(clientId || '').trim();
  const ended = resolvedClientId ? sessionsByClient.delete(resolvedClientId) : false;
  if (resolvedClientId) executionsByClient.delete(resolvedClientId);
  return { ok: true, ended, reason, ...emitChange() };
}

export function revokeMindAgentControl(reason = 'user') {
  controlMode = 'revoked';
  revokedAt = nowIso();
  revokedReason = reason;
  restoreRequestedAt = null;
  restoreRequestedBy = null;
  sessionsByClient.clear();
  executionsByClient.clear();
  return { ok: true, ...emitChange() };
}

export function requestMindAgentControlRestore(clientId) {
  if (controlMode === 'enabled') {
    return { ok: true, approvalRequired: false, ...getMindAgentControlState() };
  }
  controlMode = 'restore_requested';
  restoreRequestedAt = nowIso();
  restoreRequestedBy = String(clientId || '').trim() || null;
  return {
    ok: false,
    approvalRequired: true,
    message: '已向 AsyncTest 请求恢复 MCP 控制。必须由用户在 AsyncTest 中确认，Agent 不得继续调用其他 Mind 工具。',
    ...emitChange(),
  };
}

export function approveMindAgentControlRestore() {
  const wasBlocked = controlMode !== 'enabled';
  controlMode = 'enabled';
  revokedAt = null;
  revokedReason = null;
  restoreRequestedAt = null;
  restoreRequestedBy = null;
  sessionsByClient.clear();
  executionsByClient.clear();
  return { ok: true, restored: wasBlocked, ...emitChange() };
}

export function rejectMindAgentControlRestore() {
  const rejected = controlMode === 'restore_requested';
  if (controlMode !== 'enabled') controlMode = 'revoked';
  restoreRequestedAt = null;
  restoreRequestedBy = null;
  return { ok: true, rejected, ...emitChange() };
}

export function pruneExpiredMindAgentSessions(now = Date.now()) {
  if (controlMode !== 'enabled') return getMindAgentControlState();
  let changed = false;
  for (const [clientId, session] of sessionsByClient) {
    if (!executionsByClient.get(clientId)?.size && Date.parse(session.expiresAt) <= now) {
      sessionsByClient.delete(clientId);
      changed = true;
    }
  }
  for (const [clientId, client] of clientsById) {
    if (Date.parse(client.lastSeenAt) + DEFAULT_CLIENT_STALE_TIMEOUT_MS <= now) {
      clientsById.delete(clientId);
      sessionsByClient.delete(clientId);
      executionsByClient.delete(clientId);
      changed = true;
    }
  }
  return changed ? emitChange() : getMindAgentControlState();
}

export function getMindAgentControlState() {
  const sessions = [...sessionsByClient.values()];
  const clients = [...clientsById.values()];
  const executions = [...executionsByClient.values()].flatMap((items) => [...items.values()]);
  const executingWindowKeys = [...new Set(executions.map((execution) => execution.windowKey).filter(Boolean))];
  const lockedWindowKeys = [...new Set(executions.filter((execution) => execution.locksWindow).map((execution) => execution.windowKey).filter(Boolean))];
  const status = controlMode === 'enabled'
    ? (executions.length ? 'executing' : (sessions.length ? 'connected' : 'idle'))
    : controlMode;
  const latestSession = sessions
    .slice()
    .sort((left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt))[0] || null;
  return {
    status,
    controlEnabled: controlMode === 'enabled',
    activeSessionCount: sessions.length,
    activeExecutionCount: executions.length,
    executingWindowKeys,
    lockedWindowKeys,
    startedAt: sessions.length
      ? sessions.map((session) => session.startedAt).sort()[0]
      : null,
    lastActivityAt: latestSession?.lastActivityAt ?? null,
    lastToolName: latestSession?.lastToolName ?? null,
    expiresAt: sessions.length
      ? sessions.map((session) => session.expiresAt).sort().at(-1)
      : null,
    revokedAt,
    revokedReason,
    restoreRequestedAt,
    restoreRequestedBy,
    hasVersionMismatch: clients.some((client) => compareMindMcpIdentity(client.identity).mismatch),
    connectedMcpClients: clients.map((client) => {
      const comparison = compareMindMcpIdentity(client.identity);
      return {
        clientId: client.clientId,
        version: client.identity?.version || null,
        capabilityRevision: client.identity?.capabilityRevision ?? null,
        protocolRevision: client.identity?.protocolRevision ?? null,
        mismatch: comparison.mismatch,
        mismatchReason: comparison.reason,
        connectedAt: client.connectedAt,
        lastActivityAt: client.lastSeenAt,
      };
    }),
  };
}

export function subscribeMindAgentControl(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMindAgentControlForTests() {
  controlMode = 'enabled';
  revokedAt = null;
  revokedReason = null;
  restoreRequestedAt = null;
  restoreRequestedBy = null;
  sessionsByClient.clear();
  executionsByClient.clear();
  clientsById.clear();
  return getMindAgentControlState();
}

export { DEFAULT_CLIENT_STALE_TIMEOUT_MS, DEFAULT_SESSION_IDLE_TIMEOUT_MS };
