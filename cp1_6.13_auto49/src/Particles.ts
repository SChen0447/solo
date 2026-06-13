import * as THREE from 'three';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  baseOffset: THREE.Vector3;
  spindleIndex: number;
}

export class Particles {
  public mesh: THREE.Points;
  private particles: ParticleData[] = [];
  private count: number = 20;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private cellRadius: number = 1;
  private phase: number = 0;
  private chromosomePositions: THREE.Vector3[] = [];
  private spindlePolePositions: THREE.Vector3[] = [];

  constructor(cellRadius: number = 1) {
    this.cellRadius = cellRadius;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      color: 0xffe082,
      size: 0.05,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.initParticles();
    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = (this.cellRadius * 0.7) * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.particles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        targetPosition: new THREE.Vector3(x, y, z),
        baseOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        spindleIndex: i
      });

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  public setChromosomePositions(positions: THREE.Vector3[]): void {
    this.chromosomePositions = positions;
  }

  public setSpindlePolePositions(positions: THREE.Vector3[]): void {
    this.spindlePolePositions = positions;
  }

  public setPhase(phase: number): void {
    this.phase = phase;
  }

  public update(deltaTime: number, speed: number = 1): void {
    const positions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i];
      const moveSpeed = 0.005 * speed * 60 * deltaTime;

      if (this.phase <= 0.2) {
        this.applyBrownianMotion(particle, moveSpeed);
        this.constrainToCell(particle);
        this.material.opacity = 0.9;
      } else if (this.phase <= 0.4) {
        const t = (this.phase - 0.2) / 0.2;
        this.applyBrownianMotion(particle, moveSpeed * (1 - t * 0.5));
        this.moveTowardsSpindle(particle, t, i);
        this.material.opacity = 0.9;
      } else if (this.phase <= 0.6) {
        const t = (this.phase - 0.4) / 0.2;
        this.arrangeOnSpindle(particle, t, i);
        this.material.opacity = 1;
      } else if (this.phase <= 0.8) {
        const t = (this.phase - 0.6) / 0.2;
        this.stretchWithChromosomes(particle, t, i);
        this.material.opacity = 1;
      } else {
        const t = (this.phase - 0.8) / 0.2;
        this.dissolveParticles(particle, t, i);
        this.material.opacity = Math.max(0, 1 - t * 1.5);
      }

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  private applyBrownianMotion(particle: ParticleData, speed: number): void {
    particle.velocity.x += (Math.random() - 0.5) * speed * 2;
    particle.velocity.y += (Math.random() - 0.5) * speed * 2;
    particle.velocity.z += (Math.random() - 0.5) * speed * 2;

    particle.velocity.multiplyScalar(0.98);

    particle.position.add(particle.velocity.clone().multiplyScalar(speed));
  }

  private constrainToCell(particle: ParticleData): void {
    const maxDist = this.cellRadius * 0.85;
    const dist = particle.position.length();

    if (dist > maxDist) {
      particle.position.normalize().multiplyScalar(maxDist * 0.95);
      particle.velocity.negate();
    }
  }

  private moveTowardsSpindle(particle: ParticleData, t: number, index: number): void {
    const poleIndex = index % 2;
    const target = this.getSpindlePoint(poleIndex, index);

    particle.position.lerp(
      target.clone().add(particle.baseOffset.clone().multiplyScalar(1 - t)),
      t * 0.02
    );
  }

  private arrangeOnSpindle(particle: ParticleData, t: number, index: number): void {
    const poleIndex = index % 2;
    const target = this.getSpindlePoint(poleIndex, index);

    particle.position.lerp(
      target.clone().add(particle.baseOffset.clone().multiplyScalar(0.1)),
      0.05
    );
  }

  private stretchWithChromosomes(particle: ParticleData, t: number, index: number): void {
    const poleIndex = index % 2;
    const baseTarget = this.getSpindlePoint(poleIndex, index);
    const stretchedTarget = baseTarget.clone();

    if (this.spindlePolePositions.length === 2) {
      const pole = this.spindlePolePositions[poleIndex];
      const stretchFactor = 0.5 * t;
      stretchedTarget.lerp(pole, stretchFactor);
    }

    particle.position.lerp(stretchedTarget, 0.05);
  }

  private dissolveParticles(particle: ParticleData, t: number, index: number): void {
    const poleIndex = index % 2;
    if (this.spindlePolePositions.length === 2) {
      const pole = this.spindlePolePositions[poleIndex];
      particle.position.lerp(pole, t * 0.1);
    }

    particle.position.x += (Math.random() - 0.5) * 0.002;
    particle.position.y += (Math.random() - 0.5) * 0.002;
    particle.position.z += (Math.random() - 0.5) * 0.002;
  }

  private getSpindlePoint(poleIndex: number, particleIndex: number): THREE.Vector3 {
    if (this.spindlePolePositions.length === 2 && this.chromosomePositions.length > 0) {
      const pole = this.spindlePolePositions[poleIndex];
      const chromoIndex = Math.floor(particleIndex / 2) % this.chromosomePositions.length;
      const chromosome = this.chromosomePositions[chromoIndex];

      const line = new THREE.Line3(pole, chromosome);
      const t = 0.3 + Math.random() * 0.6;
      const point = new THREE.Vector3();
      line.at(t, point);

      return point;
    }

    return new THREE.Vector3(
      (Math.random() - 0.5) * this.cellRadius,
      (Math.random() - 0.5) * this.cellRadius * 0.5,
      (Math.random() - 0.5) * this.cellRadius
    );
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
