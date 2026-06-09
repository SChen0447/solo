import * as THREE from 'three';

export type ColorTheme = 'purple' | 'blue' | 'red';

interface ThemeColors {
  start: THREE.Color;
  end: THREE.Color;
}

const THEMES: Record<ColorTheme, ThemeColors> = {
  purple: {
    start: new THREE.Color(0x8a2be2),
    end: new THREE.Color(0xda70d6),
  },
  blue: {
    start: new THREE.Color(0x1e90ff),
    end: new THREE.Color(0x00bfff),
  },
  red: {
    start: new THREE.Color(0xff4500),
    end: new THREE.Color(0xff6347),
  },
};

const PARTICLE_COUNT = 5000;
const ANGULAR_SPEED = 0.003;
const RADIAL_FLUCTUATION = 0.005;
const TRANSITION_DURATION = 500;

export class Nebula {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private basePositions: Float32Array;
  private currentColors: Float32Array;
  private targetColors: Float32Array;
  private thetaOffsets: Float32Array;
  private phiOffsets: Float32Array;
  private baseRadii: Float32Array;
  private currentTheme: ColorTheme = 'purple';
  private transitionProgress: number = 1;
  private fromColors: Float32Array | null = null;
  private toColors: Float32Array | null = null;
  private shockwaveActive: boolean = false;
  private shockwaveProgress: number = 0;
  private shockwaveDuration: number = 800;
  private particleSizeMultiplier: number = 1;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.currentColors = new Float32Array(PARTICLE_COUNT * 3);
    this.targetColors = new Float32Array(PARTICLE_COUNT * 3);
    this.thetaOffsets = new Float32Array(PARTICLE_COUNT);
    this.phiOffsets = new Float32Array(PARTICLE_COUNT);
    this.baseRadii = new Float32Array(PARTICLE_COUNT);

    this.initializeParticles();
    this.initializeColors();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.basePositions), 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.currentColors), 3));

    const sizes = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sizes[i] = 0.1 + Math.random() * 0.4;
    }
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const densityFactor = Math.pow(Math.random(), 0.5);
      const r = 8 + densityFactor * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.baseRadii[i] = r;
      this.thetaOffsets[i] = theta;
      this.phiOffsets[i] = phi;

      const idx = i * 3;
      this.basePositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      this.basePositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.basePositions[idx + 2] = r * Math.cos(phi);
    }
  }

  private initializeColors(): void {
    const theme = THEMES[this.currentTheme];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random();
      const color = new THREE.Color().lerpColors(theme.start, theme.end, t);
      const idx = i * 3;
      this.currentColors[idx] = color.r;
      this.currentColors[idx + 1] = color.g;
      this.currentColors[idx + 2] = color.b;
      this.targetColors[idx] = color.r;
      this.targetColors[idx + 1] = color.g;
      this.targetColors[idx + 2] = color.b;
    }
  }

  public setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return;

    this.fromColors = new Float32Array(this.currentColors);
    this.toColors = new Float32Array(PARTICLE_COUNT * 3);

    const themeColors = THEMES[theme];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random();
      const color = new THREE.Color().lerpColors(themeColors.start, themeColors.end, t);
      const idx = i * 3;
      this.toColors[idx] = color.r;
      this.toColors[idx + 1] = color.g;
      this.toColors[idx + 2] = color.b;
      this.targetColors[idx] = color.r;
      this.targetColors[idx + 1] = color.g;
      this.targetColors[idx + 2] = color.b;
    }

    this.currentTheme = theme;
    this.transitionProgress = 0;
  }

  public triggerShockwave(): void {
    this.shockwaveActive = true;
    this.shockwaveProgress = 0;
  }

  public setParticleSizeMultiplier(multiplier: number): void {
    this.particleSizeMultiplier = multiplier;
  }

  public update(time: number, deltaTime: number): void {
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const sizes = sizeAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const angularOffset = time * ANGULAR_SPEED + this.thetaOffsets[i];
      const radialOffset = Math.sin(time * RADIAL_FLUCTUATION * 60 + this.thetaOffsets[i] * 2) * RADIAL_FLUCTUATION;

      let shockwaveOffset = 0;
      if (this.shockwaveActive) {
        const t = this.shockwaveProgress;
        shockwaveOffset = Math.sin(t * Math.PI) * 1.5;
      }

      const r = this.baseRadii[i] + radialOffset + shockwaveOffset;
      const theta = angularOffset;
      const phi = this.phiOffsets[i] + Math.sin(time * 0.001 + this.thetaOffsets[i]) * 0.002;

      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi);

      sizes[i] = (0.1 + (this.baseRadii[i] - 8) / 7 * 0.4) * this.particleSizeMultiplier;
    }

    if (this.transitionProgress < 1 && this.fromColors && this.toColors) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / TRANSITION_DURATION);
      const t = this.easeInOut(this.transitionProgress);
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        colors[i] = this.fromColors[i] + (this.toColors[i] - this.fromColors[i]) * t;
      }
      if (this.transitionProgress >= 1) {
        this.fromColors = null;
        this.toColors = null;
      }
    }

    if (this.shockwaveActive) {
      this.shockwaveProgress = Math.min(1, this.shockwaveProgress + deltaTime / this.shockwaveDuration);
      if (this.shockwaveProgress >= 1) {
        this.shockwaveActive = false;
      }
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public getCurrentTheme(): ColorTheme {
    return this.currentTheme;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
