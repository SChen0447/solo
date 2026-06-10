import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { debounce } from 'lodash';
import { generateBuildings, disposeBuildings, BuildingData, CityParams } from './cityBuilder';
import { SkySystem, SunParams } from './skySystem';

interface AppParams extends CityParams, SunParams {
  rebuild: () => void;
  resetView: () => void;
}

const appState = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  controls: null as OrbitControls | null,
  skySystem: null as SkySystem | null,
  buildings: [] as BuildingData[],
  ground: null as THREE.Mesh | null,
};

const params: AppParams = {
  density: 20,
  minHeight: 10,
  maxHeight: 50,
  spacing: 2,
  rotationSpeed: 0.005,
  hue: 210,
  saturation: 0.5,
  angle: 45,
  elevation: 45,
  rebuild: () => {},
  resetView: () => {},
};

function initScene(): void {
  const container = document.getElementById('canvas-container');
  if (!container) throw new Error('Canvas container not found');

  const scene = new THREE.Scene();
  appState.scene = scene;

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(30, 30, 30);
  appState.camera = camera;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  appState.renderer = renderer;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 5, 0);
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 15;
  controls.maxDistance = 120;
  appState.controls = controls;

  params.resetView = () => {
    camera.position.set(30, 30, 30);
    controls.target.set(0, 5, 0);
    controls.update();
  };

  createGround(scene);

  const skySystem = new SkySystem(scene);
  appState.skySystem = skySystem;

  rebuildCity();

  skySystem.update({ angle: params.angle, elevation: params.elevation });

  window.addEventListener('resize', onWindowResize);
}

function createGround(scene: THREE.Scene): void {
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  appState.ground = ground;

  const gridHelper = new THREE.GridHelper(60, 30, 0x34495e, 0x2c3e50);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function rebuildCity(): void {
  const scene = appState.scene;
  if (!scene) return;

  if (appState.buildings.length > 0) {
    for (const b of appState.buildings) {
      scene.remove(b.mesh);
    }
    disposeBuildings(appState.buildings);
    appState.buildings = [];
  }

  if (params.minHeight > params.maxHeight) {
    params.minHeight = params.maxHeight;
  }

  const buildings = generateBuildings({
    density: params.density,
    minHeight: params.minHeight,
    maxHeight: params.maxHeight,
    spacing: params.spacing,
    rotationSpeed: params.rotationSpeed,
    hue: params.hue,
    saturation: params.saturation,
  });

  for (const b of buildings) {
    scene.add(b.mesh);
  }
  appState.buildings = buildings;
}

function onWindowResize(): void {
  const camera = appState.camera;
  const renderer = appState.renderer;
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupGUI(): void {
  const gui = new dat.GUI({ width: 300 });
  gui.domElement.style.marginTop = '80px';

  const buildingFolder = gui.addFolder('建筑群参数');
  buildingFolder.open();

  const debouncedRebuild = debounce(() => rebuildCity(), 100);
  params.rebuild = () => rebuildCity();

  buildingFolder.add(params, 'density', 5, 50, 1).name('建筑密度').onChange(debouncedRebuild);

  const heightFolder = buildingFolder.addFolder('高度范围');
  heightFolder.open();
  heightFolder
    .add(params, 'minHeight', 10, 100, 1)
    .name('最低高度')
    .onChange((val: number) => {
      if (val > params.maxHeight) params.maxHeight = val;
      debouncedRebuild();
    });
  heightFolder
    .add(params, 'maxHeight', 10, 100, 1)
    .name('最高高度')
    .onChange((val: number) => {
      if (val < params.minHeight) params.minHeight = val;
      debouncedRebuild();
    });

  buildingFolder.add(params, 'spacing', 1, 5, 0.1).name('建筑间距').onChange(debouncedRebuild);
  buildingFolder.add(params, 'rotationSpeed', 0, 0.02, 0.0005).name('旋转速度');

  const colorFolder = buildingFolder.addFolder('建筑颜色');
  colorFolder.open();
  colorFolder.add(params, 'hue', 0, 360, 1).name('色相 (°)').onChange(debouncedRebuild);
  colorFolder.add(params, 'saturation', 0, 1, 0.01).name('饱和度').onChange(debouncedRebuild);

  buildingFolder.add(params, 'rebuild').name('🔄 重新生成城市');

  const sunFolder = gui.addFolder('日光参数');
  sunFolder.open();

  const debouncedSunUpdate = debounce(() => {
    if (appState.skySystem) {
      appState.skySystem.update({ angle: params.angle, elevation: params.elevation });
    }
  }, 16);

  sunFolder
    .add(params, 'angle', 0, 360, 0.5)
    .name('太阳角度 (°)')
    .onChange(debouncedSunUpdate);
  sunFolder
    .add(params, 'elevation', 10, 80, 0.5)
    .name('太阳高度 (°)')
    .onChange(debouncedSunUpdate);

  const viewFolder = gui.addFolder('视角');
  viewFolder.open();
  viewFolder.add(params, 'resetView').name('🎯 重置视角');
}

function animate(): void {
  requestAnimationFrame(animate);

  for (const b of appState.buildings) {
    b.mesh.rotation.y += b.rotationSpeed;
  }

  if (appState.controls) {
    appState.controls.update();
  }

  if (appState.renderer && appState.scene && appState.camera) {
    appState.renderer.render(appState.scene, appState.camera);
  }
}

function init(): void {
  initScene();
  setupGUI();
  animate();
}

init();
