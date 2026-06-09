import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoadNetwork } from './RoadNetwork';
import { TrafficLightSystem, LightState } from './TrafficLight';
import { TrafficManager } from './TrafficManager';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let roadNetwork: RoadNetwork;
let lightSystem: TrafficLightSystem;
let trafficManager: TrafficManager;
let clock: THREE.Clock;

let totalCarsEl: HTMLElement | null;
let avgSpeedEl: HTMLElement | null;
let lightNorthDot: HTMLElement | null;
let lightSouthDot: HTMLElement | null;
let lightEastDot: HTMLElement | null;
let lightWestDot: HTMLElement | null;
let lightNorthText: HTMLElement | null;
let lightSouthText: HTMLElement | null;
let lightEastText: HTMLElement | null;
let lightWestText: HTMLElement | null;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  totalCarsEl = document.getElementById('total-cars');
  avgSpeedEl = document.getElementById('avg-speed');
  lightNorthDot = document.getElementById('light-north-dot');
  lightSouthDot = document.getElementById('light-south-dot');
  lightEastDot = document.getElementById('light-east-dot');
  lightWestDot = document.getElementById('light-west-dot');
  lightNorthText = document.getElementById('light-north-text');
  lightSouthText = document.getElementById('light-south-text');
  lightEastText = document.getElementById('light-east-text');
  lightWestText = document.getElementById('light-west-text');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 0, 250);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const distance = 50;
  const angle = Math.PI / 4;
  camera.position.set(0, distance * Math.sin(angle), distance * Math.cos(angle));
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 20;
  controls.maxDistance = 150;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 0, 0);

  setupLights();

  roadNetwork = new RoadNetwork();
  scene.add(roadNetwork.group);

  lightSystem = new TrafficLightSystem();
  scene.add(lightSystem.group);

  trafficManager = new TrafficManager(roadNetwork, lightSystem);
  scene.add(trafficManager.group);

  const groundGeometry = new THREE.PlaneGeometry(600, 600);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1117,
    roughness: 1.0
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x4488ff, 0.2);
  fillLight.position.set(-30, 50, -30);
  scene.add(fillLight);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setLightDotClass(el: HTMLElement | null, state: LightState): void {
  if (!el) return;
  el.classList.remove('red', 'yellow', 'green');
  el.classList.add(state);
}

function setLightText(el: HTMLElement | null, direction: string, state: LightState): void {
  if (!el) return;
  const stateText = state === 'red' ? '红灯' : state === 'yellow' ? '黄灯' : '绿灯';
  el.textContent = `${direction} - ${stateText}`;
}

function updateUI(): void {
  if (totalCarsEl) {
    totalCarsEl.textContent = trafficManager.getTotalCars().toString();
  }
  if (avgSpeedEl) {
    avgSpeedEl.textContent = `${trafficManager.getAverageSpeed().toFixed(1)} km/h`;
  }

  const northState = lightSystem.getLightState('north');
  const southState = lightSystem.getLightState('south');
  const eastState = lightSystem.getLightState('east');
  const westState = lightSystem.getLightState('west');

  setLightDotClass(lightNorthDot, northState);
  setLightDotClass(lightSouthDot, southState);
  setLightDotClass(lightEastDot, eastState);
  setLightDotClass(lightWestDot, westState);

  setLightText(lightNorthText, '北向', northState);
  setLightText(lightSouthText, '南向', southState);
  setLightText(lightEastText, '东向', eastState);
  setLightText(lightWestText, '西向', westState);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  lightSystem.update(deltaTime);
  trafficManager.update(deltaTime);

  controls.update();

  updateUI();

  renderer.render(scene, camera);
}

init();
