import type { MindNodes } from '../commands/subtreeSnapshot';

export type SelectionTargetInfo = {
  nodeId: string;
  parentId: string | null;
  indexInParent: number;
  path: number[];
};

export type NormalizedSelectionResult = {
  finalTargets: SelectionTargetInfo[];
  filteredOutDescendantsCount: number;
};

type ParentIndexEntry = {
  parentId: string;
  indexInParent: number;
};

function buildParentIndex(nodes: MindNodes) {
  const parentIndex = new Map<string, ParentIndexEntry>();
  for (const [parentId, parentNode] of Object.entries(nodes)) {
    const children = Array.isArray(parentNode?.children) ? parentNode.children : [];
    children.forEach((childId, indexInParent) => {
      if (typeof childId === 'string') parentIndex.set(childId, { parentId, indexInParent });
    });
  }
  return parentIndex;
}

function findParentAndIndex(nodes: MindNodes, nodeId: string, parentIndex?: ReadonlyMap<string, ParentIndexEntry>) {
  const cached = parentIndex?.get(nodeId);
  if (cached) return cached;
  for (const [parentId, parentNode] of Object.entries(nodes)) {
    const children = Array.isArray(parentNode?.children) ? parentNode.children : [];
    const indexInParent = children.indexOf(nodeId);
    if (indexInParent >= 0) return { parentId, indexInParent };
  }
  return null;
}

function buildPath(nodes: MindNodes, nodeId: string, parentIndex?: ReadonlyMap<string, ParentIndexEntry>) {
  const path: number[] = [];
  let currentNodeId: string | null = nodeId;
  while (currentNodeId) {
    const parentInfo = findParentAndIndex(nodes, currentNodeId, parentIndex);
    if (!parentInfo) break;
    path.unshift(parentInfo.indexInParent);
    currentNodeId = parentInfo.parentId;
  }
  return path;
}

function comparePath(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const av = a[index];
    const bv = b[index];
    if (av == null) return -1;
    if (bv == null) return 1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function compareSelectionTargetInfo(a: SelectionTargetInfo, b: SelectionTargetInfo) {
  return comparePath(a.path, b.path);
}

export function getSelectionTargetInfo(
  nodes: MindNodes,
  nodeId: string,
  parentIndex?: ReadonlyMap<string, ParentIndexEntry>
): SelectionTargetInfo | null {
  if (!nodes[nodeId]) return null;
  const parentInfo = findParentAndIndex(nodes, nodeId, parentIndex);
  return {
    nodeId,
    parentId: parentInfo?.parentId ?? null,
    indexInParent: parentInfo?.indexInParent ?? -1,
    path: buildPath(nodes, nodeId, parentIndex),
  };
}

export function normalizeSelectionTargets(
  nodes: MindNodes,
  selectedNodeIds: Iterable<string>,
  options?: {
    rootNodeId?: string | null;
    allowRoot?: boolean;
    collapseToRootIfSelected?: boolean;
  }
): NormalizedSelectionResult {
  const parentIndex = buildParentIndex(nodes);
  const uniqueIds = Array.from(new Set(selectedNodeIds)).filter((nodeId) => !!nodes[nodeId]);
  const rootNodeId = options?.rootNodeId ?? null;
  const allowRoot = options?.allowRoot ?? true;
  const collapseToRootIfSelected = options?.collapseToRootIfSelected ?? false;

  let candidateIds = uniqueIds;
  if (!allowRoot && rootNodeId) candidateIds = candidateIds.filter((nodeId) => nodeId !== rootNodeId);
  if (collapseToRootIfSelected && rootNodeId && candidateIds.includes(rootNodeId)) {
    candidateIds = [rootNodeId];
  }

  const candidateSet = new Set(candidateIds);
  const filteredIds: string[] = [];
  let filteredOutDescendantsCount = 0;

  for (const nodeId of candidateIds) {
    let current = getSelectionTargetInfo(nodes, nodeId, parentIndex)?.parentId ?? null;
    let shouldFilterOut = false;
    while (current) {
      if (candidateSet.has(current)) {
        shouldFilterOut = true;
        break;
      }
      current = getSelectionTargetInfo(nodes, current, parentIndex)?.parentId ?? null;
    }
    if (shouldFilterOut) {
      filteredOutDescendantsCount += 1;
      continue;
    }
    filteredIds.push(nodeId);
  }

  const finalTargets = filteredIds
    .map((nodeId) => getSelectionTargetInfo(nodes, nodeId, parentIndex))
    .filter((value): value is SelectionTargetInfo => !!value)
    .sort(compareSelectionTargetInfo);

  return { finalTargets, filteredOutDescendantsCount };
}
