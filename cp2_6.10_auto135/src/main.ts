import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Star } from './Star';
import { Planet } from './Planet';
import { GravitySystem } from './GravitySystem';
import { UIManager } from './UIManager';

const container = document.getElementById('canvas-container') as HTMLElement;
const app = document.getElementById('app') as HTMLElement;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let labelRenderer: CSS2DRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

let star: Star;
let planets: Planet[] = [];
let gravitySystem: GravitySystem;
let uiManager: UIManager;

let followPlanet: Planet | null = null;
const G = 50.0;
const STAR_MASS = 1000;
const FIXED_DT = 0.002;

function init(): void {
  scene = new THREE.Scene();
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 2;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createRadialGradient(1, 1, 0, 1, 1, 1);
  gradient.addColorStop(0, '#1a1a3a');
  gradient.addColorStop(1, '#0a0a2a');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 2);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 12, 18);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 100;

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xfff3a0, 2.5, 100);
  pointLight.position.set(0, 0, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  star = new Star(0.8, '#f39c12');
  star.addToScene(scene);

  planets = createPlanets();
  for (const planet of planets) {
    planet.addToScene(scene);
  }

  gravitySystem = new GravitySystem(planets, STAR_MASS);

  const planetNames = planets.map(p => p.name);
  uiManager = new UIManager(app, planetNames);

  uiManager.on('statechange', () => {});
  uiManager.on('reset', () => {
    gravitySystem.reset();
    controls.target.set(0, 0, 0);
    followPlanet = null;
  });
  uiManager.on('followchange', (planetName: string | null) => {
    if (planetName) {
      followPlanet = planets.find(p => p.name === planetName) || null;
    } else {
      followPlanet = null;
      controls.target.set(0, 0, 0);
    }
  });

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function createPlanets(): Planet[] {
  const result: Planet[] = [];

  const planetConfigs = [
    {
      name: 'Aetheris',
      radius: 0.4,
      color: '#3498db',
      semiMajorAxis: 5.0,
      eccentricity: 0.1,
      mass: 8.0,
      angle: 0
    },
    {
      name: 'Pyros',
      radius: 0.3,
      color: '#e74c3c',
      semiMajorAxis: 8.0,
      eccentricity: 0.15,
      mass: 3.0,
      angle: Math.PI * 2 / 3
    },
    {
      name: 'Verdana',
      radius: 0.2,
      color: '#2ecc71',
      semiMajorAxis: 11.0,
      eccentricity: 0.08,
      mass: 1.0,
      angle: Math.PI * 4 / 3
    }
  ];

  for (const config of planetConfigs) {
    const semiMinorAxis = config.semiMajorAxis * Math.sqrt(1 - config.eccentricity * config.eccentricity);
    const focusOffset = config.semiMajorAxis * config.eccentricity;

    const x = config.semiMajorAxis * Math.cos(config.angle) - focusOffset;
    const z = semiMinorAxis * Math.sin(config.angle);
    const position = new THREE.Vector3(x, 0, z);

    const r = position.length();
    const v = Math.sqrt(G * STAR_MASS * (2 / r - 1 / config.semiMajorAxis));

    const velocityDir = new THREE.Vector3(
      -Math.sin(config.angle),
      0,
      Math.cos(config.angle)
    ).normalize();

    const velocity = velocityDir.multiplyScalar(v);

    const planet = new Planet(
      config.name,
      config.radius,
      config.color,
      position,
      velocity,
      config.semiMajorAxis,
      config.eccentricity,
      config.mass
    );

    result.push(planet);
  }

  return result;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  const uiState = uiManager.getState();

  if (!uiState.isPaused) {
    const orbitData = gravitySystem.update(uiState.timeMultiplier);

    const simDays = gravitySystem.getSimulationTimeDays();
    uiManager.updateStats(simDays, orbitData.averageSpeed, orbitData.eccentricityChanges);
  }

  star.update(deltaTime);

  if (followPlanet) {
    const targetPos = followPlanet.getPosition();
    controls.target.lerp(targetPos, 0.1);
  }

  controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

init();
