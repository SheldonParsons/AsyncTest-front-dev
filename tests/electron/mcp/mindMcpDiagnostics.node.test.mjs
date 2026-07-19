import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginMindMcpDiagnostic,
  finishMindMcpDiagnostic,
  getMindMcpDiagnostics,
  recordMindMcpDiagnosticPhase,
  resetMindMcpDiagnosticsForTests,
} from '../../../electron/mcp/mindMcpDiagnostics.node.js';

test('diagnostics retain compact phase timings by trace id', () => {
  resetMindMcpDiagnosticsForTests();
  beginMindMcpDiagnostic({ traceId: 'trace-1', toolName: 'mind_get_subtree', method: 'mind.getSubtree' });
  recordMindMcpDiagnosticPhase('trace-1', 'rendererMs', 12.345);
  finishMindMcpDiagnostic('trace-1', { status: 'ok', windowKey: 'mind:a' });

  const result = getMindMcpDiagnostics({ traceId: 'trace-1' });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].phases.rendererMs, 12.35);
  assert.equal(result.entries[0].windowKey, 'mind:a');
});

