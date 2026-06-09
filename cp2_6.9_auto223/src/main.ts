import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, defaultParams } from './nebulaSystem';
import { setupControls } from './controlsUI';
import { setupScreenshot } from './screenshot';

const container = document.getElementById('canvas-container');
if (!container) {
  throw new Error('Canvas container not found');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0A0A1A');

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 4, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
};
controls.minDistance = 2;
controls.maxDistance = 20;

const nebula = new ParticleSystem(scene, defaultParams);

const { updateFPS } = setupControls(nebula);

setupScreenshot(renderer, scene, camera);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

let frameCount = 0;
let lastTime = performance.now();

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  nebula.update(delta);

  controls.update();

  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 500) {
    const fps = (frameCount * 1000) / (now - lastTime);
    updateFPS(fps);
    frameCount = 0;
    lastTime = now;
  }
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
