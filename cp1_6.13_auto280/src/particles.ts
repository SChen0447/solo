import * as THREE from 'three';
import { randomRange, randomColorOffset } from './utils';

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: ParticleData[] = [];
  private scene: THREE.Scene;
  private maxParticles: number = 500;
  private diffusionSpeed: number = 0.8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setDiffusionSpeed(speed: number): void {
    this.diffusionSpeed = speed;
  }

  spawn(position: THREE.Vector3, color: number): void {
    const count = 30;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.removeOldest();
      }

      const size = randomRange(0.03, 0.06);
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const particleColor = randomColorOffset(color, 0.08);
      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: randomRange(0.6, 0.9),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        randomRange(-1, 1),
        randomRange(-1, 1),
        randomRange(-1, 1)
      ).normalize();

      const particle: ParticleData = {
        mesh,
        velocity,
        life: 0,
        maxLife: randomRange(1.5, 2.5),
      };

      this.particles.push(particle);
      this.scene.add(mesh);
    }
  }

  private removeOldest(): void {
    if (this.particles.length === 0) return;

    const oldest = this.particles.shift()!;
    this.scene.remove(oldest.mesh);
    oldest.mesh.geometry.dispose();
    (oldest.mesh.material as THREE.Material).dispose();
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life += deltaTime;

      if (particle.life >= particle.maxLife) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = particle.life / particle.maxLife;
      const speedFactor = this.diffusionSpeed * (1 - lifeRatio * 0.5);
      particle.mesh.position.addScaledVector(particle.velocity, speedFactor * deltaTime);

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - lifeRatio) * randomRange(0.6, 0.9);

      const scale = 1 + lifeRatio * 0.5;
      particle.mesh.scale.setScalar(scale);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
