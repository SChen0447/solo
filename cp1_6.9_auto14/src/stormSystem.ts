import * as THREE from 'three';
import { SandSystem } from './sandSystem';

export interface StormSystemConfig {
  duration: number;
  particleMultiplier: number;
  fogColor: string;
  fogDensity: number;
}

export class StormSystem {
  private scene: THREE.Scene;
  private sandSystem: SandSystem;
  private config: StormSystemConfig;
  private active: boolean = false;
  private remainingTime: number = 0;
  private stormFog!: THREE.FogExp2;
  private originalFog: THREE.FogExp2 | null = null;
  private endCallbacks: (() => void)[] = [];
  private fogMesh!: THREE.Mesh;
  private fogTime: number = 0;

  constructor(scene: THREE.Scene, sandSystem: SandSystem, config: Partial<StormSystemConfig> = {}) {
    this.scene = scene;
    this.sandSystem = sandSystem;
    this.config = {
      duration: 15000,
      particleMultiplier: 10,
      fogColor: '#d2691e',
      fogDensity: 0.08,
      ...config
    };
    this.initFogOverlay();
  }

  private initFogOverlay(): void {
    const fogGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: 0xd2691e,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.fogMesh = new THREE.Mesh(fogGeometry, fogMaterial);
    this.fogMesh.position.set(0, 5, -5);
    this.scene.add(this.fogMesh);

    this.stormFog = new THREE.FogExp2(0xd2691e, 0);
  }

  trigger(): void {
    if (this.active) return;
    this.active = true;
    this.remainingTime = this.config.duration;
    this.sandSystem.setStormMode(true);

    this.originalFog = this.scene.fog as THREE.FogExp2 | null;
    this.scene.fog = this.stormFog;
  }

  onEnd(callback: () => void): void {
    this.endCallbacks.push(callback);
  }

  isActive(): boolean {
    return this.active;
  }

  getRemainingTime(): number {
    return Math.ceil(this.remainingTime / 1000);
  }

  update(delta: number): void {
    this.fogTime += delta;

    if (!this.active) {
      const fogMat = this.fogMesh.material as THREE.MeshBasicMaterial;
      fogMat.opacity = Math.max(0, fogMat.opacity - delta * 0.5);
      this.stormFog.density = Math.max(0, this.stormFog.density - delta * 0.05);
      return;
    }

    this.remainingTime -= delta * 1000;

    const progress = 1 - this.remainingTime / this.config.duration;
    const fadeIn = Math.min(progress * 3, 1);
    const fadeOut = this.remainingTime < 3000 ? this.remainingTime / 3000 : 1;
    const fogIntensity = fadeIn * fadeOut;

    this.stormFog.density = this.config.fogDensity * fogIntensity;

    const fogMat = this.fogMesh.material as THREE.MeshBasicMaterial;
    fogMat.opacity = 0.3 * fogIntensity;

    const positions = this.fogMesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const wave = Math.sin(x * 0.2 + this.fogTime * 3) * Math.cos(y * 0.2 + this.fogTime * 2) * 0.5;
      positions.setZ(i, wave);
    }
    positions.needsUpdate = true;

    if (this.remainingTime <= 0) {
      this.endStorm();
    }
  }

  private endStorm(): void {
    this.active = false;
    this.remainingTime = 0;
    this.sandSystem.setStormMode(false);

    if (this.originalFog) {
      this.scene.fog = this.originalFog;
    } else {
      this.scene.fog = null;
    }

    this.endCallbacks.forEach(cb => cb());
  }
}
