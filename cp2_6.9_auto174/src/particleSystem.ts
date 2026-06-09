import * as THREE from 'three';

export type ParticleThemeName = 'neon' | 'ocean' | 'flame' | 'aurora';

export interface ParticleTheme {
  name: ParticleThemeName;
  colorLow: THREE.Color;
  colorHigh: THREE.Color;
}

export const PARTICLE_THEMES: Record<ParticleThemeName, ParticleTheme> = {
  neon: {
    name: 'neon',
    colorLow: new THREE.Color('#FF6F00'),
    colorHigh: new THREE.Color('#E91E63'),
  },
  ocean: {
    name: 'ocean',
    colorLow: new THREE.Color('#00BCD4'),
    colorHigh: new THREE.Color('#1976D2'),
  },
  flame: {
    name: 'flame',
    colorLow: new THREE.Color('#FF5722'),
    colorHigh: new THREE.Color('#FFEB3B'),
  },
  aurora: {
    name: 'aurora',
    colorLow: new THREE.Color('#00E676'),
    colorHigh: new THREE.Color('#B388FF'),
  },
};

const PARTICLE_COUNT = 8000;
const BASE_SIZE = 0.08;
const SIZE_MIN = 0.04;
const SIZE_MAX = 0.12;
const BASE_RADIUS = 3.0;
const MAX_RADIUS = 6.0;
const BASE_VERTICAL = 0.5;
const MAX_VERTICAL = 2.0;
const ROTATION_SPEED = 0.02;
const TRANSITION_DURATION = 2000;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface ParticleSystemUpdateParams {
  midFreq: number;
  highFreq: number;
  delta: number;
  time: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  private basePositions: Float32Array;
  private randomOffsets: Float32Array;
  private colorAttributes: THREE.BufferAttribute;
  private sizeAttributes: THREE.BufferAttribute;

  private currentTheme: ParticleTheme;
  private targetTheme: ParticleTheme;
  private themeTransitionStart: number = 0;
  private isTransitioning: boolean = false;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.randomOffsets = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5;
      this.basePositions[i3] = Math.cos(theta) * radius;
      this.basePositions[i3 + 1] = Math.random() * 5;
      this.basePositions[i3 + 2] = Math.sin(theta) * radius;

      this.randomOffsets[i3] = Math.random() * 100;
      this.randomOffsets[i3 + 1] = Math.random() * 100;
      this.randomOffsets[i3 + 2] = Math.random() * 100;
    }

    const positions = new Float32Array(this.basePositions);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colors = new Float32Array(PARTICLE_COUNT * 3);
    this.colorAttributes = new THREE.BufferAttribute(colors, 3);
    this.geometry.setAttribute('color', this.colorAttributes);

    const sizes = new Float32Array(PARTICLE_COUNT);
    sizes.fill(BASE_SIZE);
    this.sizeAttributes = new THREE.BufferAttribute(sizes, 1);
    this.geometry.setAttribute('size', this.sizeAttributes);

    this.currentTheme = PARTICLE_THEMES.neon;
    this.targetTheme = PARTICLE_THEMES.neon;
    this.applyThemeColors(1.0);

    this.material = new THREE.PointsMaterial({
      size: BASE_SIZE,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.position.y = 0;
  }

  setTheme(themeName: ParticleThemeName, currentTime: number): void {
    if (PARTICLE_THEMES[themeName].name === this.currentTheme.name && !this.isTransitioning) {
      return;
    }
    this.targetTheme = PARTICLE_THEMES[themeName];
    this.themeTransitionStart = currentTime;
    this.isTransitioning = true;
  }

  private applyThemeColors(mix: number): void {
    const rL = THREE.MathUtils.lerp(this.currentTheme.colorLow.r, this.targetTheme.colorLow.r, mix);
    const gL = THREE.MathUtils.lerp(this.currentTheme.colorLow.g, this.targetTheme.colorLow.g, mix);
    const bL = THREE.MathUtils.lerp(this.currentTheme.colorLow.b, this.targetTheme.colorLow.b, mix);
    const rH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.r, this.targetTheme.colorHigh.r, mix);
    const gH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.g, this.targetTheme.colorHigh.g, mix);
    const bH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.b, this.targetTheme.colorHigh.b, mix);

    const colors = this.colorAttributes.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = Math.random();
      colors[i3] = THREE.MathUtils.lerp(rL, rH, t);
      colors[i3 + 1] = THREE.MathUtils.lerp(gL, gH, t);
      colors[i3 + 2] = THREE.MathUtils.lerp(bL, bH, t);
    }
    this.colorAttributes.needsUpdate = true;
  }

  private updateThemeTransition(currentTime: number): void {
    if (!this.isTransitioning) return;

    const elapsed = currentTime - this.themeTransitionStart;
    const t = Math.min(elapsed / TRANSITION_DURATION, 1);
    const eased = easeInOut(t);

    const colors = this.colorAttributes.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const particleMix = (i / PARTICLE_COUNT);
      const rL = THREE.MathUtils.lerp(this.currentTheme.colorLow.r, this.targetTheme.colorLow.r, eased);
      const gL = THREE.MathUtils.lerp(this.currentTheme.colorLow.g, this.targetTheme.colorLow.g, eased);
      const bL = THREE.MathUtils.lerp(this.currentTheme.colorLow.b, this.targetTheme.colorLow.b, eased);
      const rH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.r, this.targetTheme.colorHigh.r, eased);
      const gH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.g, this.targetTheme.colorHigh.g, eased);
      const bH = THREE.MathUtils.lerp(this.currentTheme.colorHigh.b, this.targetTheme.colorHigh.b, eased);
      colors[i3] = THREE.MathUtils.lerp(rL, rH, particleMix);
      colors[i3 + 1] = THREE.MathUtils.lerp(gL, gH, particleMix);
      colors[i3 + 2] = THREE.MathUtils.lerp(bL, bH, particleMix);
    }
    this.colorAttributes.needsUpdate = true;

    if (t >= 1) {
      this.currentTheme = this.targetTheme;
      this.isTransitioning = false;
    }
  }

  update(params: ParticleSystemUpdateParams): void {
    const { midFreq, highFreq, delta, time } = params;

    this.updateThemeTransition(time);

    const radiusExpansion = THREE.MathUtils.lerp(BASE_RADIUS, MAX_RADIUS, midFreq);
    const verticalExpansion = THREE.MathUtils.lerp(BASE_VERTICAL, MAX_VERTICAL, highFreq);
    const sizeValue = THREE.MathUtils.lerp(SIZE_MIN, SIZE_MAX, highFreq);
    this.material.size = sizeValue;

    const rotationAngle = time * ROTATION_SPEED;
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);

    const positions = this.geometry.attributes.position.array as Float32Array;
    const sizes = this.sizeAttributes.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      let bx = this.basePositions[i3];
      let by = this.basePositions[i3 + 1];
      let bz = this.basePositions[i3 + 2];

      const originalLen = Math.sqrt(bx * bx + bz * bz);
      if (originalLen > 0.001) {
        const scale = radiusExpansion / 5.0;
        bx *= scale;
        bz *= scale;
      }

      const brownianScale = 0.15;
      const ox = Math.sin(time * 1.5 + this.randomOffsets[i3]) * brownianScale;
      const oy = (Math.sin(time * 1.2 + this.randomOffsets[i3 + 1]) * verticalExpansion);
      const oz = Math.cos(time * 1.3 + this.randomOffsets[i3 + 2]) * brownianScale;

      let px = bx + ox;
      let py = by + oy;
      let pz = bz + oz;

      const rx = px * cosR - pz * sinR;
      const rz = px * sinR + pz * cosR;
      px = rx;
      pz = rz;

      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;

      const particleVar = 0.8 + Math.sin(time * 3 + this.randomOffsets[i3]) * 0.2;
      sizes[i] = sizeValue * particleVar;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.sizeAttributes.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
