import { getNodeImage, getNodePlainText, getNodeRichText, type MindNodeImage, type MindNodeLike } from '@/mind/core/nodeContent';
import type { RichTextAlign, RichTextDocument } from '@/mind/core/richText';
import { buildCanvasFont } from '@/mind/core/text/font';
import {
  measureNodeTextPlain,
  NODE_H_HARD_MAX,
  NODE_TEXT_MAX_WIDTH_PX,
  NODE_TEXT_MIN_WIDTH_PX,
  NODE_W_HARD_MAX,
} from '@/mind/core/text/measureNodeText';

export const NODE_DEFAULT_FONT_FAMILY = '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';
export const NODE_DEFAULT_FONT_SIZE = 14;
export const NODE_FONT = buildCanvasFont({
  fontStyle: 'normal',
  fontWeight: 400,
  fontSizePx: NODE_DEFAULT_FONT_SIZE,
  fontFamily: NODE_DEFAULT_FONT_FAMILY,
});
export const NODE_MIN_W = 20;
export const NODE_MAX_W = NODE_TEXT_MAX_WIDTH_PX + 16;
export const NODE_TEXT_INSET_X = 8;
export const NODE_TEXT_INSET_Y = 6;
export const NODE_LINE_HEIGHT = 20;
export const NODE_IMAGE_TEXT_GAP = 8;
export const NODE_PADDING_X = NODE_TEXT_INSET_X * 2;
export const NODE_PADDING_Y = NODE_TEXT_INSET_Y * 2;
export const NODE_CONTENT_MAX_W = NODE_TEXT_MAX_WIDTH_PX;

export type NodeTextStyle = {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  lineHeightPx: number;
  color: string;
  textAlign: RichTextAlign;
  letterSpacingPx: number;
  canvasFontString: string;
};

export type TextVerticalMetrics = {
  ascentPx: number;
  descentPx: number;
  contentHeightPx: number;
  topLeadingPx: number;
  baselineOffsetPx: number;
};

const domTextTopOffsetCache = new Map<string, number>();

export type RichTextLineSegment = {
  text: string;
  width: number;
  font: string;
  fontSize: number;
  color: string;
};

export type RichTextLine = {
  align: RichTextAlign;
  segments: RichTextLineSegment[];
  width: number;
  height: number;
};

export type NodeTextLayout = {
  lines: string[];
  richLines: RichTextLine[];
  w: number;
  h: number;
  contentWidth: number;
  contentHeight: number;
  lineCount: number;
  lineHeight: number;
  wrapMode: 'anywhere';
};

export type NodeTextGeometry = {
  imageBlockHeight: number;
  contentBoxTop: number;
  contentBoxHeight: number;
  textLineBoxTop: number;
  textLineBoxHeight: number;
  textGlyphTop: number;
  textGlyphHeight: number;
  verticalMetrics: TextVerticalMetrics;
};

export type NodeVisualLayout = {
  textLayout: NodeTextLayout;
  image: MindNodeImage;
  width: number;
  height: number;
  textGeometry: NodeTextGeometry;
  textOffsetY: number;
  textHeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const textVerticalMetricsCache = new Map<string, TextVerticalMetrics>();

export function measureTextVerticalMetrics(
  ctx: CanvasRenderingContext2D,
  options: {
    font: string;
    fontSizePx: number;
    lineHeightPx: number;
  }
): TextVerticalMetrics {
  const cacheKey = `${options.font}__${options.lineHeightPx}`;
  const cached = textVerticalMetricsCache.get(cacheKey);
  if (cached) return cached;

  ctx.save();
  ctx.font = options.font;
  const metrics = ctx.measureText('Mg');
  ctx.restore();

  const measuredAscent =
    metrics.actualBoundingBoxAscent ||
    metrics.fontBoundingBoxAscent ||
    Math.ceil(options.fontSizePx * 0.8);
  const measuredDescent =
    metrics.actualBoundingBoxDescent ||
    metrics.fontBoundingBoxDescent ||
    Math.max(1, Math.ceil(options.fontSizePx * 0.2));
  const contentHeightPx = Math.max(1, measuredAscent + measuredDescent);
  const topLeadingPx = Math.max(0, (options.lineHeightPx - contentHeightPx) / 2);
  const verticalMetrics = {
    ascentPx: measuredAscent,
    descentPx: measuredDescent,
    contentHeightPx,
    topLeadingPx,
    baselineOffsetPx: topLeadingPx + measuredAscent,
  } satisfies TextVerticalMetrics;
  textVerticalMetricsCache.set(cacheKey, verticalMetrics);
  return verticalMetrics;
}

export function measureDomTextTopOffset(options: {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  lineHeightPx: number;
  letterSpacingPx?: number;
}) {
  if (typeof document === 'undefined') {
    return Math.max(0, (options.lineHeightPx - options.fontSizePx) / 2);
  }
  const cacheKey = JSON.stringify(options);
  const cached = domTextTopOffsetCache.get(cacheKey);
  if (cached != null) return cached;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.visibility = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.whiteSpace = 'pre';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';
  wrapper.style.border = '0';
  wrapper.style.fontFamily = options.fontFamily;
  wrapper.style.fontSize = `${options.fontSizePx}px`;
  wrapper.style.fontWeight = `${options.fontWeight}`;
  wrapper.style.fontStyle = options.fontStyle;
  wrapper.style.lineHeight = `${options.lineHeightPx}px`;
  wrapper.style.letterSpacing = `${options.letterSpacingPx ?? 0}px`;

  const textNode = document.createTextNode('Mg');
  wrapper.appendChild(textNode);
  document.body.appendChild(wrapper);

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const wrapperRect = wrapper.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();
  const topOffset = Math.max(0, rangeRect.top - wrapperRect.top);

  document.body.removeChild(wrapper);
  domTextTopOffsetCache.set(cacheKey, topOffset);
  return topOffset;
}

export function getNodeTextStyle(node: MindNodeLike | null | undefined): NodeTextStyle {
  const richText = getNodeRichText(node);
  const firstBlock = richText.blocks[0];
  const firstInline = firstBlock?.inlines.find((inline) => inline.text.length || inline.marks) ?? firstBlock?.inlines[0];
  const marks = firstInline?.marks;
  const fontFamily = marks?.fontFamily ?? NODE_DEFAULT_FONT_FAMILY;
  const fontSizePx = marks?.fontSize ?? NODE_DEFAULT_FONT_SIZE;
  const fontWeight = marks?.bold ? 700 : 400;
  const fontStyle = marks?.italic ? 'italic' : 'normal';
  const lineHeightPx = Math.max(NODE_LINE_HEIGHT, Math.ceil(fontSizePx * 1.3));
  return {
    fontFamily,
    fontSizePx,
    fontWeight,
    fontStyle,
    lineHeightPx,
    color: marks?.color ?? '#1f2937',
    textAlign: firstBlock?.align ?? 'left',
    letterSpacingPx: 0,
    canvasFontString: buildCanvasFont({ fontFamily, fontSizePx, fontWeight, fontStyle }),
  };
}

export function measureNodeTextLayout(
  ctx: CanvasRenderingContext2D,
  input: string | RichTextDocument,
  cache?: Map<string, NodeTextLayout>,
  options?: { maxWidth?: number; baseStyle?: NodeTextStyle }
): NodeTextLayout {
  const richText = typeof input === 'string' ? input : getNodePlainText({ richText: input });
  const baseStyle =
    options?.baseStyle ??
    ({
      fontFamily: NODE_DEFAULT_FONT_FAMILY,
      fontSizePx: NODE_DEFAULT_FONT_SIZE,
      fontWeight: 400,
      fontStyle: 'normal',
      lineHeightPx: NODE_LINE_HEIGHT,
      color: '#1f2937',
      textAlign: 'left',
      letterSpacingPx: 0,
      canvasFontString: NODE_FONT,
    } satisfies NodeTextStyle);
  const maxWidth = options?.maxWidth ?? NODE_CONTENT_MAX_W;
  const key = JSON.stringify({ richText, baseStyle, maxWidth });
  const cached = cache?.get(key);
  if (cached) return cached;

  const measured = measureNodeTextPlain({
    ctx,
    text: richText,
    fontFamily: baseStyle.fontFamily,
    fontSizePx: baseStyle.fontSizePx,
    fontWeight: baseStyle.fontWeight,
    fontStyle: baseStyle.fontStyle,
    maxWidthPx: maxWidth,
    minWidthPx: NODE_TEXT_MIN_WIDTH_PX,
    lineHeightPx: baseStyle.lineHeightPx,
  });

  const richLines = measured.textLines.map((line) => {
    ctx.save();
    ctx.font = baseStyle.canvasFontString;
    const width = ctx.measureText(line).width;
    ctx.restore();
    return {
      align: baseStyle.textAlign,
      segments: [
        {
          text: line,
          width,
          font: baseStyle.canvasFontString,
          fontSize: baseStyle.fontSizePx,
          color: baseStyle.color,
        },
      ],
      width,
      height: baseStyle.lineHeightPx,
    } satisfies RichTextLine;
  });

  const layout = {
    lines: measured.textLines,
    richLines,
    w: clamp(measured.textWidth + NODE_PADDING_X, NODE_MIN_W, NODE_W_HARD_MAX),
    h: clamp(measured.textHeight + NODE_PADDING_Y, NODE_LINE_HEIGHT + NODE_PADDING_Y, NODE_H_HARD_MAX),
    contentWidth: measured.textWidth,
    contentHeight: measured.textHeight,
    lineCount: measured.textLines.length,
    lineHeight: measured.lineHeight,
    wrapMode: 'anywhere' as const,
  } satisfies NodeTextLayout;

  cache?.set(key, layout);
  return layout;
}

export function computeNodeTextGeometry(
  ctx: CanvasRenderingContext2D,
  textLayout: NodeTextLayout,
  baseStyle: NodeTextStyle,
  image?: MindNodeImage | null
): NodeTextGeometry {
  const verticalMetrics = measureTextVerticalMetrics(ctx, {
    font: baseStyle.canvasFontString,
    fontSizePx: baseStyle.fontSizePx,
    lineHeightPx: baseStyle.lineHeightPx,
  });
  const imageBlockHeight = image ? image.height + NODE_IMAGE_TEXT_GAP : 0;
  const textLineBoxHeight = Math.max(baseStyle.lineHeightPx, textLayout.contentHeight);
  const contentBoxTop = imageBlockHeight;
  const contentBoxHeight = textLineBoxHeight + NODE_TEXT_INSET_Y * 2;
  const textLineBoxTop = contentBoxTop + (contentBoxHeight - textLineBoxHeight) / 2;
  return {
    imageBlockHeight,
    contentBoxTop,
    contentBoxHeight,
    textLineBoxTop,
    textLineBoxHeight,
    textGlyphTop: textLineBoxTop + verticalMetrics.topLeadingPx,
    textGlyphHeight: Math.max(verticalMetrics.contentHeightPx, textLayout.lineCount * verticalMetrics.contentHeightPx),
    verticalMetrics,
  };
}

export function measureNodeVisualLayout(
  ctx: CanvasRenderingContext2D,
  node: MindNodeLike,
  cache?: Map<string, NodeTextLayout>,
  options?: { richText?: RichTextDocument; maxTextWidth?: number }
): NodeVisualLayout {
  const richText = options?.richText ?? getNodeRichText(node);
  const baseStyle = getNodeTextStyle(node);
  const textLayout = measureNodeTextLayout(ctx, getNodePlainText({ richText }), cache, {
    maxWidth: options?.maxTextWidth ?? NODE_CONTENT_MAX_W,
    baseStyle,
  });
  const image = getNodeImage(node);
  const textGeometry = computeNodeTextGeometry(ctx, textLayout, baseStyle, image);
  const width = clamp(Math.max(textLayout.contentWidth, image?.width ?? 0) + NODE_PADDING_X, NODE_MIN_W, NODE_W_HARD_MAX);
  const textOffsetY = textGeometry.textLineBoxTop;
  const textHeight = textGeometry.textLineBoxHeight;
  const height = clamp(
    textGeometry.contentBoxTop + textGeometry.contentBoxHeight,
    baseStyle.lineHeightPx + NODE_PADDING_Y,
    NODE_H_HARD_MAX
  );
  return {
    textLayout,
    image,
    width,
    height,
    textGeometry,
    textOffsetY,
    textHeight,
  };
}
