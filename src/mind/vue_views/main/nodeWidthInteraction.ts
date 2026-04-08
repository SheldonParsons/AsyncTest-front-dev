export type NodeWidthResizeHandle = 'left' | 'right';

export type NodeWidthPreviewRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NodeWidthInteractionState = {
  nodeId: string;
  hovered: boolean;
  selected: boolean;
  resizing: boolean;
  handle: NodeWidthResizeHandle | null;
  pointerId: number | null;
  startPointer: { xScreen: number; yScreen: number };
  startBodyRect: NodeWidthPreviewRect | null;
  previewBodyRect: NodeWidthPreviewRect | null;
};

export type NodeWidthHandleWorldRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const NODE_WIDTH_HANDLE_SIZE_PX = 10;
export const NODE_WIDTH_OUTLINE_GAP_PX = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function inflateNodeWidthPreviewRect(rect: NodeWidthPreviewRect, amountWorld: number): NodeWidthPreviewRect {
  return {
    x: rect.x - amountWorld,
    y: rect.y - amountWorld,
    width: rect.width + amountWorld * 2,
    height: rect.height + amountWorld * 2,
  };
}

export function pointInNodeWidthRect(xWorld: number, yWorld: number, rect: NodeWidthHandleWorldRect | null) {
  if (!rect) return false;
  return (
    xWorld >= rect.x &&
    xWorld <= rect.x + rect.width &&
    yWorld >= rect.y &&
    yWorld <= rect.y + rect.height
  );
}

export function getNodeWidthHandleWorldRects(
  rect: NodeWidthPreviewRect,
  cameraScale: number,
  handleSizePx = NODE_WIDTH_HANDLE_SIZE_PX
) {
  const sizeWorld = handleSizePx / Math.max(cameraScale, 0.0001);
  return {
    left: {
      x: rect.x,
      y: rect.y,
      width: sizeWorld,
      height: rect.height,
    },
    right: {
      x: rect.x + rect.width - sizeWorld,
      y: rect.y,
      width: sizeWorld,
      height: rect.height,
    },
  } satisfies Record<NodeWidthResizeHandle, NodeWidthHandleWorldRect>;
}

export function hitTestNodeWidthHandle(
  xWorld: number,
  yWorld: number,
  rect: NodeWidthPreviewRect,
  cameraScale: number,
  handleSizePx = NODE_WIDTH_HANDLE_SIZE_PX
): NodeWidthResizeHandle | null {
  const handleRects = getNodeWidthHandleWorldRects(rect, cameraScale, handleSizePx);
  if (pointInNodeWidthRect(xWorld, yWorld, handleRects.left)) return 'left';
  if (pointInNodeWidthRect(xWorld, yWorld, handleRects.right)) return 'right';
  return null;
}

export function getNodeWidthResizeCursor() {
  return 'ew-resize';
}

export function computeNodeWidthPreviewRect(options: {
  handle: NodeWidthResizeHandle;
  startRect: NodeWidthPreviewRect;
  deltaScreenX: number;
  cameraScale: number;
  minWidth: number;
  maxWidth: number;
}) {
  const { handle, startRect, deltaScreenX, cameraScale, minWidth, maxWidth } = options;
  const dxWorld = deltaScreenX / Math.max(cameraScale, 0.0001);
  const signedDx = handle === 'right' ? dxWorld : -dxWorld;
  const nextWidth = clamp(startRect.width + signedDx, minWidth, maxWidth);
  if (handle === 'right') {
    return {
      x: startRect.x,
      y: startRect.y,
      width: nextWidth,
      height: startRect.height,
    } satisfies NodeWidthPreviewRect;
  }
  return {
    x: startRect.x + startRect.width - nextWidth,
    y: startRect.y,
    width: nextWidth,
    height: startRect.height,
  } satisfies NodeWidthPreviewRect;
}
