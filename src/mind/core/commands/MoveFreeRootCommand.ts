import type { Command } from '../history';
import type { SelectionSnapshot } from './BatchAddChildCommand';

type RootPosition = { x: number; y: number };

export type MoveFreeRootCommandContext = {
  getMind: () => { roots?: Array<{ rootId?: string; pos?: RootPosition | null }> } | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: {
      ensureVisibleNodeIds?: string[];
      forceFullEdgeRebuild?: boolean;
      reuseDescendantCounts?: boolean;
      reuseParentIndex?: boolean;
      trustExistingNodeMeasureCache?: boolean;
      useLayoutChangedNodeIds?: boolean;
    }
  ) => Promise<void> | void;
};

export type MoveFreeRootCommandOptions = {
  rootId: string;
  beforePos: RootPosition;
  afterPos: RootPosition;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

function applyRootPosition(
  roots: Array<{ rootId?: string; pos?: RootPosition | null }> | undefined,
  rootId: string,
  position: RootPosition
) {
  const target = Array.isArray(roots) ? roots.find((root) => root?.rootId === rootId) : null;
  if (!target) return false;
  target.pos = { x: position.x, y: position.y };
  return true;
}

export function createMoveFreeRootCommand(
  context: MoveFreeRootCommandContext,
  options: MoveFreeRootCommandOptions
): Command {
  const { rootId, beforePos, afterPos, previousSelection, nextSelection } = options;

  const apply = (position: RootPosition, selection: SelectionSnapshot, reason: string) => {
    const mind = context.getMind();
    if (!mind) return;
    if (!applyRootPosition(mind.roots, rootId, position)) return;
    context.setSelection(selection.ids, selection.primaryId);
    void context.applyMutation(reason, {
      ensureVisibleNodeIds: [rootId],
      forceFullEdgeRebuild: true,
      reuseDescendantCounts: true,
      reuseParentIndex: true,
      trustExistingNodeMeasureCache: true,
      useLayoutChangedNodeIds: true,
    });
  };

  return {
    name: 'MoveFreeRootCommand',
    do: () => apply(afterPos, nextSelection, 'history:move-free-root'),
    undo: () => apply(beforePos, previousSelection, 'history:undo-move-free-root'),
    redo: () => apply(afterPos, nextSelection, 'history:redo-move-free-root'),
  };
}
