import * as THREE from 'three';
import { GestureType } from './handTracker';
import { PARTICLE_COUNT, SPHERE_RADIUS } from './starGenerator';

export interface ParticleControllerState {
  gesture: GestureType;
  handOpenness: number;
}

const EASING_FACTOR = 0.1;
const FORWARD_SPEED = 2;
const BACKWARD_SPEED = 1.5;
const ROTATION_ANGLE = (15 * Math.PI) / 180;
const HUE_STEP = 0.05;

export class ParticleController {
  private camera: THREE.PerspectiveCamera;
  private colors: Float32Array;
  private originalColors: Float32Array;
  private distances: Float32Array;
  private targetHue: number = 0;
  private currentHue: number = 0;
  private targetRotation: number = 0;
  private currentRotation: number = 0;
  private targetForward: number = 0;
  private currentForward: number = 0;
  private swipeCooldown: number = 0;
  private readonly SWIPE_COOLDOWN_MS = 800;

  constructor(
    camera: THREE.PerspectiveCamera,
    colors: Float32Array,
    originalColors: Float32Array,
    distances: Float32Array
  ) {
    this.camera = camera;
    this.colors = colors;
    this.originalColors = originalColors;
    this.distances = distances;
  }

  update(state: ParticleControllerState, deltaMs: number): void {
    const factor = deltaMs / 16.67;

    if (this.swipeCooldown > 0) {
      this.swipeCooldown -= deltaMs;
    }

    switch (state.gesture) {
      case 'fist':
        this.targetForward = FORWARD_SPEED * factor;
        break;
      case 'open':
        this.targetForward = -BACKWARD_SPEED * factor;
        break;
      default:
        this.targetForward = 0;
        break;
    }

    if (state.gesture === 'swipe_left' && this.swipeCooldown <= 0) {
      this.targetRotation += ROTATION_ANGLE;
      this.swipeCooldown = this.SWIPE_COOLDOWN_MS;
    } else if (state.gesture === 'swipe_right' && this.swipeCooldown <= 0) {
      this.targetRotation -= ROTATION_ANGLE;
      this.swipeCooldown = this.SWIPE_COOLDOWN_MS;
    }

    this.currentForward += (this.targetForward - this.currentForward) * EASING_FACTOR;
    if (Math.abs(this.currentForward) > 0.001) {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, this.currentForward);
    }

    this.currentRotation += (this.targetRotation - this.currentRotation) * EASING_FACTOR;
    if (Math.abs(this.targetRotation - this.currentRotation) < 0.001) {
      this.currentRotation = this.targetRotation;
    }
    this.camera.rotation.y = this.currentRotation;

    if (state.handOpenness > 0) {
      const normalizedOpenness = (state.handOpenness - 10) / 90;
      this.targetHue = normalizedOpenness;
    }

    const hueDiff = this.targetHue - this.currentHue;
    if (Math.abs(hueDiff) > 0.001) {
      this.currentHue += hueDiff * HUE_STEP;
      this.updateParticleColors();
    }
  }

  private updateParticleColors(): void {
    const hueOffset = this.currentHue;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const distance = this.distances[i];
      const normalizedDist = distance / SPHERE_RADIUS;
      const alpha = 1.0 - 0.6 * normalizedDist;

      const r = this.originalColors[i3];
      const g = this.originalColors[i3 + 1];
      const b = this.originalColors[i3 + 2];

      const hsv = rgbToHsv(r, g, b);
      const newHue = (hsv.h + hueOffset) % 1;
      const rgb = hsvToRgb(newHue, hsv.s, hsv.v);

      this.colors[i3] = rgb.r * alpha;
      this.colors[i3 + 1] = rgb.g * alpha;
      this.colors[i3 + 2] = rgb.b * alpha;
    }
  }

  getCurrentHue(): number {
    return this.currentHue;
  }
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return { r, g, b };
}
