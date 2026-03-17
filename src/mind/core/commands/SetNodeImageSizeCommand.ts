import { cloneNodeImage, getNodeImage, setNodeImage } from '../nodeContent';
import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type NodeImageSize = {
  width: number;
  height: number;
};

export type SetNodeImageSizeCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }
  ) => Promise<void> | void;
};

export type SetNodeImageSizeCommandOptions = {
  nodeId: string;
  beforeSize: NodeImageSize;
  afterSize: NodeImageSize;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

function applyImageSize(nodes: MindNodes, nodeId: string, size: NodeImageSize) {
  const currentImage = getNodeImage(nodes[nodeId]);
  if (!currentImage) return;
  const nextImage = cloneNodeImage(currentImage);
  if (!nextImage) return;
  nextImage.width = size.width;
  nextImage.height = size.height;
  setNodeImage(nodes[nodeId], nextImage);
}

export function createSetNodeImageSizeCommand(
  context: SetNodeImageSizeCommandContext,
  options: SetNodeImageSizeCommandOptions
): Command {
  const { nodeId, beforeSize, afterSize, previousSelection, nextSelection } = options;
  return {
    name: 'SetNodeImageSizeCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      applyImageSize(nodes, nodeId, afterSize);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:set-node-image-size', { ensureVisibleNodeId: nodeId });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      applyImageSize(nodes, nodeId, beforeSize);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-set-node-image-size', { ensureVisibleNodeId: nodeId });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      applyImageSize(nodes, nodeId, afterSize);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:redo-set-node-image-size', { ensureVisibleNodeId: nodeId });
    },
  };
}

