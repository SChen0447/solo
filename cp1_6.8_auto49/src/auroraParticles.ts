import * as THREE from 'three';

export interface AuroraOptions {
  particleCount: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  waveSpeed: number;
}

export class AuroraParticles {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private maxParticles: number = 12000;
  private minParticles: number = 4000;
  private currentCount: number;
  private targetCount: number;
  private colorStart: THREE.Color;
  private colorEnd: THREE.Color;
  private waveSpeed: number;
  private time: number = 0;
  private layerCount: number = 12;
  private basePositions: Float32Array;
  private baseColors: Float32Array;
  private sizes: Float32Array;
  private waveAmplitudes: Float32Array;
  private waveFrequenciesX: Float32Array;
  private waveFrequenciesZ: Float32Array;
  private wavePhasesX: Float32Array;
  private wavePhasesZ: Float32Array;
  private opacityTransition: number = 1;
  private targetOpacity: number = 1;
  private isTransitioning: boolean = false;

  constructor(scene: THREE.Scene, options: AuroraOptions) {
    this.scene = scene;
    this.currentCount = Math.floor(options.particleCount);
    this.targetCount = this.currentCount;
    this.colorStart = options.colorStart.clone();
    this.colorEnd = options.colorEnd.clone();
    this.waveSpeed = options.waveSpeed;

    this.basePositions = new Float32Array(this.maxParticles * 3);
    this.baseColors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.waveAmplitudes = new Float32Array(this.maxParticles);
    this.waveFrequenciesX = new Float32Array(this.maxParticles);
    this.waveFrequenciesZ = new Float32Array(this.maxParticles);
    this.wavePhasesX = new Float32Array(this.maxParticles);
    this.wavePhasesZ = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    this.initParticleData();
    this.buildGeometry();
  }

  private initParticleData(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const layerIndex = Math.floor(Math.random() * this.layerCount);
      const heightRatio = layerIndex / (this.layerCount - 1);
      const y = this.getLayerHeight(layerIndex);

      const radius = 6 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = (0.15 + Math.random() * 0.7) * Math.PI;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      const r = this.colorStart.r + (this.colorEnd.r - this.colorStart.r) * heightRatio;
      const g = this.colorStart.g + (this.colorEnd.g - this.colorStart.g) * heightRatio;
      const b = this.colorStart.b + (this.colorEnd.b - this.colorStart.b) * heightRatio;

      const alpha = 0.3 + heightRatio * 0.7;
      this.baseColors[i * 3] = r * alpha;
      this.baseColors[i * 3 + 1] = g * alpha;
      this.baseColors[i * 3 + 2] = b * alpha;

      this.sizes[i] = 0.6 + (1 - heightRatio) * 2.0;

      this.waveAmplitudes[i] = 0.5 + Math.random() * 1.5;
      this.waveFrequenciesX[i] = 0.15 + Math.random() * 0.35;
      this.waveFrequenciesZ[i] = 0.1 + Math.random() * 0.3;
      this.wavePhasesX[i] = Math.random() * Math.PI * 2;
      this.wavePhasesZ[i] = Math.random() * Math.PI * 2;
    }
  }

  private getLayerHeight(layerIndex: number): number {
    const minHeight = -4;
    const maxHeight = 8;
    return minHeight + (layerIndex / (this.layerCount - 1)) * (maxHeight - minHeight);
  }

  private buildGeometry(): void {
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = this.basePositions[i * 3];
      positions[i * 3 + 1] = this.basePositions[i * 3 + 1];
      positions[i * 3 + 2] = this.basePositions[i * 3 + 2];

      colors[i * 3] = this.baseColors[i * 3];
      colors[i * 3 + 1] = this.baseColors[i * 3 + 1];
      colors[i * 3 + 2] = this.baseColors[i * 3 + 2];
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, this.currentCount);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.waveSpeed;

    if (this.isTransitioning) {
      const diff = this.targetOpacity - this.opacityTransition;
      const easeSpeed = deltaTime * 4;
      this.opacityTransition += diff * Math.min(easeSpeed, 1);
      
      if (Math.abs(diff) < 0.01) {
        this.opacityTransition = this.targetOpacity;
        
        if (this.targetOpacity === 0) {
          this.currentCount = this.targetCount;
          this.geometry.setDrawRange(0, this.currentCount);
          this.targetOpacity = 1;
        } else {
          this.isTransitioning = false;
        }
      }
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    for (let i = 0; i < this.currentCount; i++) {
      const idx = i * 3;
      const baseX = this.basePositions[idx];
      const baseY = this.basePositions[idx + 1];
      const baseZ = this.basePositions[idx + 2];

      const amp = this.waveAmplitudes[i];
      const waveX = Math.sin(this.time * this.waveFrequenciesX[i] + this.wavePhasesX[i]) * amp;
      const waveZ = Math.cos(this.time * this.waveFrequenciesZ[i] + this.wavePhasesZ[i]) * amp * 0.6;
      const waveY = Math.sin(this.time * 0.2 + this.wavePhasesX[i]) * 0.15;

      positions[idx] = baseX + waveX;
      positions[idx + 1] = baseY + waveY;
      positions[idx + 2] = baseZ + waveZ;
    }

    positionAttr.needsUpdate = true;
    this.material.opacity = this.opacityTransition;
  }

  public setParticleCount(count: number): void {
    const clamped = Math.floor(Math.max(this.minParticles, Math.min(this.maxParticles, count)));
    if (clamped !== this.targetCount) {
      this.targetCount = clamped;
      this.targetOpacity = 0;
      this.isTransitioning = true;
    }
  }

  public setColors(start: THREE.Color, end: THREE.Color): void {
    this.colorStart.copy(start);
    this.colorEnd.copy(end);

    for (let i = 0; i < this.maxParticles; i++) {
      const y = this.basePositions[i * 3 + 1];
      const normalizedY = (y + 4) / 12;
      const t = Math.max(0, Math.min(1, normalizedY));

      const r = this.colorStart.r + (this.colorEnd.r - this.colorStart.r) * t;
      const g = this.colorStart.g + (this.colorEnd.g - this.colorStart.g) * t;
      const b = this.colorStart.b + (this.colorEnd.b - this.colorStart.b) * t;

      const alpha = 0.3 + t * 0.7;
      this.baseColors[i * 3] = r * alpha;
      this.baseColors[i * 3 + 1] = g * alpha;
      this.baseColors[i * 3 + 2] = b * alpha;
    }

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    for (let i = 0; i < this.maxParticles; i++) {
      colors[i * 3] = this.baseColors[i * 3];
      colors[i * 3 + 1] = this.baseColors[i * 3 + 1];
      colors[i * 3 + 2] = this.baseColors[i * 3 + 2];
    }
    colorAttr.needsUpdate = true;
  }

  public setWaveSpeed(speed: number): void {
    this.waveSpeed = speed;
  }

  public getParticleCount(): number {
    return this.targetCount;
  }

  public getWaveSpeed(): number {
    return this.waveSpeed;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.particles);
  }
}
