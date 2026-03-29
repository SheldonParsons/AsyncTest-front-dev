import { getNodeImage, getNodeRichText, type MindNodeImage, type MindNodeLike } from '@/mind/core/nodeContent';
import { getInlineFont, type RichTextAlign, type RichTextDocument, type RichTextInline, type RichTextMarks } from '@/mind/core/richText';
import { buildCanvasFont } from '@/mind/core/text/font';
import { buildDefaultNodeTextStyle } from './nodeStyles';
import { measureNodeMarkerRow } from './nodeMarkers';
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
export const NODE_TEXT_INSET_X = 6;
export const NODE_TEXT_INSET_Y = 6;
export const NODE_LINE_HEIGHT = 20;
export const NODE_IMAGE_TEXT_GAP = 8;
export const NODE_PADDING_X = NODE_TEXT_INSET_X * 2;
export const NODE_PADDING_Y = NODE_TEXT_INSET_Y * 2;
export const NODE_CONTENT_MAX_W = NODE_TEXT_MAX_WIDTH_PX;
export const EMPTY_NODE_MIN_W = Math.max(1, Math.round((NODE_TEXT_MIN_WIDTH_PX + NODE_PADDING_X) / 3));

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
const richTextLayoutKeyCache = new WeakMap<RichTextDocument, string>();

export type RichTextLineSegment = {
  text: string;
  width: number;
  font: string;
  fontSize: number;
  color: string;
  marks?: RichTextMarks;
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
  bodyHeight: number;
  textGeometry: NodeTextGeometry;
  textOffsetY: number;
  textHeight: number;
};

function isRichTextFullyEmpty(richText: RichTextDocument | null | undefined) {
  return (richText?.blocks ?? []).every((block) =>
    (block.inlines ?? []).every((inline) => String(inline.text ?? '') === '')
  );
}

export function getNodeMinimumWidth(
  node: MindNodeLike | null | undefined,
  richText?: RichTextDocument,
  image?: MindNodeImage | null
) {
  const activeRichText = richText ?? getNodeRichText(node);
  const activeImage = image ?? getNodeImage(node);
  return isRichTextFullyEmpty(activeRichText) && !activeImage ? EMPTY_NODE_MIN_W : NODE_MIN_W;
}

export function getNodeMinimumContentWidth(
  node: MindNodeLike | null | undefined,
  richText?: RichTextDocument,
  image?: MindNodeImage | null
) {
  return Math.max(1, getNodeMinimumWidth(node, richText, image) - NODE_PADDING_X);
}

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

export function getNodeTextStyle(
  node: MindNodeLike | null | undefined,
  options?: { doc?: any; nodeId?: string | null }
): NodeTextStyle {
  const richText = getNodeRichText(node);
  const firstBlock = richText.blocks[0];
  const firstInline = firstBlock?.inlines.find((inline) => inline.text.length || inline.marks) ?? firstBlock?.inlines[0];
  const marks = firstInline?.marks;
  const defaults = buildDefaultNodeTextStyle(options?.doc, options?.nodeId);
  const fontFamily = marks?.fontFamily ?? defaults.fontFamily;
  const fontSizePx = marks?.fontSize ?? defaults.fontSizePx;
  const fontWeight = marks?.bold === true ? 700 : marks?.bold === false ? 400 : defaults.fontWeight;
  const fontStyle = marks?.italic === true ? 'italic' : marks?.italic === false ? 'normal' : defaults.fontStyle;
  const lineHeightPx = Math.max(NODE_LINE_HEIGHT, Math.ceil(fontSizePx * 1.3));
  return {
    fontFamily,
    fontSizePx,
    fontWeight,
    fontStyle,
    lineHeightPx,
    color: marks?.color ?? defaults.color,
    textAlign: firstBlock?.align ?? defaults.textAlign,
    letterSpacingPx: 0,
    canvasFontString: buildCanvasFont({ fontFamily, fontSizePx, fontWeight, fontStyle }),
  };
}

export function measureNodeTextLayout(
  ctx: CanvasRenderingContext2D,
  input: string | RichTextDocument,
  cache?: Map<string, NodeTextLayout>,
  options?: { maxWidth?: number; baseStyle?: NodeTextStyle; minContentWidth?: number }
): NodeTextLayout {
  const richText = typeof input === 'string' ? { blocks: [{ align: 'left', inlines: [{ text: input }] }] } : input;
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
  const minContentWidth = Math.max(1, options?.minContentWidth ?? NODE_TEXT_MIN_WIDTH_PX);
  const richTextKey = typeof input === 'string' ? input : getRichTextLayoutCacheKey(richText);
  const baseStyleKey = [
    baseStyle.fontFamily,
    baseStyle.fontSizePx,
    baseStyle.fontWeight,
    baseStyle.fontStyle,
    baseStyle.lineHeightPx,
    baseStyle.color,
    baseStyle.textAlign,
    baseStyle.letterSpacingPx,
  ].join('|');
  const key = `${richTextKey}::${baseStyleKey}::${maxWidth}::${minContentWidth}`;
  const cached = cache?.get(key);
  if (cached) return cached;

  const tokens = richText.blocks.flatMap((block, blockIndex) => {
    const blockTokens = block.inlines.flatMap((inline) => splitInlineToTokens(inline));
    if (!blockTokens.length) blockTokens.push(createInlineToken('', inlineMarksWithDefaults(undefined, baseStyle)));
    if (blockIndex < richText.blocks.length - 1) {
      blockTokens.push({ text: '\n', marks: inlineMarksWithDefaults(undefined, baseStyle), isNewline: true });
    }
    return blockTokens.map((token) => ({ ...token, align: block.align ?? baseStyle.textAlign }));
  });

  const richLines: RichTextLine[] = [];
  let currentLine = createEmptyRichLine(baseStyle.textAlign, baseStyle.lineHeightPx);

  for (const token of tokens) {
    if (token.isNewline) {
      currentLine.align = token.align;
      finalizeRichLine(currentLine, richLines, baseStyle.lineHeightPx);
      currentLine = createEmptyRichLine(token.align, baseStyle.lineHeightPx);
      continue;
    }
    const segment = createMeasuredSegment(ctx, token.text, token.marks, baseStyle);
    let appendPreview = previewRichLineAppend(ctx, currentLine, segment);
    if (currentLine.segments.length > 0 && currentLine.width + appendPreview.addedWidth > maxWidth) {
      finalizeRichLine(currentLine, richLines, baseStyle.lineHeightPx);
      currentLine = createEmptyRichLine(token.align, baseStyle.lineHeightPx);
      appendPreview = previewRichLineAppend(ctx, currentLine, segment);
    }
    currentLine.align = token.align;
    applyRichLineAppend(currentLine, segment, appendPreview);
    currentLine.height = Math.max(currentLine.height, Math.max(baseStyle.lineHeightPx, Math.ceil(segment.fontSize * 1.3)));
  }
  finalizeRichLine(currentLine, richLines, baseStyle.lineHeightPx);

  const lines = richLines.map((line) => line.segments.map((segment) => segment.text).join(''));
  const contentWidth = richLines.reduce((max, line) => Math.max(max, line.width), 0);
  const lineHeight = richLines.reduce((max, line) => Math.max(max, line.height), baseStyle.lineHeightPx);

  const layout = {
    lines,
    richLines,
    w: clamp(Math.max(minContentWidth, contentWidth) + NODE_PADDING_X, EMPTY_NODE_MIN_W, NODE_W_HARD_MAX),
    h: clamp(Math.max(lineHeight, richLines.length * lineHeight) + NODE_PADDING_Y, NODE_LINE_HEIGHT + NODE_PADDING_Y, NODE_H_HARD_MAX),
    contentWidth: Math.min(maxWidth, Math.max(minContentWidth, Math.ceil(contentWidth))),
    contentHeight: Math.min(NODE_H_HARD_MAX, Math.max(lineHeight, richLines.length * lineHeight)),
    lineCount: richLines.length,
    lineHeight,
    wrapMode: 'anywhere' as const,
  } satisfies NodeTextLayout;

  cache?.set(key, layout);
  return layout;
}

function getRichTextLayoutCacheKey(richText: RichTextDocument) {
  const cachedKey = richTextLayoutKeyCache.get(richText);
  if (cachedKey) return cachedKey;
  const key = JSON.stringify(richText);
  richTextLayoutKeyCache.set(richText, key);
  return key;
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
  options?: { richText?: RichTextDocument; maxTextWidth?: number; doc?: any; nodeId?: string | null }
): NodeVisualLayout {
  const richText = options?.richText ?? getNodeRichText(node);
  const baseStyle = getNodeTextStyle(node, options);
  const textLayout = measureNodeTextLayout(ctx, richText, cache, {
    maxWidth: options?.maxTextWidth ?? NODE_CONTENT_MAX_W,
    baseStyle,
    minContentWidth: getNodeMinimumContentWidth(node, richText),
  });
  const image = getNodeImage(node);
  const textGeometry = computeNodeTextGeometry(ctx, textLayout, baseStyle, image);
  const markerRow = measureNodeMarkerRow(node);
  const minNodeWidth = getNodeMinimumWidth(node, richText, image);
  const width = clamp(
    Math.max(textLayout.contentWidth, image?.width ?? 0) + NODE_PADDING_X,
    Math.max(minNodeWidth, markerRow.width),
    NODE_W_HARD_MAX
  );
  const textOffsetY = textGeometry.textLineBoxTop;
  const textHeight = textGeometry.textLineBoxHeight;
  const bodyHeight = clamp(
    textGeometry.contentBoxTop + textGeometry.contentBoxHeight,
    baseStyle.lineHeightPx + NODE_PADDING_Y,
    NODE_H_HARD_MAX
  );
  const height = clamp(bodyHeight + markerRow.bandHeight, baseStyle.lineHeightPx + NODE_PADDING_Y, NODE_H_HARD_MAX);
  return {
    textLayout,
    image,
    width,
    height,
    bodyHeight,
    textGeometry,
    textOffsetY,
    textHeight,
  };
}

type InlineToken = {
  text: string;
  marks: RichTextMarks;
  isNewline?: boolean;
};

function inlineMarksWithDefaults(marks: RichTextMarks | undefined, baseStyle: NodeTextStyle): RichTextMarks {
  return {
    ...marks,
    color: marks?.color ?? baseStyle.color,
    fontFamily: marks?.fontFamily ?? baseStyle.fontFamily,
    fontSize: marks?.fontSize ?? baseStyle.fontSizePx,
  };
}

function createInlineToken(text: string, marks: RichTextMarks): InlineToken {
  return { text, marks };
}

function splitInlineToTokens(inline: RichTextInline): InlineToken[] {
  const chars = Array.from(inline.text ?? '');
  if (!chars.length) return [];
  return chars.map((char) =>
    char === '\n'
      ? { text: '\n', marks: { ...(inline.marks ?? {}) }, isNewline: true }
      : createInlineToken(char, { ...(inline.marks ?? {}) })
  );
}

function createMeasuredSegment(
  ctx: CanvasRenderingContext2D,
  text: string,
  marks: RichTextMarks,
  baseStyle: NodeTextStyle
): RichTextLineSegment {
  const fontFamily = marks.fontFamily ?? baseStyle.fontFamily;
  const fontSize = marks.fontSize ?? baseStyle.fontSizePx;
  const font = getInlineFont(marks, fontFamily, fontSize, baseStyle.fontWeight, baseStyle.fontStyle);
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return {
    text,
    width,
    font,
    fontSize,
    color: marks.color ?? baseStyle.color,
    marks,
  };
}

function areRichLineSegmentStylesEqual(a: RichTextLineSegment | undefined, b: RichTextLineSegment) {
  if (!a) return false;
  return (
    a.font === b.font &&
    a.color === b.color &&
    JSON.stringify(a.marks ?? {}) === JSON.stringify(b.marks ?? {})
  );
}

function measureRichSegmentTextWidth(ctx: CanvasRenderingContext2D, font: string, text: string) {
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function previewRichLineAppend(
  ctx: CanvasRenderingContext2D,
  line: RichTextLine,
  segment: RichTextLineSegment
) {
  const previous = line.segments[line.segments.length - 1];
  if (!areRichLineSegmentStylesEqual(previous, segment)) {
    return {
      mergeWithPrevious: false,
      addedWidth: segment.width,
      mergedWidth: segment.width,
    };
  }
  const mergedWidth = measureRichSegmentTextWidth(ctx, previous.font, previous.text + segment.text);
  return {
    mergeWithPrevious: true,
    addedWidth: mergedWidth - previous.width,
    mergedWidth,
  };
}

function applyRichLineAppend(
  line: RichTextLine,
  segment: RichTextLineSegment,
  preview: { mergeWithPrevious: boolean; addedWidth: number; mergedWidth: number }
) {
  if (!preview.mergeWithPrevious) {
    line.segments.push(segment);
    line.width += segment.width;
    return;
  }
  const previous = line.segments[line.segments.length - 1];
  if (!previous) {
    line.segments.push(segment);
    line.width += segment.width;
    return;
  }
  previous.text += segment.text;
  previous.width = preview.mergedWidth;
  line.width += preview.addedWidth;
}

function createEmptyRichLine(align: RichTextAlign, height: number): RichTextLine {
  return {
    align,
    segments: [],
    width: 0,
    height,
  };
}

function finalizeRichLine(line: RichTextLine, lines: RichTextLine[], fallbackHeight: number) {
  if (line.segments.length === 0) {
    lines.push({
      align: line.align,
      segments: [
        {
          text: '',
          width: 0,
          font: NODE_FONT,
          fontSize: NODE_DEFAULT_FONT_SIZE,
          color: '#1f2937',
          marks: undefined,
        },
      ],
      width: 0,
      height: fallbackHeight,
    });
    return;
  }
  const mergedSegments: RichTextLineSegment[] = [];
  for (const segment of line.segments) {
    const previous = mergedSegments[mergedSegments.length - 1];
    if (
      previous &&
      previous.font === segment.font &&
      previous.color === segment.color &&
      JSON.stringify(previous.marks ?? {}) === JSON.stringify(segment.marks ?? {})
    ) {
      previous.text += segment.text;
      previous.width += segment.width;
    } else {
      mergedSegments.push({ ...segment });
    }
  }
  lines.push({
    align: line.align,
    segments: mergedSegments,
    width: line.width,
    height: Math.max(fallbackHeight, line.height),
  });
}
