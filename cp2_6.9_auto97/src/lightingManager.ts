import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export type LightingPreset = 'morning' | 'noon' | 'cloudy' | 'moonlight' | 'neon';

export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  pointColor: string;
  pointIntensity: number;
  pointPosition: [number, number, number];
  backgroundColor: string;
}

const LIGHTING_PRESETS: Record<LightingPreset, LightingConfig> = {
  morning: {
    ambientColor: '#FFE8CC',
    ambientIntensity: 0.35,
    directionalColor: '#FFB366',
    directionalIntensity: 0.9,
    directionalPosition: [-5, 6, 4],
    pointColor: '#FFCC99',
    pointIntensity: 0.6,
    pointPosition: [4, 2, 2],
    backgroundColor: '#FFDDAA'
  },
  noon: {
    ambientColor: '#E8F4FF',
    ambientIntensity: 0.5,
    directionalColor: '#FFFFFF',
    directionalIntensity: 1.2,
    directionalPosition: [-3, 8, 3],
    pointColor: '#4A90D9',
    pointIntensity: 0.7,
    pointPosition: [2, 3, 2],
    backgroundColor: '#87CEEB'
  },
  cloudy: {
    ambientColor: '#C8D0DC',
    ambientIntensity: 0.6,
    directionalColor: '#B8C0CC',
    directionalIntensity: 0.5,
    directionalPosition: [-4, 5, 2],
    pointColor: '#A0A8B8',
    pointIntensity: 0.4,
    pointPosition: [3, 2, 1],
    backgroundColor: '#9CA3AF'
  },
  moonlight: {
    ambientColor: '#2A3A5C',
    ambientIntensity: 0.2,
    directionalColor: '#6688CC',
    directionalIntensity: 0.6,
    directionalPosition: [-5, 7, 3],
    pointColor: '#4466AA',
    pointIntensity: 0.5,
    pointPosition: [3, 2, 2],
    backgroundColor: '#0F1626'
  },
  neon: {
    ambientColor: '#4A2040',
    ambientIntensity: 0.35,
    directionalColor: '#FF66CC',
    directionalIntensity: 0.8,
    directionalPosition: [-4, 5, 4],
    pointColor: '#66AAFF',
    pointIntensity: 1.0,
    pointPosition: [3, 2, 3],
    backgroundColor: '#1A0A20'
  }
};

function lerpHSL(colorA: THREE.Color, colorB: THREE.Color, t: number): THREE.Color {
  const hslA = { h: 0, s: 0, l: 0 };
  const hslB = { h: 0, s: 0, l: 0 };
  colorA.getHSL(hslA);
  colorB.getHSL(hslB);

  let h = hslA.h + (hslB.h - hslA.h) * t;
  const s = hslA.s + (hslB.s - hslA.s) * t;
  const l = hslA.l + (hslB.l - hslA.l) * t;

  if (Math.abs(hslB.h - hslA.h) > 0.5) {
    if (hslA.h < hslB.h) {
      h = hslA.h + 1 + (hslB.h - hslA.h - 1) * t;
    } else {
      h = hslA.h - 1 + (hslB.h - hslA.h + 1) * t;
    }
  }
  h = ((h % 1) + 1) % 1;

  const result = new THREE.Color();
  result.setHSL(h, s, l);
  return result;
}

function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

let currentPreset: LightingPreset = 'morning';
let ambientLightRef: THREE.AmbientLight | null = null;
let directionalLightRef: THREE.DirectionalLight | null = null;
let pointLightRef: THREE.PointLight | null = null;
let rendererRef: THREE.WebGLRenderer | null = null;
let sceneRef: THREE.Scene | null = null;

export function initLightingUI(
  scene: THREE.Scene,
  ambient: THREE.AmbientLight,
  directional: THREE.DirectionalLight,
  point: THREE.PointLight,
  renderer: THREE.WebGLRenderer
): {
  setPreset: (preset: LightingPreset) => void;
  getCurrentPreset: () => LightingPreset;
} {
  sceneRef = scene;
  ambientLightRef = ambient;
  directionalLightRef = directional;
  pointLightRef = point;
  rendererRef = renderer;
  currentPreset = 'morning';

  applyPresetInstant(LIGHTING_PRESETS[currentPreset]);

  const select = document.getElementById('lighting-select') as HTMLSelectElement;
  select.value = currentPreset;
  select.addEventListener('change', (e) => {
    const preset = (e.target as HTMLSelectElement).value as LightingPreset;
    setPreset(preset);
  });

  return {
    setPreset,
    getCurrentPreset: () => currentPreset
  };
}

function applyPresetInstant(config: LightingConfig): void {
  if (ambientLightRef) {
    ambientLightRef.color.set(config.ambientColor);
    ambientLightRef.intensity = config.ambientIntensity;
  }
  if (directionalLightRef) {
    directionalLightRef.color.set(config.directionalColor);
    directionalLightRef.intensity = config.directionalIntensity;
    directionalLightRef.position.set(...config.directionalPosition);
  }
  if (pointLightRef) {
    pointLightRef.color.set(config.pointColor);
    pointLightRef.intensity = config.pointIntensity;
    pointLightRef.position.set(...config.pointPosition);
  }
  if (rendererRef) {
    rendererRef.setClearColor(new THREE.Color(config.backgroundColor));
  }
}

export function setPreset(preset: LightingPreset): void {
  if (preset === currentPreset) return;
  const targetConfig = LIGHTING_PRESETS[preset];
  const currentConfig = LIGHTING_PRESETS[currentPreset];
  currentPreset = preset;

  const startAmbientColor = new THREE.Color(currentConfig.ambientColor);
  const endAmbientColor = new THREE.Color(targetConfig.ambientColor);
  const startDirectionalColor = new THREE.Color(currentConfig.directionalColor);
  const endDirectionalColor = new THREE.Color(targetConfig.directionalColor);
  const startPointColor = new THREE.Color(currentConfig.pointColor);
  const endPointColor = new THREE.Color(targetConfig.pointColor);
  const startBackgroundColor = new THREE.Color(currentConfig.backgroundColor);
  const endBackgroundColor = new THREE.Color(targetConfig.backgroundColor);
  const startDirectionalPos = new THREE.Vector3(...currentConfig.directionalPosition);
  const endDirectionalPos = new THREE.Vector3(...targetConfig.directionalPosition);
  const startPointPos = new THREE.Vector3(...currentConfig.pointPosition);
  const endPointPos = new THREE.Vector3(...targetConfig.pointPosition);

  const tweenData = {
    t: 0,
    ambientIntensity: currentConfig.ambientIntensity,
    directionalIntensity: currentConfig.directionalIntensity,
    pointIntensity: currentConfig.pointIntensity
  };

  new TWEEN.Tween(tweenData)
    .to({
      t: 1,
      ambientIntensity: targetConfig.ambientIntensity,
      directionalIntensity: targetConfig.directionalIntensity,
      pointIntensity: targetConfig.pointIntensity
    }, 1000)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate(() => {
      const t = tweenData.t;

      if (ambientLightRef) {
        ambientLightRef.color.copy(lerpHSL(startAmbientColor, endAmbientColor, t));
        ambientLightRef.intensity = tweenData.ambientIntensity;
      }
      if (directionalLightRef) {
        directionalLightRef.color.copy(lerpHSL(startDirectionalColor, endDirectionalColor, t));
        directionalLightRef.intensity = tweenData.directionalIntensity;
        const pos = lerpVec3(startDirectionalPos, endDirectionalPos, t);
        directionalLightRef.position.copy(pos);
      }
      if (pointLightRef) {
        pointLightRef.color.copy(lerpHSL(startPointColor, endPointColor, t));
        pointLightRef.intensity = tweenData.pointIntensity;
        const pos = lerpVec3(startPointPos, endPointPos, t);
        pointLightRef.position.copy(pos);
      }
      if (rendererRef) {
        const bg = lerpHSL(startBackgroundColor, endBackgroundColor, t);
        rendererRef.setClearColor(bg);
      }
    })
    .start();
}
