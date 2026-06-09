import * as THREE from 'three';
import { Galaxy } from './Galaxy';
import { InteractionControls } from './Controls';

const canvasContainer = document.getElementById('canvas-container')!;
const controlPanel = document.getElementById('control-panel')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
canvasContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const galaxy = new Galaxy();
scene.add(galaxy.points);

const controls = new InteractionControls(camera, renderer.domElement, galaxy, controlPanel);

const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  galaxy.update(deltaTime);
  controls.update();

  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    lastFpsUpdate = now;
    frameCount = 0;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('beforeunload', () => {
  galaxy.dispose();
  controls.dispose();
  renderer.dispose();
});

animate();
