import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTerrain, exportSceneAsPNG, type TerrainData } from './terrain';
import { createClippingSystem, setupDialControl, type ClippingSystem } from './clipping';

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 5, 10);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let terrainData: TerrainData;
let clippingSystem: ClippingSystem;
let frameCount = 0;
let lastTime = performance.now();
let fpsElement: HTMLElement;

function init() {
  const container = document.getElementById('canvas-container') as HTMLElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0B0C10);
  scene.fog = new THREE.FogExp2(0x1F2833, 0.02);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(DEFAULT_CAMERA_POS);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  renderer.localClippingEnabled = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.target.set(0, 0, 0);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(8, 12, 6);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  directionalLight.shadow.bias = -0.0005;
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.35);
  scene.add(hemisphereLight);

  terrainData = createTerrain();
  scene.add(terrainData.mesh);
  scene.add(terrainData.contours);

  (terrainData.mesh.material as THREE.MeshStandardMaterial).clippingPlanes = [];
  (terrainData.mesh.material as THREE.MeshStandardMaterial).clipShadows = true;

  clippingSystem = createClippingSystem(terrainData);
  scene.add(clippingSystem.planeMesh);
  scene.add(clippingSystem.capMesh);
  scene.add(clippingSystem.edgeLines);
  scene.add(clippingSystem.rockParticles);

  (terrainData.mesh.material as THREE.MeshStandardMaterial).clippingPlanes = [
    clippingSystem.clippingPlane
  ];

  setupUI();
  setupEventListeners(container);
}

function setupUI() {
  fpsElement = document.getElementById('fps-counter') as HTMLElement;

  const sliceSlider = document.getElementById('slice-slider') as HTMLInputElement;
  const sliceValue = document.getElementById('slice-value') as HTMLSpanElement;

  sliceSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    sliceValue.textContent = value.toFixed(1);
    clippingSystem.updateSlicePosition(value);
  });

  setupDialControl('dial-container', (degrees) => {
    clippingSystem.updateSliceAngle(degrees);
  });

  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  resetBtn.addEventListener('click', () => {
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  exportBtn.addEventListener('click', () => {
    exportSceneAsPNG(renderer, scene, camera, 1920, 1080);
  });
}

function setupEventListeners(container: HTMLElement) {
  window.addEventListener('resize', onWindowResize);

  container.addEventListener('mousemove', (e) => {
    clippingSystem.handleMouseMove(e, camera, container, terrainData);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS() {
  frameCount++;
  const currentTime = performance.now();
  const elapsed = currentTime - lastTime;

  if (elapsed >= 500) {
    const fps = Math.round((frameCount * 1000) / elapsed);
    fpsElement.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastTime = currentTime;
  }
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  clippingSystem.update();
  updateFPS();

  renderer.render(scene, camera);
}

init();
animate();
