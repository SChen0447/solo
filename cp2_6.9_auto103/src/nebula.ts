import * as THREE from 'three';

export type ColorTheme = 'default' | 'bluePurple' | 'redPink' | 'greenPurple';

export interface NebulaParams {
  particleCount: number;
  particleSize: number;
  rotationSpeed: number;
  hueShift: number;
  colorTheme: ColorTheme;
}

const COLOR_THEMES: Record<ColorTheme, { hueMin: number; hueMax: number }> = {
  default: { hueMin: 220, hueMax: 340 },
  bluePurple: { hueMin: 200, hueMax: 300 },
  redPink: { hueMin: 300, hueMax: 360 },
  greenPurple: { hueMin: 120, hueMax: 300 }
};

class PerlinNoise {
  private permutation: number[];

  constructor() {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    for (let i = 0; i < 256; i++) {
      this.permutation[i + 256] = this.permutation[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

export class Nebula {
  public group: THREE.Group;
  public params: NebulaParams;

  private nebulaPoints!: THREE.Points;
  private nebulaGeometry!: THREE.BufferGeometry;
  private nebulaMaterial!: THREE.PointsMaterial;

  private starsPoints!: THREE.Points;
  private starsGeometry!: THREE.BufferGeometry;

  private boundaryWireframe!: THREE.LineSegments;

  private basePositions!: Float32Array;
  private baseColors!: Float32Array;
  private targetColors!: Float32Array;
  private currentColors!: Float32Array;
  private colorTransitionProgress = 1;
  private noise: PerlinNoise;
  private time = 0;
  private baseParticleSize = 0.6;

  constructor(params: Partial<NebulaParams> = {}) {
    this.params = {
      particleCount: 10000,
      particleSize: 0.6,
      rotationSpeed: 0.001,
      hueShift: 0,
      colorTheme: 'default',
      ...params
    };
    this.baseParticleSize = this.params.particleSize;
    this.noise = new PerlinNoise();
    this.group = new THREE.Group();
    this.init();
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private generateParticleColors(hueMin: number, hueMax: number, hueShift: number): Float32Array {
    const colors = new Float32Array(this.params.particleCount * 3);
    const color = new THREE.Color();
    for (let i = 0; i < this.params.particleCount; i++) {
      let hue = hueMin + Math.random() * (hueMax - hueMin) + hueShift;
      hue = hue % 360;
      if (hue < 0) hue += 360;
      const saturation = 0.6 + Math.random() * 0.4;
      const lightness = 0.5 + Math.random() * 0.3;
      color.setHSL(hue / 360, saturation, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }

  private init(): void {
    const count = this.params.particleCount;

    this.nebulaGeometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const gauss = Math.abs(this.gaussianRandom());
      const radius = 8 + gauss * 7;
      const clampedRadius = Math.min(15, Math.max(8, radius));

      const x = clampedRadius * Math.sin(phi) * Math.cos(theta);
      const y = clampedRadius * Math.sin(phi) * Math.sin(theta);
      const z = clampedRadius * Math.cos(phi);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.1 + Math.random() * 0.9;
      alphas[i] = 0.5 + Math.random() * 0.3;
    }

    this.nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.nebulaGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const theme = COLOR_THEMES[this.params.colorTheme];
    this.baseColors = this.generateParticleColors(theme.hueMin, theme.hueMax, this.params.hueShift);
    this.currentColors = new Float32Array(this.baseColors);
    this.targetColors = new Float32Array(this.baseColors);
    this.nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3));

    const glowTexture = this.createGlowTexture();
    this.nebulaMaterial = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.nebulaPoints = new THREE.Points(this.nebulaGeometry, this.nebulaMaterial);
    this.group.add(this.nebulaPoints);

    this.initStars();
    this.initBoundary();
  }

  private initStars(): void {
    const starCount = 2000;
    this.starsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 1.1;
      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.starsPoints = new THREE.Points(this.starsGeometry, starMaterial);
    this.group.add(this.starsPoints);
  }

  private initBoundary(): void {
    const geometry = new THREE.SphereGeometry(18, 32, 32);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(100 / 255, 150 / 255, 255 / 255),
      transparent: true,
      opacity: 0.1
    });
    this.boundaryWireframe = new THREE.LineSegments(edges, material);
    this.group.add(this.boundaryWireframe);
  }

  public updateParticleCount(newCount: number): void {
    if (newCount === this.params.particleCount) return;
    this.params.particleCount = newCount;

    this.group.remove(this.nebulaPoints);
    this.nebulaGeometry.dispose();
    this.nebulaMaterial.dispose();

    const count = this.params.particleCount;
    this.nebulaGeometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const gauss = Math.abs(this.gaussianRandom());
      const radius = 8 + gauss * 7;
      const clampedRadius = Math.min(15, Math.max(8, radius));

      const x = clampedRadius * Math.sin(phi) * Math.cos(theta);
      const y = clampedRadius * Math.sin(phi) * Math.sin(theta);
      const z = clampedRadius * Math.cos(phi);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.1 + Math.random() * 0.9;
      alphas[i] = 0.5 + Math.random() * 0.3;
    }

    this.nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.nebulaGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const theme = COLOR_THEMES[this.params.colorTheme];
    this.baseColors = this.generateParticleColors(theme.hueMin, theme.hueMax, this.params.hueShift);
    this.currentColors = new Float32Array(this.baseColors);
    this.targetColors = new Float32Array(this.baseColors);
    this.nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3));

    const glowTexture = this.createGlowTexture();
    this.nebulaMaterial = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.nebulaPoints = new THREE.Points(this.nebulaGeometry, this.nebulaMaterial);
    this.group.add(this.nebulaPoints);
    this.colorTransitionProgress = 1;
  }

  public updateParticleSize(size: number): void {
    this.params.particleSize = size;
    this.baseParticleSize = size;
    this.nebulaMaterial.size = size;
  }

  public updateRotationSpeed(speed: number): void {
    this.params.rotationSpeed = speed;
  }

  public updateHueShift(shift: number): void {
    this.params.hueShift = shift;
    const theme = COLOR_THEMES[this.params.colorTheme];
    this.targetColors = this.generateParticleColors(theme.hueMin, theme.hueMax, shift);
    this.colorTransitionProgress = 0;
  }

  public updateColorTheme(theme: ColorTheme): void {
    this.params.colorTheme = theme;
    const themeRange = COLOR_THEMES[theme];
    this.targetColors = this.generateParticleColors(themeRange.hueMin, themeRange.hueMax, this.params.hueShift);
    this.colorTransitionProgress = 0;
  }

  public updateCameraDistanceScale(scale: number): void {
    this.nebulaMaterial.size = this.baseParticleSize * scale;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.group.rotation.y += this.params.rotationSpeed;

    const positions = this.nebulaGeometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const noiseScale = 0.05;
    const noiseAmp = 0.05;

    for (let i = 0; i < this.params.particleCount; i++) {
      const idx = i * 3;
      const bx = this.basePositions[idx];
      const by = this.basePositions[idx + 1];
      const bz = this.basePositions[idx + 2];

      const nx = this.noise.noise(bx * noiseScale + this.time * 0.1, by * noiseScale, bz * noiseScale);
      const ny = this.noise.noise(bx * noiseScale, by * noiseScale + this.time * 0.1, bz * noiseScale);
      const nz = this.noise.noise(bx * noiseScale, by * noiseScale, bz * noiseScale + this.time * 0.1);

      posArray[idx] = bx + nx * noiseAmp;
      posArray[idx + 1] = by + ny * noiseAmp;
      posArray[idx + 2] = bz + nz * noiseAmp;
    }
    positions.needsUpdate = true;

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime / 0.8);
      const t = this.colorTransitionProgress;
      const colors = this.nebulaGeometry.getAttribute('color') as THREE.BufferAttribute;
      const colorArray = colors.array as Float32Array;
      for (let i = 0; i < this.params.particleCount * 3; i++) {
        colorArray[i] = this.currentColors[i] + (this.targetColors[i] - this.currentColors[i]) * t;
      }
      colors.needsUpdate = true;
      if (this.colorTransitionProgress >= 1) {
        this.currentColors = new Float32Array(this.targetColors);
      }
    }

    const starPositions = this.starsGeometry.getAttribute('position') as THREE.BufferAttribute;
    const starPosArray = starPositions.array as Float32Array;
    const starCount = starPosArray.length / 3;
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const twinkle = 0.9 + 0.1 * Math.sin(this.time * 2 + i * 0.5);
      starPosArray[idx] *= 1;
    }
  }

  public dispose(): void {
    this.nebulaGeometry.dispose();
    this.nebulaMaterial.dispose();
    this.starsGeometry.dispose();
    (this.starsPoints.material as THREE.Material).dispose();
    (this.boundaryWireframe.geometry as THREE.BufferGeometry).dispose();
    (this.boundaryWireframe.material as THREE.Material).dispose();
  }
}
