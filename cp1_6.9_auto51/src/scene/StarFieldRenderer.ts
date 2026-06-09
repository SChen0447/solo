import * as THREE from 'three';
import type { StarData, SpectralType, StarFilterOptions } from '../types/star';
import { SPECTRAL_COLORS } from '../types/star';

const MAG_MIN = -2.0;
const MAG_MAX = 12.0;
const SIZE_MIN = 1.0;
const SIZE_MAX = 5.0;
const HIGHLIGHT_SCALE = 1.5;
const PULSE_PERIOD = 0.8;

export class StarFieldRenderer {
  public points: THREE.Points;
  private scene: THREE.Scene;
  private stars: StarData[] = [];
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private spriteTexture!: THREE.Texture;

  private baseSizes: Float32Array = new Float32Array();
  private baseColors: Float32Array = new Float32Array();
  private twinklePhases: Float32Array = new Float32Array();
  private twinkleSpeeds: Float32Array = new Float32Array();
  private visibleFlags: Uint8Array = new Uint8Array();

  private highlightedId: number | null = null;
  private selectedId: number | null = null;
  private pulseTime: number = 0;

  constructor(scene: THREE.Scene, stars: StarData[]) {
    this.scene = scene;
    this.stars = stars;
    this.spriteTexture = this.createSpriteTexture();
    this.initGeometry();
    this.initMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private createSpriteTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private spectralToColor(type: SpectralType): THREE.Color {
    return new THREE.Color(SPECTRAL_COLORS[type]);
  }

  private magnitudeToSize(magnitude: number): number {
    const t = Math.max(0, Math.min(1, (MAG_MAX - magnitude) / (MAG_MAX - MAG_MIN)));
    return SIZE_MIN + t * (SIZE_MAX - SIZE_MIN);
  }

  private initGeometry(): void {
    const count = this.stars.length;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    this.baseSizes = new Float32Array(count);
    this.baseColors = new Float32Array(count * 3);
    this.twinklePhases = new Float32Array(count);
    this.twinkleSpeeds = new Float32Array(count);
    this.visibleFlags = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const star = this.stars[i];
      const i3 = i * 3;

      positions[i3] = star.x;
      positions[i3 + 1] = star.y;
      positions[i3 + 2] = star.z;

      const color = this.spectralToColor(star.spectralType);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      this.baseColors[i3] = color.r;
      this.baseColors[i3 + 1] = color.g;
      this.baseColors[i3 + 2] = color.b;

      const size = this.magnitudeToSize(star.magnitude);
      sizes[i] = size;
      this.baseSizes[i] = size;

      alphas[i] = 1.0;
      this.visibleFlags[i] = 1;

      this.twinklePhases[i] = Math.random() * Math.PI * 2;
      this.twinkleSpeeds[i] = (1 + Math.random() * 2) * (2 * Math.PI / 3);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  }

  private initMaterial(): void {
    this.material = new THREE.PointsMaterial({
      size: SIZE_MAX,
      map: this.spriteTexture,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }

  public setStars(stars: StarData[]): void {
    this.stars = stars;
    this.dispose();
    this.initGeometry();
    this.points.geometry = this.geometry;
  }

  public applyFilter(options: StarFilterOptions): void {
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const visible =
        star.magnitude <= options.magnitudeThreshold &&
        star.distance >= options.minDistance &&
        star.distance <= options.maxDistance;

      this.visibleFlags[i] = visible ? 1 : 0;

      if (!visible) {
        (sizeAttr.array as Float32Array)[i] = 0;
      } else {
        (sizeAttr.array as Float32Array)[i] = this.baseSizes[i];
      }

      const i3 = i * 3;
      if (!visible) {
        (alphaAttr.array as Float32Array)[i] = 0;
        (colorAttr.array as Float32Array)[i3] = 0;
        (colorAttr.array as Float32Array)[i3 + 1] = 0;
        (colorAttr.array as Float32Array)[i3 + 2] = 0;
      } else {
        (alphaAttr.array as Float32Array)[i] = 1.0;
        (colorAttr.array as Float32Array)[i3] = this.baseColors[i3];
        (colorAttr.array as Float32Array)[i3 + 1] = this.baseColors[i3 + 1];
        (colorAttr.array as Float32Array)[i3 + 2] = this.baseColors[i3 + 2];
      }
    }

    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  public highlightStar(starId: number | null): void {
    this.highlightedId = starId;
  }

  public selectStar(starId: number | null): void {
    this.selectedId = starId;
    this.highlightedId = starId;
  }

  public getStarByIndex(index: number): StarData | null {
    if (index >= 0 && index < this.stars.length && this.visibleFlags[index]) {
      return this.stars[index];
    }
    return null;
  }

  public getStarIndexById(id: number): number {
    return this.stars.findIndex((s) => s.id === id);
  }

  public update(delta: number): void {
    this.pulseTime += delta;

    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    const pulsePhase = (this.pulseTime % PULSE_PERIOD) / PULSE_PERIOD;
    const pulseFactor = 1 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);

    for (let i = 0; i < this.stars.length; i++) {
      if (!this.visibleFlags[i]) continue;

      const star = this.stars[i];
      const isHighlighted =
        (this.highlightedId !== null && star.id === this.highlightedId) ||
        (this.selectedId !== null && star.id === this.selectedId);

      const twinkle = 0.8 + 0.2 * Math.sin(this.twinklePhases[i] + this.pulseTime * this.twinkleSpeeds[i]);

      if (isHighlighted) {
        (sizeAttr.array as Float32Array)[i] = this.baseSizes[i] * HIGHLIGHT_SCALE * pulseFactor;
        (alphaAttr.array as Float32Array)[i] = twinkle * 1.0;
      } else {
        (sizeAttr.array as Float32Array)[i] = this.baseSizes[i];
        (alphaAttr.array as Float32Array)[i] = twinkle;
      }
    }

    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.spriteTexture.dispose();
    if (this.points && this.points.parent) {
      this.scene.remove(this.points);
    }
  }
}
