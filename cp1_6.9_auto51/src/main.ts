import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StarDataManager } from './data/StarDataManager';
import { StarFieldRenderer } from './scene/StarFieldRenderer';
import { InteractionController } from './interaction/InteractionController';
import type { StarData, StarFilterOptions } from './types/star';
import { SPECTRAL_COLORS, SPECTRAL_NAMES } from './types/star';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let starDataManager: StarDataManager;
let starFieldRenderer: StarFieldRenderer;
let interactionController: InteractionController;
let clock: THREE.Clock;

let currentFilters: StarFilterOptions = {
  magnitudeThreshold: 6.0,
  minDistance: 10,
  maxDistance: 500,
};

let fpsFrames = 0;
let fpsLastTime = performance.now();

const infoPanel = document.getElementById('info-panel') as HTMLDivElement;
const infoContent = document.getElementById('info-content') as HTMLDivElement;
const magnitudeSlider = document.getElementById('magnitude-slider') as HTMLInputElement;
const magnitudeValue = document.getElementById('magnitude-value') as HTMLSpanElement;
const distanceMinSlider = document.getElementById('distance-min-slider') as HTMLInputElement;
const distanceMaxSlider = document.getElementById('distance-max-slider') as HTMLInputElement;
const distanceValue = document.getElementById('distance-value') as HTMLSpanElement;
const controlPanel = document.getElementById('control-panel') as HTMLDivElement;
const drawerToggle = document.getElementById('drawer-toggle') as HTMLButtonElement;
const fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;

function initScene(): void {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 300);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('star-canvas') as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 50;
  controls.maxDistance = 800;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = (2 * Math.PI) / 3;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
}

function initStars(): void {
  starDataManager = new StarDataManager();
  const stars = starDataManager.loadStars(2000);
  starFieldRenderer = new StarFieldRenderer(scene, stars);
}

function initInteraction(): void {
  const stars = starDataManager.stars;
  interactionController = new InteractionController(
    camera,
    renderer,
    starFieldRenderer,
    stars,
    onStarHover,
    onStarClick
  );
}

function updateStarInfo(star: StarData | null): void {
  if (!infoContent) return;

  if (!star) {
    infoContent.innerHTML = '<div class="info-empty">将鼠标悬停在恒星上查看信息</div>';
    return;
  }

  const color = SPECTRAL_COLORS[star.spectralType];
  const spectralName = SPECTRAL_NAMES[star.spectralType];

  infoContent.innerHTML = `
    <div class="info-name">${star.name || `HD ${100000 + star.id}`}</div>
    <div class="info-row">
      <span class="info-label">星等</span>
      <span class="info-value">${star.magnitude.toFixed(1)} mag</span>
    </div>
    <div class="info-row">
      <span class="info-label">距离</span>
      <span class="info-value">${star.distance.toFixed(1)} ly</span>
    </div>
    <div class="info-row">
      <span class="info-label">光谱</span>
      <span class="info-value">
        <span class="info-swatch" style="background:${color};color:${color}"></span>
        ${spectralName}
      </span>
    </div>
  `;
}

function onStarHover(star: StarData | null): void {
  updateStarInfo(star);
}

function onStarClick(star: StarData | null): void {
  updateStarInfo(star);
}

function initFilters(): void {
  magnitudeSlider.addEventListener('input', () => {
    const val = parseFloat(magnitudeSlider.value);
    currentFilters.magnitudeThreshold = val;
    magnitudeValue.textContent = val.toFixed(1);
    starFieldRenderer.applyFilter(currentFilters);
  });

  const updateDistance = () => {
    let min = parseFloat(distanceMinSlider.value);
    let max = parseFloat(distanceMaxSlider.value);
    if (min > max) {
      [min, max] = [max, min];
    }
    currentFilters.minDistance = min;
    currentFilters.maxDistance = max;
    distanceValue.textContent = `${min} - ${max} ly`;
    starFieldRenderer.applyFilter(currentFilters);
  };

  distanceMinSlider.addEventListener('input', updateDistance);
  distanceMaxSlider.addEventListener('input', updateDistance);

  drawerToggle.addEventListener('click', () => {
    controlPanel.classList.toggle('open');
  });
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS(): void {
  fpsFrames++;
  const now = performance.now();
  if (now - fpsLastTime >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLastTime));
    fpsCounter.textContent = `${fps} FPS`;
    fpsFrames = 0;
    fpsLastTime = now;
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  controls.update();
  starFieldRenderer.update(delta);
  interactionController.update();
  renderer.render(scene, camera);
  updateFPS();
}

function init(): void {
  clock = new THREE.Clock();
  initScene();
  initStars();
  initInteraction();
  initFilters();
  window.addEventListener('resize', onResize);
  animate();
}

init();
