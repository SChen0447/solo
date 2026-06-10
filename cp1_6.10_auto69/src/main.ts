import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createVessel, VesselData } from './vessel';
import { createParticleSystem, ParticleSystem } from './particles';
import { initUI, updatePerformanceStats, getUIState, PerformanceStats } from './ui';
import { showInfoPanel, hideInfoPanel, generateAneurysmData } from './infoPanel';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let vesselData: VesselData;
let particleSystem: ParticleSystem;
let clock: THREE.Clock;

let animationId: number | null = null;
let isPlaying = true;
let speedMultiplier = 1.0;
let showTrails = false;

const INITIAL_CAMERA_POS = new THREE.Vector3(10.6, 10.6, 10.6);
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0);

let cameraAnimating = false;
let cameraAnimStart = 0;
let cameraAnimDuration = 0.8;
let cameraAnimFromPos = new THREE.Vector3();
let cameraAnimFromTarget = new THREE.Vector3();
let cameraAnimToPos = new THREE.Vector3();
let cameraAnimToTarget = new THREE.Vector3();

const perfStats: PerformanceStats = {
  fps: 60,
  particleCount: 5000,
  renderTime: 0,
};
let lastPerfUpdate = 0;
let frameCount = 0;
let fpsAccumulator = 0;
let renderTimeAccumulator = 0;

init();
animate();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.Fog(0x0d1117, 30, 60);

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(INITIAL_CAMERA_POS);
  camera.lookAt(INITIAL_TARGET);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.copy(INITIAL_TARGET);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(5, 10, 7);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x58a6ff, 0.3);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);

  const pointLight = new THREE.PointLight(0xff6b6b, 0.5, 20);
  pointLight.position.set(0, -1, 0);
  scene.add(pointLight);

  vesselData = createVessel();
  scene.add(vesselData.group);

  particleSystem = createParticleSystem(vesselData);
  scene.add(particleSystem.points);
  if (particleSystem.trailPoints) {
    scene.add(particleSystem.trailPoints);
  }

  clock = new THREE.Clock();

  const uiState = initUI({
    onPlayPause: () => {
      isPlaying = !isPlaying;
    },
    onSpeedChange: (speed: number) => {
      speedMultiplier = speed;
    },
    onTrailsToggle: (show: boolean) => {
      showTrails = show;
    },
    onResetView: () => {
      animateCameraTo(INITIAL_CAMERA_POS.clone(), INITIAL_TARGET.clone(), 0.8);
    },
    onResetSimulation: () => {
      particleSystem.reset();
      hideInfoPanel(true);
    },
  });

  isPlaying = uiState.isPlaying;
  speedMultiplier = uiState.speedMultiplier;
  showTrails = uiState.showTrails;

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('touchend', onCanvasTouch);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCanvasTouch(e: TouchEvent): void {
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    handleIntersection(touch.clientX, touch.clientY);
  }
}

function onCanvasClick(e: MouseEvent): void {
  handleIntersection(e.clientX, e.clientY);
}

function handleIntersection(clientX: number, clientY: number): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const aneurysm = scene.getObjectByName('aneurysm');
  const highlight = scene.getObjectByName('aneurysmHighlight');

  const intersects = raycaster.intersectObjects(
    [aneurysm, highlight].filter((o): o is THREE.Object3D => !!o),
    true
  );

  if (intersects.length > 0) {
    const info = generateAneurysmData();
    showInfoPanel(clientX, clientY, info);
  } else {
    hideInfoPanel();
  }
}

function animateCameraTo(toPos: THREE.Vector3, toTarget: THREE.Vector3, duration: number): void {
  cameraAnimating = true;
  cameraAnimStart = performance.now();
  cameraAnimDuration = duration;
  cameraAnimFromPos.copy(camera.position);
  cameraAnimFromTarget.copy(controls.target);
  cameraAnimToPos.copy(toPos);
  cameraAnimToTarget.copy(toTarget);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function updateCameraAnimation(now: number): void {
  if (!cameraAnimating) return;

  const elapsed = (now - cameraAnimStart) / 1000;
  const t = Math.min(1, elapsed / cameraAnimDuration);
  const eased = easeInOut(t);

  camera.position.lerpVectors(cameraAnimFromPos, cameraAnimToPos, eased);
  controls.target.lerpVectors(cameraAnimFromTarget, cameraAnimToTarget, eased);
  controls.update();

  if (t >= 1) {
    cameraAnimating = false;
  }
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min(clock.getDelta(), 0.05);
  const renderStart = performance.now();

  updateCameraAnimation(now);

  if (isPlaying && !cameraAnimating) {
    particleSystem.update(delta, speedMultiplier, showTrails);
  }

  if (!cameraAnimating) {
    controls.update();
  }

  renderer.render(scene, camera);

  const renderEnd = performance.now();
  const thisRenderTime = renderEnd - renderStart;

  frameCount++;
  fpsAccumulator += 1 / Math.max(delta, 0.001);
  renderTimeAccumulator += thisRenderTime;

  if (now - lastPerfUpdate > 500) {
    perfStats.fps = fpsAccumulator / frameCount;
    perfStats.particleCount = particleSystem.getActiveCount();
    perfStats.renderTime = renderTimeAccumulator / frameCount;
    updatePerformanceStats(perfStats);

    frameCount = 0;
    fpsAccumulator = 0;
    renderTimeAccumulator = 0;
    lastPerfUpdate = now;
  }
}
