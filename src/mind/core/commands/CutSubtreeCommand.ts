import type { InternalClipboardState } from '../clipboard';
import type { Command } from '../history';

export type CutSubtreeCommandContext = {
  setClipboard: (payload: InternalClipboardState) => void;
  debugEnabled?: boolean;
};

export type CutSubtreeCommandOptions = {
  targetNodeId: string;
  subtreeSize: number;
  clipboardPayload: InternalClipboardState;
  deleteCommand: Command;
};

export function createCutSubtreeCommand(
  context: CutSubtreeCommandContext,
  options: CutSubtreeCommandOptions
): Command {
  const { targetNodeId, subtreeSize, clipboardPayload, deleteCommand } = options;

  return {
    name: 'CutSubtreeCommand',
    do: () => {
      context.setClipboard(clipboardPayload);
      if (context.debugEnabled) {
        console.debug('[mind-cut-subtree]', {
          nodeId: targetNodeId,
          subtreeSize,
        });
      }
      deleteCommand.do();
    },
    undo: () => {
      deleteCommand.undo();
    },
    redo: () => {
      context.setClipboard(clipboardPayload);
      (deleteCommand.redo ?? deleteCommand.do)();
    },
  };
}
