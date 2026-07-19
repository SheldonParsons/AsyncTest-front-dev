import assert from 'node:assert/strict';
import test from 'node:test';

import { removeMindRootDescendants } from '../../../electron/amind/mcpDocumentService.node.js';
import {
  getMindBoardNodeStatistics,
  summarizeMindDoc,
} from '../../../electron/mcp/mindContentService.node.js';

function createBoardWithDetachedDefaults() {
  const nodes = {
    root: { id: 'root', text: 'Root', children: ['a', 'b'], collapsed: false },
    a: { id: 'a', text: 'A', children: ['a-1'], collapsed: false },
    'a-1': { id: 'a-1', text: 'A1', children: [] },
    b: { id: 'b', text: 'B', children: [], collapsed: false },
    detached1: { id: 'detached1', text: 'Detached 1', children: [] },
    detached2: { id: 'detached2', text: 'Detached 2', children: [] },
  };
  return {
    id: 'mind-1',
    title: 'Board',
    roots: [{ rootId: 'root', rootKind: 'main' }],
    nodes,
  };
}

test('node statistics distinguish reachable, visible, total, and detached nodes', () => {
  const board = createBoardWithDetachedDefaults();
  assert.deepEqual(getMindBoardNodeStatistics(board), {
    nodeCount: 4,
    reachableNodeCount: 4,
    visibleNodeCount: 4,
    totalNodeCount: 6,
    detachedNodeCount: 2,
  });

  board.nodes.a.collapsed = true;
  assert.equal(getMindBoardNodeStatistics(board).visibleNodeCount, 3);

  const summary = summarizeMindDoc({
    manifest: { title: 'Document' },
    mind: { activeMindId: 'mind-1', minds: { 'mind-1': board } },
  });
  assert.equal(summary.nodeCount, 4);
  assert.equal(summary.totalNodeCount, 6);
  assert.equal(summary.detachedNodeCount, 2);
});

test('replacing MCP document children removes the previous root subtree', () => {
  const board = createBoardWithDetachedDefaults();
  const removedCount = removeMindRootDescendants(board, 'root');
  assert.equal(removedCount, 3);
  assert.deepEqual(board.nodes.root.children, []);
  assert.deepEqual(Object.keys(board.nodes).sort(), ['detached1', 'detached2', 'root']);
});

