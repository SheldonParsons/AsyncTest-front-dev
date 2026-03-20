import { ref } from 'vue';
import { DEBUG_CANVAS_OVERLAY } from '../constants';
import { rectIntersects, type WorldRect } from '../geom/rect';
import type { WorldBoxes } from '../geom/worldBoxes';
import { UniformGridSpatialIndex } from '../grid/spatialIndex';
import { getNodeBodyWorldRect } from '../nodeMarkers';
import { DEFAULT_ROOT_H_GAP, getActiveMind, resolveRootHorizontalGap } from './useDocUtils';

export type ParentEdgeKey = `parent:${string}`;
export type EdgePoint = { x: number; y: number };
export type BranchPosition = 'single' | 'aligned' | 'up' | 'down';
export type BranchType = 'straight' | 'rounded';
export type BranchMeta = {
  pathStartPoint: EdgePoint;
  startPoint: EdgePoint;
  endPoint: EdgePoint;
  branchLen: number;
  branchType: BranchType;
  rounded: boolean;
  degenerated: boolean;
  direction: -1 | 0 | 1;
  position: BranchPosition;
  effectiveRadius: number;
};

export type ParentEdgeGeom = {
  key: ParentEdgeKey;
  parentId: string;
  rootId: string;
  trunkPath: Path2D | null;
  trunkPathData: string | null;
  childBranchPaths: Map<string, Path2D>;
  childBranchPathData: Map<string, string>;
  branchBBoxes: Map<string, WorldRect>;
  bbox: WorldRect;
  trunkX: number;
  trunkStub: number;
  roundRadius: number;
  childInset: number;
  parentAnchor: EdgePoint;
  trunkJoin: EdgePoint | null;
  trunkTop: EdgePoint | null;
  trunkBottom: EdgePoint | null;
  yMin: number | null;
  yMax: number | null;
  branchMeta: Map<string, BranchMeta>;
  totalChildren: number;
};

export type ParentEdgeCacheStats = {
  parentsWithEdges: number;
  totalChildrenEdges: number;
  edgeCacheSize: number;
  edgeCacheBuildMs: number;
  trunkPathCount: number;
  branchPathCount: number;
  roundedBranches: number;
  straightBranches: number;
  degeneratedBranches: number;
  minBranchLen: number;
  maxBranchLen: number;
  trunkStubMin: number;
  trunkStubMax: number;
  roundRadiusMin: number;
  roundRadiusMax: number;
  childInset: number;
  alignedStraightCount: number;
  upRoundedCount: number;
  downRoundedCount: number;
  alignedMultiCount: number;
  nonAlignedRoundedCount: number;
  nonAlignedDegeneratedCount: number;
  trunkShrinkAppliedCount: number;
  trunkOverhangDetectedCount: number;
};

const TRUNK_STUB_FACTOR = 0.35;
const TRUNK_STUB_MIN = 20;
const TRUNK_STUB_MAX = 60;
const ROUND_RADIUS_MIN = 6;
const ROUND_RADIUS_MAX = 18;
export const CHILD_INSET = 4;
const BBOX_MARGIN = 6;
export const MIN_BRANCH_STRAIGHT = 10;
export const MIN_EFFECTIVE_RADIUS = 5;
const MIN_TRUNK_CLEARANCE = 2;
const PREFERRED_VISIBLE_RADIUS = 8;
const STRAIGHT_ALIGNMENT_EPSILON = 0.01;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getTrunkStub(hGap: number) {
  return clamp(hGap * TRUNK_STUB_FACTOR, TRUNK_STUB_MIN, TRUNK_STUB_MAX);
}

export function getRoundRadius(trunkStub: number) {
  return clamp(trunkStub * 0.5, ROUND_RADIUS_MIN, ROUND_RADIUS_MAX);
}

function withMargin(rect: WorldRect, margin: number): WorldRect {
  return {
    x1: rect.x1 - margin,
    y1: rect.y1 - margin,
    x2: rect.x2 + margin,
    y2: rect.y2 + margin,
  };
}

function bboxFromPoints(points: EdgePoint[], margin = BBOX_MARGIN): WorldRect {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return withMargin({ x1: minX, y1: minY, x2: maxX, y2: maxY }, margin);
}

function fmt(value: number) {
  return Number(value.toFixed(2));
}

function createLinePathData(start: EdgePoint, end: EdgePoint) {
  return `M ${fmt(start.x)} ${fmt(start.y)} L ${fmt(end.x)} ${fmt(end.y)}`;
}

function createSingleChildPath(parentAnchor: EdgePoint, endX: number) {
  const path = new Path2D();
  path.moveTo(parentAnchor.x, parentAnchor.y);
  path.lineTo(endX, parentAnchor.y);
  const endPoint = { x: endX, y: parentAnchor.y };
  return {
    path,
    pathData: createLinePathData(parentAnchor, endPoint),
  };
}

function createTrunkPath(parentAnchor: EdgePoint, trunkX: number, yTop: number, yBottom: number) {
  const path = new Path2D();
  path.moveTo(parentAnchor.x, parentAnchor.y);
  path.lineTo(trunkX, parentAnchor.y);
  const parts = [createLinePathData(parentAnchor, { x: trunkX, y: parentAnchor.y })];
  if (yBottom > yTop) {
    path.moveTo(trunkX, yTop);
    path.lineTo(trunkX, yBottom);
    parts.push(`M ${fmt(trunkX)} ${fmt(yTop)} L ${fmt(trunkX)} ${fmt(yBottom)}`);
  }
  return {
    path,
    pathData: parts.join(' '),
  };
}

function createBranchPath(
  startPoint: EdgePoint,
  endPoint: EdgePoint,
  radiusBase: number,
  roundedRequested: boolean,
  direction: -1 | 0 | 1
): {
  path: Path2D;
  rounded: boolean;
  degenerated: boolean;
  effectiveRadius: number;
  branchLen: number;
  pathStartPoint: EdgePoint;
  pathData: string;
} {
  const path = new Path2D();
  const branchLen = endPoint.x - startPoint.x;

  if (!roundedRequested || direction === 0) {
    path.moveTo(startPoint.x, startPoint.y);
    path.lineTo(endPoint.x, endPoint.y);
    return {
      path,
      rounded: false,
      degenerated: false,
      effectiveRadius: 0,
      branchLen,
      pathStartPoint: startPoint,
      pathData: createLinePathData(startPoint, endPoint),
    };
  }

  const radiusLimit = (branchLen - MIN_BRANCH_STRAIGHT) / 2;
  const effectiveRadius = Math.min(radiusBase, radiusLimit);
  if (!Number.isFinite(effectiveRadius) || effectiveRadius < MIN_EFFECTIVE_RADIUS) {
    path.moveTo(startPoint.x, startPoint.y);
    path.lineTo(endPoint.x, endPoint.y);
    return {
      path,
      rounded: false,
      degenerated: true,
      effectiveRadius: Math.max(0, Number.isFinite(effectiveRadius) ? effectiveRadius : 0),
      branchLen,
      pathStartPoint: startPoint,
      pathData: createLinePathData(startPoint, endPoint),
    };
  }

  const pathStartPoint = { x: startPoint.x, y: startPoint.y + direction * effectiveRadius };
  path.moveTo(pathStartPoint.x, pathStartPoint.y);
  path.arcTo(startPoint.x, startPoint.y, startPoint.x + effectiveRadius, startPoint.y, effectiveRadius);
  path.lineTo(endPoint.x, endPoint.y);
  const curveEndPoint = { x: startPoint.x + effectiveRadius, y: startPoint.y };
  const pathData =
    `M ${fmt(pathStartPoint.x)} ${fmt(pathStartPoint.y)} ` +
    `Q ${fmt(startPoint.x)} ${fmt(startPoint.y)} ${fmt(curveEndPoint.x)} ${fmt(curveEndPoint.y)} ` +
    `L ${fmt(endPoint.x)} ${fmt(endPoint.y)}`;
  return { path, rounded: true, degenerated: false, effectiveRadius, branchLen, pathStartPoint, pathData };
}

function translatePoint(point: EdgePoint | null, dx: number, dy: number) {
  return point ? { x: point.x + dx, y: point.y + dy } : null;
}

function translateRect(rect: WorldRect, dx: number, dy: number): WorldRect {
  return {
    x1: rect.x1 + dx,
    y1: rect.y1 + dy,
    x2: rect.x2 + dx,
    y2: rect.y2 + dy,
  };
}

function translatePathData(pathData: string | null, dx: number, dy: number) {
  if (!pathData) return null;
  const tokens = pathData.trim().split(/\s+/);
  const translated: string[] = [];
  let isXCoord = false;
  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      translated.push(token);
      isXCoord = true;
      continue;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      translated.push(token);
      continue;
    }
    translated.push(String(fmt(value + (isXCoord ? dx : dy))));
    isXCoord = !isXCoord;
  }
  return translated.join(' ');
}

function translateParentGeom(geom: ParentEdgeGeom, dx: number, dy: number): ParentEdgeGeom {
  const trunkPathData = translatePathData(geom.trunkPathData, dx, dy);
  const childBranchPathData = new Map<string, string>();
  const childBranchPaths = new Map<string, Path2D>();
  geom.childBranchPathData.forEach((pathData, childId) => {
    const translatedPathData = translatePathData(pathData, dx, dy);
    if (!translatedPathData) return;
    childBranchPathData.set(childId, translatedPathData);
    childBranchPaths.set(childId, new Path2D(translatedPathData));
  });
  const branchBBoxes = new Map<string, WorldRect>();
  geom.branchBBoxes.forEach((bbox, childId) => {
    branchBBoxes.set(childId, translateRect(bbox, dx, dy));
  });
  const branchMeta = new Map<string, BranchMeta>();
  geom.branchMeta.forEach((meta, childId) => {
    branchMeta.set(childId, {
      ...meta,
      pathStartPoint: { x: meta.pathStartPoint.x + dx, y: meta.pathStartPoint.y + dy },
      startPoint: { x: meta.startPoint.x + dx, y: meta.startPoint.y + dy },
      endPoint: { x: meta.endPoint.x + dx, y: meta.endPoint.y + dy },
    });
  });
  return {
    ...geom,
    trunkPath: trunkPathData ? new Path2D(trunkPathData) : null,
    trunkPathData,
    childBranchPaths,
    childBranchPathData,
    branchBBoxes,
    bbox: translateRect(geom.bbox, dx, dy),
    trunkX: geom.trunkX + dx,
    parentAnchor: { x: geom.parentAnchor.x + dx, y: geom.parentAnchor.y + dy },
    trunkJoin: translatePoint(geom.trunkJoin, dx, dy),
    trunkTop: translatePoint(geom.trunkTop, dx, dy),
    trunkBottom: translatePoint(geom.trunkBottom, dx, dy),
    yMin: geom.yMin == null ? null : geom.yMin + dy,
    yMax: geom.yMax == null ? null : geom.yMax + dy,
    branchMeta,
  };
}

function hasSameTranslation(
  prevRect: WorldRect | null,
  nextRect: WorldRect | null,
  dx: number,
  dy: number
) {
  if (!prevRect || !nextRect) return false;
  const prevWidth = prevRect.x2 - prevRect.x1;
  const nextWidth = nextRect.x2 - nextRect.x1;
  const prevHeight = prevRect.y2 - prevRect.y1;
  const nextHeight = nextRect.y2 - nextRect.y1;
  if (prevWidth !== nextWidth || prevHeight !== nextHeight) return false;
  return nextRect.x1 - prevRect.x1 === dx && nextRect.y1 - prevRect.y1 === dy;
}

function resolveParentGeomTranslation(
  parentId: string,
  childIds: string[],
  nodes: Record<string, any>,
  previousWorldBoxes: WorldBoxes,
  nextWorldBoxes: WorldBoxes
) {
  const prevParentBox = previousWorldBoxes.get(parentId);
  const nextParentBox = nextWorldBoxes.get(parentId);
  const prevParentRect = prevParentBox ? getNodeBodyWorldRect(nodes[parentId], prevParentBox) : null;
  const nextParentRect = nextParentBox ? getNodeBodyWorldRect(nodes[parentId], nextParentBox) : null;
  if (!prevParentRect || !nextParentRect) return null;
  const dx = nextParentRect.x1 - prevParentRect.x1;
  const dy = nextParentRect.y1 - prevParentRect.y1;
  if (!hasSameTranslation(prevParentRect, nextParentRect, dx, dy)) return null;
  for (const childId of childIds) {
    const prevChildBox = previousWorldBoxes.get(childId);
    const nextChildBox = nextWorldBoxes.get(childId);
    const prevChildRect = prevChildBox ? getNodeBodyWorldRect(nodes[childId], prevChildBox) : null;
    const nextChildRect = nextChildBox ? getNodeBodyWorldRect(nodes[childId], nextChildBox) : null;
    if (!hasSameTranslation(prevChildRect, nextChildRect, dx, dy)) return null;
  }
  return { dx, dy };
}

export function buildParentGeom(
  rootId: string,
  parentId: string,
  childIds: string[],
  nodes: Record<string, any>,
  worldBoxes: WorldBoxes,
  hGap: number
): ParentEdgeGeom | null {
  const parentWorldRect = worldBoxes.get(parentId);
  const parentRect = parentWorldRect ? getNodeBodyWorldRect(nodes[parentId], parentWorldRect) : null;
  if (!parentRect) return null;

  const parentAnchor = {
    x: parentRect.x2,
    y: (parentRect.y1 + parentRect.y2) / 2,
  };

  const childAnchors = childIds
    .map((childId, originalIndex) => {
      const childRect = worldBoxes.get(childId);
      if (!childRect) return null;
      const childBodyRect = getNodeBodyWorldRect(nodes[childId], childRect);
      return {
        childId,
        originalIndex,
        point: {
          x: childBodyRect.x1,
          y: (childBodyRect.y1 + childBodyRect.y2) / 2,
        },
      };
    })
    .filter((entry): entry is { childId: string; originalIndex: number; point: EdgePoint } => entry != null);

  if (!childAnchors.length) return null;

  const childBranchPaths = new Map<string, Path2D>();
  const childBranchPathData = new Map<string, string>();
  const branchBBoxes = new Map<string, WorldRect>();
  const branchMeta = new Map<string, BranchMeta>();
  const parentY = parentAnchor.y;

  if (childAnchors.length === 1) {
    const trunkStub = getTrunkStub(hGap);
    const radius = getRoundRadius(trunkStub);
    const childId = childAnchors[0].childId;
    const endPoint = { x: childAnchors[0].point.x + CHILD_INSET, y: parentAnchor.y };
    const singleChild = createSingleChildPath(parentAnchor, endPoint.x);
    childBranchPaths.set(childId, singleChild.path);
    childBranchPathData.set(childId, singleChild.pathData);
    branchMeta.set(childId, {
      pathStartPoint: parentAnchor,
      startPoint: parentAnchor,
      endPoint,
      branchLen: endPoint.x - parentAnchor.x,
      branchType: 'straight',
      rounded: false,
      degenerated: false,
      direction: 0,
      position: 'single',
      effectiveRadius: 0,
    });
    branchBBoxes.set(childId, bboxFromPoints([parentAnchor, endPoint], Math.max(BBOX_MARGIN, CHILD_INSET)));

    return {
      key: `parent:${parentId}`,
      parentId,
      rootId,
      trunkPath: null,
      trunkPathData: null,
      childBranchPaths,
      childBranchPathData,
      branchBBoxes,
      bbox: bboxFromPoints([parentAnchor, endPoint], Math.max(BBOX_MARGIN, CHILD_INSET)),
      trunkX: parentAnchor.x + trunkStub,
      trunkStub,
      roundRadius: radius,
      childInset: CHILD_INSET,
      parentAnchor,
      trunkJoin: null,
      trunkTop: null,
      trunkBottom: null,
      yMin: null,
      yMax: null,
      branchMeta,
      totalChildren: 1,
    };
  }

  const sortedChildAnchors = [...childAnchors].sort(
    (a, b) => a.point.y - b.point.y || a.originalIndex - b.originalIndex
  );
  const roundedCandidates =
    childAnchors.filter((entry) => Math.abs(entry.point.y - parentY) > STRAIGHT_ALIGNMENT_EPSILON);
  const desiredTrunkX = parentAnchor.x + getTrunkStub(hGap);
  const minRoundedEndX =
    roundedCandidates.length > 0
      ? Math.min(...roundedCandidates.map((entry) => entry.point.x + CHILD_INSET))
      : Math.min(...sortedChildAnchors.map((entry) => entry.point.x + CHILD_INSET));
  const requiredRoundedBranchLen = MIN_BRANCH_STRAIGHT + PREFERRED_VISIBLE_RADIUS * 2;
  const roundedDeficit = desiredTrunkX + requiredRoundedBranchLen - minRoundedEndX;
  const trunkX = Math.max(parentAnchor.x + MIN_TRUNK_CLEARANCE, desiredTrunkX - Math.max(0, roundedDeficit));
  const trunkStub = Math.max(0, trunkX - parentAnchor.x);
  const radiusBase = getRoundRadius(Math.max(trunkStub, MIN_EFFECTIVE_RADIUS * 2));
  const yValues = sortedChildAnchors.map((entry) => entry.point.y);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const trunkJoin = { x: trunkX, y: parentAnchor.y };
  const bboxPoints: EdgePoint[] = [parentAnchor, trunkJoin, { x: trunkX, y: yMin }, { x: trunkX, y: yMax }];
  const bboxMargin = Math.max(BBOX_MARGIN, radiusBase + CHILD_INSET);

  for (let index = 0; index < sortedChildAnchors.length; index += 1) {
    const { childId, point } = sortedChildAnchors[index];
    const startPoint = { x: trunkX, y: point.y };
    const endPoint = { x: point.x + CHILD_INSET, y: point.y };
    let position: BranchPosition = 'aligned';
    let roundedRequested = false;
    let direction: -1 | 0 | 1 = 0;
    const yDiff = point.y - parentY;

    if (Math.abs(yDiff) <= STRAIGHT_ALIGNMENT_EPSILON) {
      position = 'aligned';
    } else if (yDiff < 0) {
      position = 'up';
      roundedRequested = true;
      direction = 1;
    } else {
      position = 'down';
      roundedRequested = true;
      direction = -1;
    }

    const branchResult = createBranchPath(startPoint, endPoint, radiusBase, roundedRequested, direction);

    childBranchPaths.set(childId, branchResult.path);
    childBranchPathData.set(childId, branchResult.pathData);
    branchMeta.set(childId, {
      pathStartPoint: branchResult.pathStartPoint,
      startPoint,
      endPoint,
      branchLen: branchResult.branchLen,
      branchType: branchResult.rounded ? 'rounded' : 'straight',
      rounded: branchResult.rounded,
      degenerated: branchResult.degenerated,
      direction,
      position,
      effectiveRadius: branchResult.effectiveRadius,
    });
    branchBBoxes.set(childId, bboxFromPoints([branchResult.pathStartPoint, startPoint, endPoint], bboxMargin));
    bboxPoints.push(branchResult.pathStartPoint, startPoint, endPoint);
  }

  const trunkContactYs = Array.from(branchMeta.values()).map((meta) =>
    meta.rounded ? meta.pathStartPoint.y : meta.startPoint.y
  );
  const trunkStartY = trunkContactYs.length ? Math.min(...trunkContactYs) : yMin;
  const trunkEndY = trunkContactYs.length ? Math.max(...trunkContactYs) : yMax;
  const trunk = createTrunkPath(parentAnchor, trunkX, trunkStartY, trunkEndY);
  const trunkTop = { x: trunkX, y: trunkStartY };
  const trunkBottom = { x: trunkX, y: trunkEndY };
  bboxPoints.push(trunkTop, trunkBottom);

  return {
    key: `parent:${parentId}`,
    parentId,
    rootId,
    trunkPath: trunk.path,
    trunkPathData: trunk.pathData,
    childBranchPaths,
    childBranchPathData,
    branchBBoxes,
    bbox: bboxFromPoints(bboxPoints, bboxMargin),
    trunkX,
    trunkStub,
    roundRadius: radiusBase,
    childInset: CHILD_INSET,
    parentAnchor,
    trunkJoin,
    trunkTop,
    trunkBottom,
    yMin,
    yMax,
    branchMeta,
    totalChildren: childAnchors.length,
  };
}

export function useEdges() {
  const parentEdgeGeoms = ref<ParentEdgeGeom[]>([]);
  const parentEdgeGeomByKey = new Map<ParentEdgeKey, ParentEdgeGeom>();
  const edgeSpatialIndex = new UniformGridSpatialIndex(512);
  const edgeStats = ref<ParentEdgeCacheStats>({
    parentsWithEdges: 0,
    totalChildrenEdges: 0,
    edgeCacheSize: 0,
    edgeCacheBuildMs: 0,
    trunkPathCount: 0,
    branchPathCount: 0,
    roundedBranches: 0,
    straightBranches: 0,
    degeneratedBranches: 0,
    minBranchLen: 0,
    maxBranchLen: 0,
    trunkStubMin: 0,
    trunkStubMax: 0,
    roundRadiusMin: 0,
    roundRadiusMax: 0,
    childInset: CHILD_INSET,
    alignedStraightCount: 0,
    upRoundedCount: 0,
    downRoundedCount: 0,
    alignedMultiCount: 0,
    nonAlignedRoundedCount: 0,
    nonAlignedDegeneratedCount: 0,
    trunkShrinkAppliedCount: 0,
    trunkOverhangDetectedCount: 0,
  });

  function finalizeEdgeCacheStats(rebuildStart: number, options?: { updatedKeys?: ParentEdgeKey[] }) {
    if (options?.updatedKeys?.length && !DEBUG_CANVAS_OVERLAY) {
      const updatedBoxes = new Map<ParentEdgeKey, WorldRect>();
      options.updatedKeys.forEach((key) => {
        const geom = parentEdgeGeomByKey.get(key);
        if (geom) updatedBoxes.set(key, geom.bbox);
      });
      edgeSpatialIndex.updateMany(updatedBoxes, options.updatedKeys);
      edgeStats.value = {
        ...edgeStats.value,
        parentsWithEdges: parentEdgeGeomByKey.size,
        edgeCacheSize: parentEdgeGeomByKey.size,
        edgeCacheBuildMs: performance.now() - rebuildStart,
      };
      return;
    }

    let totalChildrenEdges = 0;
    let trunkPathCount = 0;
    let branchPathCount = 0;
    let roundedBranches = 0;
    let straightBranches = 0;
    let degeneratedBranches = 0;
    let minBranchLen = Number.POSITIVE_INFINITY;
    let maxBranchLen = Number.NEGATIVE_INFINITY;
    let trunkStubMin = Number.POSITIVE_INFINITY;
    let trunkStubMax = Number.NEGATIVE_INFINITY;
    let roundRadiusMin = Number.POSITIVE_INFINITY;
    let roundRadiusMax = Number.NEGATIVE_INFINITY;
    let alignedStraightCount = 0;
    let upRoundedCount = 0;
    let downRoundedCount = 0;
    let alignedMultiCount = 0;
    let nonAlignedRoundedCount = 0;
    let nonAlignedDegeneratedCount = 0;
    let trunkShrinkAppliedCount = 0;
    let trunkOverhangDetectedCount = 0;
    const overhangEpsilon = 0.5;
    const edgeBoxes = new Map<ParentEdgeKey, WorldRect>();

    parentEdgeGeoms.value = Array.from(parentEdgeGeomByKey.values());
    for (const geom of parentEdgeGeoms.value) {
      edgeBoxes.set(geom.key, geom.bbox);
      totalChildrenEdges += geom.totalChildren;
      trunkPathCount += 1;
      branchPathCount += geom.childBranchPaths.size;
      for (const meta of geom.branchMeta.values()) {
        if (meta.rounded) roundedBranches += 1;
        else straightBranches += 1;
        if (meta.degenerated) degeneratedBranches += 1;
        minBranchLen = Math.min(minBranchLen, meta.branchLen);
        maxBranchLen = Math.max(maxBranchLen, meta.branchLen);
        if (meta.position === 'aligned') {
          alignedStraightCount += meta.branchType === 'straight' ? 1 : 0;
          if (geom.totalChildren >= 2) alignedMultiCount += 1;
        }
        if (meta.position === 'up' && meta.rounded) upRoundedCount += 1;
        if (meta.position === 'down' && meta.rounded) downRoundedCount += 1;
        if ((meta.position === 'up' || meta.position === 'down') && meta.rounded) nonAlignedRoundedCount += 1;
        if ((meta.position === 'up' || meta.position === 'down') && meta.degenerated) nonAlignedDegeneratedCount += 1;
      }
      if (geom.trunkTop && geom.yMin != null && Math.abs(geom.trunkTop.y - geom.yMin) > overhangEpsilon) {
        trunkShrinkAppliedCount += 1;
      } else if (geom.trunkBottom && geom.yMax != null && Math.abs(geom.trunkBottom.y - geom.yMax) > overhangEpsilon) {
        trunkShrinkAppliedCount += 1;
      }
      if (geom.trunkTop && geom.yMin != null && geom.trunkTop.y < geom.yMin - overhangEpsilon) {
        trunkOverhangDetectedCount += 1;
      }
      if (geom.trunkBottom && geom.yMax != null && geom.trunkBottom.y > geom.yMax + overhangEpsilon) {
        trunkOverhangDetectedCount += 1;
      }
      trunkStubMin = Math.min(trunkStubMin, geom.trunkStub);
      trunkStubMax = Math.max(trunkStubMax, geom.trunkStub);
      roundRadiusMin = Math.min(roundRadiusMin, geom.roundRadius);
      roundRadiusMax = Math.max(roundRadiusMax, geom.roundRadius);
    }

    edgeSpatialIndex.rebuild(edgeBoxes);
    edgeStats.value = {
      parentsWithEdges: parentEdgeGeoms.value.length,
      totalChildrenEdges,
      edgeCacheSize: parentEdgeGeoms.value.length,
      edgeCacheBuildMs: performance.now() - rebuildStart,
      trunkPathCount,
      branchPathCount,
      roundedBranches,
      straightBranches,
      degeneratedBranches,
      minBranchLen: Number.isFinite(minBranchLen) ? minBranchLen : 0,
      maxBranchLen: Number.isFinite(maxBranchLen) ? maxBranchLen : 0,
      trunkStubMin: Number.isFinite(trunkStubMin) ? trunkStubMin : 0,
      trunkStubMax: Number.isFinite(trunkStubMax) ? trunkStubMax : 0,
      roundRadiusMin: Number.isFinite(roundRadiusMin) ? roundRadiusMin : 0,
      roundRadiusMax: Number.isFinite(roundRadiusMax) ? roundRadiusMax : 0,
      childInset: CHILD_INSET,
      alignedStraightCount,
      upRoundedCount,
      downRoundedCount,
      alignedMultiCount,
      nonAlignedRoundedCount,
      nonAlignedDegeneratedCount,
      trunkShrinkAppliedCount,
      trunkOverhangDetectedCount,
    };

    if (DEBUG_CANVAS_OVERLAY) {
      if (branchPathCount !== totalChildrenEdges) {
        console.debug('[mind-edge-cache-isolation]', {
          message: 'branchPathCount mismatch',
          branchPathCount,
          totalChildrenEdges,
        });
      }
      console.debug('[mind-edge-cache]', {
        parentsWithEdges: edgeStats.value.parentsWithEdges,
        totalChildrenEdges: edgeStats.value.totalChildrenEdges,
        trunkPathCount: edgeStats.value.trunkPathCount,
        branchPathCount: edgeStats.value.branchPathCount,
        roundedBranches: edgeStats.value.roundedBranches,
        straightBranches: edgeStats.value.straightBranches,
        degeneratedBranches: edgeStats.value.degeneratedBranches,
        minBranchLen: Number(edgeStats.value.minBranchLen.toFixed(2)),
        maxBranchLen: Number(edgeStats.value.maxBranchLen.toFixed(2)),
        edgeCacheSize: edgeStats.value.edgeCacheSize,
        edgeCacheBuildMs: Number(edgeStats.value.edgeCacheBuildMs.toFixed(2)),
        trunkStubRange: [edgeStats.value.trunkStubMin, edgeStats.value.trunkStubMax],
        roundRadiusRange: [edgeStats.value.roundRadiusMin, edgeStats.value.roundRadiusMax],
        minStraight: MIN_BRANCH_STRAIGHT,
        rMin: MIN_EFFECTIVE_RADIUS,
        childInset: edgeStats.value.childInset,
        alignedStraightCount: edgeStats.value.alignedStraightCount,
        upRoundedCount: edgeStats.value.upRoundedCount,
        downRoundedCount: edgeStats.value.downRoundedCount,
        alignedMultiCount: edgeStats.value.alignedMultiCount,
        nonAlignedRoundedCount: edgeStats.value.nonAlignedRoundedCount,
        nonAlignedDegeneratedCount: edgeStats.value.nonAlignedDegeneratedCount,
        trunkShrinkAppliedCount: edgeStats.value.trunkShrinkAppliedCount,
        trunkOverhangDetectedCount: edgeStats.value.trunkOverhangDetectedCount,
        branchCurvePolicy: 'strict-centerline-aligned-only',
      });
    }
  }

  function rebuildEdgeCache(
    doc: any,
    worldBoxes: WorldBoxes,
    options?: {
      affectedParents?: Array<{ parentId: string; rootId: string }>;
      previousWorldBoxes?: WorldBoxes;
      translatedParentOffsets?: Map<string, { dx: number; dy: number }>;
    }
  ) {
    const rebuildStart = performance.now();
    const activeMind = getActiveMind(doc);
    const nodes = activeMind?.nodes || {};
    const roots = Array.isArray(activeMind?.roots) ? activeMind.roots : [];
    const hGapByRootId = new Map<string, number>();
    roots.forEach((root) => {
      if (root?.rootId) {
        hGapByRootId.set(root.rootId, resolveRootHorizontalGap(root.layout?.hGap ?? DEFAULT_ROOT_H_GAP));
      }
    });

    if (!options?.affectedParents?.length) {
      parentEdgeGeomByKey.clear();
      for (const root of roots) {
        const rootId = root?.rootId;
        if (!rootId) continue;
        const hGap = hGapByRootId.get(rootId) ?? DEFAULT_ROOT_H_GAP;
        const queue: string[] = [rootId];
        let cursor = 0;

        while (cursor < queue.length) {
          const parentId = queue[cursor];
          cursor += 1;
          const parentNode = nodes[parentId];
          if (!parentNode) continue;

          const childIds: string[] = Array.isArray(parentNode.children) ? parentNode.children : [];
          for (const childId of childIds) queue.push(childId);
          if (!childIds.length) continue;

          const geom = buildParentGeom(rootId, parentId, childIds, nodes, worldBoxes, hGap);
          if (geom) parentEdgeGeomByKey.set(geom.key, geom);
        }
      }
      finalizeEdgeCacheStats(rebuildStart);
      return { translatedParentCount: 0 };
    }

    const nextAffectedParents = new Map<string, string>();
    let translatedParentCount = 0;
    options.affectedParents.forEach(({ parentId, rootId }) => {
      if (parentId && rootId) nextAffectedParents.set(parentId, rootId);
    });
    const previousAffectedGeoms = new Map<ParentEdgeKey, ParentEdgeGeom>();
    nextAffectedParents.forEach((_rootId, parentId) => {
      const key = `parent:${parentId}` as ParentEdgeKey;
      const previousGeom = parentEdgeGeomByKey.get(key);
      if (previousGeom) previousAffectedGeoms.set(key, previousGeom);
      parentEdgeGeomByKey.delete(key);
    });
    nextAffectedParents.forEach((rootId, parentId) => {
      const parentNode = nodes[parentId];
      if (!parentNode) return;
      const childIds: string[] = Array.isArray(parentNode.children) ? parentNode.children : [];
      if (!childIds.length) return;
      const translatedOffset = options.translatedParentOffsets?.get(parentId);
      const previousGeom = previousAffectedGeoms.get(`parent:${parentId}`);
      if (previousGeom && translatedOffset) {
        parentEdgeGeomByKey.set(
          previousGeom.key,
          translateParentGeom(previousGeom, translatedOffset.dx, translatedOffset.dy)
        );
        translatedParentCount += 1;
        return;
      }
      const geom = buildParentGeom(
        rootId,
        parentId,
        childIds,
        nodes,
        worldBoxes,
        hGapByRootId.get(rootId) ?? DEFAULT_ROOT_H_GAP
      );
      if (geom) parentEdgeGeomByKey.set(geom.key, geom);
    });
    finalizeEdgeCacheStats(rebuildStart, {
      updatedKeys: Array.from(nextAffectedParents.keys()).map((parentId) => `parent:${parentId}` as ParentEdgeKey),
    });
    return { translatedParentCount };
  }

  function queryVisibleParentEdgeGeoms(rect: WorldRect) {
    const candidateKeys = edgeSpatialIndex.queryRect(rect) as ParentEdgeKey[];
    const result: ParentEdgeGeom[] = [];
    for (const key of candidateKeys) {
      const geom = parentEdgeGeomByKey.get(key);
      if (!geom || !rectIntersects(geom.bbox, rect)) continue;
      result.push(geom);
    }
    return result;
  }

  return {
    parentEdgeGeoms,
    edgeStats,
    rebuildEdgeCache,
    queryVisibleParentEdgeGeoms,
  };
}
