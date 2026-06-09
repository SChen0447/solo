import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBuildings, createGround, type BuildingData } from './buildings';
import { WeatherSystem } from './weatherSystem';
import { setupUI } from './ui';

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container not found');
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(35, 30, 35);
  camera.lookAt(0, 5, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 15;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 5, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(20, 35, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  scene.add(directionalLight);

  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4A7C59, 0.3);
  scene.add(hemiLight);

  const buildings: BuildingData[] = createBuildings();
  buildings.forEach((b) => {
    scene.add(b.mesh);
  });

  const ground = createGround();
  scene.add(ground);
  if ((ground as any).grid) {
    scene.add((ground as any).grid);
  }

  const weatherSystem = new WeatherSystem(
    scene,
    buildings,
    ambientLight,
    directionalLight
  );

  setupUI(weatherSystem);

  const sceneGroup = new THREE.Group();
  const allObjects = [...buildings.map((b) => b.mesh), ground];
  if ((ground as any).grid) {
    allObjects.push((ground as any).grid);
  }
  allObjects.forEach((obj) => {
    scene.remove(obj);
    sceneGroup.add(obj);
  });
  scene.add(sceneGroup);

  const clock = new THREE.Clock();
  const ROTATION_PERIOD = 60;

  let autoRotate = true;
  let lastInteractionTime = 0;

  controls.addEventListener('start', () => {
    autoRotate = false;
    lastInteractionTime = performance.now();
  });

  controls.addEventListener('change', () => {
    lastInteractionTime = performance.now();
  });

  function animate(): void {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    const timeSinceInteraction = (performance.now() - lastInteractionTime) / 1000;
    if (timeSinceInteraction > 3) {
      autoRotate = true;
    }

    if (autoRotate) {
      const rotationSpeed = (Math.PI * 2) / ROTATION_PERIOD;
      sceneGroup.rotation.y += rotationSpeed * delta;
    }

    weatherSystem.update(delta);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

init();
