import * as THREE from 'three';
import { WindField, WindVector } from './WindField';

export class Heatmap {
  public readonly mesh: THREE.Mesh;
  public readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private windField: WindField;
  private resolution: number;
  private worldSize: number;
  private texture!: THREE.CanvasTexture;
  private material!: THREE.MeshBasicMaterial;
  private currentData: Float32Array;
  private targetData: Float32Array;
  private transitionProgress = 1;
  private transitionDuration = 0.5;
  private needsUpdate = false;

  private colorStops = [
    { speed: 0.0, r: 0.10, g: 0.23, b: 0.42 },
    { speed: 0.5, r: 0.20, g: 0.40, b: 0.67 },
    { speed: 1.0, r: 0.27, g: 0.67, b: 0.80 },
    { speed: 1.5, r: 0.27, g: 0.80, b: 0.40 },
    { speed: 2.0, r: 0.80, g: 0.80, b: 0.27 },
    { speed: 2.5, r: 0.93, g: 0.60, b: 0.20 },
    { speed: 3.0, r: 1.00, g: 0.33, b: 0.27 },
    { speed: 4.0, r: 1.00, g: 0.20, b: 0.15 }
  ];

  constructor(scene: THREE.Scene, windField: WindField, worldSize: number) {
    this.windField = windField;
    this.worldSize = worldSize;
    this.resolution = 256;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution;
    this.canvas.height = this.resolution;
    this.ctx = this.canvas.getContext('2d')!;

    this.currentData = new Float32Array(this.resolution * this.resolution);
    this.targetData = new Float32Array(this.resolution * this.resolution);

    this.initTexture(scene);
    this.computeHeatmapData(this.currentData);
    this.renderToCanvas(this.currentData);
  }

  private initTexture(scene: THREE.Scene): void {
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.5;
    this.mesh.name = 'Heatmap';
    scene.add(this.mesh);
  }

  private computeHeatmapData(data: Float32Array): void {
    const fieldData = this.windField.getData();
    const fieldRes = this.windField.getResolution();
    const half = this.worldSize / 2;
    const cellSize = this.worldSize / this.resolution;

    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const wx = -half + (x + 0.5) * cellSize;
        const wz = -half + (y + 0.5) * cellSize;
        const v = this.windField.sample(wx, wz);
        const idx = y * this.resolution + x;
        data[idx] = v.speed;
      }
    }
  }

  private speedToColor(speed: number): { r: number; g: number; b: number } {
    if (speed <= this.colorStops[0].speed) {
      return { r: this.colorStops[0].r, g: this.colorStops[0].g, b: this.colorStops[0].b };
    }
    if (speed >= this.colorStops[this.colorStops.length - 1].speed) {
      const last = this.colorStops[this.colorStops.length - 1];
      return { r: last.r, g: last.g, b: last.b };
    }
    for (let i = 0; i < this.colorStops.length - 1; i++) {
      const s1 = this.colorStops[i];
      const s2 = this.colorStops[i + 1];
      if (speed >= s1.speed && speed <= s2.speed) {
        const t = (speed - s1.speed) / (s2.speed - s1.speed);
        return {
          r: s1.r + (s2.r - s1.r) * t,
          g: s1.g + (s2.g - s1.g) * t,
          b: s1.b + (s2.b - s1.b) * t
        };
      }
    }
    return { r: 0.5, g: 0.5, b: 0.5 };
  }

  private renderToCanvas(data: Float32Array): void {
    const imgData = this.ctx.createImageData(this.resolution, this.resolution);
    const pixels = imgData.data;

    for (let i = 0; i < this.resolution * this.resolution; i++) {
      const speed = data[i];
      const color = this.speedToColor(speed);
      const pi = i * 4;
      pixels[pi] = Math.round(color.r * 255);
      pixels[pi + 1] = Math.round(color.g * 255);
      pixels[pi + 2] = Math.round(color.b * 255);
      pixels[pi + 3] = Math.round(Math.min(1, 0.7 + speed * 0.08) * 255;
    }

    this.ctx.putImageData(imgData, 0, 0);
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  public update(): void {
    this.computeHeatmapData(this.targetData);
    this.transitionProgress = 0;
    this.needsUpdate = true;
  }

  public tick(deltaTime: number): void {
    if (!this.needsUpdate) return;

    this.transitionProgress += deltaTime / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.needsUpdate = false;
      this.currentData.set(this.targetData);
    } else {
      const t = this.easeInOutCubic(this.transitionProgress);
      for (let i = 0; i < this.currentData.length; i++) {
        this.currentData[i] = this.currentData[i] + (this.targetData[i] - this.currentData[i]) * t * deltaTime * 2;
      }
    }

    this.renderToCanvas(this.currentData);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = opacity * 0.55;
  }
}
