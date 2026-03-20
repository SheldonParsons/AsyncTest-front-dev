import type { Command } from '../history';
import { setNodeLexicalState } from '../nodeContent';
import { cloneLexicalState, type SerializedLexicalEditorState } from '../lexicalState';
import { cloneRichText, type RichTextDocument } from '../richText';
import type { MindNodes } from './subtreeSnapshot';
import type { SelectionSnapshot } from './BatchAddChildCommand';

export type NodePresentationSnapshot = {
  nodeId: string;
  style?: any;
  markers?: string[];
  lexicalState?: SerializedLexicalEditorState;
  richText?: RichTextDocument;
};

type BatchUpdateNodePresentationCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (reason: string, options?: { ensureVisibleNodeIds?: string[] }) => Promise<void> | void;
};

type BatchUpdateNodePresentationCommandOptions = {
  name: string;
  mutationReason: string;
  beforeSnapshots: NodePresentationSnapshot[];
  afterSnapshots: NodePresentationSnapshot[];
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
  ensureVisibleNodeIds?: string[];
};

function clonePlain<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cloneSnapshot(snapshot: NodePresentationSnapshot): NodePresentationSnapshot {
  const next: NodePresentationSnapshot = { nodeId: snapshot.nodeId };
  if (Object.prototype.hasOwnProperty.call(snapshot, 'style')) {
    next.style = clonePlain(snapshot.style);
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'markers')) {
    next.markers = Array.isArray(snapshot.markers) ? [...snapshot.markers] : snapshot.markers;
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'lexicalState') && snapshot.lexicalState) {
    next.lexicalState = cloneLexicalState(snapshot.lexicalState);
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'richText') && snapshot.richText) {
    next.richText = cloneRichText(snapshot.richText);
  }
  return next;
}

function applySnapshot(node: any, snapshot: NodePresentationSnapshot) {
  if (Object.prototype.hasOwnProperty.call(snapshot, 'style')) {
    if (snapshot.style === undefined) delete node.style;
    else node.style = clonePlain(snapshot.style);
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'markers')) {
    if (snapshot.markers === undefined) delete node.markers;
    else node.markers = [...snapshot.markers];
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'lexicalState') && snapshot.lexicalState) {
    setNodeLexicalState(node, snapshot.lexicalState, snapshot.richText);
  }
}

export function createBatchUpdateNodePresentationCommand(
  context: BatchUpdateNodePresentationCommandContext,
  options: BatchUpdateNodePresentationCommandOptions
): Command {
  const beforeSnapshots = options.beforeSnapshots.map(cloneSnapshot);
  const afterSnapshots = options.afterSnapshots.map(cloneSnapshot);
  const ensureVisibleNodeIds =
    options.ensureVisibleNodeIds && options.ensureVisibleNodeIds.length
      ? [...options.ensureVisibleNodeIds]
      : afterSnapshots.map((snapshot) => snapshot.nodeId);

  function applySnapshots(snapshots: NodePresentationSnapshot[]) {
    const nodes = context.getNodes();
    if (!nodes) return;
    snapshots.forEach((snapshot) => {
      const node = nodes[snapshot.nodeId];
      if (!node) return;
      applySnapshot(node, snapshot);
    });
  }

  return {
    name: options.name,
    do: () => {
      applySnapshots(afterSnapshots);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      void context.applyMutation(`history:${options.mutationReason}`, { ensureVisibleNodeIds });
    },
    undo: () => {
      applySnapshots(beforeSnapshots);
      context.setSelection(options.previousSelection.ids, options.previousSelection.primaryId);
      void context.applyMutation(`history:undo-${options.mutationReason}`, {
        ensureVisibleNodeIds: options.previousSelection.ids,
      });
    },
    redo: () => {
      applySnapshots(afterSnapshots);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      void context.applyMutation(`history:redo-${options.mutationReason}`, { ensureVisibleNodeIds });
    },
  };
}
