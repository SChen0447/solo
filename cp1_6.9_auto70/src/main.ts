import * as THREE from 'three';
import { IslandManager } from './island';
import { WindManager } from './wind';
import { CloudManager } from './clouds';
import { GUIManager } from './gui';

const appContainer = document.getElementById('app');
if (!appContainer) {
  throw new Error('App container #app not found');
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
appContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d')!;
const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
skyGradient.addColorStop(0, '#0a3d62');
skyGradient.addColorStop(1, '#f8a5c2');
skyCtx.fillStyle = skyGradient;
skyCtx.fillRect(0, 0, 2, 512);
const skyTex = new THREE.CanvasTexture(skyCanvas);
scene.background = skyTex;
scene.fog = new THREE.Fog(0xf8a5c2, 30, 60);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

let cameraAngle = 0;
let cameraHeight = 3;
let cameraDistance = 15;

function updateCameraPosition(): void {
  camera.position.x = Math.sin(cameraAngle) * cameraDistance;
  camera.position.z = Math.cos(cameraAngle) * cameraDistance;
  camera.position.y = cameraHeight;
  camera.lookAt(0, 0, 0);
}
updateCameraPosition();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
sunLight.position.set(10, 20, 10);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xa0c4ff, 0.4);
fillLight.position.set(-10, 5, -10);
scene.add(fillLight);

const islandManager = new IslandManager();
islandManager.createIslands(4);
scene.add(islandManager.group);

const windManager = new WindManager();
scene.add(windManager.group);

const cloudManager = new CloudManager();
cloudManager.createClouds(40);
scene.add(cloudManager.group);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh: THREE.Mesh | null = null;

const gui = new GUIManager({
  onWindChange: (value: number) => {
    islandManager.windStrength = value;
  },
  onColorChange: (color: THREE.Color) => {
    islandManager.hueShift = color;
  },
  onReset: () => {
    islandManager.resetChimes();
  }
});

let isDraggingCamera = false;
let isDraggingWind = false;
let lastMouseX = 0;
let lastMouseY = 0;
let windStartPos: THREE.Vector3 | null = null;
let windStartTime = 0;

function getPlaneIntersection(clientX: number, clientY: number, planeY: number = 0): THREE.Vector3 | null {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  return intersectPoint;
}

function onPointerDown(e: PointerEvent): void {
  islandManager.initAudio();
  windManager.initAudio();

  if (e.button === 2 || e.shiftKey) {
    isDraggingCamera = true;
  } else if (e.button === 0) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(islandManager.interactiveMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      islandManager.handleClick(mesh);
    } else {
      isDraggingWind = true;
      windStartTime = performance.now();
      windStartPos = getPlaneIntersection(e.clientX, e.clientY);
    }
  }

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onPointerMove(e: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDraggingCamera) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraAngle -= dx * 0.005;
    cameraHeight = Math.max(-5, Math.min(15, cameraHeight + dy * 0.02));
    updateCameraPosition();
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else if (isDraggingWind) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(islandManager.interactiveMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (hoveredMesh !== mesh) {
        if (hoveredMesh) islandManager.handleHover(hoveredMesh, false);
        hoveredMesh = mesh;
        islandManager.handleHover(hoveredMesh, true);
        renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (hoveredMesh) {
        islandManager.handleHover(hoveredMesh, false);
        hoveredMesh = null;
      }
      renderer.domElement.style.cursor = 'grab';
    }
  }
}

function onPointerUp(e: PointerEvent): void {
  if (isDraggingWind && windStartPos) {
    const elapsed = (performance.now() - windStartTime) / 1000;
    const strength = Math.min(2, Math.max(0.3, elapsed * 3 + 0.5));
    const endPos = getPlaneIntersection(e.clientX, e.clientY);
    if (endPos) {
      const force = windManager.createWindStream(windStartPos, endPos, strength);
      islandManager.applyWind(force);
    }
  }

  isDraggingCamera = false;
  isDraggingWind = false;
  windStartPos = null;
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  cameraDistance = Math.max(5, Math.min(30, cameraDistance + e.deltaY * 0.01));
  updateCameraPosition();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key.toLowerCase() === 'r') {
    islandManager.resetChimes();
  }
}

function onContextMenu(e: Event): void {
  e.preventDefault();
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
window.addEventListener('keydown', onKeyDown);
renderer.domElement.addEventListener('contextmenu', onContextMenu);
window.addEventListener('resize', onResize);

let lastTime = performance.now();
let fpsAccumulator = 0;
let fpsFrameCount = 0;
let lastStatsLog = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  const time = now / 1000;
  lastTime = now;

  fpsAccumulator += delta;
  fpsFrameCount++;

  if (now - lastStatsLog >= 1000) {
    const fps = Math.round(fpsFrameCount / fpsAccumulator);
    console.log(`[Stats] FPS: ${fps} | Islands: ${islandManager.islands.length} | Particles: ${windManager.particles.length}`);
    fpsAccumulator = 0;
    fpsFrameCount = 0;
    lastStatsLog = now;
  }

  if (isDraggingWind && windStartPos) {
    const dx = lastMouseX - (windStartPos as any).x * 100;
    const dy = lastMouseY;
    if (Math.abs(dx) > 50) {
      const endPos = getPlaneIntersection(lastMouseX, lastMouseY);
      if (endPos) {
        const force = windManager.createWindStream(windStartPos, endPos, 1.0);
        islandManager.applyWind(force);
        windStartPos = endPos.clone();
      }
    }
  }

  cloudManager.update(time, delta);
  windManager.update(delta);
  islandManager.update(time, delta);

  for (const island of islandManager.islands) {
    const windForce = windManager.getWindForce(island.position);
    if (windForce.length() > 0.01) {
      islandManager.applyWind(windForce.multiplyScalar(delta * 10));
    }
  }

  renderer.render(scene, camera);
}

animate();
