import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityManager, BuildingData, MaterialType } from './cityManager';
import { ShadowSimulator } from './shadowSimulator';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let cityManager: CityManager;
let shadowSimulator: ShadowSimulator;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) {
    console.error('Scene container not found');
    return;
  }

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, 220, 320);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 100;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI / 2.2;

  setupSky();
  setupGround();
  setupLights();

  cityManager = new CityManager(scene, camera, renderer);
  shadowSimulator = new ShadowSimulator(scene, directionalLight, ambientLight);
  shadowSimulator.createUI('time-dial-container');

  setupUIListeners();
  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupSky(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1a237e');
  gradient.addColorStop(1, '#64b5f6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  scene.background = texture;
}

function setupGround(): void {
  const groundGeometry = new THREE.PlaneGeometry(800, 800);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e8f5e9'),
    roughness: 0.9,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(800, 80, 0xbdbdbd, 0xbdbdbd);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.3;
  scene.add(gridHelper);
}

function setupLights(): void {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(200, 400, 200);
  scene.add(directionalLight);
  scene.add(directionalLight.target);
}

function setupUIListeners(): void {
  cityManager.onBuildingSelect((data: BuildingData | null) => {
    updatePropertyPanel(data);
  });

  const materialButtons = document.querySelectorAll('.material-btn');
  materialButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const material = (e.target as HTMLElement).dataset.material as MaterialType;
      if (material) {
        cityManager.setBuildingMaterial(material);
        document.querySelectorAll('.material-btn').forEach((b) => {
          b.classList.remove('active');
        });
        (e.target as HTMLElement).classList.add('active');
      }
    });
  });

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      cityManager.exportJSON();
      cityManager.exportScreenshot();
    });
  }

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const panel = document.getElementById('control-panel');
  if (hamburgerBtn && panel) {
    hamburgerBtn.addEventListener('click', () => {
      panel.classList.toggle('open');
    });
  }
}

function updatePropertyPanel(data: BuildingData | null): void {
  const noSelection = document.getElementById('no-selection');
  const buildingInfo = document.getElementById('building-info');
  const buildingHeight = document.getElementById('building-height');
  const buildingPos = document.getElementById('building-pos');
  const materialButtons = document.querySelectorAll('.material-btn');

  if (!data) {
    if (noSelection) noSelection.style.display = 'block';
    if (buildingInfo) buildingInfo.style.display = 'none';
    materialButtons.forEach((b) => b.classList.remove('active'));
    return;
  }

  if (noSelection) noSelection.style.display = 'none';
  if (buildingInfo) buildingInfo.style.display = 'block';
  if (buildingHeight) buildingHeight.textContent = `${data.height.toFixed(1)} 单位`;
  if (buildingPos) buildingPos.textContent = `(${data.x}, ${data.z})`;

  materialButtons.forEach((b) => {
    if ((b as HTMLElement).dataset.material === data.material) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

function onWindowResize(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  cityManager.update();
  shadowSimulator.update();
  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
