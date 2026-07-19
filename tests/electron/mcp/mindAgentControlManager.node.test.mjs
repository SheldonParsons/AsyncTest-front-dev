import assert from 'node:assert/strict';
import test from 'node:test';

import {
  approveMindAgentControlRestore,
  beginMindAgentExecution,
  endMindAgentExecution,
  endMindAgentSession,
  getMindAgentControlState,
  pruneExpiredMindAgentSessions,
  resetMindAgentControlForTests,
  revokeMindAgentControl,
  touchMindAgentSession,
  unregisterMindAgentClient,
} from '../../../electron/mcp/mindAgentControlManager.node.js';
import { getAsyncTestMindMcpIdentity } from '../../../electron/mcp/mindMcpProtocol.node.js';

function resetControl() {
  resetMindAgentControlForTests();
}

test('Agent lifecycle separates connected sessions from window-scoped executions', () => {
  resetControl();
  const identity = getAsyncTestMindMcpIdentity();

  touchMindAgentSession({ clientId: 'agent-a', toolName: 'mind_get_document_outline', identity, now: 1000 });
  assert.equal(getMindAgentControlState().status, 'connected');
  assert.equal(getMindAgentControlState().hasVersionMismatch, false);
  assert.deepEqual(getMindAgentControlState().lockedWindowKeys, []);

  beginMindAgentExecution({
    clientId: 'agent-a',
    toolName: 'mind_delete_node',
    traceId: 'trace-a',
    windowKey: 'mind:a',
    locksWindow: true,
    identity,
    now: 2000,
  });
  assert.equal(getMindAgentControlState().status, 'executing');
  assert.deepEqual(getMindAgentControlState().lockedWindowKeys, ['mind:a']);

  beginMindAgentExecution({
    clientId: 'agent-b',
    toolName: 'mind_create_nodes',
    traceId: 'trace-b',
    windowKey: 'mind:b',
    locksWindow: true,
    identity,
    now: 3000,
  });
  assert.deepEqual(new Set(getMindAgentControlState().lockedWindowKeys), new Set(['mind:a', 'mind:b']));

  endMindAgentExecution({ clientId: 'agent-a', traceId: 'trace-a', now: 4000 });
  assert.deepEqual(getMindAgentControlState().lockedWindowKeys, ['mind:b']);

  endMindAgentExecution({ clientId: 'agent-b', traceId: 'trace-b', now: 5000 });
  assert.equal(getMindAgentControlState().status, 'connected');
  assert.deepEqual(getMindAgentControlState().lockedWindowKeys, []);

  endMindAgentSession('agent-a');
  endMindAgentSession('agent-b');
  assert.equal(getMindAgentControlState().status, 'idle');
});

test('unknown MCP identity is reported and idle sessions expire automatically', () => {
  resetControl();
  touchMindAgentSession({ clientId: 'legacy-agent', toolName: 'legacy', now: 1000 });
  assert.equal(getMindAgentControlState().hasVersionMismatch, true);
  assert.equal(getMindAgentControlState().connectedMcpClients[0].mismatchReason, 'legacy-or-unknown');

  pruneExpiredMindAgentSessions(2 * 60 * 1000 + 1001);
  assert.equal(getMindAgentControlState().status, 'idle');
});

test('read executions are visible without locking the target window', () => {
  resetControl();
  beginMindAgentExecution({
    clientId: 'agent-read',
    toolName: 'mind_get_subtree',
    traceId: 'trace-read',
    windowKey: 'mind:a',
    identity: getAsyncTestMindMcpIdentity(),
  });
  const state = getMindAgentControlState();
  assert.equal(state.status, 'executing');
  assert.deepEqual(state.executingWindowKeys, ['mind:a']);
  assert.deepEqual(state.lockedWindowKeys, []);
  endMindAgentSession('agent-read');
});

test('revoking control clears connected sessions and executions', () => {
  resetControl();
  beginMindAgentExecution({
    clientId: 'agent-a',
    toolName: 'mind_create_nodes',
    traceId: 'trace-a',
    windowKey: 'mind:a',
    locksWindow: true,
    identity: getAsyncTestMindMcpIdentity(),
  });
  revokeMindAgentControl('test');
  const revoked = getMindAgentControlState();
  assert.equal(revoked.status, 'revoked');
  assert.equal(revoked.activeExecutionCount, 0);
  assert.deepEqual(revoked.lockedWindowKeys, []);
  approveMindAgentControlRestore();
});

test('ending a task keeps transport version visible until the client disconnects', () => {
  resetControl();
  touchMindAgentSession({
    clientId: 'agent-a',
    toolName: 'mind_list_windows',
    identity: getAsyncTestMindMcpIdentity(),
  });
  endMindAgentSession('agent-a');
  assert.equal(getMindAgentControlState().status, 'idle');
  assert.equal(getMindAgentControlState().connectedMcpClients.length, 1);
  unregisterMindAgentClient('agent-a');
  assert.equal(getMindAgentControlState().connectedMcpClients.length, 0);
});
