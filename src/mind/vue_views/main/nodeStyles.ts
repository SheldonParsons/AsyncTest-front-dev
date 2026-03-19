import type { Options } from 'roughjs/bin/core';
import type { MindNodeLike } from '@/mind/core/nodeContent';
import type { NodeStyle } from '@/mind/model/amindDoc';
import type { NodeTextStyle } from './textLayout';
import { buildCanvasFont } from '@/mind/core/text/font';
import type { RichTextAlign } from '@/mind/core/richText';
import { getActiveMind } from './actions/useDocUtils';

const DEFAULT_FONT_FAMILY = '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';
const DEFAULT_LINE_HEIGHT = 20;

export type MindNodeFillPreset = 'rough-hachure' | 'rough-cross' | 'rough-dots' | 'solid' | 'none';
export type MindNodeBorderPreset = 'clean' | 'rough-solid' | 'rough-dashed' | 'none';

export type MindNodeShapeStyle = {
  fill?: string;
  stroke?: string;
  fillPreset?: MindNodeFillPreset;
  borderPreset?: MindNodeBorderPreset;
  strokeWidthPx?: number;
};

export type MindNodeTextStyleOverrides = {
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: RichTextAlign;
};

export type MindNodeStyle = {
  shape?: MindNodeShapeStyle | null;
  text?: MindNodeTextStyleOverrides | null;
};

export type MindNodeRole = 'root' | 'secondary' | 'default';

export type MindNodeDefaultVisualStyle = {
  role: MindNodeRole;
  hasBorder: boolean;
  fill: string;
  stroke: string;
  fillPreset: MindNodeFillPreset;
  borderPreset: MindNodeBorderPreset;
  textColor: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textAlign: RichTextAlign;
  lineHeightPx: number;
  roughNodeOptions: Pick<Options, 'fillStyle' | 'fillWeight' | 'hachureGap' | 'hachureAngle'>;
  cacheKey: string;
};

const DENSE_HAND_DRAWN_FILL = {
  fillStyle: 'hachure',
  fillWeight: 3.8,
  hachureGap: 1.25,
  hachureAngle: 58,
} satisfies Pick<Options, 'fillStyle' | 'fillWeight' | 'hachureGap' | 'hachureAngle'>;

const ROOT_STYLE = {
  role: 'root',
  hasBorder: false,
  fill: '#D0D0D0',
  stroke: 'rgba(0, 0, 0, 0)',
  fillPreset: 'rough-hachure',
  borderPreset: 'none',
  textColor: '#111111',
  fontSizePx: 36,
  fontWeight: 700,
  fontStyle: 'normal',
  textAlign: 'left',
  lineHeightPx: Math.max(DEFAULT_LINE_HEIGHT, Math.ceil(36 * 1.3)),
  roughNodeOptions: DENSE_HAND_DRAWN_FILL,
  cacheKey: 'root',
} satisfies MindNodeDefaultVisualStyle;

const SECONDARY_STYLE = {
  role: 'secondary',
  hasBorder: true,
  fill: '#D02F48',
  stroke: '#111111',
  fillPreset: 'rough-hachure',
  borderPreset: 'rough-solid',
  textColor: '#ffffff',
  fontSizePx: 18,
  fontWeight: 700,
  fontStyle: 'normal',
  textAlign: 'left',
  lineHeightPx: Math.max(DEFAULT_LINE_HEIGHT, Math.ceil(18 * 1.3)),
  roughNodeOptions: DENSE_HAND_DRAWN_FILL,
  cacheKey: 'secondary',
} satisfies MindNodeDefaultVisualStyle;

const DEFAULT_STYLE = {
  role: 'default',
  hasBorder: true,
  fill: '#EEEEEE',
  stroke: '#111111',
  fillPreset: 'rough-hachure',
  borderPreset: 'rough-solid',
  textColor: '#111111',
  fontSizePx: 14,
  fontWeight: 400,
  fontStyle: 'normal',
  textAlign: 'left',
  lineHeightPx: Math.max(DEFAULT_LINE_HEIGHT, Math.ceil(14 * 1.3)),
  roughNodeOptions: DENSE_HAND_DRAWN_FILL,
  cacheKey: 'default',
} satisfies MindNodeDefaultVisualStyle;

const ROUGH_FILL_OPTIONS_BY_PRESET: Record<MindNodeFillPreset, Pick<Options, 'fillStyle' | 'fillWeight' | 'hachureGap' | 'hachureAngle'>> = {
  'rough-hachure': DENSE_HAND_DRAWN_FILL,
  'rough-cross': {
    fillStyle: 'cross-hatch',
    fillWeight: 1.7,
    hachureGap: 5,
    hachureAngle: 58,
  },
  'rough-dots': {
    fillStyle: 'dots',
    fillWeight: 1.4,
    hachureGap: 7,
    hachureAngle: 58,
  },
  solid: {
    fillStyle: 'solid',
    fillWeight: 0.8,
    hachureGap: 0,
    hachureAngle: 0,
  },
  none: {
    fillStyle: 'solid',
    fillWeight: 0.8,
    hachureGap: 0,
    hachureAngle: 0,
  },
};

function buildRoleMap(doc: any) {
  const map = new Map<string, MindNodeRole>();
  const activeMind = getActiveMind(doc);
  const roots = Array.isArray(activeMind?.roots) ? activeMind.roots : [];
  const nodes = activeMind?.nodes ?? {};

  for (const root of roots) {
    const rootId = root?.rootId;
    if (!rootId || !nodes[rootId]) continue;
    map.set(rootId, 'root');
    const childIds = Array.isArray(nodes[rootId]?.children) ? nodes[rootId].children : [];
    for (const childId of childIds) {
      if (!map.has(childId)) map.set(childId, 'secondary');
    }
  }

  return map;
}

export function getMindNodeRole(doc: any, nodeId: string | null | undefined): MindNodeRole {
  if (!doc || !nodeId) return 'default';
  return buildRoleMap(doc).get(nodeId) ?? 'default';
}

export function getNodeStyleOverrides(doc: any, nodeId: string | null | undefined): MindNodeStyle | null {
  if (!doc || !nodeId) return null;
  return getActiveMind(doc)?.nodes?.[nodeId]?.style ?? null;
}

export function getMindNodeDefaultVisualStyle(doc: any, nodeId: string | null | undefined): MindNodeDefaultVisualStyle {
  const role = getMindNodeRole(doc, nodeId);
  const baseStyle = role === 'root' ? ROOT_STYLE : role === 'secondary' ? SECONDARY_STYLE : DEFAULT_STYLE;
  const shapeStyle = getNodeStyleOverrides(doc, nodeId)?.shape ?? null;
  const fillPreset = shapeStyle?.fillPreset ?? baseStyle.fillPreset;
  const borderPreset = shapeStyle?.borderPreset ?? baseStyle.borderPreset;
  const fill = shapeStyle?.fill ?? baseStyle.fill;
  const stroke = shapeStyle?.stroke ?? baseStyle.stroke;
  return {
    ...baseStyle,
    hasBorder: borderPreset !== 'none',
    fill,
    stroke,
    fillPreset,
    borderPreset,
    roughNodeOptions: ROUGH_FILL_OPTIONS_BY_PRESET[fillPreset],
    cacheKey: [
      baseStyle.cacheKey,
      `fill:${fill}`,
      `stroke:${stroke}`,
      `fillPreset:${fillPreset}`,
      `borderPreset:${borderPreset}`,
      `strokeWidth:${shapeStyle?.strokeWidthPx ?? 'theme'}`,
    ].join('|'),
  };
}

export function buildDefaultNodeTextStyle(doc: any, nodeId: string | null | undefined): NodeTextStyle {
  const style = getMindNodeDefaultVisualStyle(doc, nodeId);
  const textStyle = getNodeStyleOverrides(doc, nodeId)?.text ?? null;
  const fontFamily = textStyle?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const fontSizePx = textStyle?.fontSizePx ?? style.fontSizePx;
  const fontWeight = textStyle?.fontWeight ?? style.fontWeight;
  const fontStyle = textStyle?.fontStyle ?? style.fontStyle;
  const lineHeightPx = Math.max(DEFAULT_LINE_HEIGHT, Math.ceil(fontSizePx * 1.3));
  return {
    fontFamily,
    fontSizePx,
    fontWeight,
    fontStyle,
    lineHeightPx,
    color: textStyle?.color ?? style.textColor,
    textAlign: textStyle?.textAlign ?? style.textAlign,
    letterSpacingPx: 0,
    canvasFontString: buildCanvasFont({
      fontFamily,
      fontSizePx,
      fontWeight,
      fontStyle,
    }),
  };
}

export function resolveNodeStyleContext(node: MindNodeLike | null | undefined, options?: { doc?: any; nodeId?: string | null }) {
  return {
    node,
    doc: options?.doc,
    nodeId: options?.nodeId ?? null,
    defaults: buildDefaultNodeTextStyle(options?.doc, options?.nodeId),
    visual: getMindNodeDefaultVisualStyle(options?.doc, options?.nodeId),
  };
}

export function createInitialNodeStyleForRole(role: MindNodeRole): NodeStyle {
  const visual = role === 'root' ? ROOT_STYLE : role === 'secondary' ? SECONDARY_STYLE : DEFAULT_STYLE;
  return {
    shape: {
      fill: visual.fill,
      stroke: visual.stroke,
      fillPreset: visual.fillPreset,
      borderPreset: visual.borderPreset,
    },
    text: {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSizePx: visual.fontSizePx,
      fontWeight: visual.fontWeight,
      fontStyle: visual.fontStyle,
      color: visual.textColor,
      textAlign: visual.textAlign,
    },
  };
}
