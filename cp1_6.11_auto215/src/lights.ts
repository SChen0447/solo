import * as THREE from 'three';
import { kelvinToRgb, kelvinToHex, lerp, clamp } from './utils';

export interface SpectrumData {
  red: number;
  orange: number;
  yellow: number;
  green: number;
  cyan: number;
  blue: number;
  violet: number;
}

export interface LightSystemEvents {
  onSpectrumUpdate?: (spectrum: SpectrumData) => void;
  onFlashlightColorChange?: (hex: string) => void;
}

export class LightSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  public ambientLight!: THREE.AmbientLight;
  public warmLight!: THREE.DirectionalLight;
  public coolLight!: THREE.DirectionalLight;
  public bottomLight!: THREE.DirectionalLight;
  public flashlight!: THREE.SpotLight;
  public flashlightTarget!: THREE.Object3D;

  private colorTemp: number = 5000;
  private flashlightColorHex: string = '#ffffff';
  private spectrum: SpectrumData = {
    red: 0.3, orange: 0.3, yellow: 0.3, green: 0.3,
    cyan: 0.3, blue: 0.3, violet: 0.3
  };
  private events: LightSystemEvents;
  private selectedSpectrumColor: string | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, events: LightSystemEvents = {}) {
    this.scene = scene;
    this.camera = camera;
    this.events = events;
    this.init();
  }

  private init(): void {
    this.ambientLight = new THREE.AmbientLight(0x1a2536, 0.4);
    this.scene.add(this.ambientLight);

    this.warmLight = new THREE.DirectionalLight(0xf4d03f, 0.6);
    this.warmLight.position.set(-15, 12, 8);
    this.warmLight.castShadow = true;
    this.warmLight.shadow.mapSize.width = 1024;
    this.warmLight.shadow.mapSize.height = 1024;
    this.warmLight.shadow.camera.near = 0.5;
    this.warmLight.shadow.camera.far = 50;
    this.warmLight.shadow.camera.left = -20;
    this.warmLight.shadow.camera.right = 20;
    this.warmLight.shadow.camera.top = 20;
    this.warmLight.shadow.camera.bottom = -20;
    this.scene.add(this.warmLight);

    this.coolLight = new THREE.DirectionalLight(0x5dade2, 0.5);
    this.coolLight.position.set(15, 10, 6);
    this.scene.add(this.coolLight);

    this.bottomLight = new THREE.DirectionalLight(0xaf7ac5, 0.35);
    this.bottomLight.position.set(0, -10, 10);
    this.scene.add(this.bottomLight);

    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);

    this.flashlight = new THREE.SpotLight(0xffffff, 2.5, 40, Math.PI / 7, 0.4, 1.2);
    this.flashlight.position.set(0, 2, 8);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 2048;
    this.flashlight.shadow.mapSize.height = 2048;
    this.scene.add(this.flashlight);

    const flashlightHelper = new THREE.SpotLightHelper(this.flashlight);
    flashlightHelper.visible = false;
    this.scene.add(flashlightHelper);

    this.updateFlashlightColor(5000);
  }

  public updateFlashlightColor(kelvin: number): void {
    this.colorTemp = clamp(kelvin, 3000, 7000);
    const rgb = kelvinToRgb(this.colorTemp);
    const color = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    this.flashlight.color.copy(color);
    this.flashlightColorHex = kelvinToHex(this.colorTemp);
    this.events.onFlashlightColorChange?.(this.flashlightColorHex);
  }

  public getFlashlightColorHex(): string {
    return this.flashlightColorHex;
  }

  public getColorTemp(): number {
    return this.colorTemp;
  }

  public updateFlashlightPosition(mouseX: number, mouseY: number): void {
    const targetX = mouseX * 12;
    const targetY = mouseY * 6;
    this.flashlightTarget.position.lerp(
      new THREE.Vector3(targetX, targetY, 0),
      0.08
    );

    const flashlightBaseX = (this.camera as THREE.PerspectiveCamera).position.x * 0.3;
    const flashlightBaseY = (this.camera as THREE.PerspectiveCamera).position.y * 0.3;
    this.flashlight.position.lerp(
      new THREE.Vector3(flashlightBaseX + mouseX * 2, flashlightBaseY + 3, 8),
      0.05
    );
  }

  public setSpectrumIntensity(intensity: number): void {
    const base = 0.3;
    const max = 1.0;
    const i = clamp(intensity, 0, 1);

    this.spectrum = {
      red: lerp(base, max, i * 0.85),
      orange: lerp(base, max, i * 0.92),
      yellow: lerp(base, max, i * 1.0),
      green: lerp(base, max, i * 0.95),
      cyan: lerp(base, max, i * 0.88),
      blue: lerp(base, max, i * 0.82),
      violet: lerp(base, max, i * 0.75)
    };

    this.events.onSpectrumUpdate?.({ ...this.spectrum });
  }

  public pulseSpectrum(duration: number = 800): void {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const t = clamp(elapsed / duration, 0, 1);
      const pulse = Math.sin(t * Math.PI);
      this.setSpectrumIntensity(pulse);
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public getSpectrum(): SpectrumData {
    return { ...this.spectrum };
  }

  public selectSpectrumColor(colorHex: string | null): void {
    this.selectedSpectrumColor = colorHex;
  }

  public getSelectedSpectrumColor(): string | null {
    return this.selectedSpectrumColor;
  }

  public setLightIntensity(type: 'warm' | 'cool' | 'bottom' | 'ambient', intensity: number): void {
    switch (type) {
      case 'warm': this.warmLight.intensity = intensity; break;
      case 'cool': this.coolLight.intensity = intensity; break;
      case 'bottom': this.bottomLight.intensity = intensity; break;
      case 'ambient': this.ambientLight.intensity = intensity; break;
    }
  }

  public getHighlightColor(): string {
    if (this.selectedSpectrumColor) {
      return this.selectedSpectrumColor;
    }
    return this.flashlightColorHex;
  }

  public update(delta: number): void {
    const t = Date.now() * 0.001;
    this.warmLight.intensity = 0.6 + Math.sin(t * 0.7) * 0.05;
    this.coolLight.intensity = 0.5 + Math.sin(t * 0.5 + 1) * 0.04;
    this.bottomLight.intensity = 0.35 + Math.sin(t * 0.9 + 2) * 0.03;
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.warmLight);
    this.scene.remove(this.coolLight);
    this.scene.remove(this.bottomLight);
    this.scene.remove(this.flashlight);
    this.scene.remove(this.flashlightTarget);
  }
}
