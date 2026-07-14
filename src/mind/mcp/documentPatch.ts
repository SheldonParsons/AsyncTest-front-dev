export type MindNodePatch = {
  nodeId: string;
  before: any | null;
  after: any | null;
};

export type MindBoardPatch = {
  boardId: string;
  beforeTitle: string | null;
  afterTitle: string | null;
  beforeRoots: any[];
  afterRoots: any[];
  nodes: MindNodePatch[];
};

export type MindDocumentPatch = {
  beforeManifest: any;
  afterManifest: any;
  boards: MindBoardPatch[];
};

export type MindDocumentPatchMutationOptions = {
  ensureVisibleNodeIds: string[];
  invalidateSubtreeHeightNodeIds: string[];
  addedNodeInfos: Array<{ nodeId: string; parentId: string | null }>;
  removedNodeIds: string[];
  touchedParentIds: string[];
  forceFullEdgeRebuild: boolean;
  markDirty: false;
};

function clonePlain<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function equalJson(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getBoards(doc: any): Record<string, any> {
  return doc?.mind?.minds && typeof doc.mind.minds === 'object' ? doc.mind.minds : {};
}

function getNodes(board: any): Record<string, any> {
  return board?.nodes && typeof board.nodes === 'object' ? board.nodes : {};
}

export function buildMindDocumentPatch(beforeDoc: any, afterDoc: any): MindDocumentPatch {
  const beforeBoards = getBoards(beforeDoc);
  const afterBoards = getBoards(afterDoc);
  const boardIds = new Set([...Object.keys(beforeBoards), ...Object.keys(afterBoards)]);
  const boards: MindBoardPatch[] = [];

  for (const boardId of boardIds) {
    const beforeBoard = beforeBoards[boardId] || {};
    const afterBoard = afterBoards[boardId] || {};
    const beforeNodes = getNodes(beforeBoard);
    const afterNodes = getNodes(afterBoard);
    const nodeIds = new Set([...Object.keys(beforeNodes), ...Object.keys(afterNodes)]);
    const nodes: MindNodePatch[] = [];
    for (const nodeId of nodeIds) {
      const before = beforeNodes[nodeId] ?? null;
      const after = afterNodes[nodeId] ?? null;
      if (!equalJson(before, after)) {
        nodes.push({ nodeId, before: clonePlain(before), after: clonePlain(after) });
      }
    }
    const beforeTitle = beforeBoard?.title ?? null;
    const afterTitle = afterBoard?.title ?? null;
    const beforeRoots = clonePlain(beforeBoard?.roots ?? []);
    const afterRoots = clonePlain(afterBoard?.roots ?? []);
    if (nodes.length || beforeTitle !== afterTitle || !equalJson(beforeRoots, afterRoots)) {
      boards.push({ boardId, beforeTitle, afterTitle, beforeRoots, afterRoots, nodes });
    }
  }

  return {
    beforeManifest: clonePlain(beforeDoc?.manifest ?? {}),
    afterManifest: clonePlain(afterDoc?.manifest ?? {}),
    boards,
  };
}

function ensureBoard(target: any, boardId: string) {
  target.mind ||= { version: 1, activeMindId: boardId, order: [], minds: {} };
  target.mind.minds ||= {};
  target.mind.order ||= [];
  if (!target.mind.order.includes(boardId)) target.mind.order.push(boardId);
  target.mind.minds[boardId] ||= { id: boardId, title: '思维导图', roots: [], nodes: {}, view: { viewport: {} } };
  target.mind.minds[boardId].nodes ||= {};
  return target.mind.minds[boardId];
}

export function applyMindDocumentPatch(target: any, patch: MindDocumentPatch, direction: 'before' | 'after') {
  target.manifest = clonePlain(direction === 'after' ? patch.afterManifest : patch.beforeManifest);
  for (const boardPatch of patch.boards) {
    const board = ensureBoard(target, boardPatch.boardId);
    board.title = direction === 'after' ? boardPatch.afterTitle : boardPatch.beforeTitle;
    board.roots = clonePlain(direction === 'after' ? boardPatch.afterRoots : boardPatch.beforeRoots);
    for (const nodePatch of boardPatch.nodes) {
      const value = direction === 'after' ? nodePatch.after : nodePatch.before;
      if (value == null) delete board.nodes[nodePatch.nodeId];
      else board.nodes[nodePatch.nodeId] = clonePlain(value);
    }
  }
}

export function getMindDocumentPatchNodeIds(patch: MindDocumentPatch, activeBoardId?: string | null): string[] {
  const boardPatch = patch.boards.find((item) => item.boardId === activeBoardId) ?? patch.boards[0];
  return (boardPatch?.nodes ?? []).map((item) => item.nodeId);
}

function getSemanticPlainText(node: any) {
  if (typeof node?.text === 'string') return node.text;
  if (typeof node?.text?.plain === 'string') return node.text.plain;
  if (Array.isArray(node?.richText?.blocks)) {
    return node.richText.blocks
      .map((block: any) => Array.isArray(block?.inlines)
        ? block.inlines.map((inline: any) => String(inline?.text ?? '')).join('')
        : '')
      .join('\n');
  }
  return '';
}

function withoutStructuralChildren(node: any) {
  if (!node || typeof node !== 'object') return node;
  const copy = clonePlain(node);
  delete copy.children;
  copy.text = getSemanticPlainText(node);
  delete copy.textLexical;
  delete copy.richText;
  if (copy.image == null) delete copy.image;
  if (Array.isArray(copy.images) && copy.images.length === 0) delete copy.images;
  return copy;
}

function hasUserVisibleNodeChange(nodePatch: MindNodePatch) {
  if (!nodePatch.before || !nodePatch.after) return false;
  return !equalJson(
    withoutStructuralChildren(nodePatch.before),
    withoutStructuralChildren(nodePatch.after)
  );
}

export function getMindDocumentPatchFocusNodeId(
  patch: MindDocumentPatch,
  nodeIds: string[],
  activeBoardId?: string | null,
  previousNodeId: string | null = null
): string | null {
  const boardPatch = patch.boards.find((item) => item.boardId === activeBoardId) ?? patch.boards[0];
  if (!boardPatch) return previousNodeId;
  const selected = new Set(nodeIds);
  const candidates = boardPatch.nodes.filter((item) => selected.has(item.nodeId));

  const created = [...candidates].reverse().find((item) => !item.before && item.after);
  if (created) return created.nodeId;

  const visiblyChanged = [...candidates].reverse().find(hasUserVisibleNodeChange);
  if (visiblyChanged) return visiblyChanged.nodeId;

  const deleted = [...candidates].reverse().find((item) => item.before && !item.after);
  const deletedParentId = deleted?.before?.parentId;
  if (typeof deletedParentId === 'string' && deletedParentId) return deletedParentId;

  // A parent whose children array changed is needed for layout reconciliation, but
  // it should not replace the user's last meaningful AI edit in the visual trail.
  return previousNodeId;
}

export function applyMindDocumentPatchNodeSubset(
  target: any,
  patch: MindDocumentPatch,
  nodeIds: string[],
  activeBoardId?: string | null
) {
  const selected = new Set(nodeIds);
  const boardPatch = patch.boards.find((item) => item.boardId === activeBoardId) ?? patch.boards[0];
  if (!boardPatch) return;
  const board = ensureBoard(target, boardPatch.boardId);

  for (const nodePatch of boardPatch.nodes) {
    if (!selected.has(nodePatch.nodeId)) continue;
    if (nodePatch.after == null) delete board.nodes[nodePatch.nodeId];
    else board.nodes[nodePatch.nodeId] = clonePlain(nodePatch.after);
  }

  // Parent child arrays are reconciled after each group so layout never sees dangling ids.
  for (const nodePatch of boardPatch.nodes) {
    const after = nodePatch.after;
    const current = board.nodes[nodePatch.nodeId];
    if (!after || !current || !Array.isArray(after.children)) continue;
    if (!selected.has(nodePatch.nodeId) && !after.children.some((childId: string) => selected.has(childId))) continue;
    current.children = after.children.filter((childId: string) => !!board.nodes[childId]);
  }
}

export function getMindDocumentPatchSubsetMutationOptions(
  patch: MindDocumentPatch,
  nodeIds: string[],
  activeBoardId?: string | null
): MindDocumentPatchMutationOptions {
  const selected = new Set(nodeIds);
  const boardPatch = patch.boards.find((item) => item.boardId === activeBoardId) ?? patch.boards[0];
  const subset: MindDocumentPatch = {
    beforeManifest: patch.beforeManifest,
    afterManifest: patch.afterManifest,
    boards: boardPatch ? [{ ...boardPatch, nodes: boardPatch.nodes.filter((item) => selected.has(item.nodeId)) }] : [],
  };
  return getMindDocumentPatchMutationOptions(subset, 'after', activeBoardId);
}

function getParentId(node: any): string | null {
  return typeof node?.parentId === 'string' && node.parentId ? node.parentId : null;
}

export function getMindDocumentPatchMutationOptions(
  patch: MindDocumentPatch,
  direction: 'before' | 'after',
  activeBoardId?: string | null
): MindDocumentPatchMutationOptions {
  const boardPatch = patch.boards.find((item) => item.boardId === activeBoardId) ?? patch.boards[0];
  const addedNodeInfos: Array<{ nodeId: string; parentId: string | null }> = [];
  const removedNodeIds: string[] = [];
  const touchedParentIds = new Set<string>();
  const changedNodeIds: string[] = [];
  let hasMove = false;

  for (const nodePatch of boardPatch?.nodes ?? []) {
    const from = direction === 'after' ? nodePatch.before : nodePatch.after;
    const to = direction === 'after' ? nodePatch.after : nodePatch.before;
    const fromParentId = getParentId(from);
    const toParentId = getParentId(to);
    if (fromParentId) touchedParentIds.add(fromParentId);
    if (toParentId) touchedParentIds.add(toParentId);
    if (!from && to) addedNodeInfos.push({ nodeId: nodePatch.nodeId, parentId: toParentId });
    if (from && !to) removedNodeIds.push(nodePatch.nodeId);
    if (fromParentId !== toParentId && from && to) hasMove = true;
    if (to) changedNodeIds.push(nodePatch.nodeId);
  }

  return {
    ensureVisibleNodeIds: changedNodeIds.slice(0, 12),
    invalidateSubtreeHeightNodeIds: [...new Set([...changedNodeIds, ...touchedParentIds])],
    addedNodeInfos,
    removedNodeIds,
    touchedParentIds: [...touchedParentIds],
    forceFullEdgeRebuild: hasMove,
    markDirty: false,
  };
}

function getActivePatchBoard(target: any, activeBoardId?: string | null) {
  const boards = getBoards(target);
  const boardId = activeBoardId && boards[activeBoardId]
    ? activeBoardId
    : target?.mind?.activeMindId && boards[target.mind.activeMindId]
      ? target.mind.activeMindId
      : Object.keys(boards)[0];
  return boardId ? boards[boardId] : null;
}

/**
 * Layout subtree heights are cached at every ancestor. Structural MCP edits must
 * invalidate the complete parent chain, matching the normal canvas add/delete flow.
 */
export function includeMindDocumentPatchAncestorInvalidations(
  target: any,
  options: MindDocumentPatchMutationOptions,
  activeBoardId?: string | null
): MindDocumentPatchMutationOptions {
  const board = getActivePatchBoard(target, activeBoardId);
  const nodes = getNodes(board);
  const parentByNodeId = new Map<string, string>();

  for (const [parentId, node] of Object.entries(nodes)) {
    for (const childId of Array.isArray((node as any)?.children) ? (node as any).children : []) {
      if (typeof childId === 'string' && childId) parentByNodeId.set(childId, parentId);
    }
  }
  for (const [nodeId, node] of Object.entries(nodes)) {
    const parentId = getParentId(node);
    if (parentId) parentByNodeId.set(nodeId, parentId);
  }

  const invalidations = new Set(options.invalidateSubtreeHeightNodeIds);
  const seeds = [
    ...options.invalidateSubtreeHeightNodeIds,
    ...options.touchedParentIds,
    ...options.addedNodeInfos.map((item) => item.parentId).filter((item): item is string => !!item),
  ];
  for (const seed of seeds) {
    let currentId: string | undefined = seed;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      invalidations.add(currentId);
      currentId = parentByNodeId.get(currentId);
    }
  }

  return {
    ...options,
    invalidateSubtreeHeightNodeIds: [...invalidations],
  };
}
