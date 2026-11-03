// Renderer 与 MCP 共用：概要关联变化必须和节点、关系线一起维护。
// 只处理本次失效的概要，不清理文档里原本就存在的未关联内容。
const copy = value => JSON.parse(JSON.stringify(value));

export function structuralChildIds(node) {
  return [...new Set([
    ...(Array.isArray(node?.children) ? node.children : []),
    ...(Array.isArray(node?.summaries) ? node.summaries.map(item => item?.summaryNodeId) : []),
  ].filter(id => typeof id === 'string' && id))];
}

/**
 * @template {{ startIndex: number, endIndex: number }} T
 * @param {T[]} summaries
 * @param {string[]} beforeChildren
 * @param {string[]} afterChildren
 * @returns {T[]}
 */
export function remapSummariesByChildren(summaries, beforeChildren, afterChildren) {
  return summaries.map(summary => {
    const indexes = beforeChildren.slice(summary.startIndex, summary.endIndex + 1)
      .map(id => afterChildren.indexOf(id)).filter(index => index >= 0).sort((a, b) => a - b);
    return indexes.length ? { ...summary, startIndex: indexes[0], endIndex: indexes.at(-1) } : null;
  }).filter(Boolean);
}

export function createSummaryTransition(board, beforeByParent, afterByParent) {
  const before = new Map([...beforeByParent].map(([id, summaries]) => [id, copy(summaries)]));
  const after = new Map([...afterByParent].map(([id, summaries]) => [id, copy(summaries)]));
  const retainedRoots = new Set([...after.values()].flatMap(items => items.map(item => item.summaryNodeId)));
  const candidates = new Map();
  const pending = [...before.values()].flatMap(items => items.map(item => item.summaryNodeId)).filter(id => !retainedRoots.has(id));
  while (pending.length) {
    const id = pending.pop(), node = board?.nodes?.[id];
    if (!node || candidates.has(id)) continue;
    candidates.set(id, copy(node));
    pending.push(...structuralChildIds(node));
  }
  let removedIds = [], removedRelations = [];
  const setSummaries = (current, snapshots) => {
    for (const [id, summaries] of snapshots) {
      if (!current.nodes[id]) continue;
      if (summaries.length) current.nodes[id].summaries = copy(summaries);
      else delete current.nodes[id].summaries;
    }
  };
  return {
    hasRemovedSummaries: candidates.size > 0,
    get removedNodeIds() { return [...removedIds]; },
    apply(current) {
      if (!current?.nodes) return;
      setSummaries(current, after);
      removedIds = []; removedRelations = [];
      if (!candidates.size) return;
      // 同次移动中已挂到其他父节点或自由主题的内容必须保留。
      const protectedIds = new Set();
      const attached = (current.roots || []).map(root => root.rootId);
      for (const [id, node] of Object.entries(current.nodes)) {
        if (!candidates.has(id)) attached.push(...structuralChildIds(node));
      }
      while (attached.length) {
        const id = attached.pop();
        if (!candidates.has(id) || protectedIds.has(id)) continue;
        protectedIds.add(id);
        attached.push(...structuralChildIds(current.nodes[id]));
      }
      removedIds = [...candidates.keys()].filter(id => current.nodes[id] && !protectedIds.has(id));
      const removed = new Set(removedIds);
      if (Array.isArray(current.relations)) {
        current.relations.forEach((relation, index) => {
          if (removed.has(relation.fromNodeId) || removed.has(relation.toNodeId)) removedRelations.push({ index, relation: copy(relation) });
        });
        if (removedRelations.length) current.relations = current.relations.filter(relation => !removed.has(relation.fromNodeId) && !removed.has(relation.toNodeId));
      }
      for (const id of removedIds) delete current.nodes[id];
    },
    undo(current) {
      if (!current?.nodes) return;
      // 使用操作开始前的快照：被删除的概要也可能是同次移动的原父节点。
      for (const id of removedIds) current.nodes[id] = copy(candidates.get(id));
      setSummaries(current, before);
      if (removedRelations.length) {
        current.relations ||= [];
        for (const { index, relation } of removedRelations) {
          if (!current.relations.some(item => item.id === relation.id)) current.relations.splice(Math.min(index, current.relations.length), 0, copy(relation));
        }
      }
      removedIds = []; removedRelations = [];
    },
  };
}

export function createMoveSummaryTransition(board, beforeChildren, afterChildren, movingIds, targetParentId) {
  const parentIds = Object.keys(beforeChildren);
  const before = new Map(parentIds.map(id => [id, copy(board.nodes[id]?.summaries || [])]));
  const after = new Map(parentIds.map(id => [id, remapSummariesByChildren(before.get(id), beforeChildren[id], afterChildren[id])]));
  const moved = new Set(movingIds);
  for (const [parentId, summaries] of before) {
    if (parentId === targetParentId) continue;
    for (const summary of summaries) {
      const covered = beforeChildren[parentId].slice(summary.startIndex, summary.endIndex + 1);
      if (!covered.length || !covered.every(id => moved.has(id))) continue;
      const indexes = covered.map(id => afterChildren[targetParentId].indexOf(id)).filter(index => index >= 0).sort((a, b) => a - b);
      if (indexes.length !== covered.length) continue;
      after.get(targetParentId).push({ ...summary, startIndex: indexes[0], endIndex: indexes.at(-1) });
    }
  }
  return createSummaryTransition(board, before, after);
}
