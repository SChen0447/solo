import * as THREE from 'three';

export interface ParticleParams {
  flowSpeed: number;
  turbulence: number;
  hueOffset: number;
  particleSize: number;
  emissionRate: number;
}

const PARTICLE_COUNT = 3000;
const INITIAL_RADIUS = 10;
const BOUNDARY_RADIUS = 12;

class PerlinNoise {
  private permutation: number[];

  constructor() {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 256; i++) {
      this.permutation[256 + i] = this.permutation[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

export class FluidParticleSystem {
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private perlin: PerlinNoise;
  private time: number = 0;
  private params: ParticleParams;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;

  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.perlin = new PerlinNoise();

    this.params = {
      flowSpeed: 1.2,
      turbulence: 0.4,
      hueOffset: 180,
      particleSize: 0.3,
      emissionRate: 0.6
    };

    this.initializeParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * INITIAL_RADIUS;

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.updateParticleColor(i);
      this.sizes[i] = this.params.particleSize;
    }
  }

  private updateParticleColor(i: number): void {
    const i3 = i * 3;
    const y = this.positions[i3 + 1];
    const normalizedY = (y + INITIAL_RADIUS) / (INITIAL_RADIUS * 2);

    const hue = (this.params.hueOffset + normalizedY * 120) % 360;
    const saturation = 0.85;
    const lightness = 0.55 + normalizedY * 0.15;

    const color = new THREE.Color().setHSL(hue / 360, saturation, lightness);
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
  }

  private resetParticle(i: number): void {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * 2;

    this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    this.positions[i3 + 2] = r * Math.cos(phi);

    this.velocities[i3] = 0;
    this.velocities[i3 + 1] = 0;
    this.velocities[i3 + 2] = 0;
  }

  setParams(params: Partial<ParticleParams>): void {
    this.params = { ...this.params, ...params };
    this.material.size = this.params.particleSize;
    this.material.opacity = 0.5 + this.params.emissionRate * 0.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.sizes[i] = this.params.particleSize;
      this.updateParticleColor(i);
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime * 0.5;
    const noiseScale = 0.15;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];

      const noiseX = this.perlin.noise3D(x * noiseScale + this.time, y * noiseScale, z * noiseScale);
      const noiseY = this.perlin.noise3D(x * noiseScale, y * noiseScale + this.time, z * noiseScale + this.time);
      const noiseZ = this.perlin.noise3D(x * noiseScale, y * noiseScale, z * noiseScale + this.time);

      const turbulenceForce = this.params.turbulence * 2.5;
      this.velocities[i3] += noiseX * turbulenceForce * deltaTime;
      this.velocities[i3 + 1] += (noiseY * turbulenceForce + this.params.flowSpeed * 0.5) * deltaTime;
      this.velocities[i3 + 2] += noiseZ * turbulenceForce * deltaTime;

      const flowDirection = new THREE.Vector3(0.3, 1, 0.2).normalize();
      this.velocities[i3] += flowDirection.x * this.params.flowSpeed * deltaTime;
      this.velocities[i3 + 1] += flowDirection.y * this.params.flowSpeed * deltaTime;
      this.velocities[i3 + 2] += flowDirection.z * this.params.flowSpeed * deltaTime;

      const maxSpeed = this.params.flowSpeed * 3;
      const speed = Math.sqrt(
        this.velocities[i3] ** 2 +
        this.velocities[i3 + 1] ** 2 +
        this.velocities[i3 + 2] ** 2
      );
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        this.velocities[i3] *= scale;
        this.velocities[i3 + 1] *= scale;
        this.velocities[i3 + 2] *= scale;
      }

      this.velocities[i3] *= 0.98;
      this.velocities[i3 + 1] *= 0.98;
      this.velocities[i3 + 2] *= 0.98;

      this.positions[i3] += this.velocities[i3] * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

      const distance = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );

      if (distance > BOUNDARY_RADIUS) {
        this.resetParticle(i);
      }

      this.updateParticleColor(i);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  getPositions(): Float32Array {
    return this.positions;
  }

  getColors(): Float32Array {
    return this.colors;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
