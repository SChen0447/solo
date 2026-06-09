import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FireflyManager } from './FireflyManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let fireflyManager: FireflyManager;
let clock: THREE.Clock;
let skyMesh: THREE.Mesh;
let groundMesh: THREE.Mesh;

const skyTopColor = new THREE.Color('#0a0a2e');
const skyBottomColor = new THREE.Color('#1a1a4e');
const skyLightColor = new THREE.Color('#3a3a5a');

let currentBrightness: number = 50;
let currentWindSpeed: number = 1;
let statsUpdateTimer: number = 0;

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) {
    console.error('Container not found');
    return;
  }

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 4, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 40;
  controls.target.set(0, 4, 0);
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.minPolarAngle = Math.PI * 0.15;

  createSky();
  createGround();
  createAmbientLights();

  fireflyManager = new FireflyManager(scene);
  fireflyManager.setBrightness(currentBrightness);
  fireflyManager.setWindSpeed(currentWindSpeed);

  clock = new THREE.Clock();

  setupUIListeners();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function createSky(): void {
  const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: skyTopColor.clone() },
      uBottomColor: { value: skyBottomColor.clone() },
      uBrightness: { value: currentBrightness / 100 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uBrightness;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = max(0.0, min(1.0, h * 0.5 + 0.5));
        vec3 darkColor = mix(uBottomColor, uTopColor, t);
        vec3 lightColor = mix(vec3(0.23), vec3(0.35), t);
        vec3 finalColor = mix(darkColor, lightColor, uBrightness);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.BackSide,
  });
  skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(skyMesh);
}

function createGround(): void {
  const groundSize = 60;
  const segments = 60;
  const geometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const distFromCenter = Math.sqrt(x * x + z * z);
    const edgeFalloff = Math.max(0, 1 - distFromCenter / (groundSize * 0.4));
    const baseHeight = 0.3 + Math.random() * 0.5;
    const noise = (Math.sin(x * 0.3) + Math.cos(z * 0.3)) * 0.2;
    const y = baseHeight * edgeFalloff + noise * edgeFalloff;
    positions.setY(i, y);
  }

  geometry.computeVertexNormals();

  const colors = new Float32Array(positions.count * 3);
  const baseGrassColor = new THREE.Color('#2a4a2a');
  const darkGrassColor = new THREE.Color('#1a3a1a');

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = Math.max(0, Math.min(1, y));
    const color = baseGrassColor.clone().lerp(darkGrassColor, 1 - t);
    const glow = 0.02 + Math.random() * 0.04;
    colors[i * 3] = color.r + glow * 0.3;
    colors[i * 3 + 1] = color.g + glow;
    colors[i * 3 + 2] = color.b + glow * 0.2;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: false,
  });

  groundMesh = new THREE.Mesh(geometry, material);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

function createAmbientLights(): void {
  const ambient = new THREE.AmbientLight(0x1a1a2a, 0.3);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0x8899ff, 0.15);
  moonLight.position.set(10, 20, 10);
  scene.add(moonLight);
}

function updateSkyBrightness(brightness: number): void {
  const t = brightness / 100;
  if (skyMesh && skyMesh.material instanceof THREE.ShaderMaterial) {
    skyMesh.material.uniforms.uBrightness.value = t;
  }
}

function setupUIListeners(): void {
  const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement | null;
  const brightnessValue = document.getElementById('brightness-value');
  const windSlider = document.getElementById('wind-slider') as HTMLInputElement | null;
  const windValue = document.getElementById('wind-value');

  if (brightnessSlider) {
    brightnessSlider.addEventListener('input', () => {
      const val = Number(brightnessSlider.value);
      currentBrightness = val;
      if (brightnessValue) {
        brightnessValue.textContent = String(val);
      }
      fireflyManager.setBrightness(val);
      updateSkyBrightness(val);
    });
  }

  if (windSlider) {
    windSlider.addEventListener('input', () => {
      const val = Number(windSlider.value);
      currentWindSpeed = val;
      if (windValue) {
        windValue.textContent = val.toFixed(1);
      }
      fireflyManager.setWindSpeed(val);
    });
  }
}

function updateStats(): void {
  const stats = fireflyManager.getStats();
  const statTotal = document.getElementById('stat-total');
  const statSpeed = document.getElementById('stat-speed');
  const statActive = document.getElementById('stat-active');

  if (statTotal) statTotal.textContent = String(stats.totalCount);
  if (statSpeed) statSpeed.textContent = stats.averageSpeed.toFixed(2);
  if (statActive) statActive.textContent = String(stats.activeCount);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.elapsedTime;

  controls.update();
  fireflyManager.update(deltaTime, elapsedTime);

  statsUpdateTimer += deltaTime;
  if (statsUpdateTimer >= 1.0) {
    statsUpdateTimer = 0;
    updateStats();
  }

  renderer.render(scene, camera);
}

init();
