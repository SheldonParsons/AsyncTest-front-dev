import { getMindPlatformDefaultFontFamily } from '../../src/mind/fontRegistry.js';

const DEFAULT_FONT_FAMILY = getMindPlatformDefaultFontFamily(process.platform);

const ROOT_STYLE = {
  shape: {
    fill: '#D0D0D0',
    stroke: 'rgba(0, 0, 0, 0)',
    fillPreset: 'solid',
    borderPreset: 'none',
  },
  text: {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSizePx: 36,
    fontWeight: 700,
    fontStyle: 'normal',
    color: '#111111',
    textAlign: 'left',
  },
};

const SECONDARY_STYLE = {
  shape: {
    fill: '#D02F48',
    stroke: '#111111',
    fillPreset: 'solid',
    borderPreset: 'clean',
  },
  text: {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSizePx: 18,
    fontWeight: 700,
    fontStyle: 'normal',
    color: '#ffffff',
    textAlign: 'left',
  },
};

const TERTIARY_STYLE = {
  shape: {
    fill: '#EEEEEE',
    stroke: '#111111',
    fillPreset: 'solid',
    borderPreset: 'clean',
  },
  text: {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSizePx: 16,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#111111',
    textAlign: 'left',
  },
};

const LEGACY_DEEP_DEFAULT_SHAPE_FILLS = new Set(['#EEEEEE', '#eeeeee']);
const LEGACY_DEEP_DEFAULT_SHAPE_STROKES = new Set(['#111111', '#000000']);
const LEGACY_DEEP_DEFAULT_FILL_PRESETS = new Set(['solid', 'rough-hachure']);
const LEGACY_DEEP_DEFAULT_BORDER_PRESETS = new Set(['clean', 'rough-solid']);

function isMindBoard(board) {
  return !!board && typeof board === 'object' && !!board.nodes && typeof board.nodes === 'object';
}

function ensureBoardList(doc) {
  const multiMindBoards = doc?.mind?.minds;
  if (multiMindBoards && typeof multiMindBoards === 'object') {
    return Object.values(multiMindBoards).filter((board) => isMindBoard(board));
  }
  if (Array.isArray(doc?.minds)) {
    return doc.minds.filter((board) => isMindBoard(board));
  }
  if (isMindBoard(doc?.mind)) return [doc.mind];
  return [];
}

function mergeMissing(target, defaults) {
  const next = { ...(target ?? {}) };
  Object.entries(defaults).forEach(([key, value]) => {
    if (next[key] === undefined || next[key] === null || next[key] === '') {
      next[key] = value;
    }
  });
  return next;
}

function buildEffectiveStyle(depth, parentEffectiveStyle) {
  if (depth === 0) return structuredClone(ROOT_STYLE);
  if (depth === 1) {
    return {
      shape: { ...SECONDARY_STYLE.shape },
      text: {
        ...SECONDARY_STYLE.text,
        fontFamily: parentEffectiveStyle?.text?.fontFamily ?? DEFAULT_FONT_FAMILY,
      },
    };
  }
  if (depth === 2) {
    return {
      shape: { ...TERTIARY_STYLE.shape },
      text: {
        ...TERTIARY_STYLE.text,
        fontFamily: parentEffectiveStyle?.text?.fontFamily ?? DEFAULT_FONT_FAMILY,
      },
    };
  }
  return {
    shape: { ...(parentEffectiveStyle?.shape ?? TERTIARY_STYLE.shape) },
    text: { ...(parentEffectiveStyle?.text ?? TERTIARY_STYLE.text) },
  };
}

function shouldInheritParentShapeAtDepth(shape, depth) {
  if (depth < 3) return false;
  if (!shape || typeof shape !== 'object') return true;

  const hasExplicitStrokeWidth = shape.strokeWidthPx !== undefined && shape.strokeWidthPx !== null;
  if (hasExplicitStrokeWidth) return false;

  const fill = typeof shape.fill === 'string' ? shape.fill.trim() : '';
  const stroke = typeof shape.stroke === 'string' ? shape.stroke.trim() : '';
  const fillPreset = typeof shape.fillPreset === 'string' ? shape.fillPreset.trim() : '';
  const borderPreset = typeof shape.borderPreset === 'string' ? shape.borderPreset.trim() : '';

  const fillMatches = !fill || LEGACY_DEEP_DEFAULT_SHAPE_FILLS.has(fill);
  const strokeMatches = !stroke || LEGACY_DEEP_DEFAULT_SHAPE_STROKES.has(stroke);
  const fillPresetMatches = !fillPreset || LEGACY_DEEP_DEFAULT_FILL_PRESETS.has(fillPreset);
  const borderPresetMatches = !borderPreset || LEGACY_DEEP_DEFAULT_BORDER_PRESETS.has(borderPreset);

  return fillMatches && strokeMatches && fillPresetMatches && borderPresetMatches;
}

function buildFixedTextStyle(nodeText, expectedText, depth, parentEffectiveStyle) {
  const currentFontFamily = typeof nodeText?.fontFamily === 'string' && nodeText.fontFamily.trim()
    ? nodeText.fontFamily
    : null;
  const inheritedFontFamily =
    depth === 0
      ? currentFontFamily ?? expectedText.fontFamily
      : parentEffectiveStyle?.text?.fontFamily ?? currentFontFamily ?? expectedText.fontFamily;
  return {
    ...expectedText,
    fontFamily: inheritedFontFamily,
  };
}

function migrateBoardNodes(board) {
  const nodes = board?.nodes;
  const roots = Array.isArray(board?.roots) ? board.roots : [];
  if (!nodes || typeof nodes !== 'object' || !roots.length) return;

  const visit = (nodeId, depth, parentEffectiveStyle) => {
    const node = nodes[nodeId];
    if (!node || typeof node !== 'object') return;
    const expected = buildEffectiveStyle(depth, parentEffectiveStyle);
    node.style = node.style && typeof node.style === 'object' ? node.style : {};
    if (depth <= 2) {
      node.style.shape = { ...expected.shape };
      node.style.text = buildFixedTextStyle(node.style.text, expected.text, depth, parentEffectiveStyle);
    } else {
      node.style.shape =
        shouldInheritParentShapeAtDepth(node.style.shape, depth) && parentEffectiveStyle?.shape
          ? { ...parentEffectiveStyle.shape }
          : mergeMissing(node.style.shape, expected.shape);
      node.style.text = mergeMissing(node.style.text, expected.text);
    }
    const effectiveStyle = {
      shape: { ...expected.shape, ...(node.style.shape ?? {}) },
      text: { ...expected.text, ...(node.style.text ?? {}) },
    };
    const childIds = Array.isArray(node.children) ? node.children : [];
    childIds.forEach((childId) => {
      if (typeof childId === 'string' && childId) visit(childId, depth + 1, effectiveStyle);
    });
  };

  roots.forEach((rootEntry) => {
    const rootId = rootEntry?.rootId;
    if (typeof rootId === 'string' && rootId) visit(rootId, 0, null);
  });
}

export function migrateLegacyMindStyles(doc) {
  if (!doc) return doc;
  doc.manifest = doc.manifest && typeof doc.manifest === 'object' ? doc.manifest : {};
  doc.manifest.renderStylePreset = 'clean';
  ensureBoardList(doc).forEach((board) => migrateBoardNodes(board));
  return doc;
}
