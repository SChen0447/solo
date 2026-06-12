import * as THREE from 'three';
import type { AudioData } from './AudioEngine';

interface ParticleData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetZ: number;
  colorIndex: number;
  frequencyBand: number;
  baseSize: number;
  currentSize: number;
  burstProgress: number;
  isBursting: boolean;
}

const COLOR_PALETTE = [
  new THREE.Color(0xff6b6b),
  new THREE.Color(0x4ecdc4),
  new THREE.Color(0x45b7d1),
  new THREE.Color(0x96ceb4),
];

const BURST_RADIUS = 20;
const BOUNDARY_RADIUS = 5;
const BURST_DURATION = 2000;
const BURST_FLASH_PERIOD = 500;
const MIN_PARTICLE_SIZE = 0.08;
const MAX_PARTICLE_SIZE = 0.3;
const BASE_PARTICLE_SIZE = 0.15;
const Z_OFFSET_MIN = -3;
const Z_OFFSET_MAX = 3;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private particleCount: number;
  private dummy: THREE.Object3D;
  private boundarySphere: THREE.Mesh;
  private burstActive: boolean = false;
  private burstStartTime: number = 0;
  private highFrequencyHoldTime: number = 0;
  private readonly highFrequencyThreshold: number = 2000;
  private readonly burstTriggerDuration: number = 100;

  constructor(scene: THREE.Scene, particleCount: number = 300) {
    this.scene = scene;
    this.particleCount = particleCount;
    this.dummy = new THREE.Object3D();

    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);

    this.boundarySphere = this.createBoundarySphere();
    this.scene.add(this.boundarySphere);

    this.initParticles();
  }

  private createBoundarySphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BOUNDARY_RADIUS, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      wireframe: false,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);

    const wireframeGeometry = new THREE.SphereGeometry(BOUNDARY_RADIUS, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    sphere.add(wireframe);

    return sphere;
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const basePosition = this.randomPointInSphere(BOUNDARY_RADIUS);
      const colorIndex = i % COLOR_PALETTE.length;
      const frequencyBand = Math.floor(Math.random() * 64);

      this.particles.push({
        basePosition,
        currentPosition: basePosition.clone(),
        targetZ: 0,
        colorIndex,
        frequencyBand,
        baseSize: BASE_PARTICLE_SIZE,
        currentSize: BASE_PARTICLE_SIZE,
        burstProgress: 0,
        isBursting: false,
      });
    }

    this.updateInstanceColors();
  }

  private randomPointInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  update(audioData: AudioData, deltaTime: number): void {
    const { volume, frequencyData, dominantFrequency, isHighFrequency } = audioData;

    this.updateBurstState(isHighFrequency, deltaTime);

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];

      const freqIndex = Math.min(particle.frequencyBand, frequencyData.length - 1);
      const freqValue = frequencyData[freqIndex] / 255;

      const zOffset = volume * (Z_OFFSET_MAX - Z_OFFSET_MIN) + Z_OFFSET_MIN;
      particle.targetZ = zOffset * (freqValue * 0.5 + 0.5);

      const sizeFactor = this.mapFrequencyToSize(frequencyData, particle.frequencyBand);
      particle.currentSize = particle.baseSize * sizeFactor;

      if (this.burstActive) {
        this.updateBurstParticle(particle, i);
      } else {
        particle.currentPosition.x += (particle.basePosition.x - particle.currentPosition.x) * 0.1;
        particle.currentPosition.y += (particle.basePosition.y - particle.currentPosition.y) * 0.1;
        particle.currentPosition.z += (particle.basePosition.z + particle.targetZ - particle.currentPosition.z) * 0.15;
      }

      this.dummy.position.copy(particle.currentPosition);
      this.dummy.scale.setScalar(particle.currentSize);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.updateInstanceColors(audioData);
  }

  private updateBurstState(isHighFrequency: boolean, deltaTime: number): void {
    if (isHighFrequency) {
      this.highFrequencyHoldTime += deltaTime;
      if (this.highFrequencyHoldTime >= this.burstTriggerDuration && !this.burstActive) {
        this.triggerBurst();
      }
    } else {
      this.highFrequencyHoldTime = Math.max(0, this.highFrequencyHoldTime - deltaTime * 2);
    }

    if (this.burstActive) {
      const elapsed = performance.now() - this.burstStartTime;
      if (elapsed >= BURST_DURATION) {
        this.burstActive = false;
        for (const particle of this.particles) {
          particle.isBursting = false;
          particle.burstProgress = 0;
        }
      }
    }
  }

  private triggerBurst(): void {
    this.burstActive = true;
    this.burstStartTime = performance.now();

    for (const particle of this.particles) {
      particle.isBursting = true;
      particle.burstProgress = 0;
    }
  }

  private updateBurstParticle(particle: ParticleData, index: number): void {
    const elapsed = performance.now() - this.burstStartTime;
    const progress = Math.min(elapsed / BURST_DURATION, 1);

    const burstOutProgress = Math.min(progress * 3, 1);
    const returnProgress = Math.max((progress - 0.3) / 0.7, 0);

    const direction = particle.basePosition.clone().normalize();
    const maxBurstPos = direction.multiplyScalar(BURST_RADIUS);

    let t: number;
    if (progress < 0.3) {
      t = this.easeOutQuart(burstOutProgress);
      particle.currentPosition.lerpVectors(particle.basePosition, maxBurstPos, t);
    } else {
      const sineProgress = Math.sin(returnProgress * Math.PI * 2) * 0.5 + 0.5;
      const returnT = this.easeInOutCubic(returnProgress);
      particle.currentPosition.lerpVectors(maxBurstPos, particle.basePosition, returnT);

      const wobble = Math.sin(returnProgress * Math.PI * 4) * 0.3;
      const wobbleDir = new THREE.Vector3(
        Math.sin(index * 0.1) * wobble,
        Math.cos(index * 0.15) * wobble,
        Math.sin(index * 0.2) * wobble
      );
      particle.currentPosition.add(wobbleDir);
    }

    particle.burstProgress = progress;
  }

  private easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  private mapFrequencyToSize(frequencyData: Uint8Array, bandIndex: number): number {
    const idx = Math.min(bandIndex, frequencyData.length - 1);
    const value = frequencyData[idx] / 255;

    if (bandIndex < 16) {
      return MIN_PARTICLE_SIZE / BASE_PARTICLE_SIZE + value * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) / BASE_PARTICLE_SIZE;
    } else {
      const highFreqFactor = 1 - (bandIndex / frequencyData.length);
      const baseSize = MIN_PARTICLE_SIZE + highFreqFactor * (BASE_PARTICLE_SIZE - MIN_PARTICLE_SIZE);
      return baseSize / BASE_PARTICLE_SIZE + value * 0.5;
    }
  }

  private updateInstanceColors(audioData?: AudioData): void {
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      let color: THREE.Color;

      if (this.burstActive && particle.isBursting) {
        const flashPhase = (performance.now() % BURST_FLASH_PERIOD) / BURST_FLASH_PERIOD;
        const flashIntensity = Math.sin(flashPhase * Math.PI * 2) * 0.5 + 0.5;
        const baseColor = COLOR_PALETTE[particle.colorIndex];
        const white = new THREE.Color(0xffffff);
        color = baseColor.clone().lerp(white, flashIntensity * 0.8);
      } else {
        color = COLOR_PALETTE[particle.colorIndex];
        if (audioData) {
          const freqIndex = Math.min(particle.frequencyBand, audioData.frequencyData.length - 1);
          const brightness = audioData.frequencyData[freqIndex] / 255;
          color = color.clone().multiplyScalar(0.5 + brightness * 0.5);
        }
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
    this.instancedMesh.geometry.setAttribute('color', colorAttribute);
  }

  getMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  getBoundarySphere(): THREE.Mesh {
    return this.boundarySphere;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.scene.remove(this.instancedMesh);
    this.scene.remove(this.boundarySphere);
  }
}
