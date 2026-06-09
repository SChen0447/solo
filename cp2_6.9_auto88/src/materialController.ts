import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export type MaterialType = 'metal' | 'glass' | 'rock';

export interface MaterialPreset {
  roughness: number;
  metalness: number;
  color: string;
  ior?: number;
  transparent?: boolean;
  opacity?: number;
  envMapIntensity?: number;
}

const PRESETS: Record<MaterialType, MaterialPreset> = {
  metal: {
    roughness: 0.2,
    metalness: 1.0,
    color: '#C0A86C',
    ior: 1.5,
    transparent: false,
    opacity: 1.0,
    envMapIntensity: 1.2
  },
  glass: {
    roughness: 0.0,
    metalness: 0.0,
    color: '#87CEEB',
    ior: 1.5,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 1.5
  },
  rock: {
    roughness: 0.9,
    metalness: 0.0,
    color: '#8B7355',
    ior: 1.5,
    transparent: false,
    opacity: 1.0,
    envMapIntensity: 0.8
  }
};

export class MaterialController {
  private material: THREE.MeshPhysicalMaterial;
  private currentType: MaterialType = 'metal';
  private colorTarget: THREE.Color;
  private colorCurrent: { r: number; g: number; b: number };
  private activeTweens: TWEEN.Tween<unknown>[] = [];

  constructor() {
    this.material = new THREE.MeshPhysicalMaterial({
      color: PRESETS.metal.color,
      roughness: PRESETS.metal.roughness,
      metalness: PRESETS.metal.metalness,
      ior: PRESETS.metal.ior,
      transparent: PRESETS.metal.transparent,
      opacity: PRESETS.metal.opacity,
      envMapIntensity: PRESETS.metal.envMapIntensity,
      reflectivity: 0.5,
      clearcoat: 0.0,
      side: THREE.FrontSide
    });

    this.colorTarget = new THREE.Color(PRESETS.metal.color);
    this.colorCurrent = {
      r: this.colorTarget.r,
      g: this.colorTarget.g,
      b: this.colorTarget.b
    };
  }

  getMaterial(): THREE.MeshPhysicalMaterial {
    return this.material;
  }

  getCurrentType(): MaterialType {
    return this.currentType;
  }

  getCurrentPreset(): MaterialPreset {
    return {
      roughness: this.material.roughness,
      metalness: this.material.metalness,
      color: '#' + this.material.color.getHexString(),
      ior: this.material.ior,
      transparent: this.material.transparent,
      opacity: this.material.opacity,
      envMapIntensity: this.material.envMapIntensity
    };
  }

  private cancelActiveTweens(): void {
    for (const tween of this.activeTweens) {
      tween.stop();
    }
    this.activeTweens = [];
  }

  applyPreset(type: MaterialType): void {
    if (this.currentType === type && this.activeTweens.length === 0) return;
    this.currentType = type;
    const preset = PRESETS[type];
    this.tweenToPreset(preset);
  }

  private tweenToPreset(preset: MaterialPreset): void {
    this.cancelActiveTweens();

    this.colorTarget = new THREE.Color(preset.color);

    const roughnessObj = { value: this.material.roughness };
    const metalnessObj = { value: this.material.metalness };
    const iorObj = { value: this.material.ior };
    const opacityObj = { value: this.material.opacity };
    const envIntensityObj = { value: this.material.envMapIntensity };
    const colorObj = {
      r: this.colorCurrent.r,
      g: this.colorCurrent.g,
      b: this.colorCurrent.b
    };

    const duration = 400;
    const easing = TWEEN.Easing.Cubic.InOut;

    const t1 = new TWEEN.Tween(roughnessObj)
      .to({ value: preset.roughness }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.material.roughness = roughnessObj.value;
      });

    const t2 = new TWEEN.Tween(metalnessObj)
      .to({ value: preset.metalness }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.material.metalness = metalnessObj.value;
      });

    const t3 = new TWEEN.Tween(iorObj)
      .to({ value: preset.ior ?? 1.5 }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.material.ior = iorObj.value;
      });

    const t4 = new TWEEN.Tween(opacityObj)
      .to({ value: preset.opacity ?? 1.0 }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.material.opacity = opacityObj.value;
      })
      .onStart(() => {
        this.material.transparent = preset.transparent ?? false;
      });

    const t5 = new TWEEN.Tween(envIntensityObj)
      .to({ value: preset.envMapIntensity ?? 1.0 }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.material.envMapIntensity = envIntensityObj.value;
      });

    const t6 = new TWEEN.Tween(colorObj)
      .to({ r: this.colorTarget.r, g: this.colorTarget.g, b: this.colorTarget.b }, duration)
      .easing(easing)
      .onUpdate(() => {
        this.colorCurrent.r = colorObj.r;
        this.colorCurrent.g = colorObj.g;
        this.colorCurrent.b = colorObj.b;
        this.material.color.setRGB(colorObj.r, colorObj.g, colorObj.b);
      });

    const onComplete = () => {
      this.activeTweens = this.activeTweens.filter(t => t.isPlaying());
      this.material.needsUpdate = true;
    };

    for (const t of [t1, t2, t3, t4, t5, t6]) {
      t.onComplete(onComplete);
      t.start();
      this.activeTweens.push(t);
    }
  }

  setRoughness(value: number): void {
    this.cancelActiveTweens();
    this.material.roughness = value;
    this.material.needsUpdate = true;
  }

  setMetalness(value: number): void {
    this.cancelActiveTweens();
    this.material.metalness = value;
    this.material.needsUpdate = true;
  }

  setIOR(value: number): void {
    this.cancelActiveTweens();
    this.material.ior = value;
    this.material.needsUpdate = true;
  }

  setColor(hex: string): void {
    this.cancelActiveTweens();
    const c = new THREE.Color(hex);
    this.colorCurrent = { r: c.r, g: c.g, b: c.b };
    this.colorTarget = c.clone();
    this.material.color.copy(c);
    this.material.needsUpdate = true;
  }

  setEnvMapIntensity(value: number): void {
    this.material.envMapIntensity = value;
    this.material.needsUpdate = true;
  }
}
