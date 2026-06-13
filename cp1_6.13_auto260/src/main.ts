import * as THREE from 'three';
import gsap from 'gsap';
import { RibbonManager } from './RibbonManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let ribbonManager: RibbonManager;
let animationId: number;
let startTime: number;

const cameraState = {
  radius: 8,
  targetRadius: 8,
  theta: Math.PI / 2,
  targetTheta: Math.PI / 2,
  phi: Math.PI / 4,
  targetPhi: Math.PI / 4
};

const mouseState = {
  x: 0,
  y: 0,
  normalizedX: 0,
  normalizedY: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  wheelScrollCount: 0,
  lastWheelTime: 0,
  wheelSpeedAccumulator: 0
};

const frameMonitor = {
  lastFrameTime: 0,
  frameTimes: [] as number[],
  adaptiveSegments: 64,
  segmentUpdateTimer: 0
};

const cameraTarget = new THREE.Vector3(0, 0, 0);
const mouseTargetVec = new THREE.Vector3(0, 0, 0);

const MIN_RADIUS = 4;
const MAX_RADIUS = 20;
const MIN_PHI = (10 * Math.PI) / 180;
const MAX_PHI = (80 * Math.PI) / 180;
const ORBIT_SENSITIVITY = 0.005;
const WHEEL_ZOOM_STEP = 1;
const ZOOM_DURATION = 0.6;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  const width = window.innerWidth;
  const height = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = createGradientTexture();

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  ribbonManager = new RibbonManager(scene);

  bindEvents();

  startTime = performance.now();
  frameMonitor.lastFrameTime = startTime;

  animate();
}

function createGradientTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0b0e14');
  gradient.addColorStop(1, '#1a0b2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function updateCameraPosition(): void {
  const r = cameraState.radius;
  const theta = cameraState.theta;
  const phi = cameraState.phi;

  camera.position.x = cameraTarget.x + r * Math.sin(phi) * Math.cos(theta);
  camera.position.y = cameraTarget.y + r * Math.cos(phi);
  camera.position.z = cameraTarget.z + r * Math.sin(phi) * Math.sin(theta);
  camera.lookAt(cameraTarget);
}

function bindEvents(): void {
  const dom = renderer.domElement;

  dom.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  dom.addEventListener('click', onMouseClick);
  dom.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);

  dom.addEventListener('touchstart', onTouchStart, { passive: false });
  dom.addEventListener('touchmove', onTouchMove, { passive: false });
  dom.addEventListener('touchend', onTouchEnd);
}

function onMouseDown(e: MouseEvent): void {
  mouseState.isDragging = true;
  mouseState.lastX = e.clientX;
  mouseState.lastY = e.clientY;
}

function onMouseMove(e: MouseEvent): void {
  mouseState.x = e.clientX;
  mouseState.y = e.clientY;
  mouseState.normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseState.normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;

  if (mouseState.isDragging) {
    const dx = e.clientX - mouseState.lastX;
    const dy = e.clientY - mouseState.lastY;

    cameraState.targetTheta -= dx * ORBIT_SENSITIVITY;
    cameraState.targetPhi += dy * ORBIT_SENSITIVITY;
    cameraState.targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, cameraState.targetPhi));

    mouseState.lastX = e.clientX;
    mouseState.lastY = e.clientY;
  }
}

function onMouseUp(): void {
  mouseState.isDragging = false;
}

function onMouseClick(e: MouseEvent): void {
  ribbonManager.triggerPulse();
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();

  const now = performance.now();
  const timeSinceLastWheel = now - mouseState.lastWheelTime;
  mouseState.lastWheelTime = now;

  if (timeSinceLastWheel < 300) {
    mouseState.wheelScrollCount++;
    mouseState.wheelSpeedAccumulator += Math.abs(e.deltaY);
  } else {
    mouseState.wheelScrollCount = 1;
    mouseState.wheelSpeedAccumulator = Math.abs(e.deltaY);
  }

  const direction = e.deltaY > 0 ? 1 : -1;
  const newRadius = cameraState.targetRadius + direction * WHEEL_ZOOM_STEP;
  cameraState.targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, newRadius));

  gsap.to(cameraState, {
    radius: cameraState.targetRadius,
    duration: ZOOM_DURATION,
    ease: 'power2.out'
  });

  if (mouseState.wheelScrollCount > 3) {
    const speedFactor = Math.min(mouseState.wheelSpeedAccumulator / 600, 1);
    const windSpeed = 0.2 + speedFactor * 0.6;
    ribbonManager.setWindSpeed(windSpeed);
  }

  clearTimeout((onWheel as any)._resetTimer);
  (onWheel as any)._resetTimer = setTimeout(() => {
    mouseState.wheelScrollCount = 0;
    mouseState.wheelSpeedAccumulator = 0;
    ribbonManager.setWindSpeed(0);
  }, 1000);
}

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    e.preventDefault();
    mouseState.isDragging = true;
    mouseState.lastX = e.touches[0].clientX;
    mouseState.lastY = e.touches[0].clientY;
  }
}

function onTouchMove(e: TouchEvent): void {
  if (e.touches.length === 1 && mouseState.isDragging) {
    e.preventDefault();
    const t = e.touches[0];
    mouseState.normalizedX = (t.clientX / window.innerWidth) * 2 - 1;
    mouseState.normalizedY = -(t.clientY / window.innerHeight) * 2 + 1;

    const dx = t.clientX - mouseState.lastX;
    const dy = t.clientY - mouseState.lastY;

    cameraState.targetTheta -= dx * ORBIT_SENSITIVITY;
    cameraState.targetPhi += dy * ORBIT_SENSITIVITY;
    cameraState.targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, cameraState.targetPhi));

    mouseState.lastX = t.clientX;
    mouseState.lastY = t.clientY;
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (e.touches.length === 0) {
    mouseState.isDragging = false;
  }
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const now = performance.now();
  const frameTime = now - frameMonitor.lastFrameTime;
  frameMonitor.lastFrameTime = now;

  frameMonitor.frameTimes.push(frameTime);
  if (frameMonitor.frameTimes.length > 30) {
    frameMonitor.frameTimes.shift();
  }

  frameMonitor.segmentUpdateTimer += frameTime;
  if (frameMonitor.segmentUpdateTimer > 500) {
    frameMonitor.segmentUpdateTimer = 0;
    const avgFrameTime = frameMonitor.frameTimes.reduce((a, b) => a + b, 0) / frameMonitor.frameTimes.length;
    if (avgFrameTime > 17 && frameMonitor.adaptiveSegments > 16) {
      frameMonitor.adaptiveSegments = Math.max(16, frameMonitor.adaptiveSegments - 8);
      ribbonManager.dynamicTubularSegments = frameMonitor.adaptiveSegments;
    } else if (avgFrameTime < 14 && frameMonitor.adaptiveSegments < 64) {
      frameMonitor.adaptiveSegments = Math.min(64, frameMonitor.adaptiveSegments + 8);
      ribbonManager.dynamicTubularSegments = frameMonitor.adaptiveSegments;
    }
  }

  const time = (now - startTime) / 1000;

  const lerpFactor = 0.08;
  cameraState.theta += (cameraState.targetTheta - cameraState.theta) * lerpFactor;
  cameraState.phi += (cameraState.targetPhi - cameraState.phi) * lerpFactor;

  updateCameraPosition();

  mouseTargetVec.set(mouseState.normalizedX, mouseState.normalizedY, 0);
  ribbonManager.updateTarget(mouseTargetVec);

  const zoomFactor = (cameraState.radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
  ribbonManager.update(mouseTargetVec, time, zoomFactor);

  renderer.render(scene, camera);
}

init();
