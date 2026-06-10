import * as THREE from 'three';
import { WaveSource, computeInterference } from './waveSimulator';

const GRID_SIZE = 100;
const AREA_SIZE = 40;
const PLANE_Y = -1;
const PARTICLE_COUNT = GRID_SIZE * GRID_SIZE;

const COLOR_STOPS = [
  { t: 0.0, r: 0.0, g: 0.0, b: 0.2 },
  { t: 0.25, r: 0.0, g: 0.2, b: 0.8 },
  { t: 0.5, r: 0.4, g: 0.0, b: 1.0 },
  { t: 0.75, r: 1.0, g: 0.2, b: 0.0 },
  { t: 1.0, r: 1.0, g: 1.0, b: 0.0 }
];

function lerpColor(t: number): THREE.Color {
  const clampedT = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const s1 = COLOR_STOPS[i];
    const s2 = COLOR_STOPS[i + 1];
    if (clampedT >= s1.t && clampedT <= s2.t) {
      const range = s2.t - s1.t;
      const localT = range === 0 ? 0 : (clampedT - s1.t) / range;
      const r = s1.r + (s2.r - s1.r) * localT;
      const g = s1.g + (s2.g - s1.g) * localT;
      const b = s1.b + (s2.b - s1.b) * localT;
      return new THREE.Color(r, g, b);
    }
  }
  return new THREE.Color(1, 1, 0);
}

export class ParticleRenderer {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private targetPressures: Float32Array;
  private currentPressures: Float32Array;
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.targetPressures = new Float32Array(PARTICLE_COUNT);
    this.currentPressures = new Float32Array(PARTICLE_COUNT);

    const step = AREA_SIZE / (GRID_SIZE - 1);
    const halfArea = AREA_SIZE / 2;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const idx = (i * GRID_SIZE + j) * 3;
        this.positions[idx] = -halfArea + j * step;
        this.positions[idx + 1] = PLANE_Y;
        this.positions[idx + 2] = -halfArea + i * step;
        this.targetPressures[i * GRID_SIZE + j] = 0.5;
        this.currentPressures[i * GRID_SIZE + j] = 0.5;
      }
    }

    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, material);
    this.updateInitialColors();
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private updateInitialColors(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pressure = 0.5;
      const color = lerpColor(pressure);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.sizes[i] = 0.5 + pressure * 1.5;
    }
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  public update(sources: WaveSource[], time: number, deltaTime: number, smoothFactor: number = 10): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const x = this.positions[idx];
      const y = this.positions[idx + 1];
      const z = this.positions[idx + 2];
      this.targetPressures[i] = computeInterference(x, y, z, sources, time);
    }

    const lerpRate = Math.min(1, smoothFactor * deltaTime);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.currentPressures[i] += (this.targetPressures[i] - this.currentPressures[i]) * lerpRate;

      const pressure = this.currentPressures[i];
      const color = lerpColor(pressure);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.sizes[i] = 0.5 + pressure * 1.5;
    }

    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.points.material instanceof THREE.Material) {
      this.points.material.dispose();
    }
  }
}
