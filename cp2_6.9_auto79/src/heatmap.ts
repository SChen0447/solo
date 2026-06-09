import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

export class Heatmap {
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private mesh: THREE.Mesh | null = null;
  private resolution: number = 200;
  private gridSize: number = 300;
  private cellSize: number;
  private lastUpdate: number = 0;
  private updateInterval: number = 2000;
  private gridData: Float32Array;
  private targetOpacity: number = 0.6;
  private currentOpacity: number = 0;
  private fadeStartTime: number = 0;
  private fadeDuration: number = 500;
  private isFadingIn: boolean = false;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.cellSize = this.gridSize / this.resolution;
    this.gridData = new Float32Array(this.resolution * this.resolution);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution;
    this.canvas.height = this.resolution;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;

    this.createMesh();
  }

  private createMesh(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) (this.mesh.material as THREE.Material).dispose();
    }

    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0.05;
    this.mesh.renderOrder = 1;
    this.scene.add(this.mesh);

    this.fadeStartTime = performance.now();
    this.isFadingIn = true;
  }

  update(time: number): void {
    if (this.isFadingIn && this.mesh) {
      const elapsed = time - this.fadeStartTime;
      const t = Math.min(elapsed / this.fadeDuration, 1);
      this.currentOpacity = this.targetOpacity * t;
      (this.mesh.material as THREE.MeshBasicMaterial).opacity = this.currentOpacity;
      if (t >= 1) {
        this.isFadingIn = false;
        this.currentOpacity = this.targetOpacity;
      }
    }

    if (time - this.lastUpdate >= this.updateInterval) {
      this.refreshHeatmap(time);
      this.lastUpdate = time;
    }
  }

  private refreshHeatmap(time: number): void {
    const startTime = performance.now();

    this.gridData.fill(0);

    const positions = this.particleSystem.getParticlePositions();
    const speeds = this.particleSystem.getParticleSpeeds();
    const halfGrid = this.gridSize / 2;

    if (positions) {
      const count = Math.min(this.particleSystem.getParticleCount(), speeds.length);
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3];
        const z = positions[i * 3 + 2];
        const speed = speeds[i];

        const gridX = Math.floor((x + halfGrid) / this.cellSize);
        const gridZ = Math.floor((z + halfGrid) / this.cellSize);

        if (gridX >= 0 && gridX < this.resolution && gridZ >= 0 && gridZ < this.resolution) {
          const idx = gridZ * this.resolution + gridX;
          this.gridData[idx] += speed;
          
          if (gridX > 0) this.gridData[idx - 1] += speed * 0.5;
          if (gridX < this.resolution - 1) this.gridData[idx + 1] += speed * 0.5;
          if (gridZ > 0) this.gridData[idx - this.resolution] += speed * 0.5;
          if (gridZ < this.resolution - 1) this.gridData[idx + this.resolution] += speed * 0.5;
        }
      }
    }

    let maxValue = 0;
    for (let i = 0; i < this.gridData.length; i++) {
      if (this.gridData[i] > maxValue) maxValue = this.gridData[i];
    }

    const imageData = this.ctx.createImageData(this.resolution, this.resolution);
    const data = imageData.data;

    for (let i = 0; i < this.gridData.length; i++) {
      const normalized = maxValue > 0 ? this.gridData[i] / maxValue : 0;
      const color = this.getColorFromValue(normalized);
      const alpha = normalized > 0.05 ? 255 : 0;
      
      data[i * 4] = color.r;
      data[i * 4 + 1] = color.g;
      data[i * 4 + 2] = color.b;
      data[i * 4 + 3] = alpha;
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.texture.needsUpdate = true;

    if (this.isFadingIn) {
      this.fadeStartTime = time;
    } else {
      this.fadeStartTime = time;
      this.isFadingIn = true;
      if (this.mesh) {
        (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3;
        this.currentOpacity = 0.3;
      }
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Heatmap update took ${elapsed}ms, exceeding 50ms budget`);
    }
  }

  private getColorFromValue(value: number): { r: number; g: number; b: number } {
    const clamped = Math.max(0, Math.min(1, value));
    
    let r: number, g: number, b: number;

    if (clamped < 0.25) {
      const t = clamped / 0.25;
      r = 0;
      g = Math.floor(255 * t);
      b = 255;
    } else if (clamped < 0.5) {
      const t = (clamped - 0.25) / 0.25;
      r = 0;
      g = 255;
      b = Math.floor(255 * (1 - t));
    } else if (clamped < 0.75) {
      const t = (clamped - 0.5) / 0.25;
      r = Math.floor(255 * t);
      g = 255;
      b = 0;
    } else {
      const t = (clamped - 0.75) / 0.25;
      r = 255;
      g = Math.floor(255 * (1 - t));
      b = 0;
    }

    return { r, g, b };
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) (this.mesh.material as THREE.Material).dispose();
    }
    this.texture.dispose();
  }
}
