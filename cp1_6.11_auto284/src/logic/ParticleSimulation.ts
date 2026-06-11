import type { Particle, GreeneryConfig, Building, TreeData, SimStats } from '@/types';

const GRAVITY = -9.8;
const PARTICLE_MASS = 0.01;
const TURBULENCE_STRENGTH = 2.5;
const WIND_SPEED = 12;
const MAX_PARTICLES = 500;
const MAX_TRAIL_LENGTH = 15;
const SPAWN_RATE = 8;
const GRID_SIZE = 200;

export class ParticleSimulation {
  private particles: Particle[] = [];
  private buildings: Building[] = [];
  private trees: TreeData[] = [];
  private config: GreeneryConfig;
  private particleIdCounter = 0;
  private spawnAccumulator = 0;
  private capturedCount = 0;
  private totalSpawned = 0;

  constructor(config: GreeneryConfig) {
    this.config = config;
    this.buildings = this.generateBuildings();
    this.trees = this.generateTrees(config);
    this.initParticles();
  }

  private generateBuildings(): Building[] {
    const buildings: Building[] = [];
    const positions = [
      { x: -60, z: -40 }, { x: 0, z: -50 }, { x: 50, z: -30 },
      { x: -40, z: 30 }, { x: 30, z: 40 }, { x: 70, z: 60 },
    ];
    const colors = ['#b0b0b0', '#a0a0a0', '#8a8a8a', '#707070', '#5a5a5a', '#4d4d4d'];

    for (let i = 0; i < 6; i++) {
      buildings.push({
        id: i,
        x: positions[i].x,
        z: positions[i].z,
        width: 20 + Math.random() * 15,
        depth: 18 + Math.random() * 12,
        height: 20 + Math.random() * 60,
        color: colors[i],
      });
    }
    return buildings;
  }

  private generateTrees(config: GreeneryConfig): TreeData[] {
    const trees: TreeData[] = [];
    const { greenArea, treeHeight, arrangement } = config;

    const treeFootprint = Math.PI * 3 * 3;
    const treeCount = Math.max(5, Math.min(80, Math.floor(greenArea / treeFootprint)));

    if (arrangement === 'array') {
      const cols = Math.ceil(Math.sqrt(treeCount * 1.5));
      const rows = Math.ceil(treeCount / cols);
      const spacing = Math.min(30, 120 / Math.max(cols, rows));

      let id = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (id >= treeCount) break;
          const x = -60 + c * spacing + (Math.random() - 0.5) * 2;
          const z = -20 + r * spacing + (Math.random() - 0.5) * 2;
          trees.push(this.createTree(id, x, z, treeHeight));
          id++;
        }
      }
    } else if (arrangement === 'staggered') {
      const cols = Math.ceil(Math.sqrt(treeCount * 1.3));
      const rows = Math.ceil(treeCount / cols);
      const spacing = Math.min(28, 120 / Math.max(cols, rows));

      let id = 0;
      for (let r = 0; r < rows; r++) {
        const offset = r % 2 === 0 ? 0 : spacing / 2;
        for (let c = 0; c < cols; c++) {
          if (id >= treeCount) break;
          const x = -55 + c * spacing + offset + (Math.random() - 0.5) * 1.5;
          const z = -15 + r * spacing + (Math.random() - 0.5) * 1.5;
          trees.push(this.createTree(id, x, z, treeHeight));
          id++;
        }
      }
    } else {
      const clusters = 3;
      const treesPerCluster = Math.floor(treeCount / clusters);
      const clusterCenters = [
        { x: -30, z: 0 },
        { x: 20, z: 20 },
        { x: 60, z: -10 },
      ];

      let id = 0;
      for (let ci = 0; ci < clusters; ci++) {
        for (let i = 0; i < treesPerCluster; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 25;
          const x = clusterCenters[ci].x + Math.cos(angle) * dist;
          const z = clusterCenters[ci].z + Math.sin(angle) * dist;
          const h = treeHeight * (0.7 + Math.random() * 0.5);
          trees.push(this.createTree(id, x, z, h));
          id++;
        }
      }
    }

    return trees;
  }

  private createTree(id: number, x: number, z: number, height: number): TreeData {
    const crownRadius = height * 0.35;
    const crownHeight = height * 0.5;
    const trunkRadius = height * 0.08;
    return { id, x, z, height, trunkRadius, crownRadius, crownHeight };
  }

  private initParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(this.createDeadParticle());
    }
  }

  private createDeadParticle(): Particle {
    return {
      id: -1,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      size: 0,
      alive: false,
      captured: false,
      age: 0,
      trail: [],
    };
  }

  private spawnParticle(): void {
    const dead = this.particles.find((p) => !p.alive);
    if (!dead) return;

    const startX = -GRID_SIZE / 2 - 10;
    const startY = 5 + Math.random() * 40;
    const startZ = -GRID_SIZE / 2 + Math.random() * GRID_SIZE;

    dead.id = this.particleIdCounter++;
    dead.x = startX;
    dead.y = startY;
    dead.z = startZ;
    dead.vx = WIND_SPEED;
    dead.vy = 0;
    dead.vz = 0;
    dead.size = 0.3 + Math.random() * 0.2;
    dead.alive = true;
    dead.captured = false;
    dead.age = 0;
    dead.trail = [];

    this.totalSpawned++;
  }

  private getWindAt(x: number, y: number, z: number): { vx: number; vy: number; vz: number } {
    let windX = WIND_SPEED;
    let windZ = 0;
    let windY = 0;

    for (const b of this.buildings) {
      const dx = x - b.x;
      const dz = z - b.z;
      const distX = Math.abs(dx) - b.width / 2;
      const distZ = Math.abs(dz) - b.depth / 2;
      const dist = Math.max(distX, distZ);

      if (y < b.height && dist < 30) {
        const factor = Math.max(0, 1 - dist / 30);
        windX *= 0.3 + 0.7 * (1 - factor);
        if (distX > distZ) {
          windZ += dz > 0 ? 3 * factor : -3 * factor;
        }
      }
    }

    windX += (Math.random() - 0.5) * TURBULENCE_STRENGTH;
    windZ += (Math.random() - 0.5) * TURBULENCE_STRENGTH * 0.6;
    windY += (Math.random() - 0.5) * TURBULENCE_STRENGTH * 0.4;

    return { vx: windX, vy: windY, vz: windZ };
  }

  private checkBuildingCollision(p: Particle): boolean {
    for (const b of this.buildings) {
      if (
        p.x > b.x - b.width / 2 && p.x < b.x + b.width / 2 &&
        p.z > b.z - b.depth / 2 && p.z < b.z + b.depth / 2 &&
        p.y < b.height
      ) {
        return true;
      }
    }
    return false;
  }

  private checkTreeCapture(p: Particle): boolean {
    for (const t of this.trees) {
      const crownBottom = t.height - t.crownHeight;
      const crownTop = t.height;

      if (p.y >= crownBottom && p.y <= crownTop) {
        const dx = p.x - t.x;
        const dz = p.z - t.z;
        const distHoriz = Math.sqrt(dx * dx + dz * dz);

        const yRel = (p.y - crownBottom) / t.crownHeight;
        const radiusAtY = t.crownRadius * Math.sin(yRel * Math.PI);

        if (distHoriz < radiusAtY) {
          const captureProb = 0.03 + 0.05 * (1 - distHoriz / radiusAtY);
          if (Math.random() < captureProb) {
            return true;
          }
        }
      }
    }
    return false;
  }

  update(dt: number): void {
    const spawnCount = SPAWN_RATE * dt;
    this.spawnAccumulator += spawnCount;
    while (this.spawnAccumulator >= 1) {
      this.spawnParticle();
      this.spawnAccumulator -= 1;
    }

    const liveParticles = this.particles.filter((p) => p.alive);

    for (const p of this.particles) {
      if (!p.alive) continue;

      p.age += dt;

      p.trail.unshift({ x: p.x, y: p.y, z: p.z });
      if (p.trail.length > MAX_TRAIL_LENGTH) {
        p.trail.pop();
      }

      if (p.captured) {
        p.size *= 0.92;
        p.y -= 0.5 * dt;
        if (p.size < 0.05 || p.y < 0) {
          p.alive = false;
        }
        continue;
      }

      const wind = this.getWindAt(p.x, p.y, p.z);

      p.vx = wind.vx;
      p.vz = wind.vz;
      p.vy = wind.vy + GRAVITY * PARTICLE_MASS * dt;

      const nextX = p.x + p.vx * dt;
      const nextY = p.y + p.vy * dt;
      const nextZ = p.z + p.vz * dt;

      const tempP = { ...p, x: nextX, y: nextY, z: nextZ };

      if (this.checkBuildingCollision(tempP)) {
        p.vx *= -0.3;
        p.vy *= 0.2;
      } else {
        p.x = nextX;
        p.y = nextY;
        p.z = nextZ;
      }

      if (this.checkTreeCapture(p)) {
        p.captured = true;
        this.capturedCount++;
        continue;
      }

      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.vx *= 0.9;
        p.vz *= 0.9;
      }

      if (
        p.x > GRID_SIZE / 2 + 20 ||
        p.z < -GRID_SIZE / 2 - 10 ||
        p.z > GRID_SIZE / 2 + 10 ||
        p.age > 25
      ) {
        p.alive = false;
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles.filter((p) => p.alive);
  }

  getAllParticles(): Particle[] {
    return this.particles;
  }

  getBuildings(): Building[] {
    return this.buildings;
  }

  getTrees(): TreeData[] {
    return this.trees;
  }

  getStats(): SimStats {
    const alive = this.particles.filter((p) => p.alive).length;
    const capturedAlive = this.particles.filter((p) => p.alive && p.captured).length;
    
    const baseConcentration = 50;
    const concentration = baseConcentration + alive * 0.25;
    
    const totalActive = this.totalSpawned > 0 ? Math.min(MAX_PARTICLES, this.totalSpawned) : 1;
    const efficiency = totalActive > 0 ? Math.min(60, (this.capturedCount / totalActive) * 100 * 3) : 0;

    return {
      totalConcentration: Math.round(concentration * 10) / 10,
      captureEfficiency: Math.round(efficiency * 10) / 10,
      totalParticles: alive,
      capturedParticles: this.capturedCount,
    };
  }

  getGridSize(): number {
    return GRID_SIZE;
  }

  updateConfig(config: GreeneryConfig): void {
    this.config = config;
    this.trees = this.generateTrees(config);
    this.capturedCount = 0;
    this.totalSpawned = 0;
  }

  reset(): void {
    this.particles.forEach((p) => {
      p.alive = false;
      p.captured = false;
      p.trail = [];
    });
    this.capturedCount = 0;
    this.totalSpawned = 0;
    this.particleIdCounter = 0;
    this.spawnAccumulator = 0;
  }
}
