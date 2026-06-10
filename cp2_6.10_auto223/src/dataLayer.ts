/**
 * 数据层 - 管理海洋分层数据
 * 负责生成和提供从海平面0米到深渊层11000米的海洋数据
 * 被 scene.ts 调用，接收深度参数，返回可视化数据
 */

export interface DepthDataPoint {
  depth: number;
  lightIntensity: number;
  soundSpeed: number;
  temperature: number;
  particleCount: number;
  particleColor: string;
  species: SpeciesInfo;
}

export interface SpeciesInfo {
  name: string;
  icon: string;
  sizeRange: string;
  depthRange: string;
}

export interface ParticleData {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  brightness: number;
  species: SpeciesInfo;
  depth: number;
  isHydrothermal?: boolean;
}

export interface VisualizationData {
  depthData: DepthDataPoint;
  particles: ParticleData[];
  soundSpeedProfile: number[];
}

const MAX_DEPTH = 11000;
const STEP = 200;
const HYDROTHERMAL_DEPTH = 2500;

const speciesDatabase: SpeciesInfo[] = [
  { name: '浮游植物', icon: '🌿', sizeRange: '0.002-0.2 mm', depthRange: '0-200米' },
  { name: '水母', icon: '🎐', sizeRange: '1-30 cm', depthRange: '0-500米' },
  { name: '金枪鱼', icon: '🐟', sizeRange: '1-3 m', depthRange: '0-400米' },
  { name: '海豚', icon: '🐬', sizeRange: '1.5-4 m', depthRange: '0-300米' },
  { name: '海龟', icon: '🐢', sizeRange: '0.6-1.5 m', depthRange: '0-600米' },
  { name: '磷虾', icon: '🦐', sizeRange: '1-6 cm', depthRange: '100-1000米' },
  { name: '管水母', icon: '🎐', sizeRange: '10-50 m', depthRange: '200-1000米' },
  { name: '大王乌贼', icon: '🦑', sizeRange: '6-13 m', depthRange: '300-1000米' },
  { name: '鮟鱇鱼', icon: '🐡', sizeRange: '0.2-1 m', depthRange: '1000-4000米' },
  { name: '深海虾', icon: '🦐', sizeRange: '2-10 cm', depthRange: '1000-5000米' },
  { name: '管虫', icon: '🌺', sizeRange: '1-2 m', depthRange: '2000-4000米' },
  { name: '热液蛤', icon: '🐚', sizeRange: '10-30 cm', depthRange: '2000-3500米' },
  { name: '盲鱼', icon: '🐠', sizeRange: '5-20 cm', depthRange: '3000-6000米' },
  { name: '海猪', icon: '🐖', sizeRange: '5-15 cm', depthRange: '4000-7000米' },
  { name: '片脚类', icon: '🦀', sizeRange: '1-10 cm', depthRange: '5000-9000米' },
  { name: '深海海参', icon: '🪸', sizeRange: '10-50 cm', depthRange: '6000-11000米' },
  { name: '端足类', icon: '🦐', sizeRange: '2-8 cm', depthRange: '8000-11000米' },
];

function getSpeciesForDepth(depth: number): SpeciesInfo {
  if (depth <= 200) return speciesDatabase[Math.floor(Math.random() * 5)];
  if (depth <= 1000) return speciesDatabase[5 + Math.floor(Math.random() * 3)];
  if (depth <= 2500) return speciesDatabase[8];
  if (depth <= 4000) return speciesDatabase[8 + Math.floor(Math.random() * 3)];
  if (depth <= 6000) return speciesDatabase[11 + Math.floor(Math.random() * 2)];
  if (depth <= 9000) return speciesDatabase[13 + Math.floor(Math.random() * 2)];
  return speciesDatabase[15 + Math.floor(Math.random() * 2)];
}

function calculateLightIntensity(depth: number): number {
  if (depth <= 0) return 1.0;
  if (depth >= 1000) return 0.0001;
  return Math.pow(0.5, depth / 50);
}

function calculateSoundSpeed(depth: number): number {
  if (depth <= 0) return 1500;
  if (depth <= 1000) return 1500 - (depth / 1000) * 20;
  if (depth <= 4000) return 1480 + ((depth - 1000) / 3000) * 5;
  return 1485 + ((depth - 4000) / 7000) * 3;
}

function calculateTemperature(depth: number): number {
  if (depth <= 0) return 22.0;
  if (depth <= 200) return 22.0 - (depth / 200) * 14;
  if (depth <= 1000) return 8.0 - ((depth - 200) / 800) * 6;
  if (depth <= 4000) return 2.0 - ((depth - 1000) / 3000) * 1;
  return 1.0 - ((depth - 4000) / 7000) * 0.5;
}

function getParticleCount(depth: number): number {
  if (depth <= 100) return 15;
  if (depth <= 500) return 10;
  if (depth <= 1000) return 6;
  if (depth <= 2000) return 4;
  if (depth <= 4000) return 3;
  return 2;
}

function getParticleColor(depth: number): string {
  const shallowColor = { r: 0, g: 255, b: 136 };
  const deepColor = { r: 255, g: 102, b: 0 };
  const t = Math.min(depth / 4000, 1);
  const r = Math.round(shallowColor.r + (deepColor.r - shallowColor.r) * t);
  const g = Math.round(shallowColor.g + (deepColor.g - shallowColor.g) * t);
  const b = Math.round(shallowColor.b + (deepColor.b - shallowColor.b) * t);
  return `rgb(${r},${g},${b})`;
}

function getParticleSize(depth: number): number {
  const baseSize = 0.05 + Math.random() * 0.15;
  const depthFactor = Math.max(0.5, 1 - depth / 6000);
  return baseSize * depthFactor;
}

export class DataLayer {
  private depthDataMap: Map<number, DepthDataPoint> = new Map();
  private particleIdCounter = 0;

  constructor() {
    this.generateDepthProfile();
  }

  private generateDepthProfile(): void {
    for (let depth = 0; depth <= MAX_DEPTH; depth += STEP) {
      const dataPoint: DepthDataPoint = {
        depth,
        lightIntensity: calculateLightIntensity(depth),
        soundSpeed: calculateSoundSpeed(depth),
        temperature: calculateTemperature(depth),
        particleCount: getParticleCount(depth),
        particleColor: getParticleColor(depth),
        species: getSpeciesForDepth(depth),
      };
      this.depthDataMap.set(depth, dataPoint);
    }
  }

  public getDepthData(depth: number): DepthDataPoint {
    const roundedDepth = Math.round(depth / STEP) * STEP;
    const clampedDepth = Math.max(0, Math.min(MAX_DEPTH, roundedDepth));
    const data = this.depthDataMap.get(clampedDepth);
    if (data) return data;
    return this.depthDataMap.get(0)!;
  }

  public getSoundSpeedProfile(): number[] {
    const profile: number[] = [];
    for (let depth = 0; depth <= MAX_DEPTH; depth += STEP) {
      profile.push(calculateSoundSpeed(depth));
    }
    return profile;
  }

  public generateParticlesForDepthRange(
    centerDepth: number,
    range: number = 1000
  ): ParticleData[] {
    const particles: ParticleData[] = [];
    const minDepth = Math.max(0, centerDepth - range / 2);
    const maxDepth = Math.min(MAX_DEPTH, centerDepth + range / 2);

    for (let depth = minDepth; depth <= maxDepth; depth += STEP) {
      const depthData = this.getDepthData(depth);
      const count = depthData.particleCount;

      for (let i = 0; i < count; i++) {
        if (this.particleIdCounter >= 3000) break;
        particles.push({
          id: this.particleIdCounter++,
          x: (Math.random() - 0.5) * 5.5,
          y: this.depthToY(depth) + (Math.random() - 0.5) * 0.3,
          z: (Math.random() - 0.5) * 2,
          color: depthData.particleColor,
          size: getParticleSize(depth),
          brightness: Math.max(0.2, 1 - depth / 2000),
          species: getSpeciesForDepth(depth),
          depth,
        });
      }
    }

    if (
      minDepth <= HYDROTHERMAL_DEPTH &&
      maxDepth >= HYDROTHERMAL_DEPTH &&
      this.particleIdCounter < 2950
    ) {
      for (let i = 0; i < 50; i++) {
        if (this.particleIdCounter >= 3000) break;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.8;
        particles.push({
          id: this.particleIdCounter++,
          x: Math.cos(angle) * radius,
          y: this.depthToY(HYDROTHERMAL_DEPTH) + Math.random() * 0.5,
          z: Math.sin(angle) * radius,
          color: 'rgb(255,140,0)',
          size: 0.08 + Math.random() * 0.08,
          brightness: 1.2,
          species: {
            name: '热液微生物',
            icon: '🔥',
            sizeRange: '0.001-0.1 mm',
            depthRange: '2500米热液喷口',
          },
          depth: HYDROTHERMAL_DEPTH,
          isHydrothermal: true,
        });
      }
    }

    return particles;
  }

  public depthToY(depth: number): number {
    return 6 - (depth / MAX_DEPTH) * 12;
  }

  public yToDepth(y: number): number {
    return ((6 - y) / 12) * MAX_DEPTH;
  }

  public getMaxDepth(): number {
    return MAX_DEPTH;
  }
}
