import * as THREE from 'three';

interface FireflyParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  baseBrightness: number;
  brightness: number;
  flickerSpeed: number;
  flickerPhase: number;
  targetRadius: number;
  angle: number;
  angularSpeed: number;
  wanderOffset: THREE.Vector2;
  fleeing: boolean;
  fleeTime: number;
  trail: THREE.Vector3[];
  trailAlpha: number[];
}

export interface ParticleSystemParams {
  count: number;
  centerRadius: { min: number; max: number };
  moonlightIntensity: number;
  windStrength: number;
}

export class FireflyParticles {
  public mesh: THREE.Points;
  public trailMesh: THREE.Points;
  private particles: FireflyParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private trailGeometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private trailMaterial: THREE.PointsMaterial;
  private params: ParticleSystemParams;
  private mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  private maxCount: number = 500;
  private visibleCount: number = 500;
  private tempColor: THREE.Color = new THREE.Color();

  constructor(params: ParticleSystemParams) {
    this.params = { ...params };
    this.maxCount = params.count;
    this.visibleCount = params.count;

    this.geometry = new THREE.BufferGeometry();
    this.trailGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.maxCount * 3);
    const colors = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);

    const trailPositions = new Float32Array(this.maxCount * 6 * 3);
    const trailColors = new Float32Array(this.maxCount * 6 * 3);
    const trailSizes = new Float32Array(this.maxCount * 6);

    for (let i = 0; i < this.maxCount; i++) {
      sizes[i] = 0;
      for (let j = 0; j < 6; j++) {
        trailSizes[i * 6 + j] = 0;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    this.trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.3, 'rgba(200, 255, 100, 0.8)');
    gradient.addColorStop(0.6, 'rgba(150, 230, 50, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 200, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 8,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
    });

    this.trailMaterial = new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.trailMesh = new THREE.Points(this.trailGeometry, this.trailMaterial);

    this.initParticles();
  }

  private initParticles(): void {
    const colorStart = new THREE.Color(0xc4ff6e);
    const colorEnd = new THREE.Color(0xffe066);

    for (let i = 0; i < this.maxCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.params.centerRadius.min +
        Math.random() * (this.params.centerRadius.max - this.params.centerRadius.min);

      const particle: FireflyParticle = {
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.6,
          Math.random() * 20 - 10
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          0
        ),
        size: 6 + Math.random() * 6,
        color: new THREE.Color().lerpColors(colorStart, colorEnd, Math.random()),
        baseBrightness: 0.1 + Math.random() * 0.9,
        brightness: 0.5,
        flickerSpeed: 0.8 + Math.random() * 1.2,
        flickerPhase: Math.random() * Math.PI * 2,
        targetRadius: radius,
        angle: angle,
        angularSpeed: (Math.random() - 0.5) * 0.002,
        wanderOffset: new THREE.Vector2(
          Math.random() * 100,
          Math.random() * 100
        ),
        fleeing: false,
        fleeTime: 0,
        trail: [],
        trailAlpha: [],
      };

      this.particles.push(particle);
    }

    this.updateGeometry();
  }

  public setMousePosition(x: number, y: number): void {
    this.mousePosition.set(x, y);
  }

  public setMoonlightIntensity(value: number): void {
    this.params.moonlightIntensity = value;
  }

  public setWindStrength(value: number): void {
    this.params.windStrength = value;
  }

  public setVisibleCount(count: number): void {
    this.visibleCount = Math.min(Math.max(count, 0), this.maxCount);
  }

  public update(deltaTime: number, time: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    const trailPositions = this.trailGeometry.attributes.position.array as Float32Array;
    const trailColors = this.trailGeometry.attributes.color.array as Float32Array;
    const trailSizes = this.trailGeometry.attributes.size.array as Float32Array;

    const windFactor = 1 + this.params.windStrength;
    const moonlightFactor = 0.5 + this.params.moonlightIntensity * 0.5;

    for (let i = 0; i < this.maxCount; i++) {
      const p = this.particles[i];
      const isVisible = i < this.visibleCount;

      if (isVisible) {
        const flickerValue = Math.sin(time * p.flickerSpeed + p.flickerPhase);
        p.brightness = p.baseBrightness * (0.5 + 0.5 * flickerValue) * moonlightFactor;
        p.brightness = Math.max(0.1, Math.min(1, p.brightness));

        p.angle += p.angularSpeed * windFactor;

        const wanderX = Math.sin(time * 0.5 + p.wanderOffset.x) * 20;
        const wanderY = Math.cos(time * 0.4 + p.wanderOffset.y) * 15;

        const targetX = Math.cos(p.angle) * p.targetRadius + wanderX;
        const targetY = Math.sin(p.angle) * p.targetRadius * 0.6 + wanderY;

        p.velocity.x += (targetX - p.position.x) * 0.002 * windFactor;
        p.velocity.y += (targetY - p.position.y) * 0.002 * windFactor;

        const windEffect = new THREE.Vector2(
          Math.sin(time * 0.3 + p.position.y * 0.01) * 0.05,
          Math.cos(time * 0.25 + p.position.x * 0.01) * 0.03
        );
        p.velocity.x += windEffect.x * this.params.windStrength;
        p.velocity.y += windEffect.y * this.params.windStrength;

        const dx = p.position.x - this.mousePosition.x;
        const dy = p.position.y - this.mousePosition.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        if (distToMouse < 40) {
          const fleeForce = (40 - distToMouse) / 40 * 3;
          p.velocity.x += (dx / distToMouse) * fleeForce;
          p.velocity.y += (dy / distToMouse) * fleeForce;
          p.fleeing = true;
          p.fleeTime = 0.3;
        }

        if (p.fleeTime > 0) {
          p.fleeTime -= deltaTime;
          if (p.fleeTime <= 0) {
            p.fleeing = false;
          }
        }

        p.velocity.multiplyScalar(0.96);

        p.position.x += p.velocity.x * windFactor;
        p.position.y += p.velocity.y * windFactor;

        p.position.z = Math.sin(time * 0.8 + p.flickerPhase) * 5;

        if (p.fleeing || p.trail.length > 0) {
          p.trail.unshift(p.position.clone());
          p.trailAlpha.unshift(p.brightness);
          if (p.trail.length > 6) {
            p.trail.pop();
            p.trailAlpha.pop();
          }
        }

        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        this.tempColor.copy(p.color);
        this.tempColor.multiplyScalar(p.brightness);
        colors[i * 3] = this.tempColor.r;
        colors[i * 3 + 1] = this.tempColor.g;
        colors[i * 3 + 2] = this.tempColor.b;

        sizes[i] = p.size * (0.8 + p.brightness * 0.4);

        for (let j = 0; j < 6; j++) {
          const trailIdx = i * 6 + j;
          if (j < p.trail.length && p.trail[j]) {
            const alpha = p.trailAlpha[j] * (1 - j / 6) * 0.6;
            trailPositions[trailIdx * 3] = p.trail[j].x;
            trailPositions[trailIdx * 3 + 1] = p.trail[j].y;
            trailPositions[trailIdx * 3 + 2] = p.trail[j].z;

            this.tempColor.copy(p.color);
            this.tempColor.multiplyScalar(alpha);
            trailColors[trailIdx * 3] = this.tempColor.r;
            trailColors[trailIdx * 3 + 1] = this.tempColor.g;
            trailColors[trailIdx * 3 + 2] = this.tempColor.b;

            trailSizes[trailIdx] = p.size * (1 - j / 6) * 0.5;
          } else {
            trailSizes[trailIdx] = 0;
          }
        }
      } else {
        sizes[i] = 0;
        for (let j = 0; j < 6; j++) {
          trailSizes[i * 6 + j] = 0;
        }
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
    this.trailGeometry.attributes.size.needsUpdate = true;
  }

  private updateGeometry(): void {
    this.update(0, 0);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.trailGeometry.dispose();
    this.material.dispose();
    this.trailMaterial.dispose();
    if (this.material.map) this.material.map.dispose();
    if (this.trailMaterial.map) this.trailMaterial.map.dispose();
  }
}
