import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isMindWindowWriteMethod,
  resolveMindExecutionWindowKey,
  resolveMindWriteWindowKey,
} from '../../../electron/mcp/mindWindowTargeting.node.js';

const windows = [
  { windowKey: 'mind:a', docId: 'doc:a', title: 'A', focused: true },
  { windowKey: 'mind:b', docId: 'doc:b', title: 'B', focused: false },
];

test('write method classification covers destructive node edits', () => {
  assert.equal(isMindWindowWriteMethod('mind.deleteNode'), true);
  assert.equal(isMindWindowWriteMethod('mind.applyNodeOperations'), true);
  assert.equal(isMindWindowWriteMethod('mind.getDocumentOutline'), false);
});

test('single-window writes may omit windowKey', () => {
  assert.equal(resolveMindWriteWindowKey({}, [windows[0]]), 'mind:a');
});

test('multi-window writes require an explicit windowKey even when one window is focused', () => {
  assert.throws(
    () => resolveMindWriteWindowKey({}, windows),
    (error) => {
      assert.equal(error.code, 'AMBIGUOUS_WINDOW');
      assert.equal(error.retryAllowed, true);
      assert.deepEqual(error.details.windows.map((window) => window.windowKey), ['mind:a', 'mind:b']);
      return true;
    }
  );
});

test('explicit write target must identify an open Mind window', () => {
  assert.equal(resolveMindWriteWindowKey({ windowKey: 'mind:b' }, windows), 'mind:b');
  assert.throws(
    () => resolveMindWriteWindowKey({ windowKey: 'mind:missing' }, windows),
    (error) => error.code === 'WINDOW_NOT_FOUND'
  );
});

test('read execution targeting is best-effort and never applies write ambiguity rules', () => {
  assert.equal(resolveMindExecutionWindowKey('mind.getSubtree', {}, [windows[0]]), 'mind:a');
  assert.equal(resolveMindExecutionWindowKey('mind.getSubtree', {}, windows), null);
  assert.equal(resolveMindExecutionWindowKey('mind.getSubtree', { windowKey: 'mind:b' }, windows), 'mind:b');
  assert.equal(resolveMindExecutionWindowKey('mind.readFile', {}, [windows[0]]), null);
});
