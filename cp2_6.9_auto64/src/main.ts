import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { SortController, SortAlgorithm } from './sortController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sortController: SortController;
let clock: THREE.Clock;
let container: HTMLElement | null;
let stepCountEl: HTMLElement | null;
let compareCountEl: HTMLElement | null;
let swapCountEl: HTMLElement | null;
let buttons: NodeListOf<HTMLButtonElement>;

let isMobile: boolean = false;

function init(): void {
  container = document.getElementById('canvas-container');
  stepCountEl = document.getElementById('step-count');
  compareCountEl = document.getElementById('compare-count');
  swapCountEl = document.getElementById('swap-count');
  buttons = document.querySelectorAll('.sort-btn');

  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  isMobile = window.innerWidth < 768;

  scene = new THREE.Scene();

  const cameraZ = isMobile ? 12 : 18;
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 4, cameraZ);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 40;
  controls.target.set(0, 0, 0);

  const hemiLight = new THREE.HemisphereLight(0x1e3a5f, 0x0b0e17, 0.6);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const bubbleCount = isMobile ? 12 : 20;
  sortController = new SortController(scene, bubbleCount);

  clock = new THREE.Clock();

  setupButtonListeners();
  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupButtonListeners(): void {
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const algo = btn.dataset.algo as SortAlgorithm;
      if (algo && !sortController.getIsAnimating()) {
        setButtonsDisabled(true);
        sortController.startSort(algo);
        setTimeout(() => setButtonsDisabled(false), 500);
      }
    });
  });
}

function setButtonsDisabled(disabled: boolean): void {
  buttons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function onWindowResize(): void {
  if (!container || !camera || !renderer) return;

  const newIsMobile = window.innerWidth < 768;
  if (newIsMobile !== isMobile) {
    isMobile = newIsMobile;
    const newBubbleCount = isMobile ? 12 : 20;
    const newCameraZ = isMobile ? 12 : 18;
    sortController.reset(newBubbleCount);
    camera.position.set(0, 4, newCameraZ);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
  }

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function updateStats(): void {
  if (!stepCountEl || !compareCountEl || !swapCountEl) return;
  const stats = sortController.getStats();
  stepCountEl.textContent = stats.steps.toString();
  compareCountEl.textContent = stats.compares.toString();
  swapCountEl.textContent = stats.swaps.toString();
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  TWEEN.update();
  controls.update();
  sortController.update(delta, elapsed);
  updateStats();
  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
