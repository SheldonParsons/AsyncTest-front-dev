import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { InternalClipboardState } from '@/mind/core/clipboard';
import { collectSubtreeNodeIds } from '@/mind/core/commands/subtreeSnapshot';
import { formatNodeSecrecyLabel, getNodePlainText, getNodeSecrecy } from '@/mind/core/nodeContent';
import type { DragDropState } from '@/mind/core/drag/types';
import { getNodeSummaries, getRegularChildIds, getNodeSummaryLaneMap } from '@/mind/core/summaryMeta';
import { buildPreviewGeometry } from '@/mind/core/dragDrop/previewGeometry';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { RoughGenerator } from 'roughjs/bin/generator';
import { getActiveMind } from './useDocUtils';
import type { Camera } from './useCamera';
import type { BranchMeta, ParentEdgeCacheStats, ParentEdgeGeom } from './useEdges';
import { DEBUG_CANVAS_OVERLAY, DEBUG_SPATIAL, DEBUG_SPATIAL_LOG, DEBUG_SPATIAL_SHOW_CELL_COUNTS, ROUGH_STYLE } from '../constants';
import { formatCamera, formatWorldRect } from '../diagnostics';
import { getMindNodeDefaultVisualStyle } from '../nodeStyles';
import type { CollapseTagInfo } from '../collapseTags';
import {
  getNodeBodyWorldRect,
  NODE_MARKER_ICON_SIZE_PX,
  NODE_MARKER_STEP_PX,
  NODE_MARKER_HOVER_SCALE,
  resolveNodeMarkers,
} from '../nodeMarkers';
import {
  ensureRoughThemeDebugApi,
  getCurrentRoughTheme,
  setRoughThemePreset,
  setupRoughThemeBrowserSync,
  subscribeRoughThemeChanges,
  type ResolvedRoughTheme,
  type RoughPresetName,
} from '../../../rendering/roughTheme';
import {
  getWorldViewportRect,
  rectContains,
  rectIntersects,
  worldToScreen,
  type WorldRect,
} from '../geom/rect';
import type { WorldBoxes } from '../geom/worldBoxes';
import type { UniformGridSpatialIndex } from '../grid/spatialIndex';
import type { ScreenRect } from './useMarquee';
import {
  getNodeTextStyle,
  measureTextVerticalMetrics,
  NODE_DEFAULT_FONT_FAMILY,
  NODE_DEFAULT_FONT_SIZE,
  NODE_FONT,
  NODE_IMAGE_TEXT_GAP,
  NODE_LINE_HEIGHT,
  NODE_TEXT_INSET_X,
  NODE_TEXT_INSET_Y,
  measureNodeVisualLayout,
  measureNodeTextLayout,
} from '../textLayout';
import {
  getImageHandleWorldRects,
  IMAGE_OUTLINE_GAP_PX,
  IMAGE_OUTLINE_RADIUS_PX,
  inflateImageWorldRect,
  getNodeImageWorldRect,
  type ImageInteractionState,
  type ImageWorldRect,
} from '../imageInteraction';
import { type NodeWidthInteractionState } from '../nodeWidthInteraction';
import { getInlineFont } from '@/mind/core/richText';
import { buildRelationDraftPreview, type MindRelationGeom } from './useRelations';
const DEBUG_VIEWPORT = '#f97316';
const DEBUG_GRID = 'rgba(148, 163, 184, 0.28)';
const DEBUG_WORLD_BOX = 'rgba(59, 130, 246, 0.92)';
const DEBUG_FALSE_POSITIVE = 'rgba(147, 51, 234, 0.9)';
const DEBUG_HOVER = 'rgba(16, 185, 129, 0.95)';
const DEBUG_MARQUEE_WORLD = 'rgba(96, 165, 250, 0.72)';
const DEFAULT_TEXT = '#1f2937';
const DEFAULT_SELECTED_STROKE = 'rgba(37, 99, 235, 0.92)';
const DEFAULT_HOVER_STROKE = 'rgba(96, 165, 250, 0.82)';
const DEFAULT_MARQUEE_STROKE = 'rgba(96, 165, 250, 0.78)';
const DEFAULT_MARQUEE_FILL = 'rgba(191, 219, 254, 0.12)';
const ROUGH_VERSION = '4.6.6';
const ROUGH_VISIBLE_SHAPE_LIMIT = 800;
const ROUGH_SEAM_OVERLAP_DEFAULT_PX = 6;
const ROUGH_SEAM_CAP_LINEWIDTH_FACTOR = 1.1;
const NODE_CORNER_RADIUS = 10;
const HOVER_OUTLINE_OFFSET_PX = 3;
const SELECTED_OUTLINE_OFFSET_PX = 4;
const COLLAPSE_TAG_FILL = '#D02F48';
const COLLAPSE_TAG_FILL_HOVER = '#DB5A6E';
const COLLAPSE_TAG_STROKE = '#111111';
const COLLAPSE_TAG_TEXT = '#FFFFFF';
const COLLAPSE_TAG_FONT = '700 11px "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';
const ROOT_SECRECY_TEXT = '#ffffff';
const ROOT_SECRECY_STROKE = '#111111';
const ROOT_SECRECY_FILL = '#D02F48';
const SUMMARY_BRACE_STROKE = '#111111';
const SUMMARY_BRACE_TEXT = '#111111';
const BULK_SELECTION_OVERLAY_LIMIT = 512;
const TEXT_DECORATION_OFFSET_MAP = [
  { fontSize: 12, underlineFromBaseline: 10, strikeFromContentTop: 2.5 },
  { fontSize: 14, underlineFromBaseline: 11.7, strikeFromContentTop: 3.6 },
  { fontSize: 16, underlineFromBaseline: 13.3, strikeFromContentTop: 5.0 },
  { fontSize: 18, underlineFromBaseline: 15, strikeFromContentTop: 5.6 },
  { fontSize: 20, underlineFromBaseline: 16.7, strikeFromContentTop: 6.3 },
  { fontSize: 24, underlineFromBaseline: 20, strikeFromContentTop: 7.6 },
  { fontSize: 28, underlineFromBaseline: 23.3, strikeFromContentTop: 8.8 },
  { fontSize: 32, underlineFromBaseline: 26.7, strikeFromContentTop: 10.1 },
  { fontSize: 36, underlineFromBaseline: 30, strikeFromContentTop: 11.3 },
  { fontSize: 48, underlineFromBaseline: 40, strikeFromContentTop: 15 },
] as const;

function resolveMappedDecorationOffsets(fontSize: number) {
  const safeFontSize = Math.max(1, fontSize);
  const points = TEXT_DECORATION_OFFSET_MAP;
  if (safeFontSize <= points[0].fontSize) {
    return {
      underlineFromBaseline: points[0].underlineFromBaseline,
      strikeFromContentTop: points[0].strikeFromContentTop,
    };
  }
  const last = points[points.length - 1];
  if (safeFontSize >= last.fontSize) {
    return {
      underlineFromBaseline: last.underlineFromBaseline,
      strikeFromContentTop: last.strikeFromContentTop,
    };
  }
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (safeFontSize < current.fontSize || safeFontSize > next.fontSize) continue;
    const ratio = (safeFontSize - current.fontSize) / (next.fontSize - current.fontSize);
    return {
      underlineFromBaseline:
        current.underlineFromBaseline + (next.underlineFromBaseline - current.underlineFromBaseline) * ratio,
      strikeFromContentTop:
        current.strikeFromContentTop + (next.strikeFromContentTop - current.strikeFromContentTop) * ratio,
    };
  }
  return {
    underlineFromBaseline: last.underlineFromBaseline,
    strikeFromContentTop: last.strikeFromContentTop,
  };
}

type RoughRuntime = {
  canvas: HTMLCanvasElement | null;
  rc: RoughCanvas | null;
  gen: RoughGenerator | null;
  logged: boolean;
  nodeDrawables: Map<string, Drawable>;
  edgeDrawables: Map<string, Drawable>;
  nodeHits: number;
  nodeMisses: number;
  edgeHits: number;
  edgeMisses: number;
  sampledNodeHits: number;
  sampledNodeMisses: number;
  sampledEdgeHits: number;
  sampledEdgeMisses: number;
  lastSampleAt: number;
};

type ImageRuntime = {
  loadedImages: Map<string, HTMLImageElement>;
  pendingSources: Set<string>;
};

type DrawStats = {
  worldViewportRect: WorldRect | null;
  cellRange: { cx1: number; cy1: number; cx2: number; cy2: number } | null;
  totalNodes: number;
  candidateCount: number;
  visibleCount: number;
  falsePositiveCount: number;
  parentsWithEdges: number;
  totalChildrenEdges: number;
  edgesDrawnParents: number;
  branchesDrawn: number;
  roundedBranchesCount: number;
  straightBranchesCount: number;
  degeneratedBranchesCount: number;
  minBranchLen: number;
  maxBranchLen: number;
  edgeCacheSize: number;
  edgeCacheBuildMs: number;
  trunkStubLabel: string;
  roundRadiusLabel: string;
  childInset: number;
  alignedStraightCount: number;
  upRoundedCount: number;
  downRoundedCount: number;
  alignedMultiCount: number;
  nonAlignedRoundedCount: number;
  nonAlignedDegeneratedCount: number;
  trunkShrinkAppliedCount: number;
  trunkOverhangDetectedCount: number;
  roughPresetName: RoughPresetName;
  roughness: number;
  bowing: number;
  strokeWidthPx: number;
  overlapPx: number;
  disableMultiStroke: boolean;
  roughRequested: boolean;
  roughEnabled: boolean;
  roughFallbackReason: string | null;
  roughNodeCacheSize: number;
  roughEdgeCacheSize: number;
  roughNodeCacheHits: number;
  roughNodeCacheMisses: number;
  roughEdgeCacheHits: number;
  roughEdgeCacheMisses: number;
  selectedCount: number;
  primarySelectedNodeId: string | null;
  clipboardHasData: boolean;
  clipboardType: string;
  clipboardItemCount: number;
  clipboardNodeCount: number;
  lastDeletedNodeId: string | null;
  lastPastedRootId: string | null;
  filteredOutDescendantsCount: number;
  rebuildCountInLastCommand: number;
  isDragging: boolean;
  dragRootsCount: number;
  dragRootId: string | null;
  dragRootTreeId: string | null;
  dropTargetType: string | null;
  dropToParentId: string | null;
  dropToIndex: number | null;
  dragInvalidReason: string | null;
  autoPanActive: boolean;
  autoPanVelocityLabel: string;
  historyCanUndo: boolean;
  historyCanRedo: boolean;
  historyUndoDepth: number;
  historyRedoDepth: number;
  historyLastCommandName: string | null;
  drawDurationMs: number;
  fps: number;
};

type VisibleEdgeGroup = {
  geom: ParentEdgeGeom;
  branchEntries: Array<{ childId: string; meta: BranchMeta }>;
};

function rectWidth(rect: WorldRect) {
  return rect.x2 - rect.x1;
}

function rectHeight(rect: WorldRect) {
  return rect.y2 - rect.y1;
}

function rectCenter(rect: WorldRect) {
  return {
    x: (rect.x1 + rect.x2) / 2,
    y: (rect.y1 + rect.y2) / 2,
  };
}

function getCanvasDevicePixelRatio(canvas: HTMLCanvasElement) {
  const cssWidth = Math.max(1, canvas.clientWidth || canvas.width || 1);
  return Math.max(1, canvas.width / cssWidth);
}

function applyScreenTransform(ctx: CanvasRenderingContext2D, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyWorldTransform(ctx: CanvasRenderingContext2D, cam: Camera, dpr: number) {
  ctx.setTransform(cam.scale * dpr, 0, 0, cam.scale * dpr, cam.tx * dpr, cam.ty * dpr);
}

function drawScreenRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + clampedRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, clampedRadius);
  ctx.arcTo(x + width, y + height, x, y + height, clampedRadius);
  ctx.arcTo(x, y + height, x, y, clampedRadius);
  ctx.arcTo(x, y, x + width, y, clampedRadius);
  ctx.closePath();
}

function drawCollapseTags(
  ctx: CanvasRenderingContext2D,
  collapseTags: Map<string, CollapseTagInfo>,
  activeNodeIds: ReadonlySet<string>,
  hoverTagNodeId: string | null,
  ghostNodeIds?: ReadonlySet<string> | null
) {
  ctx.font = COLLAPSE_TAG_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const tag of collapseTags.values()) {
    const visible = tag.isCollapsed || activeNodeIds.has(tag.nodeId);
    if (!visible) continue;
    const hovered = hoverTagNodeId === tag.nodeId;
    ctx.save();
    if (ghostNodeIds?.has(tag.nodeId)) ctx.globalAlpha *= 0.35;
    if (tag.isCollapsed) {
      ctx.strokeStyle = COLLAPSE_TAG_STROKE;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tag.connectorFromX, tag.connectorY);
      ctx.lineTo(tag.connectorToX, tag.connectorY);
      ctx.stroke();
    }
    drawScreenRoundedRect(ctx, tag.x, tag.y, tag.width, tag.height, tag.radius);
    ctx.fillStyle = hovered ? COLLAPSE_TAG_FILL_HOVER : COLLAPSE_TAG_FILL;
    ctx.fill();
    ctx.strokeStyle = COLLAPSE_TAG_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (tag.isCollapsed) {
      ctx.fillStyle = COLLAPSE_TAG_TEXT;
      ctx.fillText(tag.label, tag.x + tag.width / 2, tag.y + tag.height / 2 + 0.5);
      ctx.restore();
      continue;
    }

    const centerY = tag.y + tag.height / 2;
    const lineInset = 7;
    ctx.strokeStyle = COLLAPSE_TAG_TEXT;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tag.x + lineInset, centerY);
    ctx.lineTo(tag.x + tag.width - lineInset, centerY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNodeMarkers(
  ctx: CanvasRenderingContext2D,
  node: any,
  bodyRect: WorldRect,
  getLoadedImage: (src: string) => HTMLImageElement | null,
  hoveredIndex?: number
) {
  const markers = resolveNodeMarkers(node);
  if (!markers.length) return;

  const bodyH = bodyRect.y2 - bodyRect.y1;
  const startX = bodyRect.x1 + NODE_TEXT_INSET_X;
  const markerY = bodyRect.y1 + (bodyH - NODE_MARKER_ICON_SIZE_PX) / 2;
  const size = NODE_MARKER_ICON_SIZE_PX;
  const hoverIdx = hoveredIndex ?? -1;

  // Draw back-to-front: last marker first, earlier markers on top (drawn later).
  // Skip the hovered marker in this pass — it will be drawn last on top.
  for (let i = markers.length - 1; i >= 0; i--) {
    if (i === hoverIdx) continue;
    const image = getLoadedImage(markers[i].src);
    if (image) {
      const mx = startX + i * NODE_MARKER_STEP_PX;
      ctx.drawImage(image, mx, markerY, size, size);
    }
  }

  // Draw hovered marker on top, slightly enlarged
  if (hoverIdx >= 0 && hoverIdx < markers.length) {
    const image = getLoadedImage(markers[hoverIdx].src);
    if (image) {
      const mx = startX + hoverIdx * NODE_MARKER_STEP_PX;
      const hoverSize = size * NODE_MARKER_HOVER_SCALE;
      const offset = (hoverSize - size) / 2;
      ctx.drawImage(image, mx - offset, markerY - offset, hoverSize, hoverSize);
    }
  }
}

function drawHoveredNodeMarker(
  ctx: CanvasRenderingContext2D,
  node: any,
  bodyRect: WorldRect,
  getLoadedImage: (src: string) => HTMLImageElement | null,
  hoveredIndex?: number
) {
  const markers = resolveNodeMarkers(node);
  const hoverIdx = hoveredIndex ?? -1;
  if (hoverIdx < 0 || hoverIdx >= markers.length) return;

  const image = getLoadedImage(markers[hoverIdx].src);
  if (!image) return;

  const bodyH = bodyRect.y2 - bodyRect.y1;
  const startX = bodyRect.x1 + NODE_TEXT_INSET_X;
  const markerY = bodyRect.y1 + (bodyH - NODE_MARKER_ICON_SIZE_PX) / 2;
  const mx = startX + hoverIdx * NODE_MARKER_STEP_PX;
  const hoverSize = NODE_MARKER_ICON_SIZE_PX * NODE_MARKER_HOVER_SCALE;
  const offset = (hoverSize - NODE_MARKER_ICON_SIZE_PX) / 2;
  ctx.drawImage(image, mx - offset, markerY - offset, hoverSize, hoverSize);
}

function drawRootSecrecyBadge(ctx: CanvasRenderingContext2D, bodyRect: WorldRect, label: string) {
  const bodyWidth = rectWidth(bodyRect);
  const availableWidth = Math.max(26, bodyWidth - 4);
  const badgeHeight = 15;
  const radius = 4;
  const badgeY = bodyRect.y1 - badgeHeight - 4;
  const fontCandidates = [10, 9, 8];
  let fontSize = fontCandidates[0];
  let padX = 5;
  let textWidth = 0;

  ctx.save();
  for (const candidate of fontCandidates) {
    const candidatePadX = candidate <= 8 ? 4 : 5;
    ctx.font = `600 ${candidate}px "Source Han Serif SC", "STSong", "Songti SC", serif`;
    const candidateWidth = ctx.measureText(label).width + candidatePadX * 2;
    fontSize = candidate;
    padX = candidatePadX;
    textWidth = candidateWidth - candidatePadX * 2;
    if (candidateWidth <= availableWidth) break;
  }

  const badgeWidth = Math.min(availableWidth, textWidth + padX * 2);
  const badgeX = bodyRect.x1 + Math.max(2, (bodyWidth - badgeWidth) / 2);

  drawRoundedRectShape(
    ctx,
    {
      x1: badgeX,
      y1: badgeY,
      x2: badgeX + badgeWidth,
      y2: badgeY + badgeHeight,
    },
    radius,
    ROOT_SECRECY_FILL,
    ROOT_SECRECY_STROKE,
    1
  );

  ctx.font = `600 ${fontSize}px "Source Han Serif SC", "STSong", "Songti SC", serif`;
  ctx.fillStyle = ROOT_SECRECY_TEXT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const textY = badgeY + badgeHeight / 2 + 0.15;
  ctx.fillText(label, badgeX + badgeWidth / 2, textY);
  ctx.restore();
}

function drawRootSecrecyBadgeIfNeeded(
  ctx: CanvasRenderingContext2D,
  rootNodeIds: Set<string>,
  id: string,
  node: any,
  bodyRect: WorldRect
) {
  if (!rootNodeIds.has(id)) return;
  const secrecyLabel = formatNodeSecrecyLabel(getNodeSecrecy(node));
  if (!secrecyLabel) return;
  drawRootSecrecyBadge(ctx, bodyRect, secrecyLabel);
}

function snapToDevicePixel(value: number, dpr: number) {
  return Math.round(value * dpr) / dpr;
}

function snapWorldToDevicePixel(value: number, scale: number, translate: number, dpr: number) {
  const screenValue = value * scale + translate;
  return (snapToDevicePixel(screenValue, dpr) - translate) / Math.max(scale, 0.0001);
}

function drawRectOutline(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  strokeStyle: string,
  lineWidth: number
) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(rect.x1, rect.y1, rectWidth(rect), rectHeight(rect));
}

function drawImageRectOutline(
  ctx: CanvasRenderingContext2D,
  rect: ImageWorldRect,
  radius: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
) {
  drawRoundedRectShape(
    ctx,
    { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height },
    radius,
    fillStyle,
    strokeStyle,
    lineWidth
  );
}

function drawImageHandles(
  ctx: CanvasRenderingContext2D,
  rect: ImageWorldRect,
  cam: Camera,
  strokeStyle: string
) {
  const handleRects = getImageHandleWorldRects(rect, cam.scale);
  ctx.fillStyle = strokeStyle;
  (Object.values(handleRects) as ImageWorldRect[]).forEach((handleRect) => {
    ctx.fillRect(handleRect.x, handleRect.y, handleRect.width, handleRect.height);
  });
}

function getNodeCornerRadius(rect: WorldRect) {
  return Math.min(NODE_CORNER_RADIUS, rectWidth(rect) / 2, rectHeight(rect) / 2);
}

function expandRect(rect: WorldRect, padding: number): WorldRect {
  return {
    x1: rect.x1 - padding,
    y1: rect.y1 - padding,
    x2: rect.x2 + padding,
    y2: rect.y2 + padding,
  };
}

function mergeRects(a: WorldRect, b: WorldRect): WorldRect {
  return {
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
    x2: Math.max(a.x2, b.x2),
    y2: Math.max(a.y2, b.y2),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRange(value: number, min: number, max: number) {
  if (max <= min) return 1;
  return clamp((value - min) / (max - min), 0, 1);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function getStrokeScreenWidthFactor(scale: number) {
  if (scale <= 0.35) return 0.38;
  if (scale <= 0.6) return lerp(0.38, 0.58, normalizeRange(scale, 0.35, 0.6));
  if (scale <= 1.0) return lerp(0.58, 1.0, normalizeRange(scale, 0.6, 1.0));
  if (scale <= 2.0) return lerp(1.0, 1.18, normalizeRange(scale, 1.0, 2.0));
  return 1.18;
}

function getStrokeScreenWidthPx(scale: number, baseStrokePx: number) {
  return baseStrokePx * getStrokeScreenWidthFactor(scale);
}

function getStrokeAlphaFactor(scale: number) {
  if (scale <= 0.35) return 0.52;
  if (scale <= 0.6) return lerp(0.52, 0.72, normalizeRange(scale, 0.35, 0.6));
  if (scale <= 1.0) return lerp(0.72, 1.0, normalizeRange(scale, 0.6, 1.0));
  return 1;
}

function multiplyColorAlpha(color: string, alphaFactor: number) {
  const resolvedFactor = clamp(alphaFactor, 0, 1);
  const normalized = color.trim();

  const rgbaMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const [r = '0', g = '0', b = '0', a = '1'] = rgbaMatch[1].split(',').map((part) => part.trim());
    const nextAlpha = clamp(Number.parseFloat(a) * resolvedFactor, 0, 1);
    return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
  }

  const hex = normalized.replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const expanded = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    if ([r, g, b].every((value) => Number.isFinite(value))) {
      return `rgba(${r}, ${g}, ${b}, ${resolvedFactor})`;
    }
  }

  return normalized;
}

function createRoundedRectPathData(rect: WorldRect, radius: number) {
  const r = Math.max(0, radius);
  if (r <= 0) {
    return `M ${rect.x1} ${rect.y1} L ${rect.x2} ${rect.y1} L ${rect.x2} ${rect.y2} L ${rect.x1} ${rect.y2} Z`;
  }
  return [
    `M ${rect.x1 + r} ${rect.y1}`,
    `L ${rect.x2 - r} ${rect.y1}`,
    `Q ${rect.x2} ${rect.y1} ${rect.x2} ${rect.y1 + r}`,
    `L ${rect.x2} ${rect.y2 - r}`,
    `Q ${rect.x2} ${rect.y2} ${rect.x2 - r} ${rect.y2}`,
    `L ${rect.x1 + r} ${rect.y2}`,
    `Q ${rect.x1} ${rect.y2} ${rect.x1} ${rect.y2 - r}`,
    `L ${rect.x1} ${rect.y1 + r}`,
    `Q ${rect.x1} ${rect.y1} ${rect.x1 + r} ${rect.y1}`,
    'Z',
  ].join(' ');
}

function drawRoundedRectShape(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  radius: number,
  fillStyle: string | CanvasGradient | CanvasPattern,
  strokeStyle: string,
  lineWidth: number
) {
  const r = Math.max(0, radius);
  ctx.save();
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(rect.x1, rect.y1, rectWidth(rect), rectHeight(rect));
  } else {
    ctx.moveTo(rect.x1 + r, rect.y1);
    ctx.lineTo(rect.x2 - r, rect.y1);
    ctx.quadraticCurveTo(rect.x2, rect.y1, rect.x2, rect.y1 + r);
    ctx.lineTo(rect.x2, rect.y2 - r);
    ctx.quadraticCurveTo(rect.x2, rect.y2, rect.x2 - r, rect.y2);
    ctx.lineTo(rect.x1 + r, rect.y2);
    ctx.quadraticCurveTo(rect.x1, rect.y2, rect.x1, rect.y2 - r);
    ctx.lineTo(rect.x1, rect.y1 + r);
    ctx.quadraticCurveTo(rect.x1, rect.y1, rect.x1 + r, rect.y1);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoundedRectOutline(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  radius: number,
  strokeStyle: string,
  lineWidth: number
) {
  drawRoundedRectShape(ctx, rect, radius, 'rgba(0,0,0,0)', strokeStyle, lineWidth);
}

function drawRoundedRectDashedOutline(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  radius: number,
  strokeStyle: string,
  lineWidth: number,
  dash: number[]
) {
  ctx.save();
  ctx.setLineDash(dash);
  drawRoundedRectShape(ctx, rect, radius, 'rgba(0,0,0,0)', strokeStyle, lineWidth);
  ctx.restore();
}

function drawMarqueeOverlay(
  ctx: CanvasRenderingContext2D,
  rectScreen: ScreenRect | null,
  dpr: number,
  strokeStyle = DEFAULT_MARQUEE_STROKE,
  fillStyle = DEFAULT_MARQUEE_FILL
) {
  if (!rectScreen) return;

  ctx.save();
  applyScreenTransform(ctx, dpr);
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.fillRect(rectScreen.x1, rectScreen.y1, rectScreen.x2 - rectScreen.x1, rectScreen.y2 - rectScreen.y1);
  ctx.strokeRect(rectScreen.x1, rectScreen.y1, rectScreen.x2 - rectScreen.x1, rectScreen.y2 - rectScreen.y1);
  ctx.restore();
}

function drawEdgeDebugOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  visibleEdgeGroups: VisibleEdgeGroup[],
  roughEnabled: boolean,
  overlapWorld: number
) {
  if (!DEBUG_CANVAS_OVERLAY) return;
  void ctx;
  void cam;
  void visibleEdgeGroups;
  void roughEnabled;
  void overlapWorld;
}

function drawDebugHud(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  spatialIndex: UniformGridSpatialIndex,
  stats: DrawStats,
  dpr: number
) {
  if (!DEBUG_CANVAS_OVERLAY) return;

  const rows = [
    'DEBUG ON',
    `camera  scale=${formatCamera(cam).scale} tx=${formatCamera(cam).tx} ty=${formatCamera(cam).ty}`,
    `viewport ${stats.worldViewportRect ? `${formatWorldRect(stats.worldViewportRect)?.x1}, ${formatWorldRect(stats.worldViewportRect)?.y1}, ${formatWorldRect(stats.worldViewportRect)?.x2}, ${formatWorldRect(stats.worldViewportRect)?.y2}` : 'n/a'}`,
    `grid     cell=${spatialIndex.cellSize} range=${stats.cellRange ? `${stats.cellRange.cx1}..${stats.cellRange.cx2}, ${stats.cellRange.cy1}..${stats.cellRange.cy2}` : 'n/a'}`,
    `counts   total=${stats.totalNodes} candidates=${stats.candidateCount} visible=${stats.visibleCount} falsePositive=${stats.falsePositiveCount}`,
    `select   count=${stats.selectedCount} primary=${stats.primarySelectedNodeId ?? 'n/a'} filtered=${stats.filteredOutDescendantsCount}`,
    `drag     active=${stats.isDragging} roots=${stats.dragRootsCount} root=${stats.dragRootId ?? 'n/a'} tree=${stats.dragRootTreeId ?? 'n/a'}`,
    `drop     type=${stats.dropTargetType ?? 'none'} parent=${stats.dropToParentId ?? 'n/a'} index=${stats.dropToIndex ?? 'n/a'} invalid=${stats.dragInvalidReason ?? 'n/a'}`,
    `autopan  active=${stats.autoPanActive} velocity=${stats.autoPanVelocityLabel}`,
    `edges    parents=${stats.parentsWithEdges} children=${stats.totalChildrenEdges} drawnParents=${stats.edgesDrawnParents} branches=${stats.branchesDrawn}`,
    `rounded  count=${stats.roundedBranchesCount} straight=${stats.straightBranchesCount} degenerated=${stats.degeneratedBranchesCount}`,
    `aligned  count=${stats.alignedStraightCount} multi=${stats.alignedMultiCount} up=${stats.upRoundedCount} down=${stats.downRoundedCount}`,
    `curved   rounded=${stats.nonAlignedRoundedCount} degenerated=${stats.nonAlignedDegeneratedCount}`,
    `trunk    shrink=${stats.trunkShrinkAppliedCount} overhang=${stats.trunkOverhangDetectedCount}`,
    `branch   len=${stats.minBranchLen.toFixed(1)}..${stats.maxBranchLen.toFixed(1)} stub=${stats.trunkStubLabel} r=${stats.roundRadiusLabel} inset=${stats.childInset}`,
    `cache    size=${stats.edgeCacheSize} build=${stats.edgeCacheBuildMs.toFixed(2)}ms`,
    `preset   ${stats.roughPresetName} roughness=${stats.roughness.toFixed(2)} bowing=${stats.bowing.toFixed(2)} strokePx=${stats.strokeWidthPx.toFixed(2)} overlapPx=${stats.overlapPx.toFixed(1)} dms=${stats.disableMultiStroke}`,
    `rough    requested=${stats.roughRequested} enabled=${stats.roughEnabled} reason=${stats.roughFallbackReason ?? 'n/a'}`,
    `roughCache nodes=${stats.roughNodeCacheSize} edges=${stats.roughEdgeCacheSize} hit=${stats.roughNodeCacheHits}/${stats.roughEdgeCacheHits} miss=${stats.roughNodeCacheMisses}/${stats.roughEdgeCacheMisses}`,
    `clip     hasData=${stats.clipboardHasData} type=${stats.clipboardType} items=${stats.clipboardItemCount} nodes=${stats.clipboardNodeCount}`,
    `batch    lastDel=${stats.lastDeletedNodeId ?? 'n/a'} lastPaste=${stats.lastPastedRootId ?? 'n/a'} rebuilds=${stats.rebuildCountInLastCommand}`,
    `history  undo=${stats.historyCanUndo}(${stats.historyUndoDepth}) redo=${stats.historyCanRedo}(${stats.historyRedoDepth}) last=${stats.historyLastCommandName ?? 'n/a'}`,
    `draw     ${stats.drawDurationMs.toFixed(2)}ms  fps=${stats.fps.toFixed(1)}`,
  ];

  ctx.save();
  applyScreenTransform(ctx, dpr);
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';

  const padding = 10;
  const lineHeight = 16;
  const width = rows.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0) + padding * 2;
  const height = rows.length * lineHeight + padding * 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.lineWidth = 1;
  ctx.fillRect(12, 12, width, height);
  ctx.strokeRect(12, 12, width, height);

  rows.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? '#dc2626' : '#0f172a';
    ctx.fillText(line, 12 + padding, 12 + padding + index * lineHeight);
  });
  ctx.restore();
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function formatRectSignature(rect: WorldRect) {
  return `${rect.x1.toFixed(2)}:${rect.y1.toFixed(2)}:${rect.x2.toFixed(2)}:${rect.y2.toFixed(2)}`;
}

function syncRoughRuntime(runtime: RoughRuntime, canvas: HTMLCanvasElement) {
  if (runtime.canvas === canvas && runtime.rc && runtime.gen) return;
  runtime.canvas = canvas;
  runtime.rc = rough.canvas(canvas);
  runtime.gen = runtime.rc.generator;
  if (!runtime.logged) {
    runtime.logged = true;
    console.debug('[mind-rough]', {
      version: `roughjs@${ROUGH_VERSION}`,
      api: 'rough.canvas(canvas) + generator.rectangle/path + rc.draw(drawable)',
    });
  }
}

function sampleRoughCacheStats(runtime: RoughRuntime, now: number) {
  if (now - runtime.lastSampleAt < 1000) return;
  runtime.sampledNodeHits = runtime.nodeHits;
  runtime.sampledNodeMisses = runtime.nodeMisses;
  runtime.sampledEdgeHits = runtime.edgeHits;
  runtime.sampledEdgeMisses = runtime.edgeMisses;
  runtime.nodeHits = 0;
  runtime.nodeMisses = 0;
  runtime.edgeHits = 0;
  runtime.edgeMisses = 0;
  runtime.lastSampleAt = now;
}

function getOrCreateNodeDrawable(
  runtime: RoughRuntime,
  gen: RoughGenerator,
  style: ResolvedRoughTheme,
  nodeId: string,
  rect: WorldRect,
  styleKey: string,
  optionOverrides?: Partial<ResolvedRoughTheme['nodeOptions']>
) {
  const radius = getNodeCornerRadius(rect);
  const pathData = createRoundedRectPathData(rect, radius);
  const cacheKey = `${nodeId}|style:${styleKey}|box:${formatRectSignature(rect)}|r:${radius.toFixed(2)}|${style.themeSignature}|node-rough-v5`;
  const cached = runtime.nodeDrawables.get(cacheKey);
  if (cached) {
    runtime.nodeHits += 1;
    return cached;
  }
  runtime.nodeMisses += 1;
  const drawable = gen.path(pathData, {
    ...style.nodeOptions,
    ...optionOverrides,
    seed: stableHash(`node:${nodeId}`),
  });
  runtime.nodeDrawables.set(cacheKey, drawable);
  return drawable;
}

function getOrCreateEdgeDrawable(
  runtime: RoughRuntime,
  gen: RoughGenerator,
  style: ResolvedRoughTheme,
  edgeKey: string,
  pathData: string
) {
  const cacheKey = `${edgeKey}|style:branch|path:${pathData}|${style.themeSignature}|edge-rough-v3`;
  const cached = runtime.edgeDrawables.get(cacheKey);
  if (cached) {
    runtime.edgeHits += 1;
    return cached;
  }
  runtime.edgeMisses += 1;
  const drawable = gen.path(pathData, {
    ...style.branchOptions,
    seed: stableHash(`edge:${edgeKey}`),
  });
  runtime.edgeDrawables.set(cacheKey, drawable);
  return drawable;
}

function drawNativeSegment(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number } | null,
  to: { x: number; y: number } | null,
  strokeStyle: string,
  lineWidth: number
) {
  if (!from || !to) return;
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawRoundedSeamCap(
  ctx: CanvasRenderingContext2D,
  meta: BranchMeta,
  strokeStyle: string,
  lineWidth: number,
  overlapWorld: number
) {
  if (!meta.rounded || overlapWorld <= 0) return;
  const seamX = meta.startPoint.x + meta.effectiveRadius;
  const seamStartX = Math.max(meta.startPoint.x, seamX - overlapWorld * 0.25);
  const seamEndX = Math.min(meta.endPoint.x, seamX + overlapWorld);
  if (seamEndX <= seamStartX) return;
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth * ROUGH_SEAM_CAP_LINEWIDTH_FACTOR;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(seamStartX, meta.startPoint.y);
  ctx.lineTo(seamEndX, meta.startPoint.y);
  ctx.stroke();
  ctx.restore();
}

function drawSpatialDebug(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  canvasW: number,
  canvasH: number,
  dpr: number,
  worldViewportRect: WorldRect,
  spatialIndex: UniformGridSpatialIndex,
  worldBoxes: WorldBoxes,
  visibleIds: string[],
  falsePositiveIds: string[],
  hoverNodeId: string | null,
  selectedIds: Set<string>,
  marqueeWorldRect: WorldRect | null
) {
  const cellRange = spatialIndex.getCellRange(worldViewportRect);

  ctx.save();
  applyWorldTransform(ctx, cam, dpr);

  const lineWidth = 1 / cam.scale;
  ctx.strokeStyle = DEBUG_GRID;
  ctx.lineWidth = lineWidth;

  for (let cx = cellRange.cx1; cx <= cellRange.cx2 + 1; cx += 1) {
    const x = cx * spatialIndex.cellSize;
    ctx.beginPath();
    ctx.moveTo(x, worldViewportRect.y1);
    ctx.lineTo(x, worldViewportRect.y2);
    ctx.stroke();
  }

  for (let cy = cellRange.cy1; cy <= cellRange.cy2 + 1; cy += 1) {
    const y = cy * spatialIndex.cellSize;
    ctx.beginPath();
    ctx.moveTo(worldViewportRect.x1, y);
    ctx.lineTo(worldViewportRect.x2, y);
    ctx.stroke();
  }

  drawRectOutline(ctx, worldViewportRect, DEBUG_VIEWPORT, 2 / cam.scale);

  if (marqueeWorldRect) {
    drawRectOutline(ctx, marqueeWorldRect, DEBUG_MARQUEE_WORLD, 2 / cam.scale);
  }

  void worldBoxes;
  void visibleIds;
  void falsePositiveIds;
  void hoverNodeId;
  void selectedIds;

  ctx.restore();

  if (!DEBUG_SPATIAL_SHOW_CELL_COUNTS) return;

  ctx.save();
  applyScreenTransform(ctx, dpr);
  ctx.fillStyle = 'rgba(51, 65, 85, 0.75)';
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let cy = cellRange.cy1; cy <= cellRange.cy2; cy += 1) {
    for (let cx = cellRange.cx1; cx <= cellRange.cx2; cx += 1) {
      const count = spatialIndex.getBucketCount(cx, cy);
      if (count <= 0) continue;
      const center = worldToScreen(
        cam,
        cx * spatialIndex.cellSize + spatialIndex.cellSize / 2,
        cy * spatialIndex.cellSize + spatialIndex.cellSize / 2
      );
      if (center.x < 0 || center.x > canvasW || center.y < 0 || center.y > canvasH) continue;
      ctx.fillText(String(count), center.x, center.y);
    }
  }

  ctx.restore();
}

export function useDraw(
  props: { doc?: any },
  canvasRef: Ref<HTMLCanvasElement | null>,
  camera: Ref<Camera>,
  worldBoxes: Ref<WorldBoxes>,
  collapseTags: Ref<Map<string, CollapseTagInfo>>,
  collapseTagActiveNodeIds: Ref<Set<string>>,
  collapseTagHoverNodeId: Ref<string | null>,
  queryVisibleParentEdgeGeoms: (rect: WorldRect) => ParentEdgeGeom[],
  queryVisibleRelationGeoms: (rect: WorldRect) => MindRelationGeom[],
  edgeStats: Ref<ParentEdgeCacheStats>,
  relationCacheVersion?: Ref<number>,
  spatialIndex: UniformGridSpatialIndex,
  hoverNodeId: Ref<string | null>,
  hoveredMarker: Ref<{ nodeId: string; index: number } | null>,
  selectedIds: Ref<Set<string>>,
  selectedRelationId?: Ref<string | null>,
  allRelationsSelected?: Ref<boolean>,
  hoverRelationId?: Ref<string | null>,
  relationDraft?: Ref<{
    active: boolean;
    fromNodeId: string | null;
    hoverTargetNodeId: string | null;
    cursorScreenX: number;
    cursorScreenY: number;
  }>,
  marqueeRectScreen: Ref<ScreenRect | null>,
  marqueeWorldRect: Ref<WorldRect | null>,
  dragState?: Ref<DragDropState>,
  editingNodeId?: Ref<string | null>,
  imageInteraction?: Ref<ImageInteractionState | null>,
  nodeWidthInteraction?: Ref<NodeWidthInteractionState | null>,
  primarySelectedNodeId?: Ref<string | null>,
  editingWidthPreview?: Ref<{
    nodeId: string;
    baseNodeWidth: number;
    deltaX: number;
    subtreeNodeIds: Set<string>;
    affectedParentIds: Set<string>;
  } | null>,
  getInteractiveNodeRect?: (nodeId: string, rect: WorldRect) => WorldRect | null,
  historyStats?: Ref<{
    canUndo: boolean;
    canRedo: boolean;
    undoDepth: number;
    redoDepth: number;
    lastCommandName: string | null;
  }>,
  clipboardState?: Ref<InternalClipboardState>,
  editorDebugState?: Ref<{
    lastDeletedNodeId: string | null;
    lastPastedRootId: string | null;
    filteredOutDescendantsCount: number;
    rebuildCountInLastCommand: number;
  }>,
  cameraInteractionPreview?: Ref<{ kind: 'zoom' } | null>
) {
  const drawStats = ref<DrawStats>({
    worldViewportRect: null,
    cellRange: null,
    totalNodes: 0,
    candidateCount: 0,
    visibleCount: 0,
    falsePositiveCount: 0,
    parentsWithEdges: 0,
    totalChildrenEdges: 0,
    edgesDrawnParents: 0,
    branchesDrawn: 0,
    roundedBranchesCount: 0,
    straightBranchesCount: 0,
    degeneratedBranchesCount: 0,
    minBranchLen: 0,
    maxBranchLen: 0,
    edgeCacheSize: 0,
    edgeCacheBuildMs: 0,
    trunkStubLabel: '0',
    roundRadiusLabel: '0',
    childInset: 0,
    alignedStraightCount: 0,
    upRoundedCount: 0,
    downRoundedCount: 0,
    alignedMultiCount: 0,
    nonAlignedRoundedCount: 0,
    nonAlignedDegeneratedCount: 0,
    trunkShrinkAppliedCount: 0,
    trunkOverhangDetectedCount: 0,
    roughPresetName: 'clean',
    roughness: getCurrentRoughTheme().roughness,
    bowing: getCurrentRoughTheme().bowing,
    strokeWidthPx: getCurrentRoughTheme().strokeWidthPx,
    overlapPx: getCurrentRoughTheme().overlapPx,
    disableMultiStroke: getCurrentRoughTheme().disableMultiStroke,
    roughRequested: false,
    roughEnabled: false,
    roughFallbackReason: null,
    roughNodeCacheSize: 0,
    roughEdgeCacheSize: 0,
    roughNodeCacheHits: 0,
    roughNodeCacheMisses: 0,
    roughEdgeCacheHits: 0,
    roughEdgeCacheMisses: 0,
    selectedCount: 0,
    primarySelectedNodeId: null,
    clipboardHasData: false,
    clipboardType: 'empty',
    clipboardItemCount: 0,
    clipboardNodeCount: 0,
    lastDeletedNodeId: null,
    lastPastedRootId: null,
    filteredOutDescendantsCount: 0,
    rebuildCountInLastCommand: 0,
    isDragging: false,
    dragRootsCount: 0,
    dragRootId: null,
    dragRootTreeId: null,
    dropTargetType: null,
    dropToParentId: null,
    dropToIndex: null,
    dragInvalidReason: null,
    autoPanActive: false,
    autoPanVelocityLabel: '0,0',
    historyCanUndo: false,
    historyCanRedo: false,
    historyUndoDepth: 0,
    historyRedoDepth: 0,
    historyLastCommandName: null,
    drawDurationMs: 0,
    fps: 0,
  });
  let lastSpatialLogSignature = '';
  let lastEdgeLogSignature = '';
  let fpsWindowStart = performance.now();
  let fpsFrameCount = 0;
  let currentFps = 0;
  const drawTextCache = new Map<string, ReturnType<typeof measureNodeTextLayout>>();
  const imageRuntime: ImageRuntime = {
    loadedImages: new Map(),
    pendingSources: new Set(),
  };
  const roughRuntime: RoughRuntime = {
    canvas: null,
    rc: null,
    gen: null,
    logged: false,
    nodeDrawables: new Map(),
    edgeDrawables: new Map(),
    nodeHits: 0,
    nodeMisses: 0,
    edgeHits: 0,
    edgeMisses: 0,
    sampledNodeHits: 0,
    sampledNodeMisses: 0,
    sampledEdgeHits: 0,
    sampledEdgeMisses: 0,
    lastSampleAt: performance.now(),
  };
  const baseCache = {
    canvas: null as HTMLCanvasElement | null,
    dirty: true,
    signature: '',
    worldBoxesRef: null as WorldBoxes | null,
    cameraSnapshot: null as Camera | null,
    paddingX: 0,
    paddingY: 0,
    coverageWorldRect: null as WorldRect | null,
  };
  const viewportQueryCache = {
    signature: '',
    worldBoxesRef: null as WorldBoxes | null,
    worldViewportRect: null as WorldRect | null,
    cellRange: null as ReturnType<UniformGridSpatialIndex['getCellRange']> | null,
    candidateIds: [] as string[],
    visibleIds: [] as string[],
    falsePositiveIds: [] as string[],
    visibleEdgeGroups: [] as VisibleEdgeGroup[],
    visibleRelationGeoms: [] as MindRelationGeom[],
    visibleEdgeShapeCount: 0,
  };
  let lastRoughStyleSignature = '';
  let cleanupRoughUi: (() => void) | null = null;

  function redrawFromRoughUi() {
    draw();
  }

  function getLoadedNodeImage(src: string) {
    const cached = imageRuntime.loadedImages.get(src);
    if (cached) return cached;
    if (imageRuntime.pendingSources.has(src)) return null;
    imageRuntime.pendingSources.add(src);
    const image = new Image();
    image.onload = () => {
      imageRuntime.pendingSources.delete(src);
      imageRuntime.loadedImages.set(src, image);
      baseCache.dirty = true;
      draw();
    };
    image.onerror = () => {
      imageRuntime.pendingSources.delete(src);
    };
    image.src = src;
    return null;
  }

  function getHistorySnapshot() {
    return (
      historyStats?.value ?? {
        canUndo: false,
        canRedo: false,
        undoDepth: 0,
        redoDepth: 0,
        lastCommandName: null,
      }
    );
  }

  function getClipboardDebugSnapshot() {
    return {
      hasData: clipboardState?.value.type !== 'empty',
      type: clipboardState?.value.type ?? 'empty',
      itemCount: clipboardState?.value.itemCount ?? 0,
      nodeCount: clipboardState?.value.totalNodeCount ?? 0,
      lastDeletedNodeId: editorDebugState?.value.lastDeletedNodeId ?? null,
      lastPastedRootId: editorDebugState?.value.lastPastedRootId ?? null,
      filteredOutDescendantsCount: editorDebugState?.value.filteredOutDescendantsCount ?? 0,
      rebuildCountInLastCommand: editorDebugState?.value.rebuildCountInLastCommand ?? 0,
    };
  }

  onMounted(() => {
    if (typeof window === 'undefined') return;
    setupRoughThemeBrowserSync();
    ensureRoughThemeDebugApi();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!DEBUG_CANVAS_OVERLAY) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;
      const presetByKey: Record<string, RoughPresetName> = {
        '1': 'clean',
        '2': 'warm-paper',
        '3': 'mono',
        '4': 'accent-blue',
      };
      const preset = presetByKey[event.key];
      if (!preset) return;
      setRoughThemePreset(preset);
    };
    const unsubscribeTheme = subscribeRoughThemeChanges(() => redrawFromRoughUi());
    window.addEventListener('keydown', onKeyDown);
    cleanupRoughUi = () => {
      window.removeEventListener('keydown', onKeyDown);
      unsubscribeTheme();
    };
  });

  onBeforeUnmount(() => {
    cleanupRoughUi?.();
    cleanupRoughUi = null;
  });

  function draw() {
    const drawStart = performance.now();
    const d = props.doc;
    const c = canvasRef.value;
    if (!d || !c) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = getCanvasDevicePixelRatio(c);
    const viewportW = Math.max(1, c.clientWidth || Math.round(c.width / dpr));
    const viewportH = Math.max(1, c.clientHeight || Math.round(c.height / dpr));

    const historySnapshot = getHistorySnapshot();
    const clipboardDebug = getClipboardDebugSnapshot();
    const currentDragState = dragState?.value;
    const roughStyle = getCurrentRoughTheme();
    const roughRequested = ROUGH_STYLE;
    if (lastRoughStyleSignature && lastRoughStyleSignature !== roughStyle.themeSignature) {
      roughRuntime.nodeDrawables.clear();
      roughRuntime.edgeDrawables.clear();
      baseCache.dirty = true;
    }
    lastRoughStyleSignature = roughStyle.themeSignature;

    applyScreenTransform(ctx, dpr);
    ctx.clearRect(0, 0, viewportW, viewportH);
    ctx.fillStyle = roughStyle.colors.background;
    ctx.fillRect(0, 0, viewportW, viewportH);

    const cam = camera.value;
    const nodeWorldBoxes = worldBoxes.value;
    if (!nodeWorldBoxes.size) {
      drawStats.value = {
        worldViewportRect: null,
        cellRange: null,
        totalNodes: 0,
        candidateCount: 0,
        visibleCount: 0,
        falsePositiveCount: 0,
        parentsWithEdges: edgeStats.value.parentsWithEdges,
        totalChildrenEdges: edgeStats.value.totalChildrenEdges,
        edgesDrawnParents: 0,
        branchesDrawn: 0,
        roundedBranchesCount: 0,
        straightBranchesCount: 0,
        degeneratedBranchesCount: 0,
        minBranchLen: edgeStats.value.minBranchLen,
        maxBranchLen: edgeStats.value.maxBranchLen,
        edgeCacheSize: edgeStats.value.edgeCacheSize,
        edgeCacheBuildMs: edgeStats.value.edgeCacheBuildMs,
        trunkStubLabel: `${edgeStats.value.trunkStubMin}..${edgeStats.value.trunkStubMax}`,
        roundRadiusLabel: `${edgeStats.value.roundRadiusMin}..${edgeStats.value.roundRadiusMax}`,
        childInset: edgeStats.value.childInset,
        alignedStraightCount: edgeStats.value.alignedStraightCount,
        upRoundedCount: edgeStats.value.upRoundedCount,
        downRoundedCount: edgeStats.value.downRoundedCount,
        alignedMultiCount: edgeStats.value.alignedMultiCount,
        nonAlignedRoundedCount: edgeStats.value.nonAlignedRoundedCount,
        nonAlignedDegeneratedCount: edgeStats.value.nonAlignedDegeneratedCount,
        trunkShrinkAppliedCount: edgeStats.value.trunkShrinkAppliedCount,
        trunkOverhangDetectedCount: edgeStats.value.trunkOverhangDetectedCount,
        roughPresetName: roughStyle.presetName,
        roughness: roughStyle.roughness,
        bowing: roughStyle.bowing,
        strokeWidthPx: roughStyle.strokeWidthPx,
        overlapPx: roughStyle.overlapPx,
        disableMultiStroke: roughStyle.disableMultiStroke,
        roughRequested,
        roughEnabled: false,
        roughFallbackReason: 'no-visible-nodes',
        roughNodeCacheSize: roughRuntime.nodeDrawables.size,
        roughEdgeCacheSize: roughRuntime.edgeDrawables.size,
        roughNodeCacheHits: roughRuntime.sampledNodeHits,
        roughNodeCacheMisses: roughRuntime.sampledNodeMisses,
        roughEdgeCacheHits: roughRuntime.sampledEdgeHits,
        roughEdgeCacheMisses: roughRuntime.sampledEdgeMisses,
        selectedCount: selectedIds.value.size,
        primarySelectedNodeId: primarySelectedNodeId?.value ?? null,
        clipboardHasData: clipboardDebug.hasData,
        clipboardType: clipboardDebug.type,
        clipboardItemCount: clipboardDebug.itemCount,
        clipboardNodeCount: clipboardDebug.nodeCount,
        lastDeletedNodeId: clipboardDebug.lastDeletedNodeId,
        lastPastedRootId: clipboardDebug.lastPastedRootId,
        filteredOutDescendantsCount: clipboardDebug.filteredOutDescendantsCount,
        rebuildCountInLastCommand: clipboardDebug.rebuildCountInLastCommand,
        isDragging: currentDragState?.isDragging ?? false,
        dragRootsCount: currentDragState?.dragRoots.length ?? 0,
        dragRootId: currentDragState?.primaryDragRootId ?? null,
        dragRootTreeId: currentDragState?.rootId ?? null,
        dropTargetType: currentDragState?.dropTarget?.type ?? null,
        dropToParentId: currentDragState?.dropTarget?.toParentId ?? null,
        dropToIndex: currentDragState?.dropTarget?.toIndex ?? null,
        dragInvalidReason: currentDragState?.invalidReason ?? null,
        autoPanActive: currentDragState?.autoPanActive ?? false,
        autoPanVelocityLabel: `${Math.round(currentDragState?.autoPanVelocityX ?? 0)},${Math.round(currentDragState?.autoPanVelocityY ?? 0)}`,
        historyCanUndo: historySnapshot.canUndo,
        historyCanRedo: historySnapshot.canRedo,
        historyUndoDepth: historySnapshot.undoDepth,
        historyRedoDepth: historySnapshot.redoDepth,
        historyLastCommandName: historySnapshot.lastCommandName,
        drawDurationMs: performance.now() - drawStart,
        fps: currentFps,
      };
      drawMarqueeOverlay(
        ctx,
        marqueeRectScreen.value,
        dpr,
        roughStyle.colors.marquee.stroke,
        roughStyle.colors.marquee.fill
      );
      drawDebugHud(ctx, cam, spatialIndex, drawStats.value, dpr);
      return;
    }

    const activeEditingWidthPreview =
      editingWidthPreview?.value && Math.abs(editingWidthPreview.value.deltaX) > 0.01
        ? editingWidthPreview.value
        : null;
    const interactiveViewportExpansionX = activeEditingWidthPreview ? Math.abs(activeEditingWidthPreview.deltaX) : 0;
    function collectVisibleScene(viewRect: WorldRect, queryRect: WorldRect = viewRect) {
      const candidateIds = spatialIndex.queryRect(queryRect);
      const visibleIds: string[] = [];
      const falsePositiveIds: string[] = [];

      for (const id of candidateIds) {
        const rect = nodeWorldBoxes.get(id);
        if (!rect) continue;
        const interactiveRect = getInteractiveNodeRect?.(id, rect) ?? rect;
        if (rectIntersects(viewRect, interactiveRect)) {
          visibleIds.push(id);
        } else {
          falsePositiveIds.push(id);
        }
      }

      const visibleParentEdgeGeoms = queryVisibleParentEdgeGeoms(queryRect);
      const visibleRelationGeoms = queryVisibleRelationGeoms(queryRect);
      const visibleEdgeGroups: VisibleEdgeGroup[] = [];
      let visibleEdgeShapeCount = 0;
      for (const geom of visibleParentEdgeGeoms) {
        const branchEntries: VisibleEdgeGroup['branchEntries'] = [];
        for (const [childId, branchBBox] of geom.branchBBoxes.entries()) {
          if (!rectIntersects(branchBBox, viewRect)) continue;
          const meta = geom.branchMeta.get(childId);
          if (!meta) continue;
          branchEntries.push({ childId, meta });
        }
        if (!branchEntries.length && !geom.trunkPathData) continue;
        visibleEdgeGroups.push({ geom, branchEntries });
        visibleEdgeShapeCount += branchEntries.length + (geom.trunkPathData ? 1 : 0);
      }

      return {
        candidateIds,
        visibleIds,
        falsePositiveIds,
        visibleEdgeGroups,
        visibleRelationGeoms,
        visibleEdgeShapeCount,
      };
    }
    const viewportSignature = [
      c.width,
      c.height,
      cam.scale.toFixed(4),
      cam.tx.toFixed(2),
      cam.ty.toFixed(2),
      interactiveViewportExpansionX.toFixed(2),
      String(relationCacheVersion?.value ?? 0),
    ].join('|');
    const canReuseViewportQuery =
      viewportQueryCache.signature === viewportSignature &&
      viewportQueryCache.worldBoxesRef === nodeWorldBoxes &&
      viewportQueryCache.worldViewportRect != null &&
      viewportQueryCache.cellRange != null;

    let worldViewportRect: WorldRect;
    let cellRange: ReturnType<UniformGridSpatialIndex['getCellRange']>;
    let candidateIds: string[];
    let visibleIds: string[];
    let falsePositiveIds: string[];
    let visibleEdgeGroups: VisibleEdgeGroup[];
    let visibleRelationGeoms: MindRelationGeom[];
    let visibleEdgeShapeCount: number;

    if (canReuseViewportQuery) {
      worldViewportRect = viewportQueryCache.worldViewportRect!;
      cellRange = viewportQueryCache.cellRange!;
      candidateIds = viewportQueryCache.candidateIds;
      visibleIds = viewportQueryCache.visibleIds;
      falsePositiveIds = viewportQueryCache.falsePositiveIds;
      visibleEdgeGroups = viewportQueryCache.visibleEdgeGroups;
      visibleRelationGeoms = viewportQueryCache.visibleRelationGeoms;
      visibleEdgeShapeCount = viewportQueryCache.visibleEdgeShapeCount;
    } else {
      worldViewportRect = getWorldViewportRect(cam, viewportW, viewportH);
      cellRange = spatialIndex.getCellRange(worldViewportRect);
      const queryViewportRect = interactiveViewportExpansionX > 0
        ? {
          x1: worldViewportRect.x1 - interactiveViewportExpansionX,
          y1: worldViewportRect.y1,
          x2: worldViewportRect.x2 + interactiveViewportExpansionX,
          y2: worldViewportRect.y2,
        }
        : worldViewportRect;
      const scene = collectVisibleScene(worldViewportRect, queryViewportRect);
      candidateIds = scene.candidateIds;
      visibleIds = scene.visibleIds;
      falsePositiveIds = scene.falsePositiveIds;
      visibleEdgeGroups = scene.visibleEdgeGroups;
      visibleRelationGeoms = scene.visibleRelationGeoms;
      visibleEdgeShapeCount = scene.visibleEdgeShapeCount;

      viewportQueryCache.signature = viewportSignature;
      viewportQueryCache.worldBoxesRef = nodeWorldBoxes;
      viewportQueryCache.worldViewportRect = worldViewportRect;
      viewportQueryCache.cellRange = cellRange;
      viewportQueryCache.candidateIds = candidateIds;
      viewportQueryCache.visibleIds = visibleIds;
      viewportQueryCache.falsePositiveIds = falsePositiveIds;
      viewportQueryCache.visibleEdgeGroups = visibleEdgeGroups;
      viewportQueryCache.visibleRelationGeoms = visibleRelationGeoms;
      viewportQueryCache.visibleEdgeShapeCount = visibleEdgeShapeCount;
    }

    let roughFallbackReason: string | null = null;
    if (roughRequested) {
      const visibleShapeCount = visibleIds.length + visibleEdgeShapeCount;
      if (visibleShapeCount > ROUGH_VISIBLE_SHAPE_LIMIT) {
        roughFallbackReason = `too many shapes (${visibleShapeCount})`;
      } else {
        syncRoughRuntime(roughRuntime, c);
        if (!roughRuntime.rc || !roughRuntime.gen) {
          roughFallbackReason = 'rough init failed';
        }
      }
    }
    const roughEnabled = roughRequested && roughFallbackReason == null;

    drawStats.value = {
      worldViewportRect,
      cellRange,
      totalNodes: nodeWorldBoxes.size,
      candidateCount: candidateIds.length,
      visibleCount: visibleIds.length,
      falsePositiveCount: falsePositiveIds.length,
      parentsWithEdges: edgeStats.value.parentsWithEdges,
      totalChildrenEdges: edgeStats.value.totalChildrenEdges,
      edgesDrawnParents: 0,
      branchesDrawn: 0,
      roundedBranchesCount: 0,
      straightBranchesCount: 0,
      degeneratedBranchesCount: 0,
      minBranchLen: edgeStats.value.minBranchLen,
      maxBranchLen: edgeStats.value.maxBranchLen,
      edgeCacheSize: edgeStats.value.edgeCacheSize,
      edgeCacheBuildMs: edgeStats.value.edgeCacheBuildMs,
      trunkStubLabel: `${edgeStats.value.trunkStubMin}..${edgeStats.value.trunkStubMax}`,
      roundRadiusLabel: `${edgeStats.value.roundRadiusMin}..${edgeStats.value.roundRadiusMax}`,
      childInset: edgeStats.value.childInset,
      alignedStraightCount: edgeStats.value.alignedStraightCount,
      upRoundedCount: edgeStats.value.upRoundedCount,
      downRoundedCount: edgeStats.value.downRoundedCount,
      alignedMultiCount: edgeStats.value.alignedMultiCount,
      nonAlignedRoundedCount: edgeStats.value.nonAlignedRoundedCount,
      nonAlignedDegeneratedCount: edgeStats.value.nonAlignedDegeneratedCount,
      trunkShrinkAppliedCount: edgeStats.value.trunkShrinkAppliedCount,
      trunkOverhangDetectedCount: edgeStats.value.trunkOverhangDetectedCount,
      roughPresetName: roughStyle.presetName,
      roughness: roughStyle.roughness,
      bowing: roughStyle.bowing,
      strokeWidthPx: roughStyle.strokeWidthPx,
      overlapPx: roughStyle.overlapPx,
      disableMultiStroke: roughStyle.disableMultiStroke,
      roughRequested,
      roughEnabled,
      roughFallbackReason,
      roughNodeCacheSize: roughRuntime.nodeDrawables.size,
      roughEdgeCacheSize: roughRuntime.edgeDrawables.size,
      roughNodeCacheHits: roughRuntime.sampledNodeHits,
      roughNodeCacheMisses: roughRuntime.sampledNodeMisses,
      roughEdgeCacheHits: roughRuntime.sampledEdgeHits,
      roughEdgeCacheMisses: roughRuntime.sampledEdgeMisses,
      selectedCount: selectedIds.value.size,
      primarySelectedNodeId: primarySelectedNodeId?.value ?? null,
      clipboardHasData: clipboardDebug.hasData,
      clipboardType: clipboardDebug.type,
      clipboardItemCount: clipboardDebug.itemCount,
      clipboardNodeCount: clipboardDebug.nodeCount,
      lastDeletedNodeId: clipboardDebug.lastDeletedNodeId,
      lastPastedRootId: clipboardDebug.lastPastedRootId,
      filteredOutDescendantsCount: clipboardDebug.filteredOutDescendantsCount,
      rebuildCountInLastCommand: clipboardDebug.rebuildCountInLastCommand,
      isDragging: currentDragState?.isDragging ?? false,
      dragRootsCount: currentDragState?.dragRoots.length ?? 0,
      dragRootId: currentDragState?.primaryDragRootId ?? null,
      dragRootTreeId: currentDragState?.rootId ?? null,
      dropTargetType: currentDragState?.dropTarget?.type ?? null,
      dropToParentId: currentDragState?.dropTarget?.toParentId ?? null,
      dropToIndex: currentDragState?.dropTarget?.toIndex ?? null,
      dragInvalidReason: currentDragState?.invalidReason ?? null,
      autoPanActive: currentDragState?.autoPanActive ?? false,
      autoPanVelocityLabel: `${Math.round(currentDragState?.autoPanVelocityX ?? 0)},${Math.round(currentDragState?.autoPanVelocityY ?? 0)}`,
      historyCanUndo: historySnapshot.canUndo,
      historyCanRedo: historySnapshot.canRedo,
      historyUndoDepth: historySnapshot.undoDepth,
      historyRedoDepth: historySnapshot.redoDepth,
      historyLastCommandName: historySnapshot.lastCommandName,
      drawDurationMs: 0,
      fps: currentFps,
    };

    if (DEBUG_SPATIAL_LOG) {
      const nextSignature = [
        cam.scale.toFixed(3),
        worldViewportRect.x1.toFixed(1),
        worldViewportRect.y1.toFixed(1),
        worldViewportRect.x2.toFixed(1),
        worldViewportRect.y2.toFixed(1),
        candidateIds.length,
        visibleIds.length,
        selectedIds.value.size,
      ].join('|');
      if (nextSignature !== lastSpatialLogSignature) {
        lastSpatialLogSignature = nextSignature;
        console.debug('[mind-spatial]', {
          worldViewportRect: {
            x1: Number(worldViewportRect.x1.toFixed(2)),
            y1: Number(worldViewportRect.y1.toFixed(2)),
            x2: Number(worldViewportRect.x2.toFixed(2)),
            y2: Number(worldViewportRect.y2.toFixed(2)),
          },
          gridCellSize: spatialIndex.cellSize,
          candidateIds: candidateIds.length,
          visibleIds: visibleIds.length,
          selectedIds: selectedIds.value.size,
        });
      }
    }

    if (DEBUG_SPATIAL) {
      drawSpatialDebug(
        ctx,
        cam,
        viewportW,
        viewportH,
        dpr,
        worldViewportRect,
        spatialIndex,
        nodeWorldBoxes,
        visibleIds,
        falsePositiveIds,
        hoverNodeId.value,
        selectedIds.value,
        marqueeWorldRect.value
      );
    }

    const activeMind = getActiveMind(d);
    const nodes = activeMind?.nodes || {};
    const rootNodeIds = new Set(
      Array.isArray(activeMind?.roots)
        ? activeMind.roots
            .map((root: any) => root?.rootId)
            .filter((rootId: unknown): rootId is string => typeof rootId === 'string' && rootId.length > 0)
        : []
    );
    let edgesDrawnParents = 0;
    let branchesDrawn = 0;
    let roundedBranchesCount = 0;
    let straightBranchesCount = 0;
    let degeneratedBranchesCount = 0;
    let minBranchLen = Number.POSITIVE_INFINITY;
    let maxBranchLen = Number.NEGATIVE_INFINITY;
    const strokeAlphaFactor = getStrokeAlphaFactor(cam.scale);
    const draggedOriginalNodeIds =
      currentDragState?.isDragging
        ? new Set([
            ...currentDragState.dragRoots,
            ...Array.from(currentDragState.draggedSubtreeNodeIds),
            ...Array.from(currentDragState.blockedDropNodeIds ?? []),
          ])
        : null;
    const strokeScreenWidthPx = getStrokeScreenWidthPx(cam.scale, roughStyle.strokeWidthPx);
    const edgeLineWidth = strokeScreenWidthPx / cam.scale;
    const trunkLineWidth = strokeScreenWidthPx / cam.scale;
    const overlapWorld = roughStyle.overlapPx / Math.max(cam.scale, 0.0001);
    const hiddenDraggedNodeIds = null;

    function drawVisibleEdgeGroup(
      targetCtx: CanvasRenderingContext2D,
      edgeGroup: VisibleEdgeGroup,
      options?: { translateX?: number; collectStats?: boolean }
    ) {
      const translateX = options?.translateX ?? 0;
      const collectStats = options?.collectStats !== false;
      const { geom } = edgeGroup;
      const branchEntries = hiddenDraggedNodeIds
        ? edgeGroup.branchEntries.filter(({ childId }) => !hiddenDraggedNodeIds.has(childId) && !hiddenDraggedNodeIds.has(geom.parentId))
        : edgeGroup.branchEntries;
      const canDrawTrunk = !!geom.trunkPathData && (!hiddenDraggedNodeIds || !hiddenDraggedNodeIds.has(geom.parentId));
      if (!branchEntries.length && !canDrawTrunk) return;
      const branchStroke = multiplyColorAlpha(roughStyle.colors.edges.branchStroke, strokeAlphaFactor);
      const trunkStroke = multiplyColorAlpha(roughStyle.colors.edges.trunkStroke, strokeAlphaFactor);
      let parentBranchCount = 0;

      targetCtx.save();
      if (translateX) targetCtx.translate(translateX, 0);
      targetCtx.lineWidth = edgeLineWidth;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';

      const useRoughEdgesForGroup =
        roughEnabled &&
        branchEntries.some(({ childId }) => {
          const childVisual = getMindNodeDefaultVisualStyle(props.doc, childId);
          return childVisual.borderPreset === 'rough-solid' || childVisual.borderPreset === 'rough-dashed';
        });

      const trunkGhostAlpha = draggedOriginalNodeIds?.has(geom.parentId) ? 0.35 : 1;
      if (canDrawTrunk && useRoughEdgesForGroup) {
        targetCtx.save();
        if (trunkGhostAlpha !== 1) targetCtx.globalAlpha *= trunkGhostAlpha;
        drawNativeSegment(targetCtx, geom.parentAnchor, geom.trunkJoin, trunkStroke, trunkLineWidth);
        drawNativeSegment(targetCtx, geom.trunkTop, geom.trunkBottom, trunkStroke, trunkLineWidth);
        targetCtx.restore();
      } else if (canDrawTrunk && geom.trunkPath) {
        targetCtx.save();
        if (trunkGhostAlpha !== 1) targetCtx.globalAlpha *= trunkGhostAlpha;
        targetCtx.strokeStyle = trunkStroke;
        targetCtx.stroke(geom.trunkPath);
        targetCtx.restore();
      }

      for (const { childId, meta } of branchEntries) {
        const childVisual = getMindNodeDefaultVisualStyle(props.doc, childId);
        const useRoughEdge =
          roughEnabled &&
          (childVisual.borderPreset === 'rough-solid' || childVisual.borderPreset === 'rough-dashed');
        const branchGhostAlpha = draggedOriginalNodeIds?.has(childId) ? 0.35 : 1;
        if (useRoughEdge && roughRuntime.rc && roughRuntime.gen) {
          const branchPathData = geom.childBranchPathData.get(childId);
          if (!branchPathData) continue;
          const branchDrawable = getOrCreateEdgeDrawable(
            roughRuntime,
            roughRuntime.gen,
            roughStyle,
            `${geom.parentId}:${childId}:branch`,
            branchPathData
          );
          branchDrawable.options.stroke = branchStroke;
          branchDrawable.options.strokeWidth = edgeLineWidth;
          targetCtx.save();
          if (branchGhostAlpha !== 1) targetCtx.globalAlpha *= branchGhostAlpha;
          roughRuntime.rc.draw(branchDrawable);
          drawRoundedSeamCap(targetCtx, meta, branchStroke, edgeLineWidth, overlapWorld);
          targetCtx.restore();
        } else {
          const branchPath = geom.childBranchPaths.get(childId);
          if (!branchPath) continue;
          targetCtx.save();
          if (branchGhostAlpha !== 1) targetCtx.globalAlpha *= branchGhostAlpha;
          targetCtx.strokeStyle = branchStroke;
          targetCtx.stroke(branchPath);
          targetCtx.restore();
        }
        parentBranchCount += 1;
        if (collectStats) {
          if (meta.rounded) roundedBranchesCount += 1;
          else straightBranchesCount += 1;
          if (meta.degenerated) degeneratedBranchesCount += 1;
          minBranchLen = Math.min(minBranchLen, meta.branchLen);
          maxBranchLen = Math.max(maxBranchLen, meta.branchLen);
        }
      }

      targetCtx.restore();
      if (collectStats) {
        edgesDrawnParents += 1;
        branchesDrawn += parentBranchCount;
      }
    }

    function drawRelationPath(
      targetCtx: CanvasRenderingContext2D,
      relationGeom: MindRelationGeom,
      options?: {
        strokeStyle?: string;
        lineWidth?: number;
        dashed?: boolean;
        alpha?: number;
        arrow?: boolean;
      }
    ) {
      targetCtx.save();
      if (options?.alpha != null) targetCtx.globalAlpha *= options.alpha;
      targetCtx.strokeStyle = options?.strokeStyle ?? 'rgba(79, 70, 229, 0.72)';
      targetCtx.lineWidth = options?.lineWidth ?? 1.4;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';
      targetCtx.setLineDash(options?.dashed ? [8, 6] : []);
      targetCtx.stroke(relationGeom.path);
      if (options?.arrow !== false && relationGeom.samplePoints.length >= 2) {
        const endPoint = relationGeom.endPoint;
        const previousPoint = relationGeom.samplePoints[relationGeom.samplePoints.length - 2];
        const angle = Math.atan2(endPoint.y - previousPoint.y, endPoint.x - previousPoint.x);
        const arrowLength = 10;
        const arrowSpread = Math.PI / 7;
        targetCtx.fillStyle = options?.strokeStyle ?? 'rgba(79, 70, 229, 0.72)';
        targetCtx.beginPath();
        targetCtx.moveTo(endPoint.x, endPoint.y);
        targetCtx.lineTo(
          endPoint.x - Math.cos(angle - arrowSpread) * arrowLength,
          endPoint.y - Math.sin(angle - arrowSpread) * arrowLength
        );
        targetCtx.lineTo(
          endPoint.x - Math.cos(angle + arrowSpread) * arrowLength,
          endPoint.y - Math.sin(angle + arrowSpread) * arrowLength
        );
        targetCtx.closePath();
        targetCtx.fill();
      }
      targetCtx.restore();
    }

    function drawVisibleRelations(targetCtx: CanvasRenderingContext2D, relationGeoms: MindRelationGeom[]) {
      if (!relationGeoms.length) return;
      const baseStroke = multiplyColorAlpha('rgba(79, 70, 229, 0.82)', Math.max(0.45, strokeAlphaFactor));
      const baseLineWidth = 1.7;
      relationGeoms.forEach((relationGeom) => {
        drawRelationPath(targetCtx, relationGeom, {
          strokeStyle: baseStroke,
          lineWidth: baseLineWidth,
          dashed: true,
          arrow: true,
        });
      });
    }

    function drawRelationHandles(targetCtx: CanvasRenderingContext2D, relationGeom: MindRelationGeom, strokeStyle: string) {
      const radius = 4.5 / Math.max(cam.scale, 0.0001);
      targetCtx.save();
      targetCtx.fillStyle = '#ffffff';
      targetCtx.strokeStyle = strokeStyle;
      targetCtx.lineWidth = 1.8 / Math.max(cam.scale, 0.0001);
      [relationGeom.startPoint, relationGeom.endPoint].forEach((point) => {
        targetCtx.beginPath();
        targetCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();
      });
      targetCtx.restore();
    }

      function drawVisibleNode(
        targetCtx: CanvasRenderingContext2D,
        id: string,
        rect: WorldRect,
        options?: { skipText?: boolean; clearRect?: WorldRect | null; isDraggedGhost?: boolean; draggedGhostAlpha?: number }
      ) {
      const node = nodes[id];
      if (!node) return;
      const bodyRect = getNodeBodyWorldRect(node, rect);
      if (options?.clearRect) {
        targetCtx.fillStyle = roughStyle.colors.background;
        targetCtx.fillRect(
          options.clearRect.x1,
          options.clearRect.y1,
          rectWidth(options.clearRect),
          rectHeight(options.clearRect)
        );
      }

      const nodeDefaults = getMindNodeDefaultVisualStyle(props.doc, id);
      const nodeShapeStyle = node?.style?.shape ?? null;
      const nodeFill = nodeDefaults.fillPreset === 'none' ? 'rgba(0, 0, 0, 0)' : nodeDefaults.fill;
      const nodeStroke = nodeDefaults.borderPreset !== 'none'
        ? multiplyColorAlpha(nodeDefaults.stroke, strokeAlphaFactor)
        : 'rgba(0, 0, 0, 0)';
      const nodeCornerRadius = getNodeCornerRadius(bodyRect);
      const nodeBorderLineWidth =
        getStrokeScreenWidthPx(cam.scale, nodeShapeStyle?.strokeWidthPx ?? roughStyle.strokeWidthPx) / cam.scale;
      const shouldUseRoughFill = roughEnabled && nodeDefaults.fillPreset !== 'solid' && nodeDefaults.fillPreset !== 'none';
      const shouldUseRoughBorder =
        roughEnabled && (nodeDefaults.borderPreset === 'rough-solid' || nodeDefaults.borderPreset === 'rough-dashed');

      targetCtx.save();
        if (options?.isDraggedGhost) targetCtx.globalAlpha *= options.draggedGhostAlpha ?? 0.35;
      if (shouldUseRoughFill && roughRuntime.rc && roughRuntime.gen) {
        const fillDrawable = getOrCreateNodeDrawable(
          roughRuntime,
          roughRuntime.gen,
          roughStyle,
          `${id}:fill`,
          bodyRect,
          `${nodeDefaults.cacheKey}|fill`,
          {
            fill: nodeFill,
            stroke: 'rgba(0, 0, 0, 0)',
            strokeWidth: 0,
            fillStyle: nodeDefaults.roughNodeOptions.fillStyle,
            fillWeight: nodeDefaults.roughNodeOptions.fillWeight,
            hachureGap: nodeDefaults.roughNodeOptions.hachureGap,
            hachureAngle: nodeDefaults.roughNodeOptions.hachureAngle,
          }
        );
        fillDrawable.options.fill = nodeFill;
        fillDrawable.options.stroke = 'rgba(0, 0, 0, 0)';
        fillDrawable.options.strokeWidth = 0;
        fillDrawable.options.fillStyle = nodeDefaults.roughNodeOptions.fillStyle;
        fillDrawable.options.fillWeight = nodeDefaults.roughNodeOptions.fillWeight;
        fillDrawable.options.hachureGap = nodeDefaults.roughNodeOptions.hachureGap;
        fillDrawable.options.hachureAngle = nodeDefaults.roughNodeOptions.hachureAngle;
        roughRuntime.rc.draw(fillDrawable);
      } else {
        drawRoundedRectShape(targetCtx, bodyRect, nodeCornerRadius, nodeFill, 'rgba(0,0,0,0)', 0);
      }

      if (shouldUseRoughBorder && roughRuntime.rc && roughRuntime.gen) {
        const borderDrawable = getOrCreateNodeDrawable(
          roughRuntime,
          roughRuntime.gen,
          roughStyle,
          `${id}:border`,
          bodyRect,
          `${nodeDefaults.cacheKey}|border`,
          {
            fill: 'rgba(0, 0, 0, 0)',
            stroke: nodeStroke,
            strokeWidth: nodeDefaults.hasBorder ? nodeBorderLineWidth : 0,
            strokeLineDash: nodeDefaults.borderPreset === 'rough-dashed' ? [6, 5] : undefined,
            fillStyle: 'solid',
          }
        );
        borderDrawable.options.fill = 'rgba(0, 0, 0, 0)';
        borderDrawable.options.stroke = nodeStroke;
        borderDrawable.options.strokeWidth = nodeDefaults.hasBorder ? nodeBorderLineWidth : 0;
        borderDrawable.options.strokeLineDash = nodeDefaults.borderPreset === 'rough-dashed' ? [6, 5] : undefined;
        borderDrawable.options.fillStyle = 'solid';
        roughRuntime.rc.draw(borderDrawable);
      } else if (nodeDefaults.borderPreset === 'clean') {
        drawRoundedRectOutline(targetCtx, bodyRect, nodeCornerRadius, nodeStroke, nodeBorderLineWidth);
      } else if (nodeDefaults.borderPreset === 'rough-dashed') {
        drawRoundedRectDashedOutline(targetCtx, bodyRect, nodeCornerRadius, nodeStroke, nodeBorderLineWidth, [6 / cam.scale, 5 / cam.scale]);
      } else {
        drawRoundedRectShape(targetCtx, bodyRect, nodeCornerRadius, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0);
      }

      const visualLayout = measureNodeVisualLayout(targetCtx, node, drawTextCache, { doc: props.doc, nodeId: id, collapseEmptyText: true });
      const skipNodeText = !!options?.skipText;
      const markerIW = visualLayout.markerInlineWidth;

      if (visualLayout.image?.src) {
        const loadedImage = getLoadedNodeImage(visualLayout.image.src);
        if (loadedImage) {
          const contentRect = markerIW > 0
            ? { x1: bodyRect.x1 + markerIW, y1: bodyRect.y1, x2: bodyRect.x2, y2: bodyRect.y2 }
            : bodyRect;
          const imageRect = getNodeImageWorldRect(contentRect, {
            w: visualLayout.image.width,
            h: visualLayout.image.height,
          });
          if (imageRect) {
            targetCtx.drawImage(loadedImage, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
          }
        }
      }

      if (!skipNodeText) {
        const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: id });
        targetCtx.textBaseline = 'top';
        let lineY = bodyRect.y1 + visualLayout.textGeometry.textGlyphTop;
        const textRegionWidth = rectWidth(bodyRect) - NODE_TEXT_INSET_X * 2 - markerIW;
        const textLeftX = bodyRect.x1 + NODE_TEXT_INSET_X + markerIW;
        visualLayout.textLayout.richLines.forEach((line) => {
          const snappedLineY = snapWorldToDevicePixel(lineY, cam.scale, cam.ty, dpr);
          const effectiveAlign = line.align ?? textStyle.textAlign;
          const baseX =
            effectiveAlign === 'center'
              ? textLeftX + Math.max(0, (textRegionWidth - line.width) / 2)
              : effectiveAlign === 'right'
                ? bodyRect.x2 - NODE_TEXT_INSET_X - line.width
                : textLeftX;
          let cursorX = baseX;
          for (const segment of line.segments) {
            targetCtx.font =
              segment.font ||
              getInlineFont(
                segment.marks,
                NODE_DEFAULT_FONT_FAMILY,
                NODE_DEFAULT_FONT_SIZE,
                textStyle.fontWeight,
                textStyle.fontStyle
              );
            targetCtx.fillStyle = segment.color ?? textStyle.color;
            targetCtx.fillText(segment.text, cursorX, snappedLineY);
            if (segment.marks?.underline || segment.marks?.strike) {
              const width = segment.width;
              const verticalMetrics = measureTextVerticalMetrics(targetCtx, {
                font: targetCtx.font,
                fontSizePx: segment.fontSize,
                lineHeightPx: Math.max(line.height, Math.ceil(segment.fontSize * 1.3)),
              });
              const baselineY = snappedLineY + verticalMetrics.baselineOffsetPx;
              const decorationOffsets = resolveMappedDecorationOffsets(segment.fontSize);
              targetCtx.strokeStyle = segment.color ?? textStyle.color;
              if (segment.marks.underline) {
                targetCtx.lineCap = 'round';
                targetCtx.lineJoin = 'round';
                targetCtx.lineWidth = Math.max(1.05, segment.fontSize * 0.07);
                const underlineY = snapWorldToDevicePixel(
                  baselineY + decorationOffsets.underlineFromBaseline,
                  cam.scale,
                  cam.ty,
                  dpr
                );
                targetCtx.beginPath();
                targetCtx.moveTo(cursorX, underlineY);
                targetCtx.lineTo(cursorX + width, underlineY);
                targetCtx.stroke();
              }
              if (segment.marks.strike) {
                targetCtx.lineCap = 'butt';
                targetCtx.lineJoin = 'miter';
                targetCtx.lineWidth = Math.max(1.1, segment.fontSize * 0.065);
                const strikeY = snapWorldToDevicePixel(
                  snappedLineY + verticalMetrics.topLeadingPx + decorationOffsets.strikeFromContentTop,
                  cam.scale,
                  cam.ty,
                  dpr
                );
                targetCtx.beginPath();
                targetCtx.moveTo(cursorX, strikeY);
                targetCtx.lineTo(cursorX + width, strikeY);
                targetCtx.stroke();
              }
            }
            cursorX += segment.width;
          }
          lineY += line.height;
        });
      }
      const hmk = hoveredMarker.value;
      const markerHoverIdx = (hmk && hmk.nodeId === id) ? hmk.index : -1;
      drawNodeMarkers(targetCtx, node, bodyRect, getLoadedNodeImage, markerHoverIdx >= 0 ? markerHoverIdx : undefined);
      drawRootSecrecyBadgeIfNeeded(targetCtx, rootNodeIds, id, node, bodyRect);
      targetCtx.restore();
    }

    function resolveSubtreeWorldRect(rootNodeId: string): WorldRect | null {
      const subtreeRects = collectSubtreeNodeIds(nodes, rootNodeId)
        .map((nodeId) => nodeWorldBoxes.get(nodeId))
        .filter((rect): rect is WorldRect => !!rect);
      if (!subtreeRects.length) return null;
      return {
        x1: Math.min(...subtreeRects.map((rect) => rect.x1)),
        y1: Math.min(...subtreeRects.map((rect) => rect.y1)),
        x2: Math.max(...subtreeRects.map((rect) => rect.x2)),
        y2: Math.max(...subtreeRects.map((rect) => rect.y2)),
      };
    }

    function resolveSummaryCoveredWorldRect(parentNode: any, summaryStartIndex: number, summaryEndIndex: number): WorldRect | null {
      const coveredChildRects = getRegularChildIds(parentNode)
        .slice(summaryStartIndex, summaryEndIndex + 1)
        .map((childId) => resolveSubtreeWorldRect(childId))
        .filter((rect): rect is WorldRect => !!rect);
      if (!coveredChildRects.length) return null;
      return {
        x1: Math.min(...coveredChildRects.map((rect) => rect.x1)),
        y1: Math.min(...coveredChildRects.map((rect) => rect.y1)),
        x2: Math.max(...coveredChildRects.map((rect) => rect.x2)),
        y2: Math.max(...coveredChildRects.map((rect) => rect.y2)),
      };
    }

    function drawVisibleSummaries(targetCtx: CanvasRenderingContext2D, viewRect: WorldRect) {
      targetCtx.save();
      const braceStroke = multiplyColorAlpha(SUMMARY_BRACE_STROKE, strokeAlphaFactor);
      const braceLineWidth = getStrokeScreenWidthPx(cam.scale, 2) / Math.max(cam.scale, 0.0001);
      targetCtx.strokeStyle = braceStroke;
      targetCtx.fillStyle = multiplyColorAlpha(SUMMARY_BRACE_TEXT, strokeAlphaFactor);
      targetCtx.lineWidth = braceLineWidth;
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';

      for (const [parentId, parentNode] of Object.entries(nodes)) {
        if (!parentNode || parentNode.collapsed) continue;
        const summaries = getNodeSummaries(parentNode);
        if (!summaries.length) continue;
        for (const summary of summaries) {
          if (hiddenDraggedNodeIds?.has(summary.summaryNodeId)) continue;
          const summaryRect = nodeWorldBoxes.get(summary.summaryNodeId);
          if (!summaryRect) continue;
          const summaryGhostAlpha = draggedOriginalNodeIds?.has(summary.summaryNodeId) ? 0.35 : 1;
          const coveredRect = resolveSummaryCoveredWorldRect(parentNode, summary.startIndex, summary.endIndex);
          if (!coveredRect) continue;
          const rangeTop = coveredRect.y1;
          const rangeBottom = coveredRect.y2;
          const rangeRight = coveredRect.x2;
          const summaryBodyRect = getNodeBodyWorldRect(nodes[summary.summaryNodeId], summaryRect);
          const braceStemX = summaryBodyRect.x1 - 16;
          const braceNearX = braceStemX - 14;
          const targetX = summaryBodyRect.x1 - 10;
          const decorationRect: WorldRect = {
            x1: Math.min(rangeRight, braceNearX),
            y1: rangeTop,
            x2: summaryRect.x2,
            y2: Math.max(rangeBottom, summaryRect.y2),
          };
          if (!rectIntersects(decorationRect, viewRect) && !rectIntersects(summaryRect, viewRect)) continue;
          const rangeCenterY = (rangeTop + rangeBottom) / 2;
          const baseSpan = Math.max(
            rangeBottom - rangeTop,
            Math.max(34, summaryRect.y2 - summaryRect.y1)
          );
          const topY = rangeCenterY - baseSpan / 2;
          const bottomY = rangeCenterY + baseSpan / 2;
          const curveDepthY = Math.max(baseSpan * 0.16, 10);
          const curveJoinTopY = topY + curveDepthY;
          const curveJoinBottomY = bottomY - curveDepthY;
          const midY = (curveJoinTopY + curveJoinBottomY) / 2;

          targetCtx.save();
          targetCtx.globalAlpha *= summaryGhostAlpha;
          targetCtx.beginPath();
          targetCtx.moveTo(braceNearX, topY);
          targetCtx.bezierCurveTo(
            braceStemX,
            topY,
            braceStemX,
            curveJoinTopY,
            braceStemX,
            curveJoinTopY
          );
          targetCtx.lineTo(braceStemX, curveJoinBottomY);
          targetCtx.bezierCurveTo(
            braceStemX,
            curveJoinBottomY,
            braceStemX,
            bottomY,
            braceNearX,
            bottomY
          );
          targetCtx.stroke();

          targetCtx.beginPath();
          targetCtx.moveTo(braceStemX, midY);
          targetCtx.lineTo(targetX, midY);
          targetCtx.stroke();
          targetCtx.restore();
        }
      }

      targetCtx.restore();
    }

    function resolveSummaryRangeOutlineRect(summaryNodeId: string): WorldRect | null {
      const summaryNode = nodes[summaryNodeId];
      if (!summaryNode) return null;
      for (const [parentId, parentNode] of Object.entries(nodes)) {
        const summaries = getNodeSummaries(parentNode);
        const targetSummary = summaries.find((item) => item.summaryNodeId === summaryNodeId);
        if (!targetSummary) continue;
        return resolveSummaryCoveredWorldRect(parentNode, targetSummary.startIndex, targetSummary.endIndex);
      }
      return null;
    }

    const isZoomPreviewActive = cameraInteractionPreview?.value?.kind === 'zoom';
    const basePaddingX = isZoomPreviewActive ? Math.max(180, Math.round(viewportW * 0.4)) : 0;
    const basePaddingY = isZoomPreviewActive ? Math.max(140, Math.round(viewportH * 0.4)) : 0;
    const baseWorldViewportRect: WorldRect = {
      x1: worldViewportRect.x1 - basePaddingX / Math.max(cam.scale, 0.0001),
      y1: worldViewportRect.y1 - basePaddingY / Math.max(cam.scale, 0.0001),
      x2: worldViewportRect.x2 + basePaddingX / Math.max(cam.scale, 0.0001),
      y2: worldViewportRect.y2 + basePaddingY / Math.max(cam.scale, 0.0001),
    };

    function ensureBaseCanvas(paddingX: number, paddingY: number) {
      if (typeof document === 'undefined') return null;
      if (!baseCache.canvas) baseCache.canvas = document.createElement('canvas');
      const targetWidth = Math.max(1, Math.round((viewportW + paddingX * 2) * dpr));
      const targetHeight = Math.max(1, Math.round((viewportH + paddingY * 2) * dpr));
      if (baseCache.canvas.width !== targetWidth) {
        baseCache.canvas.width = targetWidth;
        baseCache.dirty = true;
      }
      if (baseCache.canvas.height !== targetHeight) {
        baseCache.canvas.height = targetHeight;
        baseCache.dirty = true;
      }
      return baseCache.canvas;
    }

    function drawBaseScene(
      targetCtx: CanvasRenderingContext2D,
      renderVisibleEdgeGroups: VisibleEdgeGroup[],
      renderVisibleIds: string[],
      renderVisibleRelationGeoms: MindRelationGeom[],
      offsetX = 0,
      offsetY = 0
    ) {
      applyScreenTransform(targetCtx, dpr);
      targetCtx.clearRect(0, 0, targetCtx.canvas.width / dpr, targetCtx.canvas.height / dpr);
      targetCtx.fillStyle = roughStyle.colors.background;
      targetCtx.fillRect(0, 0, targetCtx.canvas.width / dpr, targetCtx.canvas.height / dpr);

      targetCtx.save();
      targetCtx.setTransform(cam.scale * dpr, 0, 0, cam.scale * dpr, (cam.tx + offsetX) * dpr, (cam.ty + offsetY) * dpr);
      for (const { geom, branchEntries } of renderVisibleEdgeGroups) {
        drawVisibleEdgeGroup(targetCtx, { geom, branchEntries });
      }
      drawVisibleSummaries(targetCtx, baseWorldViewportRect);
      drawVisibleRelations(targetCtx, renderVisibleRelationGeoms);

      for (const id of renderVisibleIds) {
        if (editingNodeId?.value === id) continue;
        if (hiddenDraggedNodeIds?.has(id)) continue;
        const rect = nodeWorldBoxes.get(id);
        if (!rect) continue;
        const isDraggedGhost =
          currentDragState?.isDragging &&
          (currentDragState.draggedSubtreeNodeIds.has(id) ||
            currentDragState.blockedDropNodeIds?.has(id) ||
            (currentDragState.dragKind === 'free-root' && currentDragState.primaryDragRootId === id));
        drawVisibleNode(targetCtx, id, rect, { isDraggedGhost });
      }
      targetCtx.restore();
    }

    function drawZoomPreviewScene(
      targetCtx: CanvasRenderingContext2D,
      sourceCanvas: HTMLCanvasElement,
      fromCamera: Camera,
      toCamera: Camera,
      fromPaddingX: number,
      fromPaddingY: number
    ) {
      const scaleRatio = toCamera.scale / Math.max(fromCamera.scale, 0.0001);
      const translateX = (toCamera.tx - (fromCamera.tx + fromPaddingX) * scaleRatio) * dpr;
      const translateY = (toCamera.ty - (fromCamera.ty + fromPaddingY) * scaleRatio) * dpr;
      targetCtx.setTransform(1, 0, 0, 1, 0, 0);
      targetCtx.clearRect(0, 0, c.width, c.height);
      targetCtx.fillStyle = roughStyle.colors.background;
      targetCtx.fillRect(0, 0, c.width, c.height);
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.setTransform(scaleRatio, 0, 0, scaleRatio, translateX, translateY);
      targetCtx.drawImage(sourceCanvas, 0, 0);
      targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    }

      const dragBaseSignature = currentDragState?.isDragging
        ? [
            'drag',
            currentDragState.dragKind,
            currentDragState.primaryDragRootId ?? '',
            currentDragState.dragRoots.join(','),
            Array.from(currentDragState.draggedSubtreeNodeIds).sort().join(','),
            Array.from(currentDragState.blockedDropNodeIds ?? []).sort().join(','),
          ].join(':')
        : 'drag:none';
      const baseSignature = [
        c.width,
        c.height,
        cam.scale.toFixed(4),
        cam.tx.toFixed(2),
        cam.ty.toFixed(2),
        editingNodeId?.value ?? '',
        String(relationCacheVersion?.value ?? 0),
        roughStyle.themeSignature,
        dragBaseSignature,
      ].join('|');
    const baseCanvas = ensureBaseCanvas(basePaddingX, basePaddingY);
    const canUseZoomPreviewBase =
      isZoomPreviewActive &&
      !!baseCanvas &&
      !baseCache.dirty &&
      baseCache.worldBoxesRef === nodeWorldBoxes &&
      !!baseCache.cameraSnapshot &&
      !!baseCache.coverageWorldRect &&
      rectContains(baseCache.coverageWorldRect, worldViewportRect);
    const shouldRedrawBase =
      !canUseZoomPreviewBase &&
      (
        !baseCanvas ||
        baseCache.dirty ||
        baseCache.signature !== baseSignature ||
        baseCache.worldBoxesRef !== nodeWorldBoxes
      );

    if (shouldRedrawBase) {
      const targetCanvas = baseCanvas ?? c;
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) {
        const baseQueryViewportRect = interactiveViewportExpansionX > 0
          ? {
            x1: baseWorldViewportRect.x1 - interactiveViewportExpansionX,
            y1: baseWorldViewportRect.y1,
            x2: baseWorldViewportRect.x2 + interactiveViewportExpansionX,
            y2: baseWorldViewportRect.y2,
          }
          : baseWorldViewportRect;
        const baseScene = basePaddingX || basePaddingY
          ? collectVisibleScene(baseWorldViewportRect, baseQueryViewportRect)
          : {
            visibleEdgeGroups,
            visibleRelationGeoms,
            visibleIds,
          };
        if (roughRequested) {
          syncRoughRuntime(roughRuntime, targetCanvas);
        }
        drawBaseScene(
          targetCtx,
          baseScene.visibleEdgeGroups,
          baseScene.visibleIds,
          baseScene.visibleRelationGeoms,
          basePaddingX,
          basePaddingY
        );
        if (baseCanvas) {
          baseCache.signature = baseSignature;
          baseCache.worldBoxesRef = nodeWorldBoxes;
          baseCache.cameraSnapshot = { ...cam };
          baseCache.paddingX = basePaddingX;
          baseCache.paddingY = basePaddingY;
          baseCache.coverageWorldRect = baseWorldViewportRect;
          baseCache.dirty = false;
        }
      }
    }

    if (baseCanvas) {
      if (canUseZoomPreviewBase && baseCache.cameraSnapshot) {
        drawZoomPreviewScene(
          ctx,
          baseCanvas,
          baseCache.cameraSnapshot,
          cam,
          baseCache.paddingX,
          baseCache.paddingY
        );
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(baseCanvas, -baseCache.paddingX * dpr, -baseCache.paddingY * dpr);
      }
      applyScreenTransform(ctx, dpr);
    }

    if (DEBUG_CANVAS_OVERLAY) {
      const overlapWorld = roughStyle.overlapPx / Math.max(cam.scale, 0.0001);
      ctx.save();
      applyWorldTransform(ctx, cam, dpr);
      drawEdgeDebugOverlay(ctx, cam, visibleEdgeGroups, roughEnabled, overlapWorld);
      ctx.restore();
    }

    if (roughEnabled) {
      syncRoughRuntime(roughRuntime, c);
    }
    ctx.save();
    applyWorldTransform(ctx, cam, dpr);
    const activePreviewDeltaX = activeEditingWidthPreview?.deltaX ?? 0;
    if (activeEditingWidthPreview && Math.abs(activePreviewDeltaX) > 0.01) {
      const previewPadding = (SELECTED_OUTLINE_OFFSET_PX + 2) / Math.max(cam.scale, 0.0001);
      for (const edgeGroup of visibleEdgeGroups) {
        if (!activeEditingWidthPreview.affectedParentIds.has(edgeGroup.geom.parentId)) continue;
        const translatedBBox: WorldRect = {
          x1: edgeGroup.geom.bbox.x1 + activePreviewDeltaX,
          y1: edgeGroup.geom.bbox.y1,
          x2: edgeGroup.geom.bbox.x2 + activePreviewDeltaX,
          y2: edgeGroup.geom.bbox.y2,
        };
        const clearRect = expandRect(mergeRects(edgeGroup.geom.bbox, translatedBBox), previewPadding);
        ctx.fillStyle = roughStyle.colors.background;
        ctx.fillRect(clearRect.x1, clearRect.y1, rectWidth(clearRect), rectHeight(clearRect));
        drawVisibleEdgeGroup(ctx, edgeGroup, { translateX: activePreviewDeltaX, collectStats: false });
      }
    }
    for (const relationGeom of visibleRelationGeoms) {
      const isSelected = !!allRelationsSelected?.value || selectedRelationId?.value === relationGeom.relationId;
      const isHover = hoverRelationId?.value === relationGeom.relationId;
      if (!isSelected && !isHover) continue;
      const strokeStyle = isSelected ? roughStyle.colors.selection.stroke : roughStyle.colors.hover.stroke;
      drawRelationPath(ctx, relationGeom, {
        strokeStyle,
        lineWidth: isSelected ? 3 : 2.4,
        dashed: true,
        arrow: true,
      });
      if (isSelected) drawRelationHandles(ctx, relationGeom, strokeStyle);
    }
    if (relationDraft?.value?.active && relationDraft.value.fromNodeId) {
      const draftPreview = buildRelationDraftPreview(
        nodeWorldBoxes,
        nodes,
        relationDraft.value.fromNodeId,
        {
          x: (relationDraft.value.cursorScreenX - cam.tx) / Math.max(cam.scale, 0.0001),
          y: (relationDraft.value.cursorScreenY - cam.ty) / Math.max(cam.scale, 0.0001),
        },
        relationDraft.value.hoverTargetNodeId
      );
      if (draftPreview) {
        ctx.save();
        ctx.strokeStyle = relationDraft.value.hoverTargetNodeId
          ? roughStyle.colors.selection.stroke
          : multiplyColorAlpha(roughStyle.colors.selection.stroke, 0.7);
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([7, 5]);
        ctx.stroke(draftPreview.path);
        if (draftPreview.samplePoints.length >= 2) {
          const endPoint = draftPreview.endPoint;
          const previousPoint = draftPreview.samplePoints[draftPreview.samplePoints.length - 2];
          const angle = Math.atan2(endPoint.y - previousPoint.y, endPoint.x - previousPoint.x);
          const arrowLength = 10;
          const arrowSpread = Math.PI / 7;
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.moveTo(endPoint.x, endPoint.y);
          ctx.lineTo(
            endPoint.x - Math.cos(angle - arrowSpread) * arrowLength,
            endPoint.y - Math.sin(angle - arrowSpread) * arrowLength
          );
          ctx.lineTo(
            endPoint.x - Math.cos(angle + arrowSpread) * arrowLength,
            endPoint.y - Math.sin(angle + arrowSpread) * arrowLength
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
    const overlayNodeIds = new Set<string>();
    if (hoverNodeId.value) overlayNodeIds.add(hoverNodeId.value);
    if (selectedIds.value.size <= BULK_SELECTION_OVERLAY_LIMIT) {
      for (const id of selectedIds.value) overlayNodeIds.add(id);
    } else {
      const visibleSelectedCandidateIds = spatialIndex.queryRect(worldViewportRect);
      let addedSelectedCount = 0;
      for (const id of visibleSelectedCandidateIds) {
        if (!selectedIds.value.has(id)) continue;
        overlayNodeIds.add(id);
        addedSelectedCount += 1;
        if (addedSelectedCount >= BULK_SELECTION_OVERLAY_LIMIT) break;
      }
      if (!addedSelectedCount && primarySelectedNodeId?.value && selectedIds.value.has(primarySelectedNodeId.value)) {
        overlayNodeIds.add(primarySelectedNodeId.value);
      }
    }
    if (imageInteraction?.value?.nodeId) overlayNodeIds.add(imageInteraction.value.nodeId);
    if (editingNodeId?.value) overlayNodeIds.add(editingNodeId.value);
    if (activeEditingWidthPreview && Math.abs(activePreviewDeltaX) > 0.01) {
      for (const id of activeEditingWidthPreview.subtreeNodeIds) overlayNodeIds.add(id);
    }
    const summaryOutlineNodeIds = new Set<string>();
    if (hoverNodeId.value && nodes[hoverNodeId.value]?.nodeKind === 'summary') {
      summaryOutlineNodeIds.add(hoverNodeId.value);
    }
    if (selectedIds.value.size <= BULK_SELECTION_OVERLAY_LIMIT) {
      for (const id of selectedIds.value) {
        if (nodes[id]?.nodeKind === 'summary') summaryOutlineNodeIds.add(id);
      }
    }
    for (const id of overlayNodeIds) {
      const rect = nodeWorldBoxes.get(id);
      if (!rect) continue;
      const interactiveRect = getInteractiveNodeRect?.(id, rect) ?? rect;
      if (!rectIntersects(worldViewportRect, interactiveRect)) continue;
      const node = nodes[id];
      if (!node) continue;
      const bodyRect = getNodeBodyWorldRect(node, interactiveRect);
      const isHover = id === hoverNodeId.value;
      const isSelected = selectedIds.value.has(id);
      const imageState = imageInteraction?.value?.nodeId === id ? imageInteraction.value : null;
      const nodeWidthState = nodeWidthInteraction?.value?.nodeId === id ? nodeWidthInteraction.value : null;
      const showImageAffordance = !editingNodeId?.value && !!imageState && primarySelectedNodeId?.value === id && isSelected;
      const showNodeWidthAffordance = !editingNodeId?.value && primarySelectedNodeId?.value === id && isSelected;
      const isEditingPreview = editingNodeId?.value === id;
      const isWidthPreviewNode =
        !!activeEditingWidthPreview &&
        Math.abs(activePreviewDeltaX) > 0.01 &&
        activeEditingWidthPreview.subtreeNodeIds.has(id);
      if (!isHover && !isSelected && !showImageAffordance && !showNodeWidthAffordance && !isEditingPreview && !isWidthPreviewNode) continue;
      if (isEditingPreview) {
        drawVisibleNode(ctx, id, interactiveRect, { skipText: true });
      } else if (isWidthPreviewNode) {
        const previewEraseRect = expandRect(
          rect,
          (SELECTED_OUTLINE_OFFSET_PX + 2) / Math.max(cam.scale, 0.0001)
        );
        drawVisibleNode(ctx, id, interactiveRect, { clearRect: previewEraseRect });
      }

      const nodeWidthPreviewRect = nodeWidthState?.previewBodyRect ?? {
        x: bodyRect.x1,
        y: bodyRect.y1,
        width: rectWidth(bodyRect),
        height: rectHeight(bodyRect),
      };
      const baseOutlineRect = showNodeWidthAffordance
        ? {
          x1: nodeWidthPreviewRect.x,
          y1: nodeWidthPreviewRect.y,
          x2: nodeWidthPreviewRect.x + nodeWidthPreviewRect.width,
          y2: nodeWidthPreviewRect.y + nodeWidthPreviewRect.height,
        }
        : bodyRect;
      const outlineRect = expandRect(baseOutlineRect, HOVER_OUTLINE_OFFSET_PX / cam.scale);

      if (isSelected) {
        drawRoundedRectOutline(
          ctx,
          outlineRect,
          getNodeCornerRadius(outlineRect),
          roughStyle.colors.selection.stroke,
          2 / cam.scale
        );
      } else if (isHover) {
        drawRoundedRectOutline(
          ctx,
          outlineRect,
          getNodeCornerRadius(outlineRect),
          roughStyle.colors.hover.stroke,
          2 / cam.scale
        );
      }
      if (showImageAffordance) {
        const visualLayout = measureNodeVisualLayout(ctx, node, drawTextCache, { doc: props.doc, nodeId: id, collapseEmptyText: true });
        const imageSize =
          imageState?.previewSize ?? {
            w: visualLayout.image.width,
            h: visualLayout.image.height,
          };
        const imgMarkerIW = visualLayout.markerInlineWidth;
        const imgContentRect = imgMarkerIW > 0
          ? { x1: bodyRect.x1 + imgMarkerIW, y1: bodyRect.y1, x2: bodyRect.x2, y2: bodyRect.y2 }
          : bodyRect;
        const imageRect = getNodeImageWorldRect(imgContentRect, imageSize);
        if (imageRect) {
          const imageOutlineGapWorld = IMAGE_OUTLINE_GAP_PX / Math.max(cam.scale, 0.0001);
          const imageOutlineRadiusWorld = IMAGE_OUTLINE_RADIUS_PX / Math.max(cam.scale, 0.0001);
          const overlayRect = inflateImageWorldRect(imageRect, imageOutlineGapWorld);
          const overlayFill = 'rgba(96, 165, 250, 0.12)';
          if (imageState.selected) {
            drawImageRectOutline(
              ctx,
              overlayRect,
              imageOutlineRadiusWorld,
              overlayFill,
              roughStyle.colors.selection.stroke,
              2 / cam.scale
            );
            drawImageHandles(ctx, overlayRect, cam, roughStyle.colors.selection.stroke);
          } else if (imageState.hovered && !imageState.resizing) {
            drawImageRectOutline(
              ctx,
              overlayRect,
              imageOutlineRadiusWorld,
              overlayFill,
              roughStyle.colors.hover.stroke,
              2 / cam.scale
            );
          }
        }
      }
      const hoveredMarkerEntry = hoveredMarker.value;
      const hoveredMarkerIndex = isHover && hoveredMarkerEntry?.nodeId === id ? hoveredMarkerEntry.index : -1;
      if (hoveredMarkerIndex >= 0) {
        drawHoveredNodeMarker(ctx, node, bodyRect, getLoadedNodeImage, hoveredMarkerIndex);
      }
    }
    for (const summaryNodeId of summaryOutlineNodeIds) {
      const rangeRect = resolveSummaryRangeOutlineRect(summaryNodeId);
      if (!rangeRect) continue;
      const isSelected = selectedIds.value.has(summaryNodeId);
      const isHover = summaryNodeId === hoverNodeId.value;
      if (!isSelected && !isHover) continue;
      const outlineRect = expandRect(
        rangeRect,
        (isSelected ? SELECTED_OUTLINE_OFFSET_PX : HOVER_OUTLINE_OFFSET_PX) / Math.max(cam.scale, 0.0001)
      );
      if (!rectIntersects(worldViewportRect, outlineRect)) continue;
      drawRoundedRectOutline(
        ctx,
        outlineRect,
        getNodeCornerRadius(outlineRect),
        isSelected ? roughStyle.colors.selection.stroke : roughStyle.colors.hover.stroke,
        2 / Math.max(cam.scale, 0.0001)
      );
    }
    if (currentDragState?.isDragging && currentDragState.blockedDropNodeIds?.size) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      for (const nodeId of currentDragState.blockedDropNodeIds) {
        const node = nodes[nodeId];
        const rect = nodeWorldBoxes.get(nodeId);
        if (!node || !rect || !rectIntersects(worldViewportRect, rect)) continue;
        const bodyRect = getNodeBodyWorldRect(node, rect);
        drawRoundedRectShape(
          ctx,
          bodyRect,
          getNodeCornerRadius(bodyRect),
          'rgba(255, 255, 255, 0.42)',
          'rgba(255, 255, 255, 0)',
          0
        );
      }
      ctx.restore();
    }
    drawCollapseTags(
      ctx,
      collapseTags.value,
      collapseTagActiveNodeIds.value,
      collapseTagHoverNodeId.value,
      currentDragState?.isDragging
        ? new Set([
            ...currentDragState.dragRoots,
            ...Array.from(currentDragState.draggedSubtreeNodeIds),
            ...Array.from(currentDragState.blockedDropNodeIds ?? []),
          ])
        : null
    );
    ctx.restore();
    drawMarqueeOverlay(
      ctx,
      marqueeRectScreen.value,
      dpr,
      roughStyle.colors.marquee.stroke,
      roughStyle.colors.marquee.fill
    );
    drawDragOverlay(ctx, cam, currentDragState, d, nodeWorldBoxes, nodes, drawVisibleNode);

    const drawEnd = performance.now();
    sampleRoughCacheStats(roughRuntime, drawEnd);
    fpsFrameCount += 1;
    if (drawEnd - fpsWindowStart >= 1000) {
      currentFps = (fpsFrameCount * 1000) / (drawEnd - fpsWindowStart);
      fpsFrameCount = 0;
      fpsWindowStart = drawEnd;
    }
    drawStats.value = {
      ...drawStats.value,
      edgesDrawnParents,
      branchesDrawn,
      roundedBranchesCount,
      straightBranchesCount,
      degeneratedBranchesCount,
      minBranchLen: Number.isFinite(minBranchLen) ? minBranchLen : 0,
      maxBranchLen: Number.isFinite(maxBranchLen) ? maxBranchLen : 0,
      roughRequested,
      roughEnabled,
      roughFallbackReason,
      roughNodeCacheSize: roughRuntime.nodeDrawables.size,
      roughEdgeCacheSize: roughRuntime.edgeDrawables.size,
      roughNodeCacheHits: roughRuntime.sampledNodeHits,
      roughNodeCacheMisses: roughRuntime.sampledNodeMisses,
      roughEdgeCacheHits: roughRuntime.sampledEdgeHits,
      roughEdgeCacheMisses: roughRuntime.sampledEdgeMisses,
      drawDurationMs: drawEnd - drawStart,
      fps: currentFps,
    };

    if (DEBUG_CANVAS_OVERLAY) {
      const nextEdgeSignature = [
        drawStats.value.parentsWithEdges,
        drawStats.value.totalChildrenEdges,
        edgesDrawnParents,
        branchesDrawn,
        roundedBranchesCount,
        straightBranchesCount,
        degeneratedBranchesCount,
        drawStats.value.minBranchLen.toFixed(1),
        drawStats.value.maxBranchLen.toFixed(1),
        drawStats.value.edgeCacheSize,
        drawStats.value.edgeCacheBuildMs.toFixed(2),
      ].join('|');
      if (nextEdgeSignature !== lastEdgeLogSignature) {
        lastEdgeLogSignature = nextEdgeSignature;
        console.debug('[mind-edges]', {
          parentsWithEdges: drawStats.value.parentsWithEdges,
          totalChildrenEdges: drawStats.value.totalChildrenEdges,
          edgesDrawnParents,
          branchesDrawn,
          roundedBranchesCount,
          straightBranchesCount,
          degeneratedBranchesCount,
          alignedStraightCount: drawStats.value.alignedStraightCount,
          upRoundedCount: drawStats.value.upRoundedCount,
          downRoundedCount: drawStats.value.downRoundedCount,
          alignedMultiCount: drawStats.value.alignedMultiCount,
          nonAlignedRoundedCount: drawStats.value.nonAlignedRoundedCount,
          nonAlignedDegeneratedCount: drawStats.value.nonAlignedDegeneratedCount,
          minBranchLen: Number(drawStats.value.minBranchLen.toFixed(2)),
          maxBranchLen: Number(drawStats.value.maxBranchLen.toFixed(2)),
          trunkStubRange: drawStats.value.trunkStubLabel,
          roundRadiusRange: drawStats.value.roundRadiusLabel,
          childInset: drawStats.value.childInset,
          trunkShrinkAppliedCount: drawStats.value.trunkShrinkAppliedCount,
          trunkOverhangDetectedCount: drawStats.value.trunkOverhangDetectedCount,
          roughRequested: drawStats.value.roughRequested,
          roughEnabled: drawStats.value.roughEnabled,
          roughFallbackReason: drawStats.value.roughFallbackReason,
          roughPresetName: drawStats.value.roughPresetName,
          roughness: drawStats.value.roughness,
          bowing: drawStats.value.bowing,
          strokeWidthPx: drawStats.value.strokeWidthPx,
          overlapPx: drawStats.value.overlapPx,
          disableMultiStroke: drawStats.value.disableMultiStroke,
          roughNodeCacheSize: drawStats.value.roughNodeCacheSize,
          roughEdgeCacheSize: drawStats.value.roughEdgeCacheSize,
          roughNodeCacheHits: drawStats.value.roughNodeCacheHits,
          roughNodeCacheMisses: drawStats.value.roughNodeCacheMisses,
          roughEdgeCacheHits: drawStats.value.roughEdgeCacheHits,
          roughEdgeCacheMisses: drawStats.value.roughEdgeCacheMisses,
          edgeCacheSize: drawStats.value.edgeCacheSize,
          edgeCacheBuildMs: Number(drawStats.value.edgeCacheBuildMs.toFixed(2)),
        });
      }
    }

    drawDebugHud(ctx, cam, spatialIndex, drawStats.value, dpr);
  }

  return { draw, drawStats };
}
function drawDragOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dragState: DragDropState | undefined,
  doc: any,
  nodeWorldBoxes: WorldBoxes,
  nodes: Record<string, any>,
  drawDraggedNode: (
    targetCtx: CanvasRenderingContext2D,
    id: string,
    rect: WorldRect,
    options?: { skipText?: boolean; clearRect?: WorldRect | null; isDraggedGhost?: boolean; draggedGhostAlpha?: number }
  ) => void
) {
  if (!dragState?.isDragging) return;
  const draggedRootIds = Array.from(new Set(dragState.dragRoots))
    .filter((nodeId) => !!nodes[nodeId] && !!nodeWorldBoxes.get(nodeId))
    .sort((a, b) => {
      const rectA = nodeWorldBoxes.get(a);
      const rectB = nodeWorldBoxes.get(b);
      if (!rectA || !rectB) return 0;
      return rectA.y1 - rectB.y1 || rectA.x1 - rectB.x1;
    });
  if (draggedRootIds.length && (dragState.previewWorldOffsetX !== 0 || dragState.previewWorldOffsetY !== 0)) {
    ctx.save();
    applyWorldTransform(ctx, cam, getCanvasDevicePixelRatio(ctx.canvas));
    draggedRootIds.forEach((nodeId) => {
      const rect = nodeWorldBoxes.get(nodeId);
      if (!rect) return;
      drawDraggedNode(ctx, nodeId, {
        x1: rect.x1 + dragState.previewWorldOffsetX,
        y1: rect.y1 + dragState.previewWorldOffsetY,
        x2: rect.x2 + dragState.previewWorldOffsetX,
        y2: rect.y2 + dragState.previewWorldOffsetY,
      }, {
        isDraggedGhost: true,
        draggedGhostAlpha: 0.58,
      });
    });
    ctx.restore();
  }

  const canUseLastValidTarget =
    dragState.dragKind !== 'free-root' &&
    !dragState.dropTarget &&
    !!dragState.lastValidDropTarget &&
    (!dragState.invalidReason || dragState.invalidReason === 'pointerStateLost');
  const target = dragState.dropTarget ?? (canUseLastValidTarget ? dragState.lastValidDropTarget : null);
  if (target && dragState.rootId) {
    const previewGeometry = buildPreviewGeometry({
      doc,
      worldBoxes: nodeWorldBoxes,
      dropTarget: target,
      rootId: dragState.rootId,
      previewWidth: 50,
      previewHeight: 19,
    });
    if (previewGeometry) {
      ctx.save();
      applyWorldTransform(ctx, cam, getCanvasDevicePixelRatio(ctx.canvas));
      ctx.strokeStyle = 'rgb(22, 163, 74)';
      ctx.fillStyle = 'rgb(34, 197, 94)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (previewGeometry.previewPath) ctx.stroke(previewGeometry.previewPath);
      drawRoundedRectShape(
        ctx,
        previewGeometry.previewRect,
        Math.min(
          8,
          (previewGeometry.previewRect.y2 - previewGeometry.previewRect.y1) / 2
        ),
        'rgb(34, 197, 94)',
        'rgb(22, 163, 74)',
        2
      );
      ctx.restore();
    }
  }

}
