import { ParticleState, SimulationParams, SimulationResult } from './simulation';

const MAX_PARTICLES = 2000;
const FADE_HEIGHT = 100;
const BASE_TEMPERATURE = 4;

interface WorkerMessage {
  type: 'init' | 'update' | 'setParams';
  deltaTime?: number;
  params?: Partial<SimulationParams>;
}

interface WorkerResponse {
  type: 'update';
  result: {
    particlesData: Float32Array;
    avgVelocity: number;
    diffusionRadius: number;
    currentDensity: number;
  };
}

class WorkerSimulation {
  private particles: ParticleState[] = [];
  private params: SimulationParams = {
    temperature: 300,
    currentStrength: 2,
    particleCount: 1250,
    maxParticles: MAX_PARTICLES
  };
  private time: number = 0;
  private ventPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  constructor() {
    this.initParticles();
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

  public update(deltaTime: number): WorkerResponse['result'] {
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

    const particlesData = new Float32Array(MAX_PARTICLES * 8);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      const offset = i * 8;
      particlesData[offset] = p.x;
      particlesData[offset + 1] = p.y;
      particlesData[offset + 2] = p.z;
      particlesData[offset + 3] = p.temperature;
      particlesData[offset + 4] = p.life;
      particlesData[offset + 5] = p.active ? 1 : 0;
      particlesData[offset + 6] = p.vy;
      particlesData[offset + 7] = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
    }

    return {
      particlesData,
      avgVelocity: activeCount > 0 ? totalVelocity / activeCount : 0,
      diffusionRadius: maxRadius,
      currentDensity: activeCount
    };
  }

  public setParams(params: Partial<SimulationParams>): void {
    if (params.temperature !== undefined) this.params.temperature = params.temperature;
    if (params.currentStrength !== undefined) this.params.currentStrength = params.currentStrength;
    if (params.particleCount !== undefined) this.params.particleCount = params.particleCount;
  }
}

let sim: WorkerSimulation | null = null;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      sim = new WorkerSimulation();
      break;
    case 'update':
      if (sim && msg.deltaTime !== undefined) {
        const result = sim.update(msg.deltaTime);
        const response: WorkerResponse = {
          type: 'update',
          result
        };
        (self as any).postMessage(response, [result.particlesData.buffer]);
      }
      break;
    case 'setParams':
      if (sim && msg.params) {
        sim.setParams(msg.params);
      }
      break;
  }
};
