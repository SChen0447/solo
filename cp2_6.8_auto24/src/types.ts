export enum FluidType {
  WATER = 'water',
  OIL = 'oil',
  MAGMA = 'magma',
  STEAM = 'steam',
  FIRE = 'fire'
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: FluidType;
  temperature: number;
  life: number;
  maxLife: number;
  radius: number;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

export interface GridCell {
  particles: number[];
}

export interface FluidProperties {
  density: number;
  viscosity: number;
  baseTemperature: number;
  color: string;
  glowColor: string;
  radius: number;
}

export const FLUID_PROPERTIES: Record<FluidType, FluidProperties> = {
  [FluidType.WATER]: {
    density: 1.0,
    viscosity: 0.98,
    baseTemperature: 25,
    color: '#4fc3f7',
    glowColor: 'rgba(79, 195, 247, 0.6)',
    radius: 4
  },
  [FluidType.OIL]: {
    density: 0.8,
    viscosity: 0.95,
    baseTemperature: 25,
    color: '#ffd54f',
    glowColor: 'rgba(255, 213, 79, 0.6)',
    radius: 4
  },
  [FluidType.MAGMA]: {
    density: 1.2,
    viscosity: 0.99,
    baseTemperature: 800,
    color: '#ff5722',
    glowColor: 'rgba(255, 87, 34, 0.8)',
    radius: 5
  },
  [FluidType.STEAM]: {
    density: 0.01,
    viscosity: 0.9,
    baseTemperature: 100,
    color: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.4)',
    radius: 3
  },
  [FluidType.FIRE]: {
    density: 0.05,
    viscosity: 0.92,
    baseTemperature: 600,
    color: '#ff9800',
    glowColor: 'rgba(255, 152, 0, 0.7)',
    radius: 4
  }
};

export interface PhysicsConfig {
  gravity: number;
  particleCount: number;
  gridSize: number;
  smoothingRadius: number;
  restDensity: number;
  stiffness: number;
  nearStiffness: number;
  heatTransferRate: number;
  evaporationRate: number;
  ignitionTemperature: number;
  trailLength: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 500,
  particleCount: 3000,
  gridSize: 20,
  smoothingRadius: 15,
  restDensity: 1.0,
  stiffness: 200,
  nearStiffness: 50,
  heatTransferRate: 0.5,
  evaporationRate: 0.02,
  ignitionTemperature: 300,
  trailLength: 8
};
