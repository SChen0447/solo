import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { initMaterialUI } from './materialManager';
import { initLightingUI } from './lightingManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sphere: THREE.Mesh;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;
let pointLight: THREE.PointLight;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let envMap: THREE.CubeTexture | null = null;
let envMapSize = 1024;
let isLowRes = false;

const fpsCounter = {
  frames: 0,
  lastTime: performance.now(),
  lastUpdate: performance.now(),
  currentFps: 0
};

function createProceduralEnvMap(size: number): THREE.CubeTexture {
  const images: HTMLCanvasElement[] = [];
  const faces = [
    { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) }
  ];

  for (let i = 0; i < 6; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const face = faces[i];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / (size - 1)) * 2 - 1;
        const v = (y / (size - 1)) * 2 - 1;
        const dir = new THREE.Vector3();

        if (i === 0) { dir.set(1, -v, -u); }
        else if (i === 1) { dir.set(-1, -v, u); }
        else if (i === 2) { dir.set(u, 1, v); }
        else if (i === 3) { dir.set(u, -1, -v); }
        else if (i === 4) { dir.set(u, -v, 1); }
        else { dir.set(-u, -v, -1); }

        dir.normalize();

        const skyGradient = Math.max(0, dir.y);
        const sunDir = new THREE.Vector3(-0.3, 0.8, 0.5).normalize();
        const sunDot = Math.max(0, dir.dot(sunDir));
        const sunIntensity = Math.pow(sunDot, 200) * 2.0;

        const horizonColor = new THREE.Color(0x7a6a8a);
        const zenithColor = new THREE.Color(0x2a3a6a);
        const sunColor = new THREE.Color(0xfff4e0);

        const baseColor = horizonColor.clone().lerp(zenithColor, skyGradient);
        baseColor.add(sunColor.clone().multiplyScalar(sunIntensity));

        const noiseVal = (
          Math.sin(dir.x * 10) * Math.cos(dir.y * 10) +
          Math.sin(dir.z * 7) * Math.cos(dir.x * 5)
        ) * 0.02;

        let r = Math.min(1, baseColor.r + noiseVal);
        let g = Math.min(1, baseColor.g + noiseVal);
        let b = Math.min(1, baseColor.b + noiseVal);

        const idx = (y * size + x) * 4;
        data[idx] = Math.floor(r * 255);
        data[idx + 1] = Math.floor(g * 255);
        data[idx + 2] = Math.floor(b * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    images.push(canvas);
  }

  const texture = new THREE.CubeTexture(images);
  texture.needsUpdate = true;
  texture.mapping = THREE.CubeReflectionMapping;
  return texture;
}

function init(): void {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.enablePan = false;

  envMap = createProceduralEnvMap(envMapSize);
  scene.environment = envMap;

  const geometry = new THREE.SphereGeometry(2, 128, 128);
  sphere = new THREE.Mesh(geometry);
  scene.add(sphere);

  ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(-5, 5, 5);
  scene.add(directionalLight);

  pointLight = new THREE.PointLight(0x4A90D9, 0.8, 50);
  pointLight.position.set(2, 0, 2);
  scene.add(pointLight);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  initMaterialUI(sphere, envMap);
  initLightingUI(scene, ambientLight, directionalLight, pointLight, renderer);

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  animate();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);

  const indicator = document.getElementById('normal-indicator')!;
  const valuesEl = document.getElementById('normal-values')!;

  if (intersects.length > 0 && intersects[0].face) {
    indicator.classList.add('visible');
    const normal = intersects[0].face.normal.clone();
    normal.transformDirection(sphere.matrixWorld);
    valuesEl.textContent = `X: ${normal.x.toFixed(3)}, Y: ${normal.y.toFixed(3)}, Z: ${normal.z.toFixed(3)}`;
  } else {
    indicator.classList.remove('visible');
  }
}

function onPointerLeave(): void {
  const indicator = document.getElementById('normal-indicator')!;
  indicator.classList.remove('visible');
}

function updateFPS(): void {
  fpsCounter.frames++;
  const now = performance.now();

  if (now - fpsCounter.lastUpdate >= 500) {
    fpsCounter.currentFps = Math.round(
      (fpsCounter.frames * 1000) / (now - fpsCounter.lastUpdate)
    );
    const fpsEl = document.getElementById('fps-counter')!;
    fpsEl.textContent = `FPS: ${fpsCounter.currentFps}`;

    if (fpsCounter.currentFps < 25 && !isLowRes) {
      downgradeEnvMap();
    }

    fpsCounter.frames = 0;
    fpsCounter.lastUpdate = now;
  }
}

function downgradeEnvMap(): void {
  if (isLowRes) return;
  isLowRes = true;
  envMapSize = 512;
  const newEnvMap = createProceduralEnvMap(envMapSize);
  if (envMap) {
    envMap.dispose();
  }
  envMap = newEnvMap;
  scene.environment = envMap;

  const mat = sphere.material as THREE.MeshStandardMaterial;
  if (mat && 'envMap' in mat) {
    mat.envMap = envMap;
    mat.needsUpdate = true;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = performance.now() - fpsCounter.lastTime;
  fpsCounter.lastTime = performance.now();

  const rotationSpeed = 15 * (Math.PI / 180);
  sphere.rotation.y += rotationSpeed * (delta / 1000);

  TWEEN.update();
  controls.update();
  updateFPS();

  renderer.render(scene, camera);
}

init();
