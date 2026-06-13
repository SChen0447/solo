import * as THREE from 'three';
import { createLighthouse, Lighthouse } from './lighthouse';
import { createRings, RingSystem, createStarRings, updateStarRings } from './rings';
import { createInteractionController, InteractionController } from './interaction';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let lighthouse: Lighthouse;
let ringSystem: RingSystem;
let starRings: THREE.Group;
let interactionController: InteractionController;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let container: HTMLElement;

let clock: THREE.Clock;
let elapsedTime = 0;
let animationFrameId: number;

function init() {
  container = document.getElementById('canvas-container') as HTMLElement;

  scene = new THREE.Scene();
  scene.background = null;

  const rect = container.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x1a2a6c, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x48dbfb, 0.8);
  directionalLight.position.set(5, 8, 3);
  scene.add(directionalLight);

  const pointLight1 = new THREE.PointLight(0xff6b6b, 0.5, 20);
  pointLight1.position.set(-4, 2, -4);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xfeca57, 0.5, 20);
  pointLight2.position.set(4, -2, 4);
  scene.add(pointLight2);

  lighthouse = createLighthouse();
  scene.add(lighthouse.group);

  ringSystem = createRings();
  scene.add(ringSystem.group);

  starRings = createStarRings();
  scene.add(starRings);

  raycaster = new THREE.Raycaster();
  (raycaster as any).camera = camera;
  mouse = new THREE.Vector2();

  interactionController = createInteractionController(
    container,
    raycaster,
    mouse,
    lighthouse.coreMesh,
    {
      onHover: (hovered: boolean) => {
        lighthouse.setHovered(hovered);
      },
      onClick: () => {
        lighthouse.triggerShockwave();
        ringSystem.triggerColorChange();
      },
    }
  );

  clock = new THREE.Clock();

  createStarDots();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function createStarDots() {
  const starsBg = document.getElementById('stars-bg') as HTMLElement;
  const starCount = 300;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';

    const size = 1 + Math.random() * 1;
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const duration = 3 + Math.random() * 5;
    const delay = Math.random() * duration;
    const opacity = 0.2 + Math.random() * 0.3;

    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${left}%`;
    star.style.top = `${top}%`;
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${delay}s`;
    star.style.opacity = String(opacity);

    starsBg.appendChild(star);
  }
}

function onWindowResize() {
  const rect = container.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  elapsedTime += delta;

  lighthouse.update(delta, elapsedTime);
  ringSystem.update(delta, elapsedTime);
  updateStarRings(starRings, delta);
  interactionController.updateCamera(camera, delta);

  renderer.render(scene, camera);
}

function dispose() {
  cancelAnimationFrame(animationFrameId);
  interactionController.dispose();
  window.removeEventListener('resize', onWindowResize);
  renderer.dispose();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { dispose };
