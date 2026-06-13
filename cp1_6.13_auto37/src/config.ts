import * as THREE from 'three';

export type ColorMode = 'default' | 'aurora' | 'lava' | 'ghost';

export interface ColorGradient {
  inner: THREE.Color;
  mid: THREE.Color;
  outer: THREE.Color;
  base: THREE.Color;
}

export interface FlameConfig {
  particleCount: number;
  minParticleCount: number;
  maxParticleCount: number;
  baseHeight: number;
  coneRadius: number;
  particleSizeRange: [number, number];
  trailLength: number;
  physics: {
    upwardForce: number;
    windStrength: number;
    turbulence: number;
    attraction: number;
  };
}

export interface HandLandmarks {
  indexTip: { x: number; y: number; z: number };
  thumbTip: { x: number; y: number; z: number };
  palmCenter: { x: number; y: number; z: number };
  wrist: { x: number; y: number; z: number };
  fingers: Array<{
    tip: { x: number; y: number; z: number };
    base: { x: number; y: number; z: number };
  }>;
}

export interface GestureCommand {
  flameHeight: number;
  intensity: number;
  isBurst: boolean;
  colorModeSwitch: boolean;
  indexTipPosition: { x: number; y: number; z: number } | null;
}

export const DEFAULT_FLAME_CONFIG: FlameConfig = {
  particleCount: 3000,
  minParticleCount: 2000,
  maxParticleCount: 5000,
  baseHeight: 5,
  coneRadius: 1.5,
  particleSizeRange: [0.5, 3],
  trailLength: 4,
  physics: {
    upwardForce: 2.5,
    windStrength: 0.3,
    turbulence: 0.8,
    attraction: 0.15
  }
};

export const COLOR_MODES: Record<ColorMode, { gradient: ColorGradient; name: string }> = {
  default: {
    name: '默认',
    gradient: {
      inner: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xffaa33),
      outer: new THREE.Color(0xff4400),
      base: new THREE.Color(0x881100)
    }
  },
  aurora: {
    name: '极光',
    gradient: {
      inner: new THREE.Color(0x00ffff),
      mid: new THREE.Color(0x9933ff),
      outer: new THREE.Color(0xff66cc),
      base: new THREE.Color(0x33ff66)
    }
  },
  lava: {
    name: '熔岩',
    gradient: {
      inner: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xffff33),
      outer: new THREE.Color(0xff6600),
      base: new THREE.Color(0x661100)
    }
  },
  ghost: {
    name: '鬼火',
    gradient: {
      inner: new THREE.Color(0xccffcc),
      mid: new THREE.Color(0x33ffaa),
      outer: new THREE.Color(0x00cc88),
      base: new THREE.Color(0x004433)
    }
  }
};

export const COLOR_MODE_ORDER: ColorMode[] = ['default', 'aurora', 'lava', 'ghost'];

export const GESTURE_CONFIG = {
  swipeVelocityThreshold: 0.8,
  pinchMinDistance: 0.05,
  pinchMaxDistance: 0.3,
  openHandThreshold: 0.15,
  burstCooldown: 3000,
  modeSwitchCooldown: 2000
};
