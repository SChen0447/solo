import * as THREE from 'three';
import { GravityManager } from './gravityManager';
import { ParticleSystem, SimParams } from './particleSystem';
import { InteractionManager } from './interaction';

const simParams: SimParams = {
  gravityConstant: 0.5,
  maxVelocity: 2.0,
  particleSizeMultiplier: 1.0,
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let gravityManager: GravityManager;
let particleSystem: ParticleSystem;
let interactionManager: InteractionManager;
let clock: THREE.Clock;
let animationId: number;

function init(): void {
  const container = document.getElementById('app')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000011, 1);
  container.appendChild(renderer.domElement);

  gravityManager = new GravityManager(scene);

  particleSystem = new ParticleSystem(scene, camera, renderer, simParams);

  interactionManager = new InteractionManager(renderer, camera, scene, gravityManager);

  clock = new THREE.Clock();

  setupUIControls();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupUIControls(): void {
  const gSlider = document.getElementById('gSlider') as HTMLInputElement;
  const gValue = document.getElementById('gValue')!;
  const velSlider = document.getElementById('velSlider') as HTMLInputElement;
  const velValue = document.getElementById('velValue')!;
  const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
  const sizeValue = document.getElementById('sizeValue')!;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  gSlider.addEventListener('input', () => {
    const val = parseFloat(gSlider.value);
    simParams.gravityConstant = val;
    gValue.textContent = val.toFixed(1);
    particleSystem.updateParams({ gravityConstant: val });
  });

  velSlider.addEventListener('input', () => {
    const val = parseFloat(velSlider.value);
    simParams.maxVelocity = val;
    velValue.textContent = val.toFixed(1);
    particleSystem.updateParams({ maxVelocity: val });
  });

  sizeSlider.addEventListener('input', () => {
    const val = parseFloat(sizeSlider.value);
    simParams.particleSizeMultiplier = val;
    sizeValue.textContent = val.toFixed(1);
    particleSystem.updateParams({ particleSizeMultiplier: val });
  });

  resetBtn.addEventListener('click', () => {
    particleSystem.reset();
    gravityManager.removeAll();
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  particleSystem.onResize();
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  gravityManager.update(delta);
  interactionManager.update(delta);

  const count = gravityManager.getCount();
  const positions = gravityManager.getSourcePositionsArray();
  const strengths = gravityManager.getSourceStrengthsArray();
  particleSystem.updateGravityData(positions, strengths, count);

  particleSystem.update(elapsed);

  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  interactionManager.dispose();
  particleSystem.dispose();
  gravityManager.dispose();
  renderer.dispose();
}

init();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
  });
}
