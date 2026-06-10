import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { CaveGenerator, CaveOutput } from './caveGenerator';
import { CrystalGenerator, CrystalConfig, CrystalOutput } from './crystalGenerator';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  caveOutput: CaveOutput | null;
  crystalOutput: CrystalOutput | null;
  caveGenerator: CaveGenerator;
  crystalGenerator: CrystalGenerator;
  regenerate: (boostPoint?: THREE.Vector3) => void;
  setClippingDepth: (depth: number) => void;
  applyColorFilter: (filter: string) => void;
  onFrame: (delta: number) => void;
}

export let sceneContext: SceneContext | null = null;

const container = document.getElementById('canvas-container');
if (!container) throw new Error('Canvas container not found');

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(0x0a0604, 0.08);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(4, -3, 4);
camera.lookAt(0, -5, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
mainLight.position.set(-8, 5, -6);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -15;
mainLight.shadow.camera.right = 15;
mainLight.shadow.camera.top = 15;
mainLight.shadow.camera.bottom = -15;
scene.add(mainLight);

const backLight = new THREE.DirectionalLight(0xffeecc, 0.2);
backLight.position.set(6, -8, 8);
scene.add(backLight);

const caveGroup = new THREE.Group();
const crystalGroup = new THREE.Group();
const rareGemGroup = new THREE.Group();
scene.add(caveGroup);
scene.add(crystalGroup);
scene.add(rareGemGroup);

let clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);
let currentClippingDepth = -1;

const caveGenerator = new CaveGenerator();
const crystalGenerator = new CrystalGenerator();
let caveOutput: CaveOutput | null = null;
let crystalOutput: CrystalOutput | null = null;

const crystalConfig: CrystalConfig = {
  clusterCount: 150,
  crystalsPerCluster: [5, 15],
  crystalHeight: [0.3, 0.8],
  crystalWidth: [0.15, 0.3]
};

function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
}

function regenerate(boostPoint?: THREE.Vector3): void {
  clearGroup(caveGroup);
  clearGroup(crystalGroup);
  clearGroup(rareGemGroup);

  const seed = Math.random() * 100000;
  caveGenerator.reseed(seed);
  crystalGenerator.reseed(seed);

  caveOutput = caveGenerator.generate();
  for (const mesh of caveOutput.caveMeshes) {
    (mesh.material as THREE.Material).clippingPlanes = [clippingPlane];
    caveGroup.add(mesh);
  }

  const config: CrystalConfig = { ...crystalConfig };
  if (boostPoint) {
    config.densityBoostPoint = boostPoint;
    config.densityBoostRadius = 2;
    config.densityBoostFactor = 1.5;
  }

  crystalOutput = crystalGenerator.generate(caveOutput.surfacePoints, config);
  for (const grp of crystalOutput.crystalGroups) {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          (m as THREE.Material).clippingPlanes = [clippingPlane];
        });
      }
    });
    crystalGroup.add(grp);
  }

  if (crystalOutput.rareGem) {
    rareGemGroup.add(crystalOutput.rareGem);
  }
  if (crystalOutput.rareGemGlow) {
    rareGemGroup.add(crystalOutput.rareGemGlow);
  }
}

function setClippingDepth(depth: number): void {
  currentClippingDepth = depth;
  const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -depth);

  const startConstant = clippingPlane.constant;
  const endConstant = targetPlane.constant;

  const tweenData = { constant: startConstant };
  new TWEEN.Tween(tweenData)
    .to({ constant: endConstant }, 200)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), tweenData.constant);
      updateAllClippingPlanes();
    })
    .start();
}

function updateAllClippingPlanes(): void {
  caveGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        (m as THREE.MeshPhongMaterial).clippingPlanes = [clippingPlane];
      });
    }
  });
  crystalGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        (m as THREE.MeshPhongMaterial).clippingPlanes = [clippingPlane];
      });
    }
  });
}

function applyColorFilter(filter: string): void {
  if (crystalOutput) {
    crystalGenerator.applyColorFilter(crystalOutput.crystalGroups, filter);
  }
}

const clock = new THREE.Clock();
let glowTime = 0;

function onFrame(_delta: number): void {
  const delta = clock.getDelta();
  TWEEN.update();

  glowTime += delta;
  rareGemGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.isGlow) {
      const mat = child.material as THREE.MeshBasicMaterial;
      const pulse = 0.1 + (Math.sin(glowTime * (Math.PI * 2) / 1.5) + 1) * 0.5 * 0.7;
      mat.opacity = pulse;
      const scale = 1 + Math.sin(glowTime * (Math.PI * 2) / 1.5) * 0.15;
      child.scale.setScalar(scale);
    }
    if (child instanceof THREE.Mesh && child.userData.isRareGem) {
      child.rotation.y += delta * 0.5;
      child.rotation.x += delta * 0.2;
    }
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(): void {
  requestAnimationFrame(animate);
  onFrame(0);
  renderer.render(scene, camera);
}

regenerate();
animate();

sceneContext = {
  scene,
  camera,
  renderer,
  caveOutput,
  crystalOutput,
  caveGenerator,
  crystalGenerator,
  regenerate,
  setClippingDepth,
  applyColorFilter,
  onFrame
};

declare global {
  interface Window {
    __crystalScene: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      crystalGroup: THREE.Group;
      rareGemGroup: THREE.Group;
      regenerate: (boostPoint?: THREE.Vector3) => void;
      setClippingDepth: (depth: number) => void;
      applyColorFilter: (filter: string) => void;
    };
  }
}

(window as unknown as { __crystalScene: unknown }).__crystalScene = {
  scene,
  camera,
  renderer,
  crystalGroup,
  rareGemGroup,
  regenerate,
  setClippingDepth,
  applyColorFilter
};

export {
  scene,
  camera,
  renderer,
  crystalGroup,
  caveGroup,
  rareGemGroup,
  regenerate,
  setClippingDepth,
  applyColorFilter
};

import './interaction';
