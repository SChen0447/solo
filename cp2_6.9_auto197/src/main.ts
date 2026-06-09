import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Galaxy } from './galaxy';
import { GalaxyControls, ControlParams } from './controls';

const app = document.getElementById('app') as HTMLDivElement;
const fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
const guiContainer = document.getElementById('gui-container') as HTMLDivElement;
const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

if (!app || !fpsCounter || !guiContainer || !toggleBtn || !resetBtn) {
  throw new Error('Required DOM elements not found');
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let galaxy: Galaxy;
let galaxyControls: GalaxyControls;

const clock = new THREE.Clock();
let frameCount = 0;
let fpsTimeAccumulator = 0;
let currentFps = 60;
let isLowPerfMode = false;

const initialParams: ControlParams = {
  particleCount: 2000,
  gravityStrength: 1.5,
  rotationSpeed: 1.0,
  colorScheme: 'warm-cool'
};

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.enablePan = false;

  galaxy = new Galaxy(initialParams);
  scene.add(galaxy.points);

  galaxyControls = new GalaxyControls(guiContainer, galaxy, initialParams);

  galaxyControls.setToggleEvolutionHandler(() => {
    const isEvolving = galaxy.toggleEvolution();
    toggleBtn.textContent = isEvolving ? '暂停' : '演化';
  });

  galaxyControls.setResetHandler(() => {
    galaxy.reset();
    galaxy.setEvolving(false);
    toggleBtn.textContent = '演化';
  });

  toggleBtn.addEventListener('click', () => {
    galaxyControls.handleToggleEvolution();
  });

  resetBtn.addEventListener('click', () => {
    galaxyControls.handleReset();
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onWindowResize);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    event.preventDefault();
    galaxyControls.handleToggleEvolution();
  } else if (event.code === 'KeyR') {
    galaxyControls.handleReset();
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS(delta: number): void {
  frameCount++;
  fpsTimeAccumulator += delta;

  if (fpsTimeAccumulator >= 0.5) {
    currentFps = Math.round(frameCount / fpsTimeAccumulator);
    fpsCounter.textContent = `FPS: ${currentFps}`;
    frameCount = 0;
    fpsTimeAccumulator = 0;

    if (currentFps < 30 && !isLowPerfMode) {
      isLowPerfMode = true;
      galaxy.setBaseSize(0.03);
    } else if (currentFps >= 45 && isLowPerfMode) {
      isLowPerfMode = false;
      galaxy.setBaseSize(0.05);
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  controls.update();

  if (galaxy.getIsEvolving()) {
    galaxy.update(
      delta,
      galaxyControls.getGravityStrength(),
      galaxyControls.getRotationSpeed()
    );
  }

  updateFPS(delta);

  renderer.render(scene, camera);
}

function dispose(): void {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', onWindowResize);
  controls.dispose();
  galaxy.dispose();
  galaxyControls.dispose();
  renderer.dispose();
}

init();
animate();

window.addEventListener('beforeunload', dispose);
