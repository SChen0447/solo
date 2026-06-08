import {
  Particle,
  FluidType,
  FLUID_PROPERTIES,
  PhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
  GridCell
} from './types';

export class FluidPhysics {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private grid: Map<string, GridCell> = new Map();
  private nextId: number = 0;
  private width: number = 800;
  private height: number = 600;
  public config: PhysicsConfig;
  private activeCount: number = 0;

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
    this.initPool();
  }

  private initPool(): void {
    const poolSize = this.config.particleCount * 2;
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      id: this.nextId++,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      type: FluidType.WATER,
      temperature: 25,
      life: 1,
      maxLife: 1,
      radius: 4,
      active: false,
      trail: []
    };
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public getParticles(): Particle[] {
    return this.particles.filter(p => p.active);
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getParticleAt(x: number, y: number, radius: number = 15): Particle | null {
    const gridX = Math.floor(x / this.config.gridSize);
    const gridY = Math.floor(y / this.config.gridSize);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cell = this.grid.get(key);
        if (!cell) continue;
        
        for (const idx of cell.particles) {
          const p = this.particles[idx];
          if (!p.active) continue;
          const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
          if (dist < radius + p.radius) {
            return p;
          }
        }
      }
    }
    return null;
  }

  public addParticle(
    x: number,
    y: number,
    type: FluidType,
    vx: number = 0,
    vy: number = 0
  ): void {
    if (this.activeCount >= this.config.particleCount) return;

    let particle: Particle;
    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
    } else {
      particle = this.createParticle();
    }

    const props = FLUID_PROPERTIES[type];
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.type = type;
    particle.temperature = props.baseTemperature;
    particle.radius = props.radius;
    particle.active = true;
    particle.trail = [];

    if (type === FluidType.STEAM) {
      particle.life = 2;
      particle.maxLife = 2;
    } else if (type === FluidType.FIRE) {
      particle.life = 3;
      particle.maxLife = 3;
    } else {
      particle.life = -1;
      particle.maxLife = -1;
    }

    this.particles.push(particle);
    this.activeCount++;
  }

  public addExplosion(x: number, y: number, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 200 + Math.random() * 300;
      this.addParticle(
        x + Math.random() * 10 - 5,
        y + Math.random() * 10 - 5,
        FluidType.MAGMA,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 100
      );
    }
  }

  public reset(): void {
    for (const p of this.particles) {
      if (p.active) {
        p.active = false;
        this.pool.push(p);
      }
    }
    this.particles = [];
    this.activeCount = 0;
    this.grid.clear();
  }

  private getGridKey(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  private buildGrid(): void {
    this.grid.clear();
    const gridSize = this.config.gridSize;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const gx = Math.floor(p.x / gridSize);
      const gy = Math.floor(p.y / gridSize);
      const key = this.getGridKey(gx, gy);

      if (!this.grid.has(key)) {
        this.grid.set(key, { particles: [] });
      }
      this.grid.get(key)!.particles.push(i);
    }
  }

  private getNearbyParticles(p: Particle): number[] {
    const nearby: number[] = [];
    const gridSize = this.config.gridSize;
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getGridKey(gx + dx, gy + dy);
        const cell = this.grid.get(key);
        if (cell) {
          nearby.push(...cell.particles);
        }
      }
    }
    return nearby;
  }

  public update(dt: number): void {
    if (dt > 0.05) dt = 0.05;

    this.buildGrid();
    this.applyGravity(dt);
    this.updateTrails(dt);
    this.simulateFluid(dt);
    this.handleCollisions();
    this.updateTemperature(dt);
    this.handleReactions(dt);
    this.updateLifetimes(dt);
    this.cleanupInactive();
  }

  private applyGravity(dt: number): void {
    const gravity = this.config.gravity;

    for (const p of this.particles) {
      if (!p.active) continue;

      const props = FLUID_PROPERTIES[p.type];
      
      if (p.type === FluidType.STEAM || p.type === FluidType.FIRE) {
        p.vy -= gravity * 0.5 * dt;
      } else {
        p.vy += gravity * props.density * dt;
      }

      p.vx *= props.viscosity;
      p.vy *= props.viscosity;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private updateTrails(dt: number): void {
    const trailLength = this.config.trailLength;
    
    for (const p of this.particles) {
      if (!p.active) continue;

      p.trail.unshift({ x: p.x, y: p.y, alpha: 1 });
      
      if (p.trail.length > trailLength) {
        p.trail.pop();
      }

      for (let i = 0; i < p.trail.length; i++) {
        p.trail[i].alpha = 1 - i / trailLength;
      }
    }
  }

  private simulateFluid(dt: number): void {
    const smoothingRadius = this.config.smoothingRadius;
    const stiffness = this.config.stiffness;
    const nearStiffness = this.config.nearStiffness;
    const restDensity = this.config.restDensity;

    for (let i = 0; i < this.particles.length; i++) {
      const pi = this.particles[i];
      if (!pi.active) continue;

      const nearby = this.getNearbyParticles(pi);
      let density = 0;
      let nearDensity = 0;

      for (const j of nearby) {
        if (i === j) continue;
        const pj = this.particles[j];
        if (!pj.active) continue;

        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < smoothingRadius && dist > 0) {
          const q = 1 - dist / smoothingRadius;
          const propsJ = FLUID_PROPERTIES[pj.type];
          density += propsJ.density * q * q;
          nearDensity += propsJ.density * q * q * q;
        }
      }

      const pressure = stiffness * (density - restDensity);
      const nearPressure = nearStiffness * nearDensity;

      let px = 0;
      let py = 0;

      for (const j of nearby) {
        if (i === j) continue;
        const pj = this.particles[j];
        if (!pj.active) continue;

        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < smoothingRadius && dist > 0) {
          const q = 1 - dist / smoothingRadius;
          const dirX = dx / dist;
          const dirY = dy / dist;

          const force = (pressure * q + nearPressure * q * q) * dt;
          const propsJ = FLUID_PROPERTIES[pj.type];
          const massRatio = 1 / propsJ.density;

          px -= force * dirX * massRatio * 0.5;
          py -= force * dirY * massRatio * 0.5;

          pj.x += force * dirX * massRatio * 0.5;
          pj.y += force * dirY * massRatio * 0.5;
        }
      }

      pi.x += px;
      pi.y += py;
    }
  }

  private handleCollisions(): void {
    for (const p of this.particles) {
      if (!p.active) continue;

      const r = p.radius;

      if (p.x - r < 0) {
        p.x = r;
        p.vx = Math.abs(p.vx) * 0.3;
      }
      if (p.x + r > this.width) {
        p.x = this.width - r;
        p.vx = -Math.abs(p.vx) * 0.3;
      }
      if (p.y - r < 0) {
        p.y = r;
        p.vy = Math.abs(p.vy) * 0.3;
      }
      if (p.y + r > this.height) {
        p.y = this.height - r;
        p.vy = -Math.abs(p.vy) * 0.3;
      }
    }
  }

  private updateTemperature(dt: number): void {
    const heatTransferRate = this.config.heatTransferRate;
    const smoothingRadius = this.config.smoothingRadius * 0.8;

    for (let i = 0; i < this.particles.length; i++) {
      const pi = this.particles[i];
      if (!pi.active) continue;

      const nearby = this.getNearbyParticles(pi);
      let totalHeat = 0;
      let count = 0;

      for (const j of nearby) {
        if (i === j) continue;
        const pj = this.particles[j];
        if (!pj.active) continue;

        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < smoothingRadius) {
          totalHeat += pj.temperature;
          count++;
        }
      }

      if (count > 0) {
        const avgTemp = totalHeat / count;
        pi.temperature += (avgTemp - pi.temperature) * heatTransferRate * dt;
      }

      if (pi.type !== FluidType.MAGMA) {
        pi.temperature += (25 - pi.temperature) * 0.01 * dt;
      }
    }
  }

  private handleReactions(dt: number): void {
    const steamSpawnRate = 3;
    const fireSpawnRate = 2;

    for (let i = 0; i < this.particles.length; i++) {
      const pi = this.particles[i];
      if (!pi.active) continue;
      if (pi.type !== FluidType.MAGMA) continue;

      const nearby = this.getNearbyParticles(pi);

      for (const j of nearby) {
        if (i === j) continue;
        const pj = this.particles[j];
        if (!pj.active) continue;

        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pi.radius + pj.radius + 5) {
          if (pj.type === FluidType.WATER) {
            if (Math.random() < this.config.evaporationRate * dt * steamSpawnRate) {
              pj.type = FluidType.STEAM;
              pj.temperature = 150;
              pj.life = 2;
              pj.maxLife = 2;
              pj.vy -= 100;
            }
          }

          if (pj.type === FluidType.OIL) {
            if (pj.temperature > this.config.ignitionTemperature) {
              if (Math.random() < 0.3 * dt * fireSpawnRate) {
                pj.type = FluidType.FIRE;
                pj.temperature = 600;
                pj.life = 3;
                pj.maxLife = 3;
                pj.vy -= 50;
              }
            } else if (pi.temperature > 500) {
              pj.temperature += 50 * dt;
            }
          }
        }
      }
    }
  }

  private updateLifetimes(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;

      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        }
      }
    }
  }

  private cleanupInactive(): void {
    const toRemove: number[] = [];
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].active) {
        this.pool.push(this.particles[i]);
        toRemove.push(i);
        this.activeCount--;
      }
    }

    for (const idx of toRemove) {
      this.particles.splice(idx, 1);
    }
  }
}
