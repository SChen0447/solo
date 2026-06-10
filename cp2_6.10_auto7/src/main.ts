import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCity, BuildingData, getBuildingMeshes } from './sceneBuilder';
import { ShadowAnalyzer, ShadowQuality } from './shadowAnalyzer';
import './styles.css';

const BUILDING_DATA: BuildingData[] = [
  { id: 1, x: -70, z: -60, width: 20, depth: 18, height: 55, color: '#f5ede0' },
  { id: 2, x: -40, z: -70, width: 16, depth: 16, height: 42, color: '#e8c9a0' },
  { id: 3, x: -10, z: -65, width: 24, depth: 20, height: 78, color: '#d4c4b0' },
  { id: 4, x: 25, z: -70, width: 18, depth: 22, height: 35, color: '#f0e0c8' },
  { id: 5, x: 60, z: -55, width: 22, depth: 18, height: 62, color: '#e5d5bd' },
  { id: 6, x: -65, z: -20, width: 15, depth: 20, height: 48, color: '#f5ede0' },
  { id: 7, x: -30, z: -15, width: 20, depth: 16, height: 90, color: '#e0cdb0' },
  { id: 8, x: 0, z: -25, width: 28, depth: 24, height: 110, color: '#d4c4b0' },
  { id: 9, x: 35, z: -20, width: 16, depth: 18, height: 38, color: '#e8c9a0' },
  { id: 10, x: 65, z: -15, width: 20, depth: 20, height: 72, color: '#f0e0c8' },
  { id: 11, x: -55, z: 25, width: 18, depth: 22, height: 52, color: '#e5d5bd' },
  { id: 12, x: -20, z: 30, width: 22, depth: 16, height: 65, color: '#f5ede0' },
  { id: 13, x: 15, z: 25, width: 20, depth: 20, height: 45, color: '#e8c9a0' },
  { id: 14, x: 50, z: 30, width: 24, depth: 22, height: 85, color: '#d4c4b0' },
  { id: 15, x: 75, z: 55, width: 18, depth: 16, height: 40, color: '#f0e0c8' }
];

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let cityGroup: THREE.Group;
let shadowAnalyzer: ShadowAnalyzer;
let buildingMeshes: THREE.Mesh[] = [];

let clock: THREE.Clock;
let raycaster: THREE.Raycaster;
let mouseNDC: THREE.Vector2;

const fpsFrames: number[] = [];
let lowFPSTime = 0;
let highFPSTime = 0;
let currentQuality: ShadowQuality = 'high';

const azimuthSlider = document.getElementById('azimuth-slider') as HTMLInputElement;
const altitudeSlider = document.getElementById('altitude-slider') as HTMLInputElement;
const azimuthValue = document.getElementById('azimuth-value') as HTMLElement;
const altitudeValue = document.getElementById('altitude-value') as HTMLElement;
const animateBtn = document.getElementById('animate-btn') as HTMLButtonElement;
const fpsValueEl = document.getElementById('fps-value') as HTMLElement;
const fpsQualityEl = document.getElementById('fps-quality') as HTMLElement;
const qualityWarning = document.getElementById('quality-warning') as HTMLElement;
const tooltip = document.getElementById('building-tooltip') as HTMLElement;
const tooltipTitle = document.getElementById('tooltip-title') as HTMLElement;
const tooltipHeight = document.getElementById('tooltip-height') as HTMLElement;
const controlPanel = document.getElementById('control-panel') as HTMLElement;
const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
const panelClose = document.getElementById('panel-close') as HTMLButtonElement;

function init(): void {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(150, 120, 150);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 20, 0);
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 40;
  controls.maxDistance = 450;

  cityGroup = buildCity(BUILDING_DATA);
  scene.add(cityGroup);
  buildingMeshes = getBuildingMeshes(cityGroup);

  shadowAnalyzer = new ShadowAnalyzer(scene, renderer);
  shadowAnalyzer.updateLight(45, 45);

  shadowAnalyzer.onParamsChange = (az: number, al: number) => {
    azimuthSlider.value = String(Math.round(az));
    altitudeSlider.value = String(Math.round(al));
    azimuthValue.textContent = `${Math.round(az)}°`;
    altitudeValue.textContent = `${Math.round(al)}°`;
  };

  shadowAnalyzer.onQualityChange = (q: ShadowQuality) => {
    currentQuality = q;
    updateQualityUI(q);
  };

  raycaster = new THREE.Raycaster();
  mouseNDC = new THREE.Vector2();

  clock = new THREE.Clock();

  bindEvents();
  updateQualityUI('high');
  animate();
}

function bindEvents(): void {
  window.addEventListener('resize', onWindowResize);

  azimuthSlider.addEventListener('input', () => {
    if (shadowAnalyzer.isAnimationRunning()) return;
    const az = parseFloat(azimuthSlider.value);
    shadowAnalyzer.updateLight(az, shadowAnalyzer.getAltitude());
  });

  altitudeSlider.addEventListener('input', () => {
    if (shadowAnalyzer.isAnimationRunning()) return;
    const al = parseFloat(altitudeSlider.value);
    shadowAnalyzer.updateLight(shadowAnalyzer.getAzimuth(), al);
  });

  animateBtn.addEventListener('click', () => {
    if (shadowAnalyzer.isAnimationRunning()) {
      shadowAnalyzer.stopAnimation();
      animateBtn.classList.remove('active');
      animateBtn.querySelector('span')!.textContent = '日照动画';
    } else {
      shadowAnalyzer.startAnimation();
      animateBtn.classList.add('active');
      animateBtn.querySelector('span')!.textContent = '停止动画';
    }
  });

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerleave', () => {
    tooltip.classList.add('hidden');
  });

  panelToggle.addEventListener('click', () => {
    controlPanel.classList.add('open');
  });
  panelClose.addEventListener('click', () => {
    controlPanel.classList.remove('open');
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObjects(buildingMeshes, false);

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    const id = mesh.userData.buildingId as number;
    const height = mesh.userData.buildingHeight as number;

    tooltipTitle.textContent = `建筑 #${id}`;
    tooltipHeight.textContent = String(height);

    const tooltipX = Math.min(event.clientX + 14, window.innerWidth - 170);
    const tooltipY = Math.max(event.clientY - 70, 10);
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    tooltip.classList.remove('hidden');
  } else {
    tooltip.classList.add('hidden');
  }
}

function updateQualityUI(quality: ShadowQuality): void {
  if (quality === 'high') {
    fpsQualityEl.textContent = '高精度';
    fpsQualityEl.classList.remove('low');
    qualityWarning.classList.add('hidden');
  } else {
    fpsQualityEl.textContent = '低精度';
    fpsQualityEl.classList.add('low');
    qualityWarning.classList.remove('hidden');
  }
}

function updateFPS(delta: number): void {
  const instantFPS = 1 / Math.max(delta, 0.0001);
  fpsFrames.push(instantFPS);
  if (fpsFrames.length > 30) fpsFrames.shift();

  const avgFPS = fpsFrames.reduce((a, b) => a + b, 0) / fpsFrames.length;
  const rounded = Math.round(avgFPS);
  fpsValueEl.textContent = String(rounded);

  fpsValueEl.classList.remove('warn', 'low');
  if (rounded < 25) {
    fpsValueEl.classList.add('low');
  } else if (rounded < 35) {
    fpsValueEl.classList.add('warn');
  }

  if (currentQuality === 'high') {
    if (rounded < 25) {
      lowFPSTime += delta;
      highFPSTime = 0;
      if (lowFPSTime >= 2) {
        shadowAnalyzer.setShadowQuality('low');
        lowFPSTime = 0;
      }
    } else {
      lowFPSTime = 0;
    }
  } else {
    if (rounded > 35) {
      highFPSTime += delta;
      lowFPSTime = 0;
      if (highFPSTime >= 5) {
        shadowAnalyzer.setShadowQuality('high');
        highFPSTime = 0;
      }
    } else {
      highFPSTime = 0;
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update();
  shadowAnalyzer.tick(delta);
  updateFPS(delta);

  renderer.render(scene, camera);
}

init();
