import * as THREE from 'three';
import { RubiksCube, RotationMove } from './cube';
import { CubeInteraction } from './interaction';

const app = document.getElementById('app')!;
const stepCountEl = document.getElementById('step-count')!;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;
const solveBtn = document.getElementById('solve-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: RubiksCube;
let interaction: CubeInteraction;

let autoRotating = false;
let isShuffling = false;
let isSolving = false;

function initThree() {
  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  app.insertBefore(renderer.domElement, app.firstChild);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight1.position.set(5, 5, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-5, -5, -5);
  scene.add(dirLight2);
}

function initCube() {
  cube = new RubiksCube();
  scene.add(cube.group);
}

function initInteraction() {
  interaction = new CubeInteraction(camera, cube, handleRotation);

  const container = renderer.domElement;

  container.addEventListener('pointerdown', (e) => {
    interaction.handlePointerDown(e, container);
  });

  container.addEventListener('pointerup', (e) => {
    interaction.handlePointerUp(e, container);
  });

  window.addEventListener('resize', onResize);
}

function handleRotation(axis: 'x' | 'y' | 'z', layer: number, direction: number) {
  if (cube.isAnimating || isShuffling || isSolving) return;
  cube.recordMove(axis, layer, direction);
  cube.rotateLayerAnimated(axis, layer, direction, 300, updateStepCount);
}

function updateStepCount() {
  stepCountEl.textContent = `步数：${cube.getMoveCount()}`;
}

function setButtonsDisabled(disabled: boolean) {
  shuffleBtn.disabled = disabled;
  solveBtn.disabled = disabled;
  resetBtn.disabled = disabled;
}

function shuffle() {
  if (isShuffling || isSolving || cube.isAnimating) return;
  isShuffling = true;
  setButtonsDisabled(true);

  const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  const layers = [-1, 0, 1];
  const directions = [1, -1];
  const totalMoves = 20;
  let currentMove = 0;

  const doMove = () => {
    if (currentMove >= totalMoves) {
      isShuffling = false;
      setButtonsDisabled(false);
      updateStepCount();
      return;
    }

    const axis = axes[Math.floor(Math.random() * axes.length)];
    const layer = layers[Math.floor(Math.random() * layers.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    cube.recordMove(axis, layer, direction);
    cube.rotateLayerAnimated(axis, layer, direction, 150, () => {
      currentMove++;
      updateStepCount();
      setTimeout(doMove, 200);
    });
  };

  doMove();
}

function solve() {
  if (isShuffling || isSolving || cube.isAnimating) return;
  if (cube.moveHistory.length === 0) return;

  isSolving = true;
  setButtonsDisabled(true);

  const reverseMoves = cube.moveHistory
    .slice()
    .reverse()
    .map((m: RotationMove) => ({
      axis: m.axis,
      layer: m.layer,
      direction: -m.direction,
    }));

  cube.clearHistory();
  let currentStep = 0;

  const doStep = () => {
    if (currentStep >= reverseMoves.length) {
      isSolving = false;
      setButtonsDisabled(false);
      updateStepCount();
      return;
    }

    const move = reverseMoves[currentStep];
    cube.rotateLayerAnimated(
      move.axis,
      move.layer,
      move.direction,
      300,
      () => {
        currentStep++;
        updateStepCount();
        setTimeout(doStep, 50);
      },
      true
    );
  };

  doStep();
}

function reset() {
  if (isShuffling || isSolving || cube.isAnimating) return;
  cube.reset();
  updateStepCount();
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

shuffleBtn.addEventListener('click', shuffle);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

initThree();
initCube();
initInteraction();
updateStepCount();
animate();
