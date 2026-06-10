import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  buildCity,
  updateBuildingColors,
  setBuildingHighlight,
  noiseLevelToDb,
  BuildingData,
  CityData,
} from './cityBuilder';
import { createNoiseSystem, updateNoise, NoiseSystem } from './noiseSystem';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let cityData: CityData;
let noiseSystem: NoiseSystem;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let hoveredBuilding: BuildingData | null = null;

const clock = new THREE.Clock();
let timeOfDay = 12;

const container = document.getElementById('canvas-container')!;
const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
const timeDisplay = document.getElementById('time-display')!;
const resetBtn = document.getElementById('reset-btn')!;
const infoPanel = document.getElementById('info-panel')!;
const infoDistrict = document.getElementById('info-district')!;
const infoDb = document.getElementById('info-db')!;

const DEFAULT_CAMERA_POS = new THREE.Vector3(45, 40, 45);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.008);

  const containerEl = document.getElementById('canvas-container');
  if (!containerEl) return;

  camera = new THREE.PerspectiveCamera(
    55,
    containerEl.clientWidth / containerEl.clientHeight,
    0.1,
    1000
  );
  camera.position.copy(DEFAULT_CAMERA_POS);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  containerEl.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 15;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.copy(DEFAULT_TARGET);

  setupLights();
  setupGroundAndHelpers();

  cityData = buildCity(scene, 15);
  noiseSystem = createNoiseSystem(scene, cityData.noiseSources);

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.1 };
  mouse = new THREE.Vector2();

  setupEventListeners();
  animate();
}

function setupLights(): void {
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.2);
  directional.position.set(30, 50, 20);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 150;
  directional.shadow.camera.left = -60;
  directional.shadow.camera.right = 60;
  directional.shadow.camera.top = 60;
  directional.shadow.camera.bottom = -60;
  scene.add(directional);

  const hemi = new THREE.HemisphereLight(0x8899bb, 0x221133, 0.4);
  scene.add(hemi);

  const rimLight = new THREE.DirectionalLight(0x6666aa, 0.4);
  rimLight.position.set(-20, 30, -20);
  scene.add(rimLight);
}

function setupGroundAndHelpers(): void {
  const gridHelper = new THREE.GridHelper(80, 40, 0x334466, 0x1a2233);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.5;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d18,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const axesGroup = new THREE.Group();

  const xAxisGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 8);
  const xAxisMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x441111 });
  const xAxis = new THREE.Mesh(xAxisGeo, xAxisMat);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.set(4, 0.1, 0);
  axesGroup.add(xAxis);

  const zAxisGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 8);
  const zAxisMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x112244 });
  const zAxis = new THREE.Mesh(zAxisGeo, zAxisMat);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.set(0, 0.1, 4);
  axesGroup.add(zAxis);

  const yAxisGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 8);
  const yAxisMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x114411 });
  const yAxis = new THREE.Mesh(yAxisGeo, yAxisMat);
  yAxis.position.set(0, 4, 0);
  axesGroup.add(yAxis);

  scene.add(axesGroup);

  const northArrowGeo = new THREE.ConeGeometry(0.4, 1.2, 12);
  const northArrowMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0x661111,
    emissiveIntensity: 0.6,
  });
  const northArrow = new THREE.Mesh(northArrowGeo, northArrowMat);
  northArrow.rotation.x = Math.PI;
  northArrow.position.set(0, 0.7, -25);
  scene.add(northArrow);

  const northShaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
  const northShaftMat = new THREE.MeshStandardMaterial({ color: 0x662222 });
  const northShaft = new THREE.Mesh(northShaftGeo, northShaftMat);
  northShaft.position.set(0, 1.5, -25);
  scene.add(northShaft);
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);

  const canvasEl = renderer.domElement;
  canvasEl.addEventListener('mousemove', onMouseMove);
  canvasEl.addEventListener('mouseleave', onMouseLeave);

  timeSlider.addEventListener('input', () => {
    timeOfDay = parseFloat(timeSlider.value);
    updateTimeDisplay();
  });

  resetBtn.addEventListener('click', resetCamera);
}

function onWindowResize(): void {
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseMove(event: MouseEvent): void {
  if (!container) return;
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  updateHover(event.clientX, event.clientY);
}

function onMouseLeave(): void {
  if (hoveredBuilding) {
    setBuildingHighlight(hoveredBuilding, false);
    hoveredBuilding = null;
  }
  infoPanel.style.display = 'none';
}

function updateHover(clientX: number, clientY: number): void {
  raycaster.setFromCamera(mouse, camera);

  const buildingMeshes = cityData.buildings.map((b) => b.mesh);
  const intersects = raycaster.intersectObjects(buildingMeshes, false);

  if (intersects.length > 0) {
    const building = intersects[0].object.userData.building as BuildingData;

    if (hoveredBuilding && hoveredBuilding !== building) {
      setBuildingHighlight(hoveredBuilding, false);
    }

    if (!hoveredBuilding || hoveredBuilding !== building) {
      setBuildingHighlight(building, true);
      hoveredBuilding = building;
    }

    infoDistrict.textContent = building.districtId;
    infoDb.textContent = `${noiseLevelToDb(building.noiseLevel)} dB`;

    const panelX = clientX + 16;
    const panelY = clientY + 16;
    infoPanel.style.left = `${panelX}px`;
    infoPanel.style.top = `${panelY}px`;
    infoPanel.style.display = 'block';
  } else {
    if (hoveredBuilding) {
      setBuildingHighlight(hoveredBuilding, false);
      hoveredBuilding = null;
    }
    infoPanel.style.display = 'none';
  }
}

function resetCamera(): void {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const duration = 800;
  const startTime = performance.now();

  function animateReset(): void {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos, DEFAULT_CAMERA_POS, eased);
    controls.target.lerpVectors(startTarget, DEFAULT_TARGET, eased);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(animateReset);
    }
  }
  animateReset();
}

function updateTimeDisplay(): void {
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  timeDisplay.textContent = `${hStr}:${mStr}`;
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  updateBuildingColors(cityData.buildings, cityData.noiseSources, timeOfDay, elapsed);
  updateNoise(noiseSystem, elapsed, delta, timeOfDay);

  controls.update();
  renderer.render(scene, camera);
}

init();
updateTimeDisplay();
