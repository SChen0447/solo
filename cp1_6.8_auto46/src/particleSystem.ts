import * as THREE from 'three';
import { Detector } from './detectorNetwork';

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  energy: number;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  trailMaxLength: number;
  life: number;
  active: boolean;
}

export interface ParticleHitEvent {
  detectorId: number;
  energy: number;
  time: number;
  position: THREE.Vector3;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles: number = 100;
  private spawnTimer: number = 0;
  private spawnInterval: number = 0.4;
  private detectors: Detector[] = [];
  private earthRadius: number = 30;
  private hitEvents: ParticleHitEvent[] = [];

  constructor(scene: THREE.Scene, earthRadius: number = 30) {
    this.scene = scene;
    this.earthRadius = earthRadius;
  }

  public setDetectors(detectors: Detector[]): void {
    this.detectors = detectors;
  }

  public update(deltaTime: number, time: number): ParticleHitEvent[] {
    this.hitEvents = [];

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0 && this.particles.length < this.maxParticles) {
      this.spawnParticle();
      this.spawnTimer = this.spawnInterval * (0.5 + Math.random() * 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      particle.life -= deltaTime;

      this.updateTrail(particle);

      const hit = this.checkDetectorCollision(particle, time);
      if (hit) {
        this.hitEvents.push(hit);
        this.removeParticle(i);
        continue;
      }

      const distFromCenter = particle.mesh.position.length();
      if (distFromCenter < this.earthRadius * 0.8 || particle.life <= 0) {
        this.removeParticle(i);
      }
    }

    return this.hitEvents;
  }

  private spawnParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = this.earthRadius * 2.0;
    const height = this.earthRadius * 1.2 + Math.random() * this.earthRadius * 0.8;

    const startPos = new THREE.Vector3(
      Math.cos(angle) * radius * (0.5 + Math.random() * 0.5),
      height,
      Math.sin(angle) * radius * (0.5 + Math.random() * 0.5)
    );

    const targetPos = new THREE.Vector3(
      (Math.random() - 0.5) * this.earthRadius * 1.5,
      -this.earthRadius * 0.2,
      (Math.random() - 0.5) * this.earthRadius * 1.5
    );

    const direction = targetPos.clone().sub(startPos).normalize();
    const speed = 60 + Math.random() * 40;
    const velocity = direction.multiplyScalar(speed);

    const energy = 50 + Math.random() * 200;

    const particleGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
    mesh.position.copy(startPos);

    const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    const trailPositions: THREE.Vector3[] = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.8,
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    this.scene.add(mesh);
    this.scene.add(trail);

    const particle: Particle = {
      mesh,
      velocity,
      energy,
      trail,
      trailPositions,
      trailMaxLength: 20,
      life: 3.0,
      active: true,
    };

    this.particles.push(particle);
  }

  private updateTrail(particle: Particle): void {
    const pos = particle.mesh.position.clone();
    particle.trailPositions.unshift(pos);

    if (particle.trailPositions.length > particle.trailMaxLength) {
      particle.trailPositions.pop();
    }

    const positions = new Float32Array(particle.trailPositions.length * 3);
    for (let i = 0; i < particle.trailPositions.length; i++) {
      positions[i * 3] = particle.trailPositions[i].x;
      positions[i * 3 + 1] = particle.trailPositions[i].y;
      positions[i * 3 + 2] = particle.trailPositions[i].z;
    }

    particle.trail.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const fadeProgress = 0.3 / particle.trailMaxLength;
    const opacity = Math.max(0, 1 - fadeProgress * particle.trailPositions.length);
    (particle.trail.material as THREE.LineBasicMaterial).opacity = opacity * 0.6;
  }

  private checkDetectorCollision(
    particle: Particle,
    time: number
  ): ParticleHitEvent | null {
    for (const detector of this.detectors) {
      const sensorPos = detector.getSensorWorldPosition();
      const distance = particle.mesh.position.distanceTo(sensorPos);

      if (distance < 5) {
        return {
          detectorId: detector.id,
          energy: particle.energy,
          time,
          position: sensorPos.clone(),
        };
      }
    }
    return null;
  }

  private removeParticle(index: number): void {
    const particle = this.particles[index];
    this.scene.remove(particle.mesh);
    this.scene.remove(particle.trail);
    
    particle.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    particle.trail.geometry.dispose();
    (particle.trail.material as THREE.Material).dispose();
    this.particles.splice(index, 1);
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getMaxParticles(): number {
    return this.maxParticles;
  }
}
