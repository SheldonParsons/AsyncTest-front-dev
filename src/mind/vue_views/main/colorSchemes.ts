import type { NodeShapeStyle } from '@/mind/model/amindDoc';
import type { MindNodeRole } from './nodeStyles';

export type MindBuiltinColorSchemeKey = 'basic' | 'rainbow';
export type MindColorSchemeKey = string;

export type MindColorSchemeLayerStyle = {
  fill: string;
  stroke: string;
  textColor: string;
  fillPreset?: NonNullable<NodeShapeStyle['fillPreset']>;
  borderPreset?: NonNullable<NodeShapeStyle['borderPreset']>;
  strokeWidthPx?: number;
  fontSizePx?: number;
  fontWeight?: number;
};

export type MindColorSchemeBranchStyle = {
  secondary: MindColorSchemeLayerStyle;
  default: MindColorSchemeLayerStyle;
};

export type MindColorScheme = {
  key: MindColorSchemeKey;
  name: string;
  description: string;
  root: MindColorSchemeLayerStyle;
  secondary: MindColorSchemeLayerStyle;
  default: MindColorSchemeLayerStyle;
  branches?: MindColorSchemeBranchStyle[];
  custom?: boolean;
};

function rgb(r: number, g: number, b: number) {
  return `rgb(${r}, ${g}, ${b})`;
}

function lightenRgb(r: number, g: number, b: number, amount = 0.82) {
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return rgb(mix(r), mix(g), mix(b));
}

const BASIC_ROOT: MindColorSchemeLayerStyle = {
  fill: '#D0D0D0',
  stroke: 'rgba(0, 0, 0, 0)',
  textColor: '#111111',
  fillPreset: 'solid',
  borderPreset: 'none',
};

const BASIC_SECONDARY: MindColorSchemeLayerStyle = {
  fill: '#D02F48',
  stroke: '#111111',
  textColor: '#ffffff',
  fillPreset: 'rough-hachure',
  borderPreset: 'rough-solid',
};

const BASIC_DEFAULT: MindColorSchemeLayerStyle = {
  fill: '#EEEEEE',
  stroke: '#111111',
  textColor: '#111111',
  fillPreset: 'rough-hachure',
  borderPreset: 'rough-solid',
};

const RAINBOW_SECONDARY_TEXT_STYLE = {
  fontSizePx: 16,
  fontWeight: 400,
} as const;

const RAINBOW_DEFAULT_TEXT_STYLE = {
  fontSizePx: 14,
  fontWeight: 400,
} as const;

export const mindColorSchemes: ReadonlyArray<MindColorScheme> = [
  {
    key: 'rainbow',
    name: '彩虹',
    description: '轻盈多分支',
    root: {
      fill: rgb(0, 2, 39),
      stroke: 'rgba(0, 0, 0, 0)',
      textColor: '#ffffff',
      fillPreset: 'solid',
      borderPreset: 'none',
      fontSizePx: 32,
    },
    secondary: {
      fill: rgb(230, 82, 68),
      stroke: rgb(230, 82, 68),
      textColor: '#ffffff',
      fillPreset: 'solid',
      borderPreset: 'none',
      ...RAINBOW_SECONDARY_TEXT_STYLE,
    },
    default: {
      fill: lightenRgb(230, 82, 68),
      stroke: rgb(230, 82, 68),
      textColor: '#1f2937',
      fillPreset: 'solid',
      borderPreset: 'none',
      ...RAINBOW_DEFAULT_TEXT_STYLE,
    },
    branches: [
      {
        secondary: { fill: rgb(230, 82, 68), stroke: rgb(230, 82, 68), textColor: '#ffffff', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(230, 82, 68), stroke: rgb(230, 82, 68), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
      {
        secondary: { fill: rgb(234, 164, 93), stroke: rgb(234, 164, 93), textColor: '#111111', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(234, 164, 93), stroke: rgb(234, 164, 93), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
      {
        secondary: { fill: rgb(238, 212, 78), stroke: rgb(238, 212, 78), textColor: '#111111', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(238, 212, 78), stroke: rgb(238, 212, 78), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
      {
        secondary: { fill: rgb(83, 183, 127), stroke: rgb(83, 183, 127), textColor: '#ffffff', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(83, 183, 127), stroke: rgb(83, 183, 127), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
      {
        secondary: { fill: rgb(79, 105, 246), stroke: rgb(79, 105, 246), textColor: '#ffffff', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(79, 105, 246), stroke: rgb(79, 105, 246), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
      {
        secondary: { fill: rgb(76, 73, 183), stroke: rgb(76, 73, 183), textColor: '#ffffff', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_SECONDARY_TEXT_STYLE },
        default: { fill: lightenRgb(76, 73, 183), stroke: rgb(76, 73, 183), textColor: '#1f2937', fillPreset: 'solid', borderPreset: 'none', ...RAINBOW_DEFAULT_TEXT_STYLE },
      },
    ],
  },
  {
    key: 'basic',
    name: '基础',
    description: '当前默认配色',
    root: BASIC_ROOT,
    secondary: BASIC_SECONDARY,
    default: BASIC_DEFAULT,
  },
] as const;

const colorSchemeByKey = Object.fromEntries(mindColorSchemes.map((scheme) => [scheme.key, scheme])) as Record<
  MindBuiltinColorSchemeKey,
  MindColorScheme
>;
const CUSTOM_COLOR_SCHEME_STORAGE_KEY = 'async-test:mind:custom-color-schemes:v1';

let customColorSchemeCache: MindColorScheme[] | null = null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLayerStyle(value: unknown, fallback: MindColorSchemeLayerStyle): MindColorSchemeLayerStyle {
  const source = isPlainObject(value) ? value : {};
  const fill = typeof source.fill === 'string' && source.fill.trim() ? source.fill : fallback.fill;
  const stroke = typeof source.stroke === 'string' && source.stroke.trim() ? source.stroke : fallback.stroke;
  const textColor = typeof source.textColor === 'string' && source.textColor.trim() ? source.textColor : fallback.textColor;
  const fillPreset =
    source.fillPreset === 'rough-hachure' ||
    source.fillPreset === 'rough-cross' ||
    source.fillPreset === 'rough-dots' ||
    source.fillPreset === 'solid' ||
    source.fillPreset === 'none'
      ? source.fillPreset
      : fallback.fillPreset;
  const borderPreset =
    source.borderPreset === 'clean' ||
    source.borderPreset === 'rough-solid' ||
    source.borderPreset === 'rough-dashed' ||
    source.borderPreset === 'none'
      ? source.borderPreset
      : fallback.borderPreset;
  const strokeWidthPx = Number.isFinite(source.strokeWidthPx) ? Number(source.strokeWidthPx) : fallback.strokeWidthPx;
  const fontSizePx = Number.isFinite(source.fontSizePx) ? Number(source.fontSizePx) : fallback.fontSizePx;
  const fontWeight = Number.isFinite(source.fontWeight) ? Number(source.fontWeight) : fallback.fontWeight;
  return {
    fill,
    stroke,
    textColor,
    fillPreset,
    borderPreset,
    ...(Number.isFinite(strokeWidthPx) ? { strokeWidthPx } : {}),
    ...(Number.isFinite(fontSizePx) ? { fontSizePx } : {}),
    ...(Number.isFinite(fontWeight) ? { fontWeight } : {}),
  };
}

function normalizeCustomColorScheme(value: unknown): MindColorScheme | null {
  if (!isPlainObject(value)) return null;
  const rawKey = typeof value.key === 'string' ? value.key.trim() : '';
  const key = rawKey.startsWith('custom:') ? rawKey : '';
  if (!key) return null;
  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : '自定义配色';
  return {
    key,
    name,
    description: typeof value.description === 'string' && value.description.trim() ? value.description.trim() : '本地自定义',
    root: normalizeLayerStyle(value.root, colorSchemeByKey.rainbow.root),
    secondary: normalizeLayerStyle(value.secondary, colorSchemeByKey.rainbow.secondary),
    default: normalizeLayerStyle(value.default, colorSchemeByKey.rainbow.default),
    custom: true,
  };
}

export function loadCustomMindColorSchemes(): MindColorScheme[] {
  if (typeof window === 'undefined') return [];
  if (customColorSchemeCache) return customColorSchemeCache;
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLOR_SCHEME_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    customColorSchemeCache = Array.isArray(parsed)
      ? parsed.map(normalizeCustomColorScheme).filter((scheme): scheme is MindColorScheme => !!scheme)
      : [];
  } catch {
    customColorSchemeCache = [];
  }
  return customColorSchemeCache;
}

export function saveCustomMindColorSchemes(schemes: MindColorScheme[]) {
  customColorSchemeCache = schemes.map((scheme) => ({
    ...scheme,
    custom: true,
    branches: undefined,
  }));
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_COLOR_SCHEME_STORAGE_KEY, JSON.stringify(customColorSchemeCache));
}

export function getAllMindColorSchemes(): MindColorScheme[] {
  return [...mindColorSchemes, ...loadCustomMindColorSchemes()];
}

export function isMindColorSchemeKey(value: unknown): value is MindColorSchemeKey {
  return typeof value === 'string' && !!value.trim();
}

export function getMindColorScheme(key: MindColorSchemeKey | string | null | undefined): MindColorScheme {
  if (!isMindColorSchemeKey(key)) return colorSchemeByKey.rainbow;
  return colorSchemeByKey[key as MindBuiltinColorSchemeKey] ?? loadCustomMindColorSchemes().find((scheme) => scheme.key === key) ?? colorSchemeByKey.rainbow;
}

export function resolveMindDocumentColorSchemeKey(doc: any): MindColorSchemeKey {
  const key = doc?.manifest?.colorSchemeKey;
  if (!isMindColorSchemeKey(key)) return 'rainbow';
  return getMindColorScheme(key).key;
}

export function getMindColorSchemeStyleForRole(
  schemeOrKey: MindColorScheme | MindColorSchemeKey | string | null | undefined,
  role: MindNodeRole,
  options: { branchIndex?: number | null } = {}
): MindColorSchemeLayerStyle {
  const scheme = typeof schemeOrKey === 'object' && schemeOrKey ? schemeOrKey : getMindColorScheme(schemeOrKey);
  const branchIndex = Number.isFinite(options.branchIndex) ? Number(options.branchIndex) : null;
  const branch =
    branchIndex != null && scheme.branches?.length
      ? scheme.branches[((branchIndex % scheme.branches.length) + scheme.branches.length) % scheme.branches.length]
      : null;

  if (role === 'root') return scheme.root;
  if (role === 'secondary') return branch?.secondary ?? scheme.secondary;
  return branch?.default ?? scheme.default;
}
