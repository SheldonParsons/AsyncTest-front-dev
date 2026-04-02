import type { Command } from '../history';
import { insertSubtreeSnapshot, removeSubtreeSnapshot, type MindNodes, type MindSubtreeSnapshot } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type BatchDeleteTarget = {
  nodeId: string;
  parentId: string;
  indexInParent: number;
  deletedSnapshot: MindSubtreeSnapshot;
  skipParentChildrenMutation?: boolean;
};

export type BatchDeleteSubtreesCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: {
      ensureVisibleNodeIds?: string[];
      invalidateSubtreeHeightNodeIds?: string[];
      removedNodeIds?: string[];
      touchedParentIds?: string[];
      trustExistingNodeMeasureCache?: boolean;
      useLayoutChangedNodeIds?: boolean;
    }
  ) => Promise<void> | void;
  setLastDeletedNodeId?: (nodeId: string | null) => void;
};

export type BatchDeleteSubtreesCommandOptions = {
  targetsForMutation: BatchDeleteTarget[];
  previousSelection: SelectionSnapshot;
  nextSelectionId: string | null;
  lastDeletedNodeId: string | null;
  deleteMutationOptions?: {
    invalidateSubtreeHeightNodeIds?: string[];
    removedNodeIds?: string[];
    touchedParentIds?: string[];
    trustExistingNodeMeasureCache?: boolean;
    useLayoutChangedNodeIds?: boolean;
  };
  applyDoState?: (nodes: MindNodes) => void;
  applyUndoState?: (nodes: MindNodes) => void;
};

export function createBatchDeleteSubtreesCommand(
  context: BatchDeleteSubtreesCommandContext,
  options: BatchDeleteSubtreesCommandOptions
): Command {
  const {
    targetsForMutation,
    previousSelection,
    nextSelectionId,
    lastDeletedNodeId,
    deleteMutationOptions,
    applyDoState,
    applyUndoState,
  } = options;

  function remove(nodes: MindNodes) {
    targetsForMutation.forEach((target) => {
      const parent = nodes[target.parentId];
      if (parent && !target.skipParentChildrenMutation) {
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
        if (target.skipParentChildrenMutation) return;
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
      applyDoState?.(nodes);
      context.setLastDeletedNodeId?.(lastDeletedNodeId);
      context.setSelection(nextSelectionId ? [nextSelectionId] : [], nextSelectionId);
      void context.applyMutation('history:batch-delete-subtrees', {
        ensureVisibleNodeIds: nextSelectionId ? [nextSelectionId] : [],
        invalidateSubtreeHeightNodeIds: deleteMutationOptions?.invalidateSubtreeHeightNodeIds,
        removedNodeIds: deleteMutationOptions?.removedNodeIds,
        touchedParentIds: deleteMutationOptions?.touchedParentIds,
        trustExistingNodeMeasureCache: deleteMutationOptions?.trustExistingNodeMeasureCache,
        useLayoutChangedNodeIds: deleteMutationOptions?.useLayoutChangedNodeIds,
      });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      restore(nodes);
      applyUndoState?.(nodes);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-delete-subtrees', {
        ensureVisibleNodeIds: previousSelection.ids,
        invalidateSubtreeHeightNodeIds: deleteMutationOptions?.invalidateSubtreeHeightNodeIds,
        touchedParentIds: deleteMutationOptions?.touchedParentIds,
        trustExistingNodeMeasureCache: deleteMutationOptions?.trustExistingNodeMeasureCache,
        useLayoutChangedNodeIds: deleteMutationOptions?.useLayoutChangedNodeIds,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      remove(nodes);
      applyDoState?.(nodes);
      context.setLastDeletedNodeId?.(lastDeletedNodeId);
      context.setSelection(nextSelectionId ? [nextSelectionId] : [], nextSelectionId);
      void context.applyMutation('history:redo-batch-delete-subtrees', {
        ensureVisibleNodeIds: nextSelectionId ? [nextSelectionId] : [],
        invalidateSubtreeHeightNodeIds: deleteMutationOptions?.invalidateSubtreeHeightNodeIds,
        removedNodeIds: deleteMutationOptions?.removedNodeIds,
        touchedParentIds: deleteMutationOptions?.touchedParentIds,
        trustExistingNodeMeasureCache: deleteMutationOptions?.trustExistingNodeMeasureCache,
        useLayoutChangedNodeIds: deleteMutationOptions?.useLayoutChangedNodeIds,
      });
    },
  };
}
