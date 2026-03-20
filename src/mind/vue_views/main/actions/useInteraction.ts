import type { Ref } from 'vue';
import type { Camera } from './useCamera';
import { DEBUG_CANVAS_OVERLAY } from '../constants';
import { WHEEL_LOG_SAMPLE_MS } from '../diagnostics';

const ZOOM_K = 0.0065;
const PAN_K = 0.48;

function isMacPlatform() {
  if (typeof window !== 'undefined' && window.electronAPI?.platform) {
    return window.electronAPI.platform === 'darwin';
  }
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(userAgent);
}

export function useInteraction(
  viewportRef: Ref<HTMLDivElement | null>,
  camera: Ref<Camera>,
  clampScale: (v: number, min: number, max: number) => number,
  zoomAtViewportPoint: (vx: number, vy: number, nextScale: number) => void,
  panByPixels: (dx: number, dy: number) => void,
  getMinScale: () => number,
  getMaxScale: () => number,
  requestRender: () => void,
  schedulePersistViewport: () => void,
  onWheelFrameApplied?: (kind: 'pan' | 'zoom') => void
) {
  const runningOnMac = isMacPlatform();

  let pendingPanX = 0;
  let pendingPanY = 0;
  let pendingZoomDeltaY = 0;
  let wheelRafId: number | null = null;
  let lastZoomEvent: WheelEvent | null = null;
  let lastWheelLogAt = 0;

  function normalizeWheelDelta(delta: number, mode: number) {
    if (mode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
    if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * 120;
    return delta;
  }

  function flushWheelFrame() {
    wheelRafId = null;

    const el = viewportRef.value;
    if (!el) {
      pendingPanX = 0;
      pendingPanY = 0;
      pendingZoomDeltaY = 0;
      lastZoomEvent = null;
      return;
    }

    let changed = false;
    let interactionKind: 'pan' | 'zoom' | null = null;

    if (pendingZoomDeltaY !== 0 && lastZoomEvent) {
      const factor = Math.exp(-pendingZoomDeltaY * ZOOM_K);
      const old = camera.value.scale;
      const next = clampScale(old * factor, getMinScale(), getMaxScale());
      if (next !== old) {
        const rect = el.getBoundingClientRect();
        const vx = lastZoomEvent.clientX - rect.left;
        const vy = lastZoomEvent.clientY - rect.top;
        zoomAtViewportPoint(vx, vy, next);
        changed = true;
        interactionKind = 'zoom';
      }
    }

    if (pendingPanX !== 0 || pendingPanY !== 0) {
      panByPixels(-pendingPanX * PAN_K, -pendingPanY * PAN_K);
      changed = true;
      interactionKind = interactionKind ?? 'pan';
    }

    pendingPanX = 0;
    pendingPanY = 0;
    pendingZoomDeltaY = 0;
    lastZoomEvent = null;

    if (!changed) return;
    if (interactionKind) onWheelFrameApplied?.(interactionKind);
    requestRender();
    schedulePersistViewport();
  }

  function requestWheelFlush() {
    if (wheelRafId != null) return;
    wheelRafId = requestAnimationFrame(flushWheelFrame);
  }

  function maybeLogWheel(payload: Record<string, unknown>) {
    if (!DEBUG_CANVAS_OVERLAY) return;
    const now = performance.now();
    if (now - lastWheelLogAt < WHEEL_LOG_SAMPLE_MS) return;
    lastWheelLogAt = now;
    console.debug('[mind-wheel]', payload);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();

    const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
    const isZoom = event.ctrlKey || event.metaKey;
    const platform = runningOnMac ? 'mac' : 'win';

    if (isZoom) {
      maybeLogWheel({
        platform,
        mode: 'zoom',
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        deltaX: Number(deltaX.toFixed(1)),
        deltaY: Number(deltaY.toFixed(1)),
        zoomFactor: Number(Math.exp(-deltaY * ZOOM_K).toFixed(4)),
      });
      pendingZoomDeltaY += deltaY;
      lastZoomEvent = event;
      requestWheelFlush();
      return;
    }

    if (runningOnMac) {
      maybeLogWheel({
        platform,
        mode: 'pan',
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        deltaX: Number(deltaX.toFixed(1)),
        deltaY: Number(deltaY.toFixed(1)),
        panDx: Number((-deltaX * PAN_K).toFixed(1)),
        panDy: Number((-deltaY * PAN_K).toFixed(1)),
      });
      pendingPanX += deltaX;
      pendingPanY += deltaY;
      requestWheelFlush();
      return;
    }

    const hasNativeHorizontalDelta = Math.abs(deltaX) > 0.01;
    const windowsPanX = event.shiftKey
      ? (hasNativeHorizontalDelta ? deltaX : deltaY)
      : deltaX;
    const windowsPanY = event.shiftKey ? 0 : deltaY;

    if (windowsPanX !== 0 || windowsPanY !== 0) {
      maybeLogWheel({
        platform,
        mode: 'pan',
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        deltaX: Number(deltaX.toFixed(1)),
        deltaY: Number(deltaY.toFixed(1)),
        panDx: Number((-windowsPanX * PAN_K).toFixed(1)),
        panDy: Number((-windowsPanY * PAN_K).toFixed(1)),
      });
      pendingPanX += windowsPanX;
      pendingPanY += windowsPanY;
      requestWheelFlush();
      return;
    }

    maybeLogWheel({
      platform,
      mode: 'ignored',
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      deltaX: Number(deltaX.toFixed(1)),
      deltaY: Number(deltaY.toFixed(1)),
    });
  }

  function cleanup() {
    if (wheelRafId != null) cancelAnimationFrame(wheelRafId);
    wheelRafId = null;
  }

  return { onWheel, cleanup, runningOnMac };
}
