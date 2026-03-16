export type Command = {
  name: string;
  do: () => void;
  undo: () => void;
  redo?: () => void;
};

export type HistorySnapshot = {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
  lastCommandName: string | null;
};

export function createHistory(onChange?: (snapshot: HistorySnapshot) => void) {
  const undoStack: Command[] = [];
  const redoStack: Command[] = [];

  function snapshot(): HistorySnapshot {
    return {
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoDepth: undoStack.length,
      redoDepth: redoStack.length,
      lastCommandName: undoStack.length > 0 ? undoStack[undoStack.length - 1].name : null,
    };
  }

  function emit() {
    onChange?.(snapshot());
  }

  function execute(command: Command) {
    command.do();
    undoStack.push(command);
    redoStack.length = 0;
    emit();
  }

  function undo() {
    const command = undoStack.pop();
    if (!command) return;
    command.undo();
    redoStack.push(command);
    emit();
  }

  function redo() {
    const command = redoStack.pop();
    if (!command) return;
    (command.redo ?? command.do)();
    undoStack.push(command);
    emit();
  }

  return {
    execute,
    undo,
    redo,
    snapshot,
  };
}
