import * as THREE from 'three';

export interface LightingState {
  ambientColor: THREE.Color;
  directionalColor: THREE.Color;
  directionalIntensity: number;
  skyColor: THREE.Color;
  sunDirection: THREE.Vector3;
}

export class LightingController {
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public hemisphereLight: THREE.HemisphereLight;
  public scene: THREE.Scene;

  private _timeOfDay: number = 0.5;
  private _directionalIntensity: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(10, 15, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 60;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.directionalLight.shadow.bias = -0.0005;
    scene.add(this.directionalLight);
    scene.add(this.directionalLight.target);

    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    scene.add(this.hemisphereLight);

    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 45);

    this.updateLighting();
  }

  public set timeOfDay(value: number) {
    this._timeOfDay = Math.max(0, Math.min(1, value));
    this.updateLighting();
  }

  public get timeOfDay(): number {
    return this._timeOfDay;
  }

  public set directionalIntensity(value: number) {
    this._directionalIntensity = Math.max(0, Math.min(2, value));
    this.directionalLight.intensity = this._directionalIntensity;
  }

  public get directionalIntensity(): number {
    return this._directionalIntensity;
  }

  private hslToRgb(h: number, s: number, l: number): THREE.Color {
    const color = new THREE.Color();
    color.setHSL(h / 360, s, l);
    return color;
  }

  private interpolateHSL(t: number): THREE.Color {
    let h: number, s: number, l: number;

    if (t < 0.5) {
      const t1 = t / 0.5;
      h = 30 + (200 - 30) * t1;
      s = 0.8 - 0.2 * t1;
      l = 0.55 + 0.15 * t1;
    } else {
      const t2 = (t - 0.5) / 0.5;
      h = 200 + (290 - 200) * t2;
      s = 0.6 + 0.3 * t2;
      l = 0.7 - 0.55 * t2;
    }

    return this.hslToRgb(h, s, l);
  }

  private interpolateDirectionalColor(t: number): THREE.Color {
    let h: number, s: number, l: number;

    if (t < 0.25) {
      const t1 = t / 0.25;
      h = 25 + (40 - 25) * t1;
      s = 0.8 - 0.3 * t1;
      l = 0.5 + 0.15 * t1;
    } else if (t < 0.75) {
      const t2 = (t - 0.25) / 0.5;
      h = 40 + (55 - 40) * t2;
      s = 0.5 - 0.2 * t2;
      l = 0.65 + 0.1 * t2;
    } else {
      const t3 = (t - 0.75) / 0.25;
      h = 55 + (280 - 55) * t3;
      s = 0.3 + 0.5 * t3;
      l = 0.75 - 0.65 * t3;
    }

    return this.hslToRgb(h, s, l);
  }

  public updateLighting(): void {
    const t = this._timeOfDay;

    const skyColor = this.interpolateHSL(t);
    (this.scene.background as THREE.Color).copy(skyColor);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(skyColor);
    }

    this.hemisphereLight.color.copy(skyColor).multiplyScalar(0.7);
    this.hemisphereLight.groundColor.setHex(0x2a2018);
    const hemiIntensity = t < 0.5 ? 0.2 + t * 0.6 : 0.5 - (t - 0.5) * 0.6;
    this.hemisphereLight.intensity = Math.max(0.05, hemiIntensity);

    const ambientBase = this.interpolateHSL(Math.min(0.85, t + 0.1));
    this.ambientLight.color.copy(ambientBase).multiplyScalar(0.8);
    const ambientIntensity = t < 0.5 ? 0.25 + t * 0.4 : 0.45 - (t - 0.5) * 0.7;
    this.ambientLight.intensity = Math.max(0.05, ambientIntensity);

    const dirColor = this.interpolateDirectionalColor(t);
    this.directionalLight.color.copy(dirColor);
    this.directionalLight.intensity = this._directionalIntensity;

    const sunHeight = Math.sin(t * Math.PI);
    const sunAzimuth = (t - 0.5) * Math.PI;
    const sunDist = 20;
    const sunX = Math.sin(sunAzimuth) * sunDist * Math.cos(sunHeight * 0.5);
    const sunY = Math.max(0.5, sunHeight * 18);
    const sunZ = Math.cos(sunAzimuth) * sunDist * Math.cos(sunHeight * 0.5);
    this.directionalLight.position.set(sunX, sunY, sunZ);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();
  }

  public getState(): LightingState {
    return {
      ambientColor: this.ambientLight.color.clone(),
      directionalColor: this.directionalLight.color.clone(),
      directionalIntensity: this._directionalIntensity,
      skyColor: (this.scene.background as THREE.Color).clone(),
      sunDirection: this.directionalLight.position.clone().normalize()
    };
  }

  public getComplementaryAmbient(): THREE.Color {
    const ambient = this.ambientLight.color.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    ambient.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s * 0.6, hsl.l);
    return result;
  }

  public getParticleOpacityFactor(): number {
    const t = this._timeOfDay;
    if (t < 0.25) {
      return 0.4 - t * 1.2;
    } else if (t < 0.75) {
      return 0.1 + Math.abs(t - 0.5) * 0.4;
    } else {
      return 0.1 + (t - 0.75) * 1.6;
    }
  }
}
