import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SolarSystem } from './solarSystem';
import { GravitySimulation } from './gravitySim';
import { UI } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let solarSystem: SolarSystem;
let gravitySim: GravitySimulation;
let ui: UI;
let clock: THREE.Clock;

let cameraInfoEl: HTMLElement;
let planetLabelEl: HTMLElement;
let satelliteLabelEl: HTMLElement;
let canvas: HTMLCanvasElement;

let isDragging = false;
let isShiftDragging = false;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
const launchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function init(): void {
  canvas = document.getElementById('app') as HTMLCanvasElement;
  cameraInfoEl = document.getElementById('camera-info') as HTMLElement;
  planetLabelEl = document.getElementById('planet-label') as HTMLElement;
  satelliteLabelEl = document.getElementById('satellite-label') as HTMLElement;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 40, 80);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.2;
  controls.minDistance = 0.5;
  controls.maxDistance = 200;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.6;
  controls.panSpeed = 0.6;
  controls.screenSpacePanning = true;

  solarSystem = new SolarSystem(scene, camera);
  gravitySim = new GravitySimulation(scene, camera);
  ui = new UI(solarSystem, gravitySim);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  clock = new THREE.Clock();

  setupEventListeners();
  animate();
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getMouseWorldPosition(clientX: number, clientY: number): THREE.Vector3 | null {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersectPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(launchPlane, intersectPoint)) {
    return intersectPoint;
  }
  return null;
}

function onMouseDown(e: MouseEvent): void {
  if (e.shiftKey && e.button === 0) {
    isShiftDragging = true;
    controls.enabled = false;

    const worldPos = getMouseWorldPosition(e.clientX, e.clientY);
    if (worldPos) {
      gravitySim.startAim(worldPos);
    }
    return;
  }

  if (e.button === 0) {
    isDragging = true;
  }
}

function onMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();

  if (isShiftDragging) {
    const worldPos = getMouseWorldPosition(e.clientX, e.clientY);
    if (worldPos) {
      gravitySim.updateAim(worldPos);
    }
    return;
  }

  const hoveredPlanet = solarSystem.checkHover(e.clientX, e.clientY, rect);
  if (hoveredPlanet) {
    const screenPos = solarSystem.getHoveredPlanetScreenPosition();
    if (screenPos) {
      ui.showPlanetLabel(planetLabelEl, hoveredPlanet, screenPos.x, screenPos.y);
      canvas.style.cursor = 'pointer';
    }
  } else {
    ui.hidePlanetLabel(planetLabelEl);
    canvas.style.cursor = isShiftDragging ? 'crosshair' : 'grab';
  }
}

function onMouseUp(e: MouseEvent): void {
  if (isShiftDragging) {
    isShiftDragging = false;
    controls.enabled = true;
    gravitySim.launchSatellite();
    return;
  }

  if (e.button === 0) {
    isDragging = false;
  }
}

function getZoomLevel(): number {
  const baseDistance = 50;
  const currentDistance = camera.position.length();
  return baseDistance / currentDistance;
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.getElapsedTime();

  controls.update();

  solarSystem.update(deltaTime, elapsedTime);

  const planetPositions = solarSystem.getPlanetPositions();
  gravitySim.update(deltaTime, planetPositions);

  ui.updateCameraInfo(
    cameraInfoEl,
    { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    getZoomLevel()
  );

  const satScreenPos = gravitySim.getSatelliteScreenPosition();
  if (satScreenPos) {
    const deflection = gravitySim.getDeflectionAngle();
    const inField = gravitySim.isInGravityField();
    ui.showSatelliteLabel(satelliteLabelEl, deflection, inField, satScreenPos.x, satScreenPos.y);
  } else {
    ui.hideSatelliteLabel(satelliteLabelEl);
  }

  renderer.render(scene, camera);
}

init();
