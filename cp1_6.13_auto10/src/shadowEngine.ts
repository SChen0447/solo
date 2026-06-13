import * as THREE from 'three';
import type { BuildingData } from './sceneBuilder';

export interface SunPosition {
  elevation: number;
  azimuth: number;
  direction: THREE.Vector3;
  worldPosition: THREE.Vector3;
}

export interface ShadowEngineInitOptions {
  groundSize: number;
  maxBuildingHeight: number;
  shadowMapSize?: number;
  sunOrbitRadius?: number;
  latitude?: number;
}

const TIME_CHANGE_THRESHOLD_MIN = 30;

export class ShadowEngine {
  private scene: THREE.Scene;
  private directionalLight: THREE.DirectionalLight;
  private lightHelper?: THREE.DirectionalLightHelper;
  private sunOrbitRadius: number;
  private groundSize: number;
  private maxBuildingHeight: number;
  private latitude: number;

  private lastShadowUpdateTime: number = -Infinity;
  private currentTimeMin: number = 720;

  private readonly sunriseMin: number = 360;
  private readonly sunsetMin: number = 1080;

  public readonly sunPosition: SunPosition = {
    elevation: 0,
    azimuth: 0,
    direction: new THREE.Vector3(),
    worldPosition: new THREE.Vector3()
  };

  constructor(scene: THREE.Scene, options: ShadowEngineInitOptions) {
    this.scene = scene;
    this.groundSize = options.groundSize;
    this.maxBuildingHeight = options.maxBuildingHeight;
    this.sunOrbitRadius = options.sunOrbitRadius ?? Math.max(this.groundSize * 1.2, 400);
    this.latitude = options.latitude ?? 35;
    const shadowMapSize = options.shadowMapSize ?? 2048;

    this.directionalLight = this._createDirectionalLight(shadowMapSize);
    this._setupShadowCamera();
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this._updateSunPosition(this.currentTimeMin);
  }

  private _createDirectionalLight(shadowMapSize: number): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xfff4e0, 1.2);
    light.castShadow = true;
    light.shadow.mapSize.width = shadowMapSize;
    light.shadow.mapSize.height = shadowMapSize;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = this.sunOrbitRadius * 2.5;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 6;
    light.shadow.blurSamples = 12;
    return light;
  }

  private _setupShadowCamera(): void {
    const size = this.groundSize * 0.7;
    const cam = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
    cam.left = -size;
    cam.right = size;
    cam.top = size;
    cam.bottom = -size;
    cam.updateProjectionMatrix();
  }

  private _calcSunAngles(timeMin: number): { elevation: number; azimuth: number } {
    const t = (timeMin - this.sunriseMin) / (this.sunsetMin - this.sunriseMin);
    const clampedT = Math.max(0, Math.min(1, t));

    const elevation = Math.sin(clampedT * Math.PI) * (60 + this.latitude * 0.1) * (Math.PI / 180);
    const azimuth = Math.PI * 0.5 + clampedT * Math.PI;

    return { elevation, azimuth };
  }

  private _updateSunPosition(timeMin: number): void {
    const { elevation, azimuth } = this._calcSunAngles(timeMin);

    const r = this.sunOrbitRadius;
    const x = r * Math.cos(elevation) * Math.sin(azimuth - Math.PI * 0.5);
    const y = r * Math.sin(elevation);
    const z = r * Math.cos(elevation) * Math.cos(azimuth - Math.PI * 0.5);

    const sunPos = new THREE.Vector3(x, y, z);
    this.directionalLight.position.copy(sunPos);
    this.directionalLight.target.position.set(0, this.maxBuildingHeight * 0.3, 0);
    this.directionalLight.target.updateMatrixWorld();

    const dir = new THREE.Vector3().subVectors(
      this.directionalLight.target.position,
      sunPos
    ).normalize();

    const intensityFactor = Math.max(0.15, Math.sin(elevation) / Math.sin(Math.PI / 2));
    this.directionalLight.intensity = 1.5 * intensityFactor;

    const warmColor = new THREE.Color(0xffc28a);
    const dayColor = new THREE.Color(0xfffbe6);
    const blendFactor = Math.pow(intensityFactor, 0.7);
    this.directionalLight.color.copy(warmColor).lerp(dayColor, blendFactor);

    this.sunPosition.elevation = elevation;
    this.sunPosition.azimuth = azimuth;
    this.sunPosition.direction.copy(dir);
    this.sunPosition.worldPosition.copy(sunPos);
  }

  public setTime(timeMin: number, forceUpdate: boolean = false): boolean {
    this.currentTimeMin = timeMin;
    this._updateSunPosition(timeMin);

    const diff = Math.abs(timeMin - this.lastShadowUpdateTime);
    const shouldUpdate = forceUpdate || diff >= TIME_CHANGE_THRESHOLD_MIN || this.lastShadowUpdateTime === -Infinity;

    if (shouldUpdate) {
      this._requestShadowUpdate();
      this.lastShadowUpdateTime = timeMin;
      return true;
    }
    return false;
  }

  private _requestShadowUpdate(): void {
    this.directionalLight.shadow.needsUpdate = true;
    (this.directionalLight.shadow.map as THREE.Texture | null)?.dispose?.();
    this.directionalLight.shadow.map = null;
    this.directionalLight.shadow.needsUpdate = true;
  }

  public forceShadowUpdate(): void {
    this._requestShadowUpdate();
    this.lastShadowUpdateTime = this.currentTimeMin;
  }

  public getSunPosition(): SunPosition {
    return this.sunPosition;
  }

  public getLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  public estimateShadowCoveragePct(
    building: BuildingData,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera
  ): number {
    if (this.sunPosition.elevation <= 0.02) return 100;

    const w = building.width;
    const d = building.depth;
    const h = building.height;
    const elev = this.sunPosition.elevation;

    const shadowLen = h / Math.max(Math.tan(elev), 0.08);
    const shadowArea = shadowLen * Math.max(w, d) * 0.85 + w * d * 0.5;

    const pct = (shadowArea / (this.groundSize * this.groundSize * 0.4)) * 10000;
    const clamped = Math.max(2, Math.min(98, pct));
    const _ = renderer;
    const __ = camera;

    return Number(clamped.toFixed(1));
  }

  public dispose(): void {
    if (this.lightHelper) {
      this.scene.remove(this.lightHelper);
      this.lightHelper.dispose();
    }
    this.directionalLight.shadow.map?.dispose();
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.directionalLight.target);
    this.directionalLight.dispose();
  }
}
