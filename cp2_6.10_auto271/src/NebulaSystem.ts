import * as THREE from 'three';

export enum ColorTheme {
  NEBULA_PURPLE = 'nebula_purple',
  FLAME_ORANGE = 'flame_orange',
  ICE_BLUE = 'ice_blue',
  LIFE_GREEN = 'life_green'
}

const THEME_COLORS: Record<ColorTheme, number[]> = {
  [ColorTheme.NEBULA_PURPLE]: [0x8b5cf6, 0x3b82f6, 0xec4899, 0x06b6d4],
  [ColorTheme.FLAME_ORANGE]: [0xf97316, 0xef4444, 0xeab308, 0xfb923c],
  [ColorTheme.ICE_BLUE]: [0x0ea5e9, 0x06b6d4, 0x22d3ee, 0x67e8f9],
  [ColorTheme.LIFE_GREEN]: [0x22c55e, 0x10b981, 0x14b8a6, 0x84cc16]
};

const MAX_PARTICLES = 20000;
const ROTATION_PERIOD = 100;
const DRIFT_AMOUNT = 0.001;
const COLOR_TRANSITION_DURATION = 1.5;

interface HSL {
  h: number;
  s: number;
  l: number;
}

export class NebulaSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public particleCount: number;

  private material: THREE.PointsMaterial;
  private clusterCenters: THREE.Vector3[] = [];
  private speedMultiplier: number = 1;
  private currentTheme: ColorTheme = ColorTheme.NEBULA_PURPLE;

  private originPositions: Float32Array;
  private driftOffsets: Float32Array;
  private driftSpeeds: Float32Array;
  private currentColorsHSL: Float32Array;
  private targetColorsHSL: Float32Array;
  private colorTransitionProgress: number = 1;
  private colorTransitionActive: boolean = false;

  private densityUpdateTimer: number | null = null;
  private pendingDensityLevel: number | null = null;

  private tempColor: THREE.Color = new THREE.Color();
  private tempHSL: HSL = { h: 0, s: 0, l: 0 };
  private tempTargetHSL: HSL = { h: 0, s: 0, l: 0 };

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.particleCount = 5000;

    const maxBytes = MAX_PARTICLES;
    this.originPositions = new Float32Array(maxBytes * 3);
    this.driftOffsets = new Float32Array(maxBytes * 3);
    this.driftSpeeds = new Float32Array(maxBytes * 3);
    this.currentColorsHSL = new Float32Array(maxBytes * 3);
    this.targetColorsHSL = new Float32Array(maxBytes * 3);

    const positions = new Float32Array(maxBytes * 3);
    const colors = new Float32Array(maxBytes * 3);
    const sizes = new Float32Array(maxBytes);
    const opacities = new Float32Array(maxBytes);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.generateClusterCenters();
    this.generateParticles(5000);
    this.setDrawRange();
  }

  private generateClusterCenters(): void {
    const count = 3 + Math.floor(Math.random() * 3);
    this.clusterCenters = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 3;
      this.clusterCenters.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }
  }

  private generateParticles(count: number): void {
    const startIdx = this.particleCount;
    const endIdx = Math.min(startIdx + count, MAX_PARTICLES);
    const actualCount = endIdx - startIdx;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    const opacities = this.geometry.attributes.opacity.array as Float32Array;

    const themeColors = THEME_COLORS[this.currentTheme];

    for (let i = startIdx; i < endIdx; i++) {
      const i3 = i * 3;

      const useCluster = Math.random() < 0.6;
      let x: number, y: number, z: number;

      if (useCluster && this.clusterCenters.length > 0) {
        const center = this.clusterCenters[Math.floor(Math.random() * this.clusterCenters.length)];
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 2.5;
        x = center.x + r * Math.sin(phi) * Math.cos(theta);
        y = center.y + r * Math.sin(phi) * Math.sin(theta);
        z = center.z + r * Math.cos(phi);
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 4 + Math.random() * 4;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }

      this.originPositions[i3] = x;
      this.originPositions[i3 + 1] = y;
      this.originPositions[i3 + 2] = z;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      this.driftOffsets[i3] = 0;
      this.driftOffsets[i3 + 1] = 0;
      this.driftOffsets[i3 + 2] = 0;

      this.driftSpeeds[i3] = (Math.random() - 0.5) * 2;
      this.driftSpeeds[i3 + 1] = (Math.random() - 0.5) * 2;
      this.driftSpeeds[i3 + 2] = (Math.random() - 0.5) * 2;

      const colorHex = themeColors[Math.floor(Math.random() * themeColors.length)];
      this.tempColor.setHex(colorHex);
      this.tempColor.getHSL(this.tempHSL);

      this.currentColorsHSL[i3] = this.tempHSL.h;
      this.currentColorsHSL[i3 + 1] = this.tempHSL.s;
      this.currentColorsHSL[i3 + 2] = this.tempHSL.l;

      this.targetColorsHSL[i3] = this.tempHSL.h;
      this.targetColorsHSL[i3 + 1] = this.tempHSL.s;
      this.targetColorsHSL[i3 + 2] = this.tempHSL.l;

      colors[i3] = this.tempColor.r;
      colors[i3 + 1] = this.tempColor.g;
      colors[i3 + 2] = this.tempColor.b;

      sizes[i] = 0.05 + Math.random() * 0.15;
      opacities[i] = 0.3 + Math.random() * 0.7;
    }

    this.particleCount = endIdx;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
  }

  private setDrawRange(): void {
    this.geometry.setDrawRange(0, this.particleCount);
  }

  public setDensity(level: number): void {
    const targetCount = Math.floor(level * 1000);

    if (this.densityUpdateTimer !== null) {
      this.pendingDensityLevel = level;
      return;
    }

    this.applyDensityChange(targetCount);

    this.densityUpdateTimer = window.setTimeout(() => {
      this.densityUpdateTimer = null;
      if (this.pendingDensityLevel !== null) {
        const pendingLevel = this.pendingDensityLevel;
        this.pendingDensityLevel = null;
        this.setDensity(pendingLevel);
      }
    }, 1000);
  }

  private applyDensityChange(targetCount: number): void {
    const clampedTarget = Math.max(1000, Math.min(targetCount, MAX_PARTICLES));

    if (clampedTarget > this.particleCount) {
      this.generateParticles(clampedTarget - this.particleCount);
      this.setDrawRange();
    } else if (clampedTarget < this.particleCount) {
      this.particleCount = clampedTarget;
      this.setDrawRange();
    }
  }

  public setColorTheme(theme: ColorTheme): void {
    if (this.currentTheme === theme && this.colorTransitionProgress >= 1) {
      return;
    }

    this.currentTheme = theme;
    const themeColors = THEME_COLORS[theme];

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const colorHex = themeColors[Math.floor(Math.random() * themeColors.length)];
      this.tempColor.setHex(colorHex);
      this.tempColor.getHSL(this.tempHSL);

      this.currentColorsHSL[i3] = this.targetColorsHSL[i3];
      this.currentColorsHSL[i3 + 1] = this.targetColorsHSL[i3 + 1];
      this.currentColorsHSL[i3 + 2] = this.targetColorsHSL[i3 + 2];

      this.targetColorsHSL[i3] = this.tempHSL.h;
      this.targetColorsHSL[i3 + 1] = this.tempHSL.s;
      this.targetColorsHSL[i3 + 2] = this.tempHSL.l;
    }

    this.colorTransitionProgress = 0;
    this.colorTransitionActive = true;
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0, Math.min(5, multiplier));
  }

  public updateParticles(delta: number): void {
    if (this.speedMultiplier <= 0 && !this.colorTransitionActive) {
      return;
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const rotationAngle = (delta * this.speedMultiplier * Math.PI * 2) / ROTATION_PERIOD;
    const cosA = Math.cos(rotationAngle);
    const sinA = Math.sin(rotationAngle);

    const driftFactor = DRIFT_AMOUNT * this.speedMultiplier;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const ox = this.originPositions[i3];
      const oy = this.originPositions[i3 + 1];
      const oz = this.originPositions[i3 + 2];

      const rx = ox * cosA - oz * sinA;
      const rz = ox * sinA + oz * cosA;

      this.driftOffsets[i3] += this.driftSpeeds[i3] * driftFactor;
      this.driftOffsets[i3 + 1] += this.driftSpeeds[i3 + 1] * driftFactor;
      this.driftOffsets[i3 + 2] += this.driftSpeeds[i3 + 2] * driftFactor;

      if (Math.abs(this.driftOffsets[i3]) > 0.5) this.driftSpeeds[i3] *= -1;
      if (Math.abs(this.driftOffsets[i3 + 1]) > 0.5) this.driftSpeeds[i3 + 1] *= -1;
      if (Math.abs(this.driftOffsets[i3 + 2]) > 0.5) this.driftSpeeds[i3 + 2] *= -1;

      positions[i3] = rx + this.driftOffsets[i3];
      positions[i3 + 1] = oy + this.driftOffsets[i3 + 1];
      positions[i3 + 2] = rz + this.driftOffsets[i3 + 2];

      this.originPositions[i3] = rx;
      this.originPositions[i3 + 2] = rz;
    }

    this.geometry.attributes.position.needsUpdate = true;

    if (this.colorTransitionActive) {
      this.colorTransitionProgress += delta / COLOR_TRANSITION_DURATION;
      if (this.colorTransitionProgress >= 1) {
        this.colorTransitionProgress = 1;
        this.colorTransitionActive = false;
      }

      const t = Math.min(this.colorTransitionProgress, 1);

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

        this.tempHSL.h = this.currentColorsHSL[i3];
        this.tempHSL.s = this.currentColorsHSL[i3 + 1];
        this.tempHSL.l = this.currentColorsHSL[i3 + 2];

        this.tempTargetHSL.h = this.targetColorsHSL[i3];
        this.tempTargetHSL.s = this.targetColorsHSL[i3 + 1];
        this.tempTargetHSL.l = this.targetColorsHSL[i3 + 2];

        let hDiff = this.tempTargetHSL.h - this.tempHSL.h;
        if (hDiff > 0.5) hDiff -= 1;
        if (hDiff < -0.5) hDiff += 1;

        const h = this.tempHSL.h + hDiff * t;
        const s = this.tempHSL.s + (this.tempTargetHSL.s - this.tempHSL.s) * t;
        const l = this.tempHSL.l + (this.tempTargetHSL.l - this.tempHSL.l) * t;

        this.tempColor.setHSL(h, s, l);
        colors[i3] = this.tempColor.r;
        colors[i3 + 1] = this.tempColor.g;
        colors[i3 + 2] = this.tempColor.b;
      }

      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  public getParticleDensity(index: number): number {
    if (index < 0 || index >= this.particleCount) return 0;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const i3 = index * 3;
    const px = positions[i3];
    const py = positions[i3 + 1];
    const pz = positions[i3 + 2];

    let count = 0;
    const radiusSq = 0.5 * 0.5;

    for (let i = 0; i < this.particleCount; i++) {
      const j3 = i * 3;
      const dx = positions[j3] - px;
      const dy = positions[j3 + 1] - py;
      const dz = positions[j3 + 2] - pz;
      if (dx * dx + dy * dy + dz * dz < radiusSq) {
        count++;
      }
    }

    const volume = (4 / 3) * Math.PI * 0.5 * 0.5 * 0.5;
    const avgDensity = this.particleCount / ((4 / 3) * Math.PI * 8 * 8 * 8);
    const maxExpected = Math.max(1, volume * avgDensity * 8);
    return Math.min(1, count / maxExpected);
  }

  public getParticleColorHex(index: number): string {
    if (index < 0 || index >= this.particleCount) return '#8b5cf6';

    const colors = this.geometry.attributes.color.array as Float32Array;
    const i3 = index * 3;
    this.tempColor.setRGB(colors[i3], colors[i3 + 1], colors[i3 + 2]);
    return '#' + this.tempColor.getHexString();
  }

  public getParticlePosition(index: number, out: THREE.Vector3): THREE.Vector3 | null {
    if (index < 0 || index >= this.particleCount) return null;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const i3 = index * 3;
    out.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    return out;
  }

  public dispose(): void {
    if (this.densityUpdateTimer !== null) {
      clearTimeout(this.densityUpdateTimer);
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
