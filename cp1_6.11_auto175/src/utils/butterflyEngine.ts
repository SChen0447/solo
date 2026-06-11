import { v4 as uuidv4 } from 'uuid';
import { Butterfly, ButterflySpecies, FlyingButterfly, PlacedPlant } from '../types';
import { PLANT_DATA } from './plantData';

export const BASE_BUTTERFLIES: Record<ButterflySpecies, Omit<Butterfly, 'id' | 'isWild' | 'isCaptured' | 'parentIds' | 'childIds' | 'createdAt' | 'lastActiveAt'>> = {
  citrus_swallowtail: {
    species: 'citrus_swallowtail',
    speciesName: '柑橘凤蝶',
    wingSize: 1.0,
    patternDensity: 70,
    primaryColor: '#1a1a2e',
    secondaryColor: '#FFD700',
    accentColor: '#DC143C',
    antennaeRatio: 0.6,
    wingspanMm: 85,
    nectarPreferences: ['aristolochia', 'buddleja', 'lantana']
  },
  golden_pansy: {
    species: 'golden_pansy',
    speciesName: '金斑蝶',
    wingSize: 0.9,
    patternDensity: 60,
    primaryColor: '#D2691E',
    secondaryColor: '#1a1a2e',
    accentColor: '#FFFFFF',
    antennaeRatio: 0.5,
    wingspanMm: 75,
    nectarPreferences: ['buddleja', 'hibiscus', 'aristolochia']
  },
  dead_leaf: {
    species: 'dead_leaf',
    speciesName: '枯叶蛱蝶',
    wingSize: 1.1,
    patternDensity: 85,
    primaryColor: '#8B4513',
    secondaryColor: '#2F1810',
    accentColor: '#A0522D',
    antennaeRatio: 0.45,
    wingspanMm: 90,
    nectarPreferences: ['lantana', 'aristolochia', 'hibiscus']
  },
  cabbage_white: {
    species: 'cabbage_white',
    speciesName: '菜粉蝶',
    wingSize: 0.8,
    patternDensity: 30,
    primaryColor: '#FAF0E6',
    secondaryColor: '#1a1a2e',
    accentColor: '#2F2F2F',
    antennaeRatio: 0.55,
    wingspanMm: 55,
    nectarPreferences: ['hibiscus', 'buddleja', 'lantana']
  }
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const mixColors = (color1: string, color2: string, ratio: number = 0.5, hueShift: number = 0): string => {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);
  const h = ((hsl1.h * (1 - ratio) + hsl2.h * ratio + hueShift + 360) % 360);
  const s = hsl1.s * (1 - ratio) + hsl2.s * ratio;
  const l = hsl1.l * (1 - ratio) + hsl2.l * ratio;
  return hslToHex(h, s, l);
};

const gaussianRandom = (mean: number, stdDev: number): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
};

export const generateHybridName = (parent1: Butterfly, parent2: Butterfly): string => {
  const name1 = parent1.speciesName;
  const name2 = parent2.speciesName;
  if (name1 === name2) return name1;
  const prefix1 = name1.substring(0, Math.ceil(name1.length / 2));
  const suffix2 = name2.substring(Math.floor(name2.length / 2));
  return prefix1 + suffix2;
};

export const breedButterflies = (
  parent1: Butterfly,
  parent2: Butterfly,
  plants: PlacedPlant[] = []
): Butterfly[] => {
  const offspring: Butterfly[] = [];
  const averageNectarBonus = plants.length > 0
    ? plants.reduce((sum, p) => sum + (p.nectar / PLANT_DATA[p.type].maxNectar), 0) / plants.length
    : 0;

  for (let i = 0; i < 5; i++) {
    const ratio = Math.random();
    const hueShift = (Math.random() - 0.5) * 40;
    const wingSize = (parent1.wingSize + parent2.wingSize) / 2 + (Math.random() - 0.5) * 0.15;
    const patternDensityBase = (parent1.patternDensity + parent2.patternDensity) / 2;
    const patternDensity = Math.min(100, Math.max(0,
      gaussianRandom(patternDensityBase, 15) + averageNectarBonus * 10
    ));

    const hybridSpecies = `${parent1.species}_${parent2.species}_hybrid`;
    const hybridName = generateHybridName(parent1, parent2);

    const primaryColor = mixColors(parent1.primaryColor, parent2.primaryColor, ratio, hueShift);
    const secondaryColor = mixColors(parent1.secondaryColor, parent2.secondaryColor, ratio, hueShift * 0.5);
    const accentColor = mixColors(parent1.accentColor, parent2.accentColor, ratio, hueShift * 0.3);

    const wingspanMm = Math.round((parent1.wingspanMm + parent2.wingspanMm) / 2 + (Math.random() - 0.5) * 15);
    const antennaeRatio = (parent1.antennaeRatio + parent2.antennaeRatio) / 2 + (Math.random() - 0.5) * 0.1;

    const preferencesSet = new Set([...parent1.nectarPreferences, ...parent2.nectarPreferences]);
    const nectarPreferences = Array.from(preferencesSet).sort(() => Math.random() - 0.5).slice(0, 3);

    const butterfly: Butterfly = {
      id: uuidv4(),
      species: hybridSpecies,
      speciesName: hybridName,
      wingSize: Math.max(0.5, Math.min(1.5, wingSize)),
      patternDensity: Math.round(patternDensity),
      primaryColor,
      secondaryColor,
      accentColor,
      antennaeRatio: Math.max(0.3, Math.min(0.8, antennaeRatio)),
      wingspanMm,
      nectarPreferences,
      isWild: false,
      isCaptured: true,
      capturedAt: Date.now(),
      parentIds: [parent1.id, parent2.id],
      childIds: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      pollenSource: plants.length > 0 ? plants[Math.floor(Math.random() * plants.length)].type : undefined
    };

    offspring.push(butterfly);
  }

  return offspring;
};

export const createWildButterfly = (species: ButterflySpecies): FlyingButterfly => {
  const base = BASE_BUTTERFLIES[species];
  const sizeVariation = 0.9 + Math.random() * 0.2;
  const densityVariation = Math.max(0, Math.min(100, base.patternDensity + (Math.random() - 0.5) * 20));

  return {
    id: uuidv4(),
    ...base,
    wingSize: base.wingSize * sizeVariation,
    patternDensity: Math.round(densityVariation),
    wingspanMm: Math.round(base.wingspanMm * sizeVariation),
    isWild: true,
    isCaptured: false,
    parentIds: [],
    childIds: [],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    x: Math.random() * 600,
    y: Math.random() * 500,
    vx: 0,
    vy: 0,
    targetX: Math.random() * 600,
    targetY: Math.random() * 500,
    speed: 0.3 + Math.random() * 0.3,
    isHovering: false,
    hoverEndTime: 0,
    antennaeWiggle: 0,
    wingPhase: Math.random() * Math.PI * 2,
    pathProgress: 0,
    bezierPoints: []
  };
};

export const captureButterfly = (butterfly: FlyingButterfly): Butterfly => {
  const { x, y, vx, vy, targetX, targetY, speed, isHovering, hoverEndTime,
    hoverPlantId, antennaeWiggle, wingPhase, pathProgress, bezierPoints,
    ...butterflyData } = butterfly;
  return {
    ...butterflyData,
    isCaptured: true,
    isWild: false,
    capturedAt: Date.now(),
    lastActiveAt: Date.now()
  };
};

export const releaseButterfly = (butterfly: Butterfly, startX: number, startY: number): FlyingButterfly => {
  return {
    ...butterfly,
    isWild: true,
    isCaptured: false,
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    targetX: Math.random() * 600,
    targetY: Math.random() * 500,
    speed: 0.3 + Math.random() * 0.3,
    isHovering: false,
    hoverEndTime: 0,
    antennaeWiggle: 0,
    wingPhase: Math.random() * Math.PI * 2,
    pathProgress: 0,
    bezierPoints: [],
    lastActiveAt: Date.now()
  };
};

export const generateBezierPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number }[] => {
  const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
  const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 80;
  const cp1x = startX + (midX - startX) * 0.5 + (Math.random() - 0.5) * 60;
  const cp1y = startY + (midY - startY) * 0.5 + (Math.random() - 0.5) * 60;
  const cp2x = endX + (midX - endX) * 0.5 + (Math.random() - 0.5) * 60;
  const cp2y = endY + (midY - endY) * 0.5 + (Math.random() - 0.5) * 60;
  return [
    { x: startX, y: startY },
    { x: cp1x, y: cp1y },
    { x: cp2x, y: cp2y },
    { x: endX, y: endY }
  ];
};

export const getPointOnBezier = (points: { x: number; y: number }[], t: number): { x: number; y: number } => {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };
  if (t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];

  const interpolated: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    interpolated.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t
    });
  }
  return getPointOnBezier(interpolated, t);
};
