import { buildCanvasFont } from './font';

export type DomTextCalibrationStyle = {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  lineHeightPx: number;
  letterSpacingPx?: number;
};

export type DomTextBaselineMetrics = {
  /** 首行字母基线相对编辑器根元素顶部的距离（px） */
  baselineOffsetPx: number;
  /** 首字符 Range rect 顶部相对编辑器根元素顶部的距离（px），用于运行时闭环换算 */
  firstGlyphRangeTopPx: number;
};

const calibrationCache = new Map<string, number>();
const baselineMetricsCache = new Map<string, DomTextBaselineMetrics>();
const FONT_TOP_GAP_WEIGHT = 0.575;
let measurementCanvas: HTMLCanvasElement | null = null;
let fontsListenerBound = false;

function bindFontsListener() {
  if (fontsListenerBound || typeof document === 'undefined' || !document.fonts?.addEventListener) return;
  fontsListenerBound = true;
  // 字体异步加载完成后，之前缓存的度量可能基于回退字体，全部作废
  document.fonts.addEventListener('loadingdone', () => {
    calibrationCache.clear();
    baselineMetricsCache.clear();
  });
}

function getCacheKey(style: DomTextCalibrationStyle) {
  return [
    style.fontFamily,
    style.fontSizePx,
    style.fontWeight,
    style.fontStyle,
    style.lineHeightPx,
    style.letterSpacingPx ?? 0,
  ].join('|');
}

function getMeasurementContext() {
  if (typeof document === 'undefined') return null;
  measurementCanvas ??= document.createElement('canvas');
  return measurementCanvas.getContext('2d');
}

export function getDomTextTopOffset(style: DomTextCalibrationStyle): number {
  if (typeof document === 'undefined') return 0;

  const cacheKey = getCacheKey(style);
  const cached = calibrationCache.get(cacheKey);
  if (cached != null) return cached;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.visibility = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '-10000px';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';
  wrapper.style.border = '0';
  wrapper.style.whiteSpace = 'pre-wrap';
  wrapper.style.overflowWrap = 'break-word';
  wrapper.style.wordBreak = 'break-word';
  wrapper.style.lineBreak = 'auto';
  wrapper.style.hyphens = 'none';

  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.margin = '0';
  root.style.padding = '0';
  root.style.border = '0';
  root.style.outline = 'none';
  root.style.background = 'transparent';
  root.style.whiteSpace = 'pre-wrap';
  root.style.overflowWrap = 'break-word';
  root.style.wordBreak = 'break-word';
  root.style.lineBreak = 'auto';
  root.style.hyphens = 'none';
  root.style.fontFamily = style.fontFamily;
  root.style.fontSize = `${style.fontSizePx}px`;
  root.style.fontWeight = `${style.fontWeight}`;
  root.style.fontStyle = style.fontStyle;
  root.style.lineHeight = `${style.lineHeightPx}px`;
  root.style.letterSpacing = `${style.letterSpacingPx ?? 0}px`;

  const paragraph = document.createElement('p');
  paragraph.style.margin = '0';
  paragraph.style.padding = '0';
  paragraph.style.minHeight = '0';
  paragraph.style.lineHeight = 'inherit';
  paragraph.style.whiteSpace = 'pre-wrap';
  paragraph.style.overflowWrap = 'break-word';
  paragraph.style.wordBreak = 'break-word';
  paragraph.style.lineBreak = 'auto';
  paragraph.style.hyphens = 'none';

  const span = document.createElement('span');
  span.style.margin = '0';
  span.style.padding = '0';
  span.style.border = '0';
  span.style.lineHeight = 'inherit';
  span.style.whiteSpace = 'pre-wrap';
  span.style.overflowWrap = 'break-word';
  span.style.wordBreak = 'break-word';
  span.style.lineBreak = 'auto';
  span.style.hyphens = 'none';
  const textNode = document.createTextNode('Hg');
  span.appendChild(textNode);
  paragraph.appendChild(span);
  root.appendChild(paragraph);
  wrapper.appendChild(root);
  document.body.appendChild(wrapper);

  const wrapperRect = wrapper.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(1, textNode.length));
  const rangeRect = range.getBoundingClientRect();
  let offset = Math.max(0, rangeRect.top - wrapperRect.top);

  const ctx = getMeasurementContext();
  if (ctx) {
    ctx.save();
    ctx.font = buildCanvasFont({
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
      fontSizePx: style.fontSizePx,
      fontFamily: style.fontFamily,
    });
    const metrics = ctx.measureText('Hg');
    ctx.restore();
    const actualAscent = metrics.actualBoundingBoxAscent || 0;
    const fontAscent = metrics.fontBoundingBoxAscent || actualAscent;
    const topGapPx = Math.max(0, fontAscent - actualAscent);
    offset += topGapPx * FONT_TOP_GAP_WEIGHT;
  }

  document.body.removeChild(wrapper);
  calibrationCache.set(cacheKey, offset);
  return offset;
}

function applyProbeTextStyles(el: HTMLElement) {
  el.style.margin = '0';
  el.style.padding = '0';
  el.style.border = '0';
  el.style.lineHeight = 'inherit';
  el.style.whiteSpace = 'pre-wrap';
  el.style.overflowWrap = 'anywhere';
  el.style.wordBreak = 'break-all';
  el.style.lineBreak = 'anywhere';
  el.style.hyphens = 'none';
}

/**
 * 实测给定文本样式下，DOM 首行的字母基线位置（相对容器顶部）。
 *
 * 原理：inline-block 且高度为 0 的空元素，其底边严格落在所在行的字母基线上
 * （CSS 规范：无 in-flow 内容的 inline-block 基线 = margin-box 底边）。
 * 因此不依赖墨迹范围（actualBoundingBox）也不需要任何经验系数，
 * 得到的是浏览器行盒模型（strut：首个可用字体 ascent/descent + 半行距）的精确结果，
 * 对字体、系统、字号天然自适应。
 */
export function getDomTextBaselineMetrics(style: DomTextCalibrationStyle): DomTextBaselineMetrics {
  if (typeof document === 'undefined') {
    const fallbackBaseline = style.lineHeightPx / 2 + style.fontSizePx * 0.35;
    return { baselineOffsetPx: fallbackBaseline, firstGlyphRangeTopPx: 0 };
  }
  bindFontsListener();

  const cacheKey = getCacheKey(style);
  const cached = baselineMetricsCache.get(cacheKey);
  if (cached) return cached;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.visibility = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '-10000px';
  wrapper.style.width = '10000px';
  applyProbeTextStyles(wrapper);

  // 复刻编辑器 DOM 结构：root(contenteditable 样式) > p > span
  const root = document.createElement('div');
  applyProbeTextStyles(root);
  root.style.outline = 'none';
  root.style.background = 'transparent';
  root.style.fontFamily = style.fontFamily;
  root.style.fontSize = `${style.fontSizePx}px`;
  root.style.fontWeight = `${style.fontWeight}`;
  root.style.fontStyle = style.fontStyle;
  root.style.lineHeight = `${style.lineHeightPx}px`;
  root.style.letterSpacing = `${style.letterSpacingPx ?? 0}px`;

  const paragraph = document.createElement('p');
  applyProbeTextStyles(paragraph);
  paragraph.style.minHeight = '0';

  const span = document.createElement('span');
  applyProbeTextStyles(span);
  const textNode = document.createTextNode('Hg');
  span.appendChild(textNode);

  const baselineMarker = document.createElement('span');
  baselineMarker.style.display = 'inline-block';
  baselineMarker.style.width = '0';
  baselineMarker.style.height = '0';
  baselineMarker.style.margin = '0';
  baselineMarker.style.padding = '0';
  baselineMarker.style.border = '0';
  baselineMarker.style.verticalAlign = 'baseline';

  paragraph.appendChild(span);
  paragraph.appendChild(baselineMarker);
  root.appendChild(paragraph);
  wrapper.appendChild(root);
  document.body.appendChild(wrapper);

  const rootRect = root.getBoundingClientRect();
  const markerRect = baselineMarker.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(1, textNode.length));
  const rangeRect = range.getBoundingClientRect();

  const metrics: DomTextBaselineMetrics = {
    baselineOffsetPx: markerRect.bottom - rootRect.top,
    firstGlyphRangeTopPx: rangeRect.top - rootRect.top,
  };

  document.body.removeChild(wrapper);
  baselineMetricsCache.set(cacheKey, metrics);
  return metrics;
}
