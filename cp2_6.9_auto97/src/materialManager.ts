import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export type MaterialType = 'metal' | 'glass' | 'rock';

export interface MaterialParams {
  roughness: number;
  metalness: number;
  ior?: number;
  opacity?: number;
  color: string;
}

interface MaterialPreset {
  type: MaterialType;
  defaultParams: MaterialParams;
  roughnessRange: [number, number];
  metalnessRange: [number, number];
  iorRange?: [number, number];
  opacityRange?: [number, number];
}

const MATERIAL_PRESETS: Record<MaterialType, MaterialPreset> = {
  metal: {
    type: 'metal',
    defaultParams: { roughness: 0.2, metalness: 1.0, color: '#C0A86C' },
    roughnessRange: [0, 0.5],
    metalnessRange: [0.8, 1.0]
  },
  glass: {
    type: 'glass',
    defaultParams: { roughness: 0.05, metalness: 0, ior: 1.5, opacity: 0.8, color: '#E8F4FF' },
    roughnessRange: [0, 0.2],
    metalnessRange: [0, 0],
    iorRange: [1.0, 2.0],
    opacityRange: [0, 1]
  },
  rock: {
    type: 'rock',
    defaultParams: { roughness: 0.8, metalness: 0.1, color: '#8B8680' },
    roughnessRange: [0.5, 1.0],
    metalnessRange: [0, 0.2]
  }
};

let currentType: MaterialType = 'metal';
let currentParams: MaterialParams = { ...MATERIAL_PRESETS.metal.defaultParams };
let meshRef: THREE.Mesh | null = null;
let normalMapTexture: THREE.Texture | null = null;
let envMapRef: THREE.CubeTexture | null = null;

function generateNormalMap(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const noise = (Math.sin(x * 0.05) * Math.cos(y * 0.05) + Math.sin(x * 0.12 + 1) * Math.cos(y * 0.08)) * 0.5;
      const nx = 128 + noise * 60 + (Math.random() - 0.5) * 40;
      const ny = 128 + noise * 60 + (Math.random() - 0.5) * 40;
      const nz = 200 + (Math.random() - 0.5) * 30;
      data[i] = Math.max(0, Math.min(255, nx));
      data[i + 1] = Math.max(0, Math.min(255, ny));
      data[i + 2] = Math.max(0, Math.min(255, nz));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

function createMaterial(type: MaterialType, params: MaterialParams, envMap: THREE.CubeTexture | null): THREE.Material {
  const color = new THREE.Color(params.color);

  if (type === 'glass') {
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: params.roughness,
      metalness: params.metalness,
      ior: params.ior ?? 1.5,
      opacity: params.opacity ?? 0.8,
      transparent: true,
      transmission: 1 - (params.opacity ?? 0.8) * 0.3,
      thickness: 1.5,
      envMap,
      envMapIntensity: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide
    });
    return mat;
  }

  if (type === 'rock') {
    if (!normalMapTexture) {
      normalMapTexture = generateNormalMap();
    }
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: params.roughness,
      metalness: params.metalness,
      normalMap: normalMapTexture,
      normalScale: new THREE.Vector2(0.6, 0.6),
      envMap,
      envMapIntensity: 0.5
    });
    return mat;
  }

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: params.roughness,
    metalness: params.metalness,
    envMap,
    envMapIntensity: 1.0
  });
  return mat;
}

function updateSliderUI(type: MaterialType): void {
  const preset = MATERIAL_PRESETS[type];

  const roughnessSlider = document.getElementById('roughness-slider') as HTMLInputElement;
  const roughnessFill = document.getElementById('roughness-fill')!;
  const roughnessValue = document.getElementById('roughness-value')!;
  roughnessSlider.min = String(preset.roughnessRange[0]);
  roughnessSlider.max = String(preset.roughnessRange[1]);
  roughnessSlider.value = String(currentParams.roughness);
  const rPct = ((currentParams.roughness - preset.roughnessRange[0]) / (preset.roughnessRange[1] - preset.roughnessRange[0])) * 100;
  roughnessFill.style.width = rPct + '%';
  roughnessValue.textContent = currentParams.roughness.toFixed(2);

  const metalnessSlider = document.getElementById('metalness-slider') as HTMLInputElement;
  const metalnessFill = document.getElementById('metalness-fill')!;
  const metalnessValue = document.getElementById('metalness-value')!;
  metalnessSlider.min = String(preset.metalnessRange[0]);
  metalnessSlider.max = String(preset.metalnessRange[1]);
  metalnessSlider.value = String(currentParams.metalness);
  const mPct = preset.metalnessRange[1] > preset.metalnessRange[0]
    ? ((currentParams.metalness - preset.metalnessRange[0]) / (preset.metalnessRange[1] - preset.metalnessRange[0])) * 100
    : 0;
  metalnessFill.style.width = mPct + '%';
  metalnessValue.textContent = currentParams.metalness.toFixed(2);

  const iorGroup = document.querySelector('[data-param="ior"]') as HTMLElement;
  const opacityGroup = document.querySelector('[data-param="opacity"]') as HTMLElement;
  if (type === 'glass') {
    iorGroup.classList.remove('hidden');
    opacityGroup.classList.remove('hidden');
    const iorSlider = document.getElementById('ior-slider') as HTMLInputElement;
    const iorFill = document.getElementById('ior-fill')!;
    const iorValue = document.getElementById('ior-value')!;
    if (preset.iorRange) {
      iorSlider.min = String(preset.iorRange[0]);
      iorSlider.max = String(preset.iorRange[1]);
      iorSlider.value = String(currentParams.ior ?? 1.5);
      const iPct = (((currentParams.ior ?? 1.5) - preset.iorRange[0]) / (preset.iorRange[1] - preset.iorRange[0])) * 100;
      iorFill.style.width = iPct + '%';
      iorValue.textContent = (currentParams.ior ?? 1.5).toFixed(2);
    }
    const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
    const opacityFill = document.getElementById('opacity-fill')!;
    const opacityValue = document.getElementById('opacity-value')!;
    if (preset.opacityRange) {
      opacitySlider.min = String(preset.opacityRange[0]);
      opacitySlider.max = String(preset.opacityRange[1]);
      opacitySlider.value = String(currentParams.opacity ?? 0.8);
      const oPct = (((currentParams.opacity ?? 0.8) - preset.opacityRange[0]) / (preset.opacityRange[1] - preset.opacityRange[0])) * 100;
      opacityFill.style.width = oPct + '%';
      opacityValue.textContent = (currentParams.opacity ?? 0.8).toFixed(2);
    }
  } else {
    iorGroup.classList.add('hidden');
    opacityGroup.classList.add('hidden');
  }

  const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
  const colorHex = document.getElementById('color-hex')!;
  colorPicker.value = currentParams.color;
  colorHex.textContent = currentParams.color.toUpperCase();
}

function tweenMaterialParams(targetParams: Partial<MaterialParams>, duration: number = 300): void {
  if (!meshRef) return;

  const startParams = { ...currentParams };
  new TWEEN.Tween(startParams)
    .to(targetParams, duration)
    .easing(TWEEN.Easing.Cubic.Out)
    .onUpdate((obj) => {
      Object.assign(currentParams, obj);
      applyParamsToMaterial();
    })
    .start();
}

function applyParamsToMaterial(): void {
  if (!meshRef) return;
  const mat = meshRef.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

  if ('color' in mat && mat.color) {
    mat.color.set(currentParams.color);
  }
  if ('roughness' in mat) {
    (mat as THREE.MeshStandardMaterial).roughness = currentParams.roughness;
  }
  if ('metalness' in mat) {
    (mat as THREE.MeshStandardMaterial).metalness = currentParams.metalness;
  }
  if ('ior' in mat && currentParams.ior !== undefined) {
    (mat as THREE.MeshPhysicalMaterial).ior = currentParams.ior;
  }
  if ('opacity' in mat && currentParams.opacity !== undefined) {
    (mat as THREE.MeshPhysicalMaterial).opacity = currentParams.opacity;
  }
  if ('transmission' in mat && currentParams.opacity !== undefined) {
    (mat as THREE.MeshPhysicalMaterial).transmission = 1 - currentParams.opacity * 0.3;
  }
}

export function setEnvMap(envMap: THREE.CubeTexture | null): void {
  envMapRef = envMap;
  if (meshRef) {
    const mat = meshRef.material as THREE.MeshStandardMaterial;
    if (mat && 'envMap' in mat) {
      mat.envMap = envMap;
      mat.needsUpdate = true;
    }
  }
}

export function initMaterialUI(
  mesh: THREE.Mesh,
  envMap: THREE.CubeTexture | null
): {
  getCurrentMaterial: () => THREE.Material;
  setMaterialType: (type: MaterialType) => void;
  getParams: () => MaterialParams;
  updateEnvMap: (envMap: THREE.CubeTexture | null) => void;
} {
  meshRef = mesh;
  envMapRef = envMap;
  currentType = 'metal';
  currentParams = { ...MATERIAL_PRESETS.metal.defaultParams };
  mesh.material = createMaterial(currentType, currentParams, envMapRef);
  updateSliderUI(currentType);

  document.querySelectorAll('.material-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.material-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const type = (btn as HTMLElement).dataset.type as MaterialType;
      setMaterialType(type);
    });
  });

  const roughnessSlider = document.getElementById('roughness-slider') as HTMLInputElement;
  roughnessSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const preset = MATERIAL_PRESETS[currentType];
    const pct = ((val - preset.roughnessRange[0]) / (preset.roughnessRange[1] - preset.roughnessRange[0])) * 100;
    document.getElementById('roughness-fill')!.style.width = pct + '%';
    document.getElementById('roughness-value')!.textContent = val.toFixed(2);
    tweenMaterialParams({ roughness: val }, 150);
  });

  const metalnessSlider = document.getElementById('metalness-slider') as HTMLInputElement;
  metalnessSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const preset = MATERIAL_PRESETS[currentType];
    const pct = preset.metalnessRange[1] > preset.metalnessRange[0]
      ? ((val - preset.metalnessRange[0]) / (preset.metalnessRange[1] - preset.metalnessRange[0])) * 100
      : 0;
    document.getElementById('metalness-fill')!.style.width = pct + '%';
    document.getElementById('metalness-value')!.textContent = val.toFixed(2);
    tweenMaterialParams({ metalness: val }, 150);
  });

  const iorSlider = document.getElementById('ior-slider') as HTMLInputElement;
  iorSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const preset = MATERIAL_PRESETS[currentType];
    if (preset.iorRange) {
      const pct = ((val - preset.iorRange[0]) / (preset.iorRange[1] - preset.iorRange[0])) * 100;
      document.getElementById('ior-fill')!.style.width = pct + '%';
    }
    document.getElementById('ior-value')!.textContent = val.toFixed(2);
    tweenMaterialParams({ ior: val }, 150);
  });

  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
  opacitySlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const preset = MATERIAL_PRESETS[currentType];
    if (preset.opacityRange) {
      const pct = ((val - preset.opacityRange[0]) / (preset.opacityRange[1] - preset.opacityRange[0])) * 100;
      document.getElementById('opacity-fill')!.style.width = pct + '%';
    }
    document.getElementById('opacity-value')!.textContent = val.toFixed(2);
    tweenMaterialParams({ opacity: val }, 150);
  });

  const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
  colorPicker.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    document.getElementById('color-hex')!.textContent = val.toUpperCase();
    currentParams.color = val;
    applyParamsToMaterial();
  });

  return {
    getCurrentMaterial: () => mesh.material as THREE.Material,
    setMaterialType,
    getParams: () => ({ ...currentParams }),
    updateEnvMap: setEnvMap
  };
}

export function setMaterialType(type: MaterialType): void {
  if (type === currentType && meshRef) return;
  currentType = type;
  const preset = MATERIAL_PRESETS[type];
  const newParams = { ...preset.defaultParams };

  if (meshRef) {
    const oldMat = meshRef.material as THREE.Material;
    const newMat = createMaterial(type, newParams, envMapRef);
    meshRef.material = newMat;
    oldMat.dispose?.();
  }

  currentParams = newParams;
  updateSliderUI(type);
}
