import * as THREE from 'three';
import { gsap } from 'gsap';

const PARTICLE_COUNT = 10;
const PARTICLE_LIFETIME = 1.0;

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  private scene: THREE.Scene;
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createExplosion(position: THREE.Vector3, color: string): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const size = 0.2 + Math.random() * 0.3;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = this.getOrCreateMaterial(color);

      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      );

      const particle: Particle = {
        mesh,
        velocity,
        lifetime: PARTICLE_LIFETIME,
        maxLifetime: PARTICLE_LIFETIME
      };

      this.particles.push(particle);
      this.scene.add(mesh);

      const offsetX = (Math.random() - 0.5) * 0.3;
      const offsetY = (Math.random() - 0.5) * 0.3;
      const offsetZ = (Math.random() - 0.5) * 0.3;

      const mat = mesh.material as THREE.MeshStandardMaterial;

      gsap.to(mesh.position, {
        x: position.x + offsetX,
        y: position.y + offsetY,
        z: position.z + offsetZ,
        duration: 0.3,
        ease: 'power2.out'
      });

      gsap.to(mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: PARTICLE_LIFETIME,
        ease: 'power2.in'
      });

      gsap.to(mat, {
        opacity: 0,
        duration: PARTICLE_LIFETIME,
        ease: 'power2.in'
      });

      gsap.to(mesh.rotation, {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        duration: PARTICLE_LIFETIME,
        ease: 'none'
      });
    }
  }

  private getOrCreateMaterial(color: string): THREE.MeshStandardMaterial {
    const key = color;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 2,
      metalness: 0.5,
      roughness: 0.3
    });

    this.materialCache.set(key, material);
    return material;
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime -= delta;

      if (particle.lifetime <= 0) {
        this.removeParticle(particle);
        continue;
      }

      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(delta)
      );

      particle.velocity.y -= 2 * delta;
    }
  }

  public removeParticle(particle: Particle): void {
    const index = this.particles.indexOf(particle);
    if (index > -1) {
      this.particles.splice(index, 1);
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
  }

  public dispose(): void {
    for (const particle of this.particles) {
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      this.scene.remove(particle.mesh);
    }
    this.particles = [];
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
  }
}
