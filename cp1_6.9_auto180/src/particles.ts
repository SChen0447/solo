import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  emitterIndex: number;
  insidePrism: boolean;
}

export interface EmitterConfig {
  color: THREE.Color;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

const MAX_PARTICLES = 5000;
const PARTICLES_PER_SECOND_MIN = 50;
const PARTICLES_PER_SECOND_MAX = 100;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private freeIndices: number[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private emitters: EmitterConfig[] = [];
  private lastEmitTime: number[] = [];
  private emitInterval: number[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0,
        life: 0,
        maxLife: 0,
        active: false,
        emitterIndex: -1,
        insidePrism: false
      });
      this.freeIndices.push(i);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  setEmitters(configs: EmitterConfig[]): void {
    this.emitters = configs.map(c => ({
      color: c.color.clone(),
      position: c.position.clone(),
      normal: c.normal.clone().normalize()
    }));
    this.lastEmitTime = new Array(configs.length).fill(0);
    this.emitInterval = configs.map(() => {
      const pps = PARTICLES_PER_SECOND_MIN + Math.random() * (PARTICLES_PER_SECOND_MAX - PARTICLES_PER_SECOND_MIN);
      return 1 / pps;
    });
  }

  updateEmitterPosition(index: number, position: THREE.Vector3, normal: THREE.Vector3): void {
    if (index >= 0 && index < this.emitters.length) {
      this.emitters[index].position.copy(position);
      this.emitters[index].normal.copy(normal).normalize();
    }
  }

  private emit(emitterIndex: number, time: number): void {
    if (this.freeIndices.length === 0) return;

    const idx = this.freeIndices.pop()!;
    const emitter = this.emitters[emitterIndex];
    const p = this.particles[idx];

    p.active = true;
    p.emitterIndex = emitterIndex;
    p.position.copy(emitter.position);
    p.color.copy(emitter.color);

    const dir = emitter.normal.clone();
    dir.x += (Math.random() - 0.5) * 0.3;
    dir.y += (Math.random() - 0.5) * 0.3;
    dir.z += (Math.random() - 0.5) * 0.3;
    dir.normalize();

    const speed = 0.8 + Math.random() * 0.6;
    p.velocity.copy(dir).multiplyScalar(speed);
    p.size = 2 + Math.random() * 2;
    p.maxLife = 1.5 + Math.random() * 1.5;
    p.life = p.maxLife;
    p.insidePrism = false;
    p.active = true;
  }

  update(delta: number, time: number, prismBounds: { min: THREE.Vector3; max: THREE.Vector3 }): void {
    for (let i = 0; i < this.emitters.length; i++) {
      this.lastEmitTime[i] += delta;
      while (this.lastEmitTime[i] >= this.emitInterval[i]) {
        this.emit(i, time);
        this.lastEmitTime[i] -= this.emitInterval[i];
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        this.freeIndices.push(i);
        continue;
      }

      p.position.addScaledVector(p.velocity, delta);

      const inside = p.position.x >= prismBounds.min.x && p.position.x <= prismBounds.max.x &&
                     p.position.y >= prismBounds.min.y && p.position.y <= prismBounds.max.y &&
                     p.position.z >= prismBounds.min.z && p.position.z <= prismBounds.max.z;

      if (inside && !p.insidePrism) {
        p.insidePrism = true;
        const refractDir = p.velocity.clone();
        refractDir.x += (Math.random() - 0.5) * 0.8;
        refractDir.y += (Math.random() - 0.5) * 0.8;
        refractDir.z += (Math.random() - 0.5) * 0.8;
        refractDir.normalize().multiplyScalar(p.velocity.length() * 0.6);
        p.velocity.copy(refractDir);
      } else if (!inside && p.insidePrism) {
        p.insidePrism = false;
      }

      if (p.insidePrism) {
        if (Math.random() < 0.02) {
          p.velocity.x += (Math.random() - 0.5) * 0.3;
          p.velocity.y += (Math.random() - 0.5) * 0.3;
          p.velocity.z += (Math.random() - 0.5) * 0.3;
          p.velocity.normalize().multiplyScalar(0.5 + Math.random() * 0.5);
        }
      }

      p.velocity.multiplyScalar(0.995);

      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.9;

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      this.colors[i * 3] = p.color.r * lifeRatio;
      this.colors[i * 3 + 1] = p.color.g * lifeRatio;
      this.colors[i * 3 + 2] = p.color.b * lifeRatio;

      this.sizes[i] = p.size * lifeRatio;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
