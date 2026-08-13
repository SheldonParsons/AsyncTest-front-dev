import {
  applyMindDocumentPatch,
  applyMindDocumentPatchNodeSubset,
  getMindDocumentPatchFocusNodeId,
  includeMindDocumentPatchAncestorInvalidations,
  getMindDocumentPatchMutationOptions,
  getMindDocumentPatchPlaybackNodeIds,
  getMindDocumentPatchSubsetMutationOptions,
  type MindDocumentPatch,
} from '@/mind/mcp/documentPatch';

const MCP_CONTROL_REVOKED_MESSAGE =
  '用户已主动退出 AsyncTest Mind MCP 控制。请立即停止调用 AsyncTest Mind 工具，不要在当前对话中自行恢复。只有用户明确要求恢复后，才可以调用 mind_request_control_restore；该函数仍需用户在 AsyncTest 中确认。';

export type MindTransactionPlaybackPolicy = {
  mode: 'single' | 'step' | 'progressive';
  leadSingleCount: number;
  groupSize: number;
  delayMs: number;
};

type MindTransactionPlaybackContext = {
  target: any;
  patch: MindDocumentPatch;
  activeBoardId: string | null;
  applyMutation: (reason: string, options?: Record<string, unknown>) => Promise<void>;
  selectNode: (nodeId: string) => void;
  isCancelled: () => Promise<boolean | { code?: string; message?: string }>;
  onProgress: (progress: { completedCount: number; totalCount: number; currentNodeId: string | null }) => Promise<void>;
};

export function getMindTransactionPlaybackPolicy(changedNodeCount: number): MindTransactionPlaybackPolicy {
  if (changedNodeCount <= 1) return { mode: 'single', leadSingleCount: 1, groupSize: 1, delayMs: 0 };
  if (changedNodeCount <= 12) {
    return { mode: 'step', leadSingleCount: changedNodeCount, groupSize: 1, delayMs: 80 };
  }
  if (changedNodeCount <= 60) return { mode: 'progressive', leadSingleCount: 6, groupSize: 6, delayMs: 16 };
  if (changedNodeCount <= 120) return { mode: 'progressive', leadSingleCount: 6, groupSize: 16, delayMs: 0 };
  if (changedNodeCount <= 1000) return { mode: 'progressive', leadSingleCount: 8, groupSize: 40, delayMs: 0 };
  return { mode: 'progressive', leadSingleCount: 6, groupSize: 96, delayMs: 0 };
}

function wait(delayMs: number) {
  if (delayMs <= 0) return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

function throwStopped(cancellation: boolean | { code?: string; message?: string }) {
  const controlRevoked = typeof cancellation === 'object' && cancellation?.code === 'MCP_CONTROL_REVOKED';
  const error: any = new Error(
    controlRevoked
      ? MCP_CONTROL_REVOKED_MESSAGE
      : 'User stopped AsyncTest Mind MCP operations for this window.'
  );
  error.code = controlRevoked ? 'MCP_CONTROL_REVOKED' : 'USER_STOPPED';
  error.retryAllowed = false;
  error.recoverable = true;
  if (controlRevoked) {
    error.retryAllowed = false;
    error.suggestedAction = 'Stop all AsyncTest Mind tool calls. Wait until the user explicitly asks to restore control.';
  }
  throw error;
}

export async function playMindTransactionPatch(context: MindTransactionPlaybackContext) {
  const playbackStartedAt = performance.now();
  const nodeIds = getMindDocumentPatchPlaybackNodeIds(context.patch, context.activeBoardId);
  const policy = getMindTransactionPlaybackPolicy(nodeIds.length);
  const groups: string[][] = [];
  const leadSingleCount = Math.min(policy.leadSingleCount, nodeIds.length);
  for (let index = 0; index < leadSingleCount; index += 1) {
    groups.push([nodeIds[index]]);
  }
  for (let index = leadSingleCount; index < nodeIds.length; index += policy.groupSize) {
    groups.push(nodeIds.slice(index, index + policy.groupSize));
  }

  let completedCount = 0;
  let currentNodeId: string | null = null;
  let renderPassCount = 0;
  let firstRenderMs: number | null = null;
  try {
    if (!groups.length) {
      applyMindDocumentPatch(context.target, context.patch, 'after');
      const mutationOptions = includeMindDocumentPatchAncestorInvalidations(
        context.target,
        getMindDocumentPatchMutationOptions(context.patch, 'after', context.activeBoardId),
        context.activeBoardId
      );
      await context.applyMutation('mcp:transaction-finalize', {
        ...mutationOptions,
        useLayoutChangedNodeIds: true,
        flushImmediately: true,
        markDirty: false,
      });
      renderPassCount += 1;
      firstRenderMs = performance.now() - playbackStartedAt;
      return { ...policy, stopped: false, completedCount: 0, totalCount: 0, currentNodeId: null, renderPassCount, firstRenderMs };
    }

    for (const group of groups) {
      const cancellation = await context.isCancelled();
      if (cancellation) throwStopped(cancellation);
      applyMindDocumentPatchNodeSubset(context.target, context.patch, group, context.activeBoardId);
      currentNodeId = getMindDocumentPatchFocusNodeId(
        context.patch,
        group,
        context.activeBoardId,
        currentNodeId
      );
      if (currentNodeId) context.selectNode(currentNodeId);
      const mutationOptions = includeMindDocumentPatchAncestorInvalidations(
        context.target,
        getMindDocumentPatchSubsetMutationOptions(context.patch, group, context.activeBoardId),
        context.activeBoardId
      );
      await context.applyMutation('mcp:transaction-playback', {
        ...mutationOptions,
        ensureVisibleNodeIds: currentNodeId ? [currentNodeId] : [],
        smoothEnsureVisible: true,
        useLayoutChangedNodeIds: true,
        flushImmediately: true,
        markDirty: false,
      });
      renderPassCount += 1;
      firstRenderMs ??= performance.now() - playbackStartedAt;
      completedCount += group.length;
      await context.onProgress({ completedCount, totalCount: nodeIds.length, currentNodeId });
      if (completedCount < nodeIds.length) await wait(policy.delayMs);
    }

    applyMindDocumentPatch(context.target, context.patch, 'after');
    const finalMutationOptions = includeMindDocumentPatchAncestorInvalidations(
      context.target,
      getMindDocumentPatchMutationOptions(context.patch, 'after', context.activeBoardId),
      context.activeBoardId
    );
    await context.applyMutation('mcp:transaction-finalize', {
      invalidateSubtreeHeightNodeIds: finalMutationOptions.invalidateSubtreeHeightNodeIds,
      ensureVisibleNodeIds: currentNodeId ? [currentNodeId] : [],
      smoothEnsureVisible: true,
      forceFullEdgeRebuild: true,
      useLayoutChangedNodeIds: true,
      flushImmediately: true,
      markDirty: false,
    });
    renderPassCount += 1;
    return { ...policy, stopped: false, completedCount, totalCount: nodeIds.length, currentNodeId, renderPassCount, firstRenderMs };
  } catch (error) {
    if ((error as any)?.code === 'USER_STOPPED') {
      return {
        ...policy,
        stopped: true,
        completedCount,
        totalCount: nodeIds.length,
        currentNodeId,
        renderPassCount,
        firstRenderMs,
      };
    }
    applyMindDocumentPatch(context.target, context.patch, 'before');
    const rollbackOptions = includeMindDocumentPatchAncestorInvalidations(
      context.target,
      getMindDocumentPatchMutationOptions(context.patch, 'before', context.activeBoardId),
      context.activeBoardId
    );
    await context.applyMutation('mcp:transaction-rollback', {
      ...rollbackOptions,
      useLayoutChangedNodeIds: true,
      flushImmediately: true,
      markDirty: false,
    });
    throw error;
  }
}
