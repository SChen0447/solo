import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { Nebula, ColorTheme } from './nebula';
import './styles.css';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let nebula: Nebula;
let pane: Pane;
let clock: THREE.Clock;
let animationId: number;

const PARAMS = {
  particleCount: 10000,
  particleSize: 0.6,
  rotationSpeed: 0.001,
  hueShift: 0,
  colorTheme: 'default' as ColorTheme
};

let frameCount = 0;
let lastFpsUpdate = 0;
let fpsWarningTimeout: number | null = null;
let particleCountBinding: any;

function init(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 35);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a1a, 1);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 10;
  controls.maxDistance = 100;

  nebula = new Nebula({
    particleCount: PARAMS.particleCount,
    particleSize: PARAMS.particleSize,
    rotationSpeed: PARAMS.rotationSpeed,
    hueShift: PARAMS.hueShift,
    colorTheme: PARAMS.colorTheme
  });
  scene.add(nebula.group);

  clock = new THREE.Clock();
  lastFpsUpdate = performance.now();

  initTweakpane();
  initEventListeners();
  initResponsivePanel();
  animate();
}

function initTweakpane(): void {
  const container = document.getElementById('param-panel')!;
  pane = new Pane({
    container,
    title: '星云参数控制面板'
  });

  particleCountBinding = pane.addBinding(PARAMS, 'particleCount', {
    label: '粒子数量',
    min: 5000,
    max: 20000,
    step: 1000
  });
  particleCountBinding.on('change', (ev: any) => {
    nebula.updateParticleCount(ev.value);
  });

  pane.addBinding(PARAMS, 'particleSize', {
    label: '粒子大小',
    min: 0.1,
    max: 1.5,
    step: 0.05
  }).on('change', (ev: any) => {
    nebula.updateParticleSize(ev.value);
  });

  pane.addBinding(PARAMS, 'rotationSpeed', {
    label: '旋转速度',
    min: 0.0005,
    max: 0.005,
    step: 0.0001
  }).on('change', (ev: any) => {
    nebula.updateRotationSpeed(ev.value);
  });

  pane.addBinding(PARAMS, 'hueShift', {
    label: '色相偏移',
    min: 0,
    max: 360,
    step: 1
  }).on('change', (ev: any) => {
    nebula.updateHueShift(ev.value);
  });

  pane.addBinding(PARAMS, 'colorTheme', {
    label: '颜色主题',
    options: {
      '默认': 'default',
      '蓝紫': 'bluePurple',
      '红粉': 'redPink',
      '绿紫': 'greenPurple'
    }
  }).on('change', (ev: any) => {
    nebula.updateColorTheme(ev.value);
  });
}

function initEventListeners(): void {
  window.addEventListener('resize', onWindowResize);

  const canvas = document.getElementById('scene')!;
  canvas.addEventListener('dblclick', toggleFullscreen);

  controls.addEventListener('change', () => {
    const distance = camera.position.length();
    const baseDistance = 35;
    const scaleFactor = distance / baseDistance;
    nebula.updateCameraDistanceScale(scaleFactor);
  });
}

function initResponsivePanel(): void {
  const panelToggle = document.getElementById('panel-toggle')!;
  const paramPanel = document.getElementById('param-panel')!;

  const checkMobile = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      panelToggle.classList.remove('hidden');
      paramPanel.classList.add('mobile-hidden');
    } else {
      panelToggle.classList.add('hidden');
      paramPanel.classList.remove('mobile-hidden');
    }
  };

  panelToggle.addEventListener('click', () => {
    paramPanel.classList.toggle('mobile-hidden');
  });

  window.addEventListener('resize', checkMobile);
  checkMobile();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function updateFps(currentTime: number): void {
  frameCount++;
  const elapsed = currentTime - lastFpsUpdate;

  if (elapsed >= 1000) {
    const fps = Math.round((frameCount * 1000) / elapsed);
    const fpsValueEl = document.getElementById('fps-value')!;
    fpsValueEl.textContent = String(fps);

    if (fps < 30) {
      handleLowFps();
    }

    frameCount = 0;
    lastFpsUpdate = currentTime;
  }
}

function handleLowFps(): void {
  const warningEl = document.getElementById('fps-warning')!;
  warningEl.classList.remove('hidden');

  if (fpsWarningTimeout) {
    clearTimeout(fpsWarningTimeout);
  }

  const newCount = Math.max(5000, Math.floor(PARAMS.particleCount * 0.9));
  if (newCount !== PARAMS.particleCount) {
    PARAMS.particleCount = newCount;
    nebula.updateParticleCount(newCount);
    if (particleCountBinding) {
      particleCountBinding.refresh();
    }
  }

  fpsWarningTimeout = window.setTimeout(() => {
    warningEl.classList.add('hidden');
  }, 2000);
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const currentTime = performance.now();

  controls.update();
  nebula.update(deltaTime);
  updateFps(currentTime);

  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  nebula.dispose();
  controls.dispose();
  renderer.dispose();
  pane.dispose();
}

window.addEventListener('beforeunload', dispose);

init();
