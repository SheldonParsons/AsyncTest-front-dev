import type { Options } from 'roughjs/bin/core';
import type { MindNodeLike } from '@/mind/core/nodeContent';
import type { NodeStyle } from '@/mind/model/amindDoc';
import type { NodeTextStyle } from './textLayout';
import { buildCanvasFont } from '@/mind/core/text/font';
import type { RichTextAlign } from '@/mind/core/richText';
import { getMindPlatformDefaultFontFamily } from '@/mind/fontRegistry.js';
import { getActiveMind } from './actions/useDocUtils';

const DEFAULT_FONT_FAMILY = getMindPlatformDefaultFontFamily(
  typeof window !== 'undefined' ? window.electronAPI?.platform : undefined
);
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
  widthPx?: number;
};

export type MindNodeStyle = {
  shape?: MindNodeShapeStyle | null;
  text?: MindNodeTextStyleOverrides | null;
};

export type MindNodeRole = 'root' | 'secondary' | 'default';
export type MindDocumentRenderStylePreset = 'clean' | 'rough';

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
  fillPreset: 'solid',
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

const ROUGH_SECONDARY_STYLE = {
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
  cacheKey: 'secondary-rough',
} satisfies MindNodeDefaultVisualStyle;

const CLEAN_SECONDARY_STYLE = {
  ...ROUGH_SECONDARY_STYLE,
  fillPreset: 'solid',
  borderPreset: 'clean',
  cacheKey: 'secondary-clean',
} satisfies MindNodeDefaultVisualStyle;

const ROUGH_DEFAULT_STYLE = {
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
  cacheKey: 'default-rough',
} satisfies MindNodeDefaultVisualStyle;

const CLEAN_DEFAULT_STYLE = {
  ...ROUGH_DEFAULT_STYLE,
  fillPreset: 'solid',
  borderPreset: 'clean',
  cacheKey: 'default-clean',
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

export function getMindNodeRole(doc: any, nodeId: string | null | undefined): MindNodeRole {
  if (!doc || !nodeId) return 'default';
  const activeMind = getActiveMind(doc);
  const roots = Array.isArray(activeMind?.roots) ? activeMind.roots : [];
  const nodes = activeMind?.nodes ?? {};

  for (const root of roots) {
    const rootId = root?.rootId;
    if (!rootId || !nodes[rootId]) continue;
    if (rootId === nodeId) return 'root';
    const childIds = Array.isArray(nodes[rootId]?.children) ? nodes[rootId].children : [];
    if (childIds.includes(nodeId)) return 'secondary';
  }

  return 'default';
}

export function getNodeStyleOverrides(doc: any, nodeId: string | null | undefined): MindNodeStyle | null {
  if (!doc || !nodeId) return null;
  return getActiveMind(doc)?.nodes?.[nodeId]?.style ?? null;
}

export function resolveMindDocumentRenderStylePreset(doc: any): MindDocumentRenderStylePreset {
  return doc?.manifest?.renderStylePreset === 'clean' ? 'clean' : 'rough';
}

function buildInheritedShapeStyle(baseStyle: MindNodeDefaultVisualStyle, sourceStyle: MindNodeDefaultVisualStyle) {
  return {
    ...baseStyle,
    fill: sourceStyle.fill,
    stroke: sourceStyle.stroke,
    fillPreset: sourceStyle.fillPreset,
    borderPreset: sourceStyle.borderPreset,
    hasBorder: sourceStyle.borderPreset !== 'none',
    roughNodeOptions: sourceStyle.roughNodeOptions,
    cacheKey: `${baseStyle.cacheKey}|inherit:${sourceStyle.cacheKey}`,
  } satisfies MindNodeDefaultVisualStyle;
}

function buildInheritedTextStyle(
  baseText: NodeStyle['text'],
  sourceText: NonNullable<NodeStyle['text']> | null | undefined
): NonNullable<NodeStyle['text']> {
  return {
    fontFamily: sourceText?.fontFamily ?? baseText?.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSizePx: sourceText?.fontSizePx ?? baseText?.fontSizePx ?? ROUGH_DEFAULT_STYLE.fontSizePx,
    fontWeight: sourceText?.fontWeight ?? baseText?.fontWeight ?? ROUGH_DEFAULT_STYLE.fontWeight,
    fontStyle: sourceText?.fontStyle ?? baseText?.fontStyle ?? ROUGH_DEFAULT_STYLE.fontStyle,
    color: sourceText?.color ?? baseText?.color ?? ROUGH_DEFAULT_STYLE.textColor,
    textAlign: sourceText?.textAlign ?? baseText?.textAlign ?? ROUGH_DEFAULT_STYLE.textAlign,
  };
}

function buildInheritedFontFamilyTextStyle(
  baseText: NodeStyle['text'],
  sourceText: NonNullable<NodeStyle['text']> | null | undefined
): NonNullable<NodeStyle['text']> {
  return {
    fontFamily: sourceText?.fontFamily ?? baseText?.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSizePx: baseText?.fontSizePx ?? ROUGH_DEFAULT_STYLE.fontSizePx,
    fontWeight: baseText?.fontWeight ?? ROUGH_DEFAULT_STYLE.fontWeight,
    fontStyle: baseText?.fontStyle ?? ROUGH_DEFAULT_STYLE.fontStyle,
    color: baseText?.color ?? ROUGH_DEFAULT_STYLE.textColor,
    textAlign: baseText?.textAlign ?? ROUGH_DEFAULT_STYLE.textAlign,
  };
}

function resolveBaseVisualStyle(role: MindNodeRole, renderStylePreset: MindDocumentRenderStylePreset) {
  if (role === 'root') return ROOT_STYLE;
  if (role === 'secondary') return renderStylePreset === 'clean' ? CLEAN_SECONDARY_STYLE : ROUGH_SECONDARY_STYLE;
  return renderStylePreset === 'clean' ? CLEAN_DEFAULT_STYLE : ROUGH_DEFAULT_STYLE;
}

function resolveNodePath(doc: any, nodeId: string | null | undefined): string[] | null {
  if (!doc || !nodeId) return null;
  const activeMind = getActiveMind(doc);
  const roots = Array.isArray(activeMind?.roots) ? activeMind.roots : [];
  const nodes = activeMind?.nodes ?? {};
  const visited = new Set<string>();

  const visit = (currentId: string): string[] | null => {
    if (!currentId || visited.has(currentId)) return null;
    visited.add(currentId);
    if (currentId === nodeId) return [currentId];
    const childIds = Array.isArray(nodes[currentId]?.children) ? nodes[currentId].children : [];
    for (const childId of childIds) {
      if (typeof childId !== 'string' || !childId) continue;
      const childPath = visit(childId);
      if (childPath) return [currentId, ...childPath];
    }
    return null;
  };

  for (const root of roots) {
    const rootId = root?.rootId;
    if (typeof rootId !== 'string' || !rootId || !nodes[rootId]) continue;
    const path = visit(rootId);
    if (path) return path;
  }

  return null;
}

function getDefaultShapeOverridesForDepth(
  depth: number,
  renderStylePreset: MindDocumentRenderStylePreset,
  parentShape: NonNullable<NodeStyle['shape']> | null
): NonNullable<NodeStyle['shape']> {
  if (depth === 0) {
    return {
      fill: ROOT_STYLE.fill,
      stroke: ROOT_STYLE.stroke,
      fillPreset: ROOT_STYLE.fillPreset,
      borderPreset: ROOT_STYLE.borderPreset,
    };
  }
  if (depth === 1) {
    const visual = resolveBaseVisualStyle('secondary', renderStylePreset);
    return {
      fill: visual.fill,
      stroke: visual.stroke,
      fillPreset: visual.fillPreset,
      borderPreset: visual.borderPreset,
    };
  }
  if (depth === 2) {
    const visual = resolveBaseVisualStyle('default', renderStylePreset);
    return {
      fill: visual.fill,
      stroke: visual.stroke,
      fillPreset: visual.fillPreset,
      borderPreset: visual.borderPreset,
    };
  }
  return {
    fill: parentShape?.fill ?? CLEAN_DEFAULT_STYLE.fill,
    stroke: parentShape?.stroke ?? CLEAN_DEFAULT_STYLE.stroke,
    fillPreset: parentShape?.fillPreset ?? CLEAN_DEFAULT_STYLE.fillPreset,
    borderPreset: parentShape?.borderPreset ?? CLEAN_DEFAULT_STYLE.borderPreset,
    strokeWidthPx: parentShape?.strokeWidthPx,
  };
}

function getDefaultTextOverridesForDepth(
  depth: number,
  renderStylePreset: MindDocumentRenderStylePreset,
  parentText: NonNullable<NodeStyle['text']> | null
): NonNullable<NodeStyle['text']> {
  if (depth === 0) {
    return {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSizePx: ROOT_STYLE.fontSizePx,
      fontWeight: ROOT_STYLE.fontWeight,
      fontStyle: ROOT_STYLE.fontStyle,
      color: ROOT_STYLE.textColor,
      textAlign: ROOT_STYLE.textAlign,
    };
  }
  if (depth === 1) {
    const visual = resolveBaseVisualStyle('secondary', renderStylePreset);
    return {
      fontFamily: parentText?.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSizePx: visual.fontSizePx,
      fontWeight: visual.fontWeight,
      fontStyle: visual.fontStyle,
      color: visual.textColor,
      textAlign: visual.textAlign,
    };
  }
  if (depth === 2) {
    return {
      fontFamily: parentText?.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSizePx: 16,
      fontWeight: ROUGH_DEFAULT_STYLE.fontWeight,
      fontStyle: ROUGH_DEFAULT_STYLE.fontStyle,
      color: ROUGH_DEFAULT_STYLE.textColor,
      textAlign: ROUGH_DEFAULT_STYLE.textAlign,
    };
  }
  return {
    fontFamily: parentText?.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSizePx: parentText?.fontSizePx ?? ROUGH_DEFAULT_STYLE.fontSizePx,
    fontWeight: parentText?.fontWeight ?? ROUGH_DEFAULT_STYLE.fontWeight,
    fontStyle: parentText?.fontStyle ?? ROUGH_DEFAULT_STYLE.fontStyle,
    color: parentText?.color ?? ROUGH_DEFAULT_STYLE.textColor,
    textAlign: parentText?.textAlign ?? ROUGH_DEFAULT_STYLE.textAlign,
  };
}

function resolveEffectiveNodeStyleForInsert(doc: any, nodeId: string | null | undefined) {
  const activeMind = getActiveMind(doc);
  const nodes = activeMind?.nodes ?? {};
  const renderStylePreset = resolveMindDocumentRenderStylePreset(doc);
  const path = resolveNodePath(doc, nodeId);
  if (!path?.length) return null;

  let parentShape: NonNullable<NodeStyle['shape']> | null = null;
  let parentText: NonNullable<NodeStyle['text']> | null = null;
  let effectiveShape: NonNullable<NodeStyle['shape']> | null = null;
  let effectiveText: NonNullable<NodeStyle['text']> | null = null;

  path.forEach((currentId, depth) => {
    const nodeStyle = nodes[currentId]?.style ?? null;
    const baseShape = getDefaultShapeOverridesForDepth(depth, renderStylePreset, parentShape);
    const baseText = getDefaultTextOverridesForDepth(depth, renderStylePreset, parentText);
    effectiveShape = {
      ...baseShape,
      ...(nodeStyle?.shape ?? {}),
    };
    effectiveText = {
      ...baseText,
      ...(nodeStyle?.text ?? {}),
    };
    parentShape = effectiveShape;
    parentText = effectiveText;
  });

  return effectiveShape && effectiveText
    ? {
        shape: effectiveShape,
        text: effectiveText,
      }
    : null;
}

export function getMindNodeDefaultVisualStyle(doc: any, nodeId: string | null | undefined): MindNodeDefaultVisualStyle {
  const role = getMindNodeRole(doc, nodeId);
  const renderStylePreset = resolveMindDocumentRenderStylePreset(doc);
  const baseStyle = resolveBaseVisualStyle(role, renderStylePreset);
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
  return createInitialNodeStyleForRoleWithDoc(role, null);
}

export function createInitialNodeStyleForRoleWithDoc(role: MindNodeRole, doc: any): NodeStyle {
  const renderStylePreset = resolveMindDocumentRenderStylePreset(doc);
  const visual = resolveBaseVisualStyle(role, renderStylePreset);
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

export function createInitialNodeStyleForInsert(options: {
  role: MindNodeRole;
  doc: any;
  parentId?: string | null;
  insertIndex?: number;
}): NodeStyle {
  const role = options.role;
  const renderStylePreset = resolveMindDocumentRenderStylePreset(options.doc);
  let visual: MindNodeDefaultVisualStyle;
  let shape: NonNullable<NodeStyle['shape']>;
  let text: NonNullable<NodeStyle['text']>;
  const parentEffectiveStyle = options.parentId ? resolveEffectiveNodeStyleForInsert(options.doc, options.parentId) : null;
  const parentText = parentEffectiveStyle?.text ?? (options.parentId ? getNodeStyleOverrides(options.doc, options.parentId)?.text ?? null : null);

  if (!options.parentId) {
    visual = resolveBaseVisualStyle(role, renderStylePreset);
    shape = {
      fill: visual.fill,
      stroke: visual.stroke,
      fillPreset: visual.fillPreset,
      borderPreset: visual.borderPreset,
    };
  } else {
    const parentRole = getMindNodeRole(options.doc, options.parentId);
    if (parentRole === 'root') {
      visual = resolveBaseVisualStyle('secondary', renderStylePreset);
      shape = {
        fill: visual.fill,
        stroke: visual.stroke,
        fillPreset: visual.fillPreset,
        borderPreset: visual.borderPreset,
      };
    } else if (parentRole === 'secondary') {
      visual = resolveBaseVisualStyle('default', renderStylePreset);
      shape = {
        fill: visual.fill,
        stroke: visual.stroke,
        fillPreset: visual.fillPreset,
        borderPreset: visual.borderPreset,
      };
    } else {
      visual = resolveBaseVisualStyle('default', renderStylePreset);
      shape = {
        fill: parentEffectiveStyle?.shape.fill ?? visual.fill,
        stroke: parentEffectiveStyle?.shape.stroke ?? visual.stroke,
        fillPreset: parentEffectiveStyle?.shape.fillPreset ?? visual.fillPreset,
        borderPreset: parentEffectiveStyle?.shape.borderPreset ?? visual.borderPreset,
        strokeWidthPx: parentEffectiveStyle?.shape.strokeWidthPx,
      };
    }
  }

  const textBase =
    role === 'root'
      ? ROOT_STYLE
      : role === 'secondary'
        ? ROUGH_SECONDARY_STYLE
        : ROUGH_DEFAULT_STYLE;

  if (!options.parentId) {
    text = {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSizePx: textBase.fontSizePx,
      fontWeight: textBase.fontWeight,
      fontStyle: textBase.fontStyle,
      color: textBase.textColor,
      textAlign: textBase.textAlign,
    };
  } else {
    const parentRole = getMindNodeRole(options.doc, options.parentId);
    if (parentRole === 'root') {
      text = buildInheritedFontFamilyTextStyle(
        {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSizePx: ROUGH_SECONDARY_STYLE.fontSizePx,
          fontWeight: ROUGH_SECONDARY_STYLE.fontWeight,
          fontStyle: ROUGH_SECONDARY_STYLE.fontStyle,
          color: ROUGH_SECONDARY_STYLE.textColor,
          textAlign: ROUGH_SECONDARY_STYLE.textAlign,
        },
        parentText
      );
    } else if (parentRole === 'secondary') {
      text = buildInheritedFontFamilyTextStyle(
        {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSizePx: 16,
          fontWeight: ROUGH_DEFAULT_STYLE.fontWeight,
          fontStyle: ROUGH_DEFAULT_STYLE.fontStyle,
          color: ROUGH_DEFAULT_STYLE.textColor,
          textAlign: ROUGH_DEFAULT_STYLE.textAlign,
        },
        parentText
      );
    } else {
      text = buildInheritedTextStyle(
        {
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSizePx: textBase.fontSizePx,
          fontWeight: textBase.fontWeight,
          fontStyle: textBase.fontStyle,
          color: textBase.textColor,
          textAlign: textBase.textAlign,
        },
        parentText
      );
    }
  }

  return {
    shape,
    text,
  };
}
