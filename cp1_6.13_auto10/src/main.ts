import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildScene, type BuildingData, type SceneBuildResult } from './sceneBuilder';
import { ShadowEngine } from './shadowEngine';

// ===================== 全局状态 =====================
const state = {
  scene: null as unknown as THREE.Scene,
  camera: null as unknown as THREE.PerspectiveCamera,
  renderer: null as unknown as THREE.WebGLRenderer,
  controls: null as unknown as OrbitControls,
  sceneBuildResult: null as unknown as SceneBuildResult,
  shadowEngine: null as unknown as ShadowEngine,
  selectedBuilding: null as BuildingData | null,
  selectedEdges: null as THREE.LineSegments | null,
  isAutoPlaying: false,
  autoStartTime: 0,
  autoStartMinutes: 360,
  currentTimeMinutes: 720,
  lastFrameTime: performance.now(),
  frameCount: 0,
  fpsTimer: 0,
  animatingInfoValues: new Set<string>()
};

// ===================== DOM 引用 =====================
const dom = {
  container: () => document.getElementById('canvas-container')!,
  timeSlider: () => document.getElementById('time-slider') as HTMLInputElement,
  timeCurrent: () => document.getElementById('time-current')!,
  autoBtn: () => document.getElementById('auto-btn') as HTMLButtonElement,
  autoBtnText: () => document.getElementById('auto-btn-text')!,
  autoBtnIcon: () => document.querySelector('#auto-btn .btn-icon') as HTMLElement,
  infoPanel: () => document.getElementById('info-panel') as HTMLDivElement,
  infoTitle: () => document.getElementById('info-title')!,
  infoId: () => document.getElementById('info-id') as HTMLSpanElement,
  infoHeight: () => document.getElementById('info-height') as HTMLSpanElement,
  infoArea: () => document.getElementById('info-area') as HTMLSpanElement,
  infoShadowPct: () => document.getElementById('info-shadow-pct') as HTMLSpanElement,
  shadowBarFill: () => document.getElementById('shadow-bar-fill') as HTMLDivElement,
  fpsCounter: () => document.getElementById('fps-counter')!
};

// ===================== 工具函数 =====================
function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function animateInfoValue(el: HTMLElement, id: string): void {
  if (state.animatingInfoValues.has(id)) return;
  state.animatingInfoValues.add(id);
  el.classList.remove('animating');
  void el.offsetWidth;
  el.classList.add('animating');
  setTimeout(() => {
    state.animatingInfoValues.delete(id);
    el.classList.remove('animating');
  }, 320);
}

// ===================== Three.js 初始化 =====================
function initThree(): void {
  const container = dom.container();
  const width = container.clientWidth;
  const height = container.clientHeight;

  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x1a1a2e);
  state.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.0015);

  state.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  state.camera.position.set(220, 200, 280);
  state.camera.lookAt(0, 25, 0);

  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(width, height);
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.1;
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(state.renderer.domElement);

  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.08;
  state.controls.minDistance = 60;
  state.controls.maxDistance = 700;
  state.controls.maxPolarAngle = Math.PI * 0.48;
  state.controls.target.set(0, 15, 0);
  state.controls.update();
}

// ===================== 环境光 =====================
function setupAmbientLights(): void {
  const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x222244, 0.55);
  state.scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.35);
  state.scene.add(ambientLight);

  const fillLight = new THREE.DirectionalLight(0x99aaff, 0.3);
  fillLight.position.set(-200, 150, -100);
  state.scene.add(fillLight);
}

// ===================== 建筑群初始化 =====================
function initBuildings(): void {
  state.sceneBuildResult = buildScene({
    buildingCount: { min: 8, max: 12 },
    heightRange: { min: 10, max: 60 },
    groundSize: 400,
    spreadRange: 260,
    seed: 20260113
  });

  const group = new THREE.Group();
  group.add(state.sceneBuildResult.ground);
  group.add(state.sceneBuildResult.gridHelper);
  state.sceneBuildResult.buildings.forEach(b => group.add(b.mesh));
  state.scene.add(group);
}

// ===================== 阴影引擎初始化 =====================
function initShadowEngine(): void {
  const maxHeight = state.sceneBuildResult.buildings.reduce(
    (max, b) => Math.max(max, b.height),
    0
  );

  state.shadowEngine = new ShadowEngine(state.scene, {
    groundSize: state.sceneBuildResult.groundSize,
    maxBuildingHeight: maxHeight,
    shadowMapSize: 2048,
    sunOrbitRadius: 480,
    latitude: 38
  });

  state.shadowEngine.setTime(state.currentTimeMinutes, true);
}

// ===================== 选中建筑高亮 =====================
function selectBuilding(building: BuildingData | null): void {
  if (state.selectedEdges) {
    state.scene.remove(state.selectedEdges);
    state.selectedEdges.geometry.dispose();
    (state.selectedEdges.material as THREE.Material).dispose();
    state.selectedEdges = null;
  }

  state.selectedBuilding = building;

  if (building) {
    const edgeGeometry = new THREE.EdgesGeometry(building.mesh.geometry, 15);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffdd00,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(building.mesh.position);
    edges.quaternion.copy(building.mesh.quaternion);
    edges.scale.copy(building.mesh.scale);
    edges.renderOrder = 999;
    state.scene.add(edges);
    state.selectedEdges = edges;

    updateInfoPanel(building);
    dom.infoPanel().classList.add('visible');
  } else {
    dom.infoPanel().classList.remove('visible');
  }
}

// ===================== 信息面板更新 =====================
function updateInfoPanel(building: BuildingData): void {
  const pct = state.shadowEngine.estimateShadowCoveragePct(
    building,
    state.renderer,
    state.camera
  );

  dom.infoTitle().textContent = `建筑 #${building.index + 1} 详情`;

  dom.infoId().textContent = `#${String(building.index + 1).padStart(2, '0')}`;
  animateInfoValue(dom.infoId(), 'id');

  dom.infoHeight().textContent = `${building.height.toFixed(1)} m`;
  animateInfoValue(dom.infoHeight(), 'height');

  dom.infoArea().textContent = `${building.footprint.toFixed(1)} ㎡`;
  animateInfoValue(dom.infoArea(), 'area');

  dom.infoShadowPct().textContent = `${pct.toFixed(1)}%`;
  animateInfoValue(dom.infoShadowPct(), 'shadow');

  dom.shadowBarFill().style.width = `${Math.min(100, pct)}%`;
}

function refreshInfoPanelIfNeeded(): void {
  if (state.selectedBuilding) {
    updateInfoPanel(state.selectedBuilding);
  }
}

// ===================== 点击检测 =====================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handleClick(event: PointerEvent): void {
  const rect = state.renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, state.camera);
  const meshes = state.sceneBuildResult.buildings.map(b => b.mesh);
  const hits = raycaster.intersectObjects(meshes, false);

  if (hits.length > 0) {
    const hitMesh = hits[0].object as THREE.Mesh;
    const idx = hitMesh.userData.buildingIndex as number;
    const building = state.sceneBuildResult.buildings[idx];
    if (building) {
      selectBuilding(building);
      return;
    }
  }

  const groundHits = raycaster.intersectObject(state.sceneBuildResult.ground, false);
  if (groundHits.length > 0) {
    selectBuilding(null);
  }
}

// ===================== 时间控制 =====================
function setTimeValue(minutes: number, force: boolean = false): void {
  state.currentTimeMinutes = minutes;
  dom.timeSlider().value = String(minutes);
  dom.timeCurrent().textContent = minutesToTimeString(minutes);
  dom.timeCurrent().classList.remove('animating');
  void dom.timeCurrent().offsetWidth;
  dom.timeCurrent().classList.add('animating');

  const updated = state.shadowEngine.setTime(minutes, force);
  if (updated) {
    refreshInfoPanelIfNeeded();
  }
}

function onTimeSliderInput(e: Event): void {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  setTimeValue(val, false);
}

function onTimeSliderChange(e: Event): void {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  setTimeValue(val, true);
}

// ===================== 自动演示 =====================
function toggleAutoPlay(): void {
  state.isAutoPlaying = !state.isAutoPlaying;
  const btn = dom.autoBtn();
  const icon = dom.autoBtnIcon();
  const text = dom.autoBtnText();

  if (state.isAutoPlaying) {
    state.autoStartTime = performance.now();
    state.autoStartMinutes = state.currentTimeMinutes;
    btn.classList.add('playing');
    icon.className = 'btn-icon pause';
    text.textContent = '暂停演示';
  } else {
    btn.classList.remove('playing');
    icon.className = 'btn-icon play';
    text.textContent = '自动演示';
  }
}

function updateAutoPlay(now: number): void {
  if (!state.isAutoPlaying) return;

  const elapsed = (now - state.autoStartTime) / 1000;
  const totalSpan = 1080 - 360;
  const speed = 720 / 45;
  let minutes = state.autoStartMinutes + elapsed * speed;

  if (minutes >= 1080) {
    minutes = 360 + (minutes - 1080);
    state.autoStartMinutes = 360;
    state.autoStartTime = now;
  }

  minutes = Math.floor(minutes / 1) * 1;
  if (Math.abs(minutes - state.currentTimeMinutes) >= 0.5) {
    setTimeValue(minutes, false);
  }
}

// ===================== FPS 计算 =====================
function updateFPS(now: number): void {
  state.frameCount++;
  if (now - state.fpsTimer >= 500) {
    const elapsed = (now - state.fpsTimer) / 1000;
    const fps = Math.round(state.frameCount / elapsed);
    dom.fpsCounter().textContent = `FPS: ${fps}`;
    state.frameCount = 0;
    state.fpsTimer = now;
  }
}

// ===================== 主循环 =====================
function animateLoop(now: number): void {
  requestAnimationFrame(animateLoop);

  updateAutoPlay(now);
  updateFPS(now);
  state.controls.update();

  if (state.selectedEdges && state.selectedBuilding) {
    state.selectedEdges.position.copy(state.selectedBuilding.mesh.position);
    state.selectedEdges.quaternion.copy(state.selectedBuilding.mesh.quaternion);
    state.selectedEdges.scale.copy(state.selectedBuilding.mesh.scale);
  }

  state.renderer.render(state.scene, state.camera);
  state.lastFrameTime = now;
}

// ===================== 响应式 Resize =====================
function onWindowResize(): void {
  const container = dom.container();
  const width = container.clientWidth;
  const height = container.clientHeight;

  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height);
}

// ===================== 启动 =====================
function bindEvents(): void {
  dom.timeSlider().addEventListener('input', onTimeSliderInput);
  dom.timeSlider().addEventListener('change', onTimeSliderChange);
  dom.autoBtn().addEventListener('click', toggleAutoPlay);
  state.renderer.domElement.addEventListener('pointerdown', handleClick);
  window.addEventListener('resize', onWindowResize);
}

function bootstrap(): void {
  initThree();
  setupAmbientLights();
  initBuildings();
  initShadowEngine();
  bindEvents();

  dom.timeCurrent().textContent = minutesToTimeString(state.currentTimeMinutes);
  state.fpsTimer = performance.now();
  state.lastFrameTime = performance.now();

  requestAnimationFrame(animateLoop);

  setTimeout(() => {
    state.shadowEngine.forceShadowUpdate();
  }, 200);
}

document.addEventListener('DOMContentLoaded', bootstrap);

export { state, dom };
