import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Plant } from './plant';
import { ConnectionManager } from './connection';

const MAX_PLANTS = 40;
const GRID_ROTATION_SPEED = 0.002;
const GRID_SIZE = 40;
const GRID_DIVISIONS = 20;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let controls: OrbitControls;
let gridHelper: THREE.GridHelper;
let connectionManager: ConnectionManager;

const plants: Plant[] = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let isDragging = false;
let draggedPlant: Plant | null = null;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragOffset = new THREE.Vector3();

let plantCountEl: HTMLElement;
let connectionCountEl: HTMLElement;
let sowBtnEl: HTMLElement;
let hintEl: HTMLElement;

const clock = new THREE.Clock();

function init(): void {
  plantCountEl = document.getElementById('plantCount') as HTMLElement;
  connectionCountEl = document.getElementById('connectionCount') as HTMLElement;
  sowBtnEl = document.getElementById('sowBtn') as HTMLElement;
  hintEl = document.getElementById('hint') as HTMLElement;

  initScene();
  initRenderer();
  initCamera();
  initControls();
  initBackground();
  initGrid();
  initPostProcessing();
  initLights();

  connectionManager = new ConnectionManager(scene);
  bindEvents();

  animate();
}

function initScene(): void {
  scene = new THREE.Scene();
}

function initRenderer(): void {
  const canvasContainer = document.getElementById('app') as HTMLElement;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  canvasContainer.appendChild(renderer.domElement);
}

function initCamera(): void {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5, 4, 5);
  camera.lookAt(0, 0, 0);
}

function initControls(): void {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.target.set(0, 0, 0);
  controls.mouseButtons = {
    LEFT: null as unknown as THREE.MOUSE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };
}

function initBackground(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(1, '#1a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const bgGeom = new THREE.SphereGeometry(50, 32, 32);
  const bgMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false
  });
  const bgMesh = new THREE.Mesh(bgGeom, bgMat);
  scene.add(bgMesh);
}

function initGrid(): void {
  const gridColor = new THREE.Color(0x334466);
  gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, gridColor, gridColor);
  gridHelper.position.y = 0;

  const mat = gridHelper.material as THREE.LineBasicMaterial;
  mat.transparent = true;
  mat.opacity = 0.5;

  scene.add(gridHelper);
}

function initPostProcessing(): void {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,
    0.6,
    0.85
  );
  composer.addPass(bloomPass);
}

function initLights(): void {
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);
}

function bindEvents(): void {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  sowBtnEl.addEventListener('click', onSowButtonClick);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function updateMouse(clientX: number, clientY: number): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function intersectGround(): THREE.Vector3 | null {
  raycaster.setFromCamera(mouse, camera);
  const intersect = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, intersect)) {
    return intersect;
  }
  return null;
}

function findPlantAtPointer(): Plant | null {
  raycaster.setFromCamera(mouse, camera);
  const allMeshes: THREE.Object3D[] = [];
  plants.forEach((p) => allMeshes.push(p.group));
  const hits = raycaster.intersectObjects(allMeshes, true);
  if (hits.length > 0) {
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      for (const plant of plants) {
        if (plant.group === obj) {
          return plant;
        }
      }
      obj = obj.parent;
    }
  }
  return null;
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  updateMouse(e.clientX, e.clientY);

  const plant = findPlantAtPointer();
  if (plant) {
    isDragging = true;
    draggedPlant = plant;
    controls.enabled = false;

    const worldPos = plant.group.position.clone();
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), worldPos);
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, hit)) {
      dragOffset.copy(worldPos).sub(hit);
    }
    return;
  }

  const groundHit = intersectGround();
  if (groundHit) {
    sowAt(groundHit);
  }
}

function onPointerMove(e: PointerEvent): void {
  updateMouse(e.clientX, e.clientY);

  if (isDragging && draggedPlant) {
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, hit)) {
      const target = hit.add(dragOffset);
      target.y = draggedPlant.group.position.y;
      draggedPlant.group.position.copy(target);
      draggedPlant.position.copy(target);
      draggedPlant.targetPosition.copy(target);
    }
  }
}

function onPointerUp(_e: PointerEvent): void {
  if (isDragging && draggedPlant) {
    draggedPlant.isMoving = false;
  }
  isDragging = false;
  draggedPlant = null;
  controls.enabled = true;
}

function onSowButtonClick(): void {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1 + Math.random() * 2;
  const pos = new THREE.Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  );
  sowAt(pos);
}

function sowAt(position: THREE.Vector3): void {
  if (plants.length >= MAX_PLANTS) return;

  const clamped = new THREE.Vector3(
    Math.max(-GRID_SIZE / 2 + 1, Math.min(GRID_SIZE / 2 - 1, position.x)),
    0,
    Math.max(-GRID_SIZE / 2 + 1, Math.min(GRID_SIZE / 2 - 1, position.z))
  );

  const plant = new Plant(clamped);
  plants.push(plant);
  scene.add(plant.group);

  updateUI();
  hideHint();
}

function updateUI(): void {
  plantCountEl.textContent = `${plants.length}`;
  connectionCountEl.textContent = `${connectionManager.getConnectionCount()}`;
}

function hideHint(): void {
  if (plants.length > 0 && !hintEl.classList.contains('hidden')) {
    hintEl.classList.add('hidden');
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  gridHelper.rotation.y += GRID_ROTATION_SPEED;

  plants.forEach((plant) => plant.update(delta));
  connectionManager.updateConnections(plants);
  connectionManager.update(delta);

  controls.update();
  composer.render();

  updateUI();
}

init();
