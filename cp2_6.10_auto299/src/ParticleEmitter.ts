import * as THREE from 'three';

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseRadius: number;
  trail: THREE.Vector3[];
  color: THREE.Color;
  hsl: { h: number; s: number; l: number };
}

export class ParticleEmitter {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private emitPosition: THREE.Vector3;
  private emitDirection: THREE.Vector3;
  private spreadAngle: number;
  private emitRate: number;
  private particleLifetime: number;
  private boundaryRadius: number = 15;
  private particleScale: number = 1;
  private maxParticles: number = 2000;
  private geometries: THREE.SphereGeometry[] = [];

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    direction: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    spreadAngle: number = Math.PI * 2,
    emitRate: number = 2,
    particleLifetime: number = 8
  ) {
    this.scene = scene;
    this.emitPosition = position;
    this.emitDirection = direction.normalize();
    this.spreadAngle = spreadAngle;
    this.emitRate = emitRate;
    this.particleLifetime = particleLifetime;

    for (let i = 0; i < 5; i++) {
      this.geometries.push(new THREE.SphereGeometry(0.05 + i * 0.025, 8, 8));
    }
  }

  setEmitRate(rate: number): void {
    this.emitRate = rate;
  }

  setMaxParticles(max: number): void {
    this.maxParticles = max;
  }

  setParticleScale(scale: number): void {
    this.particleScale = scale;
    this.particles.forEach((p) => {
      p.mesh.scale.setScalar(p.baseRadius * scale * 10);
    });
  }

  getParticles(): ParticleData[] {
    return this.particles;
  }

  setEmitPosition(pos: THREE.Vector3): void {
    this.emitPosition.copy(pos);
  }

  private createRandomColor(): THREE.Color {
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.85, 0.6);
    return color;
  }

  private createParticle(): ParticleData {
    const geoIdx = Math.floor(Math.random() * this.geometries.length);
    const geometry = this.geometries[geoIdx];
    const baseRadius = 0.05 + geoIdx * 0.025;
    const color = this.createRandomColor();

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.emitPosition);
    mesh.scale.setScalar(baseRadius * this.particleScale * 10);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 1.5 + Math.random() * 2.5;

    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ).multiplyScalar(speed);

    const spreadFactor = Math.random() * this.spreadAngle / (Math.PI * 2);
    velocity.lerp(this.emitDirection, spreadFactor * 0.5);

    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);

    const particle: ParticleData = {
      mesh,
      velocity,
      life: this.particleLifetime,
      maxLife: this.particleLifetime,
      baseRadius,
      trail: [],
      color,
      hsl,
    };

    this.scene.add(mesh);
    return particle;
  }

  emit(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(this.createParticle());
      }
    }
  }

  private resetParticle(p: ParticleData): void {
    p.mesh.position.copy(this.emitPosition);
    
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 1.5 + Math.random() * 2.5;

    p.velocity.set(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ).multiplyScalar(speed);

    const spreadFactor = Math.random() * this.spreadAngle / (Math.PI * 2);
    p.velocity.lerp(this.emitDirection, spreadFactor * 0.5);

    p.life = p.maxLife;
    p.hsl.h = (p.hsl.h + 0.1 + Math.random() * 0.2) % 1;
    p.color.setHSL(p.hsl.h, 0.85, 0.6);
    (p.mesh.material as THREE.MeshBasicMaterial).color.copy(p.color);
    p.trail.length = 0;
  }

  private randomizeColor(p: ParticleData): void {
    p.hsl.h = (p.hsl.h + 0.05 + Math.random() * 0.15) % 1;
    p.color.setHSL(p.hsl.h, 0.85, 0.65);
    (p.mesh.material as THREE.MeshBasicMaterial).color.copy(p.color);
  }

  update(
    delta: number,
    forceFields: { position: THREE.Vector3; strength: number; radius: number; type: string }[],
    gravityStrength: number,
    recordTrail: boolean
  ): void {
    this.emit(this.emitRate);

    const gravity = new THREE.Vector3(0, -gravityStrength * 0.5, 0);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.velocity.add(gravity.clone().multiplyScalar(delta));

      for (const ff of forceFields) {
        const dir = new THREE.Vector3().subVectors(ff.position, p.mesh.position);
        const dist = dir.length();

        if (dist < ff.radius && dist > 0.01) {
          dir.normalize();
          const falloff = 1 - dist / ff.radius;
          let forceMag = ff.strength * falloff * falloff * delta * 8;

          if (ff.type === 'vortex') {
            const tangent = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
            p.velocity.add(tangent.multiplyScalar(Math.abs(forceMag)));
          } else if (ff.type === 'wind') {
            p.velocity.add(dir.multiplyScalar(forceMag * 0.3));
          } else {
            p.velocity.add(dir.multiplyScalar(forceMag));
          }
        }
      }

      const speed = p.velocity.length();
      const maxSpeed = 15;
      if (speed > maxSpeed) {
        p.velocity.multiplyScalar(maxSpeed / speed);
      }

      p.velocity.multiplyScalar(0.995);

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      const distFromCenter = p.mesh.position.length();
      if (distFromCenter > this.boundaryRadius) {
        const normal = p.mesh.position.clone().normalize();
        const dot = p.velocity.dot(normal);
        p.velocity.sub(normal.multiplyScalar(2 * dot));
        p.velocity.multiplyScalar(0.8);
        p.mesh.position.copy(normal.multiplyScalar(this.boundaryRadius - 0.01));
        this.randomizeColor(p);
      }

      if (recordTrail) {
        p.trail.push(p.mesh.position.clone());
        if (p.trail.length > 50) {
          p.trail.shift();
        }
      }

      p.life -= delta;
      if (p.life <= 0) {
        this.resetParticle(p);
      }
    }
  }

  clearTrails(): void {
    this.particles.forEach((p) => {
      p.trail.length = 0;
    });
  }

  reset(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
    });
    this.particles.length = 0;
  }

  resizeToCount(targetCount: number): void {
    while (this.particles.length > targetCount) {
      const p = this.particles.pop()!;
      this.scene.remove(p.mesh);
    }
    while (this.particles.length < targetCount && this.particles.length < this.maxParticles) {
      this.particles.push(this.createParticle());
    }
  }

  dispose(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    this.geometries.forEach((g) => g.dispose());
    this.particles.length = 0;
  }
}
