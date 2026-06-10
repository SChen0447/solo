import * as THREE from 'three';
import { BlindsManager, ANGLE_STEP } from './blinds';
import { LightsManager, LIGHT_MIN_X, LIGHT_MAX_X, LIGHT_MIN_Y, LIGHT_MAX_Y, LIGHT_MIN_Z, LIGHT_MAX_Z } from './lights';
import { ShadowsManager } from './shadows';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let blindsMgr: BlindsManager;
let lightsMgr: LightsManager;
let shadowsMgr: ShadowsManager;
let clock: THREE.Clock;

let isDragging: boolean = false;
let prevMouseX: number = 0;
let prevMouseY: number = 0;

const fpsSamples: number[] = [];
let currentFps: number = 60;

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  scene.fog = new THREE.Fog(0x1a1a1a, 6, 16);

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.5, 7);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  blindsMgr = new BlindsManager();
  lightsMgr = new LightsManager();
  shadowsMgr = new ShadowsManager();

  scene.add(blindsMgr.group);
  scene.add(lightsMgr.group);
  scene.add(shadowsMgr.group);
  scene.add(lightsMgr.ambientLight);

  clock = new THREE.Clock();

  setupEventListeners();
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('wheel', onMouseWheel, { passive: false });
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseleave', onMouseUp);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e: KeyboardEvent): void {
  switch (e.code) {
    case 'KeyQ':
      blindsMgr.rotate(-ANGLE_STEP);
      break;
    case 'KeyE':
      blindsMgr.rotate(ANGLE_STEP);
      break;
    case 'KeyR':
      blindsMgr.randomizeColors();
      triggerFlashEffect();
      break;
  }
}

function onMouseDown(e: MouseEvent): void {
  if (e.button === 0) {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }
}

function onMouseUp(): void {
  isDragging = false;
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging) return;

  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;

  const pos = lightsMgr.getLightPosition();
  const sensitivity = 0.015;
  lightsMgr.setLightPosition(
    pos.x + dx * sensitivity,
    pos.y - dy * sensitivity,
    pos.z
  );
}

function onMouseWheel(e: WheelEvent): void {
  e.preventDefault();
  const pos = lightsMgr.getLightPosition();
  const delta = e.deltaY > 0 ? 0.3 : -0.3;
  const xRange = LIGHT_MAX_X - LIGHT_MIN_X;
  const yRange = LIGHT_MAX_Y - LIGHT_MIN_Y;
  const zRange = LIGHT_MAX_Z - LIGHT_MIN_Z;
  lightsMgr.setLightPosition(
    THREE.MathUtils.clamp(pos.x, LIGHT_MIN_X, LIGHT_MAX_X),
    THREE.MathUtils.clamp(pos.y, LIGHT_MIN_Y, LIGHT_MAX_Y),
    THREE.MathUtils.clamp(pos.z + delta, LIGHT_MIN_Z, LIGHT_MAX_Z)
  );
  void xRange; void yRange; void zRange;
}

function triggerFlashEffect(): void {
  const overlay = document.getElementById('flash-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0.1';
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.opacity = '0.1';
      setTimeout(() => {
        overlay.style.opacity = '0';
      }, 400);
    }, 100);
  }, 100);
}

function updateUI(): void {
  const lightPos = lightsMgr.getLightPosition();
  const lightPosEl = document.getElementById('light-pos');
  if (lightPosEl) {
    lightPosEl.textContent = `${lightPos.x.toFixed(2)}, ${lightPos.y.toFixed(2)}, ${lightPos.z.toFixed(2)}`;
  }
  const angleEl = document.getElementById('blind-angle');
  if (angleEl) {
    angleEl.textContent = `${blindsMgr.getAngle().toFixed(1)}°`;
  }
  const spotCountEl = document.getElementById('spot-count');
  if (spotCountEl) {
    spotCountEl.textContent = String(shadowsMgr.getActiveSpotCount());
  }
  const fpsEl = document.getElementById('fps');
  if (fpsEl) {
    fpsEl.textContent = String(Math.round(currentFps));
  }
}

function handlePerformance(deltaTime: number): void {
  const instantFps = 1 / Math.max(deltaTime, 0.001);
  fpsSamples.push(instantFps);
  if (fpsSamples.length > 30) fpsSamples.shift();
  currentFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;

  if (currentFps < 45) {
    shadowsMgr.setMaxOverlapParticles(80);
    lightsMgr.setTextureUpdateInterval(200);
  } else {
    shadowsMgr.setMaxOverlapParticles(150);
    lightsMgr.setTextureUpdateInterval(100);
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.1);

  blindsMgr.update(deltaTime);
  lightsMgr.update(deltaTime);

  const blindColors = blindsMgr.getBlindColors();
  const avgColor = blindsMgr.getWeightedAverageColor();
  lightsMgr.updateNoiseTexture(blindColors, avgColor);

  const lightPos = lightsMgr.getLightPosition();
  const spotSize = lightsMgr.getSpotSize();
  const blindAngleRad = THREE.MathUtils.degToRad(blindsMgr.getAngle());

  shadowsMgr.updateSpots(lightPos, spotSize, blindColors, blindAngleRad);
  shadowsMgr.updateOverlapParticles(deltaTime, blindColors);
  shadowsMgr.updateAtmosphereParticles(deltaTime);

  handlePerformance(deltaTime);
  updateUI();

  renderer.render(scene, camera);
}

init();
animate();
