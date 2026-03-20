import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type BatchAddParentGroup = {
  parentId: string;
  childIds: string[];
  beforeChildren: string[];
  afterChildren: string[];
  newParentId: string;
};

export type BatchAddParentCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: {
      ensureVisibleNodeIds?: string[];
      invalidateSubtreeHeightNodeIds?: string[];
      touchedParentIds?: string[];
      trustExistingNodeMeasureCache?: boolean;
      useLayoutChangedNodeIds?: boolean;
    }
  ) => Promise<void> | void;
  createNodeRecord: (nodeId: string) => any;
};

export type BatchAddParentCommandOptions = {
  groups: BatchAddParentGroup[];
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
  insertMutationOptions?: {
    ensureVisibleNodeIds?: string[];
    invalidateSubtreeHeightNodeIds?: string[];
    touchedParentIds?: string[];
    trustExistingNodeMeasureCache?: boolean;
    useLayoutChangedNodeIds?: boolean;
  };
};

export function createBatchAddParentCommand(context: BatchAddParentCommandContext, options: BatchAddParentCommandOptions): Command {
  const { groups, previousSelection, nextSelection, insertMutationOptions } = options;
  const ensureVisibleNodeIds = nextSelection.ids.length
    ? [...nextSelection.ids]
    : groups.map((group) => group.newParentId);

  function applyInsert(nodes: MindNodes) {
    groups.forEach((group) => {
      const parent = nodes[group.parentId];
      if (!parent) return;
      if (!nodes[group.newParentId]) nodes[group.newParentId] = context.createNodeRecord(group.newParentId);
      nodes[group.newParentId].children = [...group.childIds];
      parent.children = [...group.afterChildren];
    });
  }

  function applyRemove(nodes: MindNodes) {
    groups.forEach((group) => {
      const parent = nodes[group.parentId];
      if (parent) parent.children = [...group.beforeChildren];
      delete nodes[group.newParentId];
    });
  }

  return {
    name: 'BatchAddParentCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyInsert(nodes);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:batch-add-parent', {
        ensureVisibleNodeIds,
        invalidateSubtreeHeightNodeIds: insertMutationOptions?.invalidateSubtreeHeightNodeIds,
        touchedParentIds: insertMutationOptions?.touchedParentIds,
        trustExistingNodeMeasureCache: insertMutationOptions?.trustExistingNodeMeasureCache,
        useLayoutChangedNodeIds: insertMutationOptions?.useLayoutChangedNodeIds,
      });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyRemove(nodes);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-batch-add-parent', {
        ensureVisibleNodeIds: previousSelection.ids,
      });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes) return;
      applyInsert(nodes);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:redo-batch-add-parent', {
        ensureVisibleNodeIds,
        invalidateSubtreeHeightNodeIds: insertMutationOptions?.invalidateSubtreeHeightNodeIds,
        touchedParentIds: insertMutationOptions?.touchedParentIds,
        trustExistingNodeMeasureCache: insertMutationOptions?.trustExistingNodeMeasureCache,
        useLayoutChangedNodeIds: insertMutationOptions?.useLayoutChangedNodeIds,
      });
    },
  };
}
