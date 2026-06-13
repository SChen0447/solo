import * as THREE from 'three';
import { generateGalaxy, getArmEndPosition } from './galaxy';
import { createStarSystem, type StarSystem } from './stars';
import { createControls, type GalaxyControls } from './controls';

const ARM_COUNT = 4;
const RADIUS = 50;
const ARM_SPREAD = 6;
const CORE_STAR_COUNT = 200;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: GalaxyControls;
let starSystem: StarSystem | null = null;

let currentStarCount = 5000;
let currentSpeedMultiplier = 1.0;
let showArmLabels = false;

let armLabelSprites: THREE.Sprite[] = [];
let coreGlow: THREE.PointLight | null = null;

let clock: THREE.Clock;
let isTransitioning = false;

function init() {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 80, 120);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = createControls(camera, renderer.domElement);

  coreGlow = new THREE.PointLight(0xffcc66, 2, 80);
  coreGlow.position.set(0, 0, 0);
  scene.add(coreGlow);

  const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
  scene.add(ambientLight);

  buildGalaxy(currentStarCount);

  addBackgroundStars();

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);

  setupUI();

  hideLoader();

  animate();
}

function buildGalaxy(starCount: number) {
  if (starSystem) {
    starSystem.dispose();
    starSystem = null;
  }

  removeArmLabels();

  const data = generateGalaxy({
    starCount: Math.floor(starCount / ARM_COUNT),
    armCount: ARM_COUNT,
    radius: RADIUS,
    armSpread: ARM_SPREAD,
    coreStarCount: CORE_STAR_COUNT,
  });

  starSystem = createStarSystem(scene, data);

  if (showArmLabels) {
    addArmLabels();
  }
}

async function rebuildGalaxySmooth(newCount: number) {
  if (isTransitioning) return;
  isTransitioning = true;

  if (starSystem) {
    const fadeOutDuration = 400;
    const startTime = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / fadeOutDuration, 1);
        starSystem!.setOpacity(1 - t);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  currentStarCount = newCount;
  buildGalaxy(newCount);

  if (starSystem) {
    starSystem.setOpacity(0);
    const fadeInDuration = 600;
    const startTime = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / fadeInDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        starSystem!.setOpacity(eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  isTransitioning = false;
}

function addBackgroundStars() {
  const bgStarCount = 2000;
  const positions = new Float32Array(bgStarCount * 3);
  const bgSizes = new Float32Array(bgStarCount);

  for (let i = 0; i < bgStarCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 200 + Math.random() * 300;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    bgSizes[i] = 0.3 + Math.random() * 0.5;
  }

  const bgGeometry = new THREE.BufferGeometry();
  bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const bgMaterial = new THREE.PointsMaterial({
    color: 0x888899,
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });

  const bgStars = new THREE.Points(bgGeometry, bgMaterial);
  scene.add(bgStars);
}

function addArmLabels() {
  removeArmLabels();

  const armNames = ['英仙臂', '盾牌-南十字臂', '人马臂', '矩尺臂'];
  for (let i = 0; i < ARM_COUNT; i++) {
    const pos = getArmEndPosition(i, ARM_COUNT, RADIUS);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Orbitron, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Arm ${i + 1} · ${armNames[i]}`, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(pos.x, pos.y + 4, pos.z);
    sprite.scale.set(12, 3, 1);
    scene.add(sprite);
    armLabelSprites.push(sprite);
  }
}

function removeArmLabels() {
  armLabelSprites.forEach((sprite) => {
    scene.remove(sprite);
    if (sprite.material instanceof THREE.SpriteMaterial) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
  });
  armLabelSprites = [];
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const clampedDelta = Math.min(deltaTime, 0.05);

  controls.update(clampedDelta);

  if (starSystem) {
    starSystem.update(currentSpeedMultiplier, clampedDelta);
  }

  renderer.render(scene, camera);
}

function setupUI() {
  const starCountSlider = document.getElementById('star-count') as HTMLInputElement;
  const starCountValue = document.getElementById('star-count-value') as HTMLSpanElement;
  const speedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const labelToggle = document.getElementById('arm-labels-toggle') as HTMLInputElement;

  if (starCountSlider) {
    starCountSlider.addEventListener('input', () => {
      const val = parseInt(starCountSlider.value, 10);
      if (starCountValue) starCountValue.textContent = val.toString();
      rebuildGalaxySmooth(val);
    });
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      currentSpeedMultiplier = parseFloat(speedSlider.value);
      if (speedValue) speedValue.textContent = currentSpeedMultiplier.toFixed(1) + 'x';
    });
  }

  if (labelToggle) {
    labelToggle.addEventListener('change', () => {
      showArmLabels = labelToggle.checked;
      if (showArmLabels) {
        addArmLabels();
      } else {
        removeArmLabels();
      }
    });
  }

  const panelToggle = document.getElementById('panel-toggle');
  const controlPanel = document.getElementById('control-panel');
  if (panelToggle && controlPanel) {
    panelToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('panel-expanded');
    });
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
}

window.addEventListener('DOMContentLoaded', init);
