export type MindSummaryMeta = {
  id: string;
  summaryNodeId: string;
  startIndex: number;
  endIndex: number;
};

type MindSummaryHostLike = {
  summaries?: unknown;
};

type MindChildLike = {
  children?: unknown;
};

type MindNodeLike = MindSummaryHostLike & MindChildLike & {
  nodeKind?: unknown;
};

function normalizeSummaryIndex(value: unknown) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) return null;
  return numeric;
}

export function normalizeSummaryMeta(value: unknown): MindSummaryMeta | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : null;
  const summaryNodeId =
    typeof candidate.summaryNodeId === 'string' && candidate.summaryNodeId.trim()
      ? candidate.summaryNodeId.trim()
      : null;
  const startIndex = normalizeSummaryIndex(candidate.startIndex);
  const endIndex = normalizeSummaryIndex(candidate.endIndex);
  if (!id || !summaryNodeId || startIndex == null || endIndex == null) return null;
  return {
    id,
    summaryNodeId,
    startIndex: Math.min(startIndex, endIndex),
    endIndex: Math.max(startIndex, endIndex),
  };
}

export function getNodeSummaries(node: MindSummaryHostLike | null | undefined): MindSummaryMeta[] {
  const raw = Array.isArray(node?.summaries) ? node.summaries : [];
  return raw.map((item) => normalizeSummaryMeta(item)).filter((item): item is MindSummaryMeta => !!item);
}

export function setNodeSummaries(node: MindSummaryHostLike | null | undefined, summaries: MindSummaryMeta[]) {
  if (!node) return;
  if (!summaries.length) {
    delete (node as { summaries?: MindSummaryMeta[] }).summaries;
    return;
  }
  (node as { summaries?: MindSummaryMeta[] }).summaries = summaries.map((summary) => ({ ...summary }));
}

export function hasSummaryRange(
  node: MindSummaryHostLike | null | undefined,
  startIndex: number,
  endIndex: number,
  options?: { ignoreSummaryId?: string | null }
) {
  const normalizedStart = Math.min(startIndex, endIndex);
  const normalizedEnd = Math.max(startIndex, endIndex);
  return getNodeSummaries(node).some(
    (summary) =>
      summary.id !== options?.ignoreSummaryId &&
      summary.startIndex === normalizedStart &&
      summary.endIndex === normalizedEnd
  );
}

export function getNodeSummaryNodeIds(node: MindSummaryHostLike | null | undefined) {
  return getNodeSummaries(node).map((summary) => summary.summaryNodeId);
}

export function getRegularChildIds(node: MindChildLike | null | undefined) {
  return Array.isArray(node?.children) ? node.children.filter((childId): childId is string => typeof childId === 'string') : [];
}

export function getStructuralChildIds(node: MindNodeLike | null | undefined) {
  const regularChildren = getRegularChildIds(node);
  const summaryNodeIds = getNodeSummaryNodeIds(node);
  if (!summaryNodeIds.length) return regularChildren;
  const merged = [...regularChildren];
  for (const summaryNodeId of summaryNodeIds) {
    if (!merged.includes(summaryNodeId)) merged.push(summaryNodeId);
  }
  return merged;
}

export function isSummaryNode(node: MindNodeLike | null | undefined) {
  return node?.nodeKind === 'summary';
}

export function doSummaryRangesOverlap(a: MindSummaryMeta, b: MindSummaryMeta) {
  return !(a.endIndex < b.startIndex || b.endIndex < a.startIndex);
}

export function getNodeSummaryLaneMap(node: MindSummaryHostLike | null | undefined) {
  const summaries = getNodeSummaries(node).slice().sort((a, b) => {
    if (a.startIndex !== b.startIndex) return b.startIndex - a.startIndex;
    const aLength = a.endIndex - a.startIndex;
    const bLength = b.endIndex - b.startIndex;
    if (aLength !== bLength) return aLength - bLength;
    if (a.endIndex !== b.endIndex) return a.endIndex - b.endIndex;
    return a.id.localeCompare(b.id);
  });
  const laneMap = new Map<string, number>();
  const summariesByLane: MindSummaryMeta[][] = [];
  summaries.forEach((summary) => {
    let lane = 0;
    while (lane < summariesByLane.length) {
      const laneItems = summariesByLane[lane];
      if (!laneItems.some((existing) => doSummaryRangesOverlap(existing, summary))) break;
      lane += 1;
    }
    if (!summariesByLane[lane]) summariesByLane[lane] = [];
    summariesByLane[lane].push(summary);
    laneMap.set(summary.id, lane);
  });
  return laneMap;
}
