import { collectSubtreeNodeIds } from '@/mind/core/commands/subtreeSnapshot';
import type { Camera } from './actions/useCamera';
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
  visible: boolean;
  hovered: boolean;
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
  const children = getActiveMind(doc)?.nodes?.[nodeId]?.children;
  return Array.isArray(children) ? children : [];
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
  hoverNodeId: string | null,
  hoverTagNodeId: string | null,
  selectedIds: ReadonlySet<string>,
  stickyNodeId: string | null
) {
  const result = new Map<string, CollapseTagInfo>();
  const nodes = getActiveMind(doc)?.nodes ?? {};
  const descendantCountCache = new Map<string, number>();

  function getDescendantCount(nodeId: string) {
    const cached = descendantCountCache.get(nodeId);
    if (cached != null) return cached;
    const count = Math.max(0, collectSubtreeNodeIds(nodes, nodeId).length - 1);
    descendantCountCache.set(nodeId, count);
    return count;
  }

  for (const [nodeId, rect] of worldBoxes.entries()) {
    const children = getNodeChildren(doc, nodeId);
    if (!children.length) continue;
    const bodyRect = getNodeBodyWorldRect(nodes[nodeId], rect);
    const isCollapsed = !!nodes[nodeId]?.collapsed;
    const descendantCount = getDescendantCount(nodeId);
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
      visible:
        isCollapsed ||
        selectedIds.has(nodeId) ||
        hoverNodeId === nodeId ||
        hoverTagNodeId === nodeId ||
        stickyNodeId === nodeId,
      hovered: hoverTagNodeId === nodeId,
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
  screenX: number,
  screenY: number
) {
  for (const [nodeId, tag] of collapseTags.entries()) {
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
