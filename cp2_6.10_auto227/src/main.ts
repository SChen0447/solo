import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { StratumMesh, ArtifactMesh, ControlParams } from './types';
import { generateStrata } from './dataGenerator';
import {
  createStrata,
  updateStrataForDepth,
  updateStrataForSliceMode,
  getTotalHeight,
  TERRAIN_SIZE
} from './terrain';
import {
  createArtifacts,
  updateArtifactsVisibility,
  updateArtifactsForSliceMode,
  showArtifactCard,
  hideArtifactCard,
  getArtifactByMesh
} from './artifactLayer';
import { createControlPanel, PanelCallbacks } from './controlPanel';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let labelRenderer: CSS2DRenderer;
let controls: OrbitControls;
let minimapCamera: THREE.OrthographicCamera;
let minimapRenderer: THREE.WebGLRenderer;

let strata: StratumMesh[] = [];
let artifacts: ArtifactMesh[] = [];
let totalHeight = 0;
let currentParams: ControlParams;

let sliceRing: THREE.Mesh;
let isDraggingSlice = false;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let isAutoTouring = false;
let autoTourStartTime = 0;
const AUTO_TOUR_PERIOD = 20000;

const TIMELINE_CAPTIONS = [
  { text: '公元前6000年 - 新石器时代', time: 0 },
  { text: '公元前3000年 - 青铜时代早期', time: 0.1 },
  { text: '公元前1600年 - 青铜时代晚期', time: 0.2 },
  { text: '公元前10世纪 - 伊特鲁里亚文明', time: 0.3 },
  { text: '公元前8世纪 - 希腊化时期', time: 0.4 },
  { text: '公元前5世纪 - 萨谟奈人统治', time: 0.5 },
  { text: '公元前3世纪 - 罗马殖民时代', time: 0.6 },
  { text: '公元前1世纪 - 庞贝繁荣期', time: 0.75 },
  { text: '公元79年 - 维苏威火山喷发', time: 0.9 },
  { text: '庞贝古城被火山灰永久掩埋...', time: 1.0 }
];

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(250, 250, 250);
const DEFAULT_TARGET = new THREE.Vector3(0, 150, 0);

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f0e8);
  scene.fog = new THREE.Fog(0xf5f0e8, 500, 1200);

  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    5000
  );
  camera.position.copy(DEFAULT_CAMERA_POSITION);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  (labelRenderer.domElement as HTMLElement).style.position = 'absolute';
  (labelRenderer.domElement as HTMLElement).style.top = '0';
  (labelRenderer.domElement as HTMLElement).style.left = '0';
  (labelRenderer.domElement as HTMLElement).style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(DEFAULT_TARGET);
  controls.minDistance = 80;
  controls.maxDistance = 800;
  controls.maxPolarAngle = Math.PI / 2 + 0.1;

  setupLights();
  setupGroundGrid();

  const stratumConfigs = generateStrata(8);
  strata = createStrata(scene, stratumConfigs, (createdStrata) => {
    artifacts = createArtifacts(scene, labelRenderer, createdStrata);
    totalHeight = getTotalHeight(createdStrata);
    setupMinimap();
    setupSliceRing();
  });

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  const callbacks: PanelCallbacks = {
    onParamsChange: handleParamsChange,
    onResetView: resetView,
    onAutoTour: toggleAutoTour
  };

  const { params } = createControlPanel('tweakpane-container', strata, callbacks);
  currentParams = params;

  setupEventListeners(container);
  handleParamsChange(currentParams);

  animate();
}

function setupLights(): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
  dirLight.position.set(150, 400, 200);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 1000;
  dirLight.shadow.camera.left = -300;
  dirLight.shadow.camera.right = 300;
  dirLight.shadow.camera.top = 300;
  dirLight.shadow.camera.bottom = -300;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xe8d5a8, 0.3);
  fillLight.position.set(-200, 100, -150);
  scene.add(fillLight);
}

function setupGroundGrid(): void {
  const gridHelper = new THREE.GridHelper(TERRAIN_SIZE + 100, 40, 0x8b6f47, 0xc4a882);
  gridHelper.position.y = -1;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(TERRAIN_SIZE + 200, TERRAIN_SIZE + 200);
  const groundMat = new THREE.MeshPhongMaterial({
    color: 0xd4c4a8,
    transparent: true,
    opacity: 0.5
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function setupMinimap(): void {
  const frustumSize = TERRAIN_SIZE + 80;
  minimapCamera = new THREE.OrthographicCamera(
    frustumSize / -2,
    frustumSize / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    2000
  );
  minimapCamera.position.set(0, totalHeight + 300, 0.01);
  minimapCamera.lookAt(0, 0, 0);

  const minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
  minimapRenderer = new THREE.WebGLRenderer({
    canvas: minimapCanvas,
    antialias: true
  });
  minimapRenderer.setSize(150, 150);
  minimapRenderer.setPixelRatio(window.devicePixelRatio);
}

function setupSliceRing(): void {
  const ringGeo = new THREE.RingGeometry(29.5, 30.5, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4c542,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  sliceRing = new THREE.Mesh(ringGeo, ringMat);
  sliceRing.rotation.x = -Math.PI / 2;
  sliceRing.position.y = totalHeight / 2;
  sliceRing.visible = false;
  scene.add(sliceRing);
}

function handleParamsChange(params: ControlParams): void {
  currentParams = params;
  updateStrataForDepth(strata, params, totalHeight);
  updateStrataForSliceMode(strata, params);
  updateArtifactsVisibility(artifacts, strata, params, totalHeight);
  updateArtifactsForSliceMode(artifacts, params);

  if (sliceRing) {
    sliceRing.visible = params.sliceMode;
    sliceRing.position.z = params.sliceZ;
    (sliceRing.material as THREE.MeshBasicMaterial).opacity = params.sliceMode ? 1 : 0;
  }
}

function resetView(): void {
  isAutoTouring = false;
  hideTimelineCaption();
  controls.enabled = true;
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  controls.target.copy(DEFAULT_TARGET);
  controls.update();
}

function toggleAutoTour(): void {
  isAutoTouring = !isAutoTouring;
  autoTourStartTime = performance.now();
  controls.enabled = !isAutoTouring;

  if (isAutoTouring) {
    showTimelineCaption(TIMELINE_CAPTIONS[0].text);
  } else {
    hideTimelineCaption();
  }
}

function updateAutoTour(time: number): void {
  if (!isAutoTouring) return;

  const elapsed = time - autoTourStartTime;
  const t = (elapsed % AUTO_TOUR_PERIOD) / AUTO_TOUR_PERIOD;
  const angle = t * Math.PI * 2;

  const radius = 350;
  const height = 180 + Math.sin(t * Math.PI) * 120;

  camera.position.x = Math.cos(angle) * radius;
  camera.position.z = Math.sin(angle) * radius;
  camera.position.y = height;

  const lookTarget = new THREE.Vector3(0, totalHeight / 2, 0);
  camera.lookAt(lookTarget);
  controls.target.copy(lookTarget);

  for (let i = 0; i < strata.length; i++) {
    const mat = strata[i].mesh.material as THREE.MeshPhongMaterial;
    const wave = Math.sin(t * Math.PI * 2 - i * 0.4) * 0.5 + 0.5;
    mat.opacity = 0.15 + wave * 0.45;
  }

  const captionIndex = Math.min(
    TIMELINE_CAPTIONS.length - 1,
    Math.floor(t * TIMELINE_CAPTIONS.length)
  );
  showTimelineCaption(TIMELINE_CAPTIONS[captionIndex].text);
}

function showTimelineCaption(text: string): void {
  const caption = document.getElementById('timeline-caption');
  if (caption) {
    if (caption.textContent !== text) {
      caption.classList.remove('visible');
      setTimeout(() => {
        caption.textContent = text;
        caption.classList.add('visible');
      }, 800);
    } else {
      caption.classList.add('visible');
    }
  }
}

function hideTimelineCaption(): void {
  const caption = document.getElementById('timeline-caption');
  if (caption) {
    caption.classList.remove('visible');
  }
}

function setupEventListeners(container: HTMLElement): void {
  window.addEventListener('resize', onWindowResize);

  container.addEventListener('click', onMouseClick);
  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function onWindowResize(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}

function onMouseClick(event: MouseEvent): void {
  if (isDraggingSlice) return;

  const container = document.getElementById('scene-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const artifactMeshes = artifacts.map(a => a.mesh);
  const intersects = raycaster.intersectObjects(artifactMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const artifact = getArtifactByMesh(hit, artifacts);
    if (artifact) {
      showArtifactCard(artifact, event.clientX, event.clientY);
    }
  } else {
    hideArtifactCard();
  }
}

function onMouseDown(event: MouseEvent): void {
  if (!currentParams.sliceMode) return;
  if (event.button !== 0) return;

  const container = document.getElementById('scene-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sliceRing, false);

  if (intersects.length > 0) {
    isDraggingSlice = true;
    controls.enabled = false;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (!isDraggingSlice) return;

  const container = document.getElementById('scene-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -sliceRing.position.y);
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);

  if (intersectPoint) {
    const newZ = Math.max(-100, Math.min(100, intersectPoint.z));
    currentParams.sliceZ = newZ;
    handleParamsChange(currentParams);
  }
}

function onMouseUp(): void {
  if (isDraggingSlice) {
    isDraggingSlice = false;
    if (!isAutoTouring) {
      controls.enabled = true;
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const time = performance.now();

  if (isAutoTouring) {
    updateAutoTour(time);
  } else {
    controls.update();
  }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  if (minimapRenderer && minimapCamera) {
    minimapRenderer.render(scene, minimapCamera);
  }
}

document.addEventListener('DOMContentLoaded', init);
