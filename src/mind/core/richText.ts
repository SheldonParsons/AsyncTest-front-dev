export type RichTextAlign = 'left' | 'center' | 'right';

export type RichTextMarks = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
};

export type RichTextInline = {
  text: string;
  marks?: RichTextMarks;
};

export type RichTextBlock = {
  align: RichTextAlign;
  inlines: RichTextInline[];
};

export type RichTextDocument = {
  blocks: RichTextBlock[];
};

function sameMarks(a?: RichTextMarks, b?: RichTextMarks) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function cloneRichText(doc: RichTextDocument): RichTextDocument {
  return {
    blocks: doc.blocks.map((block) => ({
      align: block.align,
      inlines: block.inlines.map((inline) => ({
        text: inline.text,
        marks: inline.marks ? { ...inline.marks } : undefined,
      })),
    })),
  };
}

export function richTextFromPlain(text: string): RichTextDocument {
  const blocks = text.split('\n').map((line) => ({
    align: 'left' as RichTextAlign,
    inlines: [{ text: line }],
  }));
  return normalizeRichText({ blocks });
}

export function richTextToPlain(doc: RichTextDocument) {
  return normalizeRichText(doc).blocks.map((block) => block.inlines.map((inline) => inline.text).join('')).join('\n');
}

export function normalizeRichText(doc: RichTextDocument | null | undefined): RichTextDocument {
  const blocks = (doc?.blocks ?? []).map((block) => {
    const inlines: RichTextInline[] = [];
    for (const inline of block.inlines ?? []) {
      const text = inline.text ?? '';
      const marks = inline.marks ? { ...inline.marks } : undefined;
      if (!inlines.length) {
        inlines.push({ text, marks });
        continue;
      }
      const previous = inlines[inlines.length - 1];
      if (sameMarks(previous.marks, marks)) {
        previous.text += text;
      } else {
        inlines.push({ text, marks });
      }
    }
    return {
      align: block.align ?? 'left',
      inlines: inlines.length ? inlines : [{ text: '' }],
    };
  });

  return {
    blocks: blocks.length ? blocks : [{ align: 'left', inlines: [{ text: '' }] }],
  };
}

export function getInlineFont(marks: RichTextMarks | undefined, defaultFontFamily: string, defaultFontSize: number) {
  const fontSize = marks?.fontSize ?? defaultFontSize;
  const fontFamily = marks?.fontFamily ?? defaultFontFamily;
  const fontStyle = marks?.italic ? 'italic ' : '';
  const fontWeight = marks?.bold ? '700 ' : '';
  return `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
}
