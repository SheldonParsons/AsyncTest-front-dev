import type { Command } from '../history';
import { insertSubtreeSnapshot, removeSubtreeSnapshot, type MindNodes, type MindSubtreeSnapshot } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type BatchDeleteTarget = {
  nodeId: string;
  parentId: string;
  indexInParent: number;
  deletedSnapshot: MindSubtreeSnapshot;
};

export type BatchDeleteSubtreesCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
  setLastDeletedNodeId?: (nodeId: string | null) => void;
};

export type BatchDeleteSubtreesCommandOptions = {
  targetsForMutation: BatchDeleteTarget[];
  previousSelection: SelectionSnapshot;
  nextSelectionId: string | null;
  lastDeletedNodeId: string | null;
};

export function createBatchDeleteSubtreesCommand(
  context: BatchDeleteSubtreesCommandContext,
  options: BatchDeleteSubtreesCommandOptions
): Command {
  const { targetsForMutation, previousSelection, nextSelectionId, lastDeletedNodeId } = options;

  function remove(nodes: MindNodes) {
    targetsForMutation.forEach((target) => {
      const parent = nodes[target.parentId];
      if (parent) {
        parent.children = Array.isArray(parent.children) ? parent.children : [];
        const actualIndex = parent.children.indexOf(target.nodeId);
        if (actualIndex >= 0) parent.children.splice(actualIndex, 1);
      }
      removeSubtreeSnapshot(nodes, target.deletedSnapshot);
    });
  }

  function restore(nodes: MindNodes) {
    targetsForMutation
      .slice()
      .reverse()
      .forEach((target) => {
        insertSubtreeSnapshot(nodes, target.deletedSnapshot);
        const parent = nodes[target.parentId];
        if (!parent) return;
        parent.children = Array.isArray(parent.children) ? parent.children : [];
        if (!parent.children.includes(target.nodeId)) {
          parent.children.splice(Math.min(target.indexInParent, parent.children.length), 0, target.nodeId);
        }
      });
  }

  return {
    name: 'BatchDeleteSubtreesCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      remove(nodes);
      context.setLastDeletedNodeId?.(lastDeletedNodeId);
      context.setSelection(nextSelectionId ? [nextSelectionId] : [], nextSelectionId);
      void context.applyMutation('history:batch-delete-subtrees', {
        ensureVisibleNodeIds: nextSelectionId ? [nextSelectionId] : [],
      });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      restore(nodes);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-delete-subtrees', {
        ensureVisibleNodeIds: previousSelection.ids,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      remove(nodes);
      context.setLastDeletedNodeId?.(lastDeletedNodeId);
      context.setSelection(nextSelectionId ? [nextSelectionId] : [], nextSelectionId);
      void context.applyMutation('history:redo-batch-delete-subtrees', {
        ensureVisibleNodeIds: nextSelectionId ? [nextSelectionId] : [],
      });
    },
  };
}
