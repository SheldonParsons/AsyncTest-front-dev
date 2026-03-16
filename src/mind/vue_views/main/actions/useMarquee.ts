import type { Ref } from 'vue';
import { ref } from 'vue';
import type { Camera } from './useCamera';
import type { WorldRect } from '../geom/rect';
import { rectIntersects, screenToWorld } from '../geom/rect';
import type { WorldBoxes } from '../geom/worldBoxes';
import type { UniformGridSpatialIndex } from '../grid/spatialIndex';
import { DEBUG_MARQUEE_LOG } from '../constants';
import { DEBUG_RENDER_DIAGNOSTICS, MARQUEE_LOG_SAMPLE_MS } from '../diagnostics';

type ScreenPoint = { x: number; y: number };
export type ScreenRect = { x1: number; y1: number; x2: number; y2: number };
export type MarqueeStats = { mousemoveCount: number; tickCount: number };

function normalizeScreenRect(start: ScreenPoint, end: ScreenPoint): ScreenRect {
  return {
    x1: Math.min(start.x, end.x),
    y1: Math.min(start.y, end.y),
    x2: Math.max(start.x, end.x),
    y2: Math.max(start.y, end.y),
  };
}

function screenRectToWorldRect(camera: Camera, rect: ScreenRect): WorldRect {
  const p1 = screenToWorld(camera, rect.x1, rect.y1);
  const p2 = screenToWorld(camera, rect.x2, rect.y2);
  return {
    x1: Math.min(p1.x, p2.x),
    y1: Math.min(p1.y, p2.y),
    x2: Math.max(p1.x, p2.x),
    y2: Math.max(p1.y, p2.y),
  };
}

export function useMarquee(
  camera: Ref<Camera>,
  spatialIndex: UniformGridSpatialIndex,
  worldBoxes: Ref<WorldBoxes>,
  requestRender: () => void
) {
  const isMarquee = ref(false);
  const rectScreen = ref<ScreenRect | null>(null);
  const worldRect = ref<WorldRect | null>(null);
  const selectedIds = ref<Set<string>>(new Set());
  const marqueeStats = ref<MarqueeStats>({ mousemoveCount: 0, tickCount: 0 });

  let startScreen: ScreenPoint | null = null;
  let endScreen: ScreenPoint | null = null;
  let baseSelection = new Set<string>();
  let additiveSelection = false;
  let tickRafId: number | null = null;
  let lastProgressLogAt = 0;

  function scheduleTick() {
    if (tickRafId != null) return;
    tickRafId = requestAnimationFrame(runTick);
  }

  function maybeLogProgress() {
    if (!DEBUG_RENDER_DIAGNOSTICS) return;
    const now = performance.now();
    if (now - lastProgressLogAt < MARQUEE_LOG_SAMPLE_MS) return;
    lastProgressLogAt = now;
    console.debug('[mind-marquee-progress]', {
      mousemoveCount: marqueeStats.value.mousemoveCount,
      marqueeTickCount: marqueeStats.value.tickCount,
      selectedCount: selectedIds.value.size,
    });
  }

  function clearMarqueeOverlay() {
    rectScreen.value = null;
    worldRect.value = null;
  }

  function runTick() {
    tickRafId = null;
    if (!isMarquee.value || !startScreen || !endScreen) return;

    marqueeStats.value = {
      mousemoveCount: marqueeStats.value.mousemoveCount,
      tickCount: marqueeStats.value.tickCount + 1,
    };

    const nextScreenRect = normalizeScreenRect(startScreen, endScreen);
    const nextWorldRect = screenRectToWorldRect(camera.value, nextScreenRect);
    const candidates = spatialIndex.queryRect(nextWorldRect);
    const filteredIds = candidates.filter((nodeId) => {
      const rect = worldBoxes.value.get(nodeId);
      return rect ? rectIntersects(nextWorldRect, rect) : false;
    });

    rectScreen.value = nextScreenRect;
    worldRect.value = nextWorldRect;
    selectedIds.value = additiveSelection
      ? new Set([...baseSelection, ...filteredIds])
      : new Set(filteredIds);

    maybeLogProgress();
    requestRender();
  }

  function startSelection(
    start: ScreenPoint,
    current: ScreenPoint,
    options?: { additiveSelection?: boolean; baseSelectionIds?: Iterable<string> }
  ) {
    isMarquee.value = true;
    startScreen = { ...start };
    endScreen = { ...current };
    additiveSelection = !!options?.additiveSelection;
    baseSelection = new Set(options?.baseSelectionIds ?? []);
    marqueeStats.value = { mousemoveCount: 0, tickCount: 0 };
    lastProgressLogAt = 0;
    scheduleTick();
  }

  function updateSelection(current: ScreenPoint) {
    if (!isMarquee.value) return;
    endScreen = { ...current };
    marqueeStats.value = {
      mousemoveCount: marqueeStats.value.mousemoveCount + 1,
      tickCount: marqueeStats.value.tickCount,
    };
    scheduleTick();
  }

  function finishSelection() {
    if (!isMarquee.value) return;
    if (tickRafId != null) {
      cancelAnimationFrame(tickRafId);
      tickRafId = null;
      runTick();
    }

    isMarquee.value = false;
    startScreen = null;
    endScreen = null;
    baseSelection = new Set(selectedIds.value);
    clearMarqueeOverlay();
    requestRender();

    if (DEBUG_MARQUEE_LOG) {
      console.debug('[mind-marquee]', {
        mousemoveCount: marqueeStats.value.mousemoveCount,
        tickCount: marqueeStats.value.tickCount,
        selectedCount: selectedIds.value.size,
        additiveSelection,
      });
    }
  }

  function cancelSelection(reason?: string) {
    if (tickRafId != null) {
      cancelAnimationFrame(tickRafId);
      tickRafId = null;
    }
    isMarquee.value = false;
    startScreen = null;
    endScreen = null;
    clearMarqueeOverlay();
    if (DEBUG_RENDER_DIAGNOSTICS && reason) {
      console.debug('[mind-marquee-cancel]', { reason });
    }
    requestRender();
  }

  function cleanup() {
    cancelSelection('cleanup');
  }

  return {
    isMarquee,
    rectScreen,
    worldRect,
    selectedIds,
    marqueeStats,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection,
    cleanup,
  };
}
