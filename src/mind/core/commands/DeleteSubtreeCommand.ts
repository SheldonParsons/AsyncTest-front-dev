import type { Command } from '../history';
import {
  insertSubtreeSnapshot,
  removeSubtreeSnapshot,
  type MindNodes,
  type MindSubtreeSnapshot,
} from './subtreeSnapshot';

export type DeleteSubtreeCommandContext = {
  getNodes: () => MindNodes | null;
  setSingleSelected: (nodeId: string | null) => void;
  applyMutation: (
    reason: string,
    options?: {
      ensureVisibleNodeId?: string | null;
      ensureVisibleNodeIds?: string[];
      invalidateSubtreeHeightNodeIds?: string[];
      removedNodeIds?: string[];
      touchedParentIds?: string[];
      trustExistingNodeMeasureCache?: boolean;
      useLayoutChangedNodeIds?: boolean;
    }
  ) => Promise<void> | void;
  setLastDeletedNodeId?: (nodeId: string | null) => void;
  debugEnabled?: boolean;
};

export type DeleteSubtreeCommandOptions = {
  targetNodeId: string;
  parentId: string;
  indexInParent: number;
  deletedSnapshot: MindSubtreeSnapshot;
  previousSelectionId: string | null;
  nextSelectionId: string | null;
  deleteMutationOptions?: {
    invalidateSubtreeHeightNodeIds?: string[];
    removedNodeIds?: string[];
    touchedParentIds?: string[];
    trustExistingNodeMeasureCache?: boolean;
    useLayoutChangedNodeIds?: boolean;
  };
};

export function createDeleteSubtreeCommand(
  context: DeleteSubtreeCommandContext,
  options: DeleteSubtreeCommandOptions
): Command {
  const {
    targetNodeId,
    parentId,
    indexInParent,
    deletedSnapshot,
    previousSelectionId,
    nextSelectionId,
    deleteMutationOptions,
  } = options;

  function removeFromParent(nodes: MindNodes) {
    const parent = nodes[parentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    const actualIndex = parent.children.indexOf(targetNodeId);
    if (actualIndex >= 0) parent.children.splice(actualIndex, 1);
  }

  function insertIntoParent(nodes: MindNodes) {
    const parent = nodes[parentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    if (!parent.children.includes(targetNodeId)) {
      parent.children.splice(Math.min(indexInParent, parent.children.length), 0, targetNodeId);
    }
  }

  return {
    name: 'DeleteSubtreeCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      removeFromParent(nodes);
      removeSubtreeSnapshot(nodes, deletedSnapshot);
      context.setLastDeletedNodeId?.(targetNodeId);
      context.setSingleSelected(nextSelectionId);
      if (context.debugEnabled) {
        console.debug('[mind-delete-subtree]', {
          nodeId: targetNodeId,
          parentId,
          indexInParent,
          subtreeSize: deletedSnapshot.nodeCount,
          nextSelectionId,
        });
      }
      void context.applyMutation('history:delete-subtree', {
        ensureVisibleNodeId: nextSelectionId,
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
      insertSubtreeSnapshot(nodes, deletedSnapshot);
      insertIntoParent(nodes);
      context.setSingleSelected(previousSelectionId);
      void context.applyMutation('history:undo-delete-subtree', {
        ensureVisibleNodeId: previousSelectionId,
      });
    },
  };
}
