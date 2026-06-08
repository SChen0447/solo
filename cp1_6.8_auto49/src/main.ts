import * as THREE from 'three';
import { AuroraParticles } from './auroraParticles';
import { StarField } from './starField';
import { UIControls, ControlParams } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let auroraParticles: AuroraParticles;
let starField: StarField;
let uiControls: UIControls;
let clock: THREE.Clock;
let container: HTMLElement;

const defaultParams: ControlParams = {
  colorStart: '#8b5cf6',
  colorEnd: '#ec4899',
  particleDensity: 8000,
  waveSpeed: 1.0
};

function init(): void {
  container = document.getElementById('canvas-container') as HTMLElement;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 15);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050018, 1);
  container.appendChild(renderer.domElement);

  setupGradientBackground();

  auroraParticles = new AuroraParticles(scene, {
    particleCount: defaultParams.particleDensity,
    colorStart: new THREE.Color(defaultParams.colorStart),
    colorEnd: new THREE.Color(defaultParams.colorEnd),
    waveSpeed: defaultParams.waveSpeed
  });

  starField = new StarField(scene);

  uiControls = new UIControls(
    document.body,
    camera,
    renderer,
    defaultParams,
    onParamsChange
  );

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupGradientBackground(): void {
  scene.background = new THREE.Color(0x050018);
}

function onParamsChange(params: ControlParams): void {
  const colorStart = new THREE.Color(params.colorStart);
  const colorEnd = new THREE.Color(params.colorEnd);

  auroraParticles.setColors(colorStart, colorEnd);
  auroraParticles.setParticleCount(params.particleDensity);
  auroraParticles.setWaveSpeed(params.waveSpeed);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  auroraParticles.update(deltaTime);
  starField.update(deltaTime);
  uiControls.update();

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
