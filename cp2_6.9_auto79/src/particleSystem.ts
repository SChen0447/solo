import * as THREE from 'three';
import { WindField, Building } from './windField';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  birthTime: number;
  lifeTime: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private windField: WindField;
  private buildings: Building[] = [];
  private particles: Particle[] = [];
  private particleCount: number = 500;
  private targetCount: number = 500;
  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private boundary: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  private speeds: number[] = [];
  private currentMaxSpeed: number = 0;
  private currentAvgSpeed: number = 0;

  constructor(scene: THREE.Scene, windField: WindField) {
    this.scene = scene;
    this.windField = windField;
    this.boundary = {
      minX: -150,
      maxX: 150,
      minZ: -150,
      maxZ: 150,
      minY: 0,
      maxY: 100
    };
    this.initParticles();
    this.createPointsMesh();
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }

  setParticleCount(count: number): void {
    this.targetCount = count;
    this.adjustParticleCount();
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getAverageSpeed(): number {
    return this.currentAvgSpeed;
  }

  getMaxSpeed(): number {
    return this.currentMaxSpeed;
  }

  getParticlePositions(): Float32Array | null {
    return this.positions;
  }

  getParticleSpeeds(): number[] {
    return this.speeds;
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
    this.speeds = new Array(this.particleCount).fill(0);
  }

  private createParticle(randomStart: boolean = false): Particle {
    const params = this.windField.getParams();
    const dirRad = THREE.MathUtils.degToRad(params.direction);
    
    let x: number, z: number, y: number;
    
    if (randomStart) {
      x = THREE.MathUtils.randFloat(this.boundary.minX, this.boundary.maxX);
      z = THREE.MathUtils.randFloat(this.boundary.minZ, this.boundary.maxZ);
      y = THREE.MathUtils.randFloat(1, 60);
    } else {
      const spawnMargin = 20;
      const perpX = -Math.sin(dirRad);
      const perpZ = -Math.cos(dirRad);
      const offset = THREE.MathUtils.randFloat(-80, 80);
      
      x = -Math.cos(dirRad) * spawnMargin + perpX * offset;
      z = Math.sin(dirRad) * spawnMargin + perpZ * offset;
      y = THREE.MathUtils.randFloat(1, 60);
    }

    return {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(0, 0, 0),
      birthTime: performance.now() - THREE.MathUtils.randFloat(0, 10000),
      lifeTime: 10000,
      active: true
    };
  }

  private adjustParticleCount(): void {
    if (this.targetCount === this.particleCount) return;

    if (this.targetCount > this.particleCount) {
      const diff = this.targetCount - this.particleCount;
      for (let i = 0; i < diff; i++) {
        this.particles.push(this.createParticle(false));
        this.speeds.push(0);
      }
    } else {
      this.particles.length = this.targetCount;
      this.speeds.length = this.targetCount;
    }
    
    this.particleCount = this.targetCount;
    this.createPointsMesh();
  }

  private createPointsMesh(): void {
    if (this.points) {
      this.scene.remove(this.points);
      if (this.points.geometry) this.points.geometry.dispose();
      if (this.points.material) (this.points.material as THREE.Material).dispose();
    }

    this.positions = new Float32Array(this.particleCount * 3);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  update(time: number, deltaTime: number): void {
    const dt = Math.min(deltaTime / 1000, 1 / 30);
    let totalSpeed = 0;
    let maxSpeed = 0;
    const tempVel = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      
      const age = time - particle.birthTime;
      if (age > particle.lifeTime || this.isOutOfBounds(particle.position)) {
        const newParticle = this.createParticle(false);
        particle.position.copy(newParticle.position);
        particle.velocity.copy(newParticle.velocity);
        particle.birthTime = time;
      }

      this.windField.getWindVelocity(particle.position, tempVel);
      particle.velocity.lerp(tempVel, 0.3);

      this.resolveBuildingCollision(particle);

      particle.position.addScaledVector(particle.velocity, dt);

      if (particle.position.y < 0.5) {
        particle.position.y = 0.5;
        particle.velocity.y = Math.abs(particle.velocity.y) * 0.3;
      }

      if (this.positions) {
        this.positions[i * 3] = particle.position.x;
        this.positions[i * 3 + 1] = particle.position.y;
        this.positions[i * 3 + 2] = particle.position.z;
      }

      const speed = particle.velocity.length();
      this.speeds[i] = speed;
      totalSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
    }

    if (this.points && this.points.geometry) {
      const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
    }

    this.currentAvgSpeed = this.particleCount > 0 ? totalSpeed / this.particleCount : 0;
    this.currentMaxSpeed = maxSpeed;
  }

  private isOutOfBounds(pos: THREE.Vector3): boolean {
    return (
      pos.x < this.boundary.minX - 20 ||
      pos.x > this.boundary.maxX + 20 ||
      pos.z < this.boundary.minZ - 20 ||
      pos.z > this.boundary.maxZ + 20 ||
      pos.y > this.boundary.maxY + 20
    );
  }

  private resolveBuildingCollision(particle: Particle): void {
    for (const building of this.buildings) {
      const b = building;
      const halfW = b.width / 2;
      const halfD = b.depth / 2;
      const minX = b.position.x - halfW;
      const maxX = b.position.x + halfW;
      const minZ = b.position.z - halfD;
      const maxZ = b.position.z + halfD;
      const maxY = b.height;

      const pos = particle.position;
      const margin = 0.5;

      if (
        pos.x > minX - margin && pos.x < maxX + margin &&
        pos.z > minZ - margin && pos.z < maxZ + margin &&
        pos.y < maxY + margin
      ) {
        const dxLeft = pos.x - minX;
        const dxRight = maxX - pos.x;
        const dzFront = pos.z - minZ;
        const dzBack = maxZ - pos.z;
        const dyTop = maxY - pos.y;

        const minDist = Math.min(dxLeft, dxRight, dzFront, dzBack, dyTop);

        if (minDist === dxLeft) {
          pos.x = minX - margin;
          particle.velocity.x = -Math.abs(particle.velocity.x) * 0.5;
        } else if (minDist === dxRight) {
          pos.x = maxX + margin;
          particle.velocity.x = Math.abs(particle.velocity.x) * 0.5;
        } else if (minDist === dzFront) {
          pos.z = minZ - margin;
          particle.velocity.z = -Math.abs(particle.velocity.z) * 0.5;
        } else if (minDist === dzBack) {
          pos.z = maxZ + margin;
          particle.velocity.z = Math.abs(particle.velocity.z) * 0.5;
        } else {
          pos.y = maxY + margin;
          particle.velocity.y = Math.abs(particle.velocity.y) * 0.3;
        }

        const tangent = new THREE.Vector3(particle.velocity.z, 0, -particle.velocity.x).normalize();
        particle.velocity.addScaledVector(tangent, particle.velocity.length() * 0.3);
      }
    }
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      if (this.points.geometry) this.points.geometry.dispose();
      if (this.points.material) (this.points.material as THREE.Material).dispose();
    }
  }
}
