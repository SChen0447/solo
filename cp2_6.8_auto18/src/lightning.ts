import * as THREE from 'three';
import type { CloudSystem } from './cloudSystem';

interface LightningBranch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  width: number;
}

class Lightning {
  public mesh: THREE.LineSegments;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private branches: LightningBranch[];
  private lifetime: number;
  private maxLifetime: number;
  private brightness: number;
  private active: boolean;

  constructor() {
    this.branches = [];
    this.lifetime = 0;
    this.maxLifetime = 0.5;
    this.brightness = 1;
    this.active = false;

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 2
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
    this.mesh.visible = false;
  }

  strike(startPos: THREE.Vector3, spread: number, levels: number = 3): void {
    this.branches = [];
    this.generateBranch(startPos, new THREE.Vector3(0, -1, 0), spread * 0.8, levels, 1);
    this.updateGeometry();

    this.maxLifetime = 0.3 + Math.random() * 0.5;
    this.lifetime = 0;
    this.brightness = 1;
    this.active = true;
    this.mesh.visible = true;
  }

  private generateBranch(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    levels: number,
    width: number
  ): void {
    if (levels <= 0 || length < 0.5) return;

    const segments = 3 + Math.floor(Math.random() * 4);
    let currentPos = start.clone();
    let currentDir = direction.clone().normalize();

    for (let i = 0; i < segments; i++) {
      const segLength = length / segments;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * length * 0.15,
        0,
        (Math.random() - 0.5) * length * 0.15
      );

      const nextDir = currentDir.clone().add(offset.normalize().multiplyScalar(0.3)).normalize();
      const endPos = currentPos.clone().add(nextDir.multiplyScalar(segLength));

      this.branches.push({
        start: currentPos.clone(),
        end: endPos.clone(),
        width
      });

      currentPos = endPos;
      currentDir = nextDir;
    }

    if (levels > 1) {
      const numBranches = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numBranches; i++) {
        const branchStartIndex = Math.floor(this.branches.length * 0.3 + Math.random() * this.branches.length * 0.5);
        if (branchStartIndex < this.branches.length) {
          const branchStart = this.branches[branchStartIndex].start.clone();
          const branchDir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            -Math.random() * 0.5 - 0.5,
            (Math.random() - 0.5) * 2
          ).normalize();

          this.generateBranch(
            branchStart,
            branchDir,
            length * (0.4 + Math.random() * 0.3),
            levels - 1,
            width * 0.5
          );
        }
      }
    }
  }

  private updateGeometry(): void {
    const positions: number[] = [];

    for (const branch of this.branches) {
      positions.push(branch.start.x, branch.start.y, branch.start.z);
      positions.push(branch.end.x, branch.end.y, branch.end.z);
    }

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.computeBoundingSphere();
  }

  update(deltaTime: number): number {
    if (!this.active) return 0;

    this.lifetime += deltaTime;

    const lifeRatio = this.lifetime / this.maxLifetime;

    if (lifeRatio < 0.1) {
      this.brightness = lifeRatio / 0.1;
    } else if (lifeRatio > 0.7) {
      this.brightness = (1 - lifeRatio) / 0.3;
    } else {
      this.brightness = 0.7 + Math.random() * 0.3;
    }

    this.material.opacity = this.brightness;

    if (this.lifetime >= this.maxLifetime) {
      this.active = false;
      this.mesh.visible = false;
      this.material.opacity = 0;
    }

    return this.brightness;
  }

  isActive(): boolean {
    return this.active;
  }

  getBrightness(): number {
    return this.brightness;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class LightningSystem {
  private scene: THREE.Scene;
  private cloudSystem: CloudSystem;
  private lightnings: Lightning[];
  private maxLightnings: number;
  private timeSinceLastStrike: number;
  private nextStrikeDelay: number;
  private active: boolean;
  private totalBrightness: number;
  private ambientFlash: THREE.PointLight;

  constructor(scene: THREE.Scene, cloudSystem: CloudSystem) {
    this.scene = scene;
    this.cloudSystem = cloudSystem;
    this.lightnings = [];
    this.maxLightnings = 3;
    this.timeSinceLastStrike = 0;
    this.nextStrikeDelay = 2 + Math.random() * 3;
    this.active = false;
    this.totalBrightness = 0;

    for (let i = 0; i < this.maxLightnings; i++) {
      const lightning = new Lightning();
      this.lightnings.push(lightning);
      this.scene.add(lightning.mesh);
    }

    this.ambientFlash = new THREE.PointLight(0xffffff, 0, 50);
    this.ambientFlash.position.set(0, 10, 0);
    this.scene.add(this.ambientFlash);
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      for (const lightning of this.lightnings) {
        lightning.mesh.visible = false;
      }
      this.ambientFlash.intensity = 0;
      this.totalBrightness = 0;
    }
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.timeSinceLastStrike += deltaTime;

    if (this.timeSinceLastStrike >= this.nextStrikeDelay) {
      this.triggerStrike();
      this.timeSinceLastStrike = 0;
      this.nextStrikeDelay = 2 + Math.random() * 3;
    }

    this.totalBrightness = 0;
    for (const lightning of this.lightnings) {
      const brightness = lightning.update(deltaTime);
      this.totalBrightness = Math.max(this.totalBrightness, brightness);
    }

    this.ambientFlash.intensity = this.totalBrightness * 3;
  }

  private triggerStrike(): void {
    let availableLightning: Lightning | null = null;
    for (const lightning of this.lightnings) {
      if (!lightning.isActive()) {
        availableLightning = lightning;
        break;
      }
    }

    if (!availableLightning) return;

    const cloudSpread = this.cloudSystem.getCloudSpread();
    const cloudHeight = this.cloudSystem.getCloudHeight();

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * cloudSpread * 0.6;
    const startX = Math.cos(angle) * radius;
    const startZ = Math.sin(angle) * radius;
    const startY = cloudHeight - 1;

    const startPos = new THREE.Vector3(startX, startY, startZ);
    availableLightning.strike(startPos, cloudHeight, 3);

    this.ambientFlash.position.set(startX, startY - 2, startZ);
  }

  getFlashIntensity(): number {
    return this.totalBrightness;
  }

  dispose(): void {
    for (const lightning of this.lightnings) {
      lightning.dispose();
    }
  }
}
