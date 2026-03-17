import { buildCanvasFont } from './font';

export const NODE_TEXT_MAX_WIDTH_PX = 500;
export const NODE_TEXT_MIN_WIDTH_PX = 80;
export const NODE_W_HARD_MAX = 2000;
export const NODE_H_HARD_MAX = 2000;
export const NODE_TEXT_WRAP_MODE = 'anywhere';

export type MeasureNodeTextParams = {
  ctx: CanvasRenderingContext2D;
  text: string;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  maxWidthPx?: number;
  minWidthPx?: number;
  lineHeightPx: number;
};

export type MeasureNodeTextResult = {
  textLines: string[];
  textWidth: number;
  textHeight: number;
  lineHeight: number;
};

function splitTokens(text: string) {
  if (!text) return [''];
  return Array.from(text);
}

export function measureNodeTextPlain({
  ctx,
  text,
  fontFamily,
  fontSizePx,
  fontWeight,
  fontStyle,
  maxWidthPx = NODE_TEXT_MAX_WIDTH_PX,
  minWidthPx = NODE_TEXT_MIN_WIDTH_PX,
  lineHeightPx,
}: MeasureNodeTextParams): MeasureNodeTextResult {
  ctx.save();
  ctx.font = buildCanvasFont({ fontStyle, fontWeight, fontSizePx, fontFamily });

  const lines: string[] = [];
  const paragraphs = String(text ?? '').split('\n');
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const token of splitTokens(paragraph)) {
      const tokenWidth = ctx.measureText(token).width;
      const candidate = `${current}${token}`;
      const candidateWidth = ctx.measureText(candidate).width;
      if (current && candidateWidth > maxWidthPx) {
        lines.push(current);
        current = '';
      }
      if (tokenWidth > maxWidthPx && token.length > 1) {
        for (const ch of Array.from(token)) {
          const next = `${current}${ch}`;
          if (current && ctx.measureText(next).width > maxWidthPx) {
            lines.push(current);
            current = ch;
          } else {
            current = next;
          }
        }
      } else {
        current = `${current}${token}`;
      }
    }
    lines.push(current);
  }

  const safeLines = lines.length ? lines : [''];
  const measuredWidth = safeLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  ctx.restore();

  return {
    textLines: safeLines,
    textWidth: Math.min(maxWidthPx, Math.max(minWidthPx, Math.ceil(measuredWidth))),
    textHeight: Math.min(NODE_H_HARD_MAX, Math.max(lineHeightPx, safeLines.length * lineHeightPx)),
    lineHeight: lineHeightPx,
  };
}
