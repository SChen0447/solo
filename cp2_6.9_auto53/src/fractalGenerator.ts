export type ColorMapType = 'galaxy' | 'lava' | 'emerald';

export interface FractalParams {
  iterations: number;
  scale: number;
  colorMap: ColorMapType;
}

export interface FractalData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

const COLOR_MAPS: Record<ColorMapType, { start: [number, number, number]; end: [number, number, number] }> = {
  galaxy: {
    start: [0.545, 0.361, 0.965],
    end: [0.231, 0.510, 0.965]
  },
  lava: {
    start: [1.0, 0.271, 0.0],
    end: [1.0, 0.549, 0.0]
  },
  emerald: {
    start: [0.0, 1.0, 0.498],
    end: [0.0, 0.808, 0.820]
  }
};

function getPointCountForIterations(iterations: number): number {
  const baseCounts: Record<number, number> = {
    3: 2000,
    4: 3200,
    5: 5000,
    6: 7500,
    7: 11000,
    8: 15000,
    9: 22000,
    10: 30000
  };
  return baseCounts[iterations] ?? 5000;
}

function lerpColor(
  t: number,
  start: [number, number, number],
  end: [number, number, number]
): [number, number, number] {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t
  ];
}

function generateIFSTransforms(): Array<{
  a: number; b: number; c: number; d: number; e: number; f: number; prob: number;
}> {
  const phi = (1 + Math.sqrt(5)) / 2;
  return [
    { a: 0.5, b: 0.0, c: 0.0, d: 0.5, e: 0.0, f: 0.0, prob: 0.25 },
    { a: -0.5, b: 0.0, c: 0.0, d: -0.5, e: 0.5, f: 0.0, prob: 0.25 },
    { a: 0.5, b: -0.866, c: 0.866, d: 0.5, e: 0.25, f: 0.433, prob: 0.25 },
    { a: -0.5 / phi, b: 0.5, c: -0.5, d: -0.5 / phi, e: 0.3, f: -0.2, prob: 0.25 }
  ];
}

export function generateFractalPointCloud(params: FractalParams): FractalData {
  const count = getPointCountForIterations(params.iterations);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const colorMap = COLOR_MAPS[params.colorMap];
  const transforms = generateIFSTransforms();

  let x = 0, y = 0;

  const warmup = 20;
  for (let i = 0; i < warmup; i++) {
    const rand = Math.random();
    let cumProb = 0;
    let selectedTransform = transforms[0];
    for (const t of transforms) {
      cumProb += t.prob;
      if (rand <= cumProb) {
        selectedTransform = t;
        break;
      }
    }
    const newX = selectedTransform.a * x + selectedTransform.b * y + selectedTransform.e;
    const newY = selectedTransform.c * x + selectedTransform.d * y + selectedTransform.f;
    x = newX;
    y = newY;
  }

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let cumProb = 0;
    let selectedTransform = transforms[0];
    for (const t of transforms) {
      cumProb += t.prob;
      if (rand <= cumProb) {
        selectedTransform = t;
        break;
      }
    }

    const newX = selectedTransform.a * x + selectedTransform.b * y + selectedTransform.e;
    const newY = selectedTransform.c * x + selectedTransform.d * y + selectedTransform.f;
    x = newX;
    y = newY;

    const theta = Math.random() * Math.PI * 2;
    const phiAngle = Math.acos(2 * Math.random() - 1);
    const radius = (1.5 + Math.sin(x * 3 + y * 2) * 0.3) * params.scale;

    const px = radius * Math.sin(phiAngle) * Math.cos(theta);
    const py = radius * Math.sin(phiAngle) * Math.sin(theta);
    const pz = radius * Math.cos(phiAngle);

    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    const distFromCenter = Math.sqrt(px * px + py * py + pz * pz);
    const normalizedDist = Math.min(distFromCenter / (radius * 1.5), 1.0);

    const noiseVal = (Math.sin(x * 5) * 0.5 + 0.5 + Math.cos(y * 3) * 0.3 + 0.3) / 1.6;
    const colorT = (normalizedDist * 0.6 + noiseVal * 0.4);
    const color = lerpColor(colorT, colorMap.start, colorMap.end);

    const brightness = 0.7 + Math.random() * 0.3;
    colors[i * 3] = color[0] * brightness;
    colors[i * 3 + 1] = color[1] * brightness;
    colors[i * 3 + 2] = color[2] * brightness;

    sizes[i] = 0.03 + Math.random() * 0.04;
  }

  return { positions, colors, sizes, count };
}
