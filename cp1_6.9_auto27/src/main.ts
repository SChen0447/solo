import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { Tornado, TornadoParams } from './tornado';

interface SimParams extends TornadoParams {}

const simParams: SimParams = {
  temperature: 30,
  humidity: 60,
  windSpeed: 12
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let tornado: Tornado;
let gui: GUI;

let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 60;
let performanceOptimized = false;

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 8, 20);
const DEFAULT_TARGET = new THREE.Vector3(0, 5, 0);
let cameraReturning = false;
let cameraReturnProgress = 0;
const CAMERA_RETURN_DURATION = 1.0;

let lastDissipateState = false;

const appContainer = document.getElementById('app') as HTMLDivElement;
const fpsValueEl = document.getElementById('fps-value') as HTMLSpanElement;
const optimizationBadgeEl = document.getElementById('optimization-badge') as HTMLSpanElement;

function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, 512, 512);

  const speckleColors = ['#2a4a1a', '#3a5a2a', '#4a3a1a', '#5a4a2a', '#2a3a1a'];
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = speckleColors[Math.floor(Math.random() * speckleColors.length)];
    ctx.globalAlpha = 0.3 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGradientBackground(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(500, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4a4a6e) },
      bottomColor: { value: new THREE.Color(0x2a2a3e) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color = mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.6), 0.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide
  });
  return new THREE.Mesh(geometry, material);
}

function initScene(): void {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(DEFAULT_CAMERA_POSITION);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  appContainer.appendChild(renderer.domElement);

  const sky = createGradientBackground();
  scene.add(sky);

  const groundTexture = createGroundTexture();
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.95,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();
}

function initTornado(): void {
  tornado = new Tornado();
  scene.add(tornado.getGroup());
}

function initGUI(): void {
  gui = new GUI({
    title: '🌪️ 龙卷风控制参数',
    container: appContainer
  });

  const isWide = window.innerWidth > 1200;
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '16px';
  gui.domElement.style.right = '16px';
  gui.domElement.style.zIndex = '1000';

  if (window.innerWidth < 800) {
    gui.close();
    gui.domElement.addEventListener('click', () => {
      gui.domElement.classList.toggle('open');
    });
  }

  const folder = gui.addFolder('大气参数');
  if (isWide) {
    folder.open();
  }

  folder.add(simParams, 'temperature', 20, 40, 1)
    .name('温度 (°C)')
    .onChange((value: number) => {
      tornado.setParams({ temperature: value });
    });

  folder.add(simParams, 'humidity', 30, 90, 5)
    .name('湿度 (%)')
    .onChange((value: number) => {
      tornado.setParams({ humidity: value });
    });

  folder.add(simParams, 'windSpeed', 5, 20, 1)
    .name('风速 (m/s)')
    .onChange((value: number) => {
      tornado.setParams({ windSpeed: value });
    });
}

function updateFpsCounter(time: number): void {
  frameCount++;
  if (time - lastFpsTime >= 1.0) {
    currentFps = frameCount / (time - lastFpsTime);
    frameCount = 0;
    lastFpsTime = time;

    fpsValueEl.textContent = `FPS: ${currentFps.toFixed(0)}`;

    if (currentFps < 30 && !performanceOptimized) {
      performanceOptimized = true;
      tornado.setPerformanceOptimized(true);
      optimizationBadgeEl.style.display = 'inline';
    } else if (currentFps >= 35 && performanceOptimized) {
      performanceOptimized = false;
      tornado.setPerformanceOptimized(false);
      optimizationBadgeEl.style.display = 'none';
    }
  }
}

function startCameraReturn(): void {
  if (!cameraReturning) {
    cameraReturning = true;
    cameraReturnProgress = 0;
  }
}

function updateCameraReturn(deltaTime: number): void {
  if (!cameraReturning) return;

  cameraReturnProgress += deltaTime / CAMERA_RETURN_DURATION;
  const t = Math.min(1, cameraReturnProgress);
  const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const targetPos = DEFAULT_CAMERA_POSITION.clone();
  const targetTarget = tornado.getCenter();

  camera.position.lerpVectors(startPos, targetPos, easeT);
  controls.target.lerpVectors(startTarget, targetTarget, easeT);

  if (t >= 1) {
    cameraReturning = false;
  }
}

function handleWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  const deltaTime = Math.min(clock.getDelta(), 0.1);

  updateFpsCounter(elapsedTime);

  tornado.update(elapsedTime, deltaTime);

  const currentPhase = tornado.getLifecyclePhase();
  const isDissipating = currentPhase === 'dissipating';
  if (isDissipating && !lastDissipateState) {
    startCameraReturn();
  }
  lastDissipateState = isDissipating;

  updateCameraReturn(deltaTime);

  if (!cameraReturning) {
    controls.target.copy(tornado.getCenter());
  }

  controls.update();
  renderer.render(scene, camera);
}

function init(): void {
  initScene();
  initTornado();
  initGUI();

  window.addEventListener('resize', handleWindowResize);

  lastFpsTime = clock.getElapsedTime();
  animate();
}

init();
