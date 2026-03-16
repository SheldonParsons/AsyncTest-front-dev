import type { Command } from '../history';
import { insertSubtreeSnapshot, remapSubtreeSnapshot, removeSubtreeSnapshot, type MindNodes, type MindSubtreeSnapshot } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type BatchPasteSubtreesCommandContext = {
  getNodes: () => MindNodes | null;
  createNodeId: () => string;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  startEditing: (nodeId: string) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
  setLastPastedRootId?: (nodeId: string | null) => void;
};

export type BatchPasteSubtreesCommandOptions = {
  targetParentId: string;
  insertIndex: number;
  clipboardItems: MindSubtreeSnapshot[];
  previousSelection: SelectionSnapshot;
};

export function createBatchPasteSubtreesCommand(
  context: BatchPasteSubtreesCommandContext,
  options: BatchPasteSubtreesCommandOptions
): Command {
  const { targetParentId, insertIndex, clipboardItems, previousSelection } = options;
  const remappedItems = clipboardItems.map((item) => remapSubtreeSnapshot(item, context.createNodeId).snapshot);
  const pastedRootIds = remappedItems.map((item) => item.rootId);

  function insert(nodes: MindNodes) {
    const parent = nodes[targetParentId];
    if (!parent) return;
    parent.children = Array.isArray(parent.children) ? parent.children : [];
    remappedItems.forEach((snapshot, index) => {
      insertSubtreeSnapshot(nodes, snapshot);
      if (!parent.children.includes(snapshot.rootId)) {
        parent.children.splice(Math.min(insertIndex + index, parent.children.length), 0, snapshot.rootId);
      }
    });
  }

  function remove(nodes: MindNodes) {
    const parent = nodes[targetParentId];
    if (parent) {
      parent.children = Array.isArray(parent.children) ? parent.children : [];
      remappedItems.forEach((snapshot) => {
        const actualIndex = parent.children.indexOf(snapshot.rootId);
        if (actualIndex >= 0) parent.children.splice(actualIndex, 1);
      });
    }
    remappedItems.forEach((snapshot) => removeSubtreeSnapshot(nodes, snapshot));
  }

  return {
    name: 'BatchPasteSubtreesCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insert(nodes);
      context.setLastPastedRootId?.(pastedRootIds[pastedRootIds.length - 1] ?? null);
      context.setSelection(pastedRootIds, pastedRootIds[pastedRootIds.length - 1] ?? null);
      const lastRootId = pastedRootIds[pastedRootIds.length - 1];
      if (lastRootId) context.startEditing(lastRootId);
      void context.applyMutation('history:batch-paste-subtrees', { ensureVisibleNodeIds: pastedRootIds });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      remove(nodes);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-paste-subtrees', {
        ensureVisibleNodeIds: previousSelection.ids,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      insert(nodes);
      context.setLastPastedRootId?.(pastedRootIds[pastedRootIds.length - 1] ?? null);
      context.setSelection(pastedRootIds, pastedRootIds[pastedRootIds.length - 1] ?? null);
      const lastRootId = pastedRootIds[pastedRootIds.length - 1];
      if (lastRootId) context.startEditing(lastRootId);
      void context.applyMutation('history:redo-batch-paste-subtrees', { ensureVisibleNodeIds: pastedRootIds });
    },
  };
}
