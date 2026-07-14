import type { Command } from '@/mind/core/history';
import {
  applyMindDocumentPatch,
  buildMindDocumentPatch,
  getMindDocumentPatchMutationOptions,
  includeMindDocumentPatchAncestorInvalidations,
} from '@/mind/mcp/documentPatch';

export type MindTransactionChangeSummary = {
  created: number;
  updated: number;
  deleted: number;
  moved: number;
  affectedNodeIds: string[];
  affectedNodeCount: number;
  truncated: boolean;
};

export type MindTransactionCommit = {
  transactionId: string;
  expectedRevision?: string | null;
  afterDoc: any;
  changed: MindTransactionChangeSummary;
};

type MindTransactionCommandContext = {
  getCurrentDoc: () => any;
  getMutableDoc: () => any;
  getActiveBoardId: () => string | null;
  bumpRevision: () => void;
  applyMutation: (reason: string, options?: Record<string, unknown>) => Promise<void>;
};

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getFocusNodeIds(changed: MindTransactionChangeSummary): string[] {
  return changed.affectedNodeIds.slice(0, 12);
}

export function createMindTransactionCommand(
  commit: MindTransactionCommit,
  context: MindTransactionCommandContext
): Command {
  const beforeDoc = clonePlain(context.getCurrentDoc());
  const afterDoc = clonePlain(commit.afterDoc);
  const patch = buildMindDocumentPatch(beforeDoc, afterDoc);

  const apply = (direction: 'before' | 'after', reason: string) => {
    applyMindDocumentPatch(context.getMutableDoc(), patch, direction);
    context.bumpRevision();
    const activeBoardId = context.getActiveBoardId();
    const mutationOptions = includeMindDocumentPatchAncestorInvalidations(
      context.getMutableDoc(),
      getMindDocumentPatchMutationOptions(patch, direction, activeBoardId),
      activeBoardId
    );
    void context.applyMutation(reason, {
      ...mutationOptions,
      forceFullEdgeRebuild: true,
      useLayoutChangedNodeIds: true,
      ensureVisibleNodeIds: mutationOptions.ensureVisibleNodeIds.length
        ? mutationOptions.ensureVisibleNodeIds
        : getFocusNodeIds(commit.changed),
    });
  };

  return {
    name: `McpTransactionCommand:${commit.transactionId}`,
    do: () => apply('after', 'mcp:transaction-commit'),
    undo: () => apply('before', 'mcp:undo-transaction'),
    redo: () => apply('after', 'mcp:redo-transaction'),
  };
}
