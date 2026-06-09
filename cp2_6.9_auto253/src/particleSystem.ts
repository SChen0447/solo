import * as THREE from 'three';

export interface ParticleSystemConfig {
  particleCount: number;
  sphereRadius: number;
  minSize: number;
  maxSize: number;
  defaultBaseSize: number;
  linkDistance: number;
}

const DEFAULT_CONFIG: ParticleSystemConfig = {
  particleCount: 5000,
  sphereRadius: 3,
  minSize: 0.02,
  maxSize: 0.08,
  defaultBaseSize: 0.05,
  linkDistance: 0.5,
};

export class ParticleSystem {
  public scene: THREE.Scene;
  public points: THREE.Points;
  public lines: THREE.LineSegments;
  public pointsGeometry: THREE.BufferGeometry;
  public linesGeometry: THREE.BufferGeometry;

  private originalPositions: Float32Array;
  private currentPositions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private sizeMultipliers: Float32Array;
  private linkPositions: Float32Array;

  private config: ParticleSystemConfig;
  private baseSize: number;
  private linkDistance: number;

  private isExploding: boolean = false;
  private explodeTime: number = 0;
  private explodeDuration: number = 2;
  private isReturning: boolean = false;
  private returnTime: number = 0;
  private returnDuration: number = 1;

  private isGravityActive: boolean = false;
  private gravityTime: number = 0;
  private gravityDuration: number = 0.5;
  private gravityCenter: THREE.Vector3 = new THREE.Vector3();
  private gravityRadius: number = 2;
  private gravityMaxSpeed: number = 2;

  private sculptCenter: THREE.Vector3 = new THREE.Vector3();
  private sculptRadius: number = 0.5;
  private sculptStrength: number = 0.8;
  private isSculpting: boolean = false;

  private tempVec: THREE.Vector3 = new THREE.Vector3();
  private tempVec2: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, config?: Partial<ParticleSystemConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseSize = this.config.defaultBaseSize;
    this.linkDistance = this.config.linkDistance;

    const count = this.config.particleCount;
    this.originalPositions = new Float32Array(count * 3);
    this.currentPositions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.sizeMultipliers = new Float32Array(count);

    this.initParticleData();
    this.pointsGeometry = this.createPointsGeometry();
    this.linesGeometry = new THREE.BufferGeometry();
    this.linkPositions = new Float32Array(count * 6 * 2);

    this.points = this.createPoints();
    this.lines = this.createLines();

    this.scene.add(this.points);
    this.scene.add(this.lines);

    this.updateLinks();
  }

  private initParticleData(): void {
    const count = this.config.particleCount;
    const radius = this.config.sphereRadius;
    const colorStart = new THREE.Color('#FF6B6B');
    const colorEnd = new THREE.Color('#4ECDC4');

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const idx3 = i * 3;
      this.originalPositions[idx3] = x;
      this.originalPositions[idx3 + 1] = y;
      this.originalPositions[idx3 + 2] = z;

      this.currentPositions[idx3] = x;
      this.currentPositions[idx3 + 1] = y;
      this.currentPositions[idx3 + 2] = z;

      this.velocities[idx3] = 0;
      this.velocities[idx3 + 1] = 0;
      this.velocities[idx3 + 2] = 0;

      const t = Math.random();
      this.colors[idx3] = colorStart.r + (colorEnd.r - colorStart.r) * t;
      this.colors[idx3 + 1] = colorStart.g + (colorEnd.g - colorStart.g) * t;
      this.colors[idx3 + 2] = colorStart.b + (colorEnd.b - colorStart.b) * t;

      this.sizeMultipliers[i] = this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize);
      this.sizes[i] = this.sizeMultipliers[i] * (this.baseSize / this.config.defaultBaseSize);
    }
  }

  private createPointsGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    return geometry;
  }

  private createPoints(): THREE.Points {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          vec3 glow = vColor * 1.5;
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(this.pointsGeometry, material);
    points.frustumCulled = false;
    return points;
  }

  private createLines(): THREE.LineSegments {
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });

    this.linesGeometry.setAttribute('position', new THREE.BufferAttribute(this.linkPositions, 3));
    const lines = new THREE.LineSegments(this.linesGeometry, material);
    lines.frustumCulled = false;
    return lines;
  }

  public explode(): void {
    this.isExploding = true;
    this.explodeTime = 0;
    this.isReturning = false;

    for (let i = 0; i < this.config.particleCount; i++) {
      const idx3 = i * 3;
      const x = this.currentPositions[idx3];
      const y = this.currentPositions[idx3 + 1];
      const z = this.currentPositions[idx3 + 2];

      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const speed = 1.5;
      this.velocities[idx3] = (x / len) * speed;
      this.velocities[idx3 + 1] = (y / len) * speed;
      this.velocities[idx3 + 2] = (z / len) * speed;
    }
  }

  public triggerGravity(center: THREE.Vector3): void {
    this.isGravityActive = true;
    this.gravityTime = 0;
    this.gravityCenter.copy(center);
  }

  public setSculpting(active: boolean): void {
    this.isSculpting = active;
  }

  public setSculptCenter(center: THREE.Vector3): void {
    this.sculptCenter.copy(center);
  }

  public reset(): void {
    this.isExploding = false;
    this.isReturning = false;
    this.isGravityActive = false;

    for (let i = 0; i < this.config.particleCount * 3; i++) {
      this.currentPositions[i] = this.originalPositions[i];
      this.velocities[i] = 0;
    }

    (this.pointsGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public setBaseSize(size: number): void {
    this.baseSize = size;
    for (let i = 0; i < this.config.particleCount; i++) {
      this.sizes[i] = this.sizeMultipliers[i] * (this.baseSize / this.config.defaultBaseSize);
    }
    (this.pointsGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public setLinkDistance(distance: number): void {
    this.linkDistance = distance;
  }

  public getParticleCount(): number {
    return this.config.particleCount;
  }

  public update(deltaTime: number): void {
    this.updateExplosion(deltaTime);
    this.updateGravity(deltaTime);
    this.updateSculpt(deltaTime);
    this.updateVelocity(deltaTime);
    (this.pointsGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.updateLinks();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private updateExplosion(deltaTime: number): void {
    if (this.isExploding) {
      this.explodeTime += deltaTime;
      const decay = Math.exp(-this.explodeTime * 2);

      for (let i = 0; i < this.config.particleCount; i++) {
        const idx3 = i * 3;
        this.currentPositions[idx3] += this.velocities[idx3] * deltaTime * decay;
        this.currentPositions[idx3 + 1] += this.velocities[idx3 + 1] * deltaTime * decay;
        this.currentPositions[idx3 + 2] += this.velocities[idx3 + 2] * deltaTime * decay;
      }

      if (this.explodeTime >= this.explodeDuration) {
        this.isExploding = false;
        this.isReturning = true;
        this.returnTime = 0;
        for (let i = 0; i < this.config.particleCount * 3; i++) {
          this.velocities[i] = 0;
        }
      }
    }

    if (this.isReturning) {
      this.returnTime += deltaTime;
      const t = Math.min(this.returnTime / this.returnDuration, 1);
      const ease = this.easeOutCubic(t);

      for (let i = 0; i < this.config.particleCount; i++) {
        const idx3 = i * 3;
        this.currentPositions[idx3] = this.currentPositions[idx3] + (this.originalPositions[idx3] - this.currentPositions[idx3]) * ease * deltaTime * 3;
        this.currentPositions[idx3 + 1] = this.currentPositions[idx3 + 1] + (this.originalPositions[idx3 + 1] - this.currentPositions[idx3 + 1]) * ease * deltaTime * 3;
        this.currentPositions[idx3 + 2] = this.currentPositions[idx3 + 2] + (this.originalPositions[idx3 + 2] - this.currentPositions[idx3 + 2]) * ease * deltaTime * 3;
      }

      if (t >= 1) {
        this.isReturning = false;
        for (let i = 0; i < this.config.particleCount * 3; i++) {
          this.currentPositions[i] = this.originalPositions[i];
        }
      }
    }
  }

  private updateGravity(deltaTime: number): void {
    if (!this.isGravityActive) return;

    this.gravityTime += deltaTime;
    const t = Math.min(this.gravityTime / this.gravityDuration, 1);
    const accelFactor = this.easeInQuad(t);

    for (let i = 0; i < this.config.particleCount; i++) {
      const idx3 = i * 3;
      this.tempVec.set(
        this.gravityCenter.x - this.currentPositions[idx3],
        this.gravityCenter.y - this.currentPositions[idx3 + 1],
        this.gravityCenter.z - this.currentPositions[idx3 + 2]
      );

      const dist = this.tempVec.length();
      if (dist < this.gravityRadius && dist > 0.001) {
        this.tempVec.normalize();
        const falloff = 1 - dist / this.gravityRadius;
        const speed = this.gravityMaxSpeed * accelFactor * falloff;

        this.currentPositions[idx3] += this.tempVec.x * speed * deltaTime;
        this.currentPositions[idx3 + 1] += this.tempVec.y * speed * deltaTime;
        this.currentPositions[idx3 + 2] += this.tempVec.z * speed * deltaTime;
      }
    }

    if (t >= 1) {
      this.isGravityActive = false;
    }
  }

  private updateSculpt(deltaTime: number): void {
    if (!this.isSculpting) return;

    for (let i = 0; i < this.config.particleCount; i++) {
      const idx3 = i * 3;
      this.tempVec.set(
        this.sculptCenter.x - this.currentPositions[idx3],
        this.sculptCenter.y - this.currentPositions[idx3 + 1],
        this.sculptCenter.z - this.currentPositions[idx3 + 2]
      );

      const dist = this.tempVec.length();
      if (dist < this.sculptRadius && dist > 0.001) {
        this.tempVec.normalize();
        const falloff = 1 - dist / this.sculptRadius;
        const strength = this.sculptStrength * falloff;

        this.currentPositions[idx3] += this.tempVec.x * strength * deltaTime * 5;
        this.currentPositions[idx3 + 1] += this.tempVec.y * strength * deltaTime * 5;
        this.currentPositions[idx3 + 2] += this.tempVec.z * strength * deltaTime * 5;
      }
    }
  }

  private updateVelocity(deltaTime: number): void {
    const damping = 0.95;
    for (let i = 0; i < this.config.particleCount * 3; i++) {
      this.velocities[i] *= damping;
    }
  }

  private updateLinks(): void {
    const count = this.config.particleCount;
    const linkDist = this.linkDistance;
    const linkDistSq = linkDist * linkDist;
    let linkIndex = 0;
    const maxLinks = 8000;
    let linkCount = 0;

    const step = count > 3000 ? 3 : count > 2000 ? 2 : 1;

    for (let i = 0; i < count && linkCount < maxLinks; i += step) {
      const i3 = i * 3;
      const ix = this.currentPositions[i3];
      const iy = this.currentPositions[i3 + 1];
      const iz = this.currentPositions[i3 + 2];

      for (let j = i + step; j < count && linkCount < maxLinks; j += step) {
        const j3 = j * 3;
        const dx = ix - this.currentPositions[j3];
        const dy = iy - this.currentPositions[j3 + 1];
        const dz = iz - this.currentPositions[j3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < linkDistSq) {
          this.linkPositions[linkIndex++] = ix;
          this.linkPositions[linkIndex++] = iy;
          this.linkPositions[linkIndex++] = iz;
          this.linkPositions[linkIndex++] = this.currentPositions[j3];
          this.linkPositions[linkIndex++] = this.currentPositions[j3 + 1];
          this.linkPositions[linkIndex++] = this.currentPositions[j3 + 2];
          linkCount++;
        }
      }
    }

    for (let i = linkIndex; i < this.linkPositions.length; i++) {
      this.linkPositions[i] = 0;
    }

    this.linesGeometry.setAttribute('position', new THREE.BufferAttribute(this.linkPositions, 3));
    this.linesGeometry.setDrawRange(0, linkCount * 2);
    (this.linesGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.pointsGeometry.dispose();
    this.linesGeometry.dispose();
    (this.points.material as THREE.Material).dispose();
    (this.lines.material as THREE.Material).dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.lines);
  }
}
