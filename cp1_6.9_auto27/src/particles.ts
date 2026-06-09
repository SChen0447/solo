import * as THREE from 'three';

export interface ParticleSystemOptions {
  count: number;
  sizeRange: [number, number];
  colorRange: [string, string];
  radiusRange: [number, number];
  heightRange: [number, number];
}

export interface ParticleUpdateParams {
  time: number;
  deltaTime: number;
  rotationSpeed: number;
  targetHeight: number;
  lifecyclePhase: 'spawning' | 'stable' | 'dissipating';
  lifecycleProgress: number;
  opacity: number;
  noiseAmplitude: number;
}

function pseudoNoise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, z: number, time: number): number {
  const t = time * 0.5;
  const n1 = pseudoNoise(x + t, y, z);
  const n2 = pseudoNoise(x, y + t, z);
  const n3 = pseudoNoise(x, y, z + t);
  return (n1 + n2 + n3) / 3 - 0.5;
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export class ParticleSystem {
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private basePositions: Float32Array;
  private baseSizes: Float32Array;
  private baseColors: Float32Array;
  private lifetimes: Float32Array;
  private options: ParticleSystemOptions;
  private currentCount: number;

  constructor(options: ParticleSystemOptions) {
    this.options = options;
    this.currentCount = options.count;

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(options.count * 3);
    this.baseSizes = new Float32Array(options.count);
    this.baseColors = new Float32Array(options.count * 3);
    this.lifetimes = new Float32Array(options.count);

    const positions = new Float32Array(options.count * 3);
    const colors = new Float32Array(options.count * 3);
    const sizes = new Float32Array(options.count);

    const colorStart = new THREE.Color(options.colorRange[0]);
    const colorEnd = new THREE.Color(options.colorRange[1]);

    for (let i = 0; i < options.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = options.radiusRange[0] + Math.random() * (options.radiusRange[1] - options.radiusRange[0]);
      const height = options.heightRange[0] + Math.random() * (options.heightRange[1] - options.heightRange[0]);

      const bx = Math.cos(angle) * radius;
      const by = height;
      const bz = Math.sin(angle) * radius;

      this.basePositions[i * 3] = bx;
      this.basePositions[i * 3 + 1] = by;
      this.basePositions[i * 3 + 2] = bz;

      positions[i * 3] = bx;
      positions[i * 3 + 1] = by;
      positions[i * 3 + 2] = bz;

      const size = options.sizeRange[0] + Math.random() * (options.sizeRange[1] - options.sizeRange[0]);
      sizes[i] = size;
      this.baseSizes[i] = size;

      const colorT = Math.random();
      const c = lerpColor(colorStart, colorEnd, colorT);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      this.baseColors[i * 3] = c.r;
      this.baseColors[i * 3 + 1] = c.g;
      this.baseColors[i * 3 + 2] = c.b;

      this.lifetimes[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  getMesh(): THREE.Points {
    return this.points;
  }

  setCount(count: number): void {
    const maxCount = this.options.count;
    this.currentCount = Math.min(count, maxCount);
    const drawRange = Math.max(0, this.currentCount);
    this.geometry.setDrawRange(0, drawRange);
  }

  getCount(): number {
    return this.currentCount;
  }

  setBaseOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }

  setSizeScale(scale: number): void {
    this.material.size = scale;
  }

  update(params: ParticleUpdateParams): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const sizeArray = sizes.array as Float32Array;

    const activeCount = this.currentCount;
    const heightScale = params.targetHeight / Math.max(1, this.options.heightRange[1]);

    for (let i = 0; i < activeCount; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1] * heightScale;
      const bz = this.basePositions[i * 3 + 2];

      const angle = params.time * params.rotationSpeed + (i / activeCount) * Math.PI * 4;
      const radiusFactor = 1 - (by / Math.max(1, params.targetHeight)) * 0.6;

      let px = Math.cos(angle) * Math.sqrt(bx * bx + bz * bz) * radiusFactor;
      let pz = Math.sin(angle) * Math.sqrt(bx * bx + bz * bz) * radiusFactor;
      let py = by;

      if (params.lifecyclePhase === 'stable' || params.lifecyclePhase === 'spawning') {
        const nx = smoothNoise(bx * 0.3, by * 0.2, bz * 0.3, params.time) * params.noiseAmplitude;
        const ny = smoothNoise(bx * 0.2, by * 0.4, bz * 0.1, params.time + 100) * params.noiseAmplitude * 0.5;
        const nz = smoothNoise(bx * 0.4, by * 0.1, bz * 0.2, params.time + 200) * params.noiseAmplitude;
        px += nx;
        py += ny;
        pz += nz;
      }

      let sizeScale = 1;
      if (params.lifecyclePhase === 'spawning') {
        sizeScale *= params.lifecycleProgress;
      } else if (params.lifecyclePhase === 'dissipating') {
        sizeScale *= (1 - params.lifecycleProgress);
      }

      posArray[i * 3] = px;
      posArray[i * 3 + 1] = py;
      posArray[i * 3 + 2] = pz;
      sizeArray[i] = this.baseSizes[i] * sizeScale;

      this.lifetimes[i] += params.deltaTime * 0.3;
      if (this.lifetimes[i] > 1) {
        this.lifetimes[i] = 0;
      }
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;

    if (params.lifecyclePhase === 'spawning') {
      this.material.opacity = params.opacity * params.lifecycleProgress;
    } else if (params.lifecyclePhase === 'dissipating') {
      this.material.opacity = params.opacity * (1 - params.lifecycleProgress);
    } else {
      this.material.opacity = params.opacity;
    }
  }

  reset(): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    for (let i = 0; i < this.options.count; i++) {
      posArray[i * 3] = this.basePositions[i * 3];
      posArray[i * 3 + 1] = this.basePositions[i * 3 + 1];
      posArray[i * 3 + 2] = this.basePositions[i * 3 + 2];
      this.lifetimes[i] = Math.random();
    }
    positions.needsUpdate = true;
    this.material.opacity = 1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
