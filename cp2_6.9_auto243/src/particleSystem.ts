import * as THREE from 'three';

interface Particle {
  active: boolean;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  size: number;
  colorIndex: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private maxParticles: number;
  private particles: Particle[];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private ballOrigin: THREE.Vector3;
  private ballRadius: number = 2;
  private warmColor: THREE.Color = new THREE.Color(0xFF6B6B);
  private midColor: THREE.Color = new THREE.Color(0xFFD700);
  private coolColor: THREE.Color = new THREE.Color(0x00C9FF);

  constructor(scene: THREE.Scene, maxParticles: number = 300) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.ballOrigin = new THREE.Vector3(0, 0.8, 0);
    this.particles = [];

    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 3,
        velocity: new THREE.Vector3(),
        size: 0.1,
        colorIndex: 0
      });
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private nextInactiveIndex(): number {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].active) return i;
    }
    return -1;
  }

  private interpolateColor(t: number): THREE.Color {
    const c = new THREE.Color();
    if (t < 0.5) {
      const k = t / 0.5;
      c.r = this.warmColor.r + (this.midColor.r - this.warmColor.r) * k;
      c.g = this.warmColor.g + (this.midColor.g - this.warmColor.g) * k;
      c.b = this.warmColor.b + (this.midColor.b - this.warmColor.b) * k;
    } else {
      const k = (t - 0.5) / 0.5;
      c.r = this.midColor.r + (this.coolColor.r - this.midColor.r) * k;
      c.g = this.midColor.g + (this.coolColor.g - this.midColor.g) * k;
      c.b = this.midColor.b + (this.coolColor.b - this.midColor.b) * k;
    }
    return c;
  }

  public burst(origin: THREE.Vector3, count: number = 200): void {
    const toSpawn = Math.min(count, this.maxParticles - this.getActiveCount());
    let spawned = 0;
    let attempts = 0;
    while (spawned < toSpawn && attempts < this.maxParticles * 2) {
      const idx = this.nextInactiveIndex();
      if (idx < 0) break;
      const p = this.particles[idx];
      p.active = true;
      p.life = 0;
      p.maxLife = 2.5 + Math.random() * 0.8;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.0 + Math.random() * 2.0;
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      p.size = 0.05 + Math.random() * 0.1;
      p.colorIndex = Math.random();

      this.positions[idx * 3] = origin.x;
      this.positions[idx * 3 + 1] = origin.y;
      this.positions[idx * 3 + 2] = origin.z;

      const c = this.interpolateColor(p.colorIndex);
      this.colors[idx * 3] = c.r;
      this.colors[idx * 3 + 1] = c.g;
      this.colors[idx * 3 + 2] = c.b;

      spawned++;
      attempts++;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public update(delta: number): void {
    let changed = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        if (this.sizes[i] !== 0) {
          this.sizes[i] = 0;
          changed = true;
        }
        continue;
      }

      p.life += delta;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.active = false;
        this.sizes[i] = 0;
        changed = true;
        continue;
      }

      this.positions[i * 3] += p.velocity.x * delta;
      this.positions[i * 3 + 1] += p.velocity.y * delta;
      this.positions[i * 3 + 2] += p.velocity.z * delta;

      const dx = this.positions[i * 3] - this.ballOrigin.x;
      const dy = this.positions[i * 3 + 1] - this.ballOrigin.y;
      const dz = this.positions[i * 3 + 2] - this.ballOrigin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const maxDist = this.ballRadius * 0.92;

      if (dist > maxDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const vdotn = p.velocity.x * nx + p.velocity.y * ny + p.velocity.z * nz;
        if (vdotn > 0) {
          p.velocity.x -= 2 * vdotn * nx;
          p.velocity.y -= 2 * vdotn * ny;
          p.velocity.z -= 2 * vdotn * nz;
          p.velocity.multiplyScalar(0.6);
        }
        this.positions[i * 3] = this.ballOrigin.x + nx * maxDist;
        this.positions[i * 3 + 1] = this.ballOrigin.y + ny * maxDist;
        this.positions[i * 3 + 2] = this.ballOrigin.z + nz * maxDist;
      }

      p.velocity.multiplyScalar(1 - 0.35 * delta);
      p.velocity.y -= 0.15 * delta;

      const fadeT = t < 0.15 ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1);
      const lifeColorT = t;
      const c = this.interpolateColor((p.colorIndex + lifeColorT * 0.3) % 1);
      const alphaBoost = fadeT;
      this.colors[i * 3] = c.r * alphaBoost;
      this.colors[i * 3 + 1] = c.g * alphaBoost;
      this.colors[i * 3 + 2] = c.b * alphaBoost;
      this.sizes[i] = p.size * fadeT;

      changed = true;
    }

    if (changed) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
      this.geometry.attributes.size.needsUpdate = true;
    }
  }

  public reset(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].active = false;
      this.sizes[i] = 0;
      this.colors[i * 3] = 0;
      this.colors[i * 3 + 1] = 0;
      this.colors[i * 3 + 2] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public getActiveCount(): number {
    let n = 0;
    for (const p of this.particles) if (p.active) n++;
    return n;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
