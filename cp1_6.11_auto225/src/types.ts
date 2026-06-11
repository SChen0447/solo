export interface Spice {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  description: string;
  baseFlavors: FlavorValues;
}

export interface FlavorValues {
  spicy: number;
  sweet: number;
  warm: number;
  woody: number;
  floral: number;
  herbaceous: number;
}

export interface Recipe {
  id: string;
  name: string;
  spiceId: string;
  grindDuration: number;
  grindSpeed: number;
  flavorValues: FlavorValues;
  createdAt: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  level: number;
}

export interface AromaMolecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

export interface DustParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}
