import * as THREE from 'three';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonParams {
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  ambientIntensity: number;
  shadowBias: number;
  wallColor: THREE.Color;
  glassReflectivity: number;
  treeColor: THREE.Color;
  skyTopColor: THREE.Color;
  skyBottomColor: THREE.Color;
  cloudDensity: number;
  hasSnow: boolean;
  bloomIntensity: number;
  shadowSoftness: number;
}

const SEASON_DATA: Record<SeasonName, Omit<SeasonParams, 'sunDir' | 'sunColor' | 'wallColor' | 'treeColor' | 'skyTopColor' | 'skyBottomColor'> & {
  sunDir: [number, number, number];
  sunColor: string;
  wallColor: string;
  treeColor: string;
  skyTopColor: string;
  skyBottomColor: string;
}> = {
  spring: {
    sunDir: [0.707, 0.707, 0.707],
    sunColor: '#ffe082',
    ambientIntensity: 0.4,
    shadowBias: -0.0005,
    wallColor: '#f5e6d0',
    glassReflectivity: 0.5,
    treeColor: '#7cb342',
    skyTopColor: '#87ceeb',
    skyBottomColor: '#e0f6ff',
    cloudDensity: 0.3,
    hasSnow: false,
    bloomIntensity: 0.6,
    shadowSoftness: 0.5
  },
  summer: {
    sunDir: [0.0, 0.94, 0.342],
    sunColor: '#fff5d4',
    ambientIntensity: 0.45,
    shadowBias: -0.0003,
    wallColor: '#ffffff',
    glassReflectivity: 0.8,
    treeColor: '#2e7d32',
    skyTopColor: '#1e90ff',
    skyBottomColor: '#87ceeb',
    cloudDensity: 0.05,
    hasSnow: false,
    bloomIntensity: 0.2,
    shadowSoftness: 0.1
  },
  autumn: {
    sunDir: [-0.5, 0.643, 0.58],
    sunColor: '#ffb74d',
    ambientIntensity: 0.3,
    shadowBias: -0.0006,
    wallColor: '#e8dcc8',
    glassReflectivity: 0.45,
    treeColor: '#ff8f00',
    skyTopColor: '#d4a373',
    skyBottomColor: '#f5e6d0',
    cloudDensity: 0.5,
    hasSnow: false,
    bloomIntensity: 0.8,
    shadowSoftness: 0.6
  },
  winter: {
    sunDir: [-0.707, 0.423, 0.566],
    sunColor: '#e0f0ff',
    ambientIntensity: 0.2,
    shadowBias: -0.0008,
    wallColor: '#c8d0e0',
    glassReflectivity: 0.2,
    treeColor: '#795548',
    skyTopColor: '#dcdcdc',
    skyBottomColor: '#f0f0f0',
    cloudDensity: 0.8,
    hasSnow: true,
    bloomIntensity: 1.0,
    shadowSoftness: 0.9
  }
};

export function getSeasonParams(season: SeasonName): SeasonParams {
  const data = SEASON_DATA[season];
  return {
    sunDir: new THREE.Vector3(...data.sunDir).normalize(),
    sunColor: new THREE.Color(data.sunColor),
    ambientIntensity: data.ambientIntensity,
    shadowBias: data.shadowBias,
    wallColor: new THREE.Color(data.wallColor),
    glassReflectivity: data.glassReflectivity,
    treeColor: new THREE.Color(data.treeColor),
    skyTopColor: new THREE.Color(data.skyTopColor),
    skyBottomColor: new THREE.Color(data.skyBottomColor),
    cloudDensity: data.cloudDensity,
    hasSnow: data.hasSnow,
    bloomIntensity: data.bloomIntensity,
    shadowSoftness: data.shadowSoftness
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(out: THREE.Color, a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  out.r = lerp(a.r, b.r, t);
  out.g = lerp(a.g, b.g, t);
  out.b = lerp(a.b, b.b, t);
  return out;
}

function lerpVector3(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.z = lerp(a.z, b.z, t);
  return out.normalize();
}

export function getInterpolatedSeasonParams(t: number, out?: SeasonParams): SeasonParams {
  const clampedT = Math.max(0, Math.min(3, t));
  const seasonIndex = Math.floor(clampedT);
  const localT = clampedT - seasonIndex;

  const seasons: SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];
  const a = SEASON_DATA[seasons[seasonIndex]];
  const b = SEASON_DATA[seasons[Math.min(seasonIndex + 1, 3)]];

  const result = out || {
    sunDir: new THREE.Vector3(),
    sunColor: new THREE.Color(),
    ambientIntensity: 0,
    shadowBias: 0,
    wallColor: new THREE.Color(),
    glassReflectivity: 0,
    treeColor: new THREE.Color(),
    skyTopColor: new THREE.Color(),
    skyBottomColor: new THREE.Color(),
    cloudDensity: 0,
    hasSnow: false,
    bloomIntensity: 0,
    shadowSoftness: 0
  };

  lerpVector3(result.sunDir, new THREE.Vector3(...a.sunDir), new THREE.Vector3(...b.sunDir), localT);
  lerpColor(result.sunColor, new THREE.Color(a.sunColor), new THREE.Color(b.sunColor), localT);
  lerpColor(result.wallColor, new THREE.Color(a.wallColor), new THREE.Color(b.wallColor), localT);
  lerpColor(result.treeColor, new THREE.Color(a.treeColor), new THREE.Color(b.treeColor), localT);
  lerpColor(result.skyTopColor, new THREE.Color(a.skyTopColor), new THREE.Color(b.skyTopColor), localT);
  lerpColor(result.skyBottomColor, new THREE.Color(a.skyBottomColor), new THREE.Color(b.skyBottomColor), localT);

  result.ambientIntensity = lerp(a.ambientIntensity, b.ambientIntensity, localT);
  result.shadowBias = lerp(a.shadowBias, b.shadowBias, localT);
  result.glassReflectivity = lerp(a.glassReflectivity, b.glassReflectivity, localT);
  result.cloudDensity = lerp(a.cloudDensity, b.cloudDensity, localT);
  result.bloomIntensity = lerp(a.bloomIntensity, b.bloomIntensity, localT);
  result.shadowSoftness = lerp(a.shadowSoftness, b.shadowSoftness, localT);
  result.hasSnow = clampedT >= 2.7;

  return result;
}

export const SEASON_META: Record<SeasonName, { name: string; desc: string; color: string }> = {
  spring: { name: '春 — 万物复苏', desc: '嫩绿初绽，暖阳轻抚建筑的轮廓', color: '#7cb342' },
  summer: { name: '夏 — 生机勃发', desc: '浓荫蔽日，湛蓝天空倒映在玻璃幕墙', color: '#2e7d32' },
  autumn: { name: '秋 — 金风送爽', desc: '层林尽染，暖光为建筑镀上金边', color: '#ff8f00' },
  winter: { name: '冬 — 静谧银装', desc: '雪覆枝头，冷冽天光勾勒建筑的线条', color: '#c8d0e0' }
};

export function getSeasonMeta(t: number): { name: string; desc: string; color: string } {
  const seasons: SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];
  const index = Math.round(Math.max(0, Math.min(3, t)));
  return SEASON_META[seasons[index]];
}
