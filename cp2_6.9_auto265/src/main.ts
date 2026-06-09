import * as THREE from 'three';
import { CrystalGrowth } from './crystalGrowth';
import { InteractionManager } from './interaction';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let crystal: CrystalGrowth;
let interaction: InteractionManager;
let clock: THREE.Clock;

function init() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0B0B1A');
  gradient.addColorStop(1, '#1A1A2E');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(4, 3, 5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(5, 8, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  scene.add(mainLight);

  const fillLight1 = new THREE.PointLight(0x4FC3F7, 0.4, 20);
  fillLight1.position.set(-5, 3, -3);
  scene.add(fillLight1);

  const fillLight2 = new THREE.PointLight(0x7B68EE, 0.3, 20);
  fillLight2.position.set(3, -3, 5);
  scene.add(fillLight2);

  const gridHelper = new THREE.GridHelper(20, 20, 0x4FC3F7, 0x2A2A4A);
  (gridHelper.material as THREE.Material).opacity = 0.15;
  (gridHelper.material as THREE.Material).transparent = true;
  gridHelper.position.y = -3;
  scene.add(gridHelper);

  crystal = new CrystalGrowth(scene, {
    temperature: 25,
    supersaturation: 2.0,
    growthRate: 1.0,
  });

  interaction = new InteractionManager(camera, renderer, crystal, {
    onParamsChange: (params) => {
      crystal.setParams(params);
    },
    onPlayPause: () => {
      return crystal.togglePause();
    },
    onReset: () => {
      crystal.reset();
    },
    onCrystalObject: () => {},
  });

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const deltaTime = delta * 1000;

  crystal.update(deltaTime);
  interaction.update();

  renderer.render(scene, camera);
}

init();
