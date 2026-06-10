import * as THREE from 'three';

export enum ParticleType {
  TRANSFER = 0,
  DISK = 1,
  JET = 2,
  FLASH = 3
}

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  types: Uint8Array;
  activeCount: number;
}

export interface StarState {
  position: THREE.Vector3;
  radius: number;
  mass: number;
}

export interface SimulationParams {
  transferRate: number;
  viscosity: number;
  jetStrength: number;
  maxParticles: number;
}

export interface HudData {
  totalParticles: number;
  diskAngularVelocity: number;
  transferFlow: number;
  orbitalPeriod: number;
}

const G = 1.0;
const DISK_INNER = 0.5;
const DISK_OUTER = 3.0;
const BINARY_SEPARATION = 4.0;
const WD_MASS = 2.0;
const MS_MASS = 1.0;
const WD_RADIUS = 0.3;
const MS_RADIUS = 0.8;

export class Simulator {
  private params: SimulationParams;
  private particles: Float32Array;
  private particleVelocities: Float32Array;
  private particleAges: Float32Array;
  private particleLifetimes: Float32Array;
  private particleTypes: Uint8Array;
  private particlePhases: Float32Array;

  private activeCount: number;
  private spawnAccumulator: number;
  private jetSpawnAccumulator: number;
  private time: number;

  private whiteDwarf: StarState;
  private mainSequence: StarState;
  private binaryAngle: number;
  private binaryOmega: number;

  private precessionAngle: number;
  private lastFlashTimes: Float32Array;
  private particlesPerSecond: number;

  constructor(params: SimulationParams) {
    this.params = { ...params };
    this.activeCount = 0;
    this.spawnAccumulator = 0;
    this.jetSpawnAccumulator = 0;
    this.time = 0;
    this.particlesPerSecond = 0;

    const maxP = this.params.maxParticles;
    this.particles = new Float32Array(maxP * 3);
    this.particleVelocities = new Float32Array(maxP * 3);
    this.particleAges = new Float32Array(maxP);
    this.particleLifetimes = new Float32Array(maxP);
    this.particleTypes = new Uint8Array(maxP);
    this.particlePhases = new Float32Array(maxP);
    this.lastFlashTimes = new Float32Array(100);

    this.whiteDwarf = {
      position: new THREE.Vector3(0, 0, 0),
      radius: WD_RADIUS,
      mass: WD_MASS
    };

    this.mainSequence = {
      position: new THREE.Vector3(BINARY_SEPARATION, 0, 0),
      radius: MS_RADIUS,
      mass: MS_MASS
    };

    const totalMass = WD_MASS + MS_MASS;
    this.binaryOmega = Math.sqrt(G * totalMass / (BINARY_SEPARATION * BINARY_SEPARATION * BINARY_SEPARATION));
    this.binaryAngle = 0;
    this.precessionAngle = 0;

    this.updateBinaryPositions();
  }

  public setParams(params: Partial<SimulationParams>): void {
    if (params.maxParticles !== undefined && params.maxParticles !== this.params.maxParticles) {
      const newMax = params.maxParticles;
      const newParticles = new Float32Array(newMax * 3);
      const newVelocities = new Float32Array(newMax * 3);
      const newAges = new Float32Array(newMax);
      const newLifetimes = new Float32Array(newMax);
      const newTypes = new Uint8Array(newMax);
      const newPhases = new Float32Array(newMax);

      const copyCount = Math.min(this.activeCount, newMax);
      newParticles.set(this.particles.subarray(0, copyCount * 3));
      newVelocities.set(this.particleVelocities.subarray(0, copyCount * 3));
      newAges.set(this.particleAges.subarray(0, copyCount));
      newLifetimes.set(this.particleLifetimes.subarray(0, copyCount));
      newTypes.set(this.particleTypes.subarray(0, copyCount));
      newPhases.set(this.particlePhases.subarray(0, copyCount));

      this.particles = newParticles;
      this.particleVelocities = newVelocities;
      this.particleAges = newAges;
      this.particleLifetimes = newLifetimes;
      this.particleTypes = newTypes;
      this.particlePhases = newPhases;
      this.activeCount = copyCount;
      this.params.maxParticles = newMax;
    }

    Object.assign(this.params, params);
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public getWhiteDwarf(): StarState {
    return this.whiteDwarf;
  }

  public getMainSequence(): StarState {
    return this.mainSequence;
  }

  public getPrecessionAngle(): number {
    return this.precessionAngle;
  }

  public update(deltaTime: number): ParticleData {
    this.time += deltaTime;
    this.binaryAngle += this.binaryOmega * deltaTime;
    this.precessionAngle += (2 * Math.PI / 10) * deltaTime;

    this.updateBinaryPositions();
    this.updateParticles(deltaTime);
    this.spawnTransferParticles(deltaTime);
    this.spawnJetParticles(deltaTime);

    return this.getParticleData();
  }

  public getHudData(): HudData {
    const diskOmega = this.getDiskAngularVelocity(1.5);
    return {
      totalParticles: this.activeCount,
      diskAngularVelocity: diskOmega,
      transferFlow: this.particlesPerSecond,
      orbitalPeriod: 2 * Math.PI / this.binaryOmega
    };
  }

  private updateBinaryPositions(): void {
    const totalMass = WD_MASS + MS_MASS;
    const wdDist = BINARY_SEPARATION * MS_MASS / totalMass;
    const msDist = BINARY_SEPARATION * WD_MASS / totalMass;

    this.whiteDwarf.position.set(
      -wdDist * Math.cos(this.binaryAngle),
      0,
      -wdDist * Math.sin(this.binaryAngle)
    );

    this.mainSequence.position.set(
      msDist * Math.cos(this.binaryAngle),
      0,
      msDist * Math.sin(this.binaryAngle)
    );
  }

  private getDiskAngularVelocity(radius: number): number {
    return Math.sqrt(G * WD_MASS / (radius * radius * radius));
  }

  private spawnTransferParticles(deltaTime: number): void {
    const spawnRate = 80 * this.params.transferRate;
    this.particlesPerSecond = spawnRate;
    this.spawnAccumulator += spawnRate * deltaTime;

    while (this.spawnAccumulator >= 1 && this.activeCount < this.params.maxParticles) {
      this.spawnAccumulator -= 1;
      this.addTransferParticle();
    }
  }

  private spawnJetParticles(deltaTime: number): void {
    if (this.params.jetStrength <= 0) return;

    const spawnRate = 40 * this.params.jetStrength;
    this.jetSpawnAccumulator += spawnRate * deltaTime;

    while (this.jetSpawnAccumulator >= 1 && this.activeCount < this.params.maxParticles) {
      this.jetSpawnAccumulator -= 1;
      this.addJetParticle();
    }
  }

  private addTransferParticle(): void {
    const idx = this.activeCount;
    if (idx >= this.params.maxParticles) return;

    const angle = this.binaryAngle;
    const toWD = new THREE.Vector3()
      .subVectors(this.whiteDwarf.position, this.mainSequence.position)
      .normalize();

    const tangent = new THREE.Vector3(-toWD.z, 0, toWD.x);
    const orbitalVel = tangent.multiplyScalar(this.binaryOmega * this.mainSequence.position.length());

    const jitter = 0.05;
    const spawnOffset = this.mainSequence.radius * 0.9;
    const spawnPos = new THREE.Vector3()
      .copy(this.mainSequence.position)
      .add(toWD.clone().multiplyScalar(spawnOffset))
      .add(new THREE.Vector3(
        (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * jitter * 0.5,
        (Math.random() - 0.5) * jitter
      ));

    const escapeVel = toWD.clone().multiplyScalar(0.3);

    this.particles[idx * 3] = spawnPos.x;
    this.particles[idx * 3 + 1] = spawnPos.y;
    this.particles[idx * 3 + 2] = spawnPos.z;

    this.particleVelocities[idx * 3] = orbitalVel.x + escapeVel.x;
    this.particleVelocities[idx * 3 + 1] = orbitalVel.y + escapeVel.y + (Math.random() - 0.5) * 0.05;
    this.particleVelocities[idx * 3 + 2] = orbitalVel.z + escapeVel.z;

    this.particleAges[idx] = 0;
    this.particleLifetimes[idx] = 8.0 + Math.random() * 4.0;
    this.particleTypes[idx] = ParticleType.TRANSFER;
    this.particlePhases[idx] = Math.random() * Math.PI * 2;

    this.activeCount++;
  }

  private addJetParticle(): void {
    const idx = this.activeCount;
    if (idx >= this.params.maxParticles) return;

    const precession = this.precessionAngle;
    const coneAngle = 0.25;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const angle = Math.random() * coneAngle;
    const azimuth = Math.random() * Math.PI * 2;

    const localDir = new THREE.Vector3(
      Math.sin(angle) * Math.cos(azimuth),
      direction * Math.cos(angle),
      Math.sin(angle) * Math.sin(azimuth)
    );

    const rotY = new THREE.Matrix4().makeRotationY(precession);
    localDir.applyMatrix4(rotY);

    const speed = 1.5 + Math.random() * 1.0;

    this.particles[idx * 3] = this.whiteDwarf.position.x + localDir.x * 0.4;
    this.particles[idx * 3 + 1] = this.whiteDwarf.position.y + localDir.y * 0.4;
    this.particles[idx * 3 + 2] = this.whiteDwarf.position.z + localDir.z * 0.4;

    this.particleVelocities[idx * 3] = localDir.x * speed;
    this.particleVelocities[idx * 3 + 1] = localDir.y * speed;
    this.particleVelocities[idx * 3 + 2] = localDir.z * speed;

    this.particleAges[idx] = 0;
    this.particleLifetimes[idx] = 2.0 + Math.random() * 1.5;
    this.particleTypes[idx] = ParticleType.JET;
    this.particlePhases[idx] = Math.random() * Math.PI * 2;

    this.activeCount++;
  }

  private addDiskParticle(radius: number, fromTransfer: boolean, transferIdx: number): void {
    const idx = fromTransfer ? transferIdx : this.activeCount;
    if (!fromTransfer && idx >= this.params.maxParticles) return;

    const theta = Math.random() * Math.PI * 2;
    const heightJitter = (Math.random() - 0.5) * 0.08 * (1.0 - (radius - DISK_INNER) / (DISK_OUTER - DISK_INNER));

    if (!fromTransfer) {
      this.particles[idx * 3] = this.whiteDwarf.position.x + Math.cos(theta) * radius;
      this.particles[idx * 3 + 1] = this.whiteDwarf.position.y + heightJitter;
      this.particles[idx * 3 + 2] = this.whiteDwarf.position.z + Math.sin(theta) * radius;
    }

    const omega = this.getDiskAngularVelocity(radius);

    const posX = this.particles[idx * 3] - this.whiteDwarf.position.x;
    const posZ = this.particles[idx * 3 + 2] - this.whiteDwarf.position.z;
    const r = Math.sqrt(posX * posX + posZ * posZ);
    const cosT = r > 0 ? posX / r : 1;
    const sinT = r > 0 ? posZ / r : 0;

    this.particleVelocities[idx * 3] = -omega * r * sinT;
    this.particleVelocities[idx * 3 + 1] = 0;
    this.particleVelocities[idx * 3 + 2] = omega * r * cosT;

    this.particleAges[idx] = 0;
    this.particleLifetimes[idx] = 15.0 + Math.random() * 10.0;
    this.particleTypes[idx] = ParticleType.DISK;
    this.particlePhases[idx] = theta;

    if (!fromTransfer) {
      this.activeCount++;
    }
  }

  private updateParticles(deltaTime: number): void {
    let writeIdx = 0;

    for (let readIdx = 0; readIdx < this.activeCount; readIdx++) {
      this.particleAges[readIdx] += deltaTime;

      if (this.particleAges[readIdx] > this.particleLifetimes[readIdx]) {
        continue;
      }

      const type = this.particleTypes[readIdx];
      const px = this.particles[readIdx * 3];
      const py = this.particles[readIdx * 3 + 1];
      const pz = this.particles[readIdx * 3 + 2];

      if (type === ParticleType.TRANSFER) {
        this.updateTransferParticle(readIdx, deltaTime, px, py, pz);
      } else if (type === ParticleType.DISK) {
        this.updateDiskParticle(readIdx, deltaTime, px, py, pz);
      } else if (type === ParticleType.JET) {
        this.updateJetParticle(readIdx, deltaTime, px, py, pz);
      }

      if (writeIdx !== readIdx) {
        this.particles[writeIdx * 3] = this.particles[readIdx * 3];
        this.particles[writeIdx * 3 + 1] = this.particles[readIdx * 3 + 1];
        this.particles[writeIdx * 3 + 2] = this.particles[readIdx * 3 + 2];

        this.particleVelocities[writeIdx * 3] = this.particleVelocities[readIdx * 3];
        this.particleVelocities[writeIdx * 3 + 1] = this.particleVelocities[readIdx * 3 + 1];
        this.particleVelocities[writeIdx * 3 + 2] = this.particleVelocities[readIdx * 3 + 2];

        this.particleAges[writeIdx] = this.particleAges[readIdx];
        this.particleLifetimes[writeIdx] = this.particleLifetimes[readIdx];
        this.particleTypes[writeIdx] = this.particleTypes[readIdx];
        this.particlePhases[writeIdx] = this.particlePhases[readIdx];
      }

      writeIdx++;
    }

    this.activeCount = writeIdx;
  }

  private updateTransferParticle(idx: number, deltaTime: number, px: number, py: number, pz: number): void {
    const wdx = this.whiteDwarf.position.x;
    const wdy = this.whiteDwarf.position.y;
    const wdz = this.whiteDwarf.position.z;

    const dx = wdx - px;
    const dy = wdy - py;
    const dz = wdz - pz;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (dist < DISK_OUTER + 0.3) {
      this.addDiskParticle(Math.max(DISK_INNER + 0.1, dist * 0.9), true, idx);
      return;
    }

    if (dist > 0.1) {
      const invDist = 1.0 / dist;
      const invDistSq = 1.0 / distSq;
      const ax = G * WD_MASS * dx * invDist * invDistSq;
      const ay = G * WD_MASS * dy * invDist * invDistSq;
      const az = G * WD_MASS * dz * invDist * invDistSq;

      this.particleVelocities[idx * 3] += ax * deltaTime;
      this.particleVelocities[idx * 3 + 1] += ay * deltaTime;
      this.particleVelocities[idx * 3 + 2] += az * deltaTime;
    }

    this.particles[idx * 3] += this.particleVelocities[idx * 3] * deltaTime;
    this.particles[idx * 3 + 1] += this.particleVelocities[idx * 3 + 1] * deltaTime;
    this.particles[idx * 3 + 2] += this.particleVelocities[idx * 3 + 2] * deltaTime;
  }

  private updateDiskParticle(idx: number, deltaTime: number, px: number, py: number, pz: number): void {
    const wdx = this.whiteDwarf.position.x;
    const wdy = this.whiteDwarf.position.y;
    const wdz = this.whiteDwarf.position.z;

    const dx = px - wdx;
    const dz = pz - wdz;
    const radius = Math.sqrt(dx * dx + dz * dz);

    if (radius < DISK_INNER) {
      if (Math.random() < 0.05) {
        this.particleTypes[idx] = ParticleType.FLASH;
        this.particleAges[idx] = 0;
        this.particleLifetimes[idx] = 0.1;
      } else {
        this.particleLifetimes[idx] = -1;
      }
      return;
    }

    const omega = this.getDiskAngularVelocity(radius);
    this.particlePhases[idx] += omega * deltaTime;

    const viscosity = this.params.viscosity;
    const driftSpeed = viscosity * 0.3;
    const newRadius = Math.max(DISK_INNER, radius - driftSpeed * deltaTime);

    const cosT = radius > 0 ? dx / radius : 1;
    const sinT = radius > 0 ? dz / radius : 0;

    this.particles[idx * 3] = wdx + Math.cos(this.particlePhases[idx]) * newRadius;
    this.particles[idx * 3 + 2] = wdz + Math.sin(this.particlePhases[idx]) * newRadius;

    const verticalDecay = Math.exp(-deltaTime * 2.0);
    this.particles[idx * 3 + 1] = wdy + (py - wdy) * verticalDecay + (Math.random() - 0.5) * 0.002;
  }

  private updateJetParticle(idx: number, deltaTime: number, px: number, py: number, pz: number): void {
    this.particles[idx * 3] += this.particleVelocities[idx * 3] * deltaTime;
    this.particles[idx * 3 + 1] += this.particleVelocities[idx * 3 + 1] * deltaTime;
    this.particles[idx * 3 + 2] += this.particleVelocities[idx * 3 + 2] * deltaTime;

    this.particleVelocities[idx * 3] *= Math.exp(-deltaTime * 0.5);
    this.particleVelocities[idx * 3 + 1] *= Math.exp(-deltaTime * 0.5);
    this.particleVelocities[idx * 3 + 2] *= Math.exp(-deltaTime * 0.5);
  }

  private getParticleData(): ParticleData {
    const count = this.activeCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const types = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.particles[i * 3];
      positions[i * 3 + 1] = this.particles[i * 3 + 1];
      positions[i * 3 + 2] = this.particles[i * 3 + 2];

      types[i] = this.particleTypes[i];
      const age = this.particleAges[i];
      const life = this.particleLifetimes[i];
      const lifeRatio = Math.min(1, age / Math.max(life, 0.001));

      let r: number, g: number, b: number, size: number, alpha: number;

      if (this.particleTypes[i] === ParticleType.TRANSFER) {
        const colorT = Math.min(1, lifeRatio * 1.5);
        r = 1.0;
        g = 0.67 - colorT * 0.27;
        b = 0.0;
        size = 3.5 + Math.sin(this.time * 5 + this.particlePhases[i]) * 0.5;
        alpha = 1.0 - lifeRatio * 0.3;
      } else if (this.particleTypes[i] === ParticleType.DISK) {
        const wdx = this.whiteDwarf.position.x;
        const wdz = this.whiteDwarf.position.z;
        const ddx = this.particles[i * 3] - wdx;
        const ddz = this.particles[i * 3 + 2] - wdz;
        const rad = Math.sqrt(ddx * ddx + ddz * ddz);
        const radT = (rad - DISK_INNER) / (DISK_OUTER - DISK_INNER);

        r = 1.0;
        g = 0.27 + radT * 0.4;
        b = 0.0;
        size = 4.5 - radT * 1.5;
        const densityT = 1.0 - radT * 0.7;
        const fadeIn = Math.min(1, age / 0.3);
        const fadeOut = lifeRatio > 0.8 ? (1.0 - lifeRatio) / 0.2 : 1.0;
        alpha = densityT * fadeIn * fadeOut;
      } else if (this.particleTypes[i] === ParticleType.JET) {
        r = 0.0;
        g = 0.8;
        b = 1.0;
        size = 3.0 + (1.0 - lifeRatio) * 3.0;
        alpha = (1.0 - lifeRatio) * 0.9;
      } else if (this.particleTypes[i] === ParticleType.FLASH) {
        r = 1.0;
        g = 0.9;
        b = 0.6;
        size = 8.0 * (1.0 - lifeRatio);
        alpha = 1.0 - lifeRatio;
      } else {
        r = 1.0;
        g = 0.5;
        b = 0.0;
        size = 4.0;
        alpha = 1.0;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      sizes[i] = size;
      alphas[i] = alpha;
    }

    return { positions, colors, sizes, alphas, types, activeCount: count };
  }
}
