import { performance } from 'node:perf_hooks';

const MAX_DIAGNOSTIC_ENTRIES = 100;
const activeSpans = new Map();
const completedSpans = [];

function roundMs(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function beginMindMcpDiagnostic({ traceId, toolName, method, windowKey = null } = {}) {
  if (!traceId) return null;
  const span = {
    traceId,
    toolName: toolName || null,
    method: method || null,
    windowKey,
    startedAt: new Date().toISOString(),
    startedMark: performance.now(),
    phases: {},
  };
  activeSpans.set(traceId, span);
  return span;
}

export function recordMindMcpDiagnosticPhase(traceId, phase, durationMs) {
  const span = traceId ? activeSpans.get(traceId) : null;
  if (!span || !phase) return;
  span.phases[phase] = roundMs((span.phases[phase] || 0) + Number(durationMs || 0));
}

export function finishMindMcpDiagnostic(traceId, { status = 'ok', errorCode = null, windowKey } = {}) {
  const span = traceId ? activeSpans.get(traceId) : null;
  if (!span) return null;
  activeSpans.delete(traceId);
  const totalMs = roundMs(performance.now() - span.startedMark);
  const rendererMs = Number(span.phases.rendererMs || 0);
  const entry = {
    traceId: span.traceId,
    toolName: span.toolName,
    method: span.method,
    windowKey: windowKey ?? span.windowKey,
    status,
    errorCode,
    startedAt: span.startedAt,
    finishedAt: new Date().toISOString(),
    totalMs,
    phases: {
      ...span.phases,
      mainProcessMs: roundMs(Math.max(0, totalMs - rendererMs)),
    },
  };
  completedSpans.unshift(entry);
  if (completedSpans.length > MAX_DIAGNOSTIC_ENTRIES) completedSpans.length = MAX_DIAGNOSTIC_ENTRIES;
  return entry;
}

export function getMindMcpDiagnostics({ traceId, limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const entries = traceId
    ? completedSpans.filter((entry) => entry.traceId === traceId)
    : completedSpans.slice(0, safeLimit);
  return {
    ok: true,
    retainedCount: completedSpans.length,
    activeCount: activeSpans.size,
    entries: entries.slice(0, safeLimit),
  };
}

export function resetMindMcpDiagnosticsForTests() {
  activeSpans.clear();
  completedSpans.length = 0;
}
