import * as THREE from 'three';

const HALO_PALETTE = [
  0xffeb3b, 0xff9800, 0xf44336, 0xe91e63,
  0x9c27b0, 0x3f51b5, 0x2196f3, 0x4caf50
];

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleEffects {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;
  private maxParticles = 1000;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
  }

  spawnHaloParticles(position: THREE.Vector3, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      const height = (Math.random() - 0.5) * 0.5;

      const colorHex = HALO_PALETTE[Math.floor(Math.random() * HALO_PALETTE.length)];
      const color = new THREE.Color(colorHex);

      this.particles.push({
        position: new THREE.Vector3(
          position.x + Math.cos(angle) * radius,
          position.y + height,
          position.z + Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.8,
          (Math.random() - 0.5) * 0.5
        ),
        color,
        life: 0.5,
        maxLife: 0.5,
        size: 0.08 + Math.random() * 0.08
      });
    }
  }

  spawnFireParticles(position: THREE.Vector3, count: number = 200): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 1.5;

      const t = Math.random();
      const color = new THREE.Color(0xFF8C00).lerp(new THREE.Color(0xFFD700), t);

      this.particles.push({
        position: new THREE.Vector3(
          position.x + Math.cos(angle) * radius,
          position.y + 0.1,
          position.z + Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 0.3
        ),
        color,
        life: 2 + Math.random() * 2,
        maxLife: 4,
        size: 0.15 + Math.random() * 0.15
      });
    }
  }

  update(deltaTime: number): void {
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;

    let activeCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.y -= deltaTime * 0.3;
      p.velocity.x *= 0.99;
      p.velocity.z *= 0.99;

      const alpha = p.life / p.maxLife;

      const idx = activeCount * 3;
      positions[idx] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      colors[idx] = p.color.r * alpha;
      colors[idx + 1] = p.color.g * alpha;
      colors[idx + 2] = p.color.b * alpha;

      sizes[activeCount] = p.size * alpha;

      activeCount++;
    }

    for (let i = activeCount; i < this.maxParticles; i++) {
      const idx = i * 3;
      positions[idx] = 0;
      positions[idx + 1] = -1000;
      positions[idx + 2] = 0;
      sizes[i] = 0;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, Math.min(activeCount, this.maxParticles));

    if (activeCount > 300) {
      this.particleMaterial.size = 0.12;
    } else {
      this.particleMaterial.size = 0.15;
    }
  }

  clear(): void {
    this.particles = [];
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = -1000;
    }
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, 0);
  }

  dispose(): void {
    this.scene.remove(this.particleSystem);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
