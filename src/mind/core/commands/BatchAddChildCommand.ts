import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';

export type SelectionSnapshot = {
  ids: string[];
  primaryId: string | null;
};

export type BatchAddChildCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  startEditing: (nodeId: string) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
  createNodeRecord: (nodeId: string) => any;
};

export type BatchAddChildCommandOptions = {
  parentIds: string[];
  newNodeIds: string[];
  previousSelection: SelectionSnapshot;
};

export function createBatchAddChildCommand(
  context: BatchAddChildCommandContext,
  options: BatchAddChildCommandOptions
): Command {
  const { parentIds, newNodeIds, previousSelection } = options;

  return {
    name: 'BatchAddChildCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      parentIds.forEach((parentId, index) => {
        const parent = nodes[parentId];
        if (!parent) return;
        parent.children = Array.isArray(parent.children) ? parent.children : [];
        const newNodeId = newNodeIds[index];
        if (!nodes[newNodeId]) nodes[newNodeId] = context.createNodeRecord(newNodeId);
        parent.children.push(newNodeId);
      });
      context.setSelection(newNodeIds, newNodeIds[newNodeIds.length - 1] ?? null);
      const lastAddedId = newNodeIds[newNodeIds.length - 1];
      if (lastAddedId) context.startEditing(lastAddedId);
      void context.applyMutation('history:batch-add-child', { ensureVisibleNodeIds: newNodeIds });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      parentIds.forEach((parentId, index) => {
        const parent = nodes[parentId];
        if (!parent) return;
        parent.children = Array.isArray(parent.children) ? parent.children : [];
        const newNodeId = newNodeIds[index];
        const childIndex = parent.children.indexOf(newNodeId);
        if (childIndex >= 0) parent.children.splice(childIndex, 1);
        delete nodes[newNodeId];
      });
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-add-child', {
        ensureVisibleNodeIds: previousSelection.ids,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      parentIds.forEach((parentId, index) => {
        const parent = nodes[parentId];
        if (!parent) return;
        parent.children = Array.isArray(parent.children) ? parent.children : [];
        const newNodeId = newNodeIds[index];
        if (!nodes[newNodeId]) nodes[newNodeId] = context.createNodeRecord(newNodeId);
        if (!parent.children.includes(newNodeId)) parent.children.push(newNodeId);
      });
      context.setSelection(newNodeIds, newNodeIds[newNodeIds.length - 1] ?? null);
      const lastAddedId = newNodeIds[newNodeIds.length - 1];
      if (lastAddedId) context.startEditing(lastAddedId);
      void context.applyMutation('history:redo-batch-add-child', { ensureVisibleNodeIds: newNodeIds });
    },
  };
}
