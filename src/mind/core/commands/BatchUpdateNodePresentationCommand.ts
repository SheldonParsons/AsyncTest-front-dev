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
  secrecy?: any;
  lexicalState?: SerializedLexicalEditorState;
  richText?: RichTextDocument;
};

type BatchUpdateNodePresentationCommandContext = {
  getNodes: () => MindNodes | null;
  setSelection: (nodeIds: Iterable<string>, primaryId?: string | null) => void;
  applyMutation: (
    reason: string,
    options?: {
      ensureVisibleNodeIds?: string[];
      rootAnchorSnapshots?: Array<{ rootId: string; bodyRect: { x1: number; y1: number; x2: number; y2: number } }>;
    }
  ) => Promise<void> | void;
  snapshotRootBodyAnchors?: (nodeIds: Iterable<string>) => Array<{ rootId: string; bodyRect: { x1: number; y1: number; x2: number; y2: number } }>;
};

type BatchUpdateNodePresentationCommandOptions = {
  name: string;
  mutationReason: string;
  beforeSnapshots: NodePresentationSnapshot[];
  afterSnapshots: NodePresentationSnapshot[];
  previousSelection: SelectionSnapshot;
  nextSelection: SelectionSnapshot;
  ensureVisibleNodeIds?: string[];
  preserveRootAnchors?: boolean;
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
  if (Object.prototype.hasOwnProperty.call(snapshot, 'secrecy')) {
    next.secrecy = clonePlain(snapshot.secrecy);
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

  if (Object.prototype.hasOwnProperty.call(snapshot, 'secrecy')) {
    if (snapshot.secrecy === undefined) delete node.secrecy;
    else node.secrecy = clonePlain(snapshot.secrecy);
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
  const hasExplicitEnsureVisibleNodeIds = Object.prototype.hasOwnProperty.call(options, 'ensureVisibleNodeIds');
  const ensureVisibleNodeIds = hasExplicitEnsureVisibleNodeIds
    ? [...(options.ensureVisibleNodeIds ?? [])]
    : afterSnapshots.map((snapshot) => snapshot.nodeId);
  const undoEnsureVisibleNodeIds = hasExplicitEnsureVisibleNodeIds && ensureVisibleNodeIds.length === 0
    ? []
    : options.previousSelection.ids;

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
      const rootAnchorSnapshots = options.preserveRootAnchors
        ? context.snapshotRootBodyAnchors?.(ensureVisibleNodeIds.length ? ensureVisibleNodeIds : afterSnapshots.map((snapshot) => snapshot.nodeId))
        : undefined;
      applySnapshots(afterSnapshots);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      void context.applyMutation(`history:${options.mutationReason}`, { ensureVisibleNodeIds, rootAnchorSnapshots });
    },
    undo: () => {
      const rootAnchorSnapshots = options.preserveRootAnchors
        ? context.snapshotRootBodyAnchors?.(undoEnsureVisibleNodeIds.length ? undoEnsureVisibleNodeIds : beforeSnapshots.map((snapshot) => snapshot.nodeId))
        : undefined;
      applySnapshots(beforeSnapshots);
      context.setSelection(options.previousSelection.ids, options.previousSelection.primaryId);
      void context.applyMutation(`history:undo-${options.mutationReason}`, {
        ensureVisibleNodeIds: undoEnsureVisibleNodeIds,
        rootAnchorSnapshots,
      });
    },
    redo: () => {
      const rootAnchorSnapshots = options.preserveRootAnchors
        ? context.snapshotRootBodyAnchors?.(ensureVisibleNodeIds.length ? ensureVisibleNodeIds : afterSnapshots.map((snapshot) => snapshot.nodeId))
        : undefined;
      applySnapshots(afterSnapshots);
      context.setSelection(options.nextSelection.ids, options.nextSelection.primaryId);
      void context.applyMutation(`history:redo-${options.mutationReason}`, { ensureVisibleNodeIds, rootAnchorSnapshots });
    },
  };
}
