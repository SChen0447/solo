import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NetworkManager } from './NetworkManager';
import { ParticleSystem } from './ParticleSystem';
import { UIOverlay } from './UIOverlay';

const container = document.getElementById('canvas-container');
if (!container) {
  throw new Error('Canvas container not found');
}

const uiRoot = document.getElementById('ui-overlay');
if (!uiRoot) {
  throw new Error('UI overlay root not found');
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0e1a, 0.025);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 2, 18);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 40;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;

const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x8888ff, 1.2);
directionalLight.position.set(5, 6, 7);
scene.add(directionalLight);

const fillLight = new THREE.PointLight(0xff9ff3, 0.3, 40);
fillLight.position.set(-6, -4, -5);
scene.add(fillLight);

const networkManager = new NetworkManager(scene, camera);
const particleSystem = new ParticleSystem(scene);
particleSystem.syncWithConnections(networkManager.connections);

networkManager.setOnRecombine(() => {
  particleSystem.syncWithConnections(networkManager.connections);
});

const uiOverlay = new UIOverlay(uiRoot);

networkManager.setOnNodeClick((node) => {
  if (node) {
    uiOverlay.showMemory(node);
  } else {
    uiOverlay.hideMemory();
  }
});

uiOverlay.setOnRecombineRequest(() => {
  networkManager.triggerRecombine();
});

uiOverlay.setOnEscape(() => {
  networkManager.clearSelection();
});

let pointerDownX = 0;
let pointerDownY = 0;
let pointerMoved = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
  pointerMoved = false;
});

renderer.domElement.addEventListener('pointermove', (e) => {
  const dx = e.clientX - pointerDownX;
  const dy = e.clientY - pointerDownY;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    pointerMoved = true;
  }
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (pointerMoved) return;
  const rect = renderer.domElement.getBoundingClientRect();
  networkManager.handlePointerDown(e.clientX, e.clientY, rect);
});

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();
let elapsed = 0;
const lightPivot = new THREE.Vector3();

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;

  const lightAngle = (elapsed / 4) * Math.PI * 2;
  directionalLight.position.set(
    Math.cos(lightAngle) * 8,
    4,
    Math.sin(lightAngle) * 8
  );
  directionalLight.position.add(lightPivot);

  fillLight.position.x = Math.sin(elapsed * 0.6) * 7;
  fillLight.position.y = Math.cos(elapsed * 0.4) * 5;
  fillLight.position.z = Math.cos(elapsed * 0.5) * 6;

  controls.update();
  networkManager.update(delta, elapsed);
  particleSystem.update(delta, elapsed);
  renderer.render(scene, camera);
}

animate();

function onBeforeUnload(): void {
  networkManager.dispose();
  particleSystem.dispose();
  renderer.dispose();
}
window.addEventListener('beforeunload', onBeforeUnload);
