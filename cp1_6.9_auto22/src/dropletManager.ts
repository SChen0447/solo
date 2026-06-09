import * as THREE from 'three';
import { Droplet } from './droplet';

const CONTAINER_MIN_Y = -2.5;
const CONTAINER_HEIGHT = 5;
const BREAK_HEIGHT = 4.5;
const MERGE_DISTANCE_FACTOR = 1.2;
const MAX_PARTICLES = 200;

interface SplashParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SpatialGrid {
  [key: string]: Droplet[];
}

export class DropletManager {
  public droplets: Droplet[] = [];
  private scene: THREE.Scene;
  private dropletGroup: THREE.Group;
  private particles: SplashParticle[] = [];
  private particleMaterial: THREE.MeshBasicMaterial;
  private spatialGrid: SpatialGrid = {};
  private cellSize: number = 0.6;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.dropletGroup = new THREE.Group();
    this.scene.add(this.dropletGroup);

    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.9
    });

    this.initDroplets(20);
  }

  private initDroplets(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createDroplet();
    }
  }

  private createDroplet(customPos?: THREE.Vector3, customRadius?: number, customSpeed?: number): Droplet {
    const radius = customRadius ?? (0.2 + Math.random() * 0.3);
    const riseSpeed = customSpeed ?? (0.2 + Math.random() * 0.6);

    let position: THREE.Vector3;
    if (customPos) {
      position = customPos;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const rDist = Math.random() * 1.2;
      position = new THREE.Vector3(
        Math.cos(angle) * rDist,
        -2.0 + Math.random() * 0.5,
        Math.sin(angle) * rDist
      );
    }

    const droplet = new Droplet({
      position,
      radius,
      riseSpeed
    });

    this.droplets.push(droplet);
    this.dropletGroup.add(droplet.mesh);
    return droplet;
  }

  public update(deltaTime: number, globalTime: number, speedMultiplier: number): void {
    if (this.droplets.length < 20) {
      const toAdd = Math.min(2, 20 - this.droplets.length);
      for (let i = 0; i < toAdd; i++) {
        this.createDroplet();
      }
    }
    if (this.droplets.length > 30) {
      this.droplets.length = 30;
    }

    this.buildSpatialGrid();

    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const droplet = this.droplets[i];
      droplet.update(deltaTime, globalTime, speedMultiplier);

      if (!droplet.isMerging && !droplet.markedForRemoval) {
        this.checkMerge(droplet);
        this.checkBreak(droplet);
      }

      if (droplet.markedForRemoval) {
        this.removeDroplet(droplet);
      }
    }

    this.updateParticles(deltaTime);
  }

  private buildSpatialGrid(): void {
    this.spatialGrid = {};
    for (const droplet of this.droplets) {
      if (droplet.markedForRemoval) continue;
      const key = this.getGridKey(droplet.position);
      if (!this.spatialGrid[key]) {
        this.spatialGrid[key] = [];
      }
      this.spatialGrid[key].push(droplet);
    }
  }

  private getGridKey(pos: THREE.Vector3): string {
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  private getNeighborKeys(pos: THREE.Vector3): string[] {
    const keys: string[] = [];
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          keys.push(`${cx + dx},${cy + dy},${cz + dz}`);
        }
      }
    }
    return keys;
  }

  private checkMerge(droplet: Droplet): void {
    const neighborKeys = this.getNeighborKeys(droplet.position);
    const checked = new Set<number>();
    checked.add(droplet.id);

    for (const key of neighborKeys) {
      const cell = this.spatialGrid[key];
      if (!cell) continue;

      for (const other of cell) {
        if (checked.has(other.id) || other.markedForRemoval || other.isMerging) continue;
        checked.add(other.id);

        const dist = droplet.position.distanceTo(other.position);
        const mergeDist = (droplet.getRadius() + other.getRadius()) * MERGE_DISTANCE_FACTOR;

        if (dist < mergeDist) {
          this.performMerge(droplet, other);
          return;
        }
      }
    }
  }

  private performMerge(a: Droplet, b: Droplet): void {
    const r1 = a.getRadius();
    const r2 = b.getRadius();
    const newRadius = Math.sqrt(r1 * r1 + r2 * r2);

    const [smaller, larger] = r1 < r2 ? [a, b] : [b, a];

    const avgColor = new THREE.Color().lerpColors(
      smaller.getColor(),
      larger.getColor(),
      (r2 * r2) / (r1 * r1 + r2 * r2)
    );
    larger.setColor(avgColor);
    larger.setTargetRadius(newRadius);
    larger.riseSpeed = (a.riseSpeed + b.riseSpeed) * 0.5;

    smaller.startMerge(larger);

    this.spawnSplashParticles(smaller.position, 8 + Math.floor(Math.random() * 3));
  }

  private checkBreak(droplet: Droplet): void {
    const worldY = droplet.position.y - CONTAINER_MIN_Y;

    if (worldY > BREAK_HEIGHT && !droplet.isBreaking) {
      this.performBreak(droplet);
    }
  }

  private performBreak(droplet: Droplet): void {
    const originalRadius = droplet.getRadius();
    const originalPos = droplet.position.clone();
    const newRadius = originalRadius * 0.6;

    this.spawnSplashParticles(originalPos, 6);

    const offsetAngle = (Math.random() - 0.5) * Math.PI * 0.5;
    const offsetAngle2 = offsetAngle + Math.PI;
    const offsetDist = newRadius * 0.5;

    droplet.markedForRemoval = true;

    for (let i = 0; i < 2; i++) {
      const angle = i === 0 ? offsetAngle : offsetAngle2;
      const pos = originalPos.clone();
      pos.x += Math.cos(angle) * offsetDist;
      pos.z += Math.sin(angle) * offsetDist;
      pos.y -= 0.1;

      const newSpeed = (0.15 + Math.random() * 0.3);
      const newDroplet = this.createDroplet(pos, newRadius, newSpeed);

      const deflectionAngle = (Math.random() - 0.5) * Math.PI / 3;
      const baseSpeed = 0.15;
      newDroplet.velocity.x = Math.sin(deflectionAngle) * baseSpeed;
      newDroplet.velocity.z = Math.cos(deflectionAngle) * baseSpeed;
    }
  }

  private spawnSplashParticles(position: THREE.Vector3, count: number): void {
    if (this.particles.length >= MAX_PARTICLES) return;

    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const geometry = new THREE.SphereGeometry(0.02, 6, 6);
      const material = this.particleMaterial.clone();

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.15 + Math.random() * 0.3;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.5 + 0.1,
        Math.cos(phi) * speed
      );

      this.dropletGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      p.velocity.y -= 0.5 * deltaTime;
      p.mesh.position.x += p.velocity.x * deltaTime;
      p.mesh.position.y += p.velocity.y * deltaTime;
      p.mesh.position.z += p.velocity.z * deltaTime;

      const alpha = 1 - p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;

      if (p.life >= p.maxLife) {
        this.dropletGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private removeDroplet(droplet: Droplet): void {
    const idx = this.droplets.indexOf(droplet);
    if (idx > -1) {
      this.dropletGroup.remove(droplet.mesh);
      droplet.dispose();
      this.droplets.splice(idx, 1);
    }
  }

  public dispose(): void {
    for (const droplet of this.droplets) {
      this.dropletGroup.remove(droplet.mesh);
      droplet.dispose();
    }
    this.droplets = [];

    for (const p of this.particles) {
      this.dropletGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];

    this.scene.remove(this.dropletGroup);
    this.particleMaterial.dispose();
  }
}
