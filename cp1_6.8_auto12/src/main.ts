import * as THREE from 'three';
import Stats from 'stats.js';
import { buildRoadNetwork } from './roadNetwork';
import { TrafficManager } from './trafficManager';
import { TrafficLight } from './types';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let trafficManager: TrafficManager;
let stats: Stats;
let clock: THREE.Clock;
let trafficLights: TrafficLight[] = [];

let isDragging = false;
let previousMouseX = 0;
let cameraAngle = Math.PI / 4;
let cameraVelocity = 0;
const cameraDistance = 60;
const cameraHeight = 50;

let uiUpdateTimer = 0;
let fpsTimer = 0;
let fpsFrameCount = 0;
let currentFps = 0;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 150);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  setupLights();

  const roadNetwork = buildRoadNetwork(scene);
  trafficLights = roadNetwork.trafficLights;

  trafficManager = new TrafficManager(scene, trafficLights);

  stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '20px';
  stats.dom.style.right = '20px';
  stats.dom.style.display = 'none';
  container.appendChild(stats.dom);

  clock = new THREE.Clock();

  setupEventListeners();
  setupUI();

  animate();
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(30, 60, 30);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.camera.left = -60;
  directionalLight.shadow.camera.right = 60;
  directionalLight.shadow.camera.top = 60;
  directionalLight.shadow.camera.bottom = -60;
  scene.add(directionalLight);
}

function updateCameraPosition(): void {
  const x = Math.sin(cameraAngle) * cameraDistance;
  const z = Math.cos(cameraAngle) * cameraDistance;
  camera.position.set(x, cameraHeight, z);
  camera.lookAt(0, 0, 0);
}

function setupEventListeners(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', onWindowResize);

  container.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);

  container.addEventListener('click', onClick);
}

function onMouseDown(event: MouseEvent): void {
  if (event.button === 0) {
    isDragging = true;
    previousMouseX = event.clientX;
    cameraVelocity = 0;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (isDragging) {
    const deltaX = event.clientX - previousMouseX;
    cameraAngle -= deltaX * 0.005;
    cameraVelocity = -deltaX * 0.005;
    previousMouseX = event.clientX;
    updateCameraPosition();
  }
}

function onMouseUp(): void {
  isDragging = false;
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length === 1) {
    event.preventDefault();
    isDragging = true;
    previousMouseX = event.touches[0].clientX;
    cameraVelocity = 0;
  }
}

function onTouchMove(event: TouchEvent): void {
  if (isDragging && event.touches.length === 1) {
    event.preventDefault();
    const deltaX = event.touches[0].clientX - previousMouseX;
    cameraAngle -= deltaX * 0.005;
    cameraVelocity = -deltaX * 0.005;
    previousMouseX = event.touches[0].clientX;
    updateCameraPosition();
  }
}

function onTouchEnd(): void {
  isDragging = false;
}

function onWindowResize(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function onClick(event: MouseEvent): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const lightMeshes: THREE.Object3D[] = [];
  for (const light of trafficLights) {
    lightMeshes.push(light.mesh);
  }

  const intersects = raycaster.intersectObjects(lightMeshes, true);
  if (intersects.length > 0) {
    let object: THREE.Object3D | null = intersects[0].object;
    while (object && object.userData.lightId === undefined) {
      object = object.parent;
    }
    if (object && object.userData.lightId !== undefined) {
      trafficManager.toggleSignal(object.userData.lightId);
      updateUI();
    }
  }
}

function setupUI(): void {
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  if (btnToggleMode) {
    btnToggleMode.addEventListener('click', () => {
      trafficManager.toggleSignal();
      updateUI();
    });
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      trafficManager.reset();
      updateUI();
    });
  }

  const hamburger = document.getElementById('hamburger');
  const controlPanel = document.getElementById('control-panel');
  if (hamburger && controlPanel) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      controlPanel.classList.toggle('open');
    });
  }
}

function updateUI(): void {
  const vehicleCount = trafficManager.getVehicleCount();
  const avgWait = trafficManager.getAvgWaitTime();
  const isManual = trafficManager.isManualMode();
  const hState = trafficManager.getHorizontalLightState();
  const vState = trafficManager.getVerticalLightState();
  const congestion = trafficManager.getCongestionLevel();

  const vehicleCountEl = document.getElementById('vehicle-count');
  if (vehicleCountEl) vehicleCountEl.textContent = String(vehicleCount);

  const vehicleCountBottomEl = document.getElementById('vehicle-count-bottom');
  if (vehicleCountBottomEl) vehicleCountBottomEl.textContent = String(vehicleCount);

  const avgWaitEl = document.getElementById('avg-wait');
  if (avgWaitEl) avgWaitEl.textContent = avgWait.toFixed(1) + 's';

  const signalModeEl = document.getElementById('signal-mode');
  if (signalModeEl) signalModeEl.textContent = isManual ? '手动' : '自动';

  const btnToggleMode = document.getElementById('btn-toggle-mode');
  if (btnToggleMode) {
    btnToggleMode.textContent = isManual ? '切换自动模式' : '切换手动模式';
    btnToggleMode.classList.toggle('active', isManual);
  }

  const hSignalStateEl = document.getElementById('h-signal-state');
  if (hSignalStateEl) hSignalStateEl.textContent = getLightStateText(hState);

  const vSignalStateEl = document.getElementById('v-signal-state');
  if (vSignalStateEl) vSignalStateEl.textContent = getLightStateText(vState);

  const hSignalIndicator = document.getElementById('h-signal-indicator');
  if (hSignalIndicator) {
    hSignalIndicator.className = 'signal-indicator signal-' + hState;
  }

  const vSignalIndicator = document.getElementById('v-signal-indicator');
  if (vSignalIndicator) {
    vSignalIndicator.className = 'signal-indicator signal-' + vState;
  }

  const congestionBar = document.getElementById('congestion-bar');
  if (congestionBar) {
    congestionBar.style.width = (congestion * 100) + '%';
  }
}

function getLightStateText(state: string): string {
  switch (state) {
    case 'red': return '红灯';
    case 'yellow': return '黄灯';
    case 'green': return '绿灯';
    default: return state;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  stats.begin();

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  fpsFrameCount++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1) {
    currentFps = Math.round(fpsFrameCount / fpsTimer);
    fpsFrameCount = 0;
    fpsTimer = 0;
    const fpsValueEl = document.getElementById('fps-value');
    if (fpsValueEl) {
      fpsValueEl.textContent = String(currentFps);
    }
  }

  if (!isDragging && Math.abs(cameraVelocity) > 0.0001) {
    cameraAngle += cameraVelocity;
    cameraVelocity *= 0.95;
    updateCameraPosition();
  }

  trafficManager.update(deltaTime);

  uiUpdateTimer += deltaTime;
  if (uiUpdateTimer >= 1) {
    uiUpdateTimer = 0;
    updateUI();
  }

  renderer.render(scene, camera);

  stats.end();
}

window.addEventListener('DOMContentLoaded', init);
