import * as THREE from 'three';
import gsap from 'gsap';

export interface ParticleSystemOptions {
  count?: number;
  radius?: number;
  colorStart?: string;
  colorEnd?: string;
}

interface ParticleData {
  initialPosition: Float32Array;
  velocity: Float32Array;
  sizeBase: Float32Array;
  alphaPhase: Float32Array;
  alphaSpeed: Float32Array;
  noiseOffset: Float32Array;
}

export class ParticleSystem {
  public readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;

  private readonly count: number;
  private readonly radius: number;
  private readonly colorStart: THREE.Color;
  private readonly colorEnd: THREE.Color;

  private readonly positions: THREE.BufferAttribute;
  private readonly colors: THREE.BufferAttribute;
  private readonly sizes: THREE.BufferAttribute;

  private readonly particleData: ParticleData;

  private gravityPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private gravityActive: boolean = false;
  private gravityStrength: number = 2.5;

  private explosionActive: boolean = false;
  private explosionCenter: THREE.Vector3 = new THREE.Vector3();
  private explosionProgress: number = 0;

  private readonly noiseAmplitude: number = 0.01;
  private readonly noiseFrequency: number = 0.5;
  private time: number = 0;

  private readonly returnSpeed: number = 0.8;

  constructor(options: ParticleSystemOptions = {}) {
    this.count = options.count ?? 5000;
    this.radius = options.radius ?? 4;
    this.colorStart = new THREE.Color(options.colorStart ?? '#667eea');
    this.colorEnd = new THREE.Color(options.colorEnd ?? '#f093fb');

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const positionArray = new Float32Array(this.count * 3);
    const colorArray = new Float32Array(this.count * 3);
    const sizeArray = new Float32Array(this.count);

    this.particleData = {
      initialPosition: new Float32Array(this.count * 3),
      velocity: new Float32Array(this.count * 3),
      sizeBase: new Float32Array(this.count),
      alphaPhase: new Float32Array(this.count),
      alphaSpeed: new Float32Array(this.count),
      noiseOffset: new Float32Array(this.count * 3),
    };

    this.initializeParticles(positionArray, colorArray, sizeArray);

    this.positions = new THREE.BufferAttribute(positionArray, 3);
    this.colors = new THREE.BufferAttribute(colorArray, 3);
    this.sizes = new THREE.BufferAttribute(sizeArray, 1);

    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('color', this.colors);
    this.geometry.setAttribute('size', this.sizes);

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initializeParticles(
    positionArray: Float32Array,
    colorArray: Float32Array,
    sizeArray: Float32Array
  ): void {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.radius * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positionArray[i3] = x;
      positionArray[i3 + 1] = y;
      positionArray[i3 + 2] = z;

      this.particleData.initialPosition[i3] = x;
      this.particleData.initialPosition[i3 + 1] = y;
      this.particleData.initialPosition[i3 + 2] = z;

      this.particleData.velocity[i3] = 0;
      this.particleData.velocity[i3 + 1] = 0;
      this.particleData.velocity[i3 + 2] = 0;

      const distRatio = r / this.radius;
      const color = new THREE.Color().lerpColors(
        this.colorStart,
        this.colorEnd,
        distRatio
      );
      colorArray[i3] = color.r;
      colorArray[i3 + 1] = color.g;
      colorArray[i3 + 2] = color.b;

      const size = 0.1 + Math.random() * 0.4;
      this.particleData.sizeBase[i] = size;
      sizeArray[i] = size;

      this.particleData.alphaPhase[i] = Math.random() * Math.PI * 2;
      this.particleData.alphaSpeed[i] = 2 + Math.random() * 3;

      this.particleData.noiseOffset[i3] = Math.random() * 1000;
      this.particleData.noiseOffset[i3 + 1] = Math.random() * 1000;
      this.particleData.noiseOffset[i3 + 2] = Math.random() * 1000;
    }
  }

  public setGravityPoint(point: THREE.Vector3, active: boolean): void {
    this.gravityPoint.copy(point);
    this.gravityActive = active;
  }

  public triggerExplosion(center: THREE.Vector3): void {
    this.explosionCenter.copy(center);
    this.explosionActive = true;
    this.explosionProgress = 0;

    gsap.to(this, {
      explosionProgress: 1,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        this.explosionActive = false;
      },
    });

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const px = this.positions.array[i3] as number;
      const py = this.positions.array[i3 + 1] as number;
      const pz = this.positions.array[i3 + 2] as number;

      let dx = px - center.x;
      let dy = py - center.y;
      let dz = pz - center.z;
      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.001) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        dx = Math.sin(phi) * Math.cos(theta);
        dy = Math.sin(phi) * Math.sin(theta);
        dz = Math.cos(phi);
        dist = 1;
      }

      const invDist = 1 / dist;
      const explosionRadius = 6 + Math.random() * 2;
      const factor = explosionRadius / Math.max(dist, 0.5);

      this.particleData.velocity[i3] = dx * invDist * factor * 4;
      this.particleData.velocity[i3 + 1] = dy * invDist * factor * 4;
      this.particleData.velocity[i3 + 2] = dz * invDist * factor * 4;
    }
  }

  private static pseudoNoise(x: number, y: number, z: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const dt = Math.min(deltaTime, 0.05);
    const posArray = this.positions.array as Float32Array;
    const colorArray = this.colors.array as Float32Array;
    const sizeArray = this.sizes.array as Float32Array;

    const noiseT = this.time * this.noiseFrequency;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      let px = posArray[i3];
      let py = posArray[i3 + 1];
      let pz = posArray[i3 + 2];

      let vx = this.particleData.velocity[i3];
      let vy = this.particleData.velocity[i3 + 1];
      let vz = this.particleData.velocity[i3 + 2];

      if (this.gravityActive && !this.explosionActive) {
        const dx = this.gravityPoint.x - px;
        const dy = this.gravityPoint.y - py;
        const dz = this.gravityPoint.z - pz;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) + 0.001;

        if (dist > 0.15) {
          const invDist = 1 / dist;
          const strength = this.gravityStrength / Math.max(distSq * 0.5, 0.3);

          const attractX = dx * invDist * strength * dt;
          const attractY = dy * invDist * strength * dt;
          const attractZ = dz * invDist * strength * dt;

          vx += attractX;
          vy += attractY;
          vz += attractZ;

          if (dist < 2.5) {
            const tangentX = -dz * invDist;
            const tangentY = 0;
            const tangentZ = dx * invDist;

            const upX = dy * invDist * tangentZ - dz * invDist * tangentY;
            const upY = dz * invDist * tangentX - dx * invDist * tangentZ;
            const upZ = dx * invDist * tangentY - dy * invDist * tangentX;

            const orbitStrength = (2.5 - dist) * 0.8 * dt;
            vx += (tangentX + upX * 0.3) * orbitStrength;
            vy += (tangentY + upY * 0.3) * orbitStrength;
            vz += (tangentZ + upZ * 0.3) * orbitStrength;
          }
        }
      } else if (!this.explosionActive) {
        const initX = this.particleData.initialPosition[i3];
        const initY = this.particleData.initialPosition[i3 + 1];
        const initZ = this.particleData.initialPosition[i3 + 2];

        vx += (initX - px) * this.returnSpeed * dt;
        vy += (initY - py) * this.returnSpeed * dt;
        vz += (initZ - pz) * this.returnSpeed * dt;
      }

      const damping = this.explosionActive ? 0.995 : 0.92;
      vx *= damping;
      vy *= damping;
      vz *= damping;

      if (this.explosionActive && this.explosionProgress > 0.6) {
        const initX = this.particleData.initialPosition[i3];
        const initY = this.particleData.initialPosition[i3 + 1];
        const initZ = this.particleData.initialPosition[i3 + 2];
        const pullStrength = (this.explosionProgress - 0.6) * 6 * dt;
        vx += (initX - px) * pullStrength;
        vy += (initY - py) * pullStrength;
        vz += (initZ - pz) * pullStrength;
      }

      const ox = this.particleData.noiseOffset[i3];
      const oy = this.particleData.noiseOffset[i3 + 1];
      const oz = this.particleData.noiseOffset[i3 + 2];

      const noiseX = ParticleSystem.pseudoNoise(noiseT + ox, oy, oz);
      const noiseY = ParticleSystem.pseudoNoise(ox, noiseT + oy, oz);
      const noiseZ = ParticleSystem.pseudoNoise(ox, oy, noiseT + oz);

      px += vx * dt + noiseX * this.noiseAmplitude;
      py += vy * dt + noiseY * this.noiseAmplitude;
      pz += vz * dt + noiseZ * this.noiseAmplitude;

      posArray[i3] = px;
      posArray[i3 + 1] = py;
      posArray[i3 + 2] = pz;

      this.particleData.velocity[i3] = vx;
      this.particleData.velocity[i3 + 1] = vy;
      this.particleData.velocity[i3 + 2] = vz;

      const r = Math.sqrt(px * px + py * py + pz * pz);
      const distRatio = Math.min(r / this.radius, 1);
      const baseColor = new THREE.Color().lerpColors(
        this.colorStart,
        this.colorEnd,
        distRatio
      );

      if (this.explosionActive) {
        const flashIntensity = Math.sin(this.explosionProgress * Math.PI);
        colorArray[i3] = Math.min(baseColor.r + flashIntensity * 0.8, 1);
        colorArray[i3 + 1] = Math.min(baseColor.g + flashIntensity * 0.8, 1);
        colorArray[i3 + 2] = Math.min(baseColor.b + flashIntensity * 0.8, 1);
      } else {
        colorArray[i3] = baseColor.r;
        colorArray[i3 + 1] = baseColor.g;
        colorArray[i3 + 2] = baseColor.b;
      }

      const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(
        this.time * this.particleData.alphaSpeed[i] + this.particleData.alphaPhase[i]
      ));
      sizeArray[i] = this.particleData.sizeBase[i] * (0.8 + alpha * 0.4);
    }

    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.sizes.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
