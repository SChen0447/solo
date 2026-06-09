export interface MoleculeData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  speed: number;
  kineticEnergy: number;
}

export interface CollisionEvent {
  x: number;
  y: number;
  z: number;
  time: number;
}

export interface SimulationParams {
  temperature: number;
  particleCount: number;
  moleculeSize: number;
}

export class SimulationEngine {
  private molecules: MoleculeData[] = [];
  private collisions: CollisionEvent[] = [];
  private containerSize: number = 10;
  private params: SimulationParams;
  private targetParams: SimulationParams;
  private moleculeIdCounter: number = 0;
  private readonly BOLTZMANN_FACTOR: number = 0.002;
  private readonly TRANSITION_DURATION: number = 0.5;
  private transitionProgress: number = 1;
  private startParams: SimulationParams;

  constructor(initialParams: SimulationParams) {
    this.params = { ...initialParams };
    this.targetParams = { ...initialParams };
    this.startParams = { ...initialParams };
    this.initMolecules();
  }

  private initMolecules(): void {
    this.molecules = [];
    for (let i = 0; i < this.params.particleCount; i++) {
      this.molecules.push(this.createMolecule());
    }
  }

  private createMolecule(): MoleculeData {
    const half = this.containerSize / 2;
    const radius = this.params.moleculeSize * (0.6 + Math.random() * 0.4);
    const speed = this.getSpeedFromTemperature();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);

    return {
      id: this.moleculeIdCounter++,
      x: (Math.random() - 0.5) * (this.containerSize - radius * 2),
      y: (Math.random() - 0.5) * (this.containerSize - radius * 2),
      z: (Math.random() - 0.5) * (this.containerSize - radius * 2),
      vx,
      vy,
      vz,
      radius,
      speed,
      kineticEnergy: 0.5 * speed * speed
    };
  }

  private getSpeedFromTemperature(): number {
    return Math.sqrt(this.params.temperature * this.BOLTZMANN_FACTOR);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public setParams(newParams: Partial<SimulationParams>): void {
    this.startParams = { ...this.params };
    this.targetParams = { ...this.targetParams, ...newParams };
    this.transitionProgress = 0;

    if (newParams.particleCount !== undefined) {
      this.adjustParticleCount(newParams.particleCount);
    }
  }

  private adjustParticleCount(target: number): void {
    while (this.molecules.length < target) {
      this.molecules.push(this.createMolecule());
    }
    while (this.molecules.length > target) {
      this.molecules.pop();
    }
  }

  public update(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.TRANSITION_DURATION);
      const t = this.easeInOutCubic(this.transitionProgress);
      
      if (this.startParams.temperature !== this.targetParams.temperature) {
        this.params.temperature = this.startParams.temperature + (this.targetParams.temperature - this.startParams.temperature) * t;
      }
      if (this.startParams.moleculeSize !== this.targetParams.moleculeSize) {
        this.params.moleculeSize = this.startParams.moleculeSize + (this.targetParams.moleculeSize - this.startParams.moleculeSize) * t;
        this.molecules.forEach(m => {
          m.radius = this.params.moleculeSize * (0.6 + (m.radius / this.startParams.moleculeSize - 0.6) * (1 - t) + 0.4 * t);
        });
      }
    }

    const targetSpeed = this.getSpeedFromTemperature();
    const half = this.containerSize / 2;
    const dt = Math.min(deltaTime, 0.033);

    const currentCollisions: CollisionEvent[] = [];

    for (let i = 0; i < this.molecules.length; i++) {
      const m = this.molecules[i];

      const currentSpeed = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz);
      if (currentSpeed > 0) {
        const speedDiff = targetSpeed - currentSpeed;
        const adjustFactor = 1 + speedDiff * dt * 2;
        m.vx *= adjustFactor;
        m.vy *= adjustFactor;
        m.vz *= adjustFactor;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;

      if (m.x - m.radius < -half) {
        m.x = -half + m.radius;
        m.vx = Math.abs(m.vx);
      } else if (m.x + m.radius > half) {
        m.x = half - m.radius;
        m.vx = -Math.abs(m.vx);
      }

      if (m.y - m.radius < -half) {
        m.y = -half + m.radius;
        m.vy = Math.abs(m.vy);
      } else if (m.y + m.radius > half) {
        m.y = half - m.radius;
        m.vy = -Math.abs(m.vy);
      }

      if (m.z - m.radius < -half) {
        m.z = -half + m.radius;
        m.vz = Math.abs(m.vz);
      } else if (m.z + m.radius > half) {
        m.z = half - m.radius;
        m.vz = -Math.abs(m.vz);
      }

      m.speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz);
      m.kineticEnergy = 0.5 * m.speed * m.speed;
    }

    for (let i = 0; i < this.molecules.length; i++) {
      for (let j = i + 1; j < this.molecules.length; j++) {
        const a = this.molecules[i];
        const b = this.molecules[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
          currentCollisions.push({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            z: (a.z + b.z) / 2,
            time: performance.now() / 1000
          });

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvy * ny + dvz * nz;

          if (dvn > 0) {
            a.vx -= dvn * nx;
            a.vy -= dvn * ny;
            a.vz -= dvn * nz;
            b.vx += dvn * nx;
            b.vy += dvn * ny;
            b.vz += dvn * nz;
          }

          const overlap = (minDist - dist) / 2;
          a.x -= overlap * nx;
          a.y -= overlap * ny;
          a.z -= overlap * nz;
          b.x += overlap * nx;
          b.y += overlap * ny;
          b.z += overlap * nz;
        }
      }
    }

    const now = performance.now() / 1000;
    this.collisions = this.collisions.filter(c => now - c.time < 0.3);
    this.collisions.push(...currentCollisions);
  }

  public getMolecules(): MoleculeData[] {
    return this.molecules;
  }

  public getCollisions(): CollisionEvent[] {
    return this.collisions;
  }

  public getKineticEnergies(): number[] {
    return this.molecules.map(m => m.kineticEnergy);
  }

  public getAverageKineticEnergy(): number {
    if (this.molecules.length === 0) return 0;
    return this.molecules.reduce((sum, m) => sum + m.kineticEnergy, 0) / this.molecules.length;
  }

  public getMaxKineticEnergy(): number {
    if (this.molecules.length === 0) return 1;
    return Math.max(...this.molecules.map(m => m.kineticEnergy), 0.001);
  }

  public getTemperature(): number {
    return this.params.temperature;
  }

  public getParticleCount(): number {
    return this.molecules.length;
  }

  public getContainerSize(): number {
    return this.containerSize;
  }
}
