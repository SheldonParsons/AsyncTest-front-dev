import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type MoveSubtreesCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
};

export type MoveSubtreesCommandOptions = {
  movingRootIds: string[];
  beforeChildrenByParent: Record<string, string[]>;
  afterChildrenByParent: Record<string, string[]>;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

export function createMoveSubtreesCommand(
  context: MoveSubtreesCommandContext,
  options: MoveSubtreesCommandOptions
): Command {
  const { movingRootIds, beforeChildrenByParent, afterChildrenByParent, previousSelection, nextSelection } = options;

  function applyChildrenSnapshots(nodes: MindNodes, snapshots: Record<string, string[]>) {
    for (const [parentId, children] of Object.entries(snapshots)) {
      const parent = nodes[parentId];
      if (!parent) continue;
      parent.children = [...children];
    }
  }

  return {
    name: 'MoveSubtreesCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyChildrenSnapshots(nodes, afterChildrenByParent);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:move-subtrees', { ensureVisibleNodeIds: movingRootIds });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyChildrenSnapshots(nodes, beforeChildrenByParent);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-move-subtrees', {
        ensureVisibleNodeIds: previousSelection.ids,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyChildrenSnapshots(nodes, afterChildrenByParent);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:redo-move-subtrees', { ensureVisibleNodeIds: movingRootIds });
    },
  };
}
