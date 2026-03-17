import { cloneNodeImage, setNodeImage, type MindNodeImage } from '../nodeContent';
import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type SetNodeImageCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
};

export type SetNodeImageCommandOptions = {
  nodeId: string;
  beforeImage: MindNodeImage;
  afterImage: MindNodeImage;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

export function createSetNodeImageCommand(
  context: SetNodeImageCommandContext,
  options: SetNodeImageCommandOptions
): Command {
  const { nodeId, beforeImage, afterImage, previousSelection, nextSelection } = options;
  return {
    name: 'SetNodeImageCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodeImage(nodes[nodeId], cloneNodeImage(afterImage));
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:set-node-image', { ensureVisibleNodeId: nodeId });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodeImage(nodes[nodeId], cloneNodeImage(beforeImage));
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-set-node-image', { ensureVisibleNodeId: nodeId });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodeImage(nodes[nodeId], cloneNodeImage(afterImage));
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:redo-set-node-image', { ensureVisibleNodeId: nodeId });
    },
  };
}
