import * as THREE from 'three';

export type ColorMode = 'original' | 'thermal' | 'neon';

export interface ParticleSystemParams {
  particleCount: number;
  colorMode: ColorMode;
  rotationSpeed: number;
  audioEnabled: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoWidth: number = 640;
  private videoHeight: number = 480;
  private params: ParticleSystemParams;
  private basePositions: Float32Array | null = null;
  private baseSizes: Float32Array | null = null;
  private baseColors: Float32Array | null = null;
  private baseZ: Float32Array | null = null;
  private rotationY: number = 0;
  private time: number = 0;
  private audioBands = { low: 0, mid: 0, high: 0 };

  constructor(scene: THREE.Scene, video: HTMLVideoElement) {
    this.scene = scene;
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.videoWidth;
    this.canvas.height = this.videoHeight;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    this.params = {
      particleCount: 5000,
      colorMode: 'original',
      rotationSpeed: 1,
      audioEnabled: false
    };

    this.init();
  }

  private init(): void {
    this.createParticles();
  }

  private createParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const count = this.params.particleCount;

    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.basePositions = new Float32Array(count * 3);
    this.baseColors = new Float32Array(count * 3);
    this.baseSizes = new Float32Array(count);
    this.baseZ = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 12;
      const y = (Math.random() - 0.5) * 9;
      const z = (Math.random() - 0.5) * 6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      this.baseZ[i] = z;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      this.baseColors[i * 3] = 1;
      this.baseColors[i * 3 + 1] = 1;
      this.baseColors[i * 3 + 2] = 1;

      const size = 0.05 + Math.random() * 0.05;
      sizes[i] = size;
      this.baseSizes[i] = size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  update(deltaTime: number): number {
    const startTime = performance.now();
    this.time += deltaTime;

    this.updateVideoTexture();

    if (this.params.audioEnabled) {
      this.applyAudioEffect();
    } else {
      this.resetAudioEffect();
    }

    this.rotationY += (this.params.rotationSpeed * Math.PI / 180) * deltaTime;
    if (this.particles) {
      this.particles.rotation.y = this.rotationY;
    }

    if (this.geometry) {
      (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    return performance.now() - startTime;
  }

  private updateVideoTexture(): void {
    if (!this.video.readyState || !this.geometry || !this.basePositions) return;

    this.ctx.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
    const imageData = this.ctx.getImageData(0, 0, this.videoWidth, this.videoHeight);
    const data = imageData.data;

    const count = this.params.particleCount;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const u = (this.basePositions![i * 3] + 6) / 12;
      const v = 1 - (this.basePositions![i * 3 + 1] + 4.5) / 9;

      const px = Math.floor(u * this.videoWidth);
      const py = Math.floor(v * this.videoHeight);

      const clampedPx = Math.max(0, Math.min(this.videoWidth - 1, px));
      const clampedPy = Math.max(0, Math.min(this.videoHeight - 1, py));

      const idx = (clampedPy * this.videoWidth + clampedPx) * 4;

      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const brightness = (r + g + b) / 3;

      const z = (brightness - 0.5) * 6;
      this.baseZ![i] = z;
      positions[i * 3 + 2] = z;

      const colorResult = this.applyColorMode(r, g, b, brightness);
      colors[i * 3] = colorResult.r;
      colors[i * 3 + 1] = colorResult.g;
      colors[i * 3 + 2] = colorResult.b;

      this.baseColors![i * 3] = colorResult.r;
      this.baseColors![i * 3 + 1] = colorResult.g;
      this.baseColors![i * 3 + 2] = colorResult.b;
    }
  }

  private applyColorMode(r: number, g: number, b: number, brightness: number): { r: number; g: number; b: number } {
    switch (this.params.colorMode) {
      case 'thermal':
        return this.thermalColor(brightness);
      case 'neon':
        return this.neonColor(brightness);
      case 'original':
      default:
        return { r, g, b };
    }
  }

  private thermalColor(t: number): { r: number; g: number; b: number } {
    let r, g, b;
    if (t < 0.25) {
      r = 0;
      g = 0;
      b = t * 4;
    } else if (t < 0.5) {
      r = 0;
      g = (t - 0.25) * 4;
      b = 1;
    } else if (t < 0.75) {
      r = (t - 0.5) * 4;
      g = 1;
      b = 1 - (t - 0.5) * 4;
    } else {
      r = 1;
      g = 1 - (t - 0.75) * 4;
      b = 0;
    }
    return { r, g, b };
  }

  private neonColor(t: number): { r: number; g: number; b: number } {
    const hue = (t * 0.6 + 0.5) % 1;
    return this.hslToRgb(hue, 1, 0.5 + t * 0.3);
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }

  private applyAudioEffect(): void {
    if (!this.geometry || !this.basePositions || !this.baseZ) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const count = this.params.particleCount;

    const lowOffset = this.audioBands.low * 0.5;
    const midOffset = this.audioBands.mid * 0.3;
    const sizeMultiplier = 1 + this.audioBands.high * 0.2;

    for (let i = 0; i < count; i++) {
      const baseX = this.basePositions[i * 3];
      const baseY = this.basePositions[i * 3 + 1];

      const waveY = Math.sin(this.time * 2 + baseX * 0.5) * lowOffset;
      const waveX = Math.cos(this.time * 3 + baseY * 0.5) * midOffset;

      positions[i * 3] = baseX + waveX;
      positions[i * 3 + 1] = baseY + waveY;
      positions[i * 3 + 2] = this.baseZ[i] + lowOffset * 0.5;
    }

    if (this.material) {
      this.material.size = 0.08 * sizeMultiplier;
    }
  }

  private resetAudioEffect(): void {
    if (!this.geometry || !this.basePositions || !this.baseZ) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const count = this.params.particleCount;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.basePositions[i * 3];
      positions[i * 3 + 1] = this.basePositions[i * 3 + 1];
      positions[i * 3 + 2] = this.baseZ[i];
    }

    if (this.material) {
      this.material.size = 0.08;
    }
  }

  setAudioBands(low: number, mid: number, high: number): void {
    this.audioBands.low = low;
    this.audioBands.mid = mid;
    this.audioBands.high = high;
  }

  setParticleCount(count: number): void {
    if (count === this.params.particleCount) return;
    this.params.particleCount = count;
    this.createParticles();
  }

  setColorMode(mode: ColorMode): void {
    this.params.colorMode = mode;
  }

  setRotationSpeed(speed: number): void {
    this.params.rotationSpeed = speed;
  }

  setAudioEnabled(enabled: boolean): void {
    this.params.audioEnabled = enabled;
  }

  getParticleCount(): number {
    return this.params.particleCount;
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }
  }
}
