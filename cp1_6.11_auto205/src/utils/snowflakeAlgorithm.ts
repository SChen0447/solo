export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

export interface BranchPoint {
  x: number;
  y: number;
  startX: number;
  startY: number;
  angle: number;
  length: number;
  width: number;
  layer: number;
  endX: number;
  endY: number;
}

export interface GrowthLayer {
  layer: number;
  branches: BranchPoint[];
}

export interface SnowflakeData {
  centerX: number;
  centerY: number;
  layers: GrowthLayer[];
  totalBranches: number;
  symmetry: number;
  params: EnvironmentParams;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  phase: number;
  speed: number;
}

const MAX_LAYERS = 6;
const CANVAS_SIZE = 800;
const CENTER = CANVAS_SIZE / 2;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function calculateBranchCounts(temperature: number): number[] {
  const counts: number[] = [];
  counts[0] = 6;
  for (let i = 1; i < MAX_LAYERS; i++) {
    const baseBranches = Math.floor(-temperature / 10) + 2;
    counts[i] = Math.max(2, Math.min(6, baseBranches));
  }
  return counts;
}

function calculateMainBranchLength(humidity: number, layer: number): number {
  const baseLength = 60 + (humidity / 100) * 60;
  const layerFactor = 1 - layer * 0.12;
  return baseLength * Math.max(0.3, layerFactor);
}

function calculateSymmetry(branches: BranchPoint[]): number {
  const symmetryPairs: { left: number; right: number }[] = [];
  const angleGroups = new Map<number, number[]>();

  branches.forEach((b) => {
    if (b.layer === 0) return;
    const normalizedAngle = ((b.angle % 360) + 360) % 360;
    const key = Math.round(normalizedAngle / 60) * 60;
    if (!angleGroups.has(key)) {
      angleGroups.set(key, []);
    }
    angleGroups.get(key)!.push(b.length);
  });

  const angles = Array.from(angleGroups.keys()).sort((a, b) => a - b);
  for (let i = 0; i < angles.length / 2; i++) {
    const leftLengths = angleGroups.get(angles[i])!;
    const rightLengths = angleGroups.get(angles[angles.length - 1 - i])!;
    if (leftLengths.length > 0 && rightLengths.length > 0) {
      const leftAvg = leftLengths.reduce((a, b) => a + b, 0) / leftLengths.length;
      const rightAvg =
        rightLengths.reduce((a, b) => a + b, 0) / rightLengths.length;
      symmetryPairs.push({ left: leftAvg, right: rightAvg });
    }
  }

  if (symmetryPairs.length === 0) return 100;

  let totalDeviation = 0;
  symmetryPairs.forEach((pair) => {
    const avg = (pair.left + pair.right) / 2;
    if (avg > 0) {
      totalDeviation += Math.abs(pair.left - pair.right) / avg;
    }
  });

  const avgDeviation = totalDeviation / symmetryPairs.length;
  const symmetry = Math.max(0, 100 - avgDeviation * 100);
  return Math.round(symmetry);
}

export function generateSnowflakePaths(
  params: EnvironmentParams,
  seed: number = Date.now()
): SnowflakeData {
  const random = seededRandom(seed);
  const { temperature, humidity, windSpeed } = params;
  const branchCounts = calculateBranchCounts(temperature);

  const layers: GrowthLayer[] = [];
  const allBranches: BranchPoint[] = [];

  for (let layerIdx = 0; layerIdx < MAX_LAYERS; layerIdx++) {
    const layerBranches: BranchPoint[] = [];
    const numBranches = branchCounts[layerIdx];

    for (let angleIdx = 0; angleIdx < 6; angleIdx++) {
      const baseAngle = angleIdx * 60;

      if (layerIdx === 0) {
        const mainLength = calculateMainBranchLength(humidity, layerIdx);
        const windOffset = windSpeed * 2 * (random() - 0.5);
        const angleRad = (baseAngle * Math.PI) / 180;

        const endX = CENTER + Math.cos(angleRad) * mainLength + windOffset;
        const endY = CENTER + Math.sin(angleRad) * mainLength + windOffset;

        const branch: BranchPoint = {
          x: CENTER,
          y: CENTER,
          startX: CENTER,
          startY: CENTER,
          angle: baseAngle,
          length: mainLength,
          width: 1,
          layer: layerIdx,
          endX,
          endY,
        };
        layerBranches.push(branch);
        allBranches.push(branch);
      } else {
        const parentLayer = layers[layerIdx - 1];
        const parentBranches = parentLayer.branches.filter(
          (b) => Math.abs(b.angle - baseAngle) < 1 || Math.abs(b.angle - baseAngle) > 359
        );

        if (parentBranches.length > 0) {
          const parent = parentBranches[0];
          const branchesPerSide = Math.floor(numBranches / 2);

          for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < branchesPerSide; i++) {
              const t = 0.3 + (i / branchesPerSide) * 0.5;
              const startX =
                parent.startX + (parent.endX - parent.startX) * t;
              const startY =
                parent.startY + (parent.endY - parent.startY) * t;

              const sideAngle = baseAngle + side * (30 + i * 10);
              const subLength =
                parent.length * (0.3 + random() * 0.3) * (1 - layerIdx * 0.1);
              const windOffset = windSpeed * 2 * (random() - 0.5);
              const angleRad = (sideAngle * Math.PI) / 180;

              const endX =
                startX + Math.cos(angleRad) * subLength + windOffset;
              const endY =
                startY + Math.sin(angleRad) * subLength + windOffset;

              const branch: BranchPoint = {
                x: startX,
                y: startY,
                startX,
                startY,
                angle: sideAngle,
                length: subLength,
                width: 1,
                layer: layerIdx,
                endX,
                endY,
              };
              layerBranches.push(branch);
              allBranches.push(branch);
            }
          }
        }
      }
    }

    layers.push({
      layer: layerIdx,
      branches: layerBranches,
    });
  }

  const symmetry = calculateSymmetry(allBranches);

  return {
    centerX: CENTER,
    centerY: CENTER,
    layers,
    totalBranches: allBranches.length,
    symmetry,
    params,
  };
}

export function generateParticles(
  centerX: number,
  centerY: number,
  count: number = 50
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 350;
    particles.push({
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
    });
  }
  return particles;
}

export function getBranchColor(
  layer: number,
  totalLayers: number
): { r: number; g: number; b: number } {
  const t = layer / Math.max(1, totalLayers - 1);
  const startR = 192,
    startG = 232,
    startB = 240;
  const endR = 232,
    endG = 248,
    endB = 255;
  return {
    r: Math.round(startR + (endR - startR) * t),
    g: Math.round(startG + (endG - startG) * t),
    b: Math.round(startB + (endB - startB) * t),
  };
}
