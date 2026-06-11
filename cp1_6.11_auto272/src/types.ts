import * as THREE from 'three';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Island {
  id: string;
  position: Vector3;
  diameter: number;
  rotation: number;
}

export interface Checkpoint {
  id: string;
  position: Vector3;
  index: number;
  passed: boolean;
}

export type AirflowType = 'up' | 'down';

export interface AirflowColumn {
  id: string;
  position: Vector3;
  type: AirflowType;
  height: number;
  radius: number;
}

export interface Vortex {
  id: string;
  position: Vector3;
  createdAt: number;
  duration: number;
  radius: number;
}

export interface Particle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface PlayerState {
  position: Vector3;
  velocity: Vector3;
  pitch: number;
  yaw: number;
  roll: number;
  isInVortex: boolean;
  vortexTimer: number;
  trailColor: string;
}

export interface GameState {
  player: PlayerState;
  islands: Island[];
  checkpoints: Checkpoint[];
  airflows: AirflowColumn[];
  vortexes: Vortex[];
  particles: Particle[];
  currentCheckpoint: number;
  totalCheckpoints: number;
  startTime: number | null;
  elapsedTime: number;
  isFinished: boolean;
  cameraAngle: {
    theta: number;
    phi: number;
    distance: number;
  };
  showFlash: boolean;
  flashColor: string;
  screenShake: boolean;
}

export interface KeyState {
  w: boolean;
  s: boolean;
  a: boolean;
  d: boolean;
}

export const WORLD_CONFIG = {
  WORLD_SIZE: 3000,
  PLAYER_SPEED_BASE: 2,
  PITCH_MIN: -30,
  PITCH_MAX: 30,
  YAW_MIN: -45,
  YAW_MAX: 45,
  LIFT_UP: 2,
  LIFT_DOWN: -1.5,
  GLIDE_DESCENT: 1,
  CHECKPOINT_RADIUS: 30,
  VORTEX_RADIUS: 35,
  CAMERA_PHI_MIN: 20,
  CAMERA_PHI_MAX: 60,
  PARTICLE_COUNT: 200,
};
