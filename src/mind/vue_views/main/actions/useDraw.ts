import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { InternalClipboardState } from '@/mind/core/clipboard';
import { getNodePlainText } from '@/mind/core/nodeContent';
import type { DragDropState } from '@/mind/core/drag/types';
import { buildPreviewGeometry } from '@/mind/core/dragDrop/previewGeometry';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { RoughGenerator } from 'roughjs/bin/generator';
import { ensureMindRoots } from './useDocUtils';
import type { Camera } from './useCamera';
import type { BranchMeta, ParentEdgeCacheStats, ParentEdgeGeom } from './useEdges';
import { DEBUG_SPATIAL, DEBUG_SPATIAL_LOG, DEBUG_SPATIAL_SHOW_CELL_COUNTS } from '../constants';
import {
  DEBUG_RENDER_DIAGNOSTICS,
  formatCamera,
  formatWorldRect,
  readRoughRenderFlag,
} from '../diagnostics';
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
  rectIntersects,
  worldToScreen,
  type WorldRect,
} from '../geom/rect';
import type { WorldBoxes } from '../geom/worldBoxes';
import type { UniformGridSpatialIndex } from '../grid/spatialIndex';
import type { ScreenRect } from './useMarquee';
import {
  getNodeTextStyle,
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
import { getInlineFont } from '@/mind/core/richText';
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
const DRAG_OVERLAY_MAX_WIDTH_PX = 500;
const DRAG_OVERLAY_ROOT_GAP_PX = 12;
const DRAG_OVERLAY_OFFSET_X_PX = 12;
const DRAG_OVERLAY_OFFSET_Y_PX = 12;

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
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.5 / Math.max(cam.scale, 0.0001);
  (Object.values(handleRects) as ImageWorldRect[]).forEach((handleRect) => {
    ctx.fillRect(handleRect.x, handleRect.y, handleRect.width, handleRect.height);
    ctx.strokeRect(handleRect.x, handleRect.y, handleRect.width, handleRect.height);
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
  fillStyle: string,
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
  if (!DEBUG_RENDER_DIAGNOSTICS) return;
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
  if (!DEBUG_RENDER_DIAGNOSTICS) return;

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
  rect: WorldRect
) {
  const radius = getNodeCornerRadius(rect);
  const pathData = createRoundedRectPathData(rect, radius);
  const cacheKey = `${nodeId}|style:base|box:${formatRectSignature(rect)}|r:${radius.toFixed(2)}|${style.themeSignature}|node-rough-v4`;
  const cached = runtime.nodeDrawables.get(cacheKey);
  if (cached) {
    runtime.nodeHits += 1;
    return cached;
  }
  runtime.nodeMisses += 1;
  const drawable = gen.path(pathData, {
    ...style.nodeOptions,
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
  parentEdgeGeoms: Ref<ParentEdgeGeom[]>,
  edgeStats: Ref<ParentEdgeCacheStats>,
  spatialIndex: UniformGridSpatialIndex,
  hoverNodeId: Ref<string | null>,
  selectedIds: Ref<Set<string>>,
  marqueeRectScreen: Ref<ScreenRect | null>,
  marqueeWorldRect: Ref<WorldRect | null>,
  dragState?: Ref<DragDropState>,
  editingNodeId?: Ref<string | null>,
  imageInteraction?: Ref<ImageInteractionState | null>,
  primarySelectedNodeId?: Ref<string | null>,
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
  }>
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
      if (!DEBUG_RENDER_DIAGNOSTICS) return;
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

    ensureMindRoots(d);
    const historySnapshot = getHistorySnapshot();
    const clipboardDebug = getClipboardDebugSnapshot();
    const currentDragState = dragState?.value;
    const roughStyle = getCurrentRoughTheme();
    const roughRequested = readRoughRenderFlag();
    if (lastRoughStyleSignature && lastRoughStyleSignature !== roughStyle.themeSignature) {
      roughRuntime.nodeDrawables.clear();
      roughRuntime.edgeDrawables.clear();
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

    const worldViewportRect = getWorldViewportRect(cam, viewportW, viewportH);
    const cellRange = spatialIndex.getCellRange(worldViewportRect);
    const candidateIds = spatialIndex.queryRect(worldViewportRect);
    const visibleIds: string[] = [];
    const falsePositiveIds: string[] = [];

    for (const id of candidateIds) {
      const rect = nodeWorldBoxes.get(id);
      if (!rect) continue;
      if (rectIntersects(worldViewportRect, rect)) {
        visibleIds.push(id);
      } else {
        falsePositiveIds.push(id);
      }
    }

    const visibleEdgeGroups: VisibleEdgeGroup[] = [];
    let visibleEdgeShapeCount = 0;
    for (const geom of parentEdgeGeoms.value) {
      if (!rectIntersects(geom.bbox, worldViewportRect)) continue;
      const branchEntries: VisibleEdgeGroup['branchEntries'] = [];
      for (const [childId, branchBBox] of geom.branchBBoxes.entries()) {
        if (!rectIntersects(branchBBox, worldViewportRect)) continue;
        const meta = geom.branchMeta.get(childId);
        if (!meta) continue;
        branchEntries.push({ childId, meta });
      }
      if (!branchEntries.length && !geom.trunkPathData) continue;
      visibleEdgeGroups.push({ geom, branchEntries });
      visibleEdgeShapeCount += branchEntries.length + (geom.trunkPathData ? 1 : 0);
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

    const nodes = d.mind.nodes || {};
    let edgesDrawnParents = 0;
    let branchesDrawn = 0;
    let roundedBranchesCount = 0;
    let straightBranchesCount = 0;
    let degeneratedBranchesCount = 0;
    let minBranchLen = Number.POSITIVE_INFINITY;
    let maxBranchLen = Number.NEGATIVE_INFINITY;

    ctx.save();
    applyWorldTransform(ctx, cam, dpr);
    const edgeLineWidth = roughStyle.strokeWidthPx / cam.scale;
    const trunkLineWidth = roughStyle.strokeWidthPx / cam.scale;
    const nodeLineWidth = roughStyle.strokeWidthPx / cam.scale;
    const overlapWorld = roughStyle.overlapPx / Math.max(cam.scale, 0.0001);
    ctx.strokeStyle = roughStyle.colors.edges.branchStroke;
    ctx.lineWidth = edgeLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const { geom, branchEntries } of visibleEdgeGroups) {
      const branchStroke = roughStyle.colors.edges.branchStroke;
      const trunkStroke = roughStyle.colors.edges.trunkStroke;
      ctx.strokeStyle = branchStroke;

      if (roughEnabled) {
        drawNativeSegment(ctx, geom.parentAnchor, geom.trunkJoin, trunkStroke, trunkLineWidth);
        drawNativeSegment(ctx, geom.trunkTop, geom.trunkBottom, trunkStroke, trunkLineWidth);
      } else if (geom.trunkPath) {
        ctx.strokeStyle = trunkStroke;
        ctx.stroke(geom.trunkPath);
      }

      let parentBranchCount = 0;
      for (const { childId, meta } of branchEntries) {
        if (roughEnabled && roughRuntime.rc && roughRuntime.gen) {
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
          roughRuntime.rc.draw(branchDrawable);
          drawRoundedSeamCap(ctx, meta, branchStroke, edgeLineWidth, overlapWorld);
        } else {
          const branchPath = geom.childBranchPaths.get(childId);
          if (!branchPath) continue;
          ctx.strokeStyle = branchStroke;
          ctx.stroke(branchPath);
        }
        parentBranchCount += 1;
        if (meta.rounded) roundedBranchesCount += 1;
        else straightBranchesCount += 1;
        if (meta.degenerated) degeneratedBranchesCount += 1;
        minBranchLen = Math.min(minBranchLen, meta.branchLen);
        maxBranchLen = Math.max(maxBranchLen, meta.branchLen);
      }

      edgesDrawnParents += 1;
      branchesDrawn += parentBranchCount;
    }

    ctx.font = NODE_FONT;
    ctx.textBaseline = 'top';

    if (DEBUG_RENDER_DIAGNOSTICS) {
      drawEdgeDebugOverlay(ctx, cam, visibleEdgeGroups, roughEnabled, overlapWorld);
    }

    ctx.font = NODE_FONT;
    ctx.textBaseline = 'top';

    for (const id of visibleIds) {
      const rect = nodeWorldBoxes.get(id);
      if (!rect) continue;
      const node = nodes[id];
      if (!node) continue;

      const isHover = id === hoverNodeId.value;
      const isSelected = selectedIds.value.has(id);
      const isDraggedGhost = currentDragState?.isDragging && currentDragState.draggedSubtreeNodeIds.has(id);
      const imageState = imageInteraction?.value?.nodeId === id ? imageInteraction.value : null;
      const showImageAffordance = !editingNodeId?.value && !!imageState && primarySelectedNodeId?.value === id && isSelected;

      const nodeFill = roughStyle.colors.node.fill;
      const nodeStroke = roughStyle.colors.node.stroke;
      const nodeCornerRadius = getNodeCornerRadius(rect);
      const hoverOutlineRect = expandRect(rect, HOVER_OUTLINE_OFFSET_PX / cam.scale);
      const selectedOutlineRect = expandRect(rect, SELECTED_OUTLINE_OFFSET_PX / cam.scale);
      ctx.save();
      if (isDraggedGhost) ctx.globalAlpha *= 0.35;
      ctx.fillStyle = nodeFill;
      ctx.strokeStyle = nodeStroke;
      ctx.lineWidth = nodeLineWidth;
      if (roughEnabled && roughRuntime.rc && roughRuntime.gen) {
        const nodeDrawable = getOrCreateNodeDrawable(roughRuntime, roughRuntime.gen, roughStyle, id, rect);
        nodeDrawable.options.fill = nodeFill;
        nodeDrawable.options.stroke = nodeStroke;
        nodeDrawable.options.strokeWidth = nodeLineWidth;
        roughRuntime.rc.draw(nodeDrawable);
      } else {
        drawRoundedRectShape(ctx, rect, nodeCornerRadius, nodeFill, nodeStroke, nodeLineWidth);
      }

      if (isSelected) {
        drawRoundedRectOutline(
          ctx,
          selectedOutlineRect,
          getNodeCornerRadius(selectedOutlineRect),
          roughStyle.colors.selection.stroke,
          2 / cam.scale
        );
      }

      if (isHover) {
        drawRoundedRectOutline(
          ctx,
          hoverOutlineRect,
          getNodeCornerRadius(hoverOutlineRect),
          roughStyle.colors.hover.stroke,
          2 / cam.scale
        );
      }

      const visualLayout = measureNodeVisualLayout(ctx, node, drawTextCache);
      const textStyle = getNodeTextStyle(node);
      if (visualLayout.image?.src) {
        const loadedImage = getLoadedNodeImage(visualLayout.image.src);
        if (loadedImage) {
          const imageSize =
            imageState?.previewSize ?? {
              w: visualLayout.image.width,
              h: visualLayout.image.height,
            };
          const imageRect = getNodeImageWorldRect(rect, imageSize);
          if (imageRect) {
            ctx.drawImage(loadedImage, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
            const imageOutlineGapWorld = IMAGE_OUTLINE_GAP_PX / Math.max(cam.scale, 0.0001);
            const imageOutlineRadiusWorld = IMAGE_OUTLINE_RADIUS_PX / Math.max(cam.scale, 0.0001);
            const overlayRect = inflateImageWorldRect(imageRect, imageOutlineGapWorld);
            const overlayFill = 'rgba(96, 165, 250, 0.12)';
            if (showImageAffordance && imageState.selected) {
              drawImageRectOutline(
                ctx,
                overlayRect,
                imageOutlineRadiusWorld,
                overlayFill,
                roughStyle.colors.selection.stroke,
                2 / cam.scale
              );
              drawImageHandles(ctx, overlayRect, cam, roughStyle.colors.selection.stroke);
            } else if (showImageAffordance && imageState.hovered && !imageState.resizing) {
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
      }
      if (editingNodeId?.value !== id) {
        ctx.textBaseline = 'top';
        let lineY = rect.y1 + visualLayout.textGeometry.textGlyphTop;
        const textRegionWidth = rectWidth(rect) - NODE_TEXT_INSET_X * 2;
        visualLayout.textLayout.richLines.forEach((line) => {
          const snappedLineY = snapWorldToDevicePixel(lineY, cam.scale, cam.ty, dpr);
          const effectiveAlign = line.align ?? textStyle.textAlign;
          const baseX =
            effectiveAlign === 'center'
              ? rect.x1 + NODE_TEXT_INSET_X + Math.max(0, (textRegionWidth - line.width) / 2)
              : effectiveAlign === 'right'
                ? rect.x2 - NODE_TEXT_INSET_X - line.width
                : rect.x1 + NODE_TEXT_INSET_X;
          let cursorX = baseX;
          for (const segment of line.segments) {
            ctx.font = segment.font || getInlineFont(segment.marks, NODE_DEFAULT_FONT_FAMILY, NODE_DEFAULT_FONT_SIZE);
            ctx.fillStyle = segment.color ?? textStyle.color;
            ctx.fillText(segment.text, cursorX, snappedLineY);
            if (segment.marks?.underline || segment.marks?.strike) {
              const width = ctx.measureText(segment.text).width;
              ctx.strokeStyle = segment.color ?? textStyle.color;
              ctx.lineWidth = 1;
              if (segment.marks.underline) {
                const underlineY = snapWorldToDevicePixel(
                  snappedLineY + segment.fontSize + 2,
                  cam.scale,
                  cam.ty,
                  dpr
                );
                ctx.beginPath();
                ctx.moveTo(cursorX, underlineY);
                ctx.lineTo(cursorX + width, underlineY);
                ctx.stroke();
              }
              if (segment.marks.strike) {
                const strikeY = snapWorldToDevicePixel(
                  snappedLineY + segment.fontSize * 0.58,
                  cam.scale,
                  cam.ty,
                  dpr
                );
                ctx.beginPath();
                ctx.moveTo(cursorX, strikeY);
                ctx.lineTo(cursorX + width, strikeY);
                ctx.stroke();
              }
            }
            cursorX += segment.width;
          }
          lineY += line.height;
        });
      }
      ctx.restore();
    }

    ctx.restore();
    drawMarqueeOverlay(
      ctx,
      marqueeRectScreen.value,
      dpr,
      roughStyle.colors.marquee.stroke,
      roughStyle.colors.marquee.fill
    );
    drawDragOverlay(ctx, cam, currentDragState, d, nodeWorldBoxes, nodes);

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

    if (DEBUG_RENDER_DIAGNOSTICS) {
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
  nodes: Record<string, any>
) {
  if (!dragState?.isDragging) return;

  const canUseLastValidTarget =
    !dragState.dropTarget &&
    !!dragState.lastValidDropTarget &&
    (!dragState.invalidReason ||
      dragState.invalidReason === 'tooFar' ||
      dragState.invalidReason === 'pointerStateLost');
  const target = dragState.dropTarget ?? (canUseLastValidTarget ? dragState.lastValidDropTarget : null);
  if (target && dragState.rootId) {
    const previewGeometry = buildPreviewGeometry({
      doc,
      worldBoxes: nodeWorldBoxes,
      dropTarget: target,
      rootId: dragState.rootId,
      previewWidth: 64 / Math.max(cam.scale, 0.0001),
      previewHeight: 24 / Math.max(cam.scale, 0.0001),
    });
    if (previewGeometry) {
      ctx.save();
      applyWorldTransform(ctx, cam, getCanvasDevicePixelRatio(ctx.canvas));
      ctx.strokeStyle = '#16a34a';
      ctx.fillStyle = '#22c55e';
      ctx.lineWidth = 2 / Math.max(cam.scale, 0.0001);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (previewGeometry.previewPath) ctx.stroke(previewGeometry.previewPath);
      drawRoundedRectShape(
        ctx,
        previewGeometry.previewRect,
        Math.min(
          8 / Math.max(cam.scale, 0.0001),
          (previewGeometry.previewRect.y2 - previewGeometry.previewRect.y1) / 2
        ),
        '#22c55e',
        '#16a34a',
        2 / Math.max(cam.scale, 0.0001)
      );
      ctx.restore();
    }
  }

  ctx.save();
  const dpr = getCanvasDevicePixelRatio(ctx.canvas);
  applyScreenTransform(ctx, dpr);
  ctx.font = NODE_FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#111827';
  const layouts =
    dragState.dragRootTextLayouts.length
      ? dragState.dragRootTextLayouts
      : [
          {
            nodeId: dragState.primaryDragRootId ?? '',
            text: getNodePlainText(nodes[dragState.primaryDragRootId ?? '']),
            lines: [getNodePlainText(nodes[dragState.primaryDragRootId ?? ''])],
            lineHeightPx: 18,
          },
        ];
  const startX = dragState.cursorScreenX + DRAG_OVERLAY_OFFSET_X_PX;
  let currentY = dragState.cursorScreenY + DRAG_OVERLAY_OFFSET_Y_PX;
  for (const layout of layouts) {
    for (const line of layout.lines) {
      ctx.fillText(line, startX, snapToDevicePixel(currentY, dpr), DRAG_OVERLAY_MAX_WIDTH_PX);
      currentY += layout.lineHeightPx;
    }
    currentY += DRAG_OVERLAY_ROOT_GAP_PX;
  }
  ctx.restore();
}
