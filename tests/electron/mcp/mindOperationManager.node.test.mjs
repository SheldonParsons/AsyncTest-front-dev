import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginMindOperation,
  completeMindOperation,
  failMindOperation,
  getMindOperationStatus,
  resetMindOperationsForTests,
  startMindOperation,
  updateMindOperationProgress,
} from '../../../electron/mcp/mindOperationManager.node.js';

test.beforeEach(() => {
  resetMindOperationsForTests();
});

test('running operations tell agents to wait instead of duplicating a write', () => {
  const operation = beginMindOperation({
    windowKey: 'mind:workspace#doc-1',
    transactionId: 'tx-running',
    clientId: 'client-1',
    totalCount: 200,
  });
  updateMindOperationProgress(operation, { completedCount: 50, currentNodeId: 'node-50' });

  const status = getMindOperationStatus('mind:workspace#doc-1');
  assert.equal(status.status, 'running');
  assert.equal(status.health, 'working');
  assert.equal(status.inProgress, true);
  assert.equal(status.progressPercent, 25);
  assert.equal(status.agentAction, 'wait');
  assert.equal(status.retryAllowed, false);
  assert.equal(status.currentNodeId, 'node-50');
});

test('preparing operations prevent duplicate writes before renderer playback starts', () => {
  const operation = beginMindOperation({
    windowKey: 'mind:workspace#doc-preparing',
    transactionId: 'tx-preparing',
    totalCount: 1,
    status: 'preparing',
  });

  const preparing = getMindOperationStatus(operation.windowKey);
  assert.equal(preparing.status, 'preparing');
  assert.equal(preparing.inProgress, true);
  assert.equal(preparing.agentAction, 'wait');
  assert.equal(preparing.retryAllowed, false);

  startMindOperation(operation, { totalCount: 642 });
  const running = getMindOperationStatus(operation.windowKey);
  assert.equal(running.status, 'running');
  assert.equal(running.totalCount, 642);
});

test('completed operations tell agents not to replay the transaction', () => {
  const operation = beginMindOperation({
    windowKey: 'mind:workspace#doc-2',
    transactionId: 'tx-complete',
    totalCount: 10,
  });
  completeMindOperation(operation, { appliedCount: 10, revision: '2' });

  const status = getMindOperationStatus('mind:workspace#doc-2');
  assert.equal(status.status, 'completed');
  assert.equal(status.progressPercent, 100);
  assert.equal(status.agentAction, 'continue');
  assert.equal(status.retryAllowed, false);
});

test('renderer timeout remains outcome-unknown and requires verification', () => {
  const operation = beginMindOperation({
    windowKey: 'mind:workspace#doc-3',
    transactionId: 'tx-timeout',
    totalCount: 642,
  });
  const error = new Error('renderer response timeout');
  error.code = 'RENDERER_RESPONSE_TIMEOUT';
  error.recoverable = true;
  error.retryAllowed = false;
  failMindOperation(operation, error, { completedCount: 320 });

  const status = getMindOperationStatus('mind:workspace#doc-3');
  assert.equal(status.status, 'failed');
  assert.equal(status.completedCount, 320);
  assert.equal(status.agentAction, 'verify');
  assert.equal(status.retryAllowed, false);
  assert.match(status.suggestedAction, /Read the current document/);
});

test('known errors use the same recovery guidance as the public error protocol', () => {
  const operation = beginMindOperation({
    windowKey: 'mind:workspace#doc-revision',
    transactionId: 'tx-revision',
    totalCount: 1,
    status: 'preparing',
  });
  const error = new Error('Document revision mismatch');
  error.code = 'REVISION_MISMATCH';
  failMindOperation(operation, error);

  const status = getMindOperationStatus(operation.windowKey);
  assert.equal(status.status, 'failed');
  assert.equal(status.errorCode, 'REVISION_MISMATCH');
  assert.equal(status.agentAction, 'retry');
  assert.equal(status.retryAllowed, true);
  assert.match(status.suggestedAction, /latest document state/);
});
