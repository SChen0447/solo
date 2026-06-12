export interface ParticleParams {
  count: number;
  sphereRadius: number;
  particleSize: number;
  attractionK: number;
  attractor1: { x: number; y: number; z: number };
  attractor2: { x: number; y: number; z: number };
  hueBase: number;
  saturation: number;
  lightness: number;
  colorCyclePeriod: number;
  enableColorGradient: boolean;
  enableTrail: boolean;
  trailDuration: number;
  rotationSpeed: number;
  sizeByVelocity: boolean;
}

export interface PresetConfig {
  name: string;
  params: Partial<ParticleParams>;
}

export const PRESETS: Record<string, PresetConfig> = {
  galaxy: {
    name: '旋转星系',
    params: {
      attractionK: 2.5,
      attractor1: { x: 5, y: 0, z: 0 },
      attractor2: { x: -5, y: 0, z: 0 },
      hueBase: 200,
      rotationSpeed: 0.005
    }
  },
  helix: {
    name: '双螺旋',
    params: {
      attractionK: 1.8,
      attractor1: { x: 0, y: 6, z: 0 },
      attractor2: { x: 0, y: -6, z: 0 },
      hueBase: 320,
      rotationSpeed: 0.003
    }
  },
  chaos: {
    name: '混沌云',
    params: {
      attractionK: 3.2,
      attractor1: { x: 3, y: 4, z: -2 },
      attractor2: { x: -4, y: -3, z: 3 },
      hueBase: 60,
      rotationSpeed: 0.008
    }
  }
};

export function createDefaultParams(): ParticleParams {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return {
    count: isMobile ? 1500 : 3000,
    sphereRadius: 8,
    particleSize: 0.15,
    attractionK: 0,
    attractor1: { x: 5, y: 0, z: 0 },
    attractor2: { x: -5, y: 0, z: 0 },
    hueBase: 200,
    saturation: 0.8,
    lightness: 0.55,
    colorCyclePeriod: 5,
    enableColorGradient: true,
    enableTrail: false,
    trailDuration: 0.3,
    rotationSpeed: 0.001,
    sizeByVelocity: true
  };
}
