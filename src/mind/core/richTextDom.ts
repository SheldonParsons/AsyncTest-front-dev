import type { RichTextAlign, RichTextBlock, RichTextDocument, RichTextInline, RichTextMarks } from './richText';
import { cloneRichText, normalizeRichText } from './richText';

function marksKey(marks?: RichTextMarks) {
  return JSON.stringify(marks ?? {});
}

function readBooleanStyle(value: string) {
  return value === 'true' || value === '1';
}

function parseFontSize(value: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('em') || normalized.endsWith('rem') || normalized.endsWith('%')) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readMarksFromElement(element: HTMLElement, inherited: RichTextMarks): RichTextMarks {
  const next: RichTextMarks = { ...inherited };
  const tag = element.tagName.toLowerCase();
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;
  if (tag === 'u') next.underline = true;
  if (tag === 's' || tag === 'strike') next.strike = true;
  if (element.classList.contains('lexical-text-bold')) next.bold = true;
  if (element.classList.contains('lexical-text-italic')) next.italic = true;
  if (element.classList.contains('lexical-text-underline')) next.underline = true;
  if (element.classList.contains('lexical-text-strikethrough')) next.strike = true;
  if (element.classList.contains('lexical-text-underline-strikethrough')) {
    next.underline = true;
    next.strike = true;
  }

  const style = element.style;
  if (style.fontWeight && Number.parseInt(style.fontWeight, 10) >= 600) next.bold = true;
  if (style.fontStyle === 'italic') next.italic = true;
  if (style.textDecorationLine.includes('underline')) next.underline = true;
  if (style.textDecorationLine.includes('line-through')) next.strike = true;
  const computedStyle = typeof window !== 'undefined' ? window.getComputedStyle(element) : null;
  if (computedStyle) {
    const computedFontWeight = Number.parseInt(computedStyle.fontWeight, 10);
    if (
      computedStyle.fontWeight === 'bold' ||
      computedStyle.fontWeight === 'bolder' ||
      (Number.isFinite(computedFontWeight) && computedFontWeight >= 600)
    ) {
      next.bold = true;
    }
    if (computedStyle.fontStyle === 'italic' || computedStyle.fontStyle === 'oblique') next.italic = true;
    if (computedStyle.textDecorationLine.includes('underline')) next.underline = true;
    if (computedStyle.textDecorationLine.includes('line-through')) next.strike = true;
  }
  const attrColor = element.getAttribute('color');
  const attrFace = element.getAttribute('face');
  const attrSize = element.getAttribute('size');
  if (style.color) next.color = style.color;
  if (style.fontFamily) next.fontFamily = style.fontFamily;
  if (style.fontSize) next.fontSize = parseFontSize(style.fontSize);
  if (attrColor) next.color = attrColor;
  if (attrFace) next.fontFamily = attrFace;
  if (attrSize) {
    const numericSize = Number.parseFloat(attrSize);
    if (Number.isFinite(numericSize)) next.fontSize = numericSize;
  }

  if (element.dataset.bold) next.bold = readBooleanStyle(element.dataset.bold);
  if (element.dataset.italic) next.italic = readBooleanStyle(element.dataset.italic);
  if (element.dataset.underline) next.underline = readBooleanStyle(element.dataset.underline);
  if (element.dataset.strike) next.strike = readBooleanStyle(element.dataset.strike);
  if (element.dataset.color) next.color = element.dataset.color;
  if (element.dataset.fontFamily) next.fontFamily = element.dataset.fontFamily;
  if (element.dataset.fontSize) next.fontSize = parseFontSize(element.dataset.fontSize);

  return next;
}

function mergeInline(target: RichTextInline[], inline: RichTextInline) {
  if (!target.length) {
    target.push(inline);
    return;
  }
  const previous = target[target.length - 1];
  if (marksKey(previous.marks) === marksKey(inline.marks)) {
    previous.text += inline.text;
    return;
  }
  target.push(inline);
}

function collectInlineNodes(node: Node, inherited: RichTextMarks, target: RichTextInline[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    mergeInline(target, { text: node.textContent ?? '', marks: Object.keys(inherited).length ? { ...inherited } : undefined });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  if (node.tagName === 'BR') {
    mergeInline(target, { text: '\n', marks: Object.keys(inherited).length ? { ...inherited } : undefined });
    return;
  }
  const marks = readMarksFromElement(node, inherited);
  Array.from(node.childNodes).forEach((child) => collectInlineNodes(child, marks, target));
}

function parseBlocks(element: HTMLElement): RichTextBlock[] {
  const align = (element.dataset.align || element.style.textAlign || 'left') as RichTextAlign;
  const inlines: RichTextInline[] = [];
  Array.from(element.childNodes).forEach((child) => collectInlineNodes(child, {}, inlines));
  const splitLines: RichTextInline[][] = [[]];
  for (const inline of inlines) {
    const parts = inline.text.split('\n');
    parts.forEach((part, index) => {
      if (part) {
        splitLines[splitLines.length - 1].push({ text: part, marks: inline.marks ? { ...inline.marks } : undefined });
      }
      if (index < parts.length - 1) splitLines.push([]);
    });
  }
  return splitLines
    .map((line) => normalizeRichText({ blocks: [{ align, inlines: line.length ? line : [{ text: '' }] }] }).blocks[0])
    .filter(Boolean);
}

export function parseEditableDom(root: HTMLElement): RichTextDocument {
  const blocks: RichTextBlock[] = [];
  const children = Array.from(root.childNodes);
  if (!children.length) return { blocks: [{ align: 'left', inlines: [{ text: '' }] }] };

  let inlineBuffer: Node[] = [];
  const flushInlineBuffer = () => {
    if (!inlineBuffer.length) return;
    const wrapper = document.createElement('div');
    wrapper.dataset.block = '1';
    inlineBuffer.forEach((node) => wrapper.appendChild(node.cloneNode(true)));
    blocks.push(...parseBlocks(wrapper));
    inlineBuffer = [];
  };

  children.forEach((child) => {
    if (child instanceof HTMLElement && (child.dataset.block === '1' || child.tagName === 'DIV' || child.tagName === 'P')) {
      flushInlineBuffer();
      blocks.push(...parseBlocks(child));
      return;
    }
    inlineBuffer.push(child);
  });
  flushInlineBuffer();

  return normalizeRichText({ blocks });
}

function applyMarksToSpan(span: HTMLSpanElement, marks?: RichTextMarks) {
  if (!marks) return;
  if (marks.bold) {
    span.style.fontWeight = '700';
    span.dataset.bold = 'true';
  }
  if (marks.italic) {
    span.style.fontStyle = 'italic';
    span.dataset.italic = 'true';
  }
  const decorations = [marks.underline ? 'underline' : '', marks.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  if (decorations) span.style.textDecoration = decorations;
  if (marks.underline) span.dataset.underline = 'true';
  if (marks.strike) span.dataset.strike = 'true';
  if (marks.color) {
    span.style.color = marks.color;
    span.dataset.color = marks.color;
  }
  if (marks.fontFamily) {
    span.style.fontFamily = marks.fontFamily;
    span.dataset.fontFamily = marks.fontFamily;
  }
  if (marks.fontSize) {
    span.style.fontSize = `${marks.fontSize}px`;
    span.dataset.fontSize = `${marks.fontSize}`;
    span.style.lineHeight = '1.35';
  }
}

export function renderEditableDom(root: HTMLElement, doc: RichTextDocument) {
  const normalized = normalizeRichText(cloneRichText(doc));
  root.innerHTML = '';
  normalized.blocks.forEach((block) => {
    const blockEl = document.createElement('div');
    blockEl.dataset.block = '1';
    blockEl.dataset.align = block.align;
    blockEl.style.textAlign = block.align;
    blockEl.style.minHeight = '1em';
    blockEl.style.lineHeight = 'inherit';
    blockEl.style.margin = '0';
    blockEl.style.padding = '0';
    blockEl.style.whiteSpace = 'pre-wrap';
    if (!block.inlines.length) {
      blockEl.appendChild(document.createElement('br'));
    } else {
      block.inlines.forEach((inline) => {
        const span = document.createElement('span');
        span.dataset.inline = '1';
        applyMarksToSpan(span, inline.marks);
        span.textContent = inline.text || '';
        if (!inline.text) span.appendChild(document.createElement('br'));
        blockEl.appendChild(span);
      });
    }
    root.appendChild(blockEl);
  });
}

export function normalizeEditableDom(root: HTMLElement) {
  const normalized = parseEditableDom(root);
  renderEditableDom(root, normalized);
  return normalized;
}
