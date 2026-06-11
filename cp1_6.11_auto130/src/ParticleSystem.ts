import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private maxParticles: number = 30;
  private sparksPerSecond: number = 20;
  private sparkAccumulator: number = 0;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.initPool();
    this.initPoints();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 3,
        color: new THREE.Color(),
        active: false,
      });
    }
  }

  private initPoints(): void {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 220, 100, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  public addSpark(position: THREE.Vector3): void {
    let particle = this.particles.find((p) => !p.active);

    if (!particle) {
      let minLife = Infinity;
      let minIdx = 0;
      for (let i = 0; i < this.particles.length; i++) {
        if (this.particles[i].life < minLife) {
          minLife = this.particles[i].life;
          minIdx = i;
        }
      }
      particle = this.particles[minIdx];
    }

    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * 0.05;
    particle.position.y += (Math.random() - 0.5) * 0.05;
    particle.position.z += (Math.random() - 0.5) * 0.05;

    const speed = 0.5 + Math.random() * 1.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    particle.velocity.set(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.abs(Math.cos(phi)) * speed * 0.5 + 0.3,
      Math.sin(phi) * Math.sin(theta) * speed
    );

    particle.maxLife = 0.5 + Math.random() * 1.0;
    particle.life = particle.maxLife;
    particle.size = 0.03 + Math.random() * 0.07;

    const t = Math.random();
    particle.color.setRGB(
      1,
      0.7 + t * 0.2,
      t * 0.4
    );

    particle.active = true;
  }

  public addSparksAtPositions(positions: THREE.Vector3[], deltaTime: number, rateMultiplier: number = 1): void {
    if (positions.length === 0) return;

    this.sparkAccumulator += this.sparksPerSecond * deltaTime * rateMultiplier;

    while (this.sparkAccumulator >= 1) {
      this.sparkAccumulator -= 1;
      const pos = positions[Math.floor(Math.random() * positions.length)];
      this.addSpark(pos);
    }
  }

  public update(deltaTime: number): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;
    const sizeArr = sizes.array as Float32Array;

    const gravity = -1.5;
    const drag = 0.98;

    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      if (p.active && p.life > 0) {
        p.life -= deltaTime;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.velocity.y += gravity * deltaTime;
          p.velocity.multiplyScalar(Math.pow(drag, deltaTime * 60));
          p.position.addScaledVector(p.velocity, deltaTime);

          const lifeRatio = p.life / p.maxLife;
          posArr[i * 3] = p.position.x;
          posArr[i * 3 + 1] = p.position.y;
          posArr[i * 3 + 2] = p.position.z;

          colArr[i * 3] = p.color.r;
          colArr[i * 3 + 1] = p.color.g * lifeRatio;
          colArr[i * 3 + 2] = p.color.b * lifeRatio;

          sizeArr[i] = p.size * lifeRatio;
          activeCount++;
        }
      }

      if (!p.active || p.life <= 0) {
        posArr[i * 3] = 0;
        posArr[i * 3 + 1] = -1000;
        posArr[i * 3 + 2] = 0;
        colArr[i * 3] = 0;
        colArr[i * 3 + 1] = 0;
        colArr[i * 3 + 2] = 0;
        sizeArr[i] = 0;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    this.geometry.setDrawRange(0, this.maxParticles);
  }

  public getActiveCount(): number {
    return this.particles.filter((p) => p.active && p.life > 0).length;
  }

  public reset(): void {
    for (const p of this.particles) {
      p.active = false;
      p.life = 0;
    }
  }
}
