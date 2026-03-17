export type CanvasFontOptions = {
  fontStyle: 'normal' | 'italic';
  fontWeight: number;
  fontSizePx: number;
  fontFamily: string;
};

export function buildCanvasFont({
  fontStyle,
  fontWeight,
  fontSizePx,
  fontFamily,
}: CanvasFontOptions) {
  return `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
}
