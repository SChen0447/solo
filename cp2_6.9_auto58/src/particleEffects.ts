import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleEffects {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  public spawnOpenPalmBurst(position: THREE.Vector3): void {
    const particleCount = 30;
    const radius = 0.2;
    const duration = 1.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const height = (Math.random() - 0.5) * 0.3;
      const speed = 0.8 + Math.random() * 0.6;

      const geometry = new THREE.SphereGeometry(radius, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        height,
        Math.sin(angle) * speed
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: duration,
        maxLife: duration
      });
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(0.96);

      const t = p.life / p.maxLife;
      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = t;
      const scale = 0.3 + t * 0.7;
      p.mesh.scale.setScalar(scale);
    }
  }

  public clearAll(): void {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
