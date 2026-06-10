import * as THREE from 'three';

export interface SoundParticleOptions {
  count: number;
  origin: THREE.Vector3;
  startHue: number;
  endHue: number;
  radius: number;
  life: number;
}

export interface TrailParticleOptions {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  life: number;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private soundParticles: ParticleData[] = [];
  private trailParticles: ParticleData[] = [];
  private soundPoints: THREE.Points;
  private trailPoints: THREE.Points;
  private soundGeometry: THREE.BufferGeometry;
  private trailGeometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const soundMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.soundGeometry = new THREE.BufferGeometry();
    this.trailGeometry = new THREE.BufferGeometry();

    this.soundPoints = new THREE.Points(this.soundGeometry, soundMaterial);
    this.trailPoints = new THREE.Points(this.trailGeometry, trailMaterial);

    this.scene.add(this.soundPoints);
    this.scene.add(this.trailPoints);
  }

  emitSoundParticles(options: SoundParticleOptions): void {
    const { count, origin, startHue, endHue, radius, life } = options;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = (radius / life) * (0.8 + Math.random() * 0.4);
      const yOffset = (Math.random() - 0.5) * 0.3;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        yOffset,
        Math.sin(angle) * speed
      );

      const t = i / count;
      const hue = startHue + (endHue - startHue) * t;
      const color = new THREE.Color().setHSL(((hue % 360) + 360) % 360 / 360, 1.0, 0.6);
      const size = 0.08 + Math.random() * 0.07;

      this.soundParticles.push({
        position: origin.clone(),
        velocity,
        color,
        size,
        life,
        maxLife: life
      });
    }
  }

  emitTrailParticle(options: TrailParticleOptions): void {
    const { origin, direction, life } = options;

    this.trailParticles.push({
      position: origin.clone(),
      velocity: direction.clone().multiplyScalar(0.02),
      color: new THREE.Color(0xffffff),
      size: 0.03,
      life,
      maxLife: life
    });
  }

  update(delta: number): void {
    this.updateParticles(this.soundParticles, delta);
    this.updateParticles(this.trailParticles, delta);
    this.updateGeometry(this.soundParticles, this.soundGeometry);
    this.updateGeometry(this.trailParticles, this.trailGeometry);
  }

  private updateParticles(particles: ParticleData[], delta: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.98);
    }
  }

  private updateGeometry(particles: ParticleData[], geometry: THREE.BufferGeometry): void {
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const alpha = p.life / p.maxLife;

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r * alpha;
      colors[i * 3 + 1] = p.color.g * alpha;
      colors[i * 3 + 2] = p.color.b * alpha;

      sizes[i] = p.size * alpha;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.soundPoints);
    this.scene.remove(this.trailPoints);
    this.soundGeometry.dispose();
    this.trailGeometry.dispose();
    (this.soundPoints.material as THREE.Material).dispose();
    (this.trailPoints.material as THREE.Material).dispose();
  }
}
