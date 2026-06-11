import * as THREE from 'three';

export interface FluidSystemOptions {
  particleCount?: number;
  minRadius?: number;
  maxRadius?: number;
  springStiffness?: number;
  dipoleStrength?: number;
  restDensity?: number;
  dishRadius?: number;
  gravity?: number;
}

interface Particle {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  force: THREE.Vector3;
  radius: number;
  mass: number;
  neighborIndices: number[];
  detached: boolean;
  detachTimer: number;
}

interface Spring {
  a: number;
  b: number;
  restLength: number;
  stiffness: number;
  active: boolean;
  fatigue: number;
}

export class FluidSystem {
  private particles: Particle[] = [];
  private springs: Spring[] = [];
  private particleCount: number;
  private minRadius: number;
  private maxRadius: number;
  private springStiffness: number;
  private dipoleStrength: number;
  private restDensity: number;
  private dishRadius: number;
  private gravity: number;
  private bounds: { min: THREE.Vector3; max: THREE.Vector3 };

  private dipoleStrengthTarget: number;
  private viscosityTarget: number;

  private magneticFieldDir: THREE.Vector3 = new THREE.Vector3();
  private tempVec1: THREE.Vector3 = new THREE.Vector3();
  private tempVec2: THREE.Vector3 = new THREE.Vector3();
  private tempVec3: THREE.Vector3 = new THREE.Vector3();

  private positionBuffer: Float32Array;
  private scaleBuffer: Float32Array;

  private polarOscillation: number = 0;
  private polarOscillationActive: boolean = false;

  private activeUpdateRadius: number = 5.0;

  constructor(options: FluidSystemOptions = {}) {
    this.particleCount = options.particleCount ?? 300;
    this.minRadius = options.minRadius ?? 0.05;
    this.maxRadius = options.maxRadius ?? 0.2;
    this.springStiffness = options.springStiffness ?? 1.5;
    this.dipoleStrength = options.dipoleStrength ?? 0.6;
    this.dipoleStrengthTarget = this.dipoleStrength;
    this.viscosityTarget = 0.5;
    this.restDensity = options.restDensity ?? 0.3;
    this.dishRadius = options.dishRadius ?? 3.8;
    this.gravity = options.gravity ?? 4.0;

    this.bounds = {
      min: new THREE.Vector3(-this.dishRadius, -0.05, -this.dishRadius),
      max: new THREE.Vector3(this.dishRadius, 3.0, this.dishRadius)
    };

    this.positionBuffer = new Float32Array(this.particleCount * 3);
    this.scaleBuffer = new Float32Array(this.particleCount);

    this.initializeParticles();
    this.initializeSprings();
  }

  private initializeParticles(): void {
    this.particles = [];
    const blobRadius = 1.2;

    for (let i = 0; i < this.particleCount; i++) {
      const radius = this.minRadius + Math.random() * (this.maxRadius - this.minRadius);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = blobRadius * Math.cbrt(Math.random() * 0.8 + 0.2);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = 0.1 + r * Math.cos(phi) * 0.3;
      const z = r * Math.sin(phi) * Math.sin(theta);

      const position = new THREE.Vector3(x, y, z);
      const jitter = 0.05;
      position.x += (Math.random() - 0.5) * jitter;
      position.y += (Math.random() - 0.5) * jitter;
      position.z += (Math.random() - 0.5) * jitter;

      this.particles.push({
        position: position.clone(),
        prevPosition: position.clone(),
        velocity: new THREE.Vector3(),
        force: new THREE.Vector3(),
        radius,
        mass: radius * radius * radius * 100,
        neighborIndices: [],
        detached: false,
        detachTimer: 0
      });

      this.scaleBuffer[i] = radius * 1.2;
    }

    this.updatePositionBuffer();
  }

  private initializeSprings(): void {
    this.springs = [];
    const connectionRadius = 0.5;
    const connectionRadiusSq = connectionRadius * connectionRadius;
    const maxConnections = 8;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = this.particles[i];
      const distances: { idx: number; dist: number }[] = [];

      for (let j = i + 1; j < this.particleCount; j++) {
        const pj = this.particles[j];
        const dx = pj.position.x - pi.position.x;
        const dy = pj.position.y - pi.position.y;
        const dz = pj.position.z - pi.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < connectionRadiusSq) {
          distances.push({ idx: j, dist: Math.sqrt(distSq) });
        }
      }

      distances.sort((a, b) => a.dist - b.dist);
      const connected = Math.min(maxConnections, distances.length);

      for (let k = 0; k < connected; k++) {
        const j = distances[k].idx;
        const dist = distances[k].dist;

        this.springs.push({
          a: i,
          b: j,
          restLength: dist * 0.85,
          stiffness: this.springStiffness * (0.5 + Math.random() * 0.5),
          active: true,
          fatigue: 0
        });

        if (this.particles[i].neighborIndices.length < maxConnections) {
          this.particles[i].neighborIndices.push(j);
        }
        if (this.particles[j].neighborIndices.length < maxConnections) {
          this.particles[j].neighborIndices.push(i);
        }
      }
    }
  }

  public update(
    magnetPos: THREE.Vector3,
    magnetStrength: number,
    viscosity: number,
    dt: number = 1 / 60
  ): void {
    const clampedDt = Math.min(dt, 1 / 30);
    const subSteps = 2;
    const subDt = clampedDt / subSteps;

    const smoothing = 1 - Math.pow(0.001, clampedDt);
    this.dipoleStrength += (this.dipoleStrengthTarget - this.dipoleStrength) * smoothing;

    if (this.polarOscillationActive) {
      this.polarOscillation += clampedDt;
      if (this.polarOscillation > 0.5) {
        this.polarOscillationActive = false;
        this.polarOscillation = 0;
      }
    }

    for (let step = 0; step < subSteps; step++) {
      this.stepSimulation(magnetPos, magnetStrength, viscosity, subDt);
    }
  }

  private stepSimulation(
    magnetPos: THREE.Vector3,
    magnetStrength: number,
    viscosity: number,
    dt: number
  ): void {
    this.computeMagneticForces(magnetPos, magnetStrength);
    this.computeSpringForces();
    this.computeDipoleForces();
    this.computeCollisionForces();
    this.integrate(viscosity, dt);
    this.enforceBoundaryCollisions();
    this.updateDetachment(magnetPos, dt);
  }

  private computeMagneticForces(
    magnetPos: THREE.Vector3,
    magnetStrength: number
  ): void {
    const activeRadiusSq = this.activeUpdateRadius * this.activeUpdateRadius;
    const maxForce = 25.0 * magnetStrength;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      const dx = magnetPos.x - p.position.x;
      const dy = magnetPos.y - p.position.y;
      const dz = magnetPos.z - p.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq) + 0.01;

      if (distSq > activeRadiusSq && !p.detached) {
        this.tempVec1.set(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        );
        p.force.add(this.tempVec1);
        continue;
      }

      this.tempVec1.set(dx / dist, dy / dist, dz / dist);

      let forceMag = (magnetStrength * this.dipoleStrength * 3.0) / (distSq + 0.1);

      if (this.polarOscillationActive) {
        const oscPhase = this.polarOscillation * Math.PI * 8;
        forceMag *= 1 + Math.sin(oscPhase) * 0.5 * Math.exp(-this.polarOscillation * 4);
      }

      forceMag = Math.min(forceMag, maxForce);

      if (dist < 0.5) {
        const spikeBoost = 1 + (0.5 - dist) * 4;
        forceMag *= spikeBoost;
      }

      this.tempVec1.multiplyScalar(forceMag);

      const distWeight = Math.max(0, 1 - dist / this.activeUpdateRadius);
      this.tempVec1.multiplyScalar(p.mass * (0.5 + distWeight * 1.5));

      p.force.add(this.tempVec1);
    }
  }

  private computeSpringForces(): void {
    const maxSpringForce = 8.0;

    for (const spring of this.springs) {
      if (!spring.active) continue;

      const pa = this.particles[spring.a];
      const pb = this.particles[spring.b];

      const dx = pb.position.x - pa.position.x;
      const dy = pb.position.y - pa.position.y;
      const dz = pb.position.z - pa.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001;

      const displacement = dist - spring.restLength;

      let forceMag = -spring.stiffness * displacement;
      forceMag = Math.max(-maxSpringForce, Math.min(maxSpringForce, forceMag));

      const invDist = 1 / dist;
      const fx = forceMag * dx * invDist;
      const fy = forceMag * dy * invDist;
      const fz = forceMag * dz * invDist;

      pa.force.x -= fx;
      pa.force.y -= fy;
      pa.force.z -= fz;
      pb.force.x += fx;
      pb.force.y += fy;
      pb.force.z += fz;

      if (Math.abs(displacement) > spring.restLength * 1.2) {
        spring.fatigue += Math.abs(displacement) * 0.01;
        if (spring.fatigue > 2.0) {
          spring.active = false;
        }
      } else if (spring.fatigue > 0) {
        spring.fatigue *= 0.99;
      }
    }
  }

  private computeDipoleForces(): void {
    const dipoleRadius = 0.6;
    const dipoleRadiusSq = dipoleRadius * dipoleRadius;
    const maxDipoleForce = 3.0;
    const interactionStrength = this.dipoleStrength * 0.3;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = this.particles[i];

      for (const j of pi.neighborIndices) {
        if (j <= i) continue;

        const pj = this.particles[j];

        const dx = pj.position.x - pi.position.x;
        const dy = pj.position.y - pi.position.y;
        const dz = pj.position.z - pi.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > dipoleRadiusSq) continue;

        const dist = Math.sqrt(distSq) + 0.01;
        const invDist2 = 1 / (distSq + 0.02);

        const contactDist = (pi.radius + pj.radius) * 1.2;

        let forceMag: number;
        if (dist < contactDist) {
          const overlap = (contactDist - dist) / contactDist;
          forceMag = -overlap * 8.0;
        } else {
          forceMag = interactionStrength * (invDist2 - 1 / (dipoleRadiusSq));
          forceMag = Math.max(-maxDipoleForce, Math.min(maxDipoleForce, forceMag));
        }

        const invDist = 1 / dist;
        const fx = forceMag * dx * invDist;
        const fy = forceMag * dy * invDist;
        const fz = forceMag * dz * invDist;

        const massFactor = (pi.mass + pj.mass) * 0.5;
        pi.force.x += fx * massFactor;
        pi.force.y += fy * massFactor;
        pi.force.z += fz * massFactor;
        pj.force.x -= fx * massFactor;
        pj.force.y -= fy * massFactor;
        pj.force.z -= fz * massFactor;
      }
    }
  }

  private computeCollisionForces(): void {
    const repelRadius = 0.25;
    const repelRadiusSq = repelRadius * repelRadius;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = this.particles[i];

      for (const j of pi.neighborIndices) {
        if (j <= i) continue;

        const pj = this.particles[j];
        const minDist = (pi.radius + pj.radius) * 0.9;
        const minDistSq = minDist * minDist;

        const dx = pj.position.x - pi.position.x;
        const dy = pj.position.y - pi.position.y;
        const dz = pj.position.z - pi.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < minDistSq && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / minDist;
          const forceMag = overlap * overlap * 15.0;

          const invDist = 1 / dist;
          const fx = forceMag * dx * invDist;
          const fy = forceMag * dy * invDist;
          const fz = forceMag * dz * invDist;

          pi.force.x -= fx;
          pi.force.y -= fy;
          pi.force.z -= fz;
          pj.force.x += fx;
          pj.force.y += fy;
          pj.force.z += fz;
        }
      }
    }
  }

  private integrate(viscosity: number, dt: number): void {
    const damping = Math.pow(1.0 - viscosity, dt * 60);

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      p.force.y -= this.gravity * p.mass;

      const ax = p.force.x / p.mass;
      const ay = p.force.y / p.mass;
      const az = p.force.z / p.mass;

      p.velocity.x = (p.velocity.x + ax * dt) * damping;
      p.velocity.y = (p.velocity.y + ay * dt) * damping;
      p.velocity.z = (p.velocity.z + az * dt) * damping;

      const maxSpeed = p.detached ? 3.0 : 2.0;
      const speedSq =
        p.velocity.x * p.velocity.x +
        p.velocity.y * p.velocity.y +
        p.velocity.z * p.velocity.z;

      if (speedSq > maxSpeed * maxSpeed) {
        const invSpeed = maxSpeed / Math.sqrt(speedSq);
        p.velocity.multiplyScalar(invSpeed);
      }

      p.prevPosition.copy(p.position);
      p.position.addScaledVector(p.velocity, dt);

      p.force.set(0, 0, 0);
    }
  }

  private enforceBoundaryCollisions(): void {
    const r = this.dishRadius - 0.05;
    const restitution = 0.6;
    const floorY = 0.02;
    const ceilingY = 4.0;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      const horizDist = Math.sqrt(
        p.position.x * p.position.x + p.position.z * p.position.z
      );

      if (horizDist > r) {
        const invH = 1 / (horizDist + 0.0001);
        const nx = p.position.x * invH;
        const nz = p.position.z * invH;

        p.position.x = nx * r;
        p.position.z = nz * r;

        const dotProduct = p.velocity.x * nx + p.velocity.z * nz;
        if (dotProduct > 0) {
          p.velocity.x -= (1 + restitution) * dotProduct * nx;
          p.velocity.z -= (1 + restitution) * dotProduct * nz;
          p.velocity.multiplyScalar(0.8);
        }
      }

      if (p.position.y < floorY) {
        p.position.y = floorY;
        if (p.velocity.y < 0) {
          p.velocity.y *= -restitution;
          p.velocity.x *= 0.9;
          p.velocity.z *= 0.9;
        }
      }

      if (p.position.y > ceilingY) {
        p.position.y = ceilingY;
        if (p.velocity.y > 0) {
          p.velocity.y *= -restitution;
        }
      }
    }
  }

  private updateDetachment(magnetPos: THREE.Vector3, dt: number): void {
    const detachThreshold = 0.8;
    const attractRadius = 1.5;
    const reattachRadius = 0.8;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      const dx = magnetPos.x - p.position.x;
      const dz = magnetPos.z - p.position.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      if (p.detached) {
        p.detachTimer -= dt;

        const distToCenter = Math.sqrt(
          p.position.x * p.position.x +
          p.position.z * p.position.z
        );

        if (distToCenter < 1.5 && p.position.y < 0.5) {
          const speed = p.velocity.length();
          if (speed < 0.5 || p.detachTimer <= 0) {
            p.detached = false;
          }
        }

        if (horizDist < attractRadius && Math.abs(magnetPos.y - p.position.y) < 2) {
          p.detachTimer = 2.0;
        }

        if (p.detachTimer <= 0 && p.position.y < 0.3) {
          p.detached = false;
        }
      } else {
        const stretchEstimate = this.computeParticleStretch(i);

        if (stretchEstimate > detachThreshold * 1.5 ||
          (stretchEstimate > detachThreshold && horizDist < 2)) {
          p.detached = true;
          p.detachTimer = 3.0;

          const direction = new THREE.Vector3(
            magnetPos.x - p.position.x,
            magnetPos.y - p.position.y,
            magnetPos.z - p.position.z
          ).normalize();

          const launchSpeed = 1.5 + Math.random() * 0.5;
          p.velocity.add(direction.multiplyScalar(launchSpeed));

          this.breakParticleSprings(i);
        }
      }
    }
  }

  private computeParticleStretch(idx: number): number {
    const p = this.particles[idx];
    let totalStretch = 0;
    let count = 0;

    for (const j of p.neighborIndices) {
      const pj = this.particles[j];
      const dx = pj.position.x - p.position.x;
      const dy = pj.position.y - p.position.y;
      const dz = pj.position.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      for (const spring of this.springs) {
        if ((spring.a === idx && spring.b === j) ||
          (spring.a === j && spring.b === idx)) {
          if (spring.active && spring.restLength > 0) {
            totalStretch += Math.abs(dist - spring.restLength) / spring.restLength;
            count++;
          }
          break;
        }
      }
    }

    return count > 0 ? totalStretch / count : 0;
  }

  private breakParticleSprings(idx: number): void {
    for (const spring of this.springs) {
      if ((spring.a === idx || spring.b === idx) && spring.active) {
        spring.fatigue += 1.5;
        if (spring.fatigue > 1.0) {
          spring.active = false;
        }
      }
    }
  }

  public getParticles(): Float32Array {
    this.updatePositionBuffer();
    return this.positionBuffer;
  }

  public getScales(): Float32Array {
    return this.scaleBuffer;
  }

  private updatePositionBuffer(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const ix = i * 3;
      this.positionBuffer[ix] = p.position.x;
      this.positionBuffer[ix + 1] = p.position.y;
      this.positionBuffer[ix + 2] = p.position.z;
    }
  }

  public setDipoleStrength(strength: number): void {
    this.dipoleStrengthTarget = THREE.MathUtils.clamp(strength, 0.3, 1.0);
  }

  public triggerPolaritySwap(): void {
    this.polarOscillation = 0;
    this.polarOscillationActive = true;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const shock = 0.3 + Math.random() * 0.4;
      p.velocity.x += (Math.random() - 0.5) * shock;
      p.velocity.y += shock * 0.8;
      p.velocity.z += (Math.random() - 0.5) * shock;
    }
  }

  public isNearMagnet(
    particlePos: THREE.Vector3,
    magnetPos: THREE.Vector3,
    threshold: number = 2.0
  ): boolean {
    const dx = particlePos.x - magnetPos.x;
    const dy = particlePos.y - magnetPos.y;
    const dz = particlePos.z - magnetPos.z;
    return dx * dx + dy * dy + dz * dz < threshold * threshold;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public recomputeNeighbors(): void {
    const neighborRadius = 0.5;
    const neighborRadiusSq = neighborRadius * neighborRadius;
    const maxNeighbors = 8;

    for (let i = 0; i < this.particleCount; i++) {
      const pi = this.particles[i];
      pi.neighborIndices.length = 0;

      const candidates: { idx: number; distSq: number }[] = [];

      for (let j = 0; j < this.particleCount; j++) {
        if (j === i) continue;
        const pj = this.particles[j];
        const dx = pj.position.x - pi.position.x;
        const dy = pj.position.y - pi.position.y;
        const dz = pj.position.z - pi.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < neighborRadiusSq) {
          candidates.push({ idx: j, distSq });
        }
      }

      candidates.sort((a, b) => a.distSq - b.distSq);

      for (let k = 0; k < Math.min(maxNeighbors, candidates.length); k++) {
        pi.neighborIndices.push(candidates[k].idx);
      }
    }

    for (const spring of this.springs) {
      if (spring.fatigue < 0.5) {
        spring.active = true;
      }
    }
  }
}
