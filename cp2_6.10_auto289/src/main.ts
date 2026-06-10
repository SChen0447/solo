import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AstrolabeModel, LayerState } from './AstrolabeModel';
import { starDataManager, Star, Constellation } from './StarDataManager';
import './styles.css';

const DEG_TO_RAD = Math.PI / 180;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let astrolabeModel: AstrolabeModel;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let hoveredLayer: LayerState | null = null;

let currentConstellation: Constellation = 'UrsaMajor';
let currentDayOfYear: number = 80;
let currentTimeMinutes: number = 720;
let isDraggingLayer: boolean = false;
let draggedLayerId: string | null = null;
let isAutoDemoRunning: boolean = false;

const clock = new THREE.Clock();

function init() {
  const container = document.getElementById('scene-container')!;
  scene = new THREE.Scene();
  scene.background = null;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 6, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 20;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2 + 0.2;

  const ambientLight = new THREE.AmbientLight(0xf4e4c4, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe4a0, 0.9);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0xffc878, 0.4);
  rimLight.position.set(-5, 3, -5);
  scene.add(rimLight);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  astrolabeModel = new AstrolabeModel(starDataManager);
  scene.add(astrolabeModel.rootGroup);

  setupEventListeners();
  updateDatasetNote();
  updateTimeDisplays();
  updateStarRotation();
  drawProjectionPanel();
  updateCoordinatesDisplay();

  animate();
}

function setupEventListeners() {
  const container = document.getElementById('scene-container')!;

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointerleave', onPointerLeave);

  window.addEventListener('resize', onWindowResize);

  document.getElementById('dataset-select')!.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    starDataManager.setDataset(target.value);
    astrolabeModel.updateStarDataset();
    updateDatasetNote();
    drawProjectionPanel();
    updateCoordinatesDisplay();
  });

  document.querySelectorAll('.const-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.const-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentConstellation = (btn as HTMLElement).dataset.const as Constellation;
      drawProjectionPanel();
      updateCoordinatesDisplay();
    });
  });

  const dateSlider = document.getElementById('date-slider') as HTMLInputElement;
  const timeSlider = document.getElementById('time-slider') as HTMLInputElement;

  dateSlider.addEventListener('input', (e) => {
    currentDayOfYear = parseInt((e.target as HTMLInputElement).value);
    updateTimeDisplays();
    updateStarRotation();
    drawProjectionPanel();
    updateCoordinatesDisplay();
  });

  timeSlider.addEventListener('input', (e) => {
    currentTimeMinutes = parseInt((e.target as HTMLInputElement).value);
    updateTimeDisplays();
    updateStarRotation();
    drawProjectionPanel();
    updateCoordinatesDisplay();
  });

  document.getElementById('demo-btn')!.addEventListener('click', startAutoDemo);
  document.getElementById('export-btn')!.addEventListener('click', exportScreenshot);

  document.getElementById('hamburger-btn')!.addEventListener('click', () => {
    document.getElementById('control-panel')!.classList.toggle('open');
  });
}

function onPointerMove(event: PointerEvent) {
  const container = document.getElementById('scene-container')!;
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDraggingLayer && draggedLayerId) {
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(astrolabeModel.rootGroup.children, true);

  if (intersects.length > 0) {
    const layer = astrolabeModel.getLayerByIntersect(intersects[0]);
    if (layer) {
      if (hoveredLayer !== layer) {
        hoveredLayer = layer;
        astrolabeModel.selectLayer(layer.id);
        showLayerInfo(layer, event.clientX, event.clientY);
      } else {
        moveLayerInfo(event.clientX, event.clientY);
      }
      container.style.cursor = 'pointer';
    } else {
      clearHover();
    }
  } else {
    clearHover();
  }
}

function clearHover() {
  if (hoveredLayer && !isDraggingLayer) {
    hoveredLayer = null;
    astrolabeModel.selectLayer(null);
    hideLayerInfo();
  }
  document.getElementById('scene-container')!.style.cursor = 'grab';
}

function onPointerDown(event: PointerEvent) {
  if (hoveredLayer) {
    isDraggingLayer = true;
    draggedLayerId = hoveredLayer.id;
    controls.enabled = false;
  }
}

function onPointerUp() {
  if (isDraggingLayer && draggedLayerId) {
    const layer = astrolabeModel.layers.find((l) => l.id === draggedLayerId);
    if (layer) {
      if (layer.currentOffset < layer.separatedOffset / 2) {
        astrolabeModel.assembleLayer(layer.id, true);
      } else {
        astrolabeModel.separateLayer(layer.id, true);
      }
    }
  }
  isDraggingLayer = false;
  draggedLayerId = null;
  controls.enabled = true;
}

function onPointerLeave() {
  onPointerUp();
  clearHover();
}

function showLayerInfo(layer: LayerState, clientX: number, clientY: number) {
  const card = document.getElementById('layer-info-card')!;
  document.getElementById('layer-name')!.textContent = `${layer.name} / ${layer.nameEn}`;
  document.getElementById('layer-desc')!.textContent = layer.description;
  card.classList.remove('hidden');
  moveLayerInfo(clientX, clientY);
}

function moveLayerInfo(clientX: number, clientY: number) {
  const card = document.getElementById('layer-info-card')!;
  const padding = 16;
  let x = clientX + padding;
  let y = clientY + padding;
  const rect = card.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = clientX - rect.width - padding;
  if (y + rect.height > window.innerHeight) y = clientY - rect.height - padding;
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

function hideLayerInfo() {
  document.getElementById('layer-info-card')!.classList.add('hidden');
}

function updateDatasetNote() {
  const dataset = starDataManager.getCurrentDataset();
  document.getElementById('dataset-note')!.textContent = dataset.description;
}

function getDateFromDayOfYear(day: number): Date {
  const d = new Date(2024, 0, 1);
  d.setDate(day);
  return d;
}

function formatDate(day: number): string {
  const d = getDateFromDayOfYear(day);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function updateTimeDisplays() {
  document.getElementById('date-label')!.textContent = formatDate(currentDayOfYear);
  document.getElementById('time-label')!.textContent = formatTime(currentTimeMinutes);
}

function updateStarRotation() {
  const date = getDateFromDayOfYear(currentDayOfYear);
  const timeHours = currentTimeMinutes / 60;
  astrolabeModel.updateRotation(date, timeHours);
}

function drawProjectionPanel() {
  const canvas = document.getElementById('projection-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 12;

  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#c9a84c';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1;
  for (let dec = 0; dec <= 90; dec += 15) {
    const r = R * (1 - dec / 95);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.globalAlpha = dec === 0 ? 0.9 : dec === 90 ? 0.9 : 0.35;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.3;
  for (let ra = 0; ra < 360; ra += 15) {
    const angle = (ra * Math.PI) / 180 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let ra = 0; ra < 360; ra += 60) {
    const angle = (ra * Math.PI) / 180 - Math.PI / 2;
    const x = cx + Math.cos(angle) * (R + 8);
    const y = cy + Math.sin(angle) * (R + 8);
    ctx.fillStyle = '#c9a84c';
    ctx.globalAlpha = 0.7;
    ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${ra}°`, x, y);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#e8c96a';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a84c';
  ctx.globalAlpha = 0.7;
  ctx.font = '10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('NCP', cx, cy + R + 20);
  ctx.globalAlpha = 1;

  const date = getDateFromDayOfYear(currentDayOfYear);
  const timeHours = currentTimeMinutes / 60;
  const stars = starDataManager.getConstellationStars(currentConstellation);

  stars.forEach((star: Star) => {
    const coords = starDataManager.calculateStarPosition(star, date, timeHours);
    if (coords.altitude > -5) {
      const visibleAlt = Math.max(0, coords.altitude);
      const r = R * (1 - visibleAlt / 95);
      const az = (coords.azimuth * Math.PI) / 180 - Math.PI / 2;
      const x = cx + Math.cos(az) * r;
      const y = cy + Math.sin(az) * r;
      const size = Math.max(2, 6 - star.magnitude * 0.8);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      gradient.addColorStop(0, 'rgba(232, 201, 106, 0.8)');
      gradient.addColorStop(1, 'rgba(232, 201, 106, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe8a8';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c9a84c';
      ctx.font = '10px Georgia';
      ctx.textAlign = 'left';
      ctx.fillText(star.nameZh, x + size + 3, y - size);
    }
  });
}

function updateCoordinatesDisplay() {
  const date = getDateFromDayOfYear(currentDayOfYear);
  const timeHours = currentTimeMinutes / 60;
  const stars = starDataManager.getConstellationStars(currentConstellation);
  const sidereal = starDataManager.getSiderealTime(date, timeHours);

  document.getElementById('coord-date')!.textContent = formatDate(currentDayOfYear);
  document.getElementById('coord-time')!.textContent = formatTime(currentTimeMinutes);
  document.getElementById('coord-ha')!.textContent = `${sidereal.toFixed(1)}°`;

  const container = document.getElementById('stars-coords')!;
  container.innerHTML = '';
  stars.forEach((star) => {
    const coords = starDataManager.calculateStarPosition(star, date, timeHours);
    const item = document.createElement('div');
    item.className = 'star-coord-item';
    item.innerHTML = `
      <div class="star-name">${star.nameZh} (${star.name})</div>
      <div class="star-values">
        <span>高度: ${coords.altitude.toFixed(1)}°</span>
        <span>方位: ${coords.azimuth.toFixed(1)}°</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function startAutoDemo() {
  if (isAutoDemoRunning) return;
  isAutoDemoRunning = true;

  const demoBtn = document.getElementById('demo-btn') as HTMLButtonElement;
  demoBtn.disabled = true;
  demoBtn.textContent = '演示中...';

  astrolabeModel.separateAll(true);

  setTimeout(() => {
    astrolabeModel.assembleAll(true).then(() => {
      runDayNightCycle().then(() => {
        isAutoDemoRunning = false;
        demoBtn.disabled = false;
        demoBtn.textContent = '自动演示';
      });
    });
  }, 1500);
}

function runDayNightCycle(): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const duration = 15000;
    const startMinutes = 720;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      currentTimeMinutes = (startMinutes + progress * 1440) % 1440;
      (document.getElementById('time-slider') as HTMLInputElement).value = String(Math.floor(currentTimeMinutes));
      updateTimeDisplays();
      updateStarRotation();
      drawProjectionPanel();
      updateCoordinatesDisplay();

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    tick();
  });
}

function exportScreenshot() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8d5a3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.onload = () => {
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.92;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    ctx.fillStyle = 'rgba(90, 62, 43, 0.85)';
    ctx.font = 'bold 36px Georgia';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('星辰仪·历史星图模拟器', 40, 40);

    ctx.font = '22px Georgia';
    ctx.fillStyle = 'rgba(90, 62, 43, 0.75)';
    const date = getDateFromDayOfYear(currentDayOfYear);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${formatTime(currentTimeMinutes)}`;
    const dataset = starDataManager.getCurrentDataset();
    ctx.fillText(`${dataset.name} · 公元${dataset.year}年`, 40, 90);
    ctx.fillText(`观测: ${formatDate(currentDayOfYear)} ${formatTime(currentTimeMinutes)}`, 40, 124);

    ctx.fillStyle = 'rgba(90, 62, 43, 0.6)';
    ctx.font = '16px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, canvas.width - 40, canvas.height - 40);

    const finalDataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `astrolabe-${Date.now()}.png`;
    link.href = finalDataURL;
    link.click();
  };
  img.src = dataURL;
}

function onWindowResize() {
  const container = document.getElementById('scene-container')!;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  drawProjectionPanel();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update();
  astrolabeModel.update(delta);

  if (isDraggingLayer && draggedLayerId) {
    const layer = astrolabeModel.layers.find((l) => l.id === draggedLayerId);
    if (layer) {
      const dragDistance = THREE.MathUtils.clamp(-mouse.y * 4, 0, layer.separatedOffset * 1.1);
      layer.targetOffset = dragDistance;
    }
  }

  renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
