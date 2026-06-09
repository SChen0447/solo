export const GRID_SIZE = 16;
export const CELL_SIZE = 40;
export const BOARD_PIXEL = GRID_SIZE * CELL_SIZE;
export const MAX_STONES = 80;
export const INITIAL_RADIUS = 14;
export const MERGE_DISTANCE = 28;
export const INITIAL_PUSH_RADIUS = 100;
export const MERGE_PULSE_DURATION = 500;

export interface Stone {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  merged: boolean;
  mergeTime: number;
}

let nextId = 1;

export class Board {
  stones: Stone[] = [];
  boardOffsetX: number = 0;
  boardOffsetY: number = 0;

  setBoardOffset(offsetX: number, offsetY: number): void {
    this.boardOffsetX = offsetX;
    this.boardOffsetY = offsetY;
  }

  getStones(): Stone[] {
    return this.stones;
  }

  clear(): void {
    this.stones = [];
    nextId = 1;
  }

  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.boardOffsetX + gridX * CELL_SIZE + CELL_SIZE / 2,
      y: this.boardOffsetY + gridY * CELL_SIZE + CELL_SIZE / 2
    };
  }

  pixelToGrid(px: number, py: number): { gx: number; gy: number } | null {
    const relX = px - this.boardOffsetX;
    const relY = py - this.boardOffsetY;
    if (relX < 0 || relX >= BOARD_PIXEL || relY < 0 || relY >= BOARD_PIXEL) {
      return null;
    }
    return {
      gx: Math.floor(relX / CELL_SIZE),
      gy: Math.floor(relY / CELL_SIZE)
    };
  }

  placeStone(px: number, py: number): Stone | null {
    const grid = this.pixelToGrid(px, py);
    if (!grid) return null;

    const pos = this.gridToPixel(grid.gx, grid.gy);

    if (this.stones.length >= MAX_STONES) {
      this.mergeClosestPair();
    }

    const newStone: Stone = {
      id: nextId++,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: INITIAL_RADIUS,
      merged: false,
      mergeTime: 0
    };

    this.applyInitialPush(newStone);
    this.stones.push(newStone);
    return newStone;
  }

  applyInitialPush(newStone: Stone): void {
    for (const s of this.stones) {
      const dx = s.x - newStone.x;
      const dy = s.y - newStone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist <= INITIAL_PUSH_RADIUS) {
        const force = 0.5 + Math.random() * 1.0;
        const nx = dx / dist;
        const ny = dy / dist;
        s.vx += nx * force;
        s.vy += ny * force;
      }
    }
  }

  mergeClosestPair(): void {
    if (this.stones.length < 2) return;

    let minDist = Infinity;
    let idxA = 0;
    let idxB = 1;

    for (let i = 0; i < this.stones.length; i++) {
      for (let j = i + 1; j < this.stones.length; j++) {
        const a = this.stones[i];
        const b = this.stones[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = dx * dx + dy * dy;
        if (d < minDist) {
          minDist = d;
          idxA = i;
          idxB = j;
        }
      }
    }

    this.mergeTwo(idxA, idxB);
  }

  mergeTwo(indexA: number, indexB: number): void {
    if (indexA === indexB) return;
    const [lo, hi] = indexA < indexB ? [indexA, indexB] : [indexB, indexA];
    const a = this.stones[lo];
    const b = this.stones[hi];

    const totalMass = a.radius * a.radius + b.radius * b.radius;
    const newRadius = Math.sqrt(totalMass);
    const newX = (a.x * a.radius + b.x * b.radius) / (a.radius + b.radius);
    const newY = (a.y * a.radius + b.y * b.radius) / (a.radius + b.radius);
    const newVx = (a.vx * a.radius + b.vx * b.radius) / (a.radius + b.radius);
    const newVy = (a.vy * a.radius + b.vy * b.radius) / (a.radius + b.radius);

    const merged: Stone = {
      id: nextId++,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      radius: newRadius,
      merged: true,
      mergeTime: performance.now()
    };

    this.stones.splice(hi, 1);
    this.stones.splice(lo, 1);
    this.stones.push(merged);
  }

  checkAndMerge(): void {
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < this.stones.length; i++) {
        for (let j = i + 1; j < this.stones.length; j++) {
          const a = this.stones[i];
          const b = this.stones[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MERGE_DISTANCE) {
            this.mergeTwo(i, j);
            merged = true;
            break outer;
          }
        }
      }
    }
  }

  clampStonesToBoard(): void {
    const minX = this.boardOffsetX + INITIAL_RADIUS;
    const maxX = this.boardOffsetX + BOARD_PIXEL - INITIAL_RADIUS;
    const minY = this.boardOffsetY + INITIAL_RADIUS;
    const maxY = this.boardOffsetY + BOARD_PIXEL - INITIAL_RADIUS;

    for (const s of this.stones) {
      if (s.x < minX) { s.x = minX; s.vx = Math.abs(s.vx) * 0.5; }
      if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) * 0.5; }
      if (s.y < minY) { s.y = minY; s.vy = Math.abs(s.vy) * 0.5; }
      if (s.y > maxY) { s.y = maxY; s.vy = -Math.abs(s.vy) * 0.5; }
    }
  }

  cleanupMergeAnimations(now: number): void {
    for (const s of this.stones) {
      if (s.merged && now - s.mergeTime >= MERGE_PULSE_DURATION) {
        s.merged = false;
      }
    }
  }
}
