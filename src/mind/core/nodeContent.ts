import type { RichTextDocument } from './richText';
import { cloneRichText, normalizeRichText, richTextFromPlain, richTextToPlain } from './richText';
import {
  cloneLexicalState,
  lexicalStateFromPlainText,
  lexicalStateFromRichText,
  plainTextFromLexicalState,
  richTextFromLexicalState,
  type SerializedLexicalEditorState,
} from './lexicalState';
import type { MindSummaryMeta } from './summaryMeta';
const MAX_NODE_IMAGE_WIDTH_PX = 1600;

export type MindNodeImage = null | {
  src: string;
  mime: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type MindNodeSecrecyLevel = 'top-secret' | 'confidential' | 'secret';

export type MindNodeSecrecy = {
  level: MindNodeSecrecyLevel;
  durationYears?: number | null;
  markedAt?: string | null;
};

export type MindNodeLike = {
  title?: string;
  text?: string | { plain?: string };
  textPlain?: string;
  richText?: RichTextDocument;
  textLexical?: SerializedLexicalEditorState | null;
  style?: {
    shape?: {
      fill?: string;
      stroke?: string;
      fillPreset?: 'rough-hachure' | 'rough-cross' | 'rough-dots' | 'solid' | 'none';
      borderPreset?: 'clean' | 'rough-solid' | 'rough-dashed' | 'none';
      strokeWidthPx?: number;
    } | null;
    text?: {
      fontFamily?: string;
      fontSizePx?: number;
      fontWeight?: number;
      fontStyle?: 'normal' | 'italic';
      color?: string;
      textAlign?: 'left' | 'center' | 'right';
      widthPx?: number;
    } | null;
  } | null;
  image?: MindNodeImage;
  images?: unknown[];
  markers?: string[];
  secrecy?: MindNodeSecrecy | null;
  nodeKind?: 'summary';
  summaries?: MindSummaryMeta[];
};

const SECRET_DURATION_YEAR_LABELS: Record<number, string> = {
  1: '一年',
  2: '二年',
  3: '三年',
  4: '四年',
  5: '五年',
  6: '六年',
  7: '七年',
  8: '八年',
  9: '九年',
  10: '十年',
};

function normalizeNodeSecrecyLevel(value: unknown): MindNodeSecrecyLevel | null {
  if (value === 'top-secret' || value === 'confidential' || value === 'secret') return value;
  return null;
}

export function normalizeNodeSecrecy(secrecy: unknown): MindNodeSecrecy | null {
  if (!secrecy || typeof secrecy !== 'object') return null;
  const candidate = secrecy as Record<string, unknown>;
  const level = normalizeNodeSecrecyLevel(candidate.level);
  if (!level) return null;
  const normalized: MindNodeSecrecy = { level };
  if (level === 'secret') {
    if (candidate.durationYears == null || candidate.durationYears === '') {
      normalized.durationYears = null;
    } else {
      const durationYears = Number(candidate.durationYears);
      if (Number.isInteger(durationYears) && durationYears >= 1 && durationYears <= 10) {
        normalized.durationYears = durationYears;
      } else {
        normalized.durationYears = null;
      }
    }
  }
  if (level === 'top-secret') {
    normalized.markedAt = typeof candidate.markedAt === 'string' && candidate.markedAt.trim()
      ? candidate.markedAt.trim()
      : null;
  }
  return normalized;
}

export function getNodeSecrecy(node: MindNodeLike | null | undefined): MindNodeSecrecy | null {
  return normalizeNodeSecrecy((node as MindNodeLike | null | undefined)?.secrecy ?? null);
}

export function setNodeSecrecy(node: MindNodeLike | null | undefined, secrecy: MindNodeSecrecy | null | undefined) {
  if (!node) return;
  const normalized = normalizeNodeSecrecy(secrecy ?? null);
  if (!normalized) {
    delete node.secrecy;
    return;
  }
  node.secrecy = normalized;
}

export function formatNodeSecrecyLabel(secrecy: MindNodeSecrecy | null | undefined) {
  const normalized = normalizeNodeSecrecy(secrecy ?? null);
  if (!normalized) return '';
  if (normalized.level === 'secret') {
    return normalized.durationYears == null
      ? '秘密▲'
      : `秘密▲${SECRET_DURATION_YEAR_LABELS[normalized.durationYears] ?? '一年'}`;
  }
  if (normalized.level === 'confidential') {
    return '机密▲长期';
  }
  return `绝密▲${normalized.markedAt || ''}`.replace(/▲$/, '');
}

export function getNodeRichText(node: MindNodeLike | null | undefined): RichTextDocument {
  if (!node) return richTextFromPlain('');
  if (node.richText) return normalizeRichText(cloneRichText(node.richText));
  if (node.textLexical) return richTextFromLexicalState(node.textLexical);
  if (typeof node.text === 'string') return richTextFromPlain(node.text);
  if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string') {
    return richTextFromPlain(node.text.plain);
  }
  if (typeof node.textPlain === 'string') return richTextFromPlain(node.textPlain);
  if (typeof node.title === 'string') return richTextFromPlain(node.title);
  return richTextFromPlain('');
}

export function getNodePlainText(node: MindNodeLike | null | undefined) {
  return richTextToPlain(getNodeRichText(node));
}

export function setNodeRichText(node: MindNodeLike | null | undefined, richText: RichTextDocument) {
  if (!node) return;
  const normalized = normalizeRichText(cloneRichText(richText));
  node.textLexical = lexicalStateFromRichText(normalized);
  node.richText = normalized;
  node.text = { plain: richTextToPlain(normalized) };
  if ('textPlain' in node) delete node.textPlain;
  if ('title' in node) delete node.title;
}

export function getNodeLexicalState(node: MindNodeLike | null | undefined): SerializedLexicalEditorState {
  if (!node) return lexicalStateFromPlainText('');
  if (node.richText) return lexicalStateFromRichText(node.richText);
  if (node.textLexical) return cloneLexicalState(node.textLexical);
  return lexicalStateFromRichText(getNodeRichText(node));
}

export function setNodeLexicalState(
  node: MindNodeLike | null | undefined,
  lexicalState: SerializedLexicalEditorState,
  richTextOverride?: RichTextDocument
) {
  if (!node) return;
  node.textLexical = cloneLexicalState(lexicalState);
  const richText = richTextOverride ? normalizeRichText(cloneRichText(richTextOverride)) : richTextFromLexicalState(lexicalState);
  node.richText = richText;
  node.text = { plain: richTextToPlain(richText) };
  if ('textPlain' in node) delete node.textPlain;
  if ('title' in node) delete node.title;
}

export function ensureNodeRichText(node: MindNodeLike | null | undefined, fallback = ''): RichTextDocument {
  const richText = getNodeRichText(node);
  if (richTextToPlain(richText) === '' && fallback) {
    const next = richTextFromPlain(fallback);
    setNodeRichText(node, next);
    return next;
  }
  if (node) setNodeRichText(node, richText);
  return richText;
}

export function ensureNodeLexicalState(node: MindNodeLike | null | undefined, fallback = ''): SerializedLexicalEditorState {
  if (!node) return lexicalStateFromPlainText(fallback);
  if (!node.textLexical) {
    if (node.richText) {
      node.textLexical = lexicalStateFromRichText(node.richText);
    } else {
      const plain = getNodePlainText(node) || fallback;
      node.textLexical = lexicalStateFromPlainText(plain);
    }
  }
  setNodeLexicalState(node, node.textLexical);
  return getNodeLexicalState(node);
}

export function setNodePlainText(node: MindNodeLike | null | undefined, plain: string) {
  if (!node) return;
  setNodeRichText(node, richTextFromPlain(plain));
}

export function getNodeImage(node: MindNodeLike | null | undefined): MindNodeImage {
  return normalizeNodeImage(node?.image ?? null);
}

export function setNodeImage(node: MindNodeLike | null | undefined, image: MindNodeImage) {
  if (!node) return;
  node.image = normalizeNodeImage(image);
}

export function cloneNodeImage(image: MindNodeImage) {
  return normalizeNodeImage(image);
}

export function normalizeNodeImage(image: MindNodeImage) {
  if (!image) return null;
  const nextImage = { ...image };
  if (nextImage.width <= MAX_NODE_IMAGE_WIDTH_PX) return nextImage;
  const ratio = MAX_NODE_IMAGE_WIDTH_PX / Math.max(nextImage.width, 0.0001);
  nextImage.width = MAX_NODE_IMAGE_WIDTH_PX;
  nextImage.height = Math.max(1, Math.round(nextImage.height * ratio));
  return nextImage;
}

export function ensureNodeContent(node: MindNodeLike | null | undefined, fallbackText = '') {
  if (!node) return;
  ensureNodeLexicalState(node, fallbackText);
  ensureNodeRichText(node, fallbackText);
  if (!('image' in node)) node.image = null;
}
