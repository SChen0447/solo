import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { ForceField } from './forceField';
import { createUI, UISettings } from './ui';

const CONTAINER_RADIUS = 8;
const CONTAINER_HEIGHT = 12;
const CONTAINER_HALF_HEIGHT = CONTAINER_HEIGHT / 2;

const initialSettings: UISettings = {
  injectionRate: 1.5,
  vortexStrength: 0.5,
  gravityStrength: 0.2,
  particleLifetime: 5,
  starDensity: 400
};

let settings: UISettings = { ...initialSettings };

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

let cameraDistance = 28;
let cameraYaw = 0;
let cameraPitch = 0;
let targetCameraYaw = 0;
let targetCameraPitch = 0;
let cameraZoom = 1;
let targetCameraZoom = 1;

let particleSystem: ParticleSystem;
let forceField: ForceField;
let stars: THREE.Points;
let starsGeometry: THREE.BufferGeometry;
let starData: { x: number; y: number; z: number; phase: number; period: number; parallaxX: number; parallaxY: number }[] = [];

let isRightDragging = false;
let isLeftDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastWorldPoint: THREE.Vector3 | null = null;
let lastInjectionTime = 0;
let injectionActive = false;

let updateUIFn: ((count: number) => void) | null = null;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

function createStars(count: number): THREE.Points {
  starData = [];
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 120 + Math.random() * 40;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const brightness = 0.3 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 1.2;

    sizes[i] = 1 + Math.random() * 1;

    starData.push({
      x, y, z,
      phase: Math.random() * Math.PI * 2,
      period: 0.3 + Math.random() * 1.2,
      parallaxX: (Math.random() - 0.5) * 3,
      parallaxY: (Math.random() - 0.5) * 3
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const starTex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    map: starTex,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  starsGeometry = geom;
  return new THREE.Points(geom, mat);
}

function rebuildStars(count: number): void {
  if (stars) {
    scene.remove(stars);
    (stars.geometry as THREE.BufferGeometry).dispose();
    (stars.material as THREE.Material).dispose();
  }
  stars = createStars(count);
  scene.add(stars);
}

function createContainer(): THREE.Group {
  const group = new THREE.Group();

  const cylinderGeom = new THREE.CylinderGeometry(
    CONTAINER_RADIUS, CONTAINER_RADIUS, CONTAINER_HEIGHT, 64, 1, true
  );
  const cylinderMat = new THREE.MeshBasicMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);
  group.add(cylinder);

  const edgesGeom = new THREE.EdgesGeometry(cylinderGeom);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0.2,
    linewidth: 0.5
  });
  const edges = new THREE.LineSegments(edgesGeom, edgesMat);
  group.add(edges);

  const baseGeom = new THREE.CircleGeometry(CONTAINER_RADIUS, 64);
  const baseMat = new THREE.MeshBasicMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = -CONTAINER_HALF_HEIGHT;
  group.add(base);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const gctx = glowCanvas.getContext('2d')!;
  const glowGrad = gctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  glowGrad.addColorStop(0, 'rgba(68, 136, 170, 0.8)');
  glowGrad.addColorStop(0.4, 'rgba(68, 136, 170, 0.25)');
  glowGrad.addColorStop(1, 'rgba(68, 136, 170, 0)');
  gctx.fillStyle = glowGrad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);

  const glowGeom = new THREE.PlaneGeometry(CONTAINER_RADIUS * 3, CONTAINER_RADIUS * 3);
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -CONTAINER_HALF_HEIGHT - 0.01;
  group.add(glow);

  return group;
}

function init(): void {
  const container = document.getElementById('app')!;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  stars = createStars(settings.starDensity);
  scene.add(stars);

  const containerGroup = createContainer();
  scene.add(containerGroup);

  particleSystem = new ParticleSystem(8000, {
    gravityStrength: settings.gravityStrength,
    particleLifetime: settings.particleLifetime
  });
  scene.add(particleSystem.points);

  forceField = new ForceField({ vortexStrength: settings.vortexStrength });
  scene.add(forceField.linesMesh);

  setupUI();
  setupEventListeners();
  updateCamera();

  animate();
}

function setupUI(): void {
  const ui = createUI(settings, {
    onSettingsChange: (newSettings: UISettings) => {
      const oldDensity = settings.starDensity;
      settings = { ...newSettings };

      particleSystem.updateParams({
        gravityStrength: settings.gravityStrength,
        particleLifetime: settings.particleLifetime
      });
      forceField.updateParams({ vortexStrength: settings.vortexStrength });

      if (Math.abs(settings.starDensity - oldDensity) > 50) {
        rebuildStars(settings.starDensity);
      }
    },
    onReset: () => {
      particleSystem.reset();
      forceField.reset();
      lastInjectionTime = 0;
      injectionActive = false;
    }
  });
  updateUIFn = ui.updateUI;
}

function setupEventListeners(): void {
  const canvas = renderer.domElement;

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 2) {
      isRightDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    } else if (e.button === 0) {
      isLeftDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      injectionActive = true;
      const worldPoint = getMouseWorldPoint(e.clientX, e.clientY);
      if (worldPoint) {
        lastWorldPoint = worldPoint.clone();
        const contained = clampToContainer(worldPoint);
        if (contained) {
          particleSystem.addParticles(contained.x, contained.y, contained.z);
          lastInjectionTime = performance.now() / 1000;
        }
      }
    }
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button === 2) {
      isRightDragging = false;
    } else if (e.button === 0) {
      isLeftDragging = false;
      injectionActive = false;
      lastWorldPoint = null;
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (isRightDragging) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      targetCameraYaw -= dx * 0.005;
      targetCameraPitch -= dy * 0.005;
      const limit = THREE.MathUtils.degToRad(30);
      targetCameraPitch = Math.max(-limit, Math.min(limit, targetCameraPitch));
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }

    if (isLeftDragging) {
      const worldPoint = getMouseWorldPoint(e.clientX, e.clientY);
      if (worldPoint) {
        const clamped = clampToContainer(worldPoint);
        if (clamped && lastWorldPoint) {
          const dist = clamped.distanceTo(lastWorldPoint);
          if (dist > 0.3) {
            forceField.addForceLine(lastWorldPoint, clamped);
            lastWorldPoint = clamped.clone();
          }
        }
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    targetCameraZoom = Math.max(0.5, Math.min(3, targetCameraZoom * factor));
  }, { passive: false });
}

function getMouseWorldPoint(clientX: number, clientY: number): THREE.Vector3 | null {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);

  const dist = camera.position.length() * 0.7;
  const target = new THREE.Vector3();
  raycaster.ray.at(dist, target);

  return target;
}

function clampToContainer(point: THREE.Vector3): THREE.Vector3 | null {
  const horizDistSq = point.x * point.x + point.z * point.z;
  if (horizDistSq > CONTAINER_RADIUS * CONTAINER_RADIUS * 1.2) return null;
  if (point.y > CONTAINER_HALF_HEIGHT + 1 || point.y < -CONTAINER_HALF_HEIGHT - 1) return null;

  const horizDist = Math.sqrt(horizDistSq);
  if (horizDist > CONTAINER_RADIUS) {
    const scale = CONTAINER_RADIUS / horizDist * 0.95;
    point.x *= scale;
    point.z *= scale;
  }
  point.y = Math.max(-CONTAINER_HALF_HEIGHT + 0.5, Math.min(CONTAINER_HALF_HEIGHT - 0.5, point.y));
  return point;
}

function updateCamera(): void {
  cameraYaw += (targetCameraYaw - cameraYaw) * 0.15;
  cameraPitch += (targetCameraPitch - cameraPitch) * 0.15;
  cameraZoom += (targetCameraZoom - cameraZoom) * 0.15;

  const dist = cameraDistance / cameraZoom;
  const cp = Math.cos(cameraPitch);
  const sp = Math.sin(cameraPitch);
  const cy = Math.cos(cameraYaw);
  const sy = Math.sin(cameraYaw);

  camera.position.x = dist * cp * sy;
  camera.position.y = dist * sp;
  camera.position.z = dist * cp * cy;
  camera.lookAt(0, 0, 0);

  if (stars && starsGeometry) {
    const positions = starsGeometry.attributes.position.array as Float32Array;
    const colors = starsGeometry.attributes.color.array as Float32Array;
    const t = performance.now() / 1000;
    for (let i = 0; i < starData.length; i++) {
      const s = starData[i];
      const parallaxAmt = 0.002;
      positions[i * 3] = s.x + cameraYaw * s.parallaxX * parallaxAmt * 30;
      positions[i * 3 + 1] = s.y + cameraPitch * s.parallaxY * parallaxAmt * 30;
      positions[i * 3 + 2] = s.z;

      const twinkle = 0.5 + 0.5 * Math.sin(t / s.period * Math.PI * 2 + s.phase);
      const base = 0.3;
      colors[i * 3] = base + twinkle * 0.5;
      colors[i * 3 + 1] = base + twinkle * 0.5;
      colors[i * 3 + 2] = (base + twinkle * 0.5) * 1.2;
    }
    (starsGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (starsGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  if (injectionActive) {
    const now = performance.now() / 1000;
    if (now - lastInjectionTime >= settings.injectionRate) {
      const worldPoint = getMouseWorldPoint(lastMouseX, lastMouseY);
      if (worldPoint) {
        const contained = clampToContainer(worldPoint);
        if (contained) {
          particleSystem.addParticles(contained.x, contained.y, contained.z);
          lastInjectionTime = now;
        }
      }
    }
  }

  forceField.updateFields();
  particleSystem.update(dt, (x, y, z, vx, vy, vz) => forceField.getForce(x, y, z, vx, vy, vz));
  updateCamera();

  if (updateUIFn) {
    updateUIFn(particleSystem.getCount());
  }

  renderer.render(scene, camera);
}

init();
