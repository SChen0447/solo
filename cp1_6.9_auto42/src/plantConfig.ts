export interface GrowthStage {
  height: number;
  stemDiameter: number;
  leafCount: number;
  leafAngle: number;
  color: { r: number; g: number; b: number };
  bloomProbability: number;
  petalOpenAngle: number;
}

export interface PlantConfig {
  id: 'cactus' | 'orchid' | 'fern';
  name: string;
  climateColor: string;
  stages: GrowthStage[];
  baseRadius: number;
  stemSegments: number;
  leafShape: 'flat' | 'spine' | 'compound';
  hasFlowers: boolean;
  petalColor: { r: number; g: number; b: number };
}

const cactusStages: GrowthStage[] = [
  {
    height: 1.0,
    stemDiameter: 0.6,
    leafCount: 0,
    leafAngle: 0,
    color: { r: 144, g: 238, b: 144 },
    bloomProbability: 0,
    petalOpenAngle: 0
  },
  {
    height: 2.5,
    stemDiameter: 0.9,
    leafCount: 12,
    leafAngle: 30,
    color: { r: 100, g: 200, b: 100 },
    bloomProbability: 0.1,
    petalOpenAngle: 30
  },
  {
    height: 4.0,
    stemDiameter: 1.2,
    leafCount: 24,
    leafAngle: 45,
    color: { r: 34, g: 139, b: 34 },
    bloomProbability: 0.8,
    petalOpenAngle: 120
  }
];

const orchidStages: GrowthStage[] = [
  {
    height: 0.5,
    stemDiameter: 0.15,
    leafCount: 2,
    leafAngle: 45,
    color: { r: 144, g: 238, b: 144 },
    bloomProbability: 0,
    petalOpenAngle: 0
  },
  {
    height: 1.5,
    stemDiameter: 0.25,
    leafCount: 5,
    leafAngle: 60,
    color: { r: 100, g: 200, b: 120 },
    bloomProbability: 0.2,
    petalOpenAngle: 40
  },
  {
    height: 2.5,
    stemDiameter: 0.35,
    leafCount: 8,
    leafAngle: 75,
    color: { r: 60, g: 179, b: 113 },
    bloomProbability: 1.0,
    petalOpenAngle: 120
  }
];

const fernStages: GrowthStage[] = [
  {
    height: 0.4,
    stemDiameter: 0.1,
    leafCount: 3,
    leafAngle: 30,
    color: { r: 144, g: 238, b: 144 },
    bloomProbability: 0,
    petalOpenAngle: 0
  },
  {
    height: 1.2,
    stemDiameter: 0.15,
    leafCount: 8,
    leafAngle: 50,
    color: { r: 80, g: 200, b: 120 },
    bloomProbability: 0,
    petalOpenAngle: 0
  },
  {
    height: 2.0,
    stemDiameter: 0.2,
    leafCount: 14,
    leafAngle: 70,
    color: { r: 39, g: 174, b: 96 },
    bloomProbability: 0,
    petalOpenAngle: 0
  }
];

export const plantConfigs: Record<string, PlantConfig> = {
  cactus: {
    id: 'cactus',
    name: '仙人掌',
    climateColor: '#f4d03f',
    stages: cactusStages,
    baseRadius: 0.5,
    stemSegments: 10,
    leafShape: 'spine',
    hasFlowers: true,
    petalColor: { r: 255, g: 182, b: 193 }
  },
  orchid: {
    id: 'orchid',
    name: '兰花',
    climateColor: '#af7ac5',
    stages: orchidStages,
    baseRadius: 0.3,
    stemSegments: 8,
    leafShape: 'flat',
    hasFlowers: true,
    petalColor: { r: 186, g: 85, b: 211 }
  },
  fern: {
    id: 'fern',
    name: '蕨类',
    climateColor: '#27ae60',
    stages: fernStages,
    baseRadius: 0.25,
    stemSegments: 6,
    leafShape: 'compound',
    hasFlowers: false,
    petalColor: { r: 0, g: 0, b: 0 }
  }
};

export function interpolateStage(config: PlantConfig, progress: number): GrowthStage {
  const p = Math.max(0, Math.min(100, progress)) / 100;
  const stages = config.stages;
  const maxIdx = stages.length - 1;
  const exactPos = p * maxIdx;
  const idx = Math.floor(exactPos);
  const t = exactPos - idx;

  if (idx >= maxIdx) {
    return { ...stages[maxIdx] };
  }

  const s1 = stages[idx];
  const s2 = stages[idx + 1];

  return {
    height: s1.height + (s2.height - s1.height) * t,
    stemDiameter: s1.stemDiameter + (s2.stemDiameter - s1.stemDiameter) * t,
    leafCount: Math.round(s1.leafCount + (s2.leafCount - s1.leafCount) * t),
    leafAngle: s1.leafAngle + (s2.leafAngle - s1.leafAngle) * t,
    color: {
      r: Math.round(s1.color.r + (s2.color.r - s1.color.r) * t),
      g: Math.round(s1.color.g + (s2.color.g - s1.color.g) * t),
      b: Math.round(s1.color.b + (s2.color.b - s1.color.b) * t)
    },
    bloomProbability: s1.bloomProbability + (s2.bloomProbability - s1.bloomProbability) * t,
    petalOpenAngle: s1.petalOpenAngle + (s2.petalOpenAngle - s1.petalOpenAngle) * t
  };
}
