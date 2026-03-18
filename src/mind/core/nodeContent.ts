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
const MAX_NODE_IMAGE_WIDTH_PX = 450;

export type MindNodeImage = null | {
  src: string;
  mime: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
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
    } | null;
  } | null;
  image?: MindNodeImage;
  images?: unknown[];
  markers?: string[];
};

export function getNodeRichText(node: MindNodeLike | null | undefined): RichTextDocument {
  if (!node) return richTextFromPlain('');
  if (node.textLexical) return richTextFromLexicalState(node.textLexical);
  if (node.richText) return normalizeRichText(cloneRichText(node.richText));
  if (typeof node.text === 'string') return richTextFromPlain(node.text);
  if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string') {
    return richTextFromPlain(node.text.plain);
  }
  if (typeof node.textPlain === 'string') return richTextFromPlain(node.textPlain);
  if (typeof node.title === 'string') return richTextFromPlain(node.title);
  return richTextFromPlain('');
}

export function getNodePlainText(node: MindNodeLike | null | undefined) {
  if (node?.textLexical) return plainTextFromLexicalState(node.textLexical);
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
  if (node.textLexical) return cloneLexicalState(node.textLexical);
  return lexicalStateFromRichText(getNodeRichText(node));
}

export function setNodeLexicalState(node: MindNodeLike | null | undefined, lexicalState: SerializedLexicalEditorState) {
  if (!node) return;
  node.textLexical = cloneLexicalState(lexicalState);
  const richText = richTextFromLexicalState(lexicalState);
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
    const plain = getNodePlainText(node) || fallback;
    node.textLexical = lexicalStateFromPlainText(plain);
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
