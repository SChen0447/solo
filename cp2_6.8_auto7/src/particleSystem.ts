import * as THREE from 'three';
import type { AudioFeatures } from './audioAnalyzer';

export type ParticleShape = 'sphere' | 'spiral' | 'wave';

export interface ThemeColors {
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
  bgColor: THREE.Color;
}

export const themes: Record<string, ThemeColors> = {
  neon: {
    color1: new THREE.Color(0x00ffff),
    color2: new THREE.Color(0xff00ff),
    color3: new THREE.Color(0x00ff88),
    bgColor: new THREE.Color(0x0a0a1a)
  },
  amber: {
    color1: new THREE.Color(0xffdd00),
    color2: new THREE.Color(0xff6600),
    color3: new THREE.Color(0xff3366),
    bgColor: new THREE.Color(0x1a0f0a)
  },
  deepsea: {
    color1: new THREE.Color(0x00ccff),
    color2: new THREE.Color(0x0066ff),
    color3: new THREE.Color(0x6600ff),
    bgColor: new THREE.Color(0x0a0a1a)
  }
};

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private particleCount: number = 800;
  private baseRadius: number = 5;
  private shape: ParticleShape = 'sphere';
  private theme: ThemeColors = themes.neon;
  private rotationSpeed: number = 0.5;
  private colorTransitionSpeed: number = 0.5;
  private currentColorIndex: number = 0;
  private targetColorIndex: number = 0;
  private colorBlend: number = 0;
  private time: number = 0;
  private basePositions: Float32Array = new Float32Array();
  private baseSizes: Float32Array = new Float32Array();
  private phases: Float32Array = new Float32Array();
  private frequencies: Float32Array = new Float32Array();
  private panOffset: number = 0;
  private targetPanOffset: number = 0;
  private directionArrow: THREE.ArrowHelper | null = null;
  private arrowVisible: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.createParticles();
    this.createDirectionIndicator();
  }

  private createParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    this.basePositions = new Float32Array(this.particleCount * 3);
    this.baseSizes = new Float32Array(this.particleCount);
    this.phases = new Float32Array(this.particleCount);
    this.frequencies = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.phases[i] = Math.random() * Math.PI * 2;
      this.frequencies[i] = 0.5 + Math.random() * 1.5;
    }

    this.calculateBasePositions();

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = this.basePositions[i * 3];
      positions[i * 3 + 1] = this.basePositions[i * 3 + 1];
      positions[i * 3 + 2] = this.basePositions[i * 3 + 2];

      const color = this.getColorForParticle(i);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.05 + Math.random() * 0.1;
      this.baseSizes[i] = sizes[i];
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private calculateBasePositions(): void {
    for (let i = 0; i < this.particleCount; i++) {
      let x: number, y: number, z: number;

      switch (this.shape) {
        case 'sphere':
          const radius = this.baseRadius * (0.6 + Math.random() * 0.4);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = radius * Math.sin(phi) * Math.cos(theta);
          y = radius * Math.sin(phi) * Math.sin(theta);
          z = radius * Math.cos(phi);
          break;

        case 'spiral':
          const turns = 3;
          const t = i / this.particleCount;
          const angle = t * Math.PI * 2 * turns;
          const spiralRadius = this.baseRadius * 0.5 + t * this.baseRadius * 0.5;
          x = Math.cos(angle) * spiralRadius;
          y = (t - 0.5) * this.baseRadius * 1.5;
          z = Math.sin(angle) * spiralRadius;
          break;

        case 'wave':
          const gridSize = Math.ceil(Math.sqrt(this.particleCount));
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          x = (col / gridSize - 0.5) * this.baseRadius * 2;
          y = (row / gridSize - 0.5) * this.baseRadius * 2;
          z = 0;
          break;

        default:
          x = (Math.random() - 0.5) * this.baseRadius * 2;
          y = (Math.random() - 0.5) * this.baseRadius * 2;
          z = (Math.random() - 0.5) * this.baseRadius * 2;
      }

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
    }
  }

  private getColorForParticle(index: number): THREE.Color {
    const t = index / this.particleCount;
    return this.interpolateColors(t);
  }

  private interpolateColors(t: number): THREE.Color {
    const colorArray = [this.theme.color1, this.theme.color2, this.theme.color3];
    const numColors = colorArray.length;
    
    let adjustedT = t * (numColors - 1) + this.colorBlend;
    adjustedT = adjustedT % numColors;
    if (adjustedT < 0) adjustedT += numColors;
    
    const index1 = Math.floor(adjustedT) % numColors;
    const index2 = (index1 + 1) % numColors;
    const localT = adjustedT - Math.floor(adjustedT);

    const c1 = colorArray[index1];
    const c2 = colorArray[index2];

    return new THREE.Color().lerpColors(c1, c2, localT);
  }

  private createDirectionIndicator(): void {
    const direction = new THREE.Vector3(1, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 3;
    const color = 0x00ff00;

    this.directionArrow = new THREE.ArrowHelper(direction, origin, length, color, 0.5, 0.3);
    this.directionArrow.visible = false;
    this.scene.add(this.directionArrow);
  }

  update(features: AudioFeatures, deltaTime: number): void {
    if (!this.particles || !this.geometry) return;

    this.time += deltaTime;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    const { spectrum, volume, bassEnergy, midEnergy, highEnergy, pan } = features;

    this.targetPanOffset = pan * 2;
    this.panOffset += (this.targetPanOffset - this.panOffset) * 0.1;

    this.colorBlend += deltaTime * this.colorTransitionSpeed * 0.1;
    if (this.colorBlend >= 3) this.colorBlend -= 3;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const spectrumIndex = Math.floor((i / this.particleCount) * (spectrum.length - 1));
      const energy = spectrum[spectrumIndex] || 0;

      const bassInfluence = bassEnergy * 0.6;
      const highInfluence = highEnergy * 0.4;

      let bx = this.basePositions[i3];
      let by = this.basePositions[i3 + 1];
      let bz = this.basePositions[i3 + 2];

      const length = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const nx = bx / length;
      const ny = by / length;
      const nz = bz / length;

      const expandFactor = 1 + bassInfluence * 1.5 + energy * 0.5;

      const floatAmplitude = 0.3 + highInfluence * 0.8;
      const floatPhase = this.phases[i] + this.time * this.frequencies[i];

      let px = bx * expandFactor + nx * floatAmplitude * Math.sin(floatPhase);
      let py = by * expandFactor + ny * floatAmplitude * Math.cos(floatPhase * 1.3);
      let pz = bz * expandFactor + nz * floatAmplitude * Math.sin(floatPhase * 0.7);

      if (this.shape === 'wave') {
        pz = Math.sin(floatPhase + bx * 0.5) * (0.5 + energy * 2) + bassEnergy * 2;
      }

      px += this.panOffset;

      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;

      const color = this.interpolateColors(i / this.particleCount);
      const brightness = 0.5 + energy * 0.8 + volume * 0.3;
      colors[i3] = Math.min(1, color.r * brightness);
      colors[i3 + 1] = Math.min(1, color.g * brightness);
      colors[i3 + 2] = Math.min(1, color.b * brightness);

      const sizeBase = this.baseSizes[i];
      const sizeModulation = 1 + energy * 2 + highInfluence * 1.5;
      sizes[i] = sizeBase * sizeModulation;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    if (this.material) {
      const baseOpacity = 0.6 + volume * 0.3;
      this.material.opacity = baseOpacity;
    }

    if (this.particles) {
      this.particles.rotation.y += deltaTime * this.rotationSpeed * 0.2;
      this.particles.rotation.x += deltaTime * this.rotationSpeed * 0.05;
    }

    this.updateDirectionArrow(pan, volume);
  }

  private updateDirectionArrow(pan: number, volume: number): void {
    if (!this.directionArrow) return;

    if (volume > 0.05) {
      this.directionArrow.visible = true;
      this.arrowVisible = true;

      const angle = pan * (Math.PI / 12) * 15;
      const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      
      this.directionArrow.setDirection(direction);
      this.directionArrow.setLength(2 + volume * 3, 0.4, 0.25);

      const arrowColor = new THREE.Color().lerpColors(
        this.theme.color1,
        this.theme.color2,
        (pan + 1) / 2
      );
      this.directionArrow.setColor(arrowColor);
    } else {
      this.directionArrow.visible = false;
      this.arrowVisible = false;
    }
  }

  setShape(shape: ParticleShape): void {
    this.shape = shape;
    this.calculateBasePositions();
  }

  setParticleCount(count: number): void {
    this.particleCount = Math.max(200, Math.min(1500, Math.floor(count)));
    this.createParticles();
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  setColorTransitionSpeed(speed: number): void {
    this.colorTransitionSpeed = speed;
  }

  setTheme(themeName: string): void {
    const theme = themes[themeName];
    if (theme) {
      this.theme = theme;
    }
  }

  getShape(): ParticleShape {
    return this.shape;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getThemeColors(): ThemeColors {
    return this.theme;
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.directionArrow) {
      this.scene.remove(this.directionArrow);
    }
  }
}
