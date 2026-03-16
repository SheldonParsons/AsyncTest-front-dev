export const NODE_FONT = '14px system-ui, -apple-system, Segoe UI, sans-serif';
export const NODE_MIN_W = 20;
export const NODE_MAX_W = 500;
export const NODE_TEXT_INSET_X = 8;
export const NODE_TEXT_INSET_Y = 6;
export const NODE_LINE_HEIGHT = 20;

const NODE_PADDING_X = NODE_TEXT_INSET_X * 2;
const NODE_PADDING_Y = NODE_TEXT_INSET_Y * 2;
const NODE_CONTENT_MAX_W = NODE_MAX_W - NODE_PADDING_X;

export type NodeTextLayout = {
    lines: string[];
    w: number;
    h: number;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function breakLongToken(
    ctx: CanvasRenderingContext2D,
    token: string
) {
    if (!token) return [''];

    const parts: string[] = [];
    let current = '';
    for (const ch of token) {
        const next = `${current}${ch}`;
        if (current && ctx.measureText(next).width > NODE_CONTENT_MAX_W) {
            parts.push(current);
            current = ch;
        } else {
            current = next;
        }
    }
    if (current) parts.push(current);
    return parts;
}

function wrapParagraph(
    ctx: CanvasRenderingContext2D,
    paragraph: string
) {
    if (!paragraph) return [''];

    const tokens = paragraph.split(/\s+/).filter(Boolean);
    if (!tokens.length) return [''];

    const lines: string[] = [];
    let current = '';

    for (const token of tokens) {
        const pieces = breakLongToken(ctx, token);
        for (const piece of pieces) {
            const candidate = current ? `${current} ${piece}` : piece;
            if (current && ctx.measureText(candidate).width > NODE_CONTENT_MAX_W) {
                lines.push(current);
                current = piece;
            } else {
                current = candidate;
            }
        }
    }

    if (current) lines.push(current);
    return lines.length ? lines : [''];
}

export function measureNodeTextLayout(
    ctx: CanvasRenderingContext2D,
    text: string,
    cache?: Map<string, NodeTextLayout>
): NodeTextLayout {
    const key = text ?? '';
    const cached = cache?.get(key);
    if (cached) return cached;

    ctx.font = NODE_FONT;
    const rawLines = key.split('\n');
    const lines = rawLines.flatMap((line) => wrapParagraph(ctx, line));
    const contentWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    const lineCount = Math.max(1, lines.length);
    const layout = {
        lines,
        w: clamp(Math.ceil(contentWidth) + NODE_PADDING_X, NODE_MIN_W, NODE_MAX_W),
        h: Math.max(NODE_LINE_HEIGHT + NODE_PADDING_Y, lineCount * NODE_LINE_HEIGHT + NODE_PADDING_Y),
    };

    cache?.set(key, layout);
    return layout;
}
