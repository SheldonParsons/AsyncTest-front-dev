import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { MindNodeBorderPreset, MindNodeFillPreset } from '../nodeStyles';

export const styleColorSwatches = [
  '#ffffff',
  '#EEEEEE',
  '#111111',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#D02F48',
  '#8b5cf6',
  '#3b82f6',
  '#14b8a6',
  '#22c55e',
  '#D0D0D0',
] as const;

export const styleFillColorSwatches = styleColorSwatches;
export const styleOutlineColorSwatches = styleColorSwatches;

export const styleFillOptions = [
  {
    key: 'rough-hachure',
    label: '手绘斜线',
    caption: 'Hachure',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'hachure',
      fillColor: '#f4b740',
      strokeColor: '#0f172a',
      roughness: 0.92,
      hachureGap: 2.2,
      fillWeight: 3.8,
    }),
  },
  {
    key: 'rough-cross',
    label: '交叉排线',
    caption: 'Cross-hatch',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'cross-hatch',
      fillColor: '#e879f9',
      strokeColor: '#0f172a',
      roughness: 1.1,
      hachureGap: 5,
      fillWeight: 1.7,
    }),
  },
  {
    key: 'rough-dots',
    label: '点状填充',
    caption: 'Dots',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'dots',
      fillColor: '#38bdf8',
      strokeColor: '#0f172a',
      roughness: 0.95,
      hachureGap: 7,
      fillWeight: 1.4,
    }),
  },
  {
    key: 'solid',
    label: '纯色填充',
    caption: 'Solid',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'solid',
      fillColor: '#111827',
      strokeColor: '#0f172a',
      roughness: 0.2,
      fillWeight: 0.8,
    }),
  },
  {
    key: 'none',
    label: '无填充',
    caption: 'None',
    previewSvg: buildNoneFillPreviewSvg(),
  },
] as const;

export const styleBorderOptions = [
  {
    key: 'clean',
    label: '无风格线条',
    caption: 'Clean',
    previewSvg: buildCleanBorderPreviewSvg(),
  },
  {
    key: 'rough-solid',
    label: '手绘实线',
    caption: 'Rough solid',
    previewSvg: buildRoughBorderPreviewSvg({
      strokeColor: '#111827',
      strokeWidth: 1.8,
      roughness: 1.05,
      bowing: 1,
    }),
  },
  {
    key: 'rough-dashed',
    label: '手绘虚线',
    caption: 'Rough dashed',
    previewSvg: buildRoughDashedBorderPreviewSvg({
      strokeColor: '#111827',
      strokeWidth: 1.8,
      roughness: 1.1,
      bowing: 1.1,
    }),
  },
  {
    key: 'none',
    label: '无边框',
    caption: 'None',
    previewSvg: buildNoBorderPreviewSvg(),
  },
] as const;

export const styleStrokeWidthOptions = [
  { key: 'hairline', label: '极细', previewPx: 1 },
  { key: 'thin', label: '细', previewPx: 2 },
  { key: 'medium', label: '中等', previewPx: 3 },
  { key: 'thick', label: '粗', previewPx: 4 },
  { key: 'heavy', label: '极粗', previewPx: 6 },
] as const;

export const styleFontOptions = [
  {
    key: 'modern-sans',
    label: 'Microsoft YaHei',
    sample: 'YaHei',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  {
    key: 'humanist',
    label: 'Humanist',
    sample: 'Trebuchet',
    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
  },
  {
    key: 'classic-serif',
    label: 'Classic Serif',
    sample: 'Georgia',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    key: 'mono',
    label: 'Mono',
    sample: 'SF Mono',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
] as const;

export const styleFontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as const;

export const styleTextToggleOptions = [
  { key: 'bold', label: '粗体', glyph: 'B', previewClass: 'is-bold' },
  { key: 'italic', label: '斜体', glyph: 'I', previewClass: 'is-italic' },
  { key: 'underline', label: '下划线', glyph: 'U', previewClass: 'is-underline' },
  { key: 'strike', label: '删除线', glyph: 'S', previewClass: 'is-strike' },
] as const;

export const styleTextAlignOptions = [
  { key: 'left', label: '左对齐' },
  { key: 'center', label: '居中对齐' },
  { key: 'right', label: '右对齐' },
] as const;

export type StyleFillPresetKey = (typeof styleFillOptions)[number]['key'];
export type StyleBorderPresetKey = (typeof styleBorderOptions)[number]['key'];
export type StyleBorderWidthKey = (typeof styleStrokeWidthOptions)[number]['key'];
export type StyleFontKey = (typeof styleFontOptions)[number]['key'];
export type StyleFontSizeValue = (typeof styleFontSizes)[number];
export type StyleTextToggleKey = (typeof styleTextToggleOptions)[number]['key'];
export type StyleTextAlignKey = (typeof styleTextAlignOptions)[number]['key'];

export function mapFillPresetKeyToNodePreset(key: StyleFillPresetKey): MindNodeFillPreset {
  if (key === 'rough-cross') return 'rough-cross';
  if (key === 'rough-dots') return 'rough-dots';
  if (key === 'solid') return 'solid';
  if (key === 'none') return 'none';
  return 'rough-hachure';
}

export function mapNodeFillPresetToPanelKey(preset: MindNodeFillPreset): StyleFillPresetKey {
  return preset;
}

export function mapBorderPresetKeyToNodePreset(key: StyleBorderPresetKey): MindNodeBorderPreset {
  if (key === 'clean') return 'clean';
  if (key === 'rough-dashed') return 'rough-dashed';
  if (key === 'none') return 'none';
  return 'rough-solid';
}

export function mapNodeBorderPresetToPanelKey(preset: MindNodeBorderPreset): StyleBorderPresetKey {
  return preset;
}

export function resolveStrokeWidthKey(strokeWidthPx: number): StyleBorderWidthKey {
  return styleStrokeWidthOptions.reduce((closest, option) => {
    const closestDistance = Math.abs(closest.previewPx - strokeWidthPx);
    const nextDistance = Math.abs(option.previewPx - strokeWidthPx);
    return nextDistance < closestDistance ? option : closest;
  }).key;
}

export function mapBorderWidthKeyToStrokeWidth(key: StyleBorderWidthKey) {
  return styleStrokeWidthOptions.find((option) => option.key === key)?.previewPx ?? 3;
}

export function resolveFontOptionKey(fontFamily: string): StyleFontKey {
  const normalizedFontFamily = normalizeStyleToken(fontFamily);
  const matched = styleFontOptions.find((option) => {
    const candidates = [
      option.fontFamily,
      option.label,
      option.sample,
      option.key === 'modern-sans' ? 'pingfang sc' : '',
      option.key === 'modern-sans' ? 'helvetica neue' : '',
      option.key === 'modern-sans' ? 'microsoft yahei' : '',
      option.key === 'humanist' ? 'trebuchet ms' : '',
      option.key === 'humanist' ? 'verdana' : '',
      option.key === 'classic-serif' ? 'times new roman' : '',
      option.key === 'classic-serif' ? 'georgia' : '',
      option.key === 'mono' ? 'sfmono' : '',
      option.key === 'mono' ? 'consolas' : '',
    ].map((value) => normalizeStyleToken(value));
    return candidates.some((candidate) => candidate && normalizedFontFamily.includes(candidate));
  });
  return matched?.key ?? 'modern-sans';
}

export function resolveFontSizeValue(fontSizePx: number): StyleFontSizeValue {
  return styleFontSizes.reduce((closest, option) => {
    const closestDistance = Math.abs(closest - fontSizePx);
    const nextDistance = Math.abs(option - fontSizePx);
    return nextDistance < closestDistance ? option : closest;
  });
}

function normalizeStyleToken(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function buildPreviewSvgFrame(inner: string) {
  return [
    '<svg viewBox="0 0 84 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '<rect x="0.75" y="0.75" width="82.5" height="54.5" rx="14" fill="#ffffff" stroke="rgba(148, 163, 184, 0.24)" />',
    inner,
    '</svg>',
  ].join('');
}

function createPreviewRoundedRectPathData(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r <= 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }
  return [
    `M ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height - r}`,
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
    `L ${x + r} ${y + height}`,
    `Q ${x} ${y + height} ${x} ${y + height - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function renderRoughPathToSvg(pathData: string, options: Options) {
  const generator = rough.generator();
  const drawable = generator.path(pathData, {
    seed: 19,
    preserveVertices: false,
    ...options,
  });

  return generator.toPaths(drawable).map((path) => [
    `<path d="${path.d}"`,
    `fill="${path.fill ?? 'none'}"`,
    `stroke="${path.stroke ?? 'none'}"`,
    `stroke-width="${path.strokeWidth ?? 1}"`,
    options.strokeLineDash?.length ? `stroke-dasharray="${options.strokeLineDash.join(' ')}"` : '',
    'stroke-linecap="round"',
    'stroke-linejoin="round"',
    '/>',
  ].filter(Boolean).join(' ')).join('');
}

function buildFillPreviewSvg(options: {
  fillStyle: NonNullable<Options['fillStyle']>;
  fillColor: string;
  strokeColor: string;
  roughness: number;
  hachureGap?: number;
  fillWeight: number;
}) {
  const roundedPath = createPreviewRoundedRectPathData(18, 12, 48, 30, 10);
  return buildPreviewSvgFrame(renderRoughPathToSvg(roundedPath, {
    fill: options.fillColor,
    fillStyle: options.fillStyle,
    fillWeight: options.fillWeight,
    hachureGap: options.hachureGap,
    hachureAngle: 58,
    stroke: options.strokeColor,
    strokeWidth: 1.35,
    roughness: options.roughness,
    bowing: 0.92,
    disableMultiStrokeFill: options.fillStyle === 'solid',
  }));
}

function buildNoneFillPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="rgba(255,255,255,0.01)" stroke="rgba(148, 163, 184, 0.95)" stroke-dasharray="4 4" stroke-width="1.2" />',
    '<path d="M24 36 L60 18" stroke="rgba(148, 163, 184, 0.9)" stroke-width="2" stroke-linecap="round" />',
  ].join(''));
}

function buildCleanBorderPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#f8fafc" stroke="#111827" stroke-width="1.6" />',
  ].join(''));
}

function buildRoughBorderPreviewSvg(options: {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  bowing: number;
  strokeLineDash?: number[];
}) {
  const roundedPath = createPreviewRoundedRectPathData(18, 12, 48, 30, 10);
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#f8fafc" stroke="none" />',
    renderRoughPathToSvg(roundedPath, {
      fill: 'transparent',
      stroke: options.strokeColor,
      strokeWidth: options.strokeWidth,
      roughness: options.roughness,
      bowing: options.bowing,
      strokeLineDash: options.strokeLineDash,
      fillStyle: 'solid',
      disableMultiStrokeFill: true,
    }),
  ].join(''));
}

function buildRoughDashedBorderPreviewSvg(options: {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  bowing: number;
}) {
  return buildRoughBorderPreviewSvg({
    ...options,
    strokeLineDash: [6, 5],
  });
}

function buildNoBorderPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#e2e8f0" stroke="none" />',
    '<path d="M24 36 L60 18" stroke="rgba(100, 116, 139, 0.78)" stroke-width="2" stroke-linecap="round" />',
  ].join(''));
}
