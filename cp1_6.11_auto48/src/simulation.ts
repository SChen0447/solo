export interface ParticleState {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  temperature: number;
  life: number;
  maxLife: number;
  active: boolean;
  driftAngle: number;
  driftPhase: number;
}

export interface SimulationParams {
  temperature: number;
  currentStrength: number;
  particleCount: number;
  maxParticles: number;
}

export interface SimulationResult {
  particles: ParticleState[];
  avgVelocity: number;
  diffusionRadius: number;
  currentDensity: number;
}

const MAX_PARTICLES = 2000;
const FADE_HEIGHT = 100;
const BASE_TEMPERATURE = 4;

export class FluidSimulation {
  private particles: ParticleState[] = [];
  private params: SimulationParams = {
    temperature: 300,
    currentStrength: 2,
    particleCount: 1250,
    maxParticles: MAX_PARTICLES
  };
  private time: number = 0;
  private ventPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private gridSize: number = 20;
  private cellGrid: number[][] = [];

  constructor() {
    this.initGrid();
    this.initParticles();
  }

  private initGrid(): void {
    this.cellGrid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.cellGrid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.cellGrid[i][j] = BASE_TEMPERATURE;
      }
    }
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        id: i,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        temperature: BASE_TEMPERATURE,
        life: 0,
        maxLife: 1,
        active: false,
        driftAngle: 0,
        driftPhase: 0
      });
    }
  }

  private spawnParticle(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2.5;
        p.x = this.ventPosition.x + Math.cos(angle) * radius;
        p.y = this.ventPosition.y + 8 + Math.random() * 2;
        p.z = this.ventPosition.z + Math.sin(angle) * radius;

        const tempFactor = (this.params.temperature - 200) / 200;
        p.vy = 0.8 + tempFactor * 1.2 + Math.random() * 0.3;
        p.vx = (Math.random() - 0.5) * 0.1;
        p.vz = (Math.random() - 0.5) * 0.1;

        p.temperature = this.params.temperature * (0.85 + Math.random() * 0.15);
        p.life = 1;
        p.maxLife = FADE_HEIGHT / p.vy;
        p.active = true;
        p.driftAngle = (Math.random() - 0.5) * Math.PI / 2;
        p.driftPhase = Math.random() * Math.PI * 2;
        return;
      }
    }
  }

  public update(deltaTime: number): SimulationResult {
    this.time += deltaTime;
    const dt = Math.min(deltaTime, 0.05);

    let activeCount = 0;
    let totalVelocity = 0;
    let maxRadius = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.driftPhase += dt * 0.8;
      const sCurve = Math.sin(p.driftPhase) * this.params.currentStrength * 0.5;
      const cosA = Math.cos(p.driftAngle);
      const sinA = Math.sin(p.driftAngle);

      const buoyancyFactor = (p.temperature - BASE_TEMPERATURE) / this.params.temperature;
      p.vy += buoyancyFactor * 0.02;
      p.vy = Math.min(p.vy, 3.5);

      const driftX = cosA * sCurve * dt * 1.2;
      const driftZ = sinA * sCurve * dt * 1.2;
      p.vx += driftX + (Math.random() - 0.5) * this.params.currentStrength * 0.05;
      p.vz += driftZ + (Math.random() - 0.5) * this.params.currentStrength * 0.05;

      const drag = 0.995;
      p.vx *= drag;
      p.vz *= drag;

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.z += p.vz * dt * 60;

      const heightRatio = Math.min(p.y / FADE_HEIGHT, 1);
      p.temperature = BASE_TEMPERATURE + (this.params.temperature - BASE_TEMPERATURE) * (1 - heightRatio * 0.9);
      p.life = 1 - heightRatio;

      const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z);
      if (distFromCenter > maxRadius) maxRadius = distFromCenter;

      totalVelocity += Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      activeCount++;

      if (p.life <= 0 || p.y > FADE_HEIGHT + 10) {
        p.active = false;
      }
    }

    const targetCount = this.params.particleCount;
    const spawnRate = Math.max(1, Math.floor((targetCount - activeCount) * 0.15 + 5));
    for (let s = 0; s < spawnRate && activeCount < targetCount; s++) {
      this.spawnParticle();
    }

    this.updateCellularAutomaton(dt);

    return {
      particles: this.particles,
      avgVelocity: activeCount > 0 ? totalVelocity / activeCount : 0,
      diffusionRadius: maxRadius,
      currentDensity: activeCount
    };
  }

  private updateCellularAutomaton(dt: number): void {
    const newGrid: number[][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      newGrid[i] = [...this.cellGrid[i]];
    }

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        let sum = 0;
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < this.gridSize && nj >= 0 && nj < this.gridSize) {
              sum += this.cellGrid[ni][nj];
              count++;
            }
          }
        }
        const avg = sum / count;
        newGrid[i][j] = this.cellGrid[i][j] + (avg - this.cellGrid[i][j]) * dt * 0.5;
        newGrid[i][j] += (BASE_TEMPERATURE - newGrid[i][j]) * dt * 0.08;
      }
    }

    const ci = Math.floor(this.gridSize / 2);
    const cj = Math.floor(this.gridSize / 2);
    for (let r = 0; r < 4; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          const ni = ci + di;
          const nj = cj + dj;
          if (ni >= 0 && ni < this.gridSize && nj >= 0 && nj < this.gridSize) {
            const dist = Math.sqrt(di * di + dj * dj);
            if (dist <= r) {
              newGrid[ni][nj] += (this.params.temperature - newGrid[ni][nj]) * dt * (0.6 - r * 0.12);
            }
          }
        }
      }
    }

    this.cellGrid = newGrid;
  }

  public setParams(params: Partial<SimulationParams>): void {
    if (params.temperature !== undefined) this.params.temperature = params.temperature;
    if (params.currentStrength !== undefined) this.params.currentStrength = params.currentStrength;
    if (params.particleCount !== undefined) this.params.particleCount = params.particleCount;
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public getGridTemperature(x: number, z: number): number {
    const i = Math.floor((x / 60) * (this.gridSize / 2) + this.gridSize / 2);
    const j = Math.floor((z / 60) * (this.gridSize / 2) + this.gridSize / 2);
    const clampedI = Math.max(0, Math.min(this.gridSize - 1, i));
    const clampedJ = Math.max(0, Math.min(this.gridSize - 1, j));
    return this.cellGrid[clampedI][clampedJ];
  }

  public getActiveParticles(): ParticleState[] {
    return this.particles.filter(p => p.active);
  }
}

export const createSimulation = (): FluidSimulation => {
  return new FluidSimulation();
};
