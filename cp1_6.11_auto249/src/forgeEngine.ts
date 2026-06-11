export type OreType = 'red_iron' | 'blue_copper' | 'green_amber';

export interface Ore {
  id: string;
  type: OreType;
  color: string;
  brightColor: string;
  meltTime: number;
  attackBonus: number;
  speedBonus: number;
  critBonus: number;
}

export interface SmeltingOre extends Ore {
  progress: number;
  startTime: number;
  originalSize: number;
  currentSize: number;
}

export interface WeaponBlank {
  attack: number;
  speed: number;
  critRate: number;
  bladeColor: string;
  impurity: number;
}

export const ORE_CONFIGS: Record<OreType, Omit<Ore, 'id'>> = {
  red_iron: {
    type: 'red_iron',
    color: '#b71c1c',
    brightColor: '#ef5350',
    meltTime: 5000,
    attackBonus: 15,
    speedBonus: 0,
    critBonus: 0,
  },
  blue_copper: {
    type: 'blue_copper',
    color: '#1a237e',
    brightColor: '#5c6bc0',
    meltTime: 4000,
    attackBonus: 0,
    speedBonus: 12,
    critBonus: 0,
  },
  green_amber: {
    type: 'green_amber',
    color: '#2e7d32',
    brightColor: '#66bb6a',
    meltTime: 6000,
    attackBonus: 0,
    speedBonus: 0,
    critBonus: 8,
  },
};

export function createOre(type: OreType, id: string): Ore {
  return { id, ...ORE_CONFIGS[type] };
}

export function initializeCart(): Ore[] {
  const ores: Ore[] = [];
  let counter = 0;
  const types: OreType[] = ['red_iron', 'blue_copper', 'green_amber'];
  for (const type of types) {
    for (let i = 0; i < 2; i++) {
      ores.push(createOre(type, `ore-${counter++}`));
    }
  }
  return ores;
}

export function createSmeltingOre(ore: Ore): SmeltingOre {
  return {
    ...ore,
    progress: 0,
    startTime: Date.now(),
    originalSize: 1,
    currentSize: 1,
  };
}

export function updateSmeltingOre(
  ore: SmeltingOre,
  temperature: number,
  now: number
): SmeltingOre {
  const elapsed = now - ore.startTime;
  const tempMultiplier = Math.max(0.2, (temperature - 500) / 1300);
  const effectiveMeltTime = ore.meltTime / tempMultiplier;
  const progress = Math.min(1, elapsed / effectiveMeltTime);
  const currentSize = Math.max(0, 1 - progress);
  return { ...ore, progress, currentSize };
}

export function isOreMelted(ore: SmeltingOre): boolean {
  return ore.progress >= 1;
}

export function calculateImpurity(meltedCount: number, baseImpurity: number): number {
  return Math.min(100, baseImpurity + meltedCount * 20);
}

export function calculateTemperatureFactor(temperature: number): number {
  return (temperature - 500) / 1300;
}

export function mixBladeColor(meltedOres: Ore[]): string {
  if (meltedOres.length === 0) return '#888888';
  const counts: Record<OreType, number> = {
    red_iron: 0,
    blue_copper: 0,
    green_amber: 0,
  };
  meltedOres.forEach((o) => counts[o.type]++);
  const total = meltedOres.length;
  const r = Math.round((counts.red_iron * 183 + counts.blue_copper * 26 + counts.green_amber * 46) / total);
  const g = Math.round((counts.red_iron * 28 + counts.blue_copper * 35 + counts.green_amber * 125) / total);
  const b = Math.round((counts.red_iron * 28 + counts.blue_copper * 126 + counts.green_amber * 50) / total);
  return `rgb(${r},${g},${b})`;
}

export function forgeWeapon(
  meltedOres: Ore[],
  impurity: number,
  temperature: number
): { success: boolean; weapon: WeaponBlank | null } {
  const impurityOverThreshold = impurity > 80;
  if (impurityOverThreshold && Math.random() < 0.5) {
    return { success: false, weapon: null };
  }
  let attack = 10;
  let speed = 5;
  let critRate = 3;
  for (const ore of meltedOres) {
    attack += ore.attackBonus;
    speed += ore.speedBonus;
    critRate += ore.critBonus;
  }
  const tempBonus = calculateTemperatureFactor(temperature);
  attack = Math.round(attack * (1 + tempBonus * 0.3));
  speed = Math.round(speed * (1 + tempBonus * 0.2));
  const impurityPenalty = 1 - impurity / 200;
  attack = Math.round(attack * impurityPenalty);
  speed = Math.round(speed * impurityPenalty);
  critRate = Math.round(critRate * impurityPenalty * 10) / 10;
  const bladeColor = mixBladeColor(meltedOres);
  return {
    success: true,
    weapon: { attack, speed, critRate, bladeColor, impurity },
  };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export function createFireParticle(centerX: number, centerY: number): Particle {
  const size = 3 + Math.random() * 5;
  const vy = -(30 + Math.random() * 30);
  const vx = (Math.random() - 0.5) * 20;
  const life = 1 + Math.random() * 1.5;
  const t = Math.random();
  const r = Math.round(255);
  const g = Math.round(111 + t * (179 - 111));
  const b = Math.round(0 + t * (0));
  return {
    x: centerX + (Math.random() - 0.5) * 80,
    y: centerY + Math.random() * 20,
    vx,
    vy,
    size,
    color: `rgb(${r},${g},${b})`,
    life,
    maxLife: life,
  };
}

export function updateParticle(p: Particle, dt: number): Particle {
  return {
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt,
    life: p.life - dt,
    size: p.size * (1 - dt * 0.3),
  };
}

export function isParticleDead(p: Particle): boolean {
  return p.life <= 0 || p.size < 0.5;
}
