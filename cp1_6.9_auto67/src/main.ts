import * as THREE from 'three';
import { LavaLamp } from './lavaLamp';
import { InteractionManager } from './interaction';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let lavaLamp: LavaLamp;
let interactionManager: InteractionManager;
let clock: THREE.Clock;

let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container not found');
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.03);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1, 9);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  setupLights();

  lavaLamp = new LavaLamp(scene);
  lavaLamp.container.position.y = -0.5;

  interactionManager = new InteractionManager(
    lavaLamp,
    camera,
    renderer.domElement
  );

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(5, 8, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xff6600, 1.2, 15);
  rimLight.position.set(0, -3, 0);
  scene.add(rimLight);

  const topLight = new THREE.PointLight(0x00ccff, 0.6, 12);
  topLight.position.set(0, 6, 0);
  scene.add(topLight);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.getElapsedTime();

  lavaLamp.update(deltaTime);

  const floatY = Math.sin(elapsedTime * 0.3) * 0.05;
  lavaLamp.container.position.y = -0.5 + floatY;

  updateFPS(deltaTime);
  interactionManager.updateStats(currentFps);

  renderer.render(scene, camera);
}

function updateFPS(deltaTime: number): void {
  frameCount++;
  fpsTime += deltaTime;

  if (fpsTime >= 0.5) {
    currentFps = frameCount / fpsTime;
    frameCount = 0;
    fpsTime = 0;
  }
}

init();
