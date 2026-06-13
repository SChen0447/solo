import * as THREE from 'three';
import { WordData } from './types';
import { getDragSensitivity } from './utils';
import {
  initializeWordPool,
  updateWordPool,
  handleWordClick,
  handleWordDragStart,
  handleWordDragMove,
  handleWordDragEnd,
  disposeWordPool
} from './wordPool';
import {
  initializeCore,
  getCoreMesh,
  updateCore,
  absorbWord,
  checkWordNearCore,
  triggerParticleFountain,
  getAbsorbedCount,
  disposeCore
} from './coreStar';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let animationId: number | null = null;
let clock: THREE.Clock;
let isPaused = false;

let cameraAngleTheta = 0;
let cameraAnglePhi = Math.PI / 12;
let cameraDistance = 8;
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 20;

let isDraggingView = false;
let previousMouseX = 0;
let previousMouseY = 0;
let isDraggingWord = false;

let hintCountElement: HTMLElement | null = null;

function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container element not found');
    return;
  }
  
  hintCountElement = document.getElementById('ring-count');
  
  scene = new THREE.Scene();
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 2;
  canvas.height = 512;
  
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 512);
  
  const bgTexture = new THREE.CanvasTexture(canvas);
  scene.background = bgTexture;
  
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  updateCameraPosition();
  
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  
  clock = new THREE.Clock();
  
  const { corePosition } = initializeCore(scene, updateRingCount);
  initializeWordPool(scene, camera, corePosition, onWordClick, onWordDragEnd);
  
  setupEventListeners(renderer.domElement);
  
  animate();
}

function updateCameraPosition(): void {
  const x = cameraDistance * Math.sin(cameraAnglePhi) * Math.cos(cameraAngleTheta);
  const y = cameraDistance * Math.cos(cameraAnglePhi) - 2;
  const z = cameraDistance * Math.sin(cameraAnglePhi) * Math.sin(cameraAngleTheta);
  
  camera.position.set(x, y, z);
  camera.lookAt(0, -2, 0);
}

function updateRingCount(count: number): void {
  if (hintCountElement) {
    hintCountElement.textContent = count.toString();
  }
}

function onWordClick(_word: WordData): void {
  // Word click handled in wordPool
}

function onWordDragEnd(word: WordData): void {
  if (checkWordNearCore(word)) {
    absorbWord(word);
  }
}

function setupEventListeners(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onClick);
  
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
}

function onMouseDown(event: MouseEvent): void {
  if (event.button !== 0) return;
  
  const wordDragged = handleWordDragStart(event);
  if (wordDragged) {
    isDraggingWord = true;
  } else {
    isDraggingView = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (isDraggingWord) {
    handleWordDragMove(event);
  } else if (isDraggingView) {
    const sensitivity = getDragSensitivity();
    const deltaX = (event.clientX - previousMouseX) * 0.005 * sensitivity;
    const deltaY = (event.clientY - previousMouseY) * 0.005 * sensitivity;
    
    cameraAngleTheta -= deltaX;
    cameraAnglePhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAnglePhi - deltaY));
    
    updateCameraPosition();
    
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
}

function onMouseUp(): void {
  if (isDraggingWord) {
    handleWordDragEnd();
  }
  isDraggingView = false;
  isDraggingWord = false;
}

function onWheel(event: WheelEvent): void {
  event.preventDefault();
  
  const zoomSpeed = 0.001;
  cameraDistance += event.deltaY * zoomSpeed;
  cameraDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, cameraDistance));
  
  updateCameraPosition();
}

function onClick(event: MouseEvent): void {
  if (isDraggingView || isDraggingWord) return;
  
  if (event.shiftKey) {
    const coreMesh = getCoreMesh();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(coreMesh);
    
    if (intersects.length > 0 && getAbsorbedCount() >= 4) {
      triggerParticleFountain();
      return;
    }
  }
  
  const wordClicked = handleWordClick(event);
  
  if (!wordClicked && event.shiftKey) {
    if (getAbsorbedCount() >= 4) {
      triggerParticleFountain();
    }
  }
}

function onTouchStart(event: TouchEvent): void {
  event.preventDefault();
  if (event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY,
    button: 0
  });
  
  onMouseDown(mouseEvent);
}

function onTouchMove(event: TouchEvent): void {
  event.preventDefault();
  if (event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  
  onMouseMove(mouseEvent);
}

function onTouchEnd(event: TouchEvent): void {
  event.preventDefault();
  onMouseUp();
  
  if (event.changedTouches.length === 1 && !isDraggingView && !isDraggingWord) {
    const touch = event.changedTouches[0];
    const mouseEvent = new MouseEvent('click', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      shiftKey: false
    });
    
    onClick(mouseEvent);
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onVisibilityChange(): void {
  isPaused = document.hidden;
  if (!isPaused && animationId === null) {
    animate();
  }
}

function animate(): void {
  if (isPaused) {
    animationId = null;
    return;
  }
  
  animationId = requestAnimationFrame(animate);
  
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  
  updateCore(deltaTime);
  updateWordPool(deltaTime);
  
  renderer.render(scene, camera);
}

function dispose(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  disposeWordPool();
  disposeCore();
  renderer.dispose();
  
  const canvas = renderer.domElement;
  canvas.removeEventListener('mousedown', onMouseDown);
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('mouseup', onMouseUp);
  canvas.removeEventListener('mouseleave', onMouseUp);
  canvas.removeEventListener('wheel', onWheel);
  canvas.removeEventListener('click', onClick);
  
  window.removeEventListener('resize', onWindowResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  
  canvas.removeEventListener('touchstart', onTouchStart);
  canvas.removeEventListener('touchmove', onTouchMove);
  canvas.removeEventListener('touchend', onTouchEnd);
}

init();

window.addEventListener('beforeunload', dispose);
