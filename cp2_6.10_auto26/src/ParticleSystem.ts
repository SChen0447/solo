import * as THREE from 'three';

export type NebulaShape = 'sphere' | 'spiral' | 'ring';
export type SizeDecay = 'linear' | 'exponential' | 'random';
export type ColorScheme = 'nebulaA' | 'nebulaB' | 'nebulaC';

export interface ParticleParams {
  count: number;
  spread: number;
  shape: NebulaShape;
  colorScheme: ColorScheme;
  rotationSpeed: number;
  baseSize: number;
  sizeDecay: SizeDecay;
}

const COLOR_SCHEMES: Record<ColorScheme, THREE.Color[]> = {
  nebulaA: [
    new THREE.Color(0x9333ea),
    new THREE.Color(0x3b82f6),
    new THREE.Color(0xec4899)
  ],
  nebulaB: [
    new THREE.Color(0x06b6d4),
    new THREE.Color(0x22c55e),
    new THREE.Color(0xeab308)
  ],
  nebulaC: [
    new THREE.Color(0xf97316),
    new THREE.Color(0xef4444),
    new THREE.Color(0xa855f7)
  ]
};

export class ParticleSystem {
  public mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  private currentParams: ParticleParams;
  private targetPositions: Float32Array;
  private originalPositions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private jitterOffsets: Float32Array;
  private distances: Float32Array;

  private morphing: boolean = false;
  private morphStartTime: number = 0;
  private morphDuration: number = 1000;
  private morphStartPositions: Float32Array | null = null;

  private rotation: number = 0;
  private time: number = 0;

  private lastUpdateTime: number = 0;

  constructor(params: ParticleParams) {
    this.currentParams = { ...params };

    this.geometry = new THREE.BufferGeometry();
    this.initBuffers(params.count);

    this.material = new THREE.PointsMaterial({
      size: params.baseSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.mesh = new THREE.Points(this.geometry, this.material);

    this.generatePositions(params.shape, params.spread);
    this.generateColors(params.colorScheme);
    this.generateSizes(params.baseSize, params.sizeDecay);
  }

  private initBuffers(count: number): void {
    this.originalPositions = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.jitterOffsets = new Float32Array(count * 3);
    this.distances = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.jitterOffsets[i * 3] = Math.random() * Math.PI * 2;
      this.jitterOffsets[i * 3 + 1] = Math.random() * Math.PI * 2;
      this.jitterOffsets[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private generatePositions(shape: NebulaShape, spread: number): void {
    const count = this.currentParams.count;

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number;
      const i3 = i * 3;

      switch (shape) {
        case 'sphere': {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = Math.pow(Math.random(), 0.5) * spread;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
          this.distances[i] = r / spread;
          break;
        }
        case 'spiral': {
          const arm = Math.floor(Math.random() * 3);
          const armOffset = (arm / 3) * Math.PI * 2;
          const t = Math.random();
          const angle = t * Math.PI * 6 + armOffset + (Math.random() - 0.5) * 0.5;
          const radius = t * spread * 0.9 + (Math.random() - 0.5) * spread * 0.1;
          x = Math.cos(angle) * radius;
          z = Math.sin(angle) * radius;
          y = (Math.random() - 0.5) * spread * 0.3 * (1 - t * 0.5);
          this.distances[i] = Math.sqrt(x * x + y * y + z * z) / spread;
          break;
        }
        case 'ring': {
          const theta = Math.random() * Math.PI * 2;
          const ringRadius = spread * 0.7 + (Math.random() - 0.5) * spread * 0.3;
          const thickness = (Math.random() - 0.5) * spread * 0.2;
          x = Math.cos(theta) * ringRadius;
          z = Math.sin(theta) * ringRadius;
          y = thickness;
          this.distances[i] = Math.sqrt(x * x + y * y + z * z) / spread;
          break;
        }
      }

      this.originalPositions[i3] = x;
      this.originalPositions[i3 + 1] = y;
      this.originalPositions[i3 + 2] = z;
      this.targetPositions[i3] = x;
      this.targetPositions[i3 + 1] = y;
      this.targetPositions[i3 + 2] = z;
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttr.array.set(this.originalPositions);
    positionAttr.needsUpdate = true;
  }

  private generateColors(colorScheme: ColorScheme): void {
    const colors = COLOR_SCHEMES[colorScheme];
    const count = this.currentParams.count;

    for (let i = 0; i < count; i++) {
      const dist = this.distances[i];
      let colorIndex: number;
      let t: number;

      if (dist < 0.33) {
        colorIndex = 0;
        t = dist / 0.33;
      } else if (dist < 0.66) {
        colorIndex = 1;
        t = (dist - 0.33) / 0.33;
      } else {
        colorIndex = 2;
        t = (dist - 0.66) / 0.34;
      }

      const c1 = colors[colorIndex];
      const c2 = colors[Math.min(colorIndex + 1, colors.length - 1)];

      const i3 = i * 3;
      this.colors[i3] = c1.r + (c2.r - c1.r) * t;
      this.colors[i3 + 1] = c1.g + (c2.g - c1.g) * t;
      this.colors[i3 + 2] = c1.b + (c2.b - c1.b) * t;
    }

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
  }

  private generateSizes(baseSize: number, sizeDecay: SizeDecay): void {
    const count = this.currentParams.count;

    for (let i = 0; i < count; i++) {
      const dist = this.distances[i];
      let size: number;

      switch (sizeDecay) {
        case 'linear':
          size = baseSize * (1 - dist * 0.6);
          break;
        case 'exponential':
          size = baseSize * Math.exp(-dist * 2);
          break;
        case 'random':
          size = baseSize * (0.3 + Math.random() * 0.7);
          break;
      }

      this.sizes[i] = Math.max(size, 0.001);
    }

    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
  }

  public updateParams(params: Partial<ParticleParams>): void {
    const needsRegenerate = params.shape !== undefined && params.shape !== this.currentParams.shape;
    const needsColors = params.colorScheme !== undefined && params.colorScheme !== this.currentParams.colorScheme;
    const needsSizes = (params.baseSize !== undefined && params.baseSize !== this.currentParams.baseSize) ||
                       (params.sizeDecay !== undefined && params.sizeDecay !== this.currentParams.sizeDecay);
    const needsCount = params.count !== undefined && params.count !== this.currentParams.count;
    const needsSpread = params.spread !== undefined && params.spread !== this.currentParams.spread;

    if (needsCount && params.count !== undefined) {
      this.currentParams.count = params.count;
      this.geometry.dispose();
      this.geometry = new THREE.BufferGeometry();
      this.initBuffers(params.count);
      this.generatePositions(this.currentParams.shape, this.currentParams.spread);
      this.generateColors(this.currentParams.colorScheme);
      this.generateSizes(this.currentParams.baseSize, this.currentParams.sizeDecay);
      this.mesh.geometry = this.geometry;
    }

    Object.assign(this.currentParams, params);

    if (params.rotationSpeed !== undefined) {
      this.currentParams.rotationSpeed = params.rotationSpeed;
    }

    if (needsSpread || needsRegenerate) {
      if (needsRegenerate && this.currentParams.shape !== undefined) {
        this.startMorph();
      }
      this.generatePositions(this.currentParams.shape, this.currentParams.spread);
    }

    if (needsColors && params.colorScheme) {
      this.generateColors(params.colorScheme);
    }

    if (needsSizes) {
      this.generateSizes(this.currentParams.baseSize, this.currentParams.sizeDecay);
      this.material.size = this.currentParams.baseSize;
    }
  }

  private startMorph(): void {
    const count = this.currentParams.count;
    this.morphStartPositions = new Float32Array(count * 3);
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.morphStartPositions.set(positionAttr.array as Float32Array);
    this.morphing = true;
    this.morphStartTime = performance.now();
  }

  public update(deltaTime: number): number {
    const startTime = performance.now();
    this.time += deltaTime;
    this.rotation += this.currentParams.rotationSpeed * 0.01;

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const count = this.currentParams.count;

    let morphProgress = 1;
    if (this.morphing) {
      morphProgress = Math.min((performance.now() - this.morphStartTime) / this.morphDuration, 1);
      morphProgress = morphProgress * morphProgress * (3 - 2 * morphProgress);
      if (morphProgress >= 1) {
        this.morphing = false;
        this.morphStartPositions = null;
      }
    }

    const sinRot = Math.sin(this.rotation);
    const cosRot = Math.cos(this.rotation);
    const jitterAmp = 0.05;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      let tx: number, ty: number, tz: number;
      if (this.morphing && this.morphStartPositions) {
        tx = this.morphStartPositions[i3] + (this.targetPositions[i3] - this.morphStartPositions[i3]) * morphProgress;
        ty = this.morphStartPositions[i3 + 1] + (this.targetPositions[i3 + 1] - this.morphStartPositions[i3 + 1]) * morphProgress;
        tz = this.morphStartPositions[i3 + 2] + (this.targetPositions[i3 + 2] - this.morphStartPositions[i3 + 2]) * morphProgress;
      } else {
        tx = this.targetPositions[i3];
        ty = this.targetPositions[i3 + 1];
        tz = this.targetPositions[i3 + 2];
      }

      const rx = tx * cosRot - tz * sinRot;
      const rz = tx * sinRot + tz * cosRot;

      const jx = Math.sin(this.time * 2 + this.jitterOffsets[i3]) * jitterAmp;
      const jy = Math.cos(this.time * 2.5 + this.jitterOffsets[i3 + 1]) * jitterAmp;
      const jz = Math.sin(this.time * 1.8 + this.jitterOffsets[i3 + 2]) * jitterAmp;

      positions[i3] = rx + jx;
      positions[i3 + 1] = ty + jy;
      positions[i3 + 2] = rz + jz;
    }

    positionAttr.needsUpdate = true;

    this.lastUpdateTime = performance.now() - startTime;
    return this.lastUpdateTime;
  }

  public getParticleCount(): number {
    return this.currentParams.count;
  }

  public getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
