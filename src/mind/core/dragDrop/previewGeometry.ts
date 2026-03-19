import { buildParentGeom, CHILD_INSET, MIN_BRANCH_STRAIGHT, MIN_EFFECTIVE_RADIUS, getRoundRadius, getTrunkStub } from '@/mind/vue_views/main/actions/useEdges';
import { getActiveMind } from '@/mind/vue_views/main/actions/useDocUtils';
import type { DragDropTarget } from '@/mind/core/drag/types';
import type { WorldRect } from '@/mind/vue_views/main/geom/rect';
import type { WorldBoxes } from '@/mind/vue_views/main/geom/worldBoxes';

export type PreviewGeometry = {
  previewRect: WorldRect;
  previewPath: Path2D | null;
  previewPathData: string | null;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  pathStartPoint: { x: number; y: number } | null;
  edgesConfig: {
    trunkStub: number;
    roundRadius: number;
    childInset: number;
    minStraight: number;
    minEffectiveRadius: number;
  };
};

type BuildPreviewGeometryParams = {
  doc: any;
  worldBoxes: WorldBoxes;
  dropTarget: DragDropTarget;
  rootId: string;
  previewWidth: number;
  previewHeight: number;
};

const PREVIEW_NODE_ID = '__drag_preview__';

function fmt(value: number) {
  return Number(value.toFixed(2));
}

function createLinePathData(start: { x: number; y: number }, end: { x: number; y: number }) {
  return `M ${fmt(start.x)} ${fmt(start.y)} L ${fmt(end.x)} ${fmt(end.y)}`;
}

function getRootLayout(doc: any, rootId: string) {
  const activeMind = getActiveMind(doc);
  const root = Array.isArray(activeMind?.roots)
    ? activeMind.roots.find((entry: any) => entry?.rootId === rootId)
    : null;
  return {
    hGap: root?.layout?.hGap ?? 60,
    vGap: root?.layout?.vGap ?? 18,
  };
}

function buildPreviewRect(
  doc: any,
  worldBoxes: WorldBoxes,
  rootId: string,
  dropTarget: DragDropTarget,
  previewWidth: number,
  previewHeight: number
) {
  const { hGap, vGap } = getRootLayout(doc, rootId);
  const nodes = getActiveMind(doc)?.nodes || {};
  const targetRect = worldBoxes.get(dropTarget.targetNodeId);
  if (!targetRect) return null;

  if (dropTarget.type === 'child') {
    const parentRect = targetRect;
    const childIds: string[] = Array.isArray(nodes[dropTarget.toParentId]?.children) ? nodes[dropTarget.toParentId].children : [];
    const lastChildId = childIds[childIds.length - 1];
    const lastChildRect = lastChildId ? worldBoxes.get(lastChildId) : null;
    const x1 = parentRect.x2 + hGap;
    const y1 = lastChildRect
      ? lastChildRect.y2 + vGap
      : (parentRect.y1 + parentRect.y2) / 2 - previewHeight / 2;
    return { x1, y1, x2: x1 + previewWidth, y2: y1 + previewHeight };
  }

  const x1 = targetRect.x1;
  const y1 =
    dropTarget.type === 'sibling-before'
      ? targetRect.y1 - vGap - previewHeight
      : targetRect.y2 + vGap;
  return { x1, y1, x2: x1 + previewWidth, y2: y1 + previewHeight };
}

export function buildPreviewGeometry(params: BuildPreviewGeometryParams): PreviewGeometry | null {
  const { doc, worldBoxes, dropTarget, rootId, previewWidth, previewHeight } = params;
  const previewRect = buildPreviewRect(doc, worldBoxes, rootId, dropTarget, previewWidth, previewHeight);
  if (!previewRect) return null;

  const { hGap } = getRootLayout(doc, rootId);
  const nodes = getActiveMind(doc)?.nodes || {};
  const parentId = dropTarget.toParentId;
  const existingChildIds: string[] = Array.isArray(nodes[parentId]?.children) ? [...nodes[parentId].children] : [];
  const previewChildIds = [...existingChildIds];
  previewChildIds.splice(Math.min(dropTarget.toIndex, previewChildIds.length), 0, PREVIEW_NODE_ID);

  const tempWorldBoxes = new Map(worldBoxes);
  tempWorldBoxes.set(PREVIEW_NODE_ID, previewRect);

  const previewGeom = buildParentGeom(rootId, parentId, previewChildIds, nodes, tempWorldBoxes, hGap);
  if (!previewGeom) return null;
  const currentGeom = existingChildIds.length
    ? buildParentGeom(rootId, parentId, existingChildIds, nodes, worldBoxes, hGap)
    : null;

  const previewBranchPathData = previewGeom.childBranchPathData.get(PREVIEW_NODE_ID) ?? null;
  const previewMeta = previewGeom.branchMeta.get(PREVIEW_NODE_ID);
  if (!previewBranchPathData || !previewMeta) return null;

  let previewPathData = previewBranchPathData;
  if (previewGeom.trunkPathData && !currentGeom?.trunkPathData) {
    previewPathData = `${previewGeom.trunkPathData} ${previewBranchPathData}`;
  } else if (previewGeom.trunkBottom && currentGeom?.trunkBottom && previewGeom.trunkBottom.y > currentGeom.trunkBottom.y) {
    previewPathData = `${createLinePathData(currentGeom.trunkBottom, previewGeom.trunkBottom)} ${previewBranchPathData}`;
  } else if (previewGeom.trunkTop && currentGeom?.trunkTop && previewGeom.trunkTop.y < currentGeom.trunkTop.y) {
    previewPathData = `${createLinePathData(currentGeom.trunkTop, previewGeom.trunkTop)} ${previewBranchPathData}`;
  }
  const previewPath = new Path2D(previewPathData);

  return {
    previewRect,
    previewPath,
    previewPathData,
    startPoint: previewMeta.startPoint,
    endPoint: previewMeta.endPoint,
    pathStartPoint: previewMeta.pathStartPoint,
    edgesConfig: {
      trunkStub: getTrunkStub(hGap),
      roundRadius: getRoundRadius(getTrunkStub(hGap)),
      childInset: CHILD_INSET,
      minStraight: MIN_BRANCH_STRAIGHT,
      minEffectiveRadius: MIN_EFFECTIVE_RADIUS,
    },
  };
}
