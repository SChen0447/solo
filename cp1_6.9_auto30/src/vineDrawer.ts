import type p5 from 'p5';
import {
  Flower,
  createFlower,
  updateFlower,
  drawFlower,
  mixColors,
  triggerPulse,
  FlowerColor,
  createFlowerColor,
} from './flowerBloomer';

export interface VinePoint {
  x: number;
  y: number;
}

export interface VineBranch {
  points: VinePoint[];
  targetPoint: VinePoint | null;
  currentLength: number;
  lastFlowerDist: number;
  flowers: Flower[];
  isMain: boolean;
  maxLength: number;
  children: VineBranch[];
  parentBranched: boolean;
  angle: number;
  width: number;
  color: FlowerColor;
}

export interface Vine {
  id: number;
  branches: VineBranch[];
  isDrawing: boolean;
  mousePath: VinePoint[];
  createdAt: number;
}

export interface VineDrawerConfig {
  baseSpeed: number;
  flowerDensity: 'low' | 'medium' | 'high';
}

const BASE_GROWTH_SPEED = 50;
const FLOWER_SPACING: Record<'low' | 'medium' | 'high', number> = {
  low: 100,
  medium: 60,
  high: 35,
};
const BRANCH_MIN_ANGLE = -45;
const BRANCH_MAX_ANGLE = 45;

let vineIdCounter = 0;

export function createVineDrawerConfig(): VineDrawerConfig {
  return {
    baseSpeed: BASE_GROWTH_SPEED,
    flowerDensity: 'medium',
  };
}

function jitterPoint(p: p5, point: VinePoint, amount: number = 1.5): VinePoint {
  return {
    x: point.x + (p.random() - 0.5) * amount * 2,
    y: point.y + (p.random() - 0.5) * amount * 2,
  };
}

function distPoints(a: VinePoint, b: VinePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerpPoint(a: VinePoint, b: VinePoint, t: number): VinePoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function createBranch(start: VinePoint, isMain: boolean = true, angle: number = 0): VineBranch {
  return {
    points: [{ ...start }],
    targetPoint: null,
    currentLength: 0,
    lastFlowerDist: 0,
    flowers: [],
    isMain,
    maxLength: isMain ? 5000 : 80 + Math.random() * 120,
    children: [],
    parentBranched: false,
    angle,
    width: isMain ? 2 : 1.2,
    color: createFlowerColor(),
  };
}

export function createVine(startX: number, startY: number): Vine {
  vineIdCounter++;
  const mainBranch = createBranch({ x: startX, y: startY }, true);
  return {
    id: vineIdCounter,
    branches: [mainBranch],
    isDrawing: true,
    mousePath: [{ x: startX, y: startY }],
    createdAt: performance.now(),
  };
}

export function addMousePoint(vine: Vine, x: number, y: number): void {
  const lastPoint = vine.mousePath[vine.mousePath.length - 1];
  if (!lastPoint || distPoints(lastPoint, { x, y }) > 3) {
    vine.mousePath.push({ x, y });
    if (vine.branches.length > 0) {
      vine.branches[0].targetPoint = { x, y };
    }
  }
}

export function finishVine(vine: Vine): void {
  vine.isDrawing = false;
}

function getGrowthAngle(branch: VineBranch): number {
  if (branch.points.length < 2) return branch.angle;
  const last = branch.points[branch.points.length - 1];
  const prev = branch.points[branch.points.length - 2];
  return Math.atan2(last.y - prev.y, last.x - prev.x);
}

function tryCreateChildBranch(p: p5, parent: VineBranch, allBranches: VineBranch[]): void {
  if (!parent.isMain || parent.parentBranched) return;
  if (parent.points.length < 10) return;
  if (parent.children.length >= 3) return;

  const chance = 0.008;
  if (p.random() > chance) return;

  const lastPoint = parent.points[parent.points.length - 1];
  const angle = getGrowthAngle(parent);
  const branchAngle = angle + ((p.random() * (BRANCH_MAX_ANGLE - BRANCH_MIN_ANGLE) + BRANCH_MIN_ANGLE) * Math.PI) / 180;
  const child = createBranch(lastPoint, false, branchAngle);
  child.targetPoint = {
    x: lastPoint.x + Math.cos(branchAngle) * 150,
    y: lastPoint.y + Math.sin(branchAngle) * 150,
  };
  parent.children.push(child);
  allBranches.push(child);
  parent.parentBranched = true;
  p.setTimeout(() => {
    parent.parentBranched = false;
  }, 300);
}

function tryCreateFlower(
  p: p5,
  branch: VineBranch,
  flowerSpacing: number
): void {
  if (branch.lastFlowerDist >= flowerSpacing) {
    const lastPoint = branch.points[branch.points.length - 1];
    const flower = createFlower(lastPoint.x, lastPoint.y);
    branch.flowers.push(flower);
    branch.lastFlowerDist = 0;
  }
}

export function updateVine(
  p: p5,
  vine: Vine,
  config: VineDrawerConfig,
  speedMultiplier: number = 1
): void {
  const flowerSpacing = FLOWER_SPACING[config.flowerDensity];
  const speed = config.baseSpeed * speedMultiplier;
  const growDist = (speed * p.deltaTime) / 1000;

  for (const branch of vine.branches) {
    if (branch.currentLength >= branch.maxLength) continue;

    let remainingGrow = growDist;

    while (remainingGrow > 0 && branch.currentLength < branch.maxLength) {
      const lastPoint = branch.points[branch.points.length - 1];

      let target: VinePoint | null = null;
      if (branch.isMain) {
        let minDist = Infinity;
        for (const mp of vine.mousePath) {
          const d = distPoints(lastPoint, mp);
          if (d > 2 && d < minDist) {
            minDist = d;
            target = mp;
          }
        }
        if (!target && vine.isDrawing && vine.mousePath.length > 0) {
          target = vine.mousePath[vine.mousePath.length - 1];
        }
      } else if (branch.targetPoint) {
        target = branch.targetPoint;
      }

      if (!target) break;

      const d = distPoints(lastPoint, target);
      if (d < 1) break;

      const stepDist = Math.min(remainingGrow, d);
      const t = stepDist / d;
      const newPoint = lerpPoint(lastPoint, target, t);
      const jittered = jitterPoint(p, newPoint, 1.5);

      branch.points.push(jittered);
      branch.currentLength += stepDist;
      branch.lastFlowerDist += stepDist;
      remainingGrow -= stepDist;

      tryCreateFlower(p, branch, flowerSpacing);
      tryCreateChildBranch(p, branch, vine.branches);
    }
  }

  for (const branch of vine.branches) {
    for (const flower of branch.flowers) {
      updateFlower(p, flower, speedMultiplier);
    }
  }
}

export function drawVine(p: p5, vine: Vine): void {
  for (const branch of vine.branches) {
    if (branch.points.length < 2) continue;

    for (let i = 1; i < branch.points.length; i++) {
      const prev = branch.points[i - 1];
      const curr = branch.points[i];
      const progress = i / branch.points.length;

      const startR = p.lerp(120, 60, progress);
      const startG = p.lerp(180, 110, progress);
      const startB = p.lerp(90, 50, progress);
      const strokeW = p.lerp(branch.width, branch.width * 0.5, progress);

      p.stroke(startR, startG, startB, 220);
      p.strokeWeight(strokeW);
      p.strokeCap(p.ROUND);
      p.line(prev.x, prev.y, curr.x, curr.y);
    }

    for (const flower of branch.flowers) {
      drawFlower(p, flower);
    }
  }
}

export function checkVineCollisions(vines: Vine[]): void {
  for (let i = 0; i < vines.length; i++) {
    for (let j = i + 1; j < vines.length; j++) {
      checkTwoVineCollision(vines[i], vines[j]);
    }
  }
}

function checkTwoVineCollision(v1: Vine, v2: Vine): void {
  const flowers1 = getAllFlowers(v1);
  const flowers2 = getAllFlowers(v2);

  for (const f1 of flowers1) {
    for (const f2 of flowers2) {
      const dx = f1.x - f2.x;
      const dy = f1.y - f2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 50) {
        if (!f1.mixedColor || !f2.mixedColor) {
          const mixed = mixColors(f1.color, f2.color);
          f1.mixedColor = mixed;
          f2.mixedColor = mixed;
          triggerPulse(f1);
          triggerPulse(f2);
        }
      }
    }
  }
}

function getAllFlowers(vine: Vine): Flower[] {
  const all: Flower[] = [];
  for (const branch of vine.branches) {
    all.push(...branch.flowers);
  }
  return all;
}
