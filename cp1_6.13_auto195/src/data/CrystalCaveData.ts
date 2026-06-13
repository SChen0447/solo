import * as THREE from 'three';

export interface CrystalData {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  targetRotation: THREE.Euler;
  baseRotation: THREE.Euler;
  scale: THREE.Vector3;
  targetScale: THREE.Vector3;
  baseScale: THREE.Vector3;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  growthProgress: number;
  targetGrowthProgress: number;
  crystalType: 'hexagonal' | 'octahedron';
  height: number;
  affectedByMouse: boolean;
  isShattered: boolean;
  shatterTime: number;
}

export interface GravityFieldPoint {
  position: THREE.Vector3;
  strength: number;
  direction: THREE.Vector3;
  radius: number;
}

export interface FireflyData {
  id: number;
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  baseVelocity: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  isScared: boolean;
  scareEndTime: number;
}

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  scale: number;
}

export class CrystalCaveData {
  public caveRadius: number = 5;
  public wallTriangles: number = 500;
  public wallVertices: Float32Array;
  public wallNormals: Float32Array;
  public wallIndices: Uint32Array;

  public crystals: CrystalData[] = [];
  public minCrystals: number = 80;
  public maxCrystals: number = 120;

  public gravityField: GravityFieldPoint[] = [];
  public mouseIntersection: THREE.Vector3 | null = null;
  public mouseVelocity: THREE.Vector2 = new THREE.Vector2();
  public isMouseDown: boolean = false;
  public clickPosition: THREE.Vector3 | null = null;
  public clickTime: number = 0;

  public fireflies: FireflyData[] = [];
  public fireflyCount: number = 60;

  public particles: ParticleData[] = [];
  public maxParticles: number = 200;

  private nextCrystalId: number = 0;
  private nextFireflyId: number = 0;
  private nextParticleId: number = 0;

  constructor() {
    this.wallVertices = new Float32Array(0);
    this.wallNormals = new Float32Array(0);
    this.wallIndices = new Uint32Array(0);
    this.generateWallGeometry();
    this.generateCrystals();
    this.generateFireflies();
  }

  private generateWallGeometry(): void {
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const radius = this.caveRadius;

    const latBands = 20;
    const lonBands = 25;
    const vertexPositions: THREE.Vector3[] = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands / 2 + Math.PI / 2;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const noise = (Math.random() - 0.5) * 0.15;
        const r = radius + noise * radius;

        const x = r * cosPhi * sinTheta;
        const y = r * cosTheta;
        const z = r * sinPhi * sinTheta;

        vertexPositions.push(new THREE.Vector3(x, y, z));

        const normal = new THREE.Vector3(x, y, z).normalize();
        vertices.push(x, y, z);
        normals.push(-normal.x, -normal.y, -normal.z);
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    this.wallVertices = new Float32Array(vertices);
    this.wallNormals = new Float32Array(normals);
    this.wallIndices = new Uint32Array(indices);
  }

  private generateCrystals(): void {
    const count = Math.floor(Math.random() * (this.maxCrystals - this.minCrystals + 1)) + this.minCrystals;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 0.45 + Math.PI * 0.05;
      const phi = Math.random() * Math.PI * 2;
      const r = this.caveRadius * 0.98;

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);

      const position = new THREE.Vector3(x, y, z);
      const normal = position.clone().normalize();

      const height = Math.random() * 1.5 + 0.5;
      const width = height * (0.15 + Math.random() * 0.1);

      const baseRotation = new THREE.Euler(
        -Math.acos(normal.y) * Math.sign(normal.x || 1) + (Math.random() - 0.5) * 0.2,
        Math.atan2(normal.z, normal.x) + Math.PI / 2 + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1
      );

      const colorT = Math.random();
      const baseColor = new THREE.Color().lerpColors(
        new THREE.Color(0x7cfc00),
        new THREE.Color(0x00bfff),
        colorT
      );

      const crystal: CrystalData = {
        id: this.nextCrystalId++,
        position: position.clone(),
        rotation: baseRotation.clone(),
        targetRotation: baseRotation.clone(),
        baseRotation: baseRotation.clone(),
        scale: new THREE.Vector3(width, height * 0.3, width),
        targetScale: new THREE.Vector3(width, height * 0.3, width),
        baseScale: new THREE.Vector3(width, height * 0.3, width),
        baseColor: baseColor.clone(),
        currentColor: baseColor.clone(),
        targetColor: baseColor.clone(),
        growthProgress: 0.3 + Math.random() * 0.3,
        targetGrowthProgress: 0.3 + Math.random() * 0.3,
        crystalType: Math.random() > 0.5 ? 'hexagonal' : 'octahedron',
        height: height,
        affectedByMouse: false,
        isShattered: false,
        shatterTime: 0
      };

      this.crystals.push(crystal);
    }
  }

  private generateFireflies(): void {
    for (let i = 0; i < this.fireflyCount; i++) {
      const theta = Math.random() * Math.PI * 0.6 + Math.PI * 0.1;
      const phi = Math.random() * Math.PI * 2;
      const r = this.caveRadius * (0.25 + Math.random() * 0.5);

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta) * 0.8;
      const z = r * Math.sin(theta) * Math.sin(phi);

      const position = new THREE.Vector3(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02;

      const colorT = Math.random();
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffaa),
        new THREE.Color(0xffaa00),
        colorT
      );

      this.fireflies.push({
        id: this.nextFireflyId++,
        position: position.clone(),
        basePosition: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          (Math.random() - 0.5) * speed * 0.5,
          Math.sin(angle) * speed
        ),
        baseVelocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          (Math.random() - 0.5) * speed * 0.5,
          Math.sin(angle) * speed
        ),
        color: color,
        scale: 0.02 + Math.random() * 0.03,
        isScared: false,
        scareEndTime: 0
      });
    }
  }

  public setMouseIntersection(point: THREE.Vector3 | null): void {
    this.mouseIntersection = point;

    if (point) {
      this.updateCrystalAffectedState();
    }
  }

  private updateCrystalAffectedState(): void {
    if (!this.mouseIntersection) return;

    for (const crystal of this.crystals) {
      if (crystal.isShattered) continue;

      const distance = crystal.position.distanceTo(this.mouseIntersection);
      const wasAffected = crystal.affectedByMouse;
      crystal.affectedByMouse = distance < 2.0;

      if (crystal.affectedByMouse && !wasAffected) {
        crystal.targetGrowthProgress = Math.min(1.0, crystal.growthProgress + 0.7);
      }
    }
  }

  public triggerShatter(clickPoint: THREE.Vector3): void {
    this.clickPosition = clickPoint.clone();
    this.clickTime = performance.now();
    const radius = 3.0;

    for (const crystal of this.crystals) {
      const distance = crystal.position.distanceTo(clickPoint);
      if (distance < radius && !crystal.isShattered) {
        crystal.isShattered = true;
        crystal.shatterTime = performance.now();
        this.emitShatterParticles(crystal);
      }
    }
  }

  private emitShatterParticles(crystal: CrystalData): void {
    const count = 50;
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.0 + Math.random() * 2.0;

      this.particles.push({
        id: this.nextParticleId++,
        position: crystal.position.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(angle) * speed,
          Math.cos(phi) * speed,
          Math.sin(phi) * Math.sin(angle) * speed
        ),
        color: crystal.currentColor.clone(),
        life: 2.0,
        maxLife: 2.0,
        scale: 0.05 + Math.random() * 0.05
      });
    }
  }

  public updateGrowth(deltaTime: number): void {
    const growthSpeed = 0.1;

    for (const crystal of this.crystals) {
      if (!crystal.isShattered) {
        if (crystal.growthProgress < crystal.targetGrowthProgress) {
          crystal.growthProgress = Math.min(
            crystal.targetGrowthProgress,
            crystal.growthProgress + growthSpeed * deltaTime
          );
        }
      }

      if (crystal.isShattered) {
        const elapsed = (performance.now() - crystal.shatterTime) / 1000;
        if (elapsed >= 2.0) {
          crystal.isShattered = false;
          crystal.growthProgress = 0;
          crystal.targetGrowthProgress = 1.0;
        }
      }
    }
  }

  public updateFireflies(deltaTime: number, mousePoint: THREE.Vector3 | null): void {
    const now = performance.now();

    for (const firefly of this.fireflies) {
      if (mousePoint) {
        const distance = firefly.position.distanceTo(mousePoint);
        if (distance < 0.5 && !firefly.isScared) {
          firefly.isScared = true;
          firefly.scareEndTime = now + 500;
          const awayDir = firefly.position.clone().sub(mousePoint).normalize();
          firefly.velocity.copy(awayDir.multiplyScalar(0.2));
        }
      }

      if (firefly.isScared && now >= firefly.scareEndTime) {
        firefly.isScared = false;
        firefly.velocity.copy(firefly.baseVelocity);
      }

      firefly.position.add(firefly.velocity.clone().multiplyScalar(deltaTime * 60));

      const distFromCenter = firefly.position.length();
      if (distFromCenter > this.caveRadius * 0.85) {
        firefly.position.normalize().multiplyScalar(this.caveRadius * 0.85);
        firefly.velocity.negate();
        firefly.baseVelocity.negate();
      }

      if (firefly.position.y > this.caveRadius * 0.7) {
        firefly.position.y = this.caveRadius * 0.7;
        firefly.velocity.y = -Math.abs(firefly.velocity.y);
        firefly.baseVelocity.y = -Math.abs(firefly.baseVelocity.y);
      }
      if (firefly.position.y < -this.caveRadius * 0.3) {
        firefly.position.y = -this.caveRadius * 0.3;
        firefly.velocity.y = Math.abs(firefly.velocity.y);
        firefly.baseVelocity.y = Math.abs(firefly.baseVelocity.y);
      }
    }
  }

  public updateParticles(deltaTime: number): void {
    const gravity = -2.0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      particle.velocity.y += gravity * deltaTime;
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
    }
  }

  public calculateBendDirection(crystal: CrystalData): THREE.Vector3 | null {
    if (!this.mouseIntersection || !crystal.affectedByMouse) return null;

    const direction = new THREE.Vector3()
      .subVectors(this.mouseIntersection, crystal.position)
      .normalize();

    return direction;
  }

  public getHueShiftedColor(baseColor: THREE.Color, progress: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    hsl.h = (hsl.h + 0.25 * progress) % 1.0;
    hsl.s = Math.min(1.0, hsl.s + 0.3 * progress);

    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }
}
