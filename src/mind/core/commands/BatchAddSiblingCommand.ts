import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type BatchAddSiblingTarget = {
  nodeId: string;
  parentId: string;
  indexInParent: number;
  insertIndex: number;
};

export type BatchAddSiblingCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  startEditing: (nodeId: string) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
  createNodeRecord: (nodeId: string) => any;
};

export type BatchAddSiblingCommandOptions = {
  targetsForMutation: BatchAddSiblingTarget[];
  newNodeIdsByTargetId: Record<string, string>;
  addedNodeIdsInSelectionOrder: string[];
  previousSelection: SelectionSnapshot;
};

export function createBatchAddSiblingCommand(
  context: BatchAddSiblingCommandContext,
  options: BatchAddSiblingCommandOptions
): Command {
  const { targetsForMutation, newNodeIdsByTargetId, addedNodeIdsInSelectionOrder, previousSelection } = options;

  function insert(nodes: MindNodes) {
    targetsForMutation.forEach((target) => {
      const parent = nodes[target.parentId];
      if (!parent) return;
      parent.children = Array.isArray(parent.children) ? parent.children : [];
      const newNodeId = newNodeIdsByTargetId[target.nodeId];
      if (!nodes[newNodeId]) nodes[newNodeId] = context.createNodeRecord(newNodeId);
      if (!parent.children.includes(newNodeId)) {
        parent.children.splice(Math.min(target.insertIndex, parent.children.length), 0, newNodeId);
      }
    });
  }

  function remove(nodes: MindNodes) {
    targetsForMutation.forEach((target) => {
      const parent = nodes[target.parentId];
      if (!parent) return;
      parent.children = Array.isArray(parent.children) ? parent.children : [];
      const newNodeId = newNodeIdsByTargetId[target.nodeId];
      const actualIndex = parent.children.indexOf(newNodeId);
      if (actualIndex >= 0) parent.children.splice(actualIndex, 1);
      delete nodes[newNodeId];
    });
  }

  return {
    name: 'BatchAddSiblingCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insert(nodes);
      context.setSelection(addedNodeIdsInSelectionOrder, addedNodeIdsInSelectionOrder[addedNodeIdsInSelectionOrder.length - 1] ?? null);
      const lastAddedId = addedNodeIdsInSelectionOrder[addedNodeIdsInSelectionOrder.length - 1];
      if (lastAddedId) context.startEditing(lastAddedId);
      void context.applyMutation('history:batch-add-sibling', { ensureVisibleNodeIds: addedNodeIdsInSelectionOrder });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      remove(nodes);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-add-sibling', { ensureVisibleNodeIds: previousSelection.ids });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insert(nodes);
      context.setSelection(addedNodeIdsInSelectionOrder, addedNodeIdsInSelectionOrder[addedNodeIdsInSelectionOrder.length - 1] ?? null);
      const lastAddedId = addedNodeIdsInSelectionOrder[addedNodeIdsInSelectionOrder.length - 1];
      if (lastAddedId) context.startEditing(lastAddedId);
      void context.applyMutation('history:redo-batch-add-sibling', { ensureVisibleNodeIds: addedNodeIdsInSelectionOrder });
    },
  };
}
