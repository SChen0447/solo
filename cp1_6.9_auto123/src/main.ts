import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './sceneManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sceneManager: SceneManager;
let clock: THREE.Clock;

let currentTemperature: number = -10;

interface ThemeColors {
  fogColor: THREE.Color;
  iceColor: THREE.Color;
  snowColor: THREE.Color;
}

const coldTheme: ThemeColors = {
  fogColor: new THREE.Color(0x2a2a3a),
  iceColor: new THREE.Color(0x8ab4f8),
  snowColor: new THREE.Color(0xffffff),
};

const warmTheme: ThemeColors = {
  fogColor: new THREE.Color(0x4a3a2a),
  iceColor: new THREE.Color(0xc4a46a),
  snowColor: new THREE.Color(0xf5e6b8),
};

let currentTheme: ThemeColors = { ...coldTheme };
let targetTheme: ThemeColors = { ...coldTheme };
let themeTransitionProgress: number = 1;

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x2a2a3a, 50, 200);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 30, 60);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 100;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 11.5;
  controls.target.set(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 80, 30);
  scene.add(directionalLight);

  sceneManager = new SceneManager(scene);
  sceneManager.buildScene();

  clock = new THREE.Clock();

  setupUI();
  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupUI(): void {
  const tempSlider = document.getElementById('temp-slider') as HTMLInputElement;
  const tempDisplay = document.getElementById('temp-display') as HTMLDivElement;
  const btnWarm = document.getElementById('btn-warm') as HTMLButtonElement;
  const btnCold = document.getElementById('btn-cold') as HTMLButtonElement;

  if (tempSlider && tempDisplay) {
    tempSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      currentTemperature = parseFloat(target.value);
      tempDisplay.textContent = `${currentTemperature}°C`;
    });
  }

  if (btnWarm && btnCold) {
    btnWarm.addEventListener('click', () => {
      targetTheme = { ...warmTheme };
      themeTransitionProgress = 0;
      btnWarm.classList.add('active');
      btnCold.classList.remove('active');
    });

    btnCold.addEventListener('click', () => {
      targetTheme = { ...coldTheme };
      themeTransitionProgress = 0;
      btnCold.classList.add('active');
      btnWarm.classList.remove('active');
    });
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

function updateThemeTransition(deltaTime: number): void {
  if (themeTransitionProgress < 1) {
    themeTransitionProgress = Math.min(1, themeTransitionProgress + deltaTime / 2);
    const t = themeTransitionProgress;

    const fogColor = lerpColor(currentTheme.fogColor, targetTheme.fogColor, t);
    const iceColor = lerpColor(currentTheme.iceColor, targetTheme.iceColor, t);
    const snowColor = lerpColor(currentTheme.snowColor, targetTheme.snowColor, t);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(fogColor);
    }

    sceneManager.updateThemeColors(iceColor, snowColor);

    if (themeTransitionProgress >= 1) {
      currentTheme = { ...targetTheme };
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  controls.update();
  sceneManager.update(deltaTime, currentTemperature);
  updateThemeTransition(deltaTime);

  renderer.render(scene, camera);
}

init();
