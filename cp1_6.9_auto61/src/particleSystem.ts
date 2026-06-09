import * as THREE from 'three';
import type { GestureData } from './gestureTracker';
import type { AudioData } from './audioAnalyzer';

export interface ParticleSystemState {
  positionArray: Float32Array;
  colorArray: Float32Array;
  sizeArray: Float32Array;
  activeCount: number;
  rotationY: number;
  glowPositions: Array<{ x: number; y: number; z: number; active: boolean }>;
}

type ColorBand = 'bass' | 'mid' | 'high';

const MAX_PARTICLES = 10000;
const MIN_PARTICLES = 2000;
const SPHERE_RADIUS = 10;
const PARTICLE_CHANGE_RATE = 200;
const SHRINK_DURATION = 2;
const MAX_ANGULAR_VELOCITY = 0.5;
const WRIST_ANGLE_THRESHOLD = 30;
const FLASH_DURATION = 0.3;
const ENERGY_THRESHOLD = 0.5;

export class ParticleSystem {
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private colorBands: ColorBand[];
  private baseColors: Float32Array;
  private flashTimers: Float32Array;

  private activeCount = MAX_PARTICLES;
  private targetCount = MAX_PARTICLES;

  private rotationY = 0;
  private targetRotationVelocity = 0;
  private currentRotationVelocity = 0;

  private shrinkFactor = 1;
  private targetShrinkFactor = 1;
  private shrinkTransitionSpeed = 0;

  private baseSize = 2;

  private lastWristAngle: number | undefined;

  constructor() {
    this.basePositions = new Float32Array(MAX_PARTICLES * 3);
    this.currentPositions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.colorBands = new Array(MAX_PARTICLES);
    this.baseColors = new Float32Array(MAX_PARTICLES * 3);
    this.flashTimers = new Float32Array(MAX_PARTICLES);

    this.initializeParticles();
  }

  private initializeParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * (SPHERE_RADIUS * 0.9);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.currentPositions[i * 3] = x;
      this.currentPositions[i * 3 + 1] = y;
      this.currentPositions[i * 3 + 2] = z;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      const band = Math.random();
      if (band < 0.33) {
        this.colorBands[i] = 'bass';
        const t = Math.random();
        this.baseColors[i * 3] = 1;
        this.baseColors[i * 3 + 1] = t * 0.5;
        this.baseColors[i * 3 + 2] = t * 0.5;
      } else if (band < 0.66) {
        this.colorBands[i] = 'mid';
        const t = Math.random();
        this.baseColors[i * 3] = t * 0.5;
        this.baseColors[i * 3 + 1] = 1;
        this.baseColors[i * 3 + 2] = t * 0.5;
      } else {
        this.colorBands[i] = 'high';
        const t = Math.random();
        this.baseColors[i * 3] = t * 0.5;
        this.baseColors[i * 3 + 1] = t * 0.5;
        this.baseColors[i * 3 + 2] = 1;
      }

      this.colors[i * 3] = this.baseColors[i * 3];
      this.colors[i * 3 + 1] = this.baseColors[i * 3 + 1];
      this.colors[i * 3 + 2] = this.baseColors[i * 3 + 2];

      this.sizes[i] = this.baseSize;
      this.flashTimers[i] = 0;
    }
  }

  update(dt: number, gesture: GestureData, audio: AudioData): ParticleSystemState {
    this.updateParticleCount(dt, gesture);
    this.updateRotation(dt, gesture);
    this.updateShrink(dt, gesture);
    this.updateParticlePositions(dt);
    this.updateParticleColorsAndSizes(audio, dt);

    const glowPositions = this.computeGlowPositions(gesture);

    return {
      positionArray: this.currentPositions,
      colorArray: this.colors,
      sizeArray: this.sizes,
      activeCount: this.activeCount,
      rotationY: this.rotationY,
      glowPositions
    };
  }

  private updateParticleCount(dt: number, gesture: GestureData): void {
    if (gesture.handsDetected === 2 && gesture.handsDistance !== undefined) {
      if (gesture.handsDistance < 50) {
        this.targetCount = MIN_PARTICLES;
        this.baseSize = 5;
      } else if (gesture.handsDistance > 200) {
        this.targetCount = MAX_PARTICLES;
        this.baseSize = 2;
      }
    }

    const delta = PARTICLE_CHANGE_RATE * dt;
    if (this.activeCount < this.targetCount) {
      this.activeCount = Math.min(this.targetCount, Math.floor(this.activeCount + delta));
    } else if (this.activeCount > this.targetCount) {
      this.activeCount = Math.max(this.targetCount, Math.floor(this.activeCount - delta));
    }
  }

  private updateRotation(dt: number, gesture: GestureData): void {
    this.targetRotationVelocity = 0;

    if (gesture.handsDetected >= 1) {
      const angle = gesture.wristAngles[0];
      const speed = gesture.palmSpeeds[0];

      if (angle !== undefined && speed !== undefined) {
        if (this.lastWristAngle !== undefined) {
          const angleDiff = angle - this.lastWristAngle;
          if (Math.abs(angleDiff) > WRIST_ANGLE_THRESHOLD * 0.1) {
            const normalizedSpeed = Math.min(1, speed / 2);
            const direction = angleDiff > 0 ? 1 : -1;
            if (Math.abs(angleDiff) > 0.5) {
              this.targetRotationVelocity = direction * normalizedSpeed * MAX_ANGULAR_VELOCITY;
            }
          }
        }
        this.lastWristAngle = angle;
      }
    } else {
      this.lastWristAngle = undefined;
    }

    const lerpFactor = 1 - Math.exp(-dt * 5);
    this.currentRotationVelocity += (this.targetRotationVelocity - this.currentRotationVelocity) * lerpFactor;
    this.rotationY += this.currentRotationVelocity * dt;
  }

  private updateShrink(dt: number, gesture: GestureData): void {
    let anyFist = false;
    let anyOpen = false;

    for (let i = 0; i < gesture.handsDetected; i++) {
      if (gesture.isFist[i] === true) anyFist = true;
      if (gesture.isFist[i] === false) anyOpen = true;
    }

    if (anyFist && !anyOpen) {
      this.targetShrinkFactor = 0.2;
      this.shrinkTransitionSpeed = (1 - 0.2) / SHRINK_DURATION;
    } else if (anyOpen && !anyFist) {
      this.targetShrinkFactor = 1;
      this.shrinkTransitionSpeed = (1 - 0.2) / SHRINK_DURATION;
    }

    if (this.shrinkFactor < this.targetShrinkFactor) {
      this.shrinkFactor = Math.min(this.targetShrinkFactor, this.shrinkFactor + this.shrinkTransitionSpeed * dt);
    } else if (this.shrinkFactor > this.targetShrinkFactor) {
      this.shrinkFactor = Math.max(this.targetShrinkFactor, this.shrinkFactor - this.shrinkTransitionSpeed * dt);
    }
  }

  private updateParticlePositions(dt: number): void {
    const cosR = Math.cos(this.rotationY);
    const sinR = Math.sin(this.rotationY);

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3;

      let bx = this.basePositions[i3];
      let by = this.basePositions[i3 + 1];
      let bz = this.basePositions[i3 + 2];

      const rx = bx * cosR - bz * sinR;
      const rz = bx * sinR + bz * cosR;
      bx = rx;
      bz = rz;

      bx *= this.shrinkFactor;
      by *= this.shrinkFactor;
      bz *= this.shrinkFactor;

      this.velocities[i3] += (Math.random() - 0.5) * 0.002;
      this.velocities[i3 + 1] += (Math.random() - 0.5) * 0.002;
      this.velocities[i3 + 2] += (Math.random() - 0.5) * 0.002;

      this.velocities[i3] *= 0.98;
      this.velocities[i3 + 1] *= 0.98;
      this.velocities[i3 + 2] *= 0.98;

      let px = bx + this.velocities[i3];
      let py = by + this.velocities[i3 + 1];
      let pz = bz + this.velocities[i3 + 2];

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      if (dist > SPHERE_RADIUS * 0.95) {
        const nx = px / dist;
        const ny = py / dist;
        const nz = pz / dist;
        const dot = this.velocities[i3] * nx + this.velocities[i3 + 1] * ny + this.velocities[i3 + 2] * nz;
        this.velocities[i3] -= 2 * dot * nx;
        this.velocities[i3 + 1] -= 2 * dot * ny;
        this.velocities[i3 + 2] -= 2 * dot * nz;

        const s = (SPHERE_RADIUS * 0.95) / dist;
        px *= s;
        py *= s;
        pz *= s;

        this.flashTimers[i] = FLASH_DURATION;
      }

      this.currentPositions[i3] = px;
      this.currentPositions[i3 + 1] = py;
      this.currentPositions[i3 + 2] = pz;

      if (this.flashTimers[i] > 0) {
        this.flashTimers[i] -= dt;
      }
    }
  }

  private updateParticleColorsAndSizes(audio: AudioData, dt: number): void {
    const bassTrigger = audio.bassEnergy > ENERGY_THRESHOLD;
    const midTrigger = audio.midEnergy > ENERGY_THRESHOLD;
    const highTrigger = audio.highEnergy > ENERGY_THRESHOLD;

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3;
      const band = this.colorBands[i];
      let triggered = false;

      if (band === 'bass' && bassTrigger) triggered = true;
      if (band === 'mid' && midTrigger) triggered = true;
      if (band === 'high' && highTrigger) triggered = true;

      const baseR = this.baseColors[i3];
      const baseG = this.baseColors[i3 + 1];
      const baseB = this.baseColors[i3 + 2];

      let size = this.baseSize;
      let r = baseR;
      let g = baseG;
      let b = baseB;

      if (triggered) {
        const boost = 1.5;
        r = Math.min(1, baseR * boost);
        g = Math.min(1, baseG * boost);
        b = Math.min(1, baseB * boost);
        size = 6;
      }

      if (this.flashTimers[i] > 0) {
        const flashIntensity = 1 + 0.5 * (this.flashTimers[i] / FLASH_DURATION);
        r = Math.min(1, r * flashIntensity);
        g = Math.min(1, g * flashIntensity);
        b = Math.min(1, b * flashIntensity);
      }

      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;
      this.sizes[i] = size;
    }
  }

  private computeGlowPositions(gesture: GestureData): Array<{ x: number; y: number; z: number; active: boolean }> {
    const result: Array<{ x: number; y: number; z: number; active: boolean }> = [];

    for (let i = 0; i < 2; i++) {
      if (i < gesture.handsDetected && gesture.handPositions[i]) {
        const pos = gesture.handPositions[i];
        const x = (pos.x - 0.5) * 2 * SPHERE_RADIUS;
        const y = -(pos.y - 0.5) * 2 * SPHERE_RADIUS;
        const z = (pos.z - 0.5) * 2 * SPHERE_RADIUS;

        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > SPHERE_RADIUS * 0.5) {
          const s = SPHERE_RADIUS / Math.max(dist, 0.001);
          result.push({ x: x * s, y: y * s, z: z * s, active: true });
        } else {
          result.push({ x, y, z, active: true });
        }
      } else {
        result.push({ x: 0, y: 0, z: 0, active: false });
      }
    }

    return result;
  }
}
