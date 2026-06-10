import _ from 'lodash';

export type EcosystemType = 'rainforest' | 'desert' | 'alpine';
export type DensityType = 'low' | 'medium' | 'high';
export type LayerType = 'tree' | 'shrub' | 'herb';

export interface PlantData {
  id: string;
  species: string;
  layer: LayerType;
  position: { x: number; z: number };
  height: number;
  crownDiameter: number;
  color: string;
  rotation: number;
}

export interface EcosystemData {
  type: EcosystemType;
  plants: PlantData[];
  stats: {
    treeCount: number;
    shrubCount: number;
    herbCount: number;
    totalCount: number;
  };
}

interface LayerConfig {
  minHeight: number;
  maxHeight: number;
  minCrown: number;
  maxCrown: number;
  countRatio: number;
  colors: string[];
  species: string[];
}

interface EcosystemConfig {
  name: string;
  tree: LayerConfig;
  shrub: LayerConfig;
  herb: LayerConfig;
  totalBaseCount: number;
  groundColor: string;
}

const ecosystemConfigs: Record<EcosystemType, EcosystemConfig> = {
  rainforest: {
    name: '热带雨林',
    tree: {
      minHeight: 5,
      maxHeight: 8,
      minCrown: 1.2,
      maxCrown: 2.5,
      countRatio: 0.25,
      colors: ['#1b4332', '#2d6a4f', '#40916c', '#1b4332'],
      species: ['望天树', '龙脑香', '榕树', '棕榈', '箭毒木']
    },
    shrub: {
      minHeight: 1,
      maxHeight: 3,
      minCrown: 0.6,
      maxCrown: 1.4,
      countRatio: 0.35,
      colors: ['#52b788', '#74c69d', '#95d5b2', '#40916c'],
      species: ['野牡丹', '紫金牛', '九节', '五月茶']
    },
    herb: {
      minHeight: 0.2,
      maxHeight: 0.5,
      minCrown: 0.15,
      maxCrown: 0.4,
      countRatio: 0.4,
      colors: ['#b7e4c7', '#d8f3dc', '#95d5b2'],
      species: ['蕨类', '苔藓', '海芋', '豆蔻']
    },
    totalBaseCount: 220,
    groundColor: '#1a2f1a'
  },
  desert: {
    name: '沙漠',
    tree: {
      minHeight: 1.5,
      maxHeight: 3,
      minCrown: 0.5,
      maxCrown: 1.0,
      countRatio: 0.1,
      colors: ['#6b4423', '#8b5a2b', '#5d4037'],
      species: ['金合欢', '牧豆树', '沙漠铁木']
    },
    shrub: {
      minHeight: 0.5,
      maxHeight: 2,
      minCrown: 0.4,
      maxCrown: 0.9,
      countRatio: 0.3,
      colors: ['#a1887f', '#8d6e63', '#c9a96e'],
      species: ['仙人掌', '仙人球', '芦荟', '龙舌兰']
    },
    herb: {
      minHeight: 0.1,
      maxHeight: 0.35,
      minCrown: 0.1,
      maxCrown: 0.25,
      countRatio: 0.6,
      colors: ['#d7ccc8', '#bcaaa4', '#d4a373'],
      species: ['沙漠玫瑰', '骆驼刺', '沙蒿']
    },
    totalBaseCount: 120,
    groundColor: '#c2956e'
  },
  alpine: {
    name: '高山草甸',
    tree: {
      minHeight: 0.8,
      maxHeight: 1.8,
      minCrown: 0.4,
      maxCrown: 0.8,
      countRatio: 0.05,
      colors: ['#2e7d32', '#388e3c', '#43a047'],
      species: ['高山松', '矮桦', '杜鹃灌丛']
    },
    shrub: {
      minHeight: 0.3,
      maxHeight: 0.8,
      minCrown: 0.25,
      maxCrown: 0.5,
      countRatio: 0.2,
      colors: ['#66bb6a', '#81c784', '#9ccc65'],
      species: ['金露梅', '高山杜鹃', '岩须']
    },
    herb: {
      minHeight: 0.08,
      maxHeight: 0.3,
      minCrown: 0.08,
      maxCrown: 0.2,
      countRatio: 0.75,
      colors: ['#c5e1a5', '#dce775', '#ba68c8', '#fff176', '#aed581'],
      species: ['雪莲', '高山罂粟', '紫菀', '龙胆', '虎耳草']
    },
    totalBaseCount: 260,
    groundColor: '#3a5a2a'
  }
};

const densityMultipliers: Record<DensityType, number> = {
  low: 0.6,
  medium: 1.0,
  high: 1.4
};

const AREA_SIZE = 10;
const MIN_DISTANCE = 0.3;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlant(
  id: string,
  layer: LayerType,
  config: LayerConfig,
  existingPositions: { x: number; z: number }[]
): PlantData | null {
  let attempts = 0;
  let pos: { x: number; z: number } | null = null;

  while (attempts < 30) {
    const x = randomRange(-AREA_SIZE / 2, AREA_SIZE / 2);
    const z = randomRange(-AREA_SIZE / 2, AREA_SIZE / 2);

    const tooClose = existingPositions.some(
      p => Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2) < MIN_DISTANCE
    );

    if (!tooClose) {
      pos = { x, z };
      break;
    }
    attempts++;
  }

  if (!pos) return null;

  const height = randomRange(config.minHeight, config.maxHeight);
  const crownDiameter = randomRange(config.minCrown, config.maxCrown);

  return {
    id,
    species: randomItem(config.species),
    layer,
    position: pos,
    height,
    crownDiameter,
    color: randomItem(config.colors),
    rotation: Math.random() * Math.PI * 2
  };
}

export function generateEcosystem(
  type: EcosystemType,
  density: DensityType = 'medium'
): EcosystemData {
  const config = ecosystemConfigs[type];
  const totalCount = Math.floor(config.totalBaseCount * densityMultipliers[density]);
  const maxCount = 300;
  const finalTotal = Math.min(totalCount, maxCount);

  const plants: PlantData[] = [];
  const positions: { x: number; z: number }[] = [];

  const layers: { layer: LayerType; layerConfig: LayerConfig }[] = [
    { layer: 'tree', layerConfig: config.tree },
    { layer: 'shrub', layerConfig: config.shrub },
    { layer: 'herb', layerConfig: config.herb }
  ];

  for (const { layer, layerConfig } of layers) {
    const layerCount = Math.floor(finalTotal * layerConfig.countRatio);

    for (let i = 0; i < layerCount; i++) {
      const plant = generatePlant(
        `${layer}-${plants.length}`,
        layer,
        layerConfig,
        positions
      );

      if (plant) {
        plants.push(plant);
        positions.push(plant.position);
      }
    }
  }

  const treeCount = plants.filter(p => p.layer === 'tree').length;
  const shrubCount = plants.filter(p => p.layer === 'shrub').length;
  const herbCount = plants.filter(p => p.layer === 'herb').length;

  return {
    type,
    plants,
    stats: {
      treeCount,
      shrubCount,
      herbCount,
      totalCount: plants.length
    }
  };
}

export function getEcosystemConfig(type: EcosystemType): EcosystemConfig {
  return ecosystemConfigs[type];
}
