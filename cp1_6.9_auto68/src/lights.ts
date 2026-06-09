import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

export const LIGHT_MIN_X = -4;
export const LIGHT_MAX_X = 4;
export const LIGHT_MIN_Y = -3;
export const LIGHT_MAX_Y = 3;
export const LIGHT_MIN_Z = 2;
export const LIGHT_MAX_Z = 8;
export const TEXTURE_SIZE = 512;

export interface LightConfig {
  spotLight: THREE.SpotLight;
  ambientLight: THREE.AmbientLight;
  indicator: THREE.Mesh;
  projectionTexture: THREE.CanvasTexture;
  spotSize: number;
}

export class LightsManager {
  public spotLight: THREE.SpotLight;
  public ambientLight: THREE.AmbientLight;
  public indicator: THREE.Mesh;
  public group: THREE.Group = new THREE.Group();

  private textureCanvas: HTMLCanvasElement;
  private textureCtx!: CanvasRenderingContext2D;
  private projectionTexture: THREE.CanvasTexture;
  private noise2D: (x: number, y: number) => number;
  private lastTextureUpdate: number = 0;
  private textureUpdateInterval: number = 100;
  private lightPos: THREE.Vector3 = new THREE.Vector3(0, 0, 4);
  private animationTime: number = 0;

  constructor() {
    const simplex = new SimplexNoise();
    this.noise2D = (x: number, y: number) => simplex.noise2D(x, y);

    this.spotLight = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 5, 0.4, 1.2);
    this.spotLight.position.copy(this.lightPos);
    this.spotLight.target.position.set(0, 0, 0);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.5;
    this.spotLight.shadow.camera.far = 30;

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);

    const indicatorGeom = new THREE.SphereGeometry(0.1, 16, 16);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    this.indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
    this.indicator.position.copy(this.lightPos);

    this.textureCanvas = document.createElement('canvas');
    this.textureCanvas.width = TEXTURE_SIZE;
    this.textureCanvas.height = TEXTURE_SIZE;
    this.ctx2D();

    this.projectionTexture = new THREE.CanvasTexture(this.textureCanvas);
    this.projectionTexture.needsUpdate = true;
    this.spotLight.map = this.projectionTexture;

    this.group.add(this.spotLight);
    this.group.add(this.spotLight.target);
    this.group.add(this.indicator);
  }

  private ctx2D(): CanvasRenderingContext2D {
    const ctx = this.textureCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.textureCtx = ctx;
    return ctx;
  }

  public setLightPosition(x: number, y: number, z: number): void {
    this.lightPos.x = THREE.MathUtils.clamp(x, LIGHT_MIN_X, LIGHT_MAX_X);
    this.lightPos.y = THREE.MathUtils.clamp(y, LIGHT_MIN_Y, LIGHT_MAX_Y);
    this.lightPos.z = THREE.MathUtils.clamp(z, LIGHT_MIN_Z, LIGHT_MAX_Z);
    this.spotLight.position.copy(this.lightPos);
    this.indicator.position.copy(this.lightPos);
  }

  public getLightPosition(): THREE.Vector3 {
    return this.lightPos.clone();
  }

  public getSpotSize(): number {
    const t = (this.lightPos.z - LIGHT_MIN_Z) / (LIGHT_MAX_Z - LIGHT_MIN_Z);
    return THREE.MathUtils.lerp(2, 0.5, t);
  }

  public setTextureUpdateInterval(ms: number): void {
    this.textureUpdateInterval = ms;
  }

  public updateNoiseTexture(blindColors: THREE.Color[], avgColor: THREE.Color): void {
    const now = performance.now();
    if (now - this.lastTextureUpdate < this.textureUpdateInterval) return;
    this.lastTextureUpdate = now;

    const ctx = this.textureCtx;
    const w = TEXTURE_SIZE;
    const h = TEXTURE_SIZE;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const freqPhase = (Math.sin(this.animationTime * Math.PI * 2 / 5) + 1) / 2;
    const frequency = THREE.MathUtils.lerp(0.02, 0.08, freqPhase);
    const timeOffset = this.animationTime * 0.3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        const nx = x * frequency + timeOffset;
        const ny = y * frequency + timeOffset;
        const n1 = this.noise2D(nx, ny);
        const n2 = this.noise2D(nx + 100, ny + 100) * 0.5;
        const n3 = this.noise2D(nx * 2 + 50, ny * 2 + 50) * 0.25;
        const noise = (n1 + n2 + n3) / 1.75;
        const t = (noise + 1) / 2;

        let r: number, g: number, b: number;
        if (blindColors.length >= 2) {
          const segCount = blindColors.length;
          const seg = t * (segCount - 1);
          const i0 = Math.floor(seg);
          const i1 = Math.min(i0 + 1, segCount - 1);
          const localT = seg - i0;
          const c0 = blindColors[i0];
          const c1 = blindColors[i1];
          r = THREE.MathUtils.lerp(c0.r, c1.r, localT) * 255;
          g = THREE.MathUtils.lerp(c0.g, c1.g, localT) * 255;
          b = THREE.MathUtils.lerp(c0.b, c1.b, localT) * 255;
        } else {
          r = avgColor.r * 255;
          g = avgColor.g * 255;
          b = avgColor.b * 255;
        }

        const alphaBoost = 0.5 + t * 0.5;

        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = Math.floor(alphaBoost * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.projectionTexture.needsUpdate = true;
  }

  public getConfig(): LightConfig {
    return {
      spotLight: this.spotLight,
      ambientLight: this.ambientLight,
      indicator: this.indicator,
      projectionTexture: this.projectionTexture,
      spotSize: this.getSpotSize()
    };
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    const targetAngle = this.spotLight.angle;
    const targetSize = this.getSpotSize();
    this.spotLight.angle = THREE.MathUtils.lerp(targetAngle, targetSize * 0.2, 0.05);
  }

  public dispose(): void {
    (this.indicator.geometry as THREE.BufferGeometry).dispose();
    (this.indicator.material as THREE.Material).dispose();
    this.projectionTexture.dispose();
  }
}
