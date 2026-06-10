import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  getInterpolatedSeasonParams,
  getSeasonMeta,
  type SeasonParams
} from './season';

import {
  createScene,
  updateSceneColors,
  updateSkyTime,
  type SceneObjects
} from './environment';

interface AnimationState {
  isAnimating: boolean;
  fromValue: number;
  toValue: number;
  startTime: number;
  duration: number;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;
let directionalLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;
let sceneObjects: SceneObjects;
let currentSeasonParams: SeasonParams;
let displayedSeasonValue = 0;
let animationState: AnimationState = {
  isAnimating: false,
  fromValue: 0,
  toValue: 0,
  startTime: 0,
  duration: 2000
};
let materialAnimProgress = 1.0;
let clock: THREE.Clock;
let seasonSlider: HTMLInputElement;
let seasonButtons: NodeListOf<HTMLButtonElement>;
let seasonTitle: HTMLElement;
let seasonDesc: HTMLElement;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function initThree(): void {
  const container = document.getElementById('canvas-container');
  if (!container) throw new Error('Canvas container not found');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  const distance = 20;
  const angle = (45 * Math.PI) / 180;
  camera.position.set(
    distance * Math.cos(angle) * Math.sin(Math.PI / 4),
    distance * Math.sin(angle),
    distance * Math.cos(angle) * Math.cos(Math.PI / 4)
  );
  camera.lookAt(0, 5, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = (30 * Math.PI) / 180;
  controls.maxPolarAngle = (110 * Math.PI) / 180;
  controls.minDistance = 10;
  controls.maxDistance = 30;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 80;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.bias = -0.0005;
  directionalLight.shadow.normalBias = 0.02;
  scene.add(directionalLight);

  const renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.4,
    0.85
  );
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
}

function initEnvironment(): void {
  sceneObjects = createScene();

  scene.add(sceneObjects.sky);
  scene.add(sceneObjects.ground);
  scene.add(sceneObjects.building);
  sceneObjects.trees.forEach((tree) => {
    scene.add(tree.group);
    tree.baseFoliageColor.copy((tree.foliage.material as THREE.MeshStandardMaterial).color);
  });

  currentSeasonParams = getInterpolatedSeasonParams(0);
  updateSceneColors(sceneObjects, currentSeasonParams, 1.0);
  updateLighting(currentSeasonParams);
  updateBloom(currentSeasonParams);
}

function updateLighting(params: SeasonParams): void {
  const sunDistance = 25;
  directionalLight.position.copy(params.sunDir).multiplyScalar(sunDistance);
  directionalLight.position.y = Math.max(directionalLight.position.y, 5);
  directionalLight.color.copy(params.sunColor);
  directionalLight.shadow.bias = params.shadowBias;
  directionalLight.shadow.radius = 1 + params.shadowSoftness * 4;

  ambientLight.intensity = params.ambientIntensity;
}

function updateBloom(params: SeasonParams): void {
  bloomPass.strength = params.bloomIntensity * 0.8;
  bloomPass.threshold = 0.85 - params.bloomIntensity * 0.2;
}

function updateUI(seasonValue: number): void {
  const meta = getSeasonMeta(seasonValue);
  if (seasonTitle) {
    seasonTitle.textContent = meta.name;
    seasonTitle.style.color = meta.color;
  }
  if (seasonDesc) {
    seasonDesc.textContent = meta.desc;
  }

  const nearestIndex = Math.round(seasonValue);
  seasonButtons.forEach((btn, idx) => {
    if (idx === nearestIndex) {
      btn.classList.add('active');
      btn.style.color = ['#7cb342', '#2e7d32', '#ff8f00', '#c8d0e0'][idx];
    } else {
      btn.classList.remove('active');
    }
  });
}

function animateSeason(targetValue: number): void {
  animationState = {
    isAnimating: true,
    fromValue: displayedSeasonValue,
    toValue: targetValue,
    startTime: performance.now(),
    duration: 2000
  };
  materialAnimProgress = 0;
}

function handleSliderChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  animateSeason(val);
}

function handleButtonClick(e: Event): void {
  const btn = e.currentTarget as HTMLButtonElement;
  const seasonIndex = parseInt(btn.dataset.season || '0', 10);
  if (seasonSlider) {
    seasonSlider.value = String(seasonIndex);
  }
  animateSeason(seasonIndex);
}

function initUI(): void {
  seasonSlider = document.getElementById('season-slider') as HTMLInputElement;
  seasonButtons = document.querySelectorAll('.season-btn');
  seasonTitle = document.getElementById('season-title') as HTMLElement;
  seasonDesc = document.getElementById('season-desc') as HTMLElement;

  if (seasonSlider) {
    seasonSlider.addEventListener('input', handleSliderChange);
  }

  seasonButtons.forEach((btn) => {
    btn.addEventListener('click', handleButtonClick);
  });

  updateUI(0);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  const delta = clock.getDelta();

  updateSkyTime(sceneObjects.sky, elapsedTime);

  if (animationState.isAnimating) {
    const now = performance.now();
    const rawT = Math.min(1, (now - animationState.startTime) / animationState.duration);
    const easedT = easeInOutCubic(rawT);

    displayedSeasonValue = animationState.fromValue + (animationState.toValue - animationState.fromValue) * easedT;
    materialAnimProgress = Math.min(1, materialAnimProgress + delta / 0.5);

    currentSeasonParams = getInterpolatedSeasonParams(displayedSeasonValue, currentSeasonParams);
    updateLighting(currentSeasonParams);
    updateBloom(currentSeasonParams);
    updateSceneColors(sceneObjects, currentSeasonParams, materialAnimProgress);
    updateUI(displayedSeasonValue);

    if (seasonSlider && !seasonSlider.matches(':active')) {
      seasonSlider.value = String(displayedSeasonValue);
    }

    if (rawT >= 1) {
      animationState.isAnimating = false;
      displayedSeasonValue = animationState.toValue;
    }
  }

  controls.update();
  composer.render();
}

function init(): void {
  clock = new THREE.Clock();
  initThree();
  initEnvironment();
  initUI();
  window.addEventListener('resize', onWindowResize);
  animate();
}

init();
