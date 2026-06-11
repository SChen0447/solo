import * as THREE from 'three';
import { Pane, InputBindingApi, FolderApi } from 'tweakpane';
import { NebulaSystem, ControlParams } from './nebula';
import { NebulaControls } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let nebulaSystem: NebulaSystem;
let controls: NebulaControls;
let pane: Pane;
let animationId: number;
let startTime: number;

const params: ControlParams = {
  primaryTone: 0,
  secondaryTone: 0,
  driftSpeed: 0.001
};

function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Container element #app not found');
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  nebulaSystem = new NebulaSystem(scene);

  controls = new NebulaControls(camera, renderer.domElement);
  controls.onCameraChange = () => {
    const compensation = controls.getSizeCompensation();
    nebulaSystem.setSizeCompensation(compensation);
  };

  createControlPanel();

  window.addEventListener('resize', onWindowResize);

  startTime = performance.now();
  animate();
}

function createControlPanel(): void {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '1000';
  document.body.appendChild(container);

  pane = new Pane({
    container: container,
    title: '星云参数控制'
  });

  const paneApi = pane as unknown as FolderApi;

  const primaryBinding = paneApi.addBinding(params, 'primaryTone', {
    min: 0,
    max: 1,
    step: 0.01,
    label: '主色调'
  }) as unknown as InputBindingApi<number, number>;

  const secondaryBinding = paneApi.addBinding(params, 'secondaryTone', {
    min: 0,
    max: 1,
    step: 0.01,
    label: '次色调'
  }) as unknown as InputBindingApi<number, number>;

  const driftBinding = paneApi.addBinding(params, 'driftSpeed', {
    min: 0.0005,
    max: 0.005,
    step: 0.0001,
    label: '飘移速度'
  }) as unknown as InputBindingApi<number, number>;

  primaryBinding.on('change', () => {
    nebulaSystem.setParams({ primaryTone: params.primaryTone });
  });

  secondaryBinding.on('change', () => {
    nebulaSystem.setParams({ secondaryTone: params.secondaryTone });
  });

  driftBinding.on('change', () => {
    nebulaSystem.setParams({ driftSpeed: params.driftSpeed });
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const currentTime = (performance.now() - startTime) / 1000;

  controls.update();

  const compensation = controls.getSizeCompensation();
  nebulaSystem.setSizeCompensation(compensation);

  nebulaSystem.update(currentTime, camera);

  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);

  if (nebulaSystem) {
    nebulaSystem.dispose();
  }

  if (controls) {
    controls.dispose();
  }

  if (pane) {
    pane.dispose();
  }

  if (renderer) {
    renderer.dispose();
    const canvas = renderer.domElement;
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }
}

window.addEventListener('beforeunload', dispose);

init();
