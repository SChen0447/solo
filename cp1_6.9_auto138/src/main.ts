import * as THREE from 'three';
import { Seed } from './seed';
import { LinkManager } from './link';
import { VortexManager } from './vortex';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let seeds: Seed[] = [];
let linkManager: LinkManager;
let vortexManager: VortexManager;
let stars: THREE.Points;
let starRotation: number = 0;

const MAX_SEEDS = 6;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;
const PAN_SPEED = 0.01;

let isRightMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraOffset = new THREE.Vector3(0, 0, 10);
let cameraTarget = new THREE.Vector3(0, 0, 0);
let currentZoom = 1.0;

const clock = new THREE.Clock();

function init(): void {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(cameraOffset);
  camera.lookAt(cameraTarget);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050308, 1);
  document.body.appendChild(renderer.domElement);

  createBackground();
  createStars();

  linkManager = new LinkManager();
  scene.add(linkManager.group);

  vortexManager = new VortexManager();
  scene.add(vortexManager.group);

  setupEventListeners();
  animate();
}

function createBackground(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0f0a1a');
  gradient.addColorStop(1, '#050308');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const bgGeometry = new THREE.SphereGeometry(100, 32, 32);
  const bgMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false
  });
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
  scene.add(bgMesh);
}

function createStars(): void {
  const starCount = 200;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const opacities = new Float32Array(starCount);
  const flickerSpeeds = new Float32Array(starCount);
  const flickerOffsets = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const radius = 30 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    sizes[i] = 1.0 + Math.random() * 2.0;
    opacities[i] = 0.3 + Math.random() * 0.5;
    flickerSpeeds[i] = 1.0 + Math.random() * 2.0;
    flickerOffsets[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('aFlickerSpeed', new THREE.BufferAttribute(flickerSpeeds, 1));
  geometry.setAttribute('aFlickerOffset', new THREE.BufferAttribute(flickerOffsets, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      attribute float aFlickerSpeed;
      attribute float aFlickerOffset;
      uniform float uTime;
      varying float vOpacity;
      void main() {
        vOpacity = aOpacity * (0.6 + 0.4 * sin(uTime * aFlickerSpeed + aFlickerOffset));
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vOpacity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist) * vOpacity;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseleave', onMouseUp);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCanvasClick(event: MouseEvent): void {
  if (event.button !== 0) return;
  if (seeds.length >= MAX_SEEDS) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const planeZ = cameraTarget.z;
  const planeNormal = new THREE.Vector3(0, 0, 1);
  const planePoint = new THREE.Vector3(0, 0, planeZ);
  const plane = new THREE.Plane(planeNormal, -planePoint.dot(planeNormal));

  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);

  if (intersectPoint) {
    const seed = new Seed(intersectPoint);
    seeds.push(seed);
    scene.add(seed.group);
  }
}

function onWheel(event: WheelEvent): void {
  event.preventDefault();

  const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));

  updateCameraPosition();
}

function onMouseDown(event: MouseEvent): void {
  if (event.button === 2) {
    isRightMouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}

function onMouseUp(event: MouseEvent): void {
  if (event.button === 2) {
    isRightMouseDown = false;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (isRightMouseDown) {
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    cameraTarget.x -= deltaX * PAN_SPEED / currentZoom;
    cameraTarget.y += deltaY * PAN_SPEED / currentZoom;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    updateCameraPosition();
  }
}

function updateCameraPosition(): void {
  const baseDistance = 10;
  const distance = baseDistance / currentZoom;
  camera.position.set(
    cameraTarget.x,
    cameraTarget.y,
    cameraTarget.z + distance
  );
  camera.lookAt(cameraTarget);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  starRotation += deltaTime * 0.02;
  if (stars) {
    stars.rotation.y = starRotation;
    (stars.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
  }

  for (const seed of seeds) {
    seed.update(deltaTime);
  }

  linkManager.updateLinks(seeds);
  linkManager.update(deltaTime);

  vortexManager.updateVortexes(seeds, linkManager);
  vortexManager.update(deltaTime);

  renderer.render(scene, camera);
}

init();
