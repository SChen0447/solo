import * as THREE from 'three';

export interface BrownianParams {
  temperature: number;
  viscosity: number;
  particleSize: number;
}

export class BrownianSystem {
  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D;
  private boundary: number = 4.0;

  private currentParams: BrownianParams;
  private targetParams: BrownianParams;
  private transitionStart: number = 0;
  private transitionDuration: number = 500;
  private isTransitioning: boolean = false;

  private avgSpeed: number = 0;
  private colorStart: THREE.Color;
  private colorEnd: THREE.Color;

  constructor(count: number = 500) {
    this.particleCount = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    this.currentParams = {
      temperature: 50,
      viscosity: 30,
      particleSize: 0.06
    };
    this.targetParams = { ...this.currentParams };

    this.colorStart = new THREE.Color(0x00BFFF);
    this.colorEnd = new THREE.Color(0xFF69B4);
    this.dummy = new THREE.Object3D();

    this.initializeParticles();
    this.instancedMesh = this.createInstancedMesh();
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * this.boundary * 2;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * this.boundary * 2;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * this.boundary * 2;

      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0;
      this.velocities[i * 3 + 2] = 0;

      this.sizes[i] = this.currentParams.particleSize;

      const t = i / (this.particleCount - 1);
      const color = this.colorStart.clone().lerp(this.colorEnd, t);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
  }

  private createInstancedMesh(): THREE.InstancedMesh {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.InstancedMesh(geometry, material, this.particleCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.updateInstanceMatrices();
    this.updateInstanceColors();

    return mesh;
  }

  private updateInstanceMatrices(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const x = this.positions[i * 3];
      const y = this.positions[i * 3 + 1];
      const z = this.positions[i * 3 + 2];
      const s = this.sizes[i];

      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateInstanceColors(): void {
    const color = new THREE.Color();
    for (let i = 0; i < this.particleCount; i++) {
      color.setRGB(
        this.colors[i * 3],
        this.colors[i * 3 + 1],
        this.colors[i * 3 + 2]
      );
      this.instancedMesh.setColorAt(i, color);
    }
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private getInterpolatedParams(): BrownianParams {
    if (!this.isTransitioning) {
      return { ...this.currentParams };
    }

    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const t = Math.min(elapsed / this.transitionDuration, 1);
    const easeT = t * t * (3 - 2 * t);

    if (t >= 1) {
      this.isTransitioning = false;
      this.currentParams = { ...this.targetParams };
      return { ...this.currentParams };
    }

    return {
      temperature: this.currentParams.temperature + (this.targetParams.temperature - this.currentParams.temperature) * easeT,
      viscosity: this.currentParams.viscosity + (this.targetParams.viscosity - this.currentParams.viscosity) * easeT,
      particleSize: this.currentParams.particleSize + (this.targetParams.particleSize - this.currentParams.particleSize) * easeT
    };
  }

  public update(deltaTime: number): void {
    const params = this.getInterpolatedParams();
    const sigma = 0.01 + (params.temperature / 100) * 0.14;
    const damping = 1 - (params.viscosity / 100) * 0.05;
    const dt = Math.min(deltaTime, 0.05);

    let totalSpeed = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      const noiseX = this.gaussianRandom() * sigma;
      const noiseY = this.gaussianRandom() * sigma;
      const noiseZ = this.gaussianRandom() * sigma;

      this.velocities[idx] = (this.velocities[idx] + noiseX) * damping;
      this.velocities[idx + 1] = (this.velocities[idx + 1] + noiseY) * damping;
      this.velocities[idx + 2] = (this.velocities[idx + 2] + noiseZ) * damping;

      this.positions[idx] += this.velocities[idx] * dt * 60;
      this.positions[idx + 1] += this.velocities[idx + 1] * dt * 60;
      this.positions[idx + 2] += this.velocities[idx + 2] * dt * 60;

      for (let j = 0; j < 3; j++) {
        if (this.positions[idx + j] > this.boundary) {
          this.positions[idx + j] = this.boundary;
          this.velocities[idx + j] *= -0.8;
        } else if (this.positions[idx + j] < -this.boundary) {
          this.positions[idx + j] = -this.boundary;
          this.velocities[idx + j] *= -0.8;
        }
      }

      const speed = Math.sqrt(
        this.velocities[idx] * this.velocities[idx] +
        this.velocities[idx + 1] * this.velocities[idx + 1] +
        this.velocities[idx + 2] * this.velocities[idx + 2]
      );
      totalSpeed += speed;

      this.sizes[i] = params.particleSize;
    }

    this.avgSpeed = totalSpeed / this.particleCount;
    this.updateInstanceMatrices();
  }

  public setParams(params: Partial<BrownianParams>): void {
    const now = performance.now();

    if (this.isTransitioning) {
      this.currentParams = this.getInterpolatedParams();
    }

    this.targetParams = {
      ...this.targetParams,
      ...params
    };

    this.transitionStart = now;
    this.isTransitioning = true;
  }

  public setParticleSize(size: number): void {
    this.setParams({ particleSize: size });
  }

  public setColorGradient(startColor: string, endColor: string): void {
    this.colorStart = new THREE.Color(startColor);
    this.colorEnd = new THREE.Color(endColor);

    for (let i = 0; i < this.particleCount; i++) {
      const t = i / (this.particleCount - 1);
      const color = this.colorStart.clone().lerp(this.colorEnd, t);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    this.updateInstanceColors();
  }

  public getMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  public getAverageSpeed(): number {
    return this.avgSpeed;
  }

  public getCurrentParams(): BrownianParams {
    return this.getInterpolatedParams();
  }

  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach(m => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
  }
}
