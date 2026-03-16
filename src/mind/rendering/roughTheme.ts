import type { Options } from 'roughjs/bin/core';

export const ROUGH_THEME_PRESET_STORAGE_KEY = 'mind.roughThemePreset';
export const ROUGH_THEME_OVERRIDES_STORAGE_KEY = 'mind.roughThemeOverrides';
export const ROUGH_THEME_PRESET_QUERY_KEY = 'mindRoughThemePreset';

export type RoughPresetName = 'clean' | 'warm-paper' | 'mono' | 'accent-blue';

type RoughColorGroup = {
  background: string;
  node: {
    stroke: string;
    fill: string;
    text: string;
  };
  edges: {
    trunkStroke: string;
    branchStroke: string;
  };
  hover: {
    stroke: string;
  };
  selection: {
    stroke: string;
  };
  marquee: {
    stroke: string;
    fill: string;
  };
};

type RoughFillConfig = {
  nodeFillStyle: 'solid' | 'hachure' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line';
  fillWeight?: number;
  hachureGap?: number;
  hachureAngle?: number;
};

export type RoughTheme = {
  presetName: RoughPresetName;
  strokeWidthPx: number;
  roughness: number;
  bowing: number;
  overlapPx: number;
  seedMode: 'stable';
  disableMultiStroke: boolean;
  disableMultiStrokeFill: boolean;
  colors: RoughColorGroup;
  fills: RoughFillConfig;
};

export type RoughThemeOverrides = Partial<{
  strokeWidthPx: number;
  roughness: number;
  bowing: number;
  overlapPx: number;
  disableMultiStroke: boolean;
  disableMultiStrokeFill: boolean;
  colors: Partial<{
    background: string;
    node: Partial<RoughColorGroup['node']>;
    edges: Partial<RoughColorGroup['edges']>;
    hover: Partial<RoughColorGroup['hover']>;
    selection: Partial<RoughColorGroup['selection']>;
    marquee: Partial<RoughColorGroup['marquee']>;
  }>;
  fills: Partial<RoughFillConfig>;
}>;

export type ResolvedRoughTheme = RoughTheme & {
  themeSignature: string;
  nodeOptions: Options;
  branchOptions: Options;
};

const DEFAULT_SELECTION_STROKE = 'rgba(37, 99, 235, 0.92)';
const DEFAULT_HOVER_STROKE = 'rgba(96, 165, 250, 0.82)';
const DEFAULT_MARQUEE_STROKE = 'rgba(37, 99, 235, 1)';
const DEFAULT_MARQUEE_FILL = 'rgba(147, 197, 253, 0.18)';

export const defaultTheme: RoughTheme = {
  presetName: 'clean',
  strokeWidthPx: 2,
  roughness: 0.7,
  bowing: 0.7,
  overlapPx: 6,
  seedMode: 'stable',
  disableMultiStroke: false,
  disableMultiStrokeFill: true,
  colors: {
    background: '#ffffff',
    node: {
      stroke: '#000000',
      fill: '#ffffff',
      text: '#111111',
    },
    edges: {
      trunkStroke: '#000000',
      branchStroke: '#000000',
    },
    hover: {
      stroke: DEFAULT_HOVER_STROKE,
    },
    selection: {
      stroke: DEFAULT_SELECTION_STROKE,
    },
    marquee: {
      stroke: DEFAULT_MARQUEE_STROKE,
      fill: DEFAULT_MARQUEE_FILL,
    },
  },
  fills: {
    nodeFillStyle: 'solid',
  },
};

export const roughThemePresets: Record<RoughPresetName, RoughTheme> = {
  clean: defaultTheme,
  'warm-paper': {
    ...defaultTheme,
    presetName: 'warm-paper',
    strokeWidthPx: 2.1,
    roughness: 0.95,
    bowing: 0.85,
    colors: {
      ...defaultTheme.colors,
      node: {
        stroke: '#111111',
        fill: '#fffaf2',
        text: '#1f1f1f',
      },
      edges: {
        trunkStroke: '#111111',
        branchStroke: '#111111',
      },
    },
  },
  mono: {
    ...defaultTheme,
    presetName: 'mono',
    roughness: 0.8,
    bowing: 0.6,
    overlapPx: 5,
    colors: {
      ...defaultTheme.colors,
      node: {
        stroke: '#000000',
        fill: '#ffffff',
        text: '#111111',
      },
      edges: {
        trunkStroke: '#000000',
        branchStroke: '#000000',
      },
    },
  },
  'accent-blue': {
    ...defaultTheme,
    presetName: 'accent-blue',
    roughness: 0.92,
    bowing: 0.72,
    colors: {
      ...defaultTheme.colors,
      node: {
        stroke: '#0f172a',
        fill: '#ffffff',
        text: '#111111',
      },
      edges: {
        trunkStroke: '#0f172a',
        branchStroke: '#0f172a',
      },
      selection: {
        stroke: 'rgba(29, 78, 216, 0.98)',
      },
      hover: {
        stroke: 'rgba(96, 165, 250, 0.9)',
      },
    },
  },
};

function isRoughPresetName(value: string | null | undefined): value is RoughPresetName {
  return value === 'clean' || value === 'warm-paper' || value === 'mono' || value === 'accent-blue';
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableSerialize(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(',')}}`;
}

function mergeTheme(base: RoughTheme, overrides: RoughThemeOverrides): RoughTheme {
  return {
    ...base,
    strokeWidthPx: overrides.strokeWidthPx ?? base.strokeWidthPx,
    roughness: overrides.roughness ?? base.roughness,
    bowing: overrides.bowing ?? base.bowing,
    overlapPx: overrides.overlapPx ?? base.overlapPx,
    disableMultiStroke: overrides.disableMultiStroke ?? base.disableMultiStroke,
    disableMultiStrokeFill: overrides.disableMultiStrokeFill ?? base.disableMultiStrokeFill,
    colors: {
      ...base.colors,
      background: overrides.colors?.background ?? base.colors.background,
      node: {
        ...base.colors.node,
        ...overrides.colors?.node,
      },
      edges: {
        ...base.colors.edges,
        ...overrides.colors?.edges,
      },
      hover: {
        ...base.colors.hover,
        ...overrides.colors?.hover,
      },
      selection: {
        ...base.colors.selection,
        ...overrides.colors?.selection,
      },
      marquee: {
        ...base.colors.marquee,
        ...overrides.colors?.marquee,
      },
    },
    fills: {
      ...base.fills,
      ...overrides.fills,
    },
  };
}

function parseOverrides(raw: string | null | undefined): RoughThemeOverrides {
  if (!raw) return {};
  try {
    return (JSON.parse(raw) as RoughThemeOverrides) ?? {};
  } catch {
    return {};
  }
}

function readPresetFromBrowser(): RoughPresetName {
  if (typeof window === 'undefined') return defaultTheme.presetName;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryPreset = params.get(ROUGH_THEME_PRESET_QUERY_KEY);
    if (isRoughPresetName(queryPreset)) return queryPreset;
    const storagePreset = window.localStorage.getItem(ROUGH_THEME_PRESET_STORAGE_KEY);
    if (isRoughPresetName(storagePreset)) return storagePreset;
  } catch {
    return defaultTheme.presetName;
  }
  return defaultTheme.presetName;
}

function readOverridesFromBrowser(): RoughThemeOverrides {
  if (typeof window === 'undefined') return {};
  try {
    return parseOverrides(window.localStorage.getItem(ROUGH_THEME_OVERRIDES_STORAGE_KEY));
  } catch {
    return {};
  }
}

function createResolvedTheme(presetName: RoughPresetName, overrides: RoughThemeOverrides): ResolvedRoughTheme {
  const baseTheme = roughThemePresets[presetName] ?? defaultTheme;
  const merged = mergeTheme(baseTheme, overrides);
  const strokeWidthPx = clampNumber(merged.strokeWidthPx, 0.5, 6);
  const roughness = clampNumber(merged.roughness, 0, 3);
  const bowing = clampNumber(merged.bowing, 0, 3);
  const overlapPx = clampNumber(merged.overlapPx, 0, 20);
  const themeCore: RoughTheme = {
    ...merged,
    strokeWidthPx,
    roughness,
    bowing,
    overlapPx,
  };
  const themeSignature = stableSerialize({
    presetName: themeCore.presetName,
    strokeWidthPx: themeCore.strokeWidthPx,
    roughness: themeCore.roughness,
    bowing: themeCore.bowing,
    overlapPx: themeCore.overlapPx,
    disableMultiStroke: themeCore.disableMultiStroke,
    disableMultiStrokeFill: themeCore.disableMultiStrokeFill,
    colors: themeCore.colors,
    fills: themeCore.fills,
  });
  const sharedOptions: Options = {
    roughness,
    bowing,
    maxRandomnessOffset: Math.max(0.9, strokeWidthPx * 0.7),
    disableMultiStroke: themeCore.disableMultiStroke,
    disableMultiStrokeFill: themeCore.disableMultiStrokeFill,
    preserveVertices: false,
  };
  return {
    ...themeCore,
    themeSignature,
    nodeOptions: {
      ...sharedOptions,
      fill: themeCore.colors.node.fill,
      fillStyle: themeCore.fills.nodeFillStyle,
      fillWeight: themeCore.fills.fillWeight,
      hachureGap: themeCore.fills.hachureGap,
      hachureAngle: themeCore.fills.hachureAngle,
    },
    branchOptions: {
      ...sharedOptions,
    },
  };
}

type ThemeListener = (theme: ResolvedRoughTheme) => void;

let currentPresetName: RoughPresetName = readPresetFromBrowser();
let currentOverrides: RoughThemeOverrides = readOverridesFromBrowser();
export let currentTheme: ResolvedRoughTheme = createResolvedTheme(currentPresetName, currentOverrides);
const listeners = new Set<ThemeListener>();
let browserHooksReady = false;
let observedStorageSignature = '';

function emitThemeChange() {
  currentTheme = createResolvedTheme(currentPresetName, currentOverrides);
  for (const listener of listeners) listener(currentTheme);
}

function persistPreset() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROUGH_THEME_PRESET_STORAGE_KEY, currentPresetName);
}

function persistOverrides() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROUGH_THEME_OVERRIDES_STORAGE_KEY, JSON.stringify(currentOverrides));
}

function refreshFromBrowserState() {
  const nextPreset = readPresetFromBrowser();
  const nextOverrides = readOverridesFromBrowser();
  const nextSignature = stableSerialize({ nextPreset, nextOverrides });
  if (nextSignature === observedStorageSignature) return;
  observedStorageSignature = nextSignature;
  currentPresetName = nextPreset;
  currentOverrides = nextOverrides;
  emitThemeChange();
}

export function getCurrentRoughTheme() {
  return currentTheme;
}

export function setRoughThemePreset(presetName: RoughPresetName) {
  currentPresetName = presetName;
  persistPreset();
  observedStorageSignature = stableSerialize({ nextPreset: currentPresetName, nextOverrides: currentOverrides });
  emitThemeChange();
}

export function setRoughThemeOverrides(partial: RoughThemeOverrides) {
  currentOverrides = mergeThemeOverrides(currentOverrides, partial);
  persistOverrides();
  observedStorageSignature = stableSerialize({ nextPreset: currentPresetName, nextOverrides: currentOverrides });
  emitThemeChange();
}

export function resetRoughThemeOverrides() {
  currentOverrides = {};
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ROUGH_THEME_OVERRIDES_STORAGE_KEY);
  }
  observedStorageSignature = stableSerialize({ nextPreset: currentPresetName, nextOverrides: currentOverrides });
  emitThemeChange();
}

function mergeThemeOverrides(base: RoughThemeOverrides, patch: RoughThemeOverrides): RoughThemeOverrides {
  return {
    ...base,
    ...patch,
    colors: {
      ...base.colors,
      ...patch.colors,
      node: {
        ...base.colors?.node,
        ...patch.colors?.node,
      },
      edges: {
        ...base.colors?.edges,
        ...patch.colors?.edges,
      },
      hover: {
        ...base.colors?.hover,
        ...patch.colors?.hover,
      },
      selection: {
        ...base.colors?.selection,
        ...patch.colors?.selection,
      },
      marquee: {
        ...base.colors?.marquee,
        ...patch.colors?.marquee,
      },
    },
    fills: {
      ...base.fills,
      ...patch.fills,
    },
  };
}

export function getRoughThemeDebug() {
  return {
    presetName: currentPresetName,
    overrides: currentOverrides,
    currentTheme,
    storageKeys: {
      preset: ROUGH_THEME_PRESET_STORAGE_KEY,
      overrides: ROUGH_THEME_OVERRIDES_STORAGE_KEY,
    },
  };
}

export function subscribeRoughThemeChanges(listener: ThemeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureRoughThemeDebugApi() {
  if (typeof window === 'undefined') return;
  const target = window as Window &
    typeof globalThis & {
      setRoughThemeOverrides?: typeof setRoughThemeOverrides;
      resetRoughThemeOverrides?: typeof resetRoughThemeOverrides;
      getRoughThemeDebug?: typeof getRoughThemeDebug;
      setRoughThemePreset?: typeof setRoughThemePreset;
    };
  target.setRoughThemeOverrides = setRoughThemeOverrides;
  target.resetRoughThemeOverrides = resetRoughThemeOverrides;
  target.getRoughThemeDebug = getRoughThemeDebug;
  target.setRoughThemePreset = setRoughThemePreset;
}

export function setupRoughThemeBrowserSync() {
  if (browserHooksReady || typeof window === 'undefined') return;
  browserHooksReady = true;
  observedStorageSignature = stableSerialize({ nextPreset: currentPresetName, nextOverrides: currentOverrides });
  ensureRoughThemeDebugApi();
  window.addEventListener('storage', refreshFromBrowserState);
  window.setInterval(refreshFromBrowserState, 250);
}

