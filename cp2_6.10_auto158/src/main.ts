import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetSystem } from './planetSystem';
import { UIManager, type UIControls } from './ui';
import { createStarfield } from './starfield';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 8, 14);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const DAYS_PER_SECOND_AT_1X = 10;
const SPEED_TRANSITION_DURATION = 0.5;

const container = document.getElementById('app')!;

container.style.background =
  'radial-gradient(ellipse at center, #0a0a23 0%, #050510 100%)';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.copy(INITIAL_CAMERA_POSITION);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 50;
controls.target.copy(INITIAL_CAMERA_TARGET);

const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
scene.add(ambientLight);

const starfield = createStarfield(1000, 50);
scene.add(starfield);

const planetSystem = new PlanetSystem(scene);

let targetSpeedMultiplier = 1;
let currentSpeedMultiplier = 1;
let isPaused = false;

const uiControls: UIControls = {
  speedMultiplier: 1,
  isPaused: false,
  onSpeedChange: (speed: number) => {
    targetSpeedMultiplier = speed;
    uiControls.speedMultiplier = speed;
  },
  onTogglePause: () => {
    isPaused = !isPaused;
    uiControls.isPaused = isPaused;
  },
  onResetView: () => {
    animateCameraTo(INITIAL_CAMERA_POSITION, INITIAL_CAMERA_TARGET);
  },
};

const uiManager = new UIManager(container, camera, uiControls);
uiManager.setPlanetMeshes(planetSystem.getPlanetMeshes());

function animateCameraTo(
  targetPosition: THREE.Vector3,
  targetLookAt: THREE.Vector3,
  duration: number = 0.8
): void {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  let elapsed = 0;

  function step(): void {
    elapsed += 1 / 60;
    const t = Math.min(elapsed / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, targetLookAt, eased);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    }
  }

  step();
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  const speedDiff = targetSpeedMultiplier - currentSpeedMultiplier;
  if (Math.abs(speedDiff) > 0.001) {
    const transitionAmount = delta / SPEED_TRANSITION_DURATION;
    currentSpeedMultiplier += speedDiff * Math.min(transitionAmount, 1);
  } else {
    currentSpeedMultiplier = targetSpeedMultiplier;
  }

  if (!isPaused) {
    const deltaDays = delta * DAYS_PER_SECOND_AT_1X * currentSpeedMultiplier;
    planetSystem.updatePositions(deltaDays);
  }

  starfield.rotation.y += delta * 0.002;

  controls.update();
  uiManager.updateSimulationInfo(planetSystem.simulationTime, planetSystem.earthOrbits);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
