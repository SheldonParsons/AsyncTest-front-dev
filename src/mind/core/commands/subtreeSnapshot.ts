import { getStructuralChildIds, getNodeSummaries, setNodeSummaries } from '../summaryMeta';

export type MindNodes = Record<string, any>;

export type MindSubtreeSnapshot = {
  rootId: string;
  nodeIds: string[];
  nodes: Record<string, any>;
  nodeCount: number;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function collectSubtreeNodeIds(nodes: MindNodes, rootId: string) {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    const node = nodes[nodeId];
    if (!node) return;
    visited.add(nodeId);
    order.push(nodeId);
    const children = getStructuralChildIds(node);
    for (const childId of children) visit(childId);
  }

  visit(rootId);
  return order;
}

export function createSubtreeSnapshot(nodes: MindNodes, rootId: string): MindSubtreeSnapshot | null {
  if (!nodes[rootId]) return null;
  const nodeIds = collectSubtreeNodeIds(nodes, rootId);
  const snapshotNodes: Record<string, any> = {};
  for (const nodeId of nodeIds) {
    snapshotNodes[nodeId] = deepClone(nodes[nodeId]);
  }
  return {
    rootId,
    nodeIds,
    nodes: snapshotNodes,
    nodeCount: nodeIds.length,
  };
}

export function insertSubtreeSnapshot(nodes: MindNodes, snapshot: MindSubtreeSnapshot) {
  for (const nodeId of snapshot.nodeIds) {
    nodes[nodeId] = deepClone(snapshot.nodes[nodeId]);
  }
}

export function removeSubtreeSnapshot(nodes: MindNodes, snapshot: MindSubtreeSnapshot) {
  for (const nodeId of snapshot.nodeIds) {
    delete nodes[nodeId];
  }
}

export function remapSubtreeSnapshot(
  snapshot: MindSubtreeSnapshot,
  createNodeId: () => string,
  existingIdRemap?: Record<string, string>
) {
  const idRemap = existingIdRemap ?? {};

  for (const nodeId of snapshot.nodeIds) {
    if (!idRemap[nodeId]) idRemap[nodeId] = createNodeId();
  }

  const remappedNodes: Record<string, any> = {};
  const remappedIds = snapshot.nodeIds.map((nodeId) => idRemap[nodeId]);

  for (const oldNodeId of snapshot.nodeIds) {
    const cloned = deepClone(snapshot.nodes[oldNodeId]);
    const newNodeId = idRemap[oldNodeId];
    cloned.id = newNodeId;
    const children = Array.isArray(cloned.children) ? cloned.children : [];
    cloned.children = children.map((childId: string) => idRemap[childId] ?? childId);
    const summaries = getNodeSummaries(cloned).map((summary) => ({
      ...summary,
      summaryNodeId: idRemap[summary.summaryNodeId] ?? summary.summaryNodeId,
    }));
    setNodeSummaries(cloned, summaries);
    remappedNodes[newNodeId] = cloned;
  }

  return {
    snapshot: {
      rootId: idRemap[snapshot.rootId],
      nodeIds: remappedIds,
      nodes: remappedNodes,
      nodeCount: snapshot.nodeCount,
    } satisfies MindSubtreeSnapshot,
    idRemap,
  };
}
