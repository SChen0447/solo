import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalBallSystem } from './crystal';
import { ParticleSystem } from './particleSystem';
import { UIController, saveScreenshot, DIVINATION_TEXTS } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let crystalSystem: CrystalBallSystem;
let particleSystem: ParticleSystem;
let ui: UIController;
let raycaster: THREE.Raycaster;
let pointer: THREE.Vector2;
let clock: THREE.Clock;
let rafId: number = 0;

function createGradientBackground(): void {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const ctx = bgCanvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1A0030');
  grad.addColorStop(1, '#0D0015');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(bgCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}

function init(): void {
  const container = document.getElementById('canvas-container')!;
  const w = Math.max(window.innerWidth, 1280);
  const h = Math.max(window.innerHeight, 720);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
  camera.position.set(0, 1.2, 7.5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  createGradientBackground();

  const ambient = new THREE.AmbientLight(0x552288, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x8855ff, 1.2, 20, 2);
  keyLight.position.set(4, 4, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xff66aa, 0.9, 18, 2);
  rimLight.position.set(-5, 2, -4);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x66ccff, 0.7, 18, 2);
  fillLight.position.set(0, -3, 4);
  scene.add(fillLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = true;
  controls.minDistance = 4;
  controls.maxDistance = 15;
  controls.enablePan = false;
  controls.target.set(0, 0.6, 0);

  crystalSystem = new CrystalBallSystem(scene);
  particleSystem = new ParticleSystem(scene, 300);

  ui = new UIController();
  ui.onDivination(triggerDivination);
  ui.onReset(resetScene);
  ui.onScreenshot(() => saveScreenshot(renderer.domElement));
  ui.startTextRotation();

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  clock = new THREE.Clock();
  animate();
}

function triggerDivination(): void {
  particleSystem.burst(new THREE.Vector3(0, 0.8, 0), 200);
  crystalSystem.showDivinationSymbol();
  const t = DIVINATION_TEXTS[Math.floor(Math.random() * DIVINATION_TEXTS.length)];
  ui.setText(t, true);
}

function resetScene(): void {
  particleSystem.reset();
  crystalSystem.regenerateGlow();
  const t = DIVINATION_TEXTS[Math.floor(Math.random() * DIVINATION_TEXTS.length)];
  ui.setText(t, true);
}

function onPointerDown(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(crystalSystem.crystalBall, false);
  if (hits.length > 0) {
    triggerDivination();
  }
}

function onResize(): void {
  const w = Math.max(window.innerWidth, 1280);
  const h = Math.max(window.innerHeight, 720);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate(): void {
  rafId = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  crystalSystem.update(delta);
  particleSystem.update(delta);
  controls.update();

  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onResize);
  renderer.domElement.removeEventListener('pointerdown', onPointerDown);
  controls.dispose();
  crystalSystem.dispose();
  particleSystem.dispose();
  ui.dispose();
  renderer.dispose();
}

window.addEventListener('beforeunload', dispose);

init();
