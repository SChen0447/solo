import * as THREE from 'three';
import {
  createGalaxy,
  updateGalaxy,
  applyGravity,
  updateGalaxyPosition,
  applyTidalForces,
  GalaxyObject
} from './galaxy';
import { createControls, CameraControls } from './controls';
import { createUI, updateFPS } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cameraControls: CameraControls;
let galaxyBlue: GalaxyObject;
let galaxyOrange: GalaxyObject;
let backgroundStars: THREE.Points;
let backgroundStarsColors: Float32Array;
let backgroundStarsOriginalColors: Float32Array;

const clock = new THREE.Clock();
let elapsed = 0;
let frameCount = 0;
let fpsTimer = 0;
let currentFPS = 60;

let distanceMultiplier = 1.0;
let speedMultiplier = 1.0;

const GALAXY_MASS_BLUE = 1.0;
const GALAXY_MASS_ORANGE = 0.85;
const INITIAL_DISTANCE = 16.0;

function init(): void {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000008, 0.018);

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 500);
  camera.position.set(0, 7.5, 16);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  appEl.appendChild(renderer.domElement);

  cameraControls = createControls(camera, renderer.domElement);

  createBackgroundStars();
  createGalaxies();

  createUI({
    onDistanceChange: (v: number) => {
      distanceMultiplier = v;
    },
    onSpeedChange: (v: number) => {
      speedMultiplier = v;
    },
    onResetView: () => {
      cameraControls.resetView();
    },
    onRestart: () => {
      resetSimulation();
    }
  });

  window.addEventListener('resize', onResize);
}

function createBackgroundStars(): void {
  const starCount = 8000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const originalColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 120;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    const tempRand = Math.random();
    let rC: number, gC: number, bC: number;
    if (tempRand < 0.75) {
      rC = 0.85 + Math.random() * 0.15;
      gC = 0.88 + Math.random() * 0.12;
      bC = 1.0;
    } else if (tempRand < 0.9) {
      rC = 0.95 + Math.random() * 0.05;
      gC = 0.85 + Math.random() * 0.1;
      bC = 0.7 + Math.random() * 0.15;
    } else {
      rC = 0.8 + Math.random() * 0.2;
      gC = 0.9 + Math.random() * 0.1;
      bC = 1.0;
    }
    const bright = 0.4 + Math.random() * 0.6;
    const cr = rC * bright;
    const cg = gC * bright;
    const cb = bC * bright;
    colors[i3] = cr;
    colors[i3 + 1] = cg;
    colors[i3 + 2] = cb;
    originalColors[i3] = cr;
    originalColors[i3 + 1] = cg;
    originalColors[i3 + 2] = cb;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  backgroundStars = new THREE.Points(geometry, material);
  backgroundStarsColors = colors;
  backgroundStarsOriginalColors = originalColors;
  scene.add(backgroundStars);
}

function createGalaxies(): void {
  if (galaxyBlue) {
    scene.remove(galaxyBlue.group);
    galaxyBlue.points.geometry.dispose();
    (galaxyBlue.points.material as THREE.Material).dispose();
  }
  if (galaxyOrange) {
    scene.remove(galaxyOrange.group);
    galaxyOrange.points.geometry.dispose();
    (galaxyOrange.points.material as THREE.Material).dispose();
  }

  const particleCount = 2500;

  galaxyBlue = createGalaxy({
    particleCount,
    armCount: 4,
    radius: 2.4,
    colorInner: 0x60a5fa,
    colorOuter: 0x1e1b4b,
    spinSpeed: 1.0,
    armTwist: 1.15,
    thickness: 0.28,
    bulgeSize: 0.38
  });

  galaxyOrange = createGalaxy({
    particleCount,
    armCount: 3,
    radius: 2.1,
    colorInner: 0xfbbf24,
    colorOuter: 0x7c2d12,
    spinSpeed: -0.9,
    armTwist: -1.0,
    thickness: 0.24,
    bulgeSize: 0.34
  });

  const halfDist = INITIAL_DISTANCE * 0.5 * distanceMultiplier;

  galaxyBlue.group.position.set(-halfDist, 1.2, -3.0);
  galaxyOrange.group.position.set(halfDist, -1.0, 2.5);

  galaxyBlue.group.rotation.set(0.25, -0.4, 0.08);
  galaxyOrange.group.rotation.set(-0.18, 0.35, -0.1);

  const approachSpeed = 0.0035 * speedMultiplier;
  const tangentialSpeed = 0.012 * speedMultiplier;
  galaxyBlue.velocity.set(approachSpeed * 0.6, tangentialSpeed * 0.25, tangentialSpeed * 0.7);
  galaxyOrange.velocity.set(-approachSpeed, -tangentialSpeed * 0.2, -tangentialSpeed * 0.6);

  scene.add(galaxyBlue.group);
  scene.add(galaxyOrange.group);
}

function resetSimulation(): void {
  elapsed = 0;
  createGalaxies();
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  frameCount++;
  fpsTimer += delta;

  if (fpsTimer >= 0.5) {
    currentFPS = frameCount / fpsTimer;
    updateFPS(currentFPS);
    frameCount = 0;
    fpsTimer = 0;
  }

  const timeScale = speedMultiplier;

  cameraControls.update(delta);

  updateGalaxy(galaxyBlue, delta, elapsed, timeScale);
  updateGalaxy(galaxyOrange, delta, elapsed, timeScale);

  applyGravity(galaxyBlue, galaxyOrange.group.position, GALAXY_MASS_ORANGE, delta, timeScale);
  applyGravity(galaxyOrange, galaxyBlue.group.position, GALAXY_MASS_BLUE, delta, timeScale);

  const dist = galaxyBlue.group.position.distanceTo(galaxyOrange.group.position);
  if (dist < 8.5) {
    applyTidalForces(galaxyBlue, galaxyOrange.group.position, GALAXY_MASS_ORANGE, delta, timeScale);
    applyTidalForces(galaxyOrange, galaxyBlue.group.position, GALAXY_MASS_BLUE, delta, timeScale);
  }

  updateGalaxyPosition(galaxyBlue, delta, timeScale);
  updateGalaxyPosition(galaxyOrange, delta, timeScale);

  const bgRotSpeed = 0.003;
  backgroundStars.rotation.y = elapsed * bgRotSpeed * 0.05 + camera.rotation.y * 0.02;
  backgroundStars.rotation.x = camera.rotation.x * 0.015;

  const starCount = 8000;
  for (let i = 0; i < starCount; i += 17) {
    const i3 = i * 3;
    const flicker = 0.97 + Math.sin(elapsed * 3 + i * 0.07) * 0.03;
    backgroundStarsColors[i3] = backgroundStarsOriginalColors[i3] * flicker;
    backgroundStarsColors[i3 + 1] = backgroundStarsOriginalColors[i3 + 1] * flicker;
    backgroundStarsColors[i3 + 2] = backgroundStarsOriginalColors[i3 + 2] * flicker;
  }
  (backgroundStars.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

  renderer.render(scene, camera);
}

init();
animate();
