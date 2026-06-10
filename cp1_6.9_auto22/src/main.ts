import * as THREE from 'three';
import { LavaLamp } from './lavaLamp';
import { DropletManager } from './dropletManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let lavaLamp: LavaLamp;
let dropletManager: DropletManager;
let clock: THREE.Clock;
let globalTime: number = 0;
let speedMultiplier: number = 1.0;
let ambientLight: THREE.AmbientLight;
let isInitialized: boolean = false;

const containerEl = document.getElementById('canvas-container');

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  const initialFov = computeFov();
  camera = new THREE.PerspectiveCamera(
    initialFov,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.5, 7);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  if (containerEl) {
    containerEl.appendChild(renderer.domElement);
  }

  ambientLight = new THREE.AmbientLight(0x332211, 0.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.3);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);

  lavaLamp = new LavaLamp(scene);
  dropletManager = new DropletManager(scene);

  clock = new THREE.Clock();
  isInitialized = true;

  setupControls();
  window.addEventListener('resize', onWindowResize);

  animate();
}

function computeFov(): number {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    return 75;
  } else if (aspect > 2) {
    return 60;
  }
  return 60 + (1 - (aspect - 1)) * 15;
}

function onWindowResize(): void {
  const fov = computeFov();
  camera.fov = fov;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  const dist = 7 / (fov / 60);
  camera.position.z = dist;
  camera.lookAt(0, 0, 0);

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupControls(): void {
  const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;
  const heatIntensityInput = document.getElementById('heatIntensity') as HTMLInputElement;
  const speedMultiplierInput = document.getElementById('speedMultiplier') as HTMLInputElement;
  const heatValue = document.getElementById('heatValue') as HTMLSpanElement;
  const speedValue = document.getElementById('speedValue') as HTMLSpanElement;

  if (bgColorInput) {
    bgColorInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      lavaLamp.setContainerBackgroundColor(val);
    });
  }

  if (heatIntensityInput && heatValue) {
    heatIntensityInput.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      heatValue.textContent = `${val}%`;
      lavaLamp.setHeatIntensity(val / 100);
    });
  }

  if (speedMultiplierInput && speedValue) {
    speedMultiplierInput.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      speedValue.textContent = `${(val / 100).toFixed(1)}x`;
      speedMultiplier = val / 100;
    });
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  globalTime += delta;
  const deltaClamped = Math.min(delta, 0.05);

  if (isInitialized) {
    lavaLamp.update(deltaClamped, globalTime);
    dropletManager.update(deltaClamped, globalTime, speedMultiplier);

    const timeSlow = globalTime * 0.15;
    camera.position.x = Math.sin(timeSlow) * 0.5;
    camera.position.y = 0.5 + Math.sin(timeSlow * 0.7) * 0.3;
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
}

init();
