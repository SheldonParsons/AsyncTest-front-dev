import { buildCanvasFont } from './font';

export type DomTextCalibrationStyle = {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  lineHeightPx: number;
  letterSpacingPx?: number;
};

const calibrationCache = new Map<string, number>();
const FONT_TOP_GAP_WEIGHT = 0.575;
let measurementCanvas: HTMLCanvasElement | null = null;

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
  wrapper.style.overflowWrap = 'anywhere';
  wrapper.style.wordBreak = 'break-word';
  wrapper.style.hyphens = 'none';

  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.margin = '0';
  root.style.padding = '0';
  root.style.border = '0';
  root.style.outline = 'none';
  root.style.background = 'transparent';
  root.style.whiteSpace = 'pre-wrap';
  root.style.overflowWrap = 'anywhere';
  root.style.wordBreak = 'break-word';
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

  const span = document.createElement('span');
  span.style.margin = '0';
  span.style.padding = '0';
  span.style.border = '0';
  span.style.lineHeight = 'inherit';
  span.style.whiteSpace = 'pre-wrap';
  span.style.overflowWrap = 'anywhere';
  span.style.wordBreak = 'break-word';
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
