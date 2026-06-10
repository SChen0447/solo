import * as THREE from 'three';
import type { AudioFrequencyData } from './audioAnalyzer';
import type { HandData, HandPoint } from './handTracker';

export type MotionMode = 1 | 2 | 3;

interface ParticleState {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  baseHue: number;
  trail: THREE.Vector3[];
}

const PARTICLE_COUNT = 2000;
const SPHERE_RADIUS = 80;
const PALM_REPEL_RADIUS = 50;
const FINGER_ATTRACTION_RADIUS = 40;
const TRAIL_LENGTH = 5;
const RECOVERY_SPEED = 0.02;
const AUTO_ROTATE_SPEED = 0.002;

export class ParticleSystem {
  public group: THREE.Group;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private states: ParticleState[];
  private trails: THREE.Line[];
  private trailGroup: THREE.Group;

  private time: number = 0;
  private motionMode: MotionMode = 1;

  private handData: HandData = {
    detected: false,
    palm: { x: 0, y: 0, z: 0 },
    fingertips: []
  };
  private audioData: AudioFrequencyData = {
    low: 0,
    mid: 0,
    high: 0
  };

  private camera: THREE.PerspectiveCamera;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.trailGroup = new THREE.Group();
    this.group.add(this.trailGroup);

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.states = [];
    this.trails = [];

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.group.add(this.particles);

    this.setupInteraction();
  }

  private initializeParticles(): void {
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPHERE_RADIUS * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const basePos = new THREE.Vector3(x, y, z);
      let hue = 160 + Math.random() * 140;
      if (Math.random() < 0.05) hue = 300 + Math.random() * 20;
      if (Math.random() < 0.05) hue = 170 + Math.random() * 20;

      this.states.push({
        basePosition: basePos.clone(),
        currentPosition: basePos.clone(),
        velocity: new THREE.Vector3(),
        baseHue: hue,
        trail: []
      });

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      color.setHSL(hue / 360, 0.8, 0.6);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.createTrailForParticle(i);
    }
  }

  private createTrailForParticle(index: number): void {
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    const trailColors = new Float32Array(TRAIL_LENGTH * 3);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const state = this.states[index];
      trailPositions[i * 3] = state.currentPosition.x;
      trailPositions[i * 3 + 1] = state.currentPosition.y;
      trailPositions[i * 3 + 2] = state.currentPosition.z;
      const t = i / (TRAIL_LENGTH - 1);
      trailColors[i * 3] = this.colors[index * 3] * (1 - t);
      trailColors[i * 3 + 1] = this.colors[index * 3 + 1] * (1 - t);
      trailColors[i * 3 + 2] = this.colors[index * 3 + 2] * (1 - t);
    }
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(trailGeometry, trailMaterial);
    this.trails.push(line);
    this.trailGroup.add(line);
  }

  setHandData(data: HandData): void {
    this.handData = data;
  }

  setAudioData(data: AudioFrequencyData): void {
    this.audioData = data;
  }

  setMotionMode(mode: MotionMode): void {
    this.motionMode = mode;
  }

  reset(): void {
    const color = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.states[i];
      state.currentPosition.copy(state.basePosition);
      state.velocity.set(0, 0, 0);
      state.trail = [];

      this.positions[i * 3] = state.basePosition.x;
      this.positions[i * 3 + 1] = state.basePosition.y;
      this.positions[i * 3 + 2] = state.basePosition.z;

      color.setHSL(state.baseHue / 360, 0.8, 0.6);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private setupInteraction(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouseX;
      const dy = e.clientY - this.previousMouseY;
      this.targetRotationY += dx * 0.005;
      this.targetRotationX += dy * 0.005;
      this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoom = e.deltaY > 0 ? 1.1 : 0.9;
      const newZ = this.camera.position.z * zoom;
      this.camera.position.z = Math.max(100, Math.min(600, newZ));
    }, { passive: false });
  }

  private handToWorld(handPoint: HandPoint): THREE.Vector3 {
    const x = (handPoint.x - 0.5) * 200;
    const y = (handPoint.y - 0.5) * 200;
    const z = handPoint.z * 100;
    return new THREE.Vector3(x, y, z);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    const color = new THREE.Color();

    const speedMultiplier = this.motionMode === 3 ? 3 : 1;
    const breathingScale = this.motionMode === 2 ? 1 + Math.sin(this.time * 2) * 0.3 : 1;

    const palmWorld = this.handData.detected ? this.handToWorld(this.handData.palm) : null;
    const fingertipWorlds = this.handData.fingertips.map((f) => this.handToWorld(f));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.states[i];

      const toBase = new THREE.Vector3().subVectors(state.basePosition, state.currentPosition);
      state.velocity.add(toBase.multiplyScalar(RECOVERY_SPEED * speedMultiplier));

      const radialDir = state.currentPosition.clone().normalize();
      const radialForce = this.audioData.low * 60 * speedMultiplier * breathingScale;
      state.velocity.add(radialDir.multiplyScalar(radialForce));

      const waveForce = Math.sin(this.time * 3 + state.basePosition.y * 0.05) * this.audioData.mid * 20 * speedMultiplier;
      state.velocity.y += waveForce;

      if (palmWorld) {
        const toPalm = new THREE.Vector3().subVectors(state.currentPosition, palmWorld);
        const distToPalm = toPalm.length();
        if (distToPalm < PALM_REPEL_RADIUS) {
          const strength = (1 - distToPalm / PALM_REPEL_RADIUS) * 150 * speedMultiplier;
          state.velocity.add(toPalm.normalize().multiplyScalar(strength));
        }
      }

      for (const ft of fingertipWorlds) {
        const toFinger = new THREE.Vector3().subVectors(ft, state.currentPosition);
        const distToFinger = toFinger.length();
        if (distToFinger < FINGER_ATTRACTION_RADIUS) {
          const strength = (1 - distToFinger / FINGER_ATTRACTION_RADIUS) * 100 * speedMultiplier;
          const pullDir = toFinger.normalize();
          const tangent = new THREE.Vector3(-pullDir.y, pullDir.x, pullDir.z * 0.5).normalize();
          state.velocity.add(pullDir.multiplyScalar(strength * 0.7));
          state.velocity.add(tangent.multiplyScalar(strength * 0.5));
        }
      }

      state.velocity.multiplyScalar(0.92);
      state.currentPosition.add(state.velocity.clone().multiplyScalar(deltaTime * 60));

      state.trail.unshift(state.currentPosition.clone());
      if (state.trail.length > TRAIL_LENGTH) {
        state.trail.pop();
      }
      while (state.trail.length < TRAIL_LENGTH) {
        state.trail.push(state.currentPosition.clone());
      }

      this.positions[i * 3] = state.currentPosition.x;
      this.positions[i * 3 + 1] = state.currentPosition.y;
      this.positions[i * 3 + 2] = state.currentPosition.z;

      let brightness = 0.6;
      if (this.audioData.high > 0.1 && Math.random() < this.audioData.high * speedMultiplier) {
        brightness = 0.5 + Math.random() * 0.5;
      }
      color.setHSL(state.baseHue / 360, 0.8, brightness);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      const line = this.trails[i];
      const trailPosAttr = line.geometry.attributes.position as THREE.BufferAttribute;
      const trailColorAttr = line.geometry.attributes.color as THREE.BufferAttribute;
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const tp = state.trail[t];
        trailPosAttr.array[t * 3] = tp.x;
        trailPosAttr.array[t * 3 + 1] = tp.y;
        trailPosAttr.array[t * 3 + 2] = tp.z;

        const fade = 1 - t / TRAIL_LENGTH;
        trailColorAttr.array[t * 3] = color.r * fade;
        trailColorAttr.array[t * 3 + 1] = color.g * fade;
        trailColorAttr.array[t * 3 + 2] = color.b * fade;
      }
      trailPosAttr.needsUpdate = true;
      trailColorAttr.needsUpdate = true;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    if (!this.isDragging) {
      this.targetRotationY += AUTO_ROTATE_SPEED;
    }
    this.group.rotation.x += (this.targetRotationX - this.group.rotation.x) * 0.1;
    this.group.rotation.y += (this.targetRotationY - this.group.rotation.y) * 0.1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trails.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
  }
}
