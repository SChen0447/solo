import * as THREE from 'three';

export type ShadowQuality = 'high' | 'low';

const HIGH_QUALITY = {
  mapSize: 4096,
  type: THREE.PCFSoftShadowMap as THREE.ShadowMapType,
  bias: -0.0005
};

const LOW_QUALITY = {
  mapSize: 1024,
  type: THREE.BasicShadowMap as THREE.ShadowMapType,
  bias: -0.001
};

const ANIMATION_PERIOD = 10;
const ANIMATION_ALTITUDE = 45;

export class ShadowAnalyzer {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private lightHelper: THREE.DirectionalLightHelper | null = null;

  private azimuth: number = 45;
  private altitude: number = 45;
  private quality: ShadowQuality = 'high';

  private isAnimating: boolean = false;
  private animationElapsed: number = 0;

  private needsShadowUpdate: boolean = true;

  public onParamsChange?: (azimuth: number, altitude: number) => void;
  public onQualityChange?: (quality: ShadowQuality) => void;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.ambientLight = new THREE.AmbientLight(0x404858, 0.35);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xfff4e0, 1.5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -200;
    this.directionalLight.shadow.camera.right = 200;
    this.directionalLight.shadow.camera.top = 200;
    this.directionalLight.shadow.camera.bottom = -200;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this.setShadowQuality('high');
    this.updateLightPosition();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
  }

  updateLight(azimuth: number, altitude: number): void {
    this.azimuth = Math.max(0, Math.min(360, azimuth));
    this.altitude = Math.max(0, Math.min(90, altitude));
    this.updateLightPosition();
    this.needsShadowUpdate = true;

    if (this.onParamsChange) {
      this.onParamsChange(this.azimuth, this.altitude);
    }
  }

  getAzimuth(): number {
    return this.azimuth;
  }

  getAltitude(): number {
    return this.altitude;
  }

  getShadowQuality(): ShadowQuality {
    return this.quality;
  }

  setShadowQuality(quality: ShadowQuality): void {
    if (this.quality === quality) return;

    this.quality = quality;
    const config = quality === 'high' ? HIGH_QUALITY : LOW_QUALITY;

    this.directionalLight.shadow.mapSize.set(config.mapSize, config.mapSize);
    this.directionalLight.shadow.bias = config.bias;

    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose();
      this.directionalLight.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }

    this.renderer.shadowMap.type = config.type;
    this.needsShadowUpdate = true;

    if (this.onQualityChange) {
      this.onQualityChange(quality);
    }
  }

  startAnimation(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animationElapsed = 0;
    this.altitude = ANIMATION_ALTITUDE;
    if (this.onParamsChange) {
      this.onParamsChange(this.azimuth, this.altitude);
    }
  }

  stopAnimation(): void {
    this.isAnimating = false;
  }

  isAnimationRunning(): boolean {
    return this.isAnimating;
  }

  tick(delta: number): void {
    if (this.isAnimating) {
      this.animationElapsed += delta;
      const progress = (this.animationElapsed % ANIMATION_PERIOD) / ANIMATION_PERIOD;
      this.azimuth = progress * 360;
      this.updateLightPosition();
      this.needsShadowUpdate = true;

      if (this.onParamsChange) {
        this.onParamsChange(this.azimuth, this.altitude);
      }
    }

    if (this.needsShadowUpdate) {
      this.renderer.shadowMap.needsUpdate = true;
      this.needsShadowUpdate = false;
    }
  }

  computeShadowIntensity(): number {
    return Math.max(0, Math.min(1, this.altitude / 90));
  }

  private updateLightPosition(): void {
    const azimuthRad = (this.azimuth * Math.PI) / 180;
    const altitudeRad = (this.altitude * Math.PI) / 180;

    const distance = 200;
    const x = distance * Math.sin(azimuthRad) * Math.cos(altitudeRad);
    const y = distance * Math.sin(altitudeRad);
    const z = distance * Math.cos(azimuthRad) * Math.cos(altitudeRad);

    this.directionalLight.position.set(x, y, z);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    const intensity = 0.4 + 1.4 * (this.altitude / 90);
    this.directionalLight.intensity = Math.max(0.3, intensity);

    const t = this.altitude / 90;
    const r = Math.floor(255 * (0.8 + 0.2 * t));
    const g = Math.floor(255 * (0.75 + 0.2 * t));
    const b = Math.floor(255 * (0.6 + 0.35 * t));
    this.directionalLight.color.setRGB(r / 255, g / 255, b / 255);
  }

  dispose(): void {
    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose();
    }
    if (this.lightHelper) {
      this.scene.remove(this.lightHelper);
      this.lightHelper.dispose();
    }
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.ambientLight);
  }
}
