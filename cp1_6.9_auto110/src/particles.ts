import * as THREE from 'three';

interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
  type: 'glow' | 'burst';
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  emitGlowPoint(position: THREE.Vector3, color: THREE.Color, duration: number): void {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, 0),
      life: duration,
      maxLife: duration,
      initialScale: 1,
      type: 'glow'
    });
  }

  emitColorBurst(position: THREE.Vector3, color: THREE.Color, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.5 + Math.random() * 1.0;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.5) * 0.3,
        Math.sin(angle) * speed
      );

      const size = 0.02 + Math.random() * 0.02;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        life: 0.8,
        maxLife: 0.8,
        initialScale: 1,
        type: 'burst'
      });
    }
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.geometry as THREE.BufferGeometry).dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'burst') {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.velocity.multiplyScalar(0.96);
      } else if (p.type === 'glow') {
        const pulse = 1 + Math.sin((1 - lifeRatio) * Math.PI * 4) * 0.15;
        p.mesh.scale.setScalar(pulse);
      }

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = lifeRatio;
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
