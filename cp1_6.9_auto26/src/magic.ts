import * as THREE from 'three';

export type RuneType = 'fire' | 'ice' | 'lightning' | 'heal' | 'wind' | 'star';
export type ParticleEffectType = 'fire' | 'ice' | 'lightning' | 'heal' | 'wind' | 'star' | 'steam' | 'goldenRain' | 'storm' | 'elemental' | 'ultimate';

export interface Point {
  x: number;
  y: number;
  t: number;
}

export interface RuneDefinition {
  type: RuneType;
  name: string;
  shape: string;
  color: string;
  particles: number;
  effect: ParticleEffectType;
  symbol: string;
}

export interface DrawnRune {
  id: string;
  type: RuneType;
  center: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  createdAt: number;
  scale: number;
  glowPhase: number;
}

export interface HistoryItem {
  timestamp: number;
  runeTypes: RuneType[];
  isCombo: boolean;
  success: boolean;
  effectName: string;
}

export interface Stats {
  totalDrawn: number;
  successfulMatches: number;
  totalReleased: number;
  maxComboLength: number;
}

export const RUNE_DEFINITIONS: Record<RuneType, RuneDefinition> = {
  fire: {
    type: 'fire',
    name: '火焰',
    shape: 'triangle',
    color: '#ff4444',
    particles: 100,
    effect: 'fire',
    symbol: '△'
  },
  ice: {
    type: 'ice',
    name: '冰霜',
    shape: 'hexagon',
    color: '#44aaff',
    particles: 80,
    effect: 'ice',
    symbol: '⬡'
  },
  lightning: {
    type: 'lightning',
    name: '闪电',
    shape: 'lightning',
    color: '#ffdd44',
    particles: 120,
    effect: 'lightning',
    symbol: '⚡'
  },
  heal: {
    type: 'heal',
    name: '治愈',
    shape: 'heart',
    color: '#44ff88',
    particles: 70,
    effect: 'heal',
    symbol: '♡'
  },
  wind: {
    type: 'wind',
    name: '风',
    shape: 'spiral',
    color: '#88ddff',
    particles: 90,
    effect: 'wind',
    symbol: '🌀'
  },
  star: {
    type: 'star',
    name: '星辰',
    shape: 'star',
    color: '#aa44ff',
    particles: 110,
    effect: 'star',
    symbol: '✦'
  }
};

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  effectType: ParticleEffectType;
}

export class ParticlePool {
  pool: ParticleData[] = [];
  maxSize = 800;
  private nextId = 0;

  constructor() {
    for (let i = 0; i < this.maxSize; i++) {
      this.pool.push({
        id: i,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 1,
        life: 0,
        maxLife: 1.5,
        active: false,
        effectType: 'fire'
      });
    }
  }

  acquire(): ParticleData | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.id = this.nextId++;
        return p;
      }
    }
    return null;
  }

  release(p: ParticleData) {
    p.active = false;
  }

  getActive(): ParticleData[] {
    return this.pool.filter(p => p.active);
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.release(p);
        continue;
      }
      const lifeRatio = p.life / p.maxLife;
      switch (p.effectType) {
        case 'fire':
          p.velocity.y += dt * 2;
          p.velocity.multiplyScalar(0.98);
          break;
        case 'ice':
          p.velocity.y -= dt * 0.5;
          p.position.x += Math.sin(p.life * 8) * dt * 0.5;
          break;
        case 'lightning':
          p.position.x += (Math.random() - 0.5) * dt * 10;
          p.position.y += (Math.random() - 0.5) * dt * 10;
          break;
        case 'heal':
          p.velocity.y += dt * 0.5;
          const angle = p.life * 4;
          p.position.x += Math.cos(angle) * dt * 1.5;
          p.position.z += Math.sin(angle) * dt * 1.5;
          break;
        case 'wind':
          const windAngle = (1 - lifeRatio) * Math.PI * 6;
          const windRadius = lifeRatio * 4;
          p.position.x = Math.cos(windAngle) * windRadius;
          p.position.z = Math.sin(windAngle) * windRadius;
          p.position.y += dt * 1.5;
          break;
        case 'star':
          p.velocity.multiplyScalar(0.97);
          break;
        case 'steam':
          p.velocity.y += dt * 1.5;
          p.velocity.multiplyScalar(0.99);
          p.size *= 1.005;
          break;
        case 'goldenRain':
          p.velocity.y -= dt * 3;
          break;
        case 'storm':
          p.velocity.y -= dt * 1;
          p.position.x += Math.sin(p.life * 15 + p.id) * dt * 3;
          break;
        case 'elemental':
        case 'ultimate':
          p.velocity.multiplyScalar(0.98);
          p.velocity.y += dt * 0.3;
          break;
      }
      p.position.addScaledVector(p.velocity, dt);
    }
  }
}

export const particlePool = new ParticlePool();

export interface ComboEffect {
  name: string;
  effect: ParticleEffectType;
  colors: string[];
  particleCount: number;
}

export function getComboEffect(runes: RuneType[]): ComboEffect {
  const sortedKey = [...runes].sort().join('+');

  if (runes.length === 4) {
    return {
      name: '终极魔法',
      effect: 'ultimate',
      colors: runes.map(r => RUNE_DEFINITIONS[r].color),
      particleCount: 600
    };
  }

  if (runes.length === 3) {
    return {
      name: '元素风暴',
      effect: 'elemental',
      colors: runes.map(r => RUNE_DEFINITIONS[r].color),
      particleCount: 500
    };
  }

  if (sortedKey === 'fire+ice') {
    return {
      name: '蒸汽云',
      effect: 'steam',
      colors: ['#ff4444', '#ffffff', '#44aaff'],
      particleCount: 400
    };
  }

  if (sortedKey === 'heal+star') {
    return {
      name: '金光雨',
      effect: 'goldenRain',
      colors: ['#44ff88', '#ffdd44', '#ffffff'],
      particleCount: 350
    };
  }

  if (sortedKey === 'lightning+wind') {
    return {
      name: '雷暴',
      effect: 'storm',
      colors: ['#ffdd44', '#88ddff', '#ffffff'],
      particleCount: 450
    };
  }

  if (runes.length === 2) {
    return {
      name: `${RUNE_DEFINITIONS[runes[0]].name}·${RUNE_DEFINITIONS[runes[1]].name}融合`,
      effect: 'elemental',
      colors: runes.map(r => RUNE_DEFINITIONS[r].color),
      particleCount: 300
    };
  }

  const def = RUNE_DEFINITIONS[runes[0]];
  return {
    name: def.name,
    effect: def.effect,
    colors: [def.color],
    particleCount: def.particles
  };
}

function normalizePoints(points: Point[]): Point[] {
  if (points.length < 2) return points;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const size = Math.max(w, h);
  return points.map(p => ({
    x: (p.x - minX - w / 2) / size + 0.5,
    y: (p.y - minY - h / 2) / size + 0.5,
    t: p.t
  }));
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function isClosed(points: Point[]): boolean {
  if (points.length < 5) return false;
  const first = points[0];
  const last = points[points.length - 1];
  const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
  return dist < 0.25;
}

function countCorners(points: Point[], threshold = Math.PI / 4): number {
  let corners = 0;
  for (let i = 2; i < points.length; i += 2) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 < 0.02 || len2 < 0.02) continue;
    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (angle > threshold) corners++;
  }
  return corners;
}

function getBoundingBoxRatio(points: Point[]): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return w / (h || 1);
}

function hasSharpDirectionChanges(points: Point[]): boolean {
  let changes = 0;
  for (let i = 2; i < points.length; i += 3) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const cross = v1x * v2y - v1y * v2x;
    if (Math.abs(cross) > 0.01) changes++;
  }
  return changes >= 2;
}

function hasCusp(points: Point[]): boolean {
  for (let i = 3; i < points.length - 3; i++) {
    const a = points[i - 3];
    const b = points[i];
    const c = points[i + 3];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 < 0.02 || len2 < 0.02) continue;
    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    if (dot < -0.3) return true;
  }
  return false;
}

function averageRadius(points: Point[]): number {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const rs = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  return rs.reduce((s, r) => s + r, 0) / rs.length;
}

function radiusVariance(points: Point[]): number {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const rs = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avg = rs.reduce((s, r) => s + r, 0) / rs.length;
  if (avg === 0) return 0;
  return Math.sqrt(rs.reduce((s, r) => s + (r - avg) ** 2, 0) / rs.length) / avg;
}

function isSpiral(points: Point[]): boolean {
  if (points.length < 15) return false;
  let angleSum = 0;
  let directionChanges = 0;
  let prevSign = 0;
  for (let i = 2; i < points.length; i++) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const cross = v1x * v2y - v1y * v2x;
    const sign = cross > 0 ? 1 : -1;
    if (prevSign !== 0 && sign !== prevSign) directionChanges++;
    prevSign = sign;
    angleSum += cross;
  }
  const len = pathLength(points);
  return Math.abs(angleSum) > 3 && directionChanges < points.length * 0.1 && len > 1.5;
}

export function matchRune(points: Point[]): RuneType | null {
  if (points.length < 8) return null;

  const normalized = normalizePoints(points);
  const len = pathLength(normalized);
  const closed = isClosed(normalized);
  const corners = countCorners(normalized);
  const ratio = getBoundingBoxRatio(normalized);
  const avgR = averageRadius(normalized);
  const rVar = radiusVariance(normalized);
  const sharp = hasSharpDirectionChanges(normalized);
  const cusp = hasCusp(normalized);
  const spiral = isSpiral(normalized);

  if (spiral) return 'wind';

  if (sharp && !closed && corners <= 3) return 'lightning';

  if (closed) {
    if (cusp && ratio > 0.6 && ratio < 1.4) return 'heal';

    if (corners >= 4 && corners <= 8 && rVar < 0.35) {
      if (corners <= 4) return 'fire';
      return 'ice';
    }

    if (corners >= 8 && rVar > 0.2) return 'star';

    if (rVar < 0.3 && ratio > 0.7 && ratio < 1.4) return 'fire';
  }

  if (!closed) {
    if (corners >= 3 && corners <= 5) return 'fire';
    if (corners >= 2 && ratio > 1.2) return 'lightning';
    if (len > 2.5) return 'wind';
  }

  if (corners >= 8) return 'star';
  if (corners >= 5) return 'ice';
  if (cusp) return 'heal';
  if (ratio < 0.7) return 'star';

  return 'fire';
}

export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

export function interpolateColors(colors: string[], t: number): THREE.Color {
  if (colors.length === 0) return new THREE.Color('#ffffff');
  if (colors.length === 1) return new THREE.Color(colors[0]);
  const scaled = t * (colors.length - 1);
  const idx = Math.min(Math.floor(scaled), colors.length - 2);
  const localT = scaled - idx;
  return lerpColor(new THREE.Color(colors[idx]), new THREE.Color(colors[idx + 1]), localT);
}
