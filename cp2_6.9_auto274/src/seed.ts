import { getSporesInRadius, absorbSpores, type Spore } from './growth';

export interface Seed {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  targetRadius: number;
  currentRadius: number;
  noiseOffsets: number[];
  id: string;
  centerColor: { r: number; g: number; b: number };
  edgeColor: { r: number; g: number; b: number };
  absorbedSporeIds: string[];
}

const seeds: Seed[] = [];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 90, g: 122, b: 74 };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function noise(x: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, seed: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const v1 = noise(intX, seed);
  const v2 = noise(intX + 1, seed);
  return v1 * (1 - fracX * fracX * (3 - 2 * fracX)) + v2 * fracX * fracX * (3 - 2 * fracX);
}

export function addSeed(x: number, y: number): void {
  const noiseCount = 32;
  const noiseOffsets: number[] = [];
  for (let i = 0; i < noiseCount; i++) {
    noiseOffsets.push(Math.random() * 1000);
  }

  const seed: Seed = {
    x,
    y,
    age: 0,
    maxAge: 5,
    targetRadius: 80,
    currentRadius: 0,
    noiseOffsets,
    id: generateId(),
    centerColor: hexToRgb('#5A7A4A'),
    edgeColor: hexToRgb('#3A5A2A'),
    absorbedSporeIds: [],
  };
  seeds.push(seed);
}

export function updateSeeds(timeMultiplier: number = 1): void {
  for (let i = seeds.length - 1; i >= 0; i--) {
    const seed = seeds[i];
    seed.age += (1 / 60) * timeMultiplier;

    const growthProgress = Math.min(seed.age / seed.maxAge, 1);
    seed.currentRadius = seed.targetRadius * growthProgress;

    const absorptionRadius = seed.currentRadius * 1.5;
    const nearbySpores: Spore[] = getSporesInRadius(seed.x, seed.y, absorptionRadius);

    for (const spore of nearbySpores) {
      if (!seed.absorbedSporeIds.includes(spore.id)) {
        seed.absorbedSporeIds.push(spore.id);
        const distFromCenter = Math.sqrt(
          (spore.x - seed.x) ** 2 + (spore.y - seed.y) ** 2
        );
        const colorT = Math.min(distFromCenter / seed.targetRadius, 1);
        const absorbedColor = lerpColor(seed.centerColor, seed.edgeColor, colorT);
        absorbSpores([spore.id], seed.id, absorbedColor);
      }
    }
  }
}

function getSeedEdgePoint(
  seed: Seed,
  angle: number,
  time: number
): { x: number; y: number } {
  const noiseIndex = Math.floor((angle / (Math.PI * 2)) * seed.noiseOffsets.length);
  const nextIndex = (noiseIndex + 1) % seed.noiseOffsets.length;
  const frac = ((angle / (Math.PI * 2)) * seed.noiseOffsets.length) % 1;

  const n1 = smoothNoise(time * 0.5 + seed.noiseOffsets[noiseIndex], noiseIndex);
  const n2 = smoothNoise(time * 0.5 + seed.noiseOffsets[nextIndex], nextIndex);
  const noiseValue = n1 * (1 - frac) + n2 * frac;

  const radius = seed.currentRadius * (0.75 + noiseValue * 0.5);

  return {
    x: seed.x + Math.cos(angle) * radius,
    y: seed.y + Math.sin(angle) * radius,
  };
}

export function renderSeeds(ctx: CanvasRenderingContext2D, time: number): void {
  for (const seed of seeds) {
    if (seed.currentRadius <= 0) continue;

    const points: { x: number; y: number }[] = [];
    const pointCount = 64;
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      points.push(getSeedEdgePoint(seed, angle, time + seed.noiseOffsets[0]));
    }

    const gradient = ctx.createRadialGradient(
      seed.x,
      seed.y,
      0,
      seed.x,
      seed.y,
      seed.currentRadius
    );
    gradient.addColorStop(0, `rgba(${seed.centerColor.r}, ${seed.centerColor.g}, ${seed.centerColor.b}, 0.85)`);
    gradient.addColorStop(0.7, `rgba(${(seed.centerColor.r + seed.edgeColor.r) / 2}, ${(seed.centerColor.g + seed.edgeColor.g) / 2}, ${(seed.centerColor.b + seed.edgeColor.b) / 2}, 0.7)`);
    gradient.addColorStop(1, `rgba(${seed.edgeColor.r}, ${seed.edgeColor.g}, ${seed.edgeColor.b}, 0.5)`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[(i + 1) % points.length].x) / 2;
      const yc = (points[i].y + points[(i + 1) % points.length].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[(i + 1) % points.length].x) / 2;
      const yc = (points[i].y + points[(i + 1) % points.length].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(${seed.centerColor.r}, ${seed.centerColor.g}, ${seed.centerColor.b}, 0.9)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const sporeId of seed.absorbedSporeIds) {
      const spore = getSporesInRadius(seed.x, seed.y, seed.currentRadius * 2).find(
        (s) => s.id === sporeId
      );
      if (spore && spore.absorbed) {
        const dx = seed.x - spore.x;
        const dy = seed.y - spore.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
          const lerpT = 0.05;
          spore.x += dx * lerpT;
          spore.y += dy * lerpT;

          ctx.beginPath();
          ctx.arc(spore.x, spore.y, spore.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${spore.color.r}, ${spore.color.g}, ${spore.color.b}, 0.9)`;
          ctx.fill();
        }
      }
    }
  }
}

export function getSeeds(): Seed[] {
  return seeds;
}
