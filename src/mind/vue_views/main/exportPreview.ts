import { ref } from 'vue';
import { getInlineFont } from '@/mind/core/richText';
import { ensureMindRoots } from './actions/useDocUtils';
import { useEdges } from './actions/useEdges';
import { useLayout, type Box, type LayoutBounds } from './actions/useLayout';
import { getNodeImageWorldRect } from './imageInteraction';
import { getNodeBodyWorldRect } from './nodeMarkers';
import { getMindNodeDefaultVisualStyle } from './nodeStyles';
import {
  getNodeTextStyle,
  measureNodeVisualLayout,
  NODE_DEFAULT_FONT_FAMILY,
  NODE_DEFAULT_FONT_SIZE,
  NODE_TEXT_INSET_X,
} from './textLayout';
import { boxToRect, type WorldRect } from './geom/rect';

const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 202;
const PREVIEW_DPR = 2;
const PREVIEW_PADDING = 20;
const PREVIEW_BACKGROUND = '#ffffff';
const NODE_CORNER_RADIUS = 10;
const MIN_PREVIEW_SCALE = 0.04;
const MAX_PREVIEW_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectWidth(rect: WorldRect) {
  return rect.x2 - rect.x1;
}

function rectHeight(rect: WorldRect) {
  return rect.y2 - rect.y1;
}

function getNodeCornerRadius(rect: WorldRect) {
  return Math.min(NODE_CORNER_RADIUS, rectWidth(rect) / 2, rectHeight(rect) / 2);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  radius: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
) {
  const width = rectWidth(rect);
  const height = rectHeight(rect);
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x1 + safeRadius, rect.y1);
  ctx.arcTo(rect.x2, rect.y1, rect.x2, rect.y2, safeRadius);
  ctx.arcTo(rect.x2, rect.y2, rect.x1, rect.y2, safeRadius);
  ctx.arcTo(rect.x1, rect.y2, rect.x1, rect.y1, safeRadius);
  ctx.arcTo(rect.x1, rect.y1, rect.x2, rect.y1, safeRadius);
  ctx.closePath();
  if (fillStyle && fillStyle !== 'rgba(0, 0, 0, 0)') {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && strokeStyle !== 'rgba(0, 0, 0, 0)' && lineWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function buildWorldBoxesForPreview(layoutLocal: Map<string, Box>) {
  const worldBoxes = new Map<string, WorldRect>();
  for (const [nodeId, box] of layoutLocal.entries()) {
    worldBoxes.set(nodeId, boxToRect(box));
  }
  return worldBoxes;
}

function mergeBounds(current: LayoutBounds | null, rect: WorldRect): LayoutBounds {
  const minX = current ? Math.min(current.minX, rect.x1) : rect.x1;
  const minY = current ? Math.min(current.minY, rect.y1) : rect.y1;
  const maxX = current ? Math.max(current.maxX, rect.x2) : rect.x2;
  const maxY = current ? Math.max(current.maxY, rect.y2) : rect.y2;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function computePreviewBounds(worldBoxes: Map<string, WorldRect>, edgeBBoxes: WorldRect[]) {
  let bounds: LayoutBounds | null = null;
  for (const rect of worldBoxes.values()) {
    bounds = mergeBounds(bounds, rect);
  }
  for (const rect of edgeBBoxes) {
    bounds = mergeBounds(bounds, rect);
  }
  return bounds;
}

function computePreviewCamera(bounds: LayoutBounds) {
  const availableWidth = Math.max(1, PREVIEW_WIDTH - PREVIEW_PADDING * 2);
  const availableHeight = Math.max(1, PREVIEW_HEIGHT - PREVIEW_PADDING * 2);
  const scale = clamp(
    Math.min(
      availableWidth / Math.max(bounds.width, 1),
      availableHeight / Math.max(bounds.height, 1)
    ),
    MIN_PREVIEW_SCALE,
    MAX_PREVIEW_SCALE
  );
  const tx = PREVIEW_PADDING + (availableWidth - bounds.width * scale) / 2 - bounds.minX * scale;
  const ty = PREVIEW_PADDING + (availableHeight - bounds.height * scale) / 2 - bounds.minY * scale;
  return { scale, tx, ty };
}

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function loadPreviewImages(doc: any) {
  const nodes = doc?.mind?.nodes ?? {};
  const sources = Array.from(
    new Set(
      Object.values(nodes)
        .map((node: any) => node?.image?.src)
        .filter((src): src is string => typeof src === 'string' && src.length > 0)
    )
  );
  const imageEntries = await Promise.all(
    sources.map(async (src) => [src, await loadImage(src)] as const)
  );
  return new Map(imageEntries.filter((entry): entry is readonly [string, HTMLImageElement] => !!entry[1]));
}

async function exportCanvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/png');
  });
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportMindPreviewPng(doc: any) {
  if (typeof document === 'undefined' || !doc?.mind?.nodes) return null;
  ensureMindRoots(doc);

  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH * PREVIEW_DPR;
  canvas.height = PREVIEW_HEIGHT * PREVIEW_DPR;
  canvas.style.width = `${PREVIEW_WIDTH}px`;
  canvas.style.height = `${PREVIEW_HEIGHT}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const canvasRef = ref<HTMLCanvasElement | null>(canvas);
  const { layoutLocal, rebuildLayout } = useLayout({ doc }, canvasRef);
  rebuildLayout();
  if (!layoutLocal.size) return null;

  const worldBoxes = buildWorldBoxesForPreview(layoutLocal);
  const { parentEdgeGeoms, rebuildEdgeCache } = useEdges();
  rebuildEdgeCache(doc, worldBoxes);
  const bounds = computePreviewBounds(
    worldBoxes,
    parentEdgeGeoms.value.map((geom) => geom.bbox)
  );
  if (!bounds) return null;

  const imageMap = await loadPreviewImages(doc);
  const { scale, tx, ty } = computePreviewCamera(bounds);

  ctx.setTransform(PREVIEW_DPR, 0, 0, PREVIEW_DPR, 0, 0);
  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  ctx.fillStyle = PREVIEW_BACKGROUND;
  ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const geom of parentEdgeGeoms.value) {
    const trunkStroke = '#111111';
    const branchStroke = '#111111';
    if (geom.trunkPath) {
      ctx.strokeStyle = trunkStroke;
      ctx.lineWidth = 1.4 / Math.max(scale, 0.0001);
      ctx.stroke(geom.trunkPath);
    }
    for (const branchPath of geom.childBranchPaths.values()) {
      ctx.strokeStyle = branchStroke;
      ctx.lineWidth = 1.4 / Math.max(scale, 0.0001);
      ctx.stroke(branchPath);
    }
  }

  const nodes = doc.mind.nodes ?? {};
  const textCache = new Map();
  for (const [nodeId, rect] of worldBoxes.entries()) {
    const node = nodes[nodeId];
    if (!node) continue;
    const bodyRect = getNodeBodyWorldRect(node, rect);
    const visual = getMindNodeDefaultVisualStyle(doc, nodeId);
    const fill = visual.fillPreset === 'none' ? 'rgba(0, 0, 0, 0)' : visual.fill;
    const stroke = visual.borderPreset === 'none' ? 'rgba(0, 0, 0, 0)' : visual.stroke;
    const lineWidth = visual.borderPreset === 'none' ? 0 : 1.2 / Math.max(scale, 0.0001);

    if (visual.borderPreset === 'rough-dashed') {
      ctx.save();
      ctx.setLineDash([6 / Math.max(scale, 0.0001), 5 / Math.max(scale, 0.0001)]);
      drawRoundedRect(ctx, bodyRect, getNodeCornerRadius(bodyRect), fill, stroke, lineWidth);
      ctx.restore();
    } else {
      drawRoundedRect(ctx, bodyRect, getNodeCornerRadius(bodyRect), fill, stroke, lineWidth);
    }

    const visualLayout = measureNodeVisualLayout(ctx, node, textCache, { doc, nodeId });
    if (visualLayout.image?.src) {
      const loadedImage = imageMap.get(visualLayout.image.src);
      const imageRect = loadedImage
        ? getNodeImageWorldRect(bodyRect, {
            w: visualLayout.image.width,
            h: visualLayout.image.height,
          })
        : null;
      if (loadedImage && imageRect) {
        ctx.drawImage(loadedImage, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
      }
    }

    const textStyle = getNodeTextStyle(node, { doc, nodeId });
    const textRegionWidth = rectWidth(bodyRect) - NODE_TEXT_INSET_X * 2;
    let lineY = bodyRect.y1 + visualLayout.textGeometry.textGlyphTop;
    ctx.textBaseline = 'top';
    for (const line of visualLayout.textLayout.richLines) {
      const effectiveAlign = line.align ?? textStyle.textAlign;
      const baseX =
        effectiveAlign === 'center'
          ? bodyRect.x1 + NODE_TEXT_INSET_X + Math.max(0, (textRegionWidth - line.width) / 2)
          : effectiveAlign === 'right'
            ? bodyRect.x2 - NODE_TEXT_INSET_X - line.width
            : bodyRect.x1 + NODE_TEXT_INSET_X;
      let cursorX = baseX;
      for (const segment of line.segments) {
        ctx.font =
          segment.font ||
          getInlineFont(
            segment.marks,
            NODE_DEFAULT_FONT_FAMILY,
            NODE_DEFAULT_FONT_SIZE,
            textStyle.fontWeight,
            textStyle.fontStyle
          );
        ctx.fillStyle = segment.color || textStyle.color;
        ctx.fillText(segment.text, cursorX, lineY);
        cursorX += segment.width;
      }
      lineY += line.height;
    }
  }

  ctx.restore();
  return await exportCanvasToPngBytes(canvas);
}
