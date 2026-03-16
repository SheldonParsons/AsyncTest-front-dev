import type { Camera } from './actions/useCamera';
import type { WorldRect } from './geom/rect';

export const RENDER_DEBUG_STORAGE_KEY = 'amind:debug-render-diagnostics';
export const RENDER_DEBUG_QUERY_KEY = 'amindDebugRender';
export const ROUGH_RENDER_STORAGE_KEY = 'amind:rough-render';
export const ROUGH_RENDER_QUERY_KEY = 'amindRoughRender';

function readDebugFlag() {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(RENDER_DEBUG_QUERY_KEY) === '1') return true;
    return window.localStorage.getItem(RENDER_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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

export const DEBUG_RENDER_DIAGNOSTICS = readDebugFlag();
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
      '- Seed new docs: AMIND_DEV_SEED_NODES=1 AMIND_DEV_SEED_NODE_COUNT=300 npm run electron:dev',
      `- Renderer diagnostics HUD: localStorage.setItem('${RENDER_DEBUG_STORAGE_KEY}', '1'); location.reload()`,
      `- Or use query flag: ?${RENDER_DEBUG_QUERY_KEY}=1`,
      `- Rough renderer: localStorage.setItem('${ROUGH_RENDER_STORAGE_KEY}', '1'); location.reload()`,
      `- Or use query flag: ?${ROUGH_RENDER_QUERY_KEY}=1`,
      "- Rough preset: localStorage.setItem('mind.roughThemePreset', 'clean'|'warm-paper'|'mono'|'accent-blue')",
      "- Rough overrides: localStorage.setItem('mind.roughThemeOverrides', JSON.stringify({ roughness: 0.9, bowing: 0.7, strokeWidthPx: 2, overlapPx: 6 }))",
      "- Rough debug API: window.setRoughThemePreset('mono') / window.setRoughThemeOverrides({...}) / window.resetRoughThemeOverrides() / window.getRoughThemeDebug()",
      '- HUD fields: camera / viewport / grid range / node counts / parent-edge counts / cache ms / draw ms / FPS',
      '- Edge debug: HUD + [mind-edge-cache] + [mind-edges] + parent edge bbox / trunk key-point overlay',
      `- Diagnostics active: ${DEBUG_RENDER_DIAGNOSTICS ? 'YES' : 'NO'}`,
    ].join('\n')
  );
}

export function logCameraReset(
  reason: string,
  before: Camera,
  after: Camera,
  extra: Record<string, unknown> = {}
) {
  if (!DEBUG_RENDER_DIAGNOSTICS) return;

  console.debug('[mind-camera-reset]', {
    reason,
    before: formatCamera(before),
    after: formatCamera(after),
    ...extra,
    stack: new Error().stack?.split('\n').slice(2, 6).join('\n'),
  });
}
