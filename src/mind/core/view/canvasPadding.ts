export type BoundsLike = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export const CANVAS_PAD_SCREEN_PX = 900;
export const CANVAS_PAD_WORLD_MIN = 300;
export const CANVAS_PAD_WORLD_MAX = 5000;
export const FIT_TO_CONTENT_INCLUDE_PADDING = true;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeCanvasPaddingWorld(scale: number) {
  const safeScale = Math.max(scale, 0.0001);
  return clamp(CANVAS_PAD_SCREEN_PX / safeScale, CANVAS_PAD_WORLD_MIN, CANVAS_PAD_WORLD_MAX);
}

export function expandBounds<T extends BoundsLike>(bounds: T, padding: number): T {
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  const maxX = bounds.maxX + padding;
  const maxY = bounds.maxY + padding;
  return {
    ...bounds,
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

export function getPaddedBounds<T extends BoundsLike>(bounds: T, scale: number): T {
  return expandBounds(bounds, computeCanvasPaddingWorld(scale));
}

export function computeFitScaleWithCanvasPadding(
  bounds: BoundsLike,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
  maxScale: number,
  fitPaddingPx = 0
) {
  const safeViewportWidth = Math.max(1, viewportWidth - fitPaddingPx * 2);
  const safeViewportHeight = Math.max(1, viewportHeight - fitPaddingPx * 2);
  const screenInsetX = FIT_TO_CONTENT_INCLUDE_PADDING ? CANVAS_PAD_SCREEN_PX * 2 : 0;
  const screenInsetY = FIT_TO_CONTENT_INCLUDE_PADDING ? CANVAS_PAD_SCREEN_PX * 2 : 0;

  let scale = Math.min(
    1,
    Math.max(0.0001, (safeViewportWidth - screenInsetX) / Math.max(bounds.width, 1)),
    Math.max(0.0001, (safeViewportHeight - screenInsetY) / Math.max(bounds.height, 1))
  );
  scale = clamp(scale, minScale, maxScale);

  for (let i = 0; i < 3; i += 1) {
    const paddedBounds = getPaddedBounds(bounds, scale);
    scale = clamp(
      Math.min(
        1,
        safeViewportWidth / Math.max(paddedBounds.width, 1),
        safeViewportHeight / Math.max(paddedBounds.height, 1)
      ),
      minScale,
      maxScale
    );
  }

  return scale;
}
