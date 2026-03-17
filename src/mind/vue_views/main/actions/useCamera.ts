import type { Ref } from 'vue';
import { ref } from 'vue';
import {
  computeFitScaleWithCanvasPadding,
  getPaddedBounds,
} from '@/mind/core/view/canvasPadding';
import type { LayoutBounds } from './useLayout';

export type Camera = { scale: number; tx: number; ty: number };
export const MIN_CAMERA_SCALE = 0.05;
export const MAX_CAMERA_SCALE = 4;

const FIT_PADDING = 200;
const EDGE_PADDING = 360;
const EDGE_PADDING_RATIO = 0.3;
const SMALL_CONTENT_DRIFT = 420;
const SMALL_CONTENT_DRIFT_RATIO = 0.28;
const SMALL_CONTENT_DRIFT_BONUS_RATIO = 0.12;

export type CameraAxisConstraint = {
  minOffset: number;
  maxOffset: number;
  scaledSize: number;
  edgePadding: number;
  centered: boolean;
  centeredOffset: number;
};

export function getAxisConstraint(
  minWorld: number,
  maxWorld: number,
  viewportSize: number,
  scale: number
): CameraAxisConstraint {
  const worldSize = maxWorld - minWorld;
  const scaledSize = worldSize * scale;
  const centeredOffset = viewportSize / 2 - ((minWorld + maxWorld) / 2) * scale;
  const edgePadding = Math.min(EDGE_PADDING, viewportSize * EDGE_PADDING_RATIO);

  if (scaledSize + edgePadding * 2 <= viewportSize) {
    const spareSpace = Math.max(0, viewportSize - scaledSize);
    const centerDrift = Math.min(
      SMALL_CONTENT_DRIFT,
      spareSpace / 2 + viewportSize * SMALL_CONTENT_DRIFT_BONUS_RATIO,
      viewportSize * SMALL_CONTENT_DRIFT_RATIO
    );
    return {
      minOffset: centeredOffset - centerDrift,
      maxOffset: centeredOffset + centerDrift,
      scaledSize,
      edgePadding,
      centered: true,
      centeredOffset,
    };
  }

  const overflow = Math.max(0, scaledSize - viewportSize);
  const panExtent = overflow / 2 + edgePadding;

  return {
    minOffset: centeredOffset - panExtent,
    maxOffset: centeredOffset + panExtent,
    scaledSize,
    edgePadding,
    centered: false,
    centeredOffset,
  };
}

export function useCamera(
  viewportRef: Ref<HTMLDivElement | null>,
  layoutBounds: Ref<LayoutBounds | null>
) {
  const camera = ref<Camera>({ scale: 1, tx: 0, ty: 0 });

  function clampScale(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
  }

  function getMinCameraScale(bounds = layoutBounds.value) {
    const vp = viewportRef.value;
    if (!vp || !bounds) return MIN_CAMERA_SCALE;
    return Math.min(
      MIN_CAMERA_SCALE,
      computeFitScaleWithCanvasPadding(bounds, vp.clientWidth, vp.clientHeight, MIN_CAMERA_SCALE, 1, FIT_PADDING)
    );
  }

  function getPaddedLayoutBounds(bounds = layoutBounds.value, scale = camera.value.scale) {
    if (!bounds) return null;
    return getPaddedBounds(bounds, scale);
  }

  function clampOffset(
    minWorld: number,
    maxWorld: number,
    viewportSize: number,
    scale: number,
    offset: number
  ) {
    const constraint = getAxisConstraint(minWorld, maxWorld, viewportSize, scale);
    return Math.min(constraint.maxOffset, Math.max(constraint.minOffset, offset));
  }

  function constrainCamera(next: Camera) {
    const vp = viewportRef.value;
    const bounds = getPaddedLayoutBounds(layoutBounds.value, next.scale);
    if (!vp || !bounds) return next;

    return {
      scale: next.scale,
      tx: clampOffset(bounds.minX, bounds.maxX, vp.clientWidth, next.scale, next.tx),
      ty: clampOffset(bounds.minY, bounds.maxY, vp.clientHeight, next.scale, next.ty),
    };
  }

  function setCamera(next: Camera) {
    camera.value = constrainCamera(next);
  }

  function zoomAtViewportPoint(vx: number, vy: number, nextScale: number) {
    const { scale: s0, tx: tx0, ty: ty0 } = camera.value;
    const s1 = nextScale;

    const wx = (vx - tx0) / s0;
    const wy = (vy - ty0) / s0;

    setCamera({
      scale: s1,
      tx: vx - wx * s1,
      ty: vy - wy * s1,
    });
  }

  function panByPixels(dx: number, dy: number) {
    setCamera({
      ...camera.value,
      tx: camera.value.tx + dx,
      ty: camera.value.ty + dy,
    });
  }

  function centerCamera(scale = camera.value.scale, bounds = layoutBounds.value) {
    const vp = viewportRef.value;
    if (!vp || !bounds) return;

    const nextScale = clampScale(scale, getMinCameraScale(bounds), MAX_CAMERA_SCALE);
    const paddedBounds = getPaddedLayoutBounds(bounds, nextScale);
    if (!paddedBounds) return;
    const xConstraint = getAxisConstraint(paddedBounds.minX, paddedBounds.maxX, vp.clientWidth, nextScale);
    const yConstraint = getAxisConstraint(paddedBounds.minY, paddedBounds.maxY, vp.clientHeight, nextScale);
    setCamera({
      scale: nextScale,
      tx: xConstraint.centeredOffset,
      ty: yConstraint.centeredOffset,
    });
  }

  function fitScaleToViewport(bounds: LayoutBounds) {
    const vp = viewportRef.value;
    if (!vp) return 1;

    const minScale = getMinCameraScale(bounds);
    return computeFitScaleWithCanvasPadding(bounds, vp.clientWidth, vp.clientHeight, minScale, 1, FIT_PADDING);
  }

  function fitAndCenterCamera(bounds = layoutBounds.value) {
    if (!bounds) return;
    centerCamera(fitScaleToViewport(bounds), bounds);
  }

  /**
   * 初次打开：以镜头方式把内容放到舒适位置（只执行一次）
   */
  function resetToCenterIfNeeded(bounds = layoutBounds.value) {
    const vp = viewportRef.value;
    const isDefault =
      camera.value.scale === 1 &&
      camera.value.tx === 0 &&
      camera.value.ty === 0;

    if (!isDefault) return;
    if (!vp) return;

    if (!bounds) {
      setCamera({ scale: 1, tx: vp.clientWidth / 2, ty: vp.clientHeight / 2 });
      return;
    }

    fitAndCenterCamera(bounds);
  }

  function constrainToBounds() {
    camera.value = constrainCamera(camera.value);
  }

  return {
    camera,
    clampScale,
    zoomAtViewportPoint,
    panByPixels,
    setCamera,
    fitAndCenterCamera,
    resetToCenterIfNeeded,
    constrainToBounds,
    centerCamera,
    fitScaleToViewport,
    getPaddedLayoutBounds,
    getMinCameraScale,
  };
}
