import * as THREE from 'three';
import { BubbleManager } from './bubbleManager';
import { TimeUtils } from './timeUtils';

const container = document.getElementById('app') as HTMLElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0d0d1a, 1);
container.appendChild(renderer.domElement);

const timeUtils = new TimeUtils();
const bubbleManager = new BubbleManager(scene, camera, timeUtils, container);

let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

const startTime = performance.now();
let lastFrameTime = startTime;

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const elapsed = now - startTime;
  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;

  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    currentFps = (frameCount * 1000) / (now - lastFpsUpdate);
    bubbleManager.updateFPS(currentFps);
    frameCount = 0;
    lastFpsUpdate = now;
  }

  const timeSeconds = elapsed / 1000;

  bubbleManager.update(timeSeconds, elapsed, deltaTime);

  const bgColor = bubbleManager.getBackgroundColor();
  const startColor = new THREE.Color(0x0d0d1a);
  const finalColor = new THREE.Color().lerpColors(startColor, bgColor, 0.7);
  scene.background = finalColor;

  renderer.render(scene, camera);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

animate();
