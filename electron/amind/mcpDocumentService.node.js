export function removeMindRootDescendants(board, rootId) {
  const nodes = board?.nodes && typeof board.nodes === 'object' ? board.nodes : null;
  const rootNode = nodes?.[rootId];
  if (!nodes || !rootNode) return 0;

  const removedNodeIds = new Set();
  const collect = (nodeId) => {
    if (!nodeId || nodeId === rootId || removedNodeIds.has(nodeId) || !nodes[nodeId]) return;
    removedNodeIds.add(nodeId);
    const children = Array.isArray(nodes[nodeId].children) ? nodes[nodeId].children : [];
    children.forEach(collect);
  };
  (Array.isArray(rootNode.children) ? rootNode.children : []).forEach(collect);
  removedNodeIds.forEach((nodeId) => delete nodes[nodeId]);
  rootNode.children = [];
  return removedNodeIds.size;
}

