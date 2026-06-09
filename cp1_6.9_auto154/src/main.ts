import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WaterfallSystem, WaterfallCollisionInfo } from './waterfall';
import { PlatformSystem } from './platform';

const STAR_COUNT = 800;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let waterfall: WaterfallSystem;
let platforms: PlatformSystem;

let starField!: THREE.Points;
let starGeometry!: THREE.BufferGeometry;
let starSizes!: Float32Array;
let starPhases!: Float32Array;
let starPeriods!: Float32Array;
let starGroup!: THREE.Group;

let lastTime = 0;
const clock = new THREE.Clock();

let intensityText!: HTMLElement;
let intensityCircle!: SVGElement;

function createRadialBackground(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(80, 64, 64);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x06050f) },
      bottomColor: { value: new THREE.Color(0x120818) }
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
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `
  });
  return new THREE.Mesh(geo, mat);
}

function createStarField(): void {
  starGroup = new THREE.Group();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  starSizes = new Float32Array(STAR_COUNT);
  starPhases = new Float32Array(STAR_COUNT);
  starPeriods = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 20;
    const i3 = i * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.cos(phi);
    positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    colors[i3] = 1.0;
    colors[i3 + 1] = 1.0;
    colors[i3 + 2] = 1.0;

    starSizes[i] = 1 + Math.random() * 3;
    starPhases[i] = Math.random() * Math.PI * 2;
    starPeriods[i] = 0.3 + Math.random() * 0.7;
  }

  starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.67,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  starField = new THREE.Points(starGeometry, starMaterial);
  starGroup.add(starField);
  scene.add(starGroup);
}

function updateStars(time: number, dt: number): void {
  starGroup.rotation.y += 0.002 * dt;

  const sizeAttr = starGeometry.attributes.size as THREE.BufferAttribute;
  const sizeArr = sizeAttr.array as Float32Array;
  for (let i = 0; i < STAR_COUNT; i++) {
    const t = (time / starPeriods[i]) + starPhases[i];
    const twinkle = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    sizeArr[i] = starSizes[i] * (0.6 + 0.4 * twinkle);
  }
  sizeAttr.needsUpdate = true;
}

function initScene(): void {
  const container = document.getElementById('aspect-container');
  if (!container) throw new Error('aspect-container not found');

  scene = new THREE.Scene();
  scene.add(createRadialBackground());

  const { width, height } = computeAspectSize();
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, 2, 14);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x06050f, 1);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 25;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.target.set(0, 0, 0);

  createStarField();

  platforms = new PlatformSystem(scene);
  waterfall = new WaterfallSystem(scene, camera);
  waterfall.onCollision = (info: WaterfallCollisionInfo) => {
    platforms.handleCollision(info.position, info.color);
  };

  const el = document.getElementById('intensity-text');
  if (el) intensityText = el;
  const ic = document.getElementById('intensity-circle');
  if (ic) intensityCircle = ic;

  window.addEventListener('resize', onResize);
}

function computeAspectSize(): { width: number; height: number } {
  const container = document.getElementById('aspect-container');
  if (!container) return { width: window.innerWidth, height: window.innerHeight };
  const w = container.clientWidth;
  const h = container.clientHeight;
  const targetAspect = 16 / 9;
  const currentAspect = w / h;
  let finalW: number, finalH: number;
  if (currentAspect > targetAspect) {
    finalH = h;
    finalW = finalH * targetAspect;
  } else {
    finalW = w;
    finalH = finalW / targetAspect;
  }
  return { width: finalW, height: finalH };
}

function onResize(): void {
  const { width, height } = computeAspectSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function updateIntensityUI(count: number): void {
  if (intensityText) {
    intensityText.textContent = String(count);
  }
  if (intensityCircle) {
    const ratio = Math.min(1, count / 3000);
    const circumference = 201.1;
    const dash = circumference * ratio;
    intensityCircle.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
  }
}

function animate(currentTime: number): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  controls.update();

  updateStars(t, dt);
  platforms.update(dt);
  waterfall.update(dt, (pos, vel) => platforms.checkCollision(pos, vel));

  updateIntensityUI(waterfall.getActiveCount());

  renderer.render(scene, camera);
}

function init(): void {
  initScene();
  requestAnimationFrame(animate);
}

init();
