import * as THREE from 'three';
import {
  TrajectoryMode,
  ParticleInitialData,
  interpolateTrajectory,
  computeTrajectory
} from './trajectory';

export interface GalaxyConfig {
  particleCount: number;
  minRadius: number;
  maxRadius: number;
  minSize: number;
  maxSize: number;
}

const DEFAULT_CONFIG: GalaxyConfig = {
  particleCount: 2000,
  minRadius: 5,
  maxRadius: 15,
  minSize: 0.1,
  maxSize: 0.5
};

const vertexShader = `
  attribute float aSize;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec3 vColor;

  void main() {
    vec4 texColor = texture2D(uTexture, gl_PointCoord);
    if (texColor.a < 0.01) discard;
    gl_FragColor = vec4(vColor, 1.0) * texColor;
  }
`;

export class ParticleGalaxy {
  private config: GalaxyConfig;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private initialData: ParticleInitialData[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseHues: Float32Array;
  private highlightIndices: Map<number, number> = new Map();
  private texture: THREE.Texture;

  private currentMode: TrajectoryMode = 'spiral';
  private targetMode: TrajectoryMode = 'spiral';
  private blendProgress: number = 1;
  private blendDuration: number = 0.5;
  private isBlending: boolean = false;

  private colorHelper: THREE.Color = new THREE.Color();

  constructor(config: Partial<GalaxyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.geometry = new THREE.BufferGeometry();
    this.texture = this.createParticleTexture();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.positions = new Float32Array(this.config.particleCount * 3);
    this.colors = new Float32Array(this.config.particleCount * 3);
    this.sizes = new Float32Array(this.config.particleCount);
    this.baseHues = new Float32Array(this.config.particleCount);

    this.initParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initParticles(): void {
    const { particleCount, minRadius, maxRadius, minSize, maxSize } = this.config;

    for (let i = 0; i < particleCount; i++) {
      const seed = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const size = minSize + Math.random() * (maxSize - minSize);
      const baseHue = Math.random() * 360;

      this.initialData.push({
        index: i,
        baseRadius: radius,
        theta,
        phi,
        seed,
        baseHue,
        baseSize: size
      });

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(theta) * Math.sin(phi);

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.sizes[i] = size;
      this.baseHues[i] = baseHue;

      this.colorHelper.setHSL(baseHue / 360, 1, 0.6);
      this.colors[i * 3] = this.colorHelper.r;
      this.colors[i * 3 + 1] = this.colorHelper.g;
      this.colors[i * 3 + 2] = this.colorHelper.b;
    }
  }

  public update(time: number, deltaTime: number, globalHueShift: number): void {
    if (this.isBlending) {
      this.blendProgress += deltaTime / this.blendDuration;
      if (this.blendProgress >= 1) {
        this.blendProgress = 1;
        this.isBlending = false;
        this.currentMode = this.targetMode;
      }
    }

    this.updateHighlights(deltaTime);

    const { particleCount } = this.config;
    const positions = this.positions;
    const colors = this.colors;
    const sizes = this.sizes;
    const colorHelper = this.colorHelper;

    for (let i = 0; i < particleCount; i++) {
      const data = this.initialData[i];
      let result;

      if (this.isBlending) {
        result = interpolateTrajectory(
          this.currentMode,
          this.targetMode,
          data,
          time,
          this.blendProgress
        );
      } else {
        result = computeTrajectory(this.currentMode, data, time);
      }

      const i3 = i * 3;
      positions[i3] = result.x;
      positions[i3 + 1] = result.y;
      positions[i3 + 2] = result.z;

      let hue = (this.baseHues[i] + globalHueShift + result.hueShift) % 360;
      if (hue < 0) hue += 360;

      let brightness = result.brightness * 0.6;
      let sizeMult = 1;

      const highlightTime = this.highlightIndices.get(i);
      if (highlightTime !== undefined) {
        const t = highlightTime;
        const highlightIntensity = t > 0 ? Math.sin(t * Math.PI) : 0;
        brightness = Math.min(1, brightness + highlightIntensity * 0.4);
        sizeMult = 1 + highlightIntensity * 2;
      }

      colorHelper.setHSL(hue / 360, 1, brightness);
      colors[i3] = colorHelper.r;
      colors[i3 + 1] = colorHelper.g;
      colors[i3 + 2] = colorHelper.b;

      sizes[i] = data.baseSize * sizeMult;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  public switchMode(mode: TrajectoryMode): void {
    if (mode === this.targetMode && !this.isBlending) return;
    if (this.isBlending) {
      this.currentMode = this.getEffectiveMode();
    }
    this.targetMode = mode;
    this.blendProgress = 0;
    this.isBlending = true;
  }

  private getEffectiveMode(): TrajectoryMode {
    if (!this.isBlending) return this.currentMode;
    return this.blendProgress > 0.5 ? this.targetMode : this.currentMode;
  }

  public getCurrentMode(): TrajectoryMode {
    return this.targetMode;
  }

  public highlightParticle(index: number): void {
    if (index >= 0 && index < this.config.particleCount) {
      this.highlightIndices.set(index, 1.0);
    }
  }

  private updateHighlights(deltaTime: number): void {
    const toRemove: number[] = [];
    this.highlightIndices.forEach((time, index) => {
      const newTime = time - deltaTime;
      if (newTime <= 0) {
        toRemove.push(index);
      } else {
        this.highlightIndices.set(index, newTime);
      }
    });
    toRemove.forEach(idx => this.highlightIndices.delete(idx));
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  public getParticleCount(): number {
    return this.config.particleCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
