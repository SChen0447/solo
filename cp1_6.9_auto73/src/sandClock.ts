import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  state: 'top' | 'falling' | 'bottom';
  fallingDelay: number;
}

export class SandClock {
  public group: THREE.Group;
  public particles: Particle[] = [];
  public points!: THREE.Points;
  public geometry!: THREE.BufferGeometry;
  public positions!: Float32Array;
  public flowRate: number = 50;
  public gravity: number = 0.5;
  public totalParticles: number = 5000;
  private particleRadius: number = 1;
  private hourglassHeight: number = 200;
  private waistRadius: number = 50;
  private neckRadius: number = 15;
  private fallAccumulator: number = 0;
  private isResetting: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.createGlassHourglass();
    this.createParticles();
  }

  private createGlassHourglass(): void {
    const points: THREE.Vector2[] = [];
    const h = this.hourglassHeight / 2;
    const wr = this.waistRadius;
    const nr = this.neckRadius;
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = h - t * (h - 5);
      const r = wr - (wr - nr) * Math.pow(t, 1.5);
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(nr, 5));
    points.push(new THREE.Vector2(nr, -5));
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = -5 - t * (h - 5);
      const r = nr + (wr - nr) * Math.pow(t, 1.5);
      points.push(new THREE.Vector2(r, y));
    }

    const latheGeo = new THREE.LatheGeometry(points, 64);
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      shininess: 100,
      specular: 0xffffff,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const glass = new THREE.Mesh(latheGeo, glassMaterial);
    glass.castShadow = true;
    glass.receiveShadow = true;
    this.group.add(glass);

    const ringGeo = new THREE.TorusGeometry(wr + 2, 2, 8, 64);
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      shininess: 60
    });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = h;
    this.group.add(topRing);

    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -h;
    this.group.add(bottomRing);
  }

  private createParticles(): void {
    this.geometry = new THREE.BufferGeometry();
    this.totalParticles = 5000;
    this.positions = new Float32Array(this.totalParticles * 3);

    const halfH = this.hourglassHeight / 2 - 10;

    for (let i = 0; i < this.totalParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusFactor = Math.sqrt(Math.random());
      const maxR = this.waistRadius * 0.9 * (1 - Math.pow((halfH - 0) / halfH, 2) * 0.5);
      const radius = radiusFactor * maxR;
      const y = halfH - Math.random() * (halfH * 0.7);

      const particle: Particle = {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          0,
          (Math.random() - 0.5) * 0.2
        ),
        state: 'top',
        fallingDelay: Math.random() * 2
      };
      this.particles.push(particle);
      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xFFD700,
      size: this.particleRadius,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.group.add(this.points);
  }

  public update(delta: number): number {
    if (this.isResetting) return 0;

    const startTime = performance.now();
    const particlesPerFrame = this.flowRate * delta;
    this.fallAccumulator += particlesPerFrame;

    const halfH = this.hourglassHeight / 2;
    const neckY = 0;
    const bottomLimit = -halfH + 10;

    for (let i = 0; i < this.totalParticles; i++) {
      const p = this.particles[i];

      if (p.state === 'top' && this.fallAccumulator > 0) {
        const distToNeck = Math.abs(p.position.y);
        if (distToNeck < 20) {
          p.state = 'falling';
          p.velocity.set(
            (Math.random() - 0.5) * 0.3,
            -0.5,
            (Math.random() - 0.5) * 0.3
          );
          this.fallAccumulator -= 1;
        }
      }

      if (p.state === 'falling') {
        p.velocity.y -= this.gravity * delta * 60;
        p.position.add(p.velocity.clone().multiplyScalar(delta * 60));

        const distFromAxis = Math.sqrt(
          p.position.x * p.position.x + p.position.z * p.position.z
        );
        if (Math.abs(p.position.y) < 10 && distFromAxis > this.neckRadius) {
          const normFactor = this.neckRadius / distFromAxis * 0.95;
          p.position.x *= normFactor;
          p.position.z *= normFactor;
          p.velocity.x *= 0.5;
          p.velocity.z *= 0.5;
        }

        if (p.position.y <= bottomLimit) {
          p.state = 'bottom';
          p.position.y = bottomLimit;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * this.waistRadius * 0.85;
          p.position.x = Math.cos(angle) * r;
          p.position.z = Math.sin(angle) * r;
          p.velocity.set(0, 0, 0);
        }
      }

      if (p.state === 'top') {
        p.position.y += p.velocity.y * delta * 60;
        if (p.position.y < neckY + 15) {
          p.position.y = neckY + 15 + Math.random() * 5;
        }
      }

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
    return performance.now() - startTime;
  }

  public reset(): Promise<void> {
    if (this.isResetting) return Promise.resolve();
    this.isResetting = true;

    const halfH = this.hourglassHeight / 2 - 10;
    const tweens: TWEEN.Tween<{x: number; y: number; z: number}>[] = [];

    for (let i = 0; i < this.totalParticles; i++) {
      const p = this.particles[i];
      const startPos = { x: p.position.x, y: p.position.y, z: p.position.z };

      const angle = Math.random() * Math.PI * 2;
      const radiusFactor = Math.sqrt(Math.random());
      const maxR = this.waistRadius * 0.85;
      const radius = radiusFactor * maxR;
      const targetY = halfH - Math.random() * (halfH * 0.7);

      const targetPos = {
        x: Math.cos(angle) * radius,
        y: targetY,
        z: Math.sin(angle) * radius
      };

      const obj = { ...startPos };
      const tween = new TWEEN.Tween(obj)
        .to(targetPos, 300)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          p.position.set(obj.x, obj.y, obj.z);
          this.positions[i * 3] = obj.x;
          this.positions[i * 3 + 1] = obj.y;
          this.positions[i * 3 + 2] = obj.z;
        });

      tweens.push(tween);
      p.state = 'top';
      p.velocity.set(0, 0, 0);
    }

    return new Promise((resolve) => {
      const startDelay = 16;
      let completed = 0;
      tweens.forEach((t, idx) => {
        t.delay(Math.random() * 50);
        t.onComplete(() => {
          completed++;
          if (completed >= tweens.length) {
            this.isResetting = false;
            this.fallAccumulator = 0;
            this.geometry.attributes.position.needsUpdate = true;
            resolve();
          }
        });
        setTimeout(() => t.start(), idx * startDelay / tweens.length);
      });
    });
  }

  public setParticleCount(count: number): void {
    if (count === this.totalParticles) return;
    this.group.remove(this.points);
    this.geometry.dispose();
    this.particles = [];
    this.totalParticles = count;
    this.createParticles();
  }

  public getParticleComputationTime(): number {
    return 0;
  }
}
