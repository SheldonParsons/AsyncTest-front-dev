import type { WorldRect } from './geom/rect';
import { NODE_TEXT_INSET_Y } from './textLayout';

export type ImageResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export type ImageSize = {
  w: number;
  h: number;
};

export type ImageWorldRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageInteractionState = {
  nodeId: string;
  hovered: boolean;
  selected: boolean;
  resizing: boolean;
  handle: ImageResizeHandle | null;
  pointerId: number | null;
  startPointer: { xScreen: number; yScreen: number };
  startSize: ImageSize;
  previewSize: ImageSize | null;
};

export const IMAGE_HANDLE_SIZE_PX = 10;
export const IMAGE_RESIZE_MIN_PX = 20;
export const IMAGE_RESIZE_MAX_PX = 450;
export const IMAGE_OUTLINE_GAP_PX = 4;
export const IMAGE_OUTLINE_RADIUS_PX = 8;

function rectWidth(rect: WorldRect) {
  return rect.x2 - rect.x1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getNodeImageWorldRect(nodeRect: WorldRect, size: ImageSize | null | undefined): ImageWorldRect | null {
  if (!size || size.w <= 0 || size.h <= 0) return null;
  return {
    x: nodeRect.x1 + (rectWidth(nodeRect) - size.w) / 2,
    y: nodeRect.y1 + NODE_TEXT_INSET_Y,
    width: size.w,
    height: size.h,
  };
}

export function inflateImageWorldRect(imageRect: ImageWorldRect, amountWorld: number): ImageWorldRect {
  return {
    x: imageRect.x - amountWorld,
    y: imageRect.y - amountWorld,
    width: imageRect.width + amountWorld * 2,
    height: imageRect.height + amountWorld * 2,
  };
}

export function pointInImageWorldRect(xWorld: number, yWorld: number, rect: ImageWorldRect | null) {
  if (!rect) return false;
  return (
    xWorld >= rect.x &&
    xWorld <= rect.x + rect.width &&
    yWorld >= rect.y &&
    yWorld <= rect.y + rect.height
  );
}

export function getImageHandleWorldRects(
  imageRect: ImageWorldRect,
  cameraScale: number,
  handleSizePx = IMAGE_HANDLE_SIZE_PX
) {
  const sizeWorld = handleSizePx / Math.max(cameraScale, 0.0001);
  const half = sizeWorld / 2;
  const corners = {
    nw: { x: imageRect.x, y: imageRect.y },
    ne: { x: imageRect.x + imageRect.width, y: imageRect.y },
    sw: { x: imageRect.x, y: imageRect.y + imageRect.height },
    se: { x: imageRect.x + imageRect.width, y: imageRect.y + imageRect.height },
  } satisfies Record<ImageResizeHandle, { x: number; y: number }>;

  return {
    nw: { x: corners.nw.x - half, y: corners.nw.y - half, width: sizeWorld, height: sizeWorld },
    ne: { x: corners.ne.x - half, y: corners.ne.y - half, width: sizeWorld, height: sizeWorld },
    sw: { x: corners.sw.x - half, y: corners.sw.y - half, width: sizeWorld, height: sizeWorld },
    se: { x: corners.se.x - half, y: corners.se.y - half, width: sizeWorld, height: sizeWorld },
  } satisfies Record<ImageResizeHandle, ImageWorldRect>;
}

export function getResizeCursor(handle: ImageResizeHandle) {
  return handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize';
}

export function hitTestImageHandle(
  xWorld: number,
  yWorld: number,
  imageRect: ImageWorldRect,
  cameraScale: number,
  handleSizePx = IMAGE_HANDLE_SIZE_PX
): ImageResizeHandle | null {
  const handleRects = getImageHandleWorldRects(imageRect, cameraScale, handleSizePx);
  const orderedHandles: ImageResizeHandle[] = ['nw', 'ne', 'sw', 'se'];
  for (const handle of orderedHandles) {
    if (pointInImageWorldRect(xWorld, yWorld, handleRects[handle])) return handle;
  }
  return null;
}

export function clampImageSize(size: ImageSize, min = IMAGE_RESIZE_MIN_PX, max = IMAGE_RESIZE_MAX_PX): ImageSize {
  return {
    w: clamp(size.w, min, max),
    h: clamp(size.h, min, max),
  };
}

export function computeImagePreviewSize(options: {
  handle: ImageResizeHandle;
  startSize: ImageSize;
  deltaScreenX: number;
  deltaScreenY: number;
  cameraScale: number;
  minPx?: number;
  maxPx?: number;
}): ImageSize {
  const { handle, startSize, deltaScreenX, deltaScreenY, cameraScale } = options;
  const minPx = options.minPx ?? IMAGE_RESIZE_MIN_PX;
  const maxPx = options.maxPx ?? IMAGE_RESIZE_MAX_PX;
  const aspect = startSize.w / Math.max(startSize.h, 0.0001);
  const dxWorld = deltaScreenX / Math.max(cameraScale, 0.0001);
  const dyWorld = deltaScreenY / Math.max(cameraScale, 0.0001);
  const signedDx = (handle === 'ne' || handle === 'se' ? 1 : -1) * dxWorld;
  const signedDy = (handle === 'sw' || handle === 'se' ? 1 : -1) * dyWorld;
  const scaleFromX = (startSize.w + signedDx) / Math.max(startSize.w, 0.0001);
  const scaleFromY = (startSize.h + signedDy) / Math.max(startSize.h, 0.0001);
  const dominantScale =
    Math.abs(scaleFromX - 1) >= Math.abs(scaleFromY - 1) ? scaleFromX : scaleFromY;
  const minScale = Math.max(minPx / Math.max(startSize.w, 0.0001), minPx / Math.max(startSize.h, 0.0001));
  const maxScale = Math.min(maxPx / Math.max(startSize.w, 0.0001), maxPx / Math.max(startSize.h, 0.0001));
  const scale = clamp(Number.isFinite(dominantScale) ? dominantScale : 1, minScale, maxScale);
  return clampImageSize(
    {
      w: startSize.w * scale,
      h: (startSize.w * scale) / Math.max(aspect, 0.0001),
    },
    minPx,
    maxPx
  );
}
