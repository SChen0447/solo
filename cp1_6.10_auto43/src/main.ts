import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Simulation, SimulationConfig } from './Simulation';
import { UI, UIParams } from './UI';

const CONTAINER_W = 10;
const CONTAINER_H = 8;
const CONTAINER_D = 6;

const simConfig: SimulationConfig = {
  containerSize: { w: CONTAINER_W, h: CONTAINER_H, d: CONTAINER_D },
  particleCount: 10000,
  viscosity: 1.5,
  timeStep: 0.03,
  neighborRadius: 2,
  restitution: 0.8,
};

const initialUiParams: UIParams = {
  viscosity: simConfig.viscosity,
  particleCount: simConfig.particleCount,
  timeStep: simConfig.timeStep,
};

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let simulation: Simulation;
let ui: UI;
let directionArrows: THREE.Group;

let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 60;
let startTime = performance.now();
let isDragging = false;
let arrowFadeTarget = 0;
let arrowFadeCurrent = 0;

function init() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(15, 10, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 80;
  controls.update();

  controls.addEventListener('start', () => {
    isDragging = true;
    arrowFadeTarget = 1;
  });
  controls.addEventListener('end', () => {
    isDragging = false;
    arrowFadeTarget = 0;
  });

  const ambient = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambient);

  createContainerWireframe();
  createDirectionArrows();

  simulation = new Simulation(simConfig, scene);

  ui = new UI(
    document.body,
    initialUiParams,
    handleParamChange,
    handleShockwave,
  );

  window.addEventListener('resize', onResize);
}

function createContainerWireframe(): void {
  const geometry = new THREE.BoxGeometry(CONTAINER_W, CONTAINER_H, CONTAINER_D);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0x4a9eff,
    transparent: true,
    opacity: 0.6,
  });
  const wireframe = new THREE.LineSegments(edges, material);
  scene.add(wireframe);
}

function createDirectionArrows(): void {
  directionArrows = new THREE.Group();

  const dirs: Array<{ name: string; pos: THREE.Vector3; rot: THREE.Euler }> = [
    { name: 'N', pos: new THREE.Vector3(0, CONTAINER_H / 2 + 0.5, -CONTAINER_D / 2 - 0.8), rot: new THREE.Euler(0, 0, 0) },
    { name: 'S', pos: new THREE.Vector3(0, CONTAINER_H / 2 + 0.5, CONTAINER_D / 2 + 0.8), rot: new THREE.Euler(Math.PI, 0, 0) },
    { name: 'E', pos: new THREE.Vector3(CONTAINER_W / 2 + 0.8, CONTAINER_H / 2 + 0.5, 0), rot: new THREE.Euler(0, 0, -Math.PI / 2) },
    { name: 'W', pos: new THREE.Vector3(-CONTAINER_W / 2 - 0.8, CONTAINER_H / 2 + 0.5, 0), rot: new THREE.Euler(0, 0, Math.PI / 2) },
  ];

  for (const d of dirs) {
    const coneGeom = new THREE.ConeGeometry(0.25, 0.6, 8);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0,
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.copy(d.pos);
    cone.rotation.copy(d.rot);
    directionArrows.add(cone);
  }

  scene.add(directionArrows);
}

function updateArrowOpacity(dt: number): void {
  arrowFadeCurrent += (arrowFadeTarget - arrowFadeCurrent) * Math.min(1, dt * 6);
  directionArrows.children.forEach((child) => {
    const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.opacity = arrowFadeCurrent * 0.55;
  });
}

function handleParamChange(params: Partial<UIParams>): void {
  if (params.viscosity !== undefined) simulation.setViscosity(params.viscosity);
  if (params.timeStep !== undefined) simulation.setTimeStep(params.timeStep);
  if (params.particleCount !== undefined) simulation.setParticleCount(params.particleCount);
}

function handleShockwave(): void {
  simulation.injectShockwave(8);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const frameDt = (now - lastFpsTime) / 1000;

  frameCount++;
  if (now - lastFpsTime >= 500) {
    currentFps = (frameCount * 1000) / (now - lastFpsTime);
    frameCount = 0;
    lastFpsTime = now;
  }

  const simDt = Math.min(frameDt, 0.05);
  controls.update();
  simulation.update();
  updateArrowOpacity(simDt);

  const elapsed = (now - startTime) / 1000;
  ui.updateStats(
    currentFps,
    simulation.getParticleCount(),
    simulation.getAverageSpeed(),
    elapsed,
  );

  renderer.render(scene, camera);
}

init();
animate();
