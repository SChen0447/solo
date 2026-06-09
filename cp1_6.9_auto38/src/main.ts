import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'simplex-noise';
import { Coral } from './coral';
import { InteractionManager } from './interaction';

const simplexNoise = new SimplexNoise();
const noise2D = (x: number, y: number) => simplexNoise.noise2D(x, y);

const SCENE_SIZE = 8;
const OCEAN_HEIGHT = 5;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let seabedMesh: THREE.Mesh;
let corals: Coral[] = [];
let plankton: THREE.Points;
let interaction: InteractionManager;
let ambientLight: THREE.AmbientLight;
let pointLight: THREE.PointLight;
let isDayMode: boolean = false;
let currentSpeed: number = 0.5;

const uiState = {
  totalCorals: 0,
  colorDistribution: new Map<number, number>()
};

function hslToHex(h: number, s: number, l: number): number {
  const color = new THREE.Color();
  color.setHSL(h, s, l);
  return color.getHex();
}

function init(): void {
  const container = document.getElementById('app');
  if (!container) return;

  scene = new THREE.Scene();
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 256;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#000510');
  gradient.addColorStop(1, '#0a1a3a');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 256);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;
  scene.fog = new THREE.FogExp2(0x000510, 0.08);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3.5, 6);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 0.5, 0);

  ambientLight = new THREE.AmbientLight(0x0a1a3a, 0.4);
  scene.add(ambientLight);

  pointLight = new THREE.PointLight(0x4488ff, 0.8, 20);
  pointLight.position.set(0, 4, 0);
  scene.add(pointLight);

  createSeabed();
  createPlankton();
  createUI();
  createInitialCorals();

  interaction = new InteractionManager(
    scene,
    camera,
    renderer,
    corals,
    seabedMesh,
    OCEAN_HEIGHT,
    (coral: Coral) => {
      addCoralToStats(coral);
      updateUI();
    }
  );

  window.addEventListener('resize', onWindowResize);
}

function createSeabed(): void {
  const geometry = new THREE.PlaneGeometry(SCENE_SIZE, SCENE_SIZE, 64, 64);
  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const noiseVal = noise2D(x * 0.8, y * 0.8) * 0.15 + noise2D(x * 2, y * 2) * 0.05;
    positions.setZ(i, noiseVal);
  }
  geometry.computeVertexNormals();

  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const t = (noise2D(x * 0.5, y * 0.5) + 1) * 0.5;

    const color1 = new THREE.Color(0x1a2a3a);
    const color2 = new THREE.Color(0x2a3a4a);
    const mixed = color1.clone().lerp(color2, t);

    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.1
  });

  seabedMesh = new THREE.Mesh(geometry, material);
  seabedMesh.rotation.x = -Math.PI / 2;
  scene.add(seabedMesh);
}

function createPlankton(): void {
  const count = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SCENE_SIZE;
    positions[i * 3 + 1] = Math.random() * OCEAN_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SCENE_SIZE;

    const colorHue = 150 / 360 + Math.random() * (240 / 360 - 150 / 360);
    const color = new THREE.Color().setHSL(colorHue, 1.0, 0.7 + Math.random() * 0.3);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.01 + Math.random() * 0.02;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  plankton = new THREE.Points(geometry, material);
  scene.add(plankton);
}

function createInitialCorals(): void {
  const count = 30 + Math.floor(Math.random() * 21);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * (SCENE_SIZE - 1);
    const z = (Math.random() - 0.5) * (SCENE_SIZE - 1);
    const y = getSeabedHeight(x, z);

    const hue = 180 / 360 + Math.random() * (270 / 360 - 180 / 360);
    const color = hslToHex(hue, 1.0, 0.6);

    const coral = new Coral(new THREE.Vector3(x, y, z), color, true);
    corals.push(coral);
    scene.add(coral.group);
    addCoralToStats(coral);
  }
  updateUI();
}

function getSeabedHeight(x: number, z: number): number {
  return noise2D(x * 0.8, z * 0.8) * 0.15 + noise2D(x * 2, z * 2) * 0.05;
}

function addCoralToStats(coral: Coral): void {
  uiState.totalCorals++;
  const colorKey = Math.round(coral.baseColor);
  uiState.colorDistribution.set(colorKey, (uiState.colorDistribution.get(colorKey) || 0) + 1);
}

function createUI(): void {
  const style = document.createElement('style');
  style.textContent = `
    .ui-panel {
      position: fixed;
      background: rgba(10, 26, 42, 0.7);
      border-radius: 12px;
      padding: 16px 20px;
      color: #aaddff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      backdrop-filter: blur(8px);
      transition: opacity 0.3s ease;
      opacity: 0.7;
      pointer-events: auto;
      user-select: none;
    }
    .ui-panel:hover {
      opacity: 1.0;
    }
    #info-panel {
      top: 20px;
      left: 20px;
      min-width: 200px;
    }
    #info-panel h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #66ddff;
      letter-spacing: 1px;
    }
    #coral-count {
      font-size: 12px;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    #color-ring {
      width: 100px;
      height: 100px;
      margin: 0 auto;
    }
    #control-panel {
      bottom: 20px;
      right: 20px;
      min-width: 200px;
    }
    #control-panel h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #66ddff;
      letter-spacing: 1px;
    }
    .control-row {
      margin-bottom: 14px;
    }
    .control-row label {
      display: block;
      font-size: 11px;
      margin-bottom: 6px;
      opacity: 0.8;
      letter-spacing: 0.5px;
    }
    #speed-slider {
      width: 100%;
      accent-color: #00aaff;
    }
    #mode-btn {
      width: 100%;
      padding: 8px 16px;
      background: rgba(0, 150, 255, 0.2);
      border: 1px solid rgba(0, 200, 255, 0.4);
      color: #aaddff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      letter-spacing: 0.5px;
      transition: all 0.2s;
    }
    #mode-btn:hover {
      background: rgba(0, 200, 255, 0.3);
      border-color: rgba(0, 255, 255, 0.6);
    }
    #mode-btn:active {
      transform: scale(0.98);
    }
    .slider-value {
      float: right;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);

  const infoPanel = document.createElement('div');
  infoPanel.id = 'info-panel';
  infoPanel.className = 'ui-panel';
  infoPanel.innerHTML = `
    <h3>深海珊瑚监测</h3>
    <div id="coral-count">珊瑚总数: 0</div>
    <canvas id="color-ring" width="100" height="100"></canvas>
  `;
  document.body.appendChild(infoPanel);

  const controlPanel = document.createElement('div');
  controlPanel.id = 'control-panel';
  controlPanel.className = 'ui-panel';
  controlPanel.innerHTML = `
    <h3>环境控制</h3>
    <div class="control-row">
      <label>海流速度 <span class="slider-value" id="speed-value">0.5</span></label>
      <input type="range" id="speed-slider" min="0.1" max="1.0" step="0.05" value="0.5">
    </div>
    <button id="mode-btn">切换白天模式</button>
  `;
  document.body.appendChild(controlPanel);

  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLElement;
  speedSlider.addEventListener('input', (e) => {
    currentSpeed = parseFloat((e.target as HTMLInputElement).value);
    speedValue.textContent = currentSpeed.toFixed(2);
  });

  const modeBtn = document.getElementById('mode-btn') as HTMLButtonElement;
  modeBtn.addEventListener('click', () => {
    isDayMode = !isDayMode;
    modeBtn.textContent = isDayMode ? '切换夜间模式' : '切换白天模式';
    toggleDayNight();
  });
}

function updateUI(): void {
  const countEl = document.getElementById('coral-count');
  if (countEl) {
    countEl.textContent = `珊瑚总数: ${uiState.totalCorals}`;
  }

  const canvas = document.getElementById('color-ring') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 100, 100);

  if (uiState.colorDistribution.size === 0) return;

  const centerX = 50;
  const centerY = 50;
  const outerRadius = 45;
  const innerRadius = 30;

  let total = 0;
  uiState.colorDistribution.forEach((v) => (total += v));

  let startAngle = -Math.PI / 2;
  uiState.colorDistribution.forEach((count, color) => {
    const sliceAngle = (count / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fill();

    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 26, 42, 0.8)';
  ctx.fill();
}

function toggleDayNight(): void {
  if (isDayMode) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d')!;
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a1a3a');
    gradient.addColorStop(1, '#1a3a5a');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 2, 256);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTexture;
    scene.fog = new THREE.FogExp2(0x0a1a3a, 0.06);
    ambientLight.color.setHex(0x335577);
    ambientLight.intensity = 0.6;
    pointLight.color.setHex(0x88aaff);
    pointLight.intensity = 1.0;
  } else {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d')!;
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#000510');
    gradient.addColorStop(1, '#0a1a3a');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 2, 256);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTexture;
    scene.fog = new THREE.FogExp2(0x000510, 0.08);
    ambientLight.color.setHex(0x0a1a3a);
    ambientLight.intensity = 0.4;
    pointLight.color.setHex(0x4488ff);
    pointLight.intensity = 0.8;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const time = performance.now();
  const emissiveMultiplier = isDayMode ? 0.5 : 1.0;

  corals.forEach((coral) => {
    coral.update(time, emissiveMultiplier);
  });

  interaction.update(time);
  updatePlankton(time);

  controls.update();
  renderer.render(scene, camera);
}

function updatePlankton(time: number): void {
  const positions = plankton.geometry.attributes.position as THREE.BufferAttribute;
  const count = positions.count;

  for (let i = 0; i < count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = positions.getZ(i);

    x += Math.sin(time * 0.0005 + i * 0.1) * 0.002 * currentSpeed;
    z += Math.cos(time * 0.0007 + i * 0.15) * 0.002 * currentSpeed;
    y += Math.sin(time * 0.001 + i * 0.2) * 0.001 * currentSpeed;

    const half = SCENE_SIZE / 2;
    if (x > half) x = -half;
    if (x < -half) x = half;
    if (z > half) z = -half;
    if (z < -half) z = half;
    if (y > OCEAN_HEIGHT) y = 0;
    if (y < 0) y = OCEAN_HEIGHT;

    positions.setX(i, x);
    positions.setY(i, y);
    positions.setZ(i, z);
  }
  positions.needsUpdate = true;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
animate();
