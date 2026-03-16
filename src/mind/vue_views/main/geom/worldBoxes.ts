import type { Box } from '../actions/useLayout';
import { DEBUG_SPATIAL_STRESS_BOX_COUNT } from '../constants';
import { boxToRect, type WorldRect } from './rect';

export type WorldBoxes = Map<string, WorldRect>;

const FALLBACK_NODE_W = 120;
const FALLBACK_NODE_H = 34;

function appendStressBoxes(worldBoxes: WorldBoxes, anchor: { x: number; y: number }) {
  if (DEBUG_SPATIAL_STRESS_BOX_COUNT <= 0) return;

  const columns = 40;
  const boxW = 128;
  const boxH = 34;
  const gapX = 44;
  const gapY = 18;

  for (let i = 0; i < DEBUG_SPATIAL_STRESS_BOX_COUNT; i += 1) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const x = anchor.x + 280 + col * (boxW + gapX);
    const y = anchor.y - 500 + row * (boxH + gapY);
    worldBoxes.set(`__stress__${i}`, {
      x1: x,
      y1: y,
      x2: x + boxW,
      y2: y + boxH,
    });
  }
}

export function buildWorldBoxes(doc: any, layoutLocal: Map<string, Box>): WorldBoxes {
  const worldBoxes: WorldBoxes = new Map();
  const root = doc?.mind?.roots?.[0];
  const rootPos = root?.pos || { x: 0, y: 0 };

  for (const [nodeId, box] of layoutLocal.entries()) {
    worldBoxes.set(nodeId, boxToRect(box));
  }

  const rootId = root?.rootId;
  if (!worldBoxes.size && rootId) {
    worldBoxes.set(rootId, {
      x1: rootPos.x,
      y1: rootPos.y,
      x2: rootPos.x + FALLBACK_NODE_W,
      y2: rootPos.y + FALLBACK_NODE_H,
    });
  }

  appendStressBoxes(worldBoxes, rootPos);
  return worldBoxes;
}
