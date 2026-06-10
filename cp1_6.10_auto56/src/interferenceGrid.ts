import * as THREE from 'three';
import { WaveSource } from './waveSource';

export type DisplayMode = 'amplitude' | 'energy' | 'phase';

export class InterferenceGrid {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private size = 20;
  private divisions = 40;
  private sources: WaveSource[] = [];

  private gridMesh: THREE.Mesh;
  private gridLines: THREE.LineSegments;
  private texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public displayMode: DisplayMode = 'amplitude';
  public visible = true;
  public showGrid = true;

  private targetColors: Uint8ClampedArray;
  private currentColors: Uint8ClampedArray;
  private transitionProgress = 1;
  private transitionDuration = 1.5;
  private transitioning = false;

  constructor(scene: THREE.Scene, sources: WaveSource[]) {
    this.scene = scene;
    this.sources = sources;
    this.group = new THREE.Group();

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.divisions;
    this.canvas.height = this.divisions;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;

    this.targetColors = new Uint8ClampedArray(this.divisions * this.divisions * 4);
    this.currentColors = new Uint8ClampedArray(this.divisions * this.divisions * 4);

    this.createGridMesh();
    this.createGridLines();

    this.scene.add(this.group);
  }

  private createGridMesh(): void {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.gridMesh = new THREE.Mesh(geometry, material);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.gridMesh);
  }

  private createGridLines(): void {
    const points: THREE.Vector3[] = [];
    const half = this.size / 2;
    const step = this.size / this.divisions;

    for (let i = 0; i <= this.divisions; i++) {
      const pos = -half + i * step;
      points.push(new THREE.Vector3(pos, 0.01, -half));
      points.push(new THREE.Vector3(pos, 0.01, half));
      points.push(new THREE.Vector3(-half, 0.01, pos));
      points.push(new THREE.Vector3(half, 0.01, pos));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x1a1a3a,
      transparent: true,
      opacity: 0.6
    });
    this.gridLines = new THREE.LineSegments(geometry, material);
    this.group.add(this.gridLines);
  }

  public setSources(sources: WaveSource[]): void {
    this.sources = sources;
  }

  public setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode !== mode) {
      this.displayMode = mode;
      this.transitioning = true;
      this.transitionProgress = 0;
      this.computeTargetColors();
    }
  }

  public setVisible(v: boolean): void {
    this.visible = v;
    this.group.visible = v;
  }

  public setShowGrid(v: boolean): void {
    this.showGrid = v;
    this.gridLines.visible = v;
  }

  private computeTargetColors(): void {
    const half = this.size / 2;
    const step = this.size / this.divisions;
    const time = performance.now() / 1000;

    for (let ix = 0; ix < this.divisions; ix++) {
      for (let iz = 0; iz < this.divisions; iz++) {
        const x = -half + (ix + 0.5) * step;
        const z = -half + (iz + 0.5) * step;
        const point = new THREE.Vector3(x, 0, z);

        const idx = (iz * this.divisions + ix) * 4;
        let color: { r: number; g: number; b: number };

        switch (this.displayMode) {
          case 'amplitude':
            color = this.getAmplitudeColor(point, time);
            break;
          case 'energy':
            color = this.getEnergyColor(point, time);
            break;
          case 'phase':
            color = this.getPhaseColor(point, time);
            break;
          default:
            color = this.getAmplitudeColor(point, time);
        }

        this.targetColors[idx] = color.r;
        this.targetColors[idx + 1] = color.g;
        this.targetColors[idx + 2] = color.b;
        this.targetColors[idx + 3] = 255;
      }
    }
  }

  private getAmplitudeColor(point: THREE.Vector3, time: number): { r: number; g: number; b: number } {
    let totalAmp = 0;
    for (const source of this.sources) {
      totalAmp += source.getWaveValueAt(point, time);
    }
    const maxAmp = this.sources.length * (this.sources[0]?.amplitude || 1);
    const normalized = maxAmp > 0 ? THREE.MathUtils.clamp(totalAmp / maxAmp, -1, 1) : 0;

    if (normalized > 0) {
      const t = normalized;
      return { r: Math.floor(t * 255), g: 0, b: Math.floor(t * 80) };
    } else if (normalized < 0) {
      const t = -normalized;
      return { r: 0, g: Math.floor(t * 80), b: Math.floor(t * 255) };
    }
    return { r: 0, g: 0, b: 0 };
  }

  private getEnergyColor(point: THREE.Vector3, time: number): { r: number; g: number; b: number } {
    let totalAmp = 0;
    for (const source of this.sources) {
      totalAmp += source.getWaveValueAt(point, time);
    }
    const maxAmp = this.sources.length * (this.sources[0]?.amplitude || 1);
    const normalized = maxAmp > 0 ? Math.abs(totalAmp / maxAmp) : 0;
    const energy = normalized * normalized;

    const r = Math.floor(energy * 180 + 20);
    const g = Math.floor(energy * 100);
    const b = Math.floor(energy * 200 + 30);
    return { r, g, b };
  }

  private getPhaseColor(point: THREE.Vector3, time: number): { r: number; g: number; b: number } {
    if (this.sources.length < 2) return { r: 30, g: 30, b: 60 };

    const d1 = this.sources[0].getDistanceToPoint(point);
    const d2 = this.sources[1].getDistanceToPoint(point);
    const w1 = this.sources[0].getWavelength();
    const w2 = this.sources[1].getWavelength();
    const wl = (w1 + w2) / 2;

    if (wl <= 0) return { r: 30, g: 30, b: 60 };

    const phaseDiff = (2 * Math.PI * Math.abs(d1 - d2)) / wl;
    const normalizedPhase = ((phaseDiff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);

    const hue = normalizedPhase;
    const s = 0.8;
    const l = 0.45;

    return this.hslToRgb(hue, s, l);
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
    return {
      r: Math.floor(r * 255),
      g: Math.floor(g * 255),
      b: Math.floor(b * 255)
    };
  }

  public update(time: number, deltaTime: number): void {
    if (!this.visible) return;

    this.computeTargetColors();

    if (this.transitioning) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
      if (this.transitionProgress >= 1) {
        this.transitioning = false;
        this.currentColors.set(this.targetColors);
      } else {
        const t = this.easeInOutCubic(this.transitionProgress);
        for (let i = 0; i < this.currentColors.length; i++) {
          this.currentColors[i] = Math.floor(
            this.currentColors[i] + (this.targetColors[i] - this.currentColors[i]) * t
          );
        }
      }
    } else {
      this.currentColors.set(this.targetColors);
    }

    const imageData = this.ctx.createImageData(this.divisions, this.divisions);
    imageData.data.set(this.currentColors);
    this.ctx.putImageData(imageData, 0, 0);
    this.texture.needsUpdate = true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.gridMesh.geometry.dispose();
    (this.gridMesh.material as THREE.Material).dispose();
    this.gridLines.geometry.dispose();
    (this.gridLines.material as THREE.Material).dispose();
    this.texture.dispose();
  }
}
