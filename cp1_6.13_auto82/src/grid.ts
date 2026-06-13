import { dist, createAnim, updateAnim, AnimState, rand } from './utils';

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  occupied: boolean;
  fragmentIndex: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
  slotW: number;
  slotH: number;
  startX: number;
  startY: number;
  gapX: number;
  gapY: number;
}

const SNAP_DISTANCE = 40;
const SNAP_DURATION = 300;
const EJECT_DURATION = 600;

export class Grid {
  slots: Slot[] = [];
  config: GridConfig;

  constructor(canvasW: number, canvasH: number, isMobile: boolean) {
    this.config = this.buildConfig(canvasW, canvasH, isMobile);
    this.buildSlots();
  }

  private buildConfig(canvasW: number, canvasH: number, isMobile: boolean): GridConfig {
    const slotW = 130;
    const slotH = 90;
    const rows = isMobile ? 3 : 5;
    const cols = isMobile ? 5 : 3;
    const gapX = 8;
    const gapY = 8;
    const totalW = cols * slotW + (cols - 1) * gapX;
    const totalH = rows * slotH + (rows - 1) * gapY;
    const startX = (canvasW - totalW) / 2;
    const startY = (canvasH - totalH) / 2 - 30;
    return { rows, cols, slotW, slotH, startX, startY, gapX, gapY };
  }

  private buildSlots(): void {
    this.slots = [];
    const { rows, cols, slotW, slotH, startX, startY, gapX, gapY } = this.config;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.slots.push({
          x: startX + c * (slotW + gapX) + slotW / 2,
          y: startY + r * (slotH + gapY) + slotH / 2,
          w: slotW,
          h: slotH,
          occupied: false,
          fragmentIndex: -1,
        });
      }
    }
  }

  rebuild(canvasW: number, canvasH: number, isMobile: boolean): void {
    this.config = this.buildConfig(canvasW, canvasH, isMobile);
    this.buildSlots();
  }

  findNearestSlot(fx: number, fy: number, targetSlot: number): { slot: Slot; index: number; distance: number } | null {
    let best: { slot: Slot; index: number; distance: number } | null = null;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s.occupied) continue;
      if (i !== targetSlot) continue;
      const d = dist(fx, fy, s.x, s.y);
      if (d < SNAP_DISTANCE) {
        best = { slot: s, index: i, distance: d };
      }
    }
    return best;
  }

  createSnapAnim(
    fromX: number, fromY: number, fromRot: number,
    slotIndex: number, now: number
  ): AnimState {
    const s = this.slots[slotIndex];
    return createAnim(fromX, fromY, s.x, s.y, fromRot, 0, SNAP_DURATION, now);
  }

  occupySlot(slotIndex: number, fragmentIndex: number): void {
    this.slots[slotIndex].occupied = true;
    this.slots[slotIndex].fragmentIndex = fragmentIndex;
  }

  freeSlot(slotIndex: number): void {
    this.slots[slotIndex].occupied = false;
    this.slots[slotIndex].fragmentIndex = -1;
  }

  freeAll(): void {
    for (const s of this.slots) {
      s.occupied = false;
      s.fragmentIndex = -1;
    }
  }

  createEjectAnims(
    fragments: { x: number; y: number; rot: number; slotIndex: number }[],
    now: number,
    canvasW: number,
    canvasH: number
  ): AnimState[] {
    const anims: AnimState[] = [];
    for (const f of fragments) {
      const angle = rand(0, Math.PI * 2);
      const distance = rand(150, 300);
      const toX = clamp(f.x + Math.cos(angle) * distance, 60, canvasW - 60);
      const toY = clamp(f.y + Math.sin(angle) * distance, 60, canvasH - 60);
      const toRot = rand(-0.5, 0.5);
      anims.push(createAnim(f.x, f.y, toX, toY, f.rot, toRot, EJECT_DURATION, now));
    }
    return anims;
  }

  isComplete(): boolean {
    return this.slots.length > 0 && this.slots.every(s => s.occupied);
  }

  draw(ctx: CanvasRenderingContext2D, completed: boolean): void {
    if (completed) return;
    ctx.save();
    for (const s of this.slots) {
      if (s.occupied) continue;
      ctx.strokeStyle = 'rgba(200, 180, 140, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
