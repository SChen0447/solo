import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  spiralSpeed: number;
  radius: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private maxParticles: number = 200;
  private paused: boolean = false;
  private generationRate: number = 5;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  public setGenerationRate(rate: number): void {
    this.generationRate = Math.max(0, Math.min(10, rate));
  }

  public getActiveCount(): number {
    return this.particles.length;
  }

  public emitBurst(
    position: THREE.Vector3,
    count: number,
    targetColorHex: number,
    velocity: number = 1
  ): void {
    const effectiveCount = Math.floor(count * (this.generationRate / 5));
    const targetColor = new THREE.Color(targetColorHex);
    const startColor = new THREE.Color(0xffffff);

    for (let i = 0; i < effectiveCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (i / effectiveCount) * Math.PI * 2 + Math.random() * 0.3;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const speed = (0.5 + Math.random() * 0.5) * (velocity * 0.3 + 0.5);

      const spiralAngle = Math.random() * Math.PI * 2;
      const initialRadius = 0.1 + Math.random() * 0.2;

      const particle: Particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed,
          Math.sin(angle) * Math.cos(elevation) * speed
        ),
        color: startColor.clone(),
        targetColor: targetColor.clone(),
        life: 0,
        maxLife: 2.5,
        size: 0.1 + Math.random() * 0.2,
        angle: spiralAngle,
        spiralSpeed: 1.5 + Math.random() * 1.5,
        radius: initialRadius
      };

      this.particles.push(particle);
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public update(deltaTime: number): void {
    if (this.paused) return;

    const len = this.particles.length;
    for (let i = len - 1; i >= 0; i--) {
      if (i % 2 !== 0) continue;

      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.angle += p.spiralSpeed * deltaTime;
      p.radius += deltaTime * 0.3;

      const spiralOffset = new THREE.Vector3(
        Math.cos(p.angle) * p.radius * 0.2,
        Math.sin(p.angle * 0.7) * p.radius * 0.1,
        Math.sin(p.angle) * p.radius * 0.2
      );

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.position.add(spiralOffset.multiplyScalar(deltaTime));

      p.velocity.multiplyScalar(0.98);

      const lifeRatio = p.life / p.maxLife;
      p.color.lerpColors(new THREE.Color(0xffffff), p.targetColor, lifeRatio);
    }

    this.updateBuffers();
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const idx = i * 3;
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.positions[idx] = p.position.x;
        this.positions[idx + 1] = p.position.y;
        this.positions[idx + 2] = p.position.z;

        this.colors[idx] = p.color.r;
        this.colors[idx + 1] = p.color.g;
        this.colors[idx + 2] = p.color.b;

        const lifeRatio = p.life / p.maxLife;
        this.sizes[i] = p.size * (1 - lifeRatio * 0.5);
      } else {
        this.positions[idx] = 0;
        this.positions[idx + 1] = -1000;
        this.positions[idx + 2] = 0;
        this.colors[idx] = 0;
        this.colors[idx + 1] = 0;
        this.colors[idx + 2] = 0;
        this.sizes[i] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, Math.min(this.particles.length, this.maxParticles));
  }

  public reset(): void {
    this.particles = [];
    this.updateBuffers();
  }
}
