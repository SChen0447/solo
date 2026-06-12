import { ElementType, ParticleType, ReactionRule } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const GRAVITY = 50;
export const AIR_RESISTANCE = 0.98;
export const PARTICLE_BOUNCE = 0.5;

export const PARTICLE_MIN_RADIUS = 4;
export const PARTICLE_MAX_RADIUS = 6;
export const ENERGY_BALL_RADIUS = 7.5;

export const MAX_PARTICLES = 500;
export const ENERGY_BALL_SPEED = 20;

export const FPS = 60;
export const FRAME_TIME = 1000 / FPS;

export const CHAIN_REACTION_THRESHOLD = 3;
export const CHAIN_REACTION_TIMEOUT = 2000;

export const ELEMENT_COLORS: Record<ParticleType, string> = {
  fire: '#ff4444',
  water: '#4488ff',
  earth: '#8b5a2b',
  air: '#88ddff',
  steam: '#ffffff',
  lava: '#ff8800',
  mud: '#5c4033',
  explosion: '#ffaa00',
  ice: 'rgba(136, 204, 255, 0.6)',
  energyBall: '#ffd700',
  shockwave: 'rgba(255, 255, 255, 0.8)'
};

export const ELEMENT_GLOW: Record<ParticleType, string> = {
  fire: 'rgba(255, 68, 68, 0.6)',
  water: 'rgba(68, 136, 255, 0.6)',
  earth: 'rgba(139, 90, 43, 0.6)',
  air: 'rgba(136, 221, 255, 0.6)',
  steam: 'rgba(255, 255, 255, 0.4)',
  lava: 'rgba(255, 136, 0, 0.8)',
  mud: 'rgba(92, 64, 51, 0.4)',
  explosion: 'rgba(255, 170, 0, 0.8)',
  ice: 'rgba(136, 204, 255, 0.5)',
  energyBall: 'rgba(255, 215, 0, 0.8)',
  shockwave: 'rgba(255, 255, 255, 0.6)'
};

export const REACTION_RULES: Record<string, ReactionRule> = {
  'fire+water': { result: 'steam', producesEnergy: true },
  'water+fire': { result: 'steam', producesEnergy: true },
  'fire+earth': { result: 'lava', producesEnergy: true },
  'earth+fire': { result: 'lava', producesEnergy: true },
  'water+earth': { result: 'mud', producesEnergy: true },
  'earth+water': { result: 'mud', producesEnergy: true },
  'air+fire': { 
    result: 'explosion', 
    producesEnergy: true, 
    additionalParticleCount: 5,
    additionalParticleType: 'explosion'
  },
  'fire+air': { 
    result: 'explosion', 
    producesEnergy: true, 
    additionalParticleCount: 5,
    additionalParticleType: 'explosion'
  },
  'air+water': { result: 'ice', producesEnergy: true },
  'water+air': { result: 'ice', producesEnergy: true }
};

export const ELEMENT_LIST: ElementType[] = ['fire', 'water', 'earth', 'air'];

export const SPATIAL_HASH_CELL_SIZE = 20;

export const SHOCKWAVE_MAX_RADIUS = 50;
export const SHOCKWAVE_DURATION = 400;

export const ENERGY_BALL_ROTATION_PERIOD = 500;
export const COLLECT_ANIMATION_DURATION = 300;

export const FREEZE_DURATION = 2000;

export const PARTICLE_LIFETIMES: Partial<Record<ParticleType, number>> = {
  steam: 3000,
  explosion: 1000,
  ice: 5000,
  shockwave: 400
};

export const PARTICLE_MASSES: Record<ParticleType, number> = {
  fire: 1,
  water: 1.5,
  earth: 2,
  air: 0.3,
  steam: 0.2,
  lava: 2.5,
  mud: 3,
  explosion: 0.5,
  ice: 1.5,
  energyBall: 0.5,
  shockwave: 0
};
