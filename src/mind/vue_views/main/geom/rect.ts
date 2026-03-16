import type { Camera } from '../actions/useCamera';

export type WorldPoint = { x: number; y: number };
export type WorldRect = { x1: number; y1: number; x2: number; y2: number };
export type BoxLike = { x: number; y: number; w: number; h: number };

export function screenToWorld(cam: Camera, sx: number, sy: number): WorldPoint {
  return {
    x: (sx - cam.tx) / cam.scale,
    y: (sy - cam.ty) / cam.scale,
  };
}

export function worldToScreen(cam: Camera, wx: number, wy: number): WorldPoint {
  return {
    x: wx * cam.scale + cam.tx,
    y: wy * cam.scale + cam.ty,
  };
}

export function getWorldViewportRect(cam: Camera, screenW: number, screenH: number): WorldRect {
  const p1 = screenToWorld(cam, 0, 0);
  const p2 = screenToWorld(cam, screenW, screenH);
  return {
    x1: Math.min(p1.x, p2.x),
    y1: Math.min(p1.y, p2.y),
    x2: Math.max(p1.x, p2.x),
    y2: Math.max(p1.y, p2.y),
  };
}

export function rectIntersects(a: WorldRect, b: WorldRect): boolean {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

export function rectContains(a: WorldRect, b: WorldRect): boolean {
  return a.x1 <= b.x1 && a.y1 <= b.y1 && a.x2 >= b.x2 && a.y2 >= b.y2;
}

export function pointInRect(p: WorldPoint, rect: WorldRect): boolean {
  return p.x >= rect.x1 && p.x <= rect.x2 && p.y >= rect.y1 && p.y <= rect.y2;
}

export function boxToRect(box: BoxLike): WorldRect {
  return {
    x1: box.x,
    y1: box.y,
    x2: box.x + box.w,
    y2: box.y + box.h,
  };
}

export function offsetRect(rect: WorldRect, dx: number, dy: number): WorldRect {
  return {
    x1: rect.x1 + dx,
    y1: rect.y1 + dy,
    x2: rect.x2 + dx,
    y2: rect.y2 + dy,
  };
}
