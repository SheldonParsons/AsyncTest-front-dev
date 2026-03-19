import { getNodeLexicalState, setNodeLexicalState } from '../nodeContent';
import { cloneLexicalState, type SerializedLexicalEditorState } from '../lexicalState';
import { cloneRichText, type RichTextDocument } from '../richText';
import type { MindNodes } from './subtreeSnapshot';

type SelectionSnapshot = {
  ids: string[];
  primaryId: string | null;
};

type CommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }
  ) => Promise<void> | void;
};

type UpdateNodeLexicalStateCommandOptions = {
  nodeId: string;
  beforeLexicalStateJSON: SerializedLexicalEditorState;
  afterLexicalStateJSON: SerializedLexicalEditorState;
  beforeRichText?: RichTextDocument;
  afterRichText?: RichTextDocument;
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
};

export function createUpdateNodeLexicalStateCommand(
  context: CommandContext,
  options: UpdateNodeLexicalStateCommandOptions
) {
  const beforeLexicalStateJSON = cloneLexicalState(options.beforeLexicalStateJSON);
  const afterLexicalStateJSON = cloneLexicalState(options.afterLexicalStateJSON);
  const beforeRichText = options.beforeRichText ? cloneRichText(options.beforeRichText) : undefined;
  const afterRichText = options.afterRichText ? cloneRichText(options.afterRichText) : undefined;

  return {
    name: 'UpdateNodeLexicalStateCommand',
    async do() {
      const nodes = context.getNodes();
      if (!nodes?.[options.nodeId]) return;
      setNodeLexicalState(nodes[options.nodeId], afterLexicalStateJSON, afterRichText);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      await context.applyMutation('history:update-node-lexical-state', {
        ensureVisibleNodeId: options.nodeId,
      });
    },
    async undo() {
      const nodes = context.getNodes();
      if (!nodes?.[options.nodeId]) return;
      setNodeLexicalState(nodes[options.nodeId], beforeLexicalStateJSON, beforeRichText);
      context.setSelection(options.previousSelection.ids, options.previousSelection.primaryId);
      await context.applyMutation('history:undo-update-node-lexical-state', {
        ensureVisibleNodeId: options.nodeId,
      });
    },
    async redo() {
      const nodes = context.getNodes();
      if (!nodes?.[options.nodeId]) return;
      setNodeLexicalState(nodes[options.nodeId], afterLexicalStateJSON, afterRichText);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      await context.applyMutation('history:redo-update-node-lexical-state', {
        ensureVisibleNodeId: options.nodeId,
      });
    },
  };
}

export function isLexicalStateEqual(a: SerializedLexicalEditorState, b: SerializedLexicalEditorState) {
  return JSON.stringify(getComparableState(a)) === JSON.stringify(getComparableState(b));
}

function getComparableState(state: SerializedLexicalEditorState) {
  return getNodeLexicalState({ textLexical: state });
}
