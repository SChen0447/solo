import * as THREE from 'three';
import {
  createVisualizer,
  updateVisualizer,
  setMode,
  VisualizerMode
} from './visualizer';
import {
  initAudio,
  startMicrophone,
  startAudioFile,
  startTestTone,
  getFrequencyData
} from './audio';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let canvasContainer: HTMLElement;
let spectrumCanvas: HTMLCanvasElement;
let spectrumCtx: CanvasRenderingContext2D;
let audioModal: HTMLElement;
let fileInput: HTMLInputElement;

let mouseNDC = new THREE.Vector2();
let mouseWorldPos = new THREE.Vector3();
let mouseActive = false;
let raycaster = new THREE.Raycaster();
let plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

let lastTime = 0;
let testToneTimer: number | null = null;
let autoStartTestTone = true;

const ASPECT_RATIO = 16 / 9;
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;

function init(): void {
  canvasContainer = document.getElementById('canvas-container')!;
  spectrumCanvas = document.getElementById('spectrum-canvas') as HTMLCanvasElement;
  spectrumCtx = spectrumCanvas.getContext('2d')!;
  audioModal = document.getElementById('audio-modal')!;
  fileInput = document.getElementById('file-input') as HTMLInputElement;

  initScene();
  initVisualizer();
  bindEvents();
  resize();

  void animate(0);
}

function initScene(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.035);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, 14);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  canvasContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const fillLight = new THREE.PointLight(0x4ecdc4, 0.8, 30);
  fillLight.position.set(-6, -4, -5);
  scene.add(fillLight);

  const accentLight = new THREE.PointLight(0xff6b6b, 0.6, 25);
  accentLight.position.set(6, 3, -3);
  scene.add(accentLight);
}

function initVisualizer(): void {
  createVisualizer(scene);
}

function bindEvents(): void {
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === '1') setMode('nebula');
    else if (e.key === '2') setMode('explode');
    else if (e.key === '3') setMode('sphere');
  });

  const canvas = renderer.domElement;

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    updateMousePosition(e.clientX, e.clientY);
    mouseActive = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseActive = false;
  });

  canvas.addEventListener('mousedown', () => {
    mouseActive = true;
  });

  canvas.addEventListener('mouseup', () => {
    mouseActive = false;
  });

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
      mouseActive = true;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
      mouseActive = true;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    mouseActive = false;
  });

  const btnMic = document.getElementById('btn-mic')!;
  const btnFile = document.getElementById('btn-file')!;
  const btnTest = document.getElementById('btn-test')!;

  btnMic.addEventListener('click', async () => {
    hideModal();
    cancelAutoStart();
    try {
      await startMicrophone();
    } catch (_) {
      startTestTone();
    }
  });

  btnFile.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      hideModal();
      cancelAutoStart();
      try {
        await startAudioFile(input.files[0]);
      } catch (_) {
        startTestTone();
      }
    }
  });

  btnTest.addEventListener('click', () => {
    hideModal();
    cancelAutoStart();
    startTestTone();
  });

  testToneTimer = window.setTimeout(() => {
    if (autoStartTestTone && audioModal.classList.contains('hidden') === false) {
      hideModal();
      startTestTone();
    }
  }, 15000);
}

function cancelAutoStart(): void {
  autoStartTestTone = false;
  if (testToneTimer !== null) {
    clearTimeout(testToneTimer);
    testToneTimer = null;
  }
}

function hideModal(): void {
  audioModal.classList.add('hidden');
}

function updateMousePosition(clientX: number, clientY: number): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(plane, mouseWorldPos);
}

function resize(): void {
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width < MIN_WIDTH) width = MIN_WIDTH;
  if (height < MIN_HEIGHT) height = MIN_HEIGHT;

  const windowRatio = width / height;
  let renderW = width;
  let renderH = height;

  if (windowRatio > ASPECT_RATIO) {
    renderW = height * ASPECT_RATIO;
  } else {
    renderH = width / ASPECT_RATIO;
  }

  camera.aspect = renderW / renderH;
  camera.updateProjectionMatrix();

  renderer.setSize(renderW, renderH);
  renderer.domElement.style.width = renderW + 'px';
  renderer.domElement.style.height = renderH + 'px';
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.left = ((width - renderW) / 2) + 'px';
  renderer.domElement.style.top = ((height - renderH) / 2) + 'px';

  const container = spectrumCanvas.parentElement;
  if (container) {
    const dpr = window.devicePixelRatio || 1;
    spectrumCanvas.width = container.clientWidth * dpr;
    spectrumCanvas.height = container.clientHeight * dpr;
    spectrumCanvas.style.width = container.clientWidth + 'px';
    spectrumCanvas.style.height = container.clientHeight + 'px';
    spectrumCtx.scale(dpr, dpr);
  }
}

function animate(time: number): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  const freqData = getFrequencyData();

  updateVisualizer(
    freqData,
    deltaTime,
    mouseActive ? mouseWorldPos : null,
    mouseActive
  );

  drawSpectrum(freqData);

  renderer.render(scene, camera);
}

function drawSpectrum(freqData: Uint8Array): void {
  const w = spectrumCanvas.clientWidth;
  const h = spectrumCanvas.clientHeight;
  const ctx = spectrumCtx;

  ctx.clearRect(0, 0, w, h);

  const barWidth = 3;
  const gap = 1;
  const totalBars = Math.floor(w / (barWidth + gap));
  const dataStep = Math.floor(freqData.length / totalBars);

  const startColor = { r: 255, g: 107, b: 107 };
  const endColor = { r: 78, g: 205, b: 196 };

  for (let i = 0; i < totalBars; i++) {
    const dataIndex = i * dataStep;
    let sum = 0;
    for (let j = 0; j < dataStep && dataIndex + j < freqData.length; j++) {
      sum += freqData[dataIndex + j];
    }
    const avg = sum / dataStep;
    const normalized = avg / 255;
    const barHeight = Math.max(2, normalized * h * 0.95);

    const t = i / totalBars;
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);

    const x = i * (barWidth + gap);
    const y = h - barHeight;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.shadowBlur = 6;

    const radius = barWidth / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + barHeight);
    ctx.lineTo(x + barWidth, y + barHeight);
    ctx.lineTo(x + barWidth, y + radius);
    ctx.arcTo(x + barWidth, y, x + barWidth - radius, y, radius);
    ctx.arcTo(x, y, x, y + radius, radius);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

initAudio();
init();
