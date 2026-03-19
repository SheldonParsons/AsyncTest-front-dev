import type { WorldPoint, WorldRect } from '../geom/rect';

export type CellRange = { cx1: number; cx2: number; cy1: number; cy2: number };

export class UniformGridSpatialIndex {
  readonly cellSize: number;
  private readonly buckets = new Map<string, Set<string>>();
  private readonly nodeCellKeys = new Map<string, string[]>();

  constructor(cellSize = 256) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number) {
    return `${cx},${cy}`;
  }

  private cellCoord(value: number) {
    return Math.floor(value / this.cellSize);
  }

  private rectCellKeys(rect: WorldRect) {
    const range = this.getCellRange(rect);
    const keys: string[] = [];
    for (let cy = range.cy1; cy <= range.cy2; cy += 1) {
      for (let cx = range.cx1; cx <= range.cx2; cx += 1) {
        keys.push(this.cellKey(cx, cy));
      }
    }
    return keys;
  }

  private removeNodeFromBuckets(nodeId: string) {
    const previousKeys = this.nodeCellKeys.get(nodeId);
    if (!previousKeys?.length) return;
    for (const key of previousKeys) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      bucket.delete(nodeId);
      if (bucket.size === 0) this.buckets.delete(key);
    }
    this.nodeCellKeys.delete(nodeId);
  }

  upsert(nodeId: string, rect: WorldRect) {
    this.removeNodeFromBuckets(nodeId);
    const nextKeys = this.rectCellKeys(rect);
    this.nodeCellKeys.set(nodeId, nextKeys);
    for (const key of nextKeys) {
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = new Set();
        this.buckets.set(key, bucket);
      }
      bucket.add(nodeId);
    }
  }

  updateMany(worldBoxes: Map<string, WorldRect>, nodeIds: Iterable<string>) {
    for (const nodeId of nodeIds) {
      const rect = worldBoxes.get(nodeId);
      if (!rect) {
        this.removeNodeFromBuckets(nodeId);
        continue;
      }
      this.upsert(nodeId, rect);
    }
  }

  getCellRange(rect: WorldRect): CellRange {
    return {
      cx1: this.cellCoord(rect.x1),
      cx2: this.cellCoord(rect.x2),
      cy1: this.cellCoord(rect.y1),
      cy2: this.cellCoord(rect.y2),
    };
  }

  rebuild(worldBoxes: Map<string, WorldRect>) {
    this.buckets.clear();
    this.nodeCellKeys.clear();
    for (const [nodeId, rect] of worldBoxes.entries()) {
      this.upsert(nodeId, rect);
    }
  }

  queryRect(rect: WorldRect): string[] {
    const range = this.getCellRange(rect);
    const candidates = new Set<string>();
    for (let cy = range.cy1; cy <= range.cy2; cy += 1) {
      for (let cx = range.cx1; cx <= range.cx2; cx += 1) {
        const bucket = this.buckets.get(this.cellKey(cx, cy));
        if (!bucket) continue;
        for (const nodeId of bucket) candidates.add(nodeId);
      }
    }
    return [...candidates];
  }

  queryPoint(point: WorldPoint): string[] {
    const bucket = this.buckets.get(this.cellKey(this.cellCoord(point.x), this.cellCoord(point.y)));
    return bucket ? [...bucket] : [];
  }

  getBucketCount(cx: number, cy: number): number {
    return this.buckets.get(this.cellKey(cx, cy))?.size ?? 0;
  }
}
