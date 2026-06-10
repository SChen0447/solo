import * as THREE from 'three';
import type { EmotionType } from './interaction';

const PARTICLE_COUNT = 800;
const BOUNDARY_RADIUS = 15;
const TRANSITION_DURATION = 2000;

interface EmotionParams {
  color: string;
  speed: number;
  motionType: MotionType;
}

type MotionType =
  | 'expand_rotate'
  | 'sink_gather'
  | 'shake_shrink'
  | 'float_horizontal'
  | 'burst_retract'
  | 'flicker_shrink'
  | 'spiral_reverse'
  | 'heart_pulse';

const EMOTION_PARAMS: Record<EmotionType, EmotionParams> = {
  joy: { color: '#ffd700', speed: 0.5, motionType: 'expand_rotate' },
  sadness: { color: '#4a90d9', speed: 0.2, motionType: 'sink_gather' },
  anger: { color: '#e74c3c', speed: 1.2, motionType: 'shake_shrink' },
  calm: { color: '#2ecc71', speed: 0.1, motionType: 'float_horizontal' },
  surprise: { color: '#e91e63', speed: 1.5, motionType: 'burst_retract' },
  fear: { color: '#8e44ad', speed: 0.6, motionType: 'flicker_shrink' },
  disgust: { color: '#b1c74e', speed: 0.9, motionType: 'spiral_reverse' },
  love: { color: '#ff6b9d', speed: 0.4, motionType: 'heart_pulse' }
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : { r: 1, g: 1, b: 1 };
}

function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  targetVelocity: THREE.Vector3;
  startVelocity: THREE.Vector3;
  randomOffset: number;
  size: number;
  baseOpacity: number;
  heartT: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleData: ParticleData[] = [];
  private currentEmotion: EmotionType;
  private targetEmotion: EmotionType;
  private transitioning: boolean = false;
  private transitionStart: number = 0;
  private startTime: number = 0;
  private currentColor: { r: number; g: number; b: number };
  private targetColor: { r: number; g: number; b: number };
  private startColor: { r: number; g: number; b: number };
  private currentSpeed: number;
  private targetSpeed: number;
  private startSpeed: number;
  private currentMotion: MotionType;
  private targetMotion: MotionType;
  private motionTransitionProgress: number = 0;

  constructor(initialEmotion: EmotionType = 'calm') {
    this.currentEmotion = initialEmotion;
    this.targetEmotion = initialEmotion;

    const params = EMOTION_PARAMS[initialEmotion];
    this.currentColor = hexToRgb(params.color);
    this.targetColor = hexToRgb(params.color);
    this.startColor = hexToRgb(params.color);
    this.currentSpeed = params.speed;
    this.targetSpeed = params.speed;
    this.startSpeed = params.speed;
    this.currentMotion = params.motionType;
    this.targetMotion = params.motionType;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const opacities = new Float32Array(PARTICLE_COUNT);

    const texture = createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: 1,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * BOUNDARY_RADIUS * 0.6;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = this.currentColor.r;
      colors[i * 3 + 1] = this.currentColor.g;
      colors[i * 3 + 2] = this.currentColor.b;

      const size = 3 + Math.random() * 3;
      sizes[i] = size;

      const opacity = 0.8 + Math.random() * 0.2;
      opacities[i] = opacity;

      this.particleData.push({
        basePosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize(),
        targetVelocity: new THREE.Vector3(),
        startVelocity: new THREE.Vector3(),
        randomOffset: Math.random() * Math.PI * 2,
        size,
        baseOpacity: opacity,
        heartT: Math.random() * Math.PI * 2
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.startTime = performance.now();
  }

  public setEmotion(emotion: EmotionType): void {
    if (emotion === this.currentEmotion && !this.transitioning) return;

    const params = EMOTION_PARAMS[emotion];
    this.targetEmotion = emotion;
    this.startColor = { ...this.currentColor };
    this.targetColor = hexToRgb(params.color);
    this.startSpeed = this.currentSpeed;
    this.targetSpeed = params.speed;
    this.targetMotion = params.motionType;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particleData[i].startVelocity.copy(this.particleData[i].velocity);
    }

    this.transitioning = true;
    this.transitionStart = performance.now();
    this.motionTransitionProgress = 0;
  }

  private updateTransition(now: number): void {
    if (!this.transitioning) return;

    const elapsed = now - this.transitionStart;
    const rawT = Math.min(elapsed / TRANSITION_DURATION, 1);
    const t = easeInOutCubic(rawT);

    this.currentColor.r = this.startColor.r + (this.targetColor.r - this.startColor.r) * t;
    this.currentColor.g = this.startColor.g + (this.targetColor.g - this.startColor.g) * t;
    this.currentColor.b = this.startColor.b + (this.targetColor.b - this.startColor.b) * t;
    this.currentSpeed = this.startSpeed + (this.targetSpeed - this.startSpeed) * t;
    this.motionTransitionProgress = t;

    if (rawT >= 1) {
      this.transitioning = false;
      this.currentEmotion = this.targetEmotion;
      this.currentMotion = this.targetMotion;
      this.motionTransitionProgress = 1;
    }
  }

  private getMotionVelocity(
    data: ParticleData,
    pos: THREE.Vector3,
    time: number,
    motionType: MotionType,
    speed: number
  ): THREE.Vector3 {
    const vel = new THREE.Vector3();

    switch (motionType) {
      case 'expand_rotate': {
        const angle = time * speed * 0.3 + data.randomOffset;
        const radialDir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
        if (radialDir.length() < 0.01) radialDir.set(1, 0, 0);
        const tangent = new THREE.Vector3(-radialDir.z, 0, radialDir.x);
        vel.copy(tangent).multiplyScalar(speed);
        vel.y = Math.sin(time * speed + data.randomOffset) * speed * 0.3;
        vel.add(radialDir.clone().multiplyScalar(speed * 0.2));
        break;
      }
      case 'sink_gather': {
        const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, -2, 0), pos);
        const dist = toCenter.length();
        if (dist > 0.01) toCenter.normalize();
        vel.copy(toCenter).multiplyScalar(speed * 0.5);
        vel.y -= speed * 0.8;
        const swirl = new THREE.Vector3(-pos.z, 0, pos.x).normalize().multiplyScalar(speed * 0.2);
        vel.add(swirl);
        break;
      }
      case 'shake_shrink': {
        const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos);
        const dist = toCenter.length();
        if (dist > 0.01) toCenter.normalize();
        vel.copy(toCenter).multiplyScalar(speed * 0.6);
        vel.x += (Math.random() - 0.5) * speed * 2;
        vel.y += (Math.random() - 0.5) * speed * 2;
        vel.z += (Math.random() - 0.5) * speed * 2;
        break;
      }
      case 'float_horizontal': {
        vel.set(
          Math.sin(time * 0.1 + data.randomOffset) * speed,
          Math.sin(time * 0.15 + data.randomOffset * 1.3) * speed * 0.3,
          Math.cos(time * 0.1 + data.randomOffset) * speed
        );
        break;
      }
      case 'burst_retract': {
        const phase = (Math.sin(time * speed * 0.8 + data.randomOffset) + 1) / 2;
        const fromCenter = new THREE.Vector3(pos.x, pos.y, pos.z);
        const dist = fromCenter.length();
        if (dist > 0.01) fromCenter.normalize();
        if (phase > 0.5) {
          vel.copy(fromCenter).multiplyScalar(speed * phase);
        } else {
          const toCenter = fromCenter.clone().negate();
          vel.copy(toCenter).multiplyScalar(speed * (1 - phase));
        }
        vel.y += Math.sin(time * speed + data.randomOffset) * speed * 0.3;
        break;
      }
      case 'flicker_shrink': {
        const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos);
        const dist = toCenter.length();
        if (dist > 0.01) toCenter.normalize();
        vel.copy(toCenter).multiplyScalar(speed * 0.4);
        if (Math.sin(time * 5 + data.randomOffset * 3) > 0.7) {
          vel.x += (Math.random() - 0.5) * speed * 3;
          vel.y += (Math.random() - 0.5) * speed * 3;
          vel.z += (Math.random() - 0.5) * speed * 3;
        }
        if (dist > BOUNDARY_RADIUS * 0.7) {
          vel.multiplyScalar(0.3);
        }
        break;
      }
      case 'spiral_reverse': {
        const angle = time * speed * 0.5 + data.randomOffset;
        const radialDir = new THREE.Vector3(pos.x, 0, pos.z);
        const dist = radialDir.length();
        if (dist > 0.01) radialDir.normalize();
        const tangent = new THREE.Vector3(-radialDir.z, 0, radialDir.x);
        const reverse = data.randomOffset > Math.PI ? 1 : -1;
        vel.copy(tangent).multiplyScalar(speed * reverse);
        vel.y = Math.sin(time * speed * 0.3 + data.randomOffset) * speed * 0.5;
        if (reverse > 0) {
          vel.add(radialDir.clone().multiplyScalar(speed * 0.3));
        } else {
          vel.add(radialDir.clone().multiplyScalar(-speed * 0.2));
        }
        break;
      }
      case 'heart_pulse': {
        data.heartT += speed * 0.02;
        const pulse = (Math.sin(data.heartT) + 1) / 2;
        const ht = (data.heartT % (Math.PI * 2));
        const heartX = 16 * Math.pow(Math.sin(ht), 3);
        const heartY = 13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht);
        const heartPos = new THREE.Vector3(heartX * 0.15, heartY * 0.15, Math.sin(data.randomOffset) * 2);
        const toHeart = new THREE.Vector3().subVectors(heartPos, pos);
        const dist = toHeart.length();
        if (dist > 0.01) toHeart.normalize();
        vel.copy(toHeart).multiplyScalar(speed * (0.5 + pulse * 0.5));
        if (dist < 1) {
          const away = pos.clone().normalize().multiplyScalar(speed * pulse);
          vel.add(away);
        }
        break;
      }
    }

    return vel;
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    const time = (now - this.startTime) / 1000;

    this.updateTransition(now);

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const blendCurrent = this.motionTransitionProgress;
    const blendTarget = this.transitioning ? 1 - this.motionTransitionProgress : 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const ix = i * 3;

      let pos = new THREE.Vector3(positions[ix], positions[ix + 1], positions[ix + 2]);

      let currentVel = this.getMotionVelocity(data, pos, time, this.currentMotion, this.currentSpeed);
      let targetVel = this.getMotionVelocity(data, pos, time, this.targetMotion, this.targetSpeed);

      let velocity: THREE.Vector3;
      if (this.transitioning) {
        velocity = currentVel.multiplyScalar(1 - blendCurrent).add(targetVel.multiplyScalar(blendCurrent));
      } else {
        velocity = currentVel;
      }

      data.velocity.lerp(velocity, 0.05);

      pos.add(data.velocity.clone().multiplyScalar(deltaTime));

      const distFromCenter = pos.length();
      if (distFromCenter > BOUNDARY_RADIUS) {
        const normal = pos.clone().normalize();
        pos.copy(normal.multiplyScalar(BOUNDARY_RADIUS * 0.99));
        const dot = data.velocity.dot(normal);
        if (dot > 0) {
          data.velocity.sub(normal.clone().multiplyScalar(2 * dot));
        }
      }

      positions[ix] = pos.x;
      positions[ix + 1] = pos.y;
      positions[ix + 2] = pos.z;

      let opacityFactor = 1;
      if (this.currentMotion === 'flicker_shrink' || this.targetMotion === 'flicker_shrink') {
        const flicker = Math.sin(time * 4 + data.randomOffset * 2);
        opacityFactor = 0.5 + flicker * 0.5;
      }
      if (this.targetMotion === 'flicker_shrink' && this.transitioning) {
        const targetFlicker = Math.sin(time * 4 + data.randomOffset * 2);
        const targetOpacity = 0.5 + targetFlicker * 0.5;
        opacityFactor = opacityFactor * (1 - blendCurrent) + targetOpacity * blendCurrent;
      }

      colors[ix] = this.currentColor.r;
      colors[ix + 1] = this.currentColor.g;
      colors[ix + 2] = this.currentColor.b;

      this.material.opacity = data.baseOpacity * opacityFactor;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}
