import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialOpacity: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles = 50;
  private geometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.SphereGeometry(0.03, 8, 8);
  }

  emit(position: THREE.Vector3, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        const oldest = this.particles.shift();
        if (oldest) {
          this.scene.remove(oldest.mesh);
          oldest.mesh.material instanceof THREE.Material && oldest.mesh.material.dispose();
        }
      }

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
      });

      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.3;
      mesh.position.y += (Math.random() - 0.5) * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.3;

      const scale = 0.6 + Math.random() * 0.8;
      mesh.scale.setScalar(scale);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        Math.random() * 0.02 + 0.005,
        (Math.random() - 0.5) * 0.015
      );

      const maxLife = 180 + Math.random() * 120;

      this.particles.push({
        mesh,
        velocity,
        life: maxLife,
        maxLife,
        initialOpacity: 0.6
      });

      this.scene.add(mesh);
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material instanceof THREE.Material && p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity);
      p.velocity.x += (Math.random() - 0.5) * 0.001;
      p.velocity.z += (Math.random() - 0.5) * 0.001;
      p.velocity.y += (Math.random() - 0.5) * 0.0005;

      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (p.life / p.maxLife) * p.initialOpacity;
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.material instanceof THREE.Material && p.mesh.material.dispose();
    }
    this.particles = [];
    this.geometry.dispose();
  }
}
