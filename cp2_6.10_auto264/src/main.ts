import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GardenScene } from './GardenScene';
import { InsectType } from './InsectBase';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let garden: GardenScene;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let selectedFlowerId: string | null = null;
let sortDescending: boolean = true;
let replayMode: boolean = false;
let replayMarkers: THREE.Object3D[] = [];
let statsPanel: HTMLDivElement | null = null;
let frameCount: number = 0;
let lastFpsUpdate: number = performance.now();
let currentFps: number = 60;

function init() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1b2a);
  scene.fog = new THREE.Fog(0x0d1b2a, 15, 35);

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  const angle = (45 * Math.PI) / 180;
  camera.position.set(
    Math.cos(angle) * 8 * Math.sin(Math.PI / 4),
    8 * Math.cos(Math.PI / 4),
    Math.sin(angle) * 8 * Math.sin(Math.PI / 4)
  );
  camera.lookAt(0, 0.5, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.target.set(0, 0.5, 0);
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(8, 12, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -12;
  dirLight.shadow.camera.right = 12;
  dirLight.shadow.camera.top = 12;
  dirLight.shadow.camera.bottom = -12;
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x224422, 0.3);
  scene.add(hemiLight);

  garden = new GardenScene(scene);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupStatsPanel();
  bindUI();
  bindEvents();

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  animate();
}

function setupStatsPanel() {
  statsPanel = document.createElement('div');
  statsPanel.style.position = 'absolute';
  statsPanel.style.bottom = '80px';
  statsPanel.style.left = '20px';
  statsPanel.style.color = 'rgba(255,255,255,0.5)';
  statsPanel.style.fontSize = '11px';
  statsPanel.style.fontFamily = 'Arial, Helvetica, sans-serif';
  statsPanel.style.zIndex = '10';
  statsPanel.style.pointerEvents = 'none';
  document.getElementById('app')?.appendChild(statsPanel);
}

function bindUI() {
  document.querySelectorAll('[data-insect]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-insect]').forEach(b => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      const type = (e.currentTarget as HTMLElement).dataset.insect as InsectType;
      garden.setSelectedInsectType(type);
    });
  });

  document.getElementById('release-btn')?.addEventListener('click', () => {
    garden.releaseInsect();
  });

  document.getElementById('clear-insects-btn')?.addEventListener('click', () => {
    garden.clearInsects();
    clearReplayMarkers();
  });

  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  speedSlider?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (speedValue) speedValue.textContent = val.toFixed(1) + 'x';
    garden.setGlobalParams({ speed: val });
  });

  const straightSlider = document.getElementById('straight-slider') as HTMLInputElement;
  const straightValue = document.getElementById('straight-value');
  straightSlider?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (straightValue) straightValue.textContent = val + '%';
    garden.setGlobalParams({ straightProbability: val });
  });

  const turnSlider = document.getElementById('turn-slider') as HTMLInputElement;
  const turnValue = document.getElementById('turn-value');
  turnSlider?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (turnValue) turnValue.textContent = val.toFixed(2);
    garden.setGlobalParams({ turnSensitivity: val });
  });

  const pollenSlider = document.getElementById('pollen-slider') as HTMLInputElement;
  const pollenValue = document.getElementById('pollen-value');
  pollenSlider?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (pollenValue) pollenValue.textContent = val.toFixed(1) + 'x';
    garden.setEnvironment({ pollenDensity: val });
  });

  const flowerCountSlider = document.getElementById('flower-count-slider') as HTMLInputElement;
  const flowerCountValue = document.getElementById('flower-count-value');
  flowerCountSlider?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (flowerCountValue) flowerCountValue.textContent = val.toString();
    garden.setEnvironment({ flowerCount: val });
    selectedFlowerId = null;
  });

  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const windValue = document.getElementById('wind-value');
  windSlider?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (windValue) windValue.textContent = val + '级';
    garden.setEnvironment({ windStrength: val });
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    garden.reset();
    selectedFlowerId = null;
    clearReplayMarkers();
    updateStatsUI();
  });

  document.getElementById('sort-btn')?.addEventListener('click', (e) => {
    sortDescending = !sortDescending;
    (e.currentTarget as HTMLElement).textContent = sortDescending ? '按次数↓' : '按次数↑';
    updateStatsUI();
  });

  document.getElementById('replay-btn')?.addEventListener('click', () => {
    toggleReplay();
  });

  document.getElementById('snapshot-btn')?.addEventListener('click', takeSnapshot);
  document.getElementById('export-btn')?.addEventListener('click', exportTrails);
}

function bindEvents() {
  window.addEventListener('resize', onWindowResize);

  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  window.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') takeSnapshot();
    if (e.key === 'e' || e.key === 'E') exportTrails();
  });
}

function onPointerDown(event: PointerEvent) {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (event.button === 2) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  const flower = garden.pickFlower(intersects);
  if (flower) {
    if (selectedFlowerId === flower.id) {
      if (flower.attractionLevel === 'high') {
        garden.setFlowerLowAttraction(flower.id);
      } else if (flower.attractionLevel === 'low') {
        selectedFlowerId = null;
      } else {
        garden.setFlowerHighAttraction(flower.id);
      }
    } else {
      selectedFlowerId = flower.id;
      garden.setFlowerHighAttraction(flower.id);
    }
    updateStatsUI();
  }
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function updateStatsUI() {
  updateColorChart();
  updateFlowerList();
}

function updateColorChart() {
  const dist = garden.getColorDistribution();
  const max = Math.max(1, ...Object.values(dist));
  const colors: Array<{ key: string; bg: string; label: string }> = [
    { key: 'red', bg: '#e74c3c', label: '红' },
    { key: 'yellow', bg: '#f1c40f', label: '黄' },
    { key: 'purple', bg: '#9b59b6', label: '紫' },
    { key: 'blue', bg: '#3498db', label: '蓝' }
  ];
  const chart = document.getElementById('color-chart');
  if (!chart) return;
  const items = chart.querySelectorAll('.chart-bar-item');
  items.forEach((item, idx) => {
    const c = colors[idx];
    const val = dist[c.key] || 0;
    const h = Math.max(5, (val / max) * 100);
    (item as HTMLElement).style.height = h + '%';
    (item as HTMLElement).style.background = c.bg;
    const valueEl = item.querySelector('.chart-bar-value');
    if (valueEl) valueEl.textContent = val.toString();
    const labelEl = item.querySelector('.chart-bar-label');
    if (labelEl) labelEl.textContent = c.label;
  });
}

function updateFlowerList() {
  const listEl = document.getElementById('flower-list');
  if (!listEl) return;

  let stats = garden.getFlowerVisitStats();
  const maxCount = Math.max(1, ...stats.map(s => s.visitedCount));

  stats.sort((a, b) => sortDescending
    ? b.visitedCount - a.visitedCount
    : a.visitedCount - b.visitedCount
  );

  const colorMap: Record<string, string> = {
    red: '#e74c3c', yellow: '#f1c40f', purple: '#9b59b6', blue: '#3498db'
  };
  const colorLabelMap: Record<string, string> = {
    red: '红', yellow: '黄', purple: '紫', blue: '蓝'
  };

  listEl.innerHTML = stats.map(s => {
    const ratio = s.visitedCount / maxCount;
    const timeStr = s.lastVisitedAt > 0
      ? new Date(s.lastVisitedAt).toLocaleTimeString('zh-CN', { hour12: false })
      : '—';
    const isSelected = selectedFlowerId === s.id;
    const attractionLabel = s.attractionLevel === 'high' ? '★高' : s.attractionLevel === 'low' ? '低' : '';
    return `
      <div class="flower-item ${isSelected ? 'selected' : ''}" data-flower-id="${s.id}">
        <div class="flower-info">
          <span>
            <span class="color-dot" style="background:${colorMap[s.colorName]}"></span>
            ${colorLabelMap[s.colorName]}花
            ${attractionLabel ? `<span style="color:${s.attractionLevel === 'high' ? '#ff6b6b' : '#888'}">${attractionLabel}</span>` : ''}
          </span>
          <span style="font-weight:bold; color:${ratio > 0.5 ? '#2ecc71' : ratio > 0.2 ? '#f1c40f' : '#e74c3c'}">${s.visitedCount}</span>
        </div>
        <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:2px;">最后访问: ${timeStr}</div>
        <div class="progress-bar">
          <div class="progress-fill ${ratio > 0.5 ? 'high' : 'low'}" style="width:${ratio * 100}%"></div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.flower-item').forEach(el => {
    el.addEventListener('click', () => {
      const fid = (el as HTMLElement).dataset.flowerId;
      if (!fid) return;
      if (selectedFlowerId === fid) {
        const f = garden.flowers.find(ff => ff.id === fid);
        if (f) {
          if (f.attractionLevel === 'high') {
            garden.setFlowerLowAttraction(fid);
          } else {
            selectedFlowerId = null;
          }
        }
      } else {
        selectedFlowerId = fid;
        garden.setFlowerHighAttraction(fid);
      }
      updateStatsUI();
    });
  });
}

function toggleReplay() {
  if (replayMode) {
    clearReplayMarkers();
    replayMode = false;
    return;
  }
  replayMode = true;
  clearReplayMarkers();

  const replays = garden.replayLastVisits();
  if (replays.length === 0) {
    replayMode = false;
    return;
  }

  for (const rep of replays) {
    for (let i = 0; i < rep.visits.length; i++) {
      const visit = rep.visits[i];
      const flower = garden.flowers.find(f => f.id === visit.flowerId);
      if (!flower) continue;

      const isStart = i === 0;
      const isEnd = i === rep.visits.length - 1;
      const markerColor = isStart ? 0xcd7f32 : isEnd ? 0xb8860b : 0xdaa520;
      const markerSize = isStart || isEnd ? 0.22 : 0.12;

      const markerGeo = new THREE.SphereGeometry(markerSize, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.9
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(flower.center);
      if (isStart || isEnd) {
        marker.position.y += 0.3;
        const ringGeo = new THREE.RingGeometry(markerSize * 1.2, markerSize * 1.6, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: markerColor,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(marker.position);
        ring.position.y -= 0.01;
        scene.add(ring);
        replayMarkers.push(ring);
      }
      scene.add(marker);
      replayMarkers.push(marker);
    }
  }
}

function clearReplayMarkers() {
  for (const m of replayMarkers) {
    scene.remove(m);
    if (m instanceof THREE.Mesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }
  replayMarkers = [];
}

function takeSnapshot() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `insect-garden-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}

function exportTrails() {
  const data = {
    exportedAt: new Date().toISOString(),
    insects: [] as any[]
  };
  const recent = (garden as any).recentInsects || [];
  for (const insect of recent) {
    data.insects.push({
      id: insect.id,
      type: insect.type,
      visitHistory: insect.visitHistory.map((v: any) => ({
        flowerId: v.flowerId,
        timestamp: new Date(v.timestamp).toISOString(),
        duration: v.duration,
        flowerColor: garden.flowers.find((f: any) => f.id === v.flowerId)?.colorName || null
      }))
    });
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `insect-trails-${Date.now()}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  garden.update(dt);
  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 500) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
    if (statsPanel) {
      const totalPts = garden.getTotalTrailPoints();
      statsPanel.textContent = `FPS: ${currentFps} | 昆虫: ${garden.insects.length} | 轨迹点: ${totalPts}${garden['downsampling'] ? ' (降采样)' : ''}`;
    }
    updateStatsUI();
  }
}

window.addEventListener('DOMContentLoaded', init);
