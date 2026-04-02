import { ref } from 'vue';
import { rectIntersects, screenToWorld, type WorldRect } from '../geom/rect';
import type { WorldBoxes } from '../geom/worldBoxes';
import { getActiveMind } from './useDocUtils';
import type { Camera } from './useCamera';

export type MindRelationGeom = {
  relationId: string;
  fromNodeId: string;
  toNodeId: string;
  path: Path2D;
  pathData: string;
  bbox: WorldRect;
  samplePoints: Array<{ x: number; y: number }>;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
};

type Point = { x: number; y: number };
type RelationObstacle = { nodeId: string; rect: WorldRect };

function fmt(value: number) {
  return Number(value.toFixed(2));
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number) {
  const oneMinusT = 1 - t;
  return (
    oneMinusT * oneMinusT * oneMinusT * p0 +
    3 * oneMinusT * oneMinusT * t * p1 +
    3 * oneMinusT * t * t * p2 +
    t * t * t * p3
  );
}

function sampleBezierPoints(
  startPoint: { x: number; y: number },
  controlPoint1: { x: number; y: number },
  controlPoint2: { x: number; y: number },
  endPoint: { x: number; y: number },
  steps = 24
) {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    points.push({
      x: cubicAt(startPoint.x, controlPoint1.x, controlPoint2.x, endPoint.x, t),
      y: cubicAt(startPoint.y, controlPoint1.y, controlPoint2.y, endPoint.y, t),
    });
  }
  return points;
}

function bboxFromPoints(points: Array<{ x: number; y: number }>, margin = 8): WorldRect {
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
  return {
    x1: minX - margin,
    y1: minY - margin,
    x2: maxX + margin,
    y2: maxY + margin,
  };
}

function expandRect(rect: WorldRect, padding: number): WorldRect {
  return {
    x1: rect.x1 - padding,
    y1: rect.y1 - padding,
    x2: rect.x2 + padding,
    y2: rect.y2 + padding,
  };
}

function pointInRect(point: Point, rect: WorldRect) {
  return point.x >= rect.x1 && point.x <= rect.x2 && point.y >= rect.y1 && point.y <= rect.y2;
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 0.0001) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: Point, b: Point, c: Point) {
  return (
    b.x <= Math.max(a.x, c.x) + 0.0001 &&
    b.x + 0.0001 >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) + 0.0001 &&
    b.y + 0.0001 >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;
  return false;
}

function segmentIntersectsRect(startPoint: Point, endPoint: Point, rect: WorldRect) {
  if (pointInRect(startPoint, rect) || pointInRect(endPoint, rect)) return true;
  const topLeft = { x: rect.x1, y: rect.y1 };
  const topRight = { x: rect.x2, y: rect.y1 };
  const bottomLeft = { x: rect.x1, y: rect.y2 };
  const bottomRight = { x: rect.x2, y: rect.y2 };
  return (
    segmentsIntersect(startPoint, endPoint, topLeft, topRight) ||
    segmentsIntersect(startPoint, endPoint, topRight, bottomRight) ||
    segmentsIntersect(startPoint, endPoint, bottomRight, bottomLeft) ||
    segmentsIntersect(startPoint, endPoint, bottomLeft, topLeft)
  );
}

function resolveAnchorPoint(sourceRect: WorldRect, targetRect: WorldRect) {
  const sourceCenterX = (sourceRect.x1 + sourceRect.x2) / 2;
  const sourceCenterY = (sourceRect.y1 + sourceRect.y2) / 2;
  const targetCenterX = (targetRect.x1 + targetRect.x2) / 2;
  const targetCenterY = (targetRect.y1 + targetRect.y2) / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  if (Math.abs(dx) >= Math.abs(dy) * 1.15) {
    return dx >= 0
      ? { x: sourceRect.x2, y: sourceCenterY }
      : { x: sourceRect.x1, y: sourceCenterY };
  }
  return dy >= 0
    ? { x: sourceCenterX, y: sourceRect.y2 }
    : { x: sourceCenterX, y: sourceRect.y1 };
}

function createRelationCurve(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  options?: {
    laneX?: number | null;
    laneY?: number | null;
  }
) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const cpOffsetX = Math.min(140, Math.max(40, Math.abs(dx) * 0.35));
  const cpOffsetY = Math.min(48, Math.max(0, Math.abs(dy) * 0.12));
  const directionX = dx >= 0 ? 1 : -1;
  const directionY = dy >= 0 ? 1 : -1;
  const controlPoint1 = {
    x: startPoint.x + directionX * cpOffsetX,
    y: startPoint.y + directionY * cpOffsetY * 0.3,
  };
  const controlPoint2 = {
    x: endPoint.x - directionX * cpOffsetX,
    y: endPoint.y - directionY * cpOffsetY * 0.3,
  };
  if (Number.isFinite(options?.laneY)) {
    controlPoint1.y = options?.laneY as number;
    controlPoint2.y = options?.laneY as number;
  }
  if (Number.isFinite(options?.laneX)) {
    controlPoint1.x = options?.laneX as number;
    controlPoint2.x = options?.laneX as number;
  }
  const path = new Path2D();
  path.moveTo(startPoint.x, startPoint.y);
  path.bezierCurveTo(
    controlPoint1.x,
    controlPoint1.y,
    controlPoint2.x,
    controlPoint2.y,
    endPoint.x,
    endPoint.y
  );
  const pathData =
    `M ${fmt(startPoint.x)} ${fmt(startPoint.y)} ` +
    `C ${fmt(controlPoint1.x)} ${fmt(controlPoint1.y)} ${fmt(controlPoint2.x)} ${fmt(controlPoint2.y)} ${fmt(endPoint.x)} ${fmt(endPoint.y)}`;
  return {
    path,
    pathData,
    controlPoint1,
    controlPoint2,
    samplePoints: sampleBezierPoints(startPoint, controlPoint1, controlPoint2, endPoint),
  };
}

function collectRelationObstacles(
  worldBoxes: WorldBoxes,
  nodes: Record<string, any>,
  excludeNodeIds: Set<string>
) {
  const obstacles: RelationObstacle[] = [];
  for (const [nodeId, rect] of worldBoxes.entries()) {
    if (excludeNodeIds.has(nodeId)) continue;
    const node = nodes[nodeId];
    if (!node) continue;
    obstacles.push({
      nodeId,
      rect,
    });
  }
  return obstacles;
}

function findCurveObstacles(samplePoints: Point[], obstacles: RelationObstacle[], probeBbox: WorldRect, padding = 16) {
  const hits: RelationObstacle[] = [];
  for (const obstacle of obstacles) {
    const expanded = expandRect(obstacle.rect, padding);
    if (!rectIntersects(expanded, probeBbox)) continue;
    let intersects = false;
    for (let index = 1; index < samplePoints.length; index += 1) {
      if (
        pointInRect(samplePoints[index - 1], expanded) ||
        pointInRect(samplePoints[index], expanded) ||
        segmentIntersectsRect(samplePoints[index - 1], samplePoints[index], expanded)
      ) {
        intersects = true;
        break;
      }
    }
    if (intersects) hits.push(obstacle);
  }
  return hits;
}

function buildHorizontalCorridor(startPoint: Point, endPoint: Point, padding: number): WorldRect {
  return {
    x1: Math.min(startPoint.x, endPoint.x),
    x2: Math.max(startPoint.x, endPoint.x),
    y1: Math.min(startPoint.y, endPoint.y) - padding,
    y2: Math.max(startPoint.y, endPoint.y) + padding,
  };
}

function buildVerticalCorridor(startPoint: Point, endPoint: Point, padding: number): WorldRect {
  return {
    x1: Math.min(startPoint.x, endPoint.x) - padding,
    x2: Math.max(startPoint.x, endPoint.x) + padding,
    y1: Math.min(startPoint.y, endPoint.y),
    y2: Math.max(startPoint.y, endPoint.y),
  };
}

function buildAvoidedRelationCurve(
  startPoint: Point,
  endPoint: Point,
  obstacles: RelationObstacle[]
) {
  const baseCurve = createRelationCurve(startPoint, endPoint);
  const baseBbox = bboxFromPoints([startPoint, baseCurve.controlPoint1, baseCurve.controlPoint2, endPoint, ...baseCurve.samplePoints]);
  const blockingObstacles = findCurveObstacles(baseCurve.samplePoints, obstacles, baseBbox);
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const prefersHorizontalLane = Math.abs(dx) >= Math.abs(dy);
  const corridor = prefersHorizontalLane
    ? buildHorizontalCorridor(startPoint, endPoint, 26)
    : buildVerticalCorridor(startPoint, endPoint, 26);
  const corridorObstacles = obstacles.filter(({ rect }) => rectIntersects(expandRect(rect, 10), corridor));
  const effectiveObstacles = blockingObstacles.length ? blockingObstacles : corridorObstacles;
  if (!effectiveObstacles.length) return baseCurve;
  const corridorPadding = 22;
  const maxDetour = prefersHorizontalLane ? Math.max(120, Math.min(320, Math.abs(dx) * 0.28)) : Math.max(120, Math.min(320, Math.abs(dy) * 0.28));

  if (prefersHorizontalLane) {
    const midY = (startPoint.y + endPoint.y) / 2;
    const aboveLane = Math.min(...effectiveObstacles.map(({ rect }) => rect.y1)) - corridorPadding;
    const belowLane = Math.max(...effectiveObstacles.map(({ rect }) => rect.y2)) + corridorPadding;
    const candidateLanes = [aboveLane, belowLane]
      .filter((laneY) => Math.abs(laneY - midY) <= maxDetour * 2)
      .sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY));
    for (const laneY of candidateLanes) {
      const candidate = createRelationCurve(startPoint, endPoint, { laneY });
      const candidateBbox = bboxFromPoints([startPoint, candidate.controlPoint1, candidate.controlPoint2, endPoint, ...candidate.samplePoints]);
      if (!findCurveObstacles(candidate.samplePoints, effectiveObstacles, candidateBbox, 12).length) {
        return candidate;
      }
    }
    const laneY = Math.abs(aboveLane - midY) <= Math.abs(belowLane - midY) ? aboveLane : belowLane;
    return createRelationCurve(startPoint, endPoint, { laneY });
  }

  const midX = (startPoint.x + endPoint.x) / 2;
  const leftLane = Math.min(...effectiveObstacles.map(({ rect }) => rect.x1)) - corridorPadding;
  const rightLane = Math.max(...effectiveObstacles.map(({ rect }) => rect.x2)) + corridorPadding;
  const candidateLanes = [leftLane, rightLane]
    .filter((laneX) => Math.abs(laneX - midX) <= maxDetour * 2)
    .sort((a, b) => Math.abs(a - midX) - Math.abs(b - midX));
  for (const laneX of candidateLanes) {
    const candidate = createRelationCurve(startPoint, endPoint, { laneX });
    const candidateBbox = bboxFromPoints([startPoint, candidate.controlPoint1, candidate.controlPoint2, endPoint, ...candidate.samplePoints]);
    if (!findCurveObstacles(candidate.samplePoints, effectiveObstacles, candidateBbox, 12).length) {
      return candidate;
    }
  }
  const laneX = Math.abs(leftLane - midX) <= Math.abs(rightLane - midX) ? leftLane : rightLane;
  return createRelationCurve(startPoint, endPoint, { laneX });
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  if (!dx && !dy) {
    return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - startPoint.x) * dx + (point.y - startPoint.y) * dy) / (dx * dx + dy * dy))
  );
  const projectionX = startPoint.x + dx * t;
  const projectionY = startPoint.y + dy * t;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

export function buildRelationDraftPreview(
  worldBoxes: WorldBoxes,
  nodes: Record<string, any>,
  fromNodeId: string,
  cursorWorldPoint: { x: number; y: number },
  targetNodeId?: string | null
) {
  const fromRect = worldBoxes.get(fromNodeId);
  if (!fromRect) return null;
  const fromNode = nodes[fromNodeId];
  if (!fromNode) return null;
  const fromBodyRect = fromRect;
  const targetRect = targetNodeId ? worldBoxes.get(targetNodeId) : null;
  const targetNode = targetNodeId ? nodes[targetNodeId] : null;
  const resolvedTargetRect = targetRect && targetNode ? targetRect : null;
  const proxyTargetRect =
    resolvedTargetRect ??
    {
      x1: cursorWorldPoint.x - 1,
      y1: cursorWorldPoint.y - 1,
      x2: cursorWorldPoint.x + 1,
      y2: cursorWorldPoint.y + 1,
    };
  const startPoint = resolveAnchorPoint(fromBodyRect, proxyTargetRect);
  const endPoint = resolvedTargetRect
    ? resolveAnchorPoint(resolvedTargetRect, fromBodyRect)
    : { x: cursorWorldPoint.x, y: cursorWorldPoint.y };
  const obstacles = collectRelationObstacles(
    worldBoxes,
    nodes,
    new Set([fromNodeId, ...(targetNodeId ? [targetNodeId] : [])])
  );
  const curve = buildAvoidedRelationCurve(startPoint, endPoint, obstacles);
  return {
    startPoint,
    endPoint,
    ...curve,
  };
}

export function useRelations() {
  const relationGeoms = ref<Map<string, MindRelationGeom>>(new Map());
  const relationCacheVersion = ref(0);
  let lastRelationGeomSignature = '';

  function rebuildRelationCache(doc: any, worldBoxes: WorldBoxes) {
    const activeMind = getActiveMind(doc);
    const relations = Array.isArray(activeMind?.relations) ? activeMind.relations : [];
    const nodes = activeMind?.nodes || {};
    const nextGeoms = new Map<string, MindRelationGeom>();
    const signatureParts: string[] = [];
    const obstacles = collectRelationObstacles(worldBoxes, nodes, new Set());
    relations.forEach((relation: any) => {
      const relationId =
        typeof relation?.id === 'string' && relation.id.trim() ? relation.id.trim() : null;
      const fromNodeId =
        typeof relation?.fromNodeId === 'string' && relation.fromNodeId.trim() ? relation.fromNodeId.trim() : null;
      const toNodeId =
        typeof relation?.toNodeId === 'string' && relation.toNodeId.trim() ? relation.toNodeId.trim() : null;
      if (!relationId || !fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
      const fromRect = worldBoxes.get(fromNodeId);
      const toRect = worldBoxes.get(toNodeId);
      const fromNode = nodes[fromNodeId];
      const toNode = nodes[toNodeId];
      if (!fromRect || !toRect || !fromNode || !toNode) return;
      const fromBodyRect = fromRect;
      const toBodyRect = toRect;
      const startPoint = resolveAnchorPoint(fromBodyRect, toBodyRect);
      const endPoint = resolveAnchorPoint(toBodyRect, fromBodyRect);
      const curve = buildAvoidedRelationCurve(
        startPoint,
        endPoint,
        obstacles.filter((item) => item.nodeId !== fromNodeId && item.nodeId !== toNodeId)
      );
      const bbox = bboxFromPoints([startPoint, curve.controlPoint1, curve.controlPoint2, endPoint, ...curve.samplePoints]);
      nextGeoms.set(relationId, {
        relationId,
        fromNodeId,
        toNodeId,
        path: curve.path,
        pathData: curve.pathData,
        bbox,
        samplePoints: curve.samplePoints,
        startPoint,
        endPoint,
      });
      signatureParts.push(`${relationId}|${fromNodeId}|${toNodeId}|${curve.pathData}`);
    });
    const nextSignature = signatureParts.join('||');
    if (nextSignature === lastRelationGeomSignature && nextGeoms.size === relationGeoms.value.size) return;
    lastRelationGeomSignature = nextSignature;
    relationGeoms.value = nextGeoms;
    relationCacheVersion.value += 1;
  }

  function queryVisibleRelationGeoms(viewRect: WorldRect) {
    const result: MindRelationGeom[] = [];
    for (const geom of relationGeoms.value.values()) {
      if (rectIntersects(geom.bbox, viewRect)) result.push(geom);
    }
    return result;
  }

  function hitTestRelation(screenX: number, screenY: number, camera: Camera, tolerancePx = 8) {
    const worldPoint = screenToWorld(camera, screenX, screenY);
    const toleranceWorld = tolerancePx / Math.max(camera.scale, 0.0001);
    const probeRect: WorldRect = {
      x1: worldPoint.x - toleranceWorld,
      y1: worldPoint.y - toleranceWorld,
      x2: worldPoint.x + toleranceWorld,
      y2: worldPoint.y + toleranceWorld,
    };
    let bestHit: { relationId: string; distance: number } | null = null;
    for (const geom of queryVisibleRelationGeoms(probeRect)) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (let index = 1; index < geom.samplePoints.length; index += 1) {
        minDistance = Math.min(
          minDistance,
          pointToSegmentDistance(worldPoint, geom.samplePoints[index - 1], geom.samplePoints[index])
        );
        if (minDistance <= toleranceWorld) break;
      }
      if (minDistance > toleranceWorld) continue;
      if (!bestHit || minDistance < bestHit.distance) {
        bestHit = { relationId: geom.relationId, distance: minDistance };
      }
    }
    return bestHit?.relationId ?? null;
  }

  return {
    relationGeoms,
    relationCacheVersion,
    rebuildRelationCache,
    queryVisibleRelationGeoms,
    hitTestRelation,
  };
}
