import * as THREE from 'three';
import { WindField, WindVector } from './WindField';
import { BuildingData } from './CityGrid';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  trail: THREE.Vector3[];
  age: number;
  life: number;
}

export class ParticleSystem {
  public readonly group: THREE.Group;
  private particles: Particle[] = [];
  private particleCount = 300;
  private trailLength = 30;
  private worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private buildings: BuildingData[] = [];
  private windField: WindField;
  private pointsMesh!: THREE.Points;
  private trailMesh!: THREE.LineSegments;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;

  private slowColor = new THREE.Color(0x88ccff);
  private fastColor = new THREE.Color(0xffaa66);
  private pedestrianHeight = 0.5;

  constructor(scene: THREE.Scene, windField: WindField, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    this.windField = windField;
    this.worldBounds = bounds;
    this.group = new THREE.Group();
    this.group.name = 'ParticleSystem';
    scene.add(this.group);

    this.initParticles();
    this.initGeometry();
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    const rangeX = this.worldBounds.maxX - this.worldBounds.minX;
    const rangeZ = this.worldBounds.maxZ - this.worldBounds.minZ;
    const position = new THREE.Vector3(
      this.worldBounds.minX + Math.random() * rangeX,
      randomY ? this.pedestrianHeight + Math.random() * 80 : this.pedestrianHeight + Math.random() * 2,
      this.worldBounds.minZ + Math.random() * rangeZ
    );

    const trail: THREE.Vector3[] = [];
    for (let t = 0; t < this.trailLength; t++) {
      trail.push(position.clone());
    }

    return {
      position,
      velocity: new THREE.Vector3(0, 0, 0),
      trail,
      age: 0,
      life: 10 + Math.random() * 10
    };
  }

  private initGeometry(): void {
    const totalPositions = this.particleCount;
    this.positions = new Float32Array(totalPositions * 3);
    this.colors = new Float32Array(totalPositions * 3);

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.pointsMesh = new THREE.Points(particleGeo, particleMat);
    this.group.add(this.pointsMesh);

    const totalTrailVerts = this.particleCount * this.trailLength * 2;
    this.trailPositions = new Float32Array(totalTrailVerts * 3);
    this.trailColors = new Float32Array(totalTrailVerts * 3);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMesh = new THREE.LineSegments(trailGeo, trailMat);
    this.group.add(this.trailMesh);
  }

  public setBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings;
  }

  private collideWithBuildings(p: Particle): void {
    for (const b of this.buildings) {
      const halfSize = 5;
      const dx = p.position.x - b.position.x;
      const dz = p.position.z - b.position.z;
      const py = p.position.y;

      if (
        Math.abs(dx) < halfSize + 0.3 &&
        Math.abs(dz) < halfSize + 0.3 &&
        py < b.height + 1
      ) {
        const pushX = Math.abs(dx) > Math.abs(dz) ? Math.sign(dx) : 0;
        const pushZ = Math.abs(dz) >= Math.abs(dx) ? Math.sign(dz) : 0;

        if (pushX !== 0) {
          p.position.x = b.position.x + pushX * (halfSize + 0.5);
          p.velocity.x = Math.abs(p.velocity.x) * pushX * 0.3;
        }
        if (pushZ !== 0) {
          p.position.z = b.position.z + pushZ * (halfSize + 0.5);
          p.velocity.z = Math.abs(p.velocity.z) * pushZ * 0.3;
        }
        if (py > b.height - 1) {
          p.position.y = b.height + 0.5;
          p.velocity.y = 0.5;
        }
      }
    }
  }

  private sampleWindAt(pos: THREE.Vector3): WindVector {
    const sample = this.windField.sample(pos.x, pos.z);
    const heightFactor = Math.max(0.3, Math.min(1.5, 0.5 + pos.y / 60));
    return {
      x: sample.x * heightFactor,
      z: sample.z * heightFactor,
      speed: sample.speed * heightFactor
    };
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += dt;

      const wind = this.sampleWindAt(p.position);

      const accel = 8;
      p.velocity.x += (wind.x - p.velocity.x) * accel * dt;
      p.velocity.z += (wind.z - p.velocity.z) * accel * dt;
      p.velocity.y += (Math.sin(p.age * 0.5 + i) * 0.2 - p.velocity.y * 0.5) * dt;

      const maxSpeed = 6;
      const spd = p.velocity.length();
      if (spd > maxSpeed) {
        p.velocity.multiplyScalar(maxSpeed / spd);
      }

      p.position.addScaledVector(p.velocity, dt);
      this.collideWithBuildings(p);

      if (p.position.y < this.pedestrianHeight) {
        p.position.y = this.pedestrianHeight + Math.random() * 0.5;
        p.velocity.y = Math.abs(p.velocity.y) * 0.3 + 0.2;
      }
      if (p.position.y > 120) {
        p.position.y = this.pedestrianHeight + Math.random() * 2;
      }

      const pad = 3;
      if (p.position.x < this.worldBounds.minX - pad) {
        p.position.x = this.worldBounds.maxX + pad * 0.5;
        this.resetTrail(p);
      } else if (p.position.x > this.worldBounds.maxX + pad) {
        p.position.x = this.worldBounds.minX - pad * 0.5;
        this.resetTrail(p);
      }
      if (p.position.z < this.worldBounds.minZ - pad) {
        p.position.z = this.worldBounds.maxZ + pad * 0.5;
        this.resetTrail(p);
      } else if (p.position.z > this.worldBounds.maxZ + pad) {
        p.position.z = this.worldBounds.minZ - pad * 0.5;
        this.resetTrail(p);
      }

      if (p.age > p.life) {
        Object.assign(p, this.createParticle());
      }

      for (let t = this.trailLength - 1; t > 0; t--) {
        p.trail[t].copy(p.trail[t - 1]);
      }
      p.trail[0].copy(p.position);
    }

    this.updateBuffers();
  }

  private resetTrail(p: Particle): void {
    for (let t = 0; t < this.trailLength; t++) {
      p.trail[t].copy(p.position);
    }
  }

  private speedToColor(speed: number, alpha: number = 1): THREE.Color {
    const t = Math.min(1, Math.max(0, (speed - 0.5) / 4));
    const c = new THREE.Color();
    c.copy(this.slowColor).lerp(this.fastColor, t);
    return c;
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const speed = p.velocity.length();
      const color = this.speedToColor(speed);

      const pi = i * 3;
      this.positions[pi] = p.position.x;
      this.positions[pi + 1] = p.position.y;
      this.positions[pi + 2] = p.position.z;

      this.colors[pi] = color.r;
      this.colors[pi + 1] = color.g;
      this.colors[pi + 2] = color.b;

      for (let t = 0; t < this.trailLength - 1; t++) {
        const ti = (i * this.trailLength + t) * 2 * 3;
        const a1 = t / this.trailLength;
        const trailColor = this.speedToColor(speed, a1);

        this.trailPositions[ti] = p.trail[t].x;
        this.trailPositions[ti + 1] = p.trail[t].y;
        this.trailPositions[ti + 2] = p.trail[t].z;
        this.trailPositions[ti + 3] = p.trail[t + 1].x;
        this.trailPositions[ti + 4] = p.trail[t + 1].y;
        this.trailPositions[ti + 5] = p.trail[t + 1].z;

        const alpha = 1 - t / this.trailLength;
        this.trailColors[ti] = trailColor.r * alpha;
        this.trailColors[ti + 1] = trailColor.g * alpha;
        this.trailColors[ti + 2] = trailColor.b * alpha;
        this.trailColors[ti + 3] = trailColor.r * alpha * 0.8;
        this.trailColors[ti + 4] = trailColor.g * alpha * 0.8;
        this.trailColors[ti + 5] = trailColor.b * alpha * 0.8;
      }
    }

    (this.pointsMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.pointsMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.trailMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trailMesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public setOpacity(opacity: number): void {
    (this.pointsMesh.material as THREE.PointsMaterial).opacity = opacity * 0.85;
    (this.trailMesh.material as THREE.LineBasicMaterial).opacity = opacity * 0.35;
  }
}
