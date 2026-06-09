import * as THREE from 'three';

export type AsteroidType = 'rock' | 'metal' | 'ice';

export interface AsteroidConfig {
  type: AsteroidType;
  name: string;
  diameter: number;
  density: number;
  color: number;
  roughness: number;
  metalness: number;
}

export const ASTEROID_CONFIGS: Record<AsteroidType, AsteroidConfig> = {
  rock: {
    type: 'rock',
    name: '岩石小行星',
    diameter: 25,
    density: 2.7,
    color: 0x808080,
    roughness: 0.95,
    metalness: 0.1
  },
  metal: {
    type: 'metal',
    name: '金属小行星',
    diameter: 15,
    density: 7.8,
    color: 0xc0c0c0,
    roughness: 0.4,
    metalness: 0.9
  },
  ice: {
    type: 'ice',
    name: '冰晶小行星',
    diameter: 30,
    density: 0.9,
    color: 0x87ceeb,
    roughness: 0.3,
    metalness: 0.1
  }
};

export class AsteroidSimulator {
  private scene: THREE.Scene;
  private asteroid: THREE.Mesh | null = null;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private active: boolean = false;
  private gravity: number = -30;
  private currentConfig: AsteroidConfig | null = null;
  private currentSpeed: number = 300;
  private impactPosition: THREE.Vector3 | null = null;
  private impactDirection: THREE.Vector3 | null = null;
  private onImpactCallback: ((point: THREE.Vector3, dir: THREE.Vector3, energy: number, type: AsteroidType) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setOnImpactCallback(cb: (point: THREE.Vector3, dir: THREE.Vector3, energy: number, type: AsteroidType) => void): void {
    this.onImpactCallback = cb;
  }

  launch(type: AsteroidType, speed: number): void {
    this.reset();

    const config = ASTEROID_CONFIGS[type];
    this.currentConfig = config;
    this.currentSpeed = speed;

    const geometry = new THREE.IcosahedronGeometry(config.diameter / 2, 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = 1 + (Math.random() - 0.5) * 0.2;
      positions.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
      flatShading: true
    });

    this.asteroid = new THREE.Mesh(geometry, material);
    this.asteroid.castShadow = true;

    const startX = -200 + (Math.random() - 0.5) * 80;
    const startY = 180 + Math.random() * 40;
    const startZ = -200 + (Math.random() - 0.5) * 80;
    this.asteroid.position.set(startX, startY, startZ);

    const targetX = (Math.random() - 0.5) * 40;
    const targetY = 20;
    const targetZ = (Math.random() - 0.5) * 40;

    const dir = new THREE.Vector3(targetX - startX, targetY - startY, targetZ - startZ).normalize();
    this.velocity.copy(dir).multiplyScalar(speed);

    this.scene.add(this.asteroid);
    this.active = true;
  }

  update(dt: number): boolean {
    if (!this.active || !this.asteroid) return false;

    this.velocity.y += this.gravity * dt;
    this.asteroid.position.addScaledVector(this.velocity, dt);
    this.asteroid.rotation.x += dt * 2;
    this.asteroid.rotation.y += dt * 1.5;

    if (this.asteroid.position.y <= 0) {
      this.triggerImpact(this.asteroid.position.clone());
      return false;
    }

    return true;
  }

  getPosition(): THREE.Vector3 | null {
    return this.asteroid ? this.asteroid.position.clone() : null;
  }

  getRadius(): number {
    return this.currentConfig ? this.currentConfig.diameter / 2 : 0;
  }

  getConfig(): AsteroidConfig | null {
    return this.currentConfig;
  }

  triggerImpact(point: THREE.Vector3): void {
    if (!this.active) return;

    this.impactPosition = point.clone();
    this.impactDirection = this.velocity.clone().normalize();
    const energy = this.calculateEnergy();
    const type = this.currentConfig?.type || 'rock';

    if (this.onImpactCallback) {
      this.onImpactCallback(point, this.impactDirection, energy, type);
    }

    this.active = false;
    if (this.asteroid) {
      this.scene.remove(this.asteroid);
      this.asteroid.geometry.dispose();
      (this.asteroid.material as THREE.Material).dispose();
      this.asteroid = null;
    }
  }

  calculateEnergy(): number {
    if (!this.currentConfig) return 0;
    const radius = this.currentConfig.diameter / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const mass = volume * this.currentConfig.density * 100;
    const v = this.velocity.length();
    const joules = 0.5 * mass * v * v;
    return joules / 1e6;
  }

  isActive(): boolean {
    return this.active;
  }

  reset(): void {
    this.active = false;
    if (this.asteroid) {
      this.scene.remove(this.asteroid);
      this.asteroid.geometry.dispose();
      (this.asteroid.material as THREE.Material).dispose();
      this.asteroid = null;
    }
    this.currentConfig = null;
    this.velocity.set(0, 0, 0);
    this.impactPosition = null;
    this.impactDirection = null;
  }
}
