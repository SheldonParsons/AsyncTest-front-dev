import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAdvertisedAsyncTestMindMcpTools,
  resolveAsyncTestMindToolBridgeMethod,
} from '../../../electron/mcp/asynctest-mind-mcp.mjs';

test('tools/list exposes a compact core while compatibility tools stay internal', () => {
  const names = getAdvertisedAsyncTestMindMcpTools().map((tool) => tool.name);
  assert.equal(names.length, 16);
  assert.ok(names.includes('mind_apply_node_operations'));
  assert.ok(names.includes('mind_get_diagnostics'));
  assert.ok(names.includes('mind_request_control_restore'));
  assert.ok(names.includes('mind_read_file'));
  assert.ok(names.includes('mind_manage_windows'));
  assert.ok(names.includes('mind_search_nodes'));
  assert.ok(!names.includes('mind_update_node_text'));
  assert.ok(!names.includes('mind_close_all_windows'));
});

test('window facade routes actions to existing compatibility handlers', () => {
  assert.equal(resolveAsyncTestMindToolBridgeMethod('mind_manage_windows', { action: 'open_xmind' }), 'mind.openXmindFile');
  assert.equal(resolveAsyncTestMindToolBridgeMethod('mind_manage_windows', { action: 'close_window' }), 'mind.closeWindow');
  assert.equal(resolveAsyncTestMindToolBridgeMethod('mind_manage_windows', { action: 'unknown' }), null);
});
