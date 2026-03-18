import type { RichTextDocument, RichTextInline, RichTextMarks } from './richText';
import { normalizeRichText, richTextFromPlain, richTextToPlain } from './richText';

export type SerializedLexicalNode = {
  type: string;
  version?: number;
  children?: SerializedLexicalNode[];
  text?: string;
  detail?: number;
  format?: number | string;
  mode?: 'normal' | 'token' | 'segmented';
  style?: string;
  direction?: 'ltr' | 'rtl' | null;
  indent?: number;
  textFormat?: number;
  textStyle?: string;
};

export type SerializedLexicalEditorState = {
  root: SerializedLexicalNode & { children: SerializedLexicalNode[]; type: 'root' };
};

const TEXT_FORMAT = {
  bold: 1,
  italic: 1 << 1,
  strikethrough: 1 << 2,
  underline: 1 << 3,
} as const;

function parseStyleString(style: string | undefined): Partial<RichTextMarks> {
  if (!style) return {};
  const pairs = style
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(':').map((part) => part.trim()));
  const entries = Object.fromEntries(pairs.filter((entry): entry is [string, string] => entry.length === 2));
  const fontSize = entries['font-size'] ? Number.parseFloat(entries['font-size']) : undefined;
  return {
    color: entries.color,
    fontFamily: entries['font-family'],
    fontSize: Number.isFinite(fontSize) ? fontSize : undefined,
  };
}

function updateStyleStringFontSize(style: string | undefined, transform: (size: number) => number) {
  if (!style) return style;
  const pairs = style
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(':').map((part) => part.trim()))
    .filter((entry): entry is [string, string] => entry.length === 2);
  if (!pairs.length) return style;
  let changed = false;
  const nextPairs = pairs.map(([key, value]) => {
    if (key !== 'font-size') return [key, value] as [string, string];
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return [key, value] as [string, string];
    changed = true;
    const nextValue = `${Number(transform(parsed).toFixed(3))}px`;
    return [key, nextValue] as [string, string];
  });
  if (!changed) return style;
  return nextPairs.map(([key, value]) => `${key}: ${value}`).join('; ');
}

function textNodeToInline(node: SerializedLexicalNode): RichTextInline {
  const format = typeof node.format === 'number' ? node.format : 0;
  const styleMarks = parseStyleString(node.style);
  const marks: RichTextMarks = {
    ...styleMarks,
    bold: (format & TEXT_FORMAT.bold) !== 0 || undefined,
    italic: (format & TEXT_FORMAT.italic) !== 0 || undefined,
    strike: (format & TEXT_FORMAT.strikethrough) !== 0 || undefined,
    underline: (format & TEXT_FORMAT.underline) !== 0 || undefined,
  };
  return {
    text: node.text ?? '',
    marks: Object.values(marks).some((value) => value != null && value !== false) ? marks : undefined,
  };
}

function lexicalChildrenToRichText(children: SerializedLexicalNode[]): RichTextDocument {
  const blocks = children
    .filter((node) => node.type === 'paragraph')
    .map((paragraph) => ({
      align:
        paragraph.format === 'center' || paragraph.format === 'right' || paragraph.format === 'left'
          ? paragraph.format
          : 'left',
      inlines: (paragraph.children ?? []).flatMap((child) => {
        if (child.type === 'linebreak') return [{ text: '\n' }];
        if (child.type === 'text') return [textNodeToInline(child)];
        return [];
      }),
    }));
  return normalizeRichText({ blocks: blocks.length ? blocks : [{ align: 'left', inlines: [{ text: '' }] }] });
}

function inlineStyleToString(marks?: RichTextMarks) {
  if (!marks) return '';
  const styleEntries = [
    marks.color ? `color: ${marks.color}` : '',
    marks.fontFamily ? `font-family: ${marks.fontFamily}` : '',
    marks.fontSize ? `font-size: ${marks.fontSize}px` : '',
  ].filter(Boolean);
  return styleEntries.join('; ');
}

export function lexicalStateFromPlainText(text: string): SerializedLexicalEditorState {
  const richText = richTextFromPlain(text);
  return lexicalStateFromRichText(richText);
}

export function cloneLexicalState(
  state: SerializedLexicalEditorState | null | undefined
): SerializedLexicalEditorState {
  if (!state?.root?.children) return lexicalStateFromPlainText('');
  return JSON.parse(JSON.stringify(state)) as SerializedLexicalEditorState;
}

export function lexicalStateFromRichText(richText: RichTextDocument): SerializedLexicalEditorState {
  const normalized = normalizeRichText(richText);
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: normalized.blocks.map((block) => ({
        type: 'paragraph',
        version: 1,
        format: block.align,
        direction: 'ltr',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: block.inlines.map((inline) => {
          let format = 0;
          if (inline.marks?.bold) format |= TEXT_FORMAT.bold;
          if (inline.marks?.italic) format |= TEXT_FORMAT.italic;
          if (inline.marks?.strike) format |= TEXT_FORMAT.strikethrough;
          if (inline.marks?.underline) format |= TEXT_FORMAT.underline;
          return {
            type: 'text',
            version: 1,
            text: inline.text,
            detail: 0,
            format,
            mode: 'normal',
            style: inlineStyleToString(inline.marks),
          };
        }),
      })),
    },
  };
}

export function richTextFromLexicalState(state: SerializedLexicalEditorState | null | undefined): RichTextDocument {
  if (!state?.root?.children) return richTextFromPlain('');
  return lexicalChildrenToRichText(state.root.children);
}

export function plainTextFromLexicalState(state: SerializedLexicalEditorState | null | undefined) {
  return richTextToPlain(richTextFromLexicalState(state));
}

export function scaleLexicalStateFontSizes(
  state: SerializedLexicalEditorState | null | undefined,
  factor: number
): SerializedLexicalEditorState {
  const safeState = cloneLexicalState(state);
  if (!safeState.root?.children || !Number.isFinite(factor) || Math.abs(factor - 1) < 0.0001) return safeState;
  const visit = (node: SerializedLexicalNode) => {
    if (typeof node.style === 'string' && node.style) {
      node.style = updateStyleStringFontSize(node.style, (size) => Math.max(1, size * factor));
    }
    node.children?.forEach(visit);
  };
  safeState.root.children.forEach(visit);
  return safeState;
}
