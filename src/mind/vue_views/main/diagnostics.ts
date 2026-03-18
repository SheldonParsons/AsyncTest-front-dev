import type { Camera } from './actions/useCamera';
import type { WorldRect } from './geom/rect';
import { DEBUG_CANVAS_OVERLAY } from './constants';

export const ROUGH_RENDER_STORAGE_KEY = 'amind:rough-render';
export const ROUGH_RENDER_QUERY_KEY = 'amindRoughRender';

export function readRoughRenderFlag() {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(ROUGH_RENDER_QUERY_KEY) === '1') return true;
    return window.localStorage.getItem(ROUGH_RENDER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
export const WHEEL_LOG_SAMPLE_MS = 300;
export const MARQUEE_LOG_SAMPLE_MS = 1000;

let hasLoggedRendererInstructions = false;

function toFixedNumber(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function formatCamera(cam: Camera) {
  return {
    scale: toFixedNumber(cam.scale, 3),
    tx: toFixedNumber(cam.tx),
    ty: toFixedNumber(cam.ty),
  };
}

export function formatWorldRect(rect: WorldRect | null | undefined) {
  if (!rect) return null;
  return {
    x1: toFixedNumber(rect.x1),
    y1: toFixedNumber(rect.y1),
    x2: toFixedNumber(rect.x2),
    y2: toFixedNumber(rect.y2),
  };
}

export function logRendererDebugInstructions() {
  if (hasLoggedRendererInstructions) return;
  hasLoggedRendererInstructions = true;

  console.log(
    [
      '[mind-debug] Dev toggles',
      `- Canvas debug overlay: set DEBUG_CANVAS_OVERLAY in src/mind/vue_views/main/constants.ts`,
      `- Seed new docs count: set DEBUG_NEW_MIND_SEED_NODE_COUNT in src/mind/vue_views/main/constants.ts`,
      `- Rough renderer: localStorage.setItem('${ROUGH_RENDER_STORAGE_KEY}', '1'); location.reload()`,
      `- Or use query flag: ?${ROUGH_RENDER_QUERY_KEY}=1`,
      "- Rough preset: localStorage.setItem('mind.roughThemePreset', 'clean'|'warm-paper'|'mono'|'accent-blue')",
      "- Rough overrides: localStorage.setItem('mind.roughThemeOverrides', JSON.stringify({ roughness: 0.9, bowing: 0.7, strokeWidthPx: 2, overlapPx: 6 }))",
      "- Rough debug API: window.setRoughThemePreset('mono') / window.setRoughThemeOverrides({...}) / window.resetRoughThemeOverrides() / window.getRoughThemeDebug()",
      '- HUD fields: camera / viewport / grid range / node counts / parent-edge counts / cache ms / draw ms / FPS',
      '- Edge debug: HUD + [mind-edge-cache] + [mind-edges] + parent edge bbox / trunk key-point overlay',
      `- Diagnostics active: ${DEBUG_CANVAS_OVERLAY ? 'YES' : 'NO'}`,
    ].join('\n')
  );
}

export function logCameraReset(
  reason: string,
  before: Camera,
  after: Camera,
  extra: Record<string, unknown> = {}
) {
  if (!DEBUG_CANVAS_OVERLAY) return;

  console.debug('[mind-camera-reset]', {
    reason,
    before: formatCamera(before),
    after: formatCamera(after),
    ...extra,
    stack: new Error().stack?.split('\n').slice(2, 6).join('\n'),
  });
}
