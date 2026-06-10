import type { Flaw, OrderItem, CutRect, Leather } from '../types';

export function calcUtilization(
  totalArea: number,
  usedArea: number
): number {
  if (totalArea <= 0) return 0;
  return Math.min(100, Math.max(0, (usedArea / totalArea) * 100));
}

export function getUtilizationColor(utilization: number): string {
  if (utilization < 50) return '#ff4444';
  if (utilization < 75) return '#ff8c00';
  return '#22c55e';
}

export function rectsIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function intersectionArea(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): number {
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, bh + by);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  return w * h;
}

export function checkFlawOverlap(
  cutX: number, cutY: number, cutW: number, cutH: number,
  flaws: Flaw[],
  threshold: number = 0.2
): { hasOverlap: boolean; overlapRatio: number } {
  const cutArea = cutW * cutH;
  if (cutArea <= 0) return { hasOverlap: false, overlapRatio: 0 };

  let totalOverlap = 0;
  for (const flaw of flaws) {
    totalOverlap += intersectionArea(
      cutX, cutY, cutW, cutH,
      flaw.x, flaw.y, flaw.width, flaw.height
    );
  }

  const overlapRatio = totalOverlap / cutArea;
  return {
    hasOverlap: overlapRatio > threshold,
    overlapRatio,
  };
}

export interface PackedItem {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PackSpace {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function greedyPack(
  leather: Leather,
  orderItems: OrderItem[]
): PackedItem[] {
  const result: PackedItem[] = [];
  const { width: LW, height: LH, flaws } = leather;

  const allItems: { name: string; width: number; height: number }[] = [];
  for (const item of orderItems) {
    for (let i = 0; i < item.quantity; i++) {
      allItems.push({ name: item.name, width: item.width, height: item.height });
    }
  }

  allItems.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const spaces: PackSpace[] = [{ x: 0, y: 0, width: LW, height: LH }];

  const canPlace = (
    sx: number, sy: number, sw: number, sh: number
  ): boolean => {
    if (sx + sw > LW || sy + sh > LH) return false;
    for (const flaw of flaws) {
      const { hasOverlap } = checkFlawOverlap(sx, sy, sw, sh, [flaw], 0.2);
      if (hasOverlap) return false;
    }
    return true;
  };

  for (const item of allItems) {
    let placed = false;
    let bestSpaceIdx = -1;
    let bestX = 0;
    let bestY = 0;
    let bestWaste = Infinity;

    for (let si = 0; si < spaces.length; si++) {
      const sp = spaces[si];
      if (item.width <= sp.width && item.height <= sp.height) {
        if (canPlace(sp.x, sp.y, item.width, item.height)) {
          const waste = (sp.width * sp.height) - (item.width * item.height);
          if (waste < bestWaste) {
            bestWaste = waste;
            bestSpaceIdx = si;
            bestX = sp.x;
            bestY = sp.y;
          }
        }
      }
    }

    if (bestSpaceIdx >= 0) {
      result.push({
        name: item.name,
        x: bestX,
        y: bestY,
        width: item.width,
        height: item.height,
      });

      const sp = spaces[bestSpaceIdx];
      spaces.splice(bestSpaceIdx, 1);

      if (sp.height - item.height > 0) {
        spaces.push({
          x: sp.x,
          y: sp.y + item.height,
          width: sp.width,
          height: sp.height - item.height,
        });
      }
      if (sp.width - item.width > 0) {
        spaces.push({
          x: sp.x + item.width,
          y: sp.y,
          width: sp.width - item.width,
          height: item.height,
        });
      }

      placed = true;
    }

    if (!placed) {
      for (let si = 0; si < spaces.length && !placed; si++) {
        const sp = spaces[si];
        for (let oy = 0; oy <= sp.height - item.height && !placed; oy += 5) {
          for (let ox = 0; ox <= sp.width - item.width && !placed; ox += 5) {
            if (canPlace(sp.x + ox, sp.y + oy, item.width, item.height)) {
              result.push({
                name: item.name,
                x: sp.x + ox,
                y: sp.y + oy,
                width: item.width,
                height: item.height,
              });
              placed = true;
            }
          }
        }
      }
    }
  }

  return result;
}

export function calcTotalCutArea(rects: CutRect[]): number {
  return rects.reduce((sum, r) => sum + r.width * r.height, 0);
}
