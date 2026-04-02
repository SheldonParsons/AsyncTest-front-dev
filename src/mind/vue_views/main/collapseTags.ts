import type { Camera } from './actions/useCamera';
import { getStructuralChildIds } from '@/mind/core/summaryMeta';
import { getActiveMind } from './actions/useDocUtils';
import type { WorldBoxes } from './geom/worldBoxes';
import { getNodeBodyWorldRect } from './nodeMarkers';

export type CollapseTagInfo = {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  label: string;
  isCollapsed: boolean;
  descendantCount: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  connectorFromX: number;
  connectorToX: number;
  connectorY: number;
};

const COLLAPSE_TAG_OFFSET_X_PX = 6;
const COLLAPSE_TAG_HEIGHT_PX = 20;
const COLLAPSE_TAG_MIN_WIDTH_PX = 20;
const COLLAPSE_TAG_TWO_DIGIT_WIDTH_PX = 24;
const COLLAPSE_TAG_HORIZONTAL_PADDING_PX = 8;
const COLLAPSE_TAG_CHAR_WIDTH_PX = 7;
const COLLAPSE_TAG_HIT_SLOP_PX = 8;

function getNodeChildren(doc: any, nodeId: string) {
  return getStructuralChildIds(getActiveMind(doc)?.nodes?.[nodeId]);
}

export function buildDescendantCountMap(doc: any) {
  const nodes = getActiveMind(doc)?.nodes ?? {};
  const result = new Map<string, number>();

  function count(nodeId: string) {
    const cached = result.get(nodeId);
    if (cached != null) return cached;
    const children = getStructuralChildIds(nodes[nodeId]);
    let total = children.length;
    for (const childId of children) {
      total += count(childId);
    }
    result.set(nodeId, total);
    return total;
  }

  for (const nodeId of Object.keys(nodes)) count(nodeId);
  return result;
}

function measureCollapseTagWidth(label: string) {
  if (label.length <= 1) return COLLAPSE_TAG_MIN_WIDTH_PX;
  if (label.length === 2) return COLLAPSE_TAG_TWO_DIGIT_WIDTH_PX;
  return Math.max(
    COLLAPSE_TAG_TWO_DIGIT_WIDTH_PX,
    COLLAPSE_TAG_HORIZONTAL_PADDING_PX * 2 + label.length * COLLAPSE_TAG_CHAR_WIDTH_PX
  );
}

export function buildCollapseTagScreenMap(
  doc: any,
  worldBoxes: WorldBoxes,
  camera: Camera,
  visibleNodeIds: Iterable<string>,
  descendantCounts?: ReadonlyMap<string, number>
) {
  const result = new Map<string, CollapseTagInfo>();
  const nodes = getActiveMind(doc)?.nodes ?? {};
  for (const nodeId of visibleNodeIds) {
    const rect = worldBoxes.get(nodeId);
    if (!rect) continue;
    const children = getNodeChildren(doc, nodeId);
    if (!children.length) continue;
    const bodyRect = getNodeBodyWorldRect(nodes[nodeId], rect);
    const isCollapsed = !!nodes[nodeId]?.collapsed;
    const descendantCount = descendantCounts?.get(nodeId) ?? children.length;
    const label = isCollapsed ? String(descendantCount) : '-';
    const width = measureCollapseTagWidth(label);
    const height = COLLAPSE_TAG_HEIGHT_PX;
    const x = bodyRect.x2 + COLLAPSE_TAG_OFFSET_X_PX;
    const y = (bodyRect.y1 + bodyRect.y2) / 2 - height / 2;
    const screenX = x * camera.scale + camera.tx;
    const screenY = y * camera.scale + camera.ty;
    const screenWidth = width * camera.scale;
    const screenHeight = height * camera.scale;

    result.set(nodeId, {
      nodeId,
      x,
      y,
      width,
      height,
      radius: height / 2,
      label,
      isCollapsed,
      descendantCount,
      screenX,
      screenY,
      screenWidth,
      screenHeight,
      connectorFromX: bodyRect.x2,
      connectorToX: x,
      connectorY: (bodyRect.y1 + bodyRect.y2) / 2,
    });
  }

  return result;
}

export function hitTestCollapseTag(
  collapseTags: Map<string, CollapseTagInfo>,
  activeNodeIds: ReadonlySet<string>,
  screenX: number,
  screenY: number,
  options?: { includeHidden?: boolean }
) {
  for (const [nodeId, tag] of collapseTags.entries()) {
    const visible = tag.isCollapsed || activeNodeIds.has(nodeId) || !!options?.includeHidden;
    if (!visible) continue;
    if (
      screenX >= tag.screenX - COLLAPSE_TAG_HIT_SLOP_PX &&
      screenX <= tag.screenX + tag.screenWidth + COLLAPSE_TAG_HIT_SLOP_PX &&
      screenY >= tag.screenY - COLLAPSE_TAG_HIT_SLOP_PX &&
      screenY <= tag.screenY + tag.screenHeight + COLLAPSE_TAG_HIT_SLOP_PX
    ) {
      return nodeId;
    }
  }
  return null;
}
