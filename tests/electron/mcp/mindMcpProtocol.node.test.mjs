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
