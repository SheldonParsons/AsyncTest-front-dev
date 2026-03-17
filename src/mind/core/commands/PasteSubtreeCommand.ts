import type { Command } from '../history';
import {
  insertSubtreeSnapshot,
  remapSubtreeSnapshot,
  removeSubtreeSnapshot,
  type MindNodes,
  type MindSubtreeSnapshot,
} from './subtreeSnapshot';

export type PasteSubtreeCommandContext = {
  getNodes: () => MindNodes | null;
  createNodeId: () => string;
  setSingleSelected: (nodeId: string | null) => void;
  resolveFallbackSelection: (preferredId: string | null, parentId?: string | null) => string | null;
  applyMutation: (
    reason: string,
    options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }
  ) => Promise<void> | void;
  setLastPastedRootId?: (nodeId: string | null) => void;
  debugEnabled?: boolean;
};

export type PasteSubtreeCommandOptions = {
  targetParentId: string;
  insertIndex: number;
  clipboardSnapshotSource: MindSubtreeSnapshot;
  previousSelectionId: string | null;
};

export function createPasteSubtreeCommand(
  context: PasteSubtreeCommandContext,
  options: PasteSubtreeCommandOptions
): Command {
  const { targetParentId, insertIndex, clipboardSnapshotSource, previousSelectionId } = options;
  const { snapshot: pastedSnapshotWithNewIds, idRemap } = remapSubtreeSnapshot(
    clipboardSnapshotSource,
    context.createNodeId
  );
  const newSelectionId = pastedSnapshotWithNewIds.rootId;

  function insertIntoParent(nodes: MindNodes) {
    const parent = nodes[targetParentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    if (!parent.children.includes(newSelectionId)) {
      parent.children.splice(Math.min(insertIndex, parent.children.length), 0, newSelectionId);
    }
  }

  function removeFromParent(nodes: MindNodes) {
    const parent = nodes[targetParentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    const actualIndex = parent.children.indexOf(newSelectionId);
    if (actualIndex >= 0) parent.children.splice(actualIndex, 1);
  }

  return {
    name: 'PasteSubtreeCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insertSubtreeSnapshot(nodes, pastedSnapshotWithNewIds);
      insertIntoParent(nodes);
      context.setLastPastedRootId?.(newSelectionId);
      context.setSingleSelected(newSelectionId);
      if (context.debugEnabled) {
        console.debug('[mind-paste-subtree]', {
          parentId: targetParentId,
          insertIndex,
          pastedRootId: newSelectionId,
          subtreeSize: pastedSnapshotWithNewIds.nodeCount,
          idRemapSize: Object.keys(idRemap).length,
        });
      }
      void context.applyMutation('history:paste-subtree', { ensureVisibleNodeId: newSelectionId });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      removeFromParent(nodes);
      removeSubtreeSnapshot(nodes, pastedSnapshotWithNewIds);
      const restoredSelectionId = context.resolveFallbackSelection(previousSelectionId, targetParentId);
      context.setSingleSelected(restoredSelectionId);
      void context.applyMutation('history:undo-paste-subtree', {
        ensureVisibleNodeId: restoredSelectionId,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insertSubtreeSnapshot(nodes, pastedSnapshotWithNewIds);
      insertIntoParent(nodes);
      context.setLastPastedRootId?.(newSelectionId);
      context.setSingleSelected(newSelectionId);
      void context.applyMutation('history:redo-paste-subtree', { ensureVisibleNodeId: newSelectionId });
    },
  };
}
