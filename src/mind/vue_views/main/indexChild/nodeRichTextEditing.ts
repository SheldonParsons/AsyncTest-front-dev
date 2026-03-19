import { lexicalStateFromRichText, type SerializedLexicalEditorState } from '@/mind/core/lexicalState';
import { cloneRichText, normalizeRichText, type RichTextDocument, type RichTextMarks } from '@/mind/core/richText';
import { getMindNodeDefaultVisualStyle } from '../nodeStyles';

function getNodeBooleanMarkDefaults(doc: any, node: any, nodeId: string | null | undefined) {
  const visual = getMindNodeDefaultVisualStyle(doc, nodeId);
  const textStyle = node?.style?.text ?? null;
  return {
    bold: (textStyle?.fontWeight ?? visual.fontWeight) >= 700,
    italic: (textStyle?.fontStyle ?? visual.fontStyle) === 'italic',
  };
}

function normalizeBooleanMarkForDefault(actualEnabled: boolean, defaultEnabled: boolean) {
  if (actualEnabled === defaultEnabled) return undefined;
  return actualEnabled;
}

function resolveBooleanMarkFromInline(
  marks: RichTextMarks | undefined,
  key: 'bold' | 'italic',
  defaultEnabled: boolean
) {
  if (marks?.[key] === true) return true;
  if (marks?.[key] === false) return false;
  return defaultEnabled;
}

function resolvePersistedBooleanMarkFromInline(marks: RichTextMarks | undefined, key: 'bold' | 'italic') {
  if (marks?.[key] === true) return true;
  if (marks?.[key] === false) return false;
  return false;
}

export function withNodeDefaultBooleanOverrides(
  docContext: any,
  doc: RichTextDocument,
  node: any,
  nodeId: string | null | undefined,
  mode: 'persisted' | 'editing'
) {
  const defaults = getNodeBooleanMarkDefaults(docContext, node, nodeId);
  const normalized = cloneRichText(normalizeRichText(doc));
  for (const block of normalized.blocks) {
    for (const inline of block.inlines) {
      const marks = { ...(inline.marks ?? {}) };
      const actualBold = resolveBooleanMarkFromInline(inline.marks, 'bold', defaults.bold);
      const actualItalic = resolveBooleanMarkFromInline(inline.marks, 'italic', defaults.italic);

      if (mode === 'editing') {
        if (actualBold) marks.bold = true;
        else delete marks.bold;
        if (actualItalic) marks.italic = true;
        else delete marks.italic;
      } else {
        const persistedActualBold = resolvePersistedBooleanMarkFromInline(inline.marks, 'bold');
        const persistedActualItalic = resolvePersistedBooleanMarkFromInline(inline.marks, 'italic');
        const persistedBold = normalizeBooleanMarkForDefault(persistedActualBold, defaults.bold);
        const persistedItalic = normalizeBooleanMarkForDefault(persistedActualItalic, defaults.italic);
        if (persistedBold == null) delete marks.bold;
        else marks.bold = persistedBold;
        if (persistedItalic == null) delete marks.italic;
        else marks.italic = persistedItalic;
      }

      inline.marks = Object.keys(marks).length ? marks : undefined;
    }
  }
  return normalizeRichText(normalized);
}

export function createEditingLexicalStateForNode(
  docContext: any,
  node: any,
  nodeId: string | null | undefined,
  richText: RichTextDocument
): SerializedLexicalEditorState {
  return lexicalStateFromRichText(withNodeDefaultBooleanOverrides(docContext, richText, node, nodeId, 'editing'));
}

export function createPersistedRichTextForNode(
  docContext: any,
  node: any,
  nodeId: string | null | undefined,
  richText: RichTextDocument
) {
  return withNodeDefaultBooleanOverrides(docContext, richText, node, nodeId, 'persisted');
}

export function isRichTextEqual(a: RichTextDocument, b: RichTextDocument) {
  return JSON.stringify(normalizeRichText(a)) === JSON.stringify(normalizeRichText(b));
}
