import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIND_RENDERER_HARD_TIMEOUT_MS,
  MIND_RENDERER_IDLE_TIMEOUT_MS,
  getMindRendererTimeoutPolicy,
} from '../../../electron/mcp/mindRendererTimeoutPolicy.node.js';

test('document transactions survive an idle render interval until the hard timeout', () => {
  assert.deepEqual(getMindRendererTimeoutPolicy('mind.commitDocumentTransaction'), {
    idleTimeoutMs: MIND_RENDERER_IDLE_TIMEOUT_MS,
    hardTimeoutMs: MIND_RENDERER_HARD_TIMEOUT_MS,
    keepWaitingAfterIdle: true,
  });
});

test('ordinary renderer requests still fail fast when the renderer is unresponsive', () => {
  assert.equal(getMindRendererTimeoutPolicy('mind.getDocumentOutline').keepWaitingAfterIdle, false);
  assert.equal(getMindRendererTimeoutPolicy('mind.getTransactionSnapshot').keepWaitingAfterIdle, false);
});
