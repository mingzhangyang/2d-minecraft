/**
 * Spatial hash grid for fast proximity queries.
 * Cell size ~256px (8 tiles at 32px) gives good bucket density for typical animal spacing.
 */
export const SPATIAL_CELL = 256;

export class SpatialHash<T extends { x: number; y: number; width: number; height: number }> {
  private cells: Map<number, T[]> = new Map();
  private cellSize: number;

  constructor(cellSize = SPATIAL_CELL) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): number {
    // Pack two 16-bit integers into a single 32-bit number
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  clear() {
    this.cells.clear();
  }

  insert(entity: T) {
    const x0 = Math.floor(entity.x / this.cellSize);
    const y0 = Math.floor(entity.y / this.cellSize);
    const x1 = Math.floor((entity.x + entity.width) / this.cellSize);
    const y1 = Math.floor((entity.y + entity.height) / this.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = this.key(cx, cy);
        let bucket = this.cells.get(k);
        if (!bucket) { bucket = []; this.cells.set(k, bucket); }
        bucket.push(entity);
      }
    }
  }

  /**
   * Returns all entities whose grid cell overlaps the query rectangle.
   * Results may contain duplicates if an entity spans multiple cells.
   */
  queryRect(x: number, y: number, w: number, h: number): T[] {
    const x0 = Math.floor(x / this.cellSize);
    const y0 = Math.floor(y / this.cellSize);
    const x1 = Math.floor((x + w) / this.cellSize);
    const y1 = Math.floor((y + h) / this.cellSize);
    const result: T[] = [];
    const seen = new Set<T>();
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const bucket = this.cells.get(this.key(cx, cy));
        if (bucket) {
          for (const e of bucket) {
            if (!seen.has(e)) { seen.add(e); result.push(e); }
          }
        }
      }
    }
    return result;
  }

  /**
   * Returns candidates within radius of (cx, cy), using squared-distance pre-filter.
   */
  queryRadius(cx: number, cy: number, radius: number): T[] {
    return this.queryRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
}
