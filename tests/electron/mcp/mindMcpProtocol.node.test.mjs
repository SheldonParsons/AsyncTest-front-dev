import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertMindMcpIdentityCompatible,
  compareMindMcpIdentity,
  createMindMcpError,
  getAsyncTestMindMcpIdentity,
  normalizeMindMcpError,
} from '../../../electron/mcp/mindMcpProtocol.node.js';

test('MCP identity comparison detects current, stale, and legacy clients', () => {
  assert.equal(compareMindMcpIdentity(getAsyncTestMindMcpIdentity()).mismatch, false);
  const compatibleOlderClient = compareMindMcpIdentity({
    version: '0.6.1',
    capabilityRevision: 12,
    protocolRevision: 2,
  });
  assert.equal(compatibleOlderClient.mismatch, false);
  assert.equal(compatibleOlderClient.upgradeAvailable, true);
  assert.doesNotThrow(() => assertMindMcpIdentityCompatible({
    version: '0.6.1',
    capabilityRevision: 12,
    protocolRevision: 2,
  }));
  assert.equal(compareMindMcpIdentity({ version: '0.5.1', capabilityRevision: 10, protocolRevision: 1 }).mismatch, true);
  assert.equal(compareMindMcpIdentity(null).reason, 'legacy-or-unknown');
  assert.throws(
    () => assertMindMcpIdentityCompatible(null),
    (error) => error.code === 'MCP_VERSION_MISMATCH' && error.retryAllowed === false
  );
});

test('standard errors always include recovery and retry guidance', () => {
  const payload = normalizeMindMcpError(createMindMcpError('REVISION_MISMATCH', 'Document changed'));
  assert.deepEqual(payload, {
    code: 'REVISION_MISMATCH',
    message: 'Document changed',
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Read the latest document state, then retry with the current revision.',
  });
});

test('renderer timeouts require status inspection before retry', () => {
  const error = createMindMcpError('RENDERER_RESPONSE_TIMEOUT', 'renderer timed out');
  assert.equal(error.recoverable, true);
  assert.equal(error.retryAllowed, false);
  assert.match(error.suggestedAction, /mind_get_operation_status/);
});
