export enum MaterialType {
  SAND = 'sand',
  WATER = 'water',
  STONE = 'stone'
}

export interface ParticleData {
  x: number;
  y: number;
  material: MaterialType;
  updated: boolean;
  createdAt: number;
}

const MATERIAL_COLORS: Record<MaterialType, string> = {
  [MaterialType.SAND]: '#d4a373',
  [MaterialType.WATER]: '#84a98c',
  [MaterialType.STONE]: '#6c757d'
};

export function getMaterialColor(material: MaterialType): string {
  return MATERIAL_COLORS[material];
}

export function isMaterialStatic(material: MaterialType): boolean {
  return material === MaterialType.STONE;
}

export function createParticle(
  x: number,
  y: number,
  material: MaterialType
): ParticleData {
  return {
    x,
    y,
    material,
    updated: false,
    createdAt: performance.now()
  };
}

export function getSpreadProgress(particle: ParticleData, now: number): number {
  const elapsed = now - particle.createdAt;
  return Math.min(1, elapsed / 100);
}
