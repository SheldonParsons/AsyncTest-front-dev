import type { InternalClipboardState } from '../clipboard';
import type { Command } from '../history';

export type BatchCutSubtreesCommandContext = {
  setClipboard: (payload: InternalClipboardState) => void;
};

export type BatchCutSubtreesCommandOptions = {
  clipboardState: InternalClipboardState;
  deleteCommand: Command;
};

export function createBatchCutSubtreesCommand(
  context: BatchCutSubtreesCommandContext,
  options: BatchCutSubtreesCommandOptions
): Command {
  const { clipboardState, deleteCommand } = options;
  return {
    name: 'BatchCutSubtreesCommand',
    do: () => {
      context.setClipboard(clipboardState);
      deleteCommand.do();
    },
    undo: () => {
      deleteCommand.undo();
    },
    redo: () => {
      context.setClipboard(clipboardState);
      (deleteCommand.redo ?? deleteCommand.do)();
    },
  };
}
