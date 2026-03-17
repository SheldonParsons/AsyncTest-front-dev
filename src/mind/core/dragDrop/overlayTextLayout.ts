export type OverlayTextLayout = {
  lines: string[];
  lineHeightPx: number;
};

function tokenizeParagraph(paragraph: string) {
  if (!paragraph) return [''];
  const tokens = paragraph.match(/\S+\s*|\s+/g);
  return tokens?.length ? tokens : [paragraph];
}

function breakTokenByCharacter(token: string, ctx: CanvasRenderingContext2D, maxWidthPx: number) {
  if (!token) return [''];
  const lines: string[] = [];
  let current = '';

  for (const char of Array.from(token)) {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidthPx) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  if (!lines.length) lines.push('');
  return lines;
}

function wrapParagraph(paragraph: string, ctx: CanvasRenderingContext2D, maxWidthPx: number) {
  if (paragraph === '') return [''];

  const tokens = tokenizeParagraph(paragraph);
  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const candidate = currentLine + token;
    if (currentLine && ctx.measureText(candidate).width <= maxWidthPx) {
      currentLine = candidate;
      continue;
    }

    if (!currentLine && ctx.measureText(token).width <= maxWidthPx) {
      currentLine = token;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine.trimEnd());
      currentLine = '';
    }

    if (ctx.measureText(token).width <= maxWidthPx) {
      currentLine = token;
      continue;
    }

    const brokenLines = breakTokenByCharacter(token, ctx, maxWidthPx);
    lines.push(...brokenLines.slice(0, -1).map((line) => line.trimEnd()));
    currentLine = brokenLines[brokenLines.length - 1] ?? '';
  }

  if (currentLine || !lines.length) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
}

export function layoutOverlayTextLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxWidthPx: number,
  lineHeightPx: number
): OverlayTextLayout {
  const paragraphs = text.split('\n');
  const lines = paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, ctx, maxWidthPx));
  return {
    lines,
    lineHeightPx,
  };
}
