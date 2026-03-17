import { setNodePlainText } from '../nodeContent';
import type { Command } from '../history';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type UpdateNodeTextCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
};

export type UpdateNodeTextCommandOptions = {
  nodeId: string;
  beforeText: string;
  afterText: string;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

export function createUpdateNodeTextCommand(
  context: UpdateNodeTextCommandContext,
  options: UpdateNodeTextCommandOptions
): Command {
  const { nodeId, beforeText, afterText, previousSelection, nextSelection } = options;
  return {
    name: 'UpdateNodeTextCommand',
    do: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodePlainText(nodes[nodeId], afterText);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:update-node-text', { ensureVisibleNodeId: nodeId });
    },
    undo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodePlainText(nodes[nodeId], beforeText);
      context.setSelection(previousSelection.ids, previousSelection.primaryId);
      void context.applyMutation('history:undo-update-node-text', { ensureVisibleNodeId: nodeId });
    },
    redo: () => {
      const nodes = context.getNodes();
      if (!nodes?.[nodeId]) return;
      setNodePlainText(nodes[nodeId], afterText);
      context.setSelection(nextSelection.ids, nextSelection.primaryId);
      void context.applyMutation('history:redo-update-node-text', { ensureVisibleNodeId: nodeId });
    },
  };
}
