import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createAuroraMaterial, updateAuroraTime } from './AuroraShader';
import { IceCrystal } from './IceCrystal';
import { InteractionManager } from './InteractionManager';

const DOME_RADIUS = 8;
const ICE_PLANE_SIZE = 16;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let interactionManager: InteractionManager;
let rootGroup: THREE.Group;
let canvasContainer: HTMLElement;

const clock = new THREE.Clock();

function init(): void {
  canvasContainer = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#000820');
  gradient.addColorStop(1, '#003322');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;
  scene.fog = new THREE.FogExp2(0x000820, 0.06);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 2.5, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasContainer.appendChild(renderer.domElement);

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.enablePan = false;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.target.set(0, 0.8, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  const ambientLight = new THREE.AmbientLight(0x446688, 0.4);
  scene.add(ambientLight);

  const topLight = new THREE.DirectionalLight(0xa0e0ff, 0.3);
  topLight.position.set(0, 10, 0);
  scene.add(topLight);

  createDome();
  createIcePlane();

  interactionManager = new InteractionManager(scene, camera, renderer);
  createCrystals();

  window.addEventListener('resize', onWindowResize);
  onWindowResize();

  animate();
}

function createDome(): void {
  const domeGeo = new THREE.SphereGeometry(DOME_RADIUS, 64, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const auroraMat = createAuroraMaterial();
  const dome = new THREE.Mesh(domeGeo, auroraMat);
  dome.position.y = 0;
  rootGroup.add(dome);

  const innerGeo = new THREE.SphereGeometry(DOME_RADIUS * 0.98, 48, 36, 0, Math.PI * 2, 0, Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x000820,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.15
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  rootGroup.add(inner);
}

function createIcePlane(): void {
  const iceGeo = new THREE.PlaneGeometry(ICE_PLANE_SIZE, ICE_PLANE_SIZE, 80, 80);
  const positions = iceGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    let z = 0;
    if (dist > ICE_PLANE_SIZE * 0.35) {
      const falloff = (dist - ICE_PLANE_SIZE * 0.35) / (ICE_PLANE_SIZE * 0.5);
      z = -falloff * falloff * 0.3;
    }
    z += (Math.random() - 0.5) * 0.008;
    positions.setZ(i, z);
  }
  iceGeo.computeVertexNormals();

  const crackCanvas = document.createElement('canvas');
  crackCanvas.width = 1024;
  crackCanvas.height = 1024;
  const ctx = crackCanvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = 'rgba(160, 224, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    ctx.beginPath();
    let x = Math.random() * 1024;
    let y = Math.random() * 1024;
    ctx.moveTo(x, y);
    const segments = 4 + Math.floor(Math.random() * 6);
    for (let j = 0; j < segments; j++) {
      x += (Math.random() - 0.5) * 180;
      y += (Math.random() - 0.5) * 180;
      ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.08 + Math.random() * 0.15;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const crackTexture = new THREE.CanvasTexture(crackCanvas);
  crackTexture.wrapS = THREE.RepeatWrapping;
  crackTexture.wrapT = THREE.RepeatWrapping;
  crackTexture.repeat.set(2, 2);

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0f8ff,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.6,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.3,
    side: THREE.DoubleSide,
    map: crackTexture,
    emissive: 0x001122,
    emissiveIntensity: 0.2
  });

  const icePlane = new THREE.Mesh(iceGeo, iceMat);
  icePlane.rotation.x = -Math.PI / 2;
  icePlane.position.y = 0;
  icePlane.receiveShadow = true;
  rootGroup.add(icePlane);

  const rimGeo = new THREE.RingGeometry(ICE_PLANE_SIZE * 0.42, ICE_PLANE_SIZE * 0.5, 96);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x000820,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -0.01;
  rootGroup.add(rim);
}

function createCrystals(): void {
  const count = 30 + Math.floor(Math.random() * 21);
  const usedPositions: THREE.Vector2[] = [];

  for (let i = 0; i < count; i++) {
    let x = 0;
    let z = 0;
    let attempts = 0;
    while (attempts < 30) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * (ICE_PLANE_SIZE * 0.38);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      let tooClose = false;
      for (const p of usedPositions) {
        const dx = p.x - x;
        const dz = p.y - z;
        if (dx * dx + dz * dz < 0.35 * 0.35) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) break;
      attempts++;
    }
    usedPositions.push(new THREE.Vector2(x, z));

    const hue = Math.random();
    const pos = new THREE.Vector3(x, 0, z);
    const crystal = new IceCrystal(pos, hue);
    interactionManager.addCrystal(crystal);
  }
}

function onWindowResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  let renderWidth = width;
  let renderHeight = height;

  if (aspect > 16 / 9) {
    renderWidth = height * (16 / 9);
  }

  renderer.setSize(renderWidth, renderHeight);
  renderer.domElement.style.marginLeft = `${(width - renderWidth) / 2}px`;
  renderer.domElement.style.marginTop = `${(height - renderHeight) / 2}px`;

  camera.aspect = renderWidth / renderHeight;

  if (aspect < 4 / 3) {
    const t = (4 / 3 - aspect) / (4 / 3 - 1);
    const s = 1.0 - t * 0.2;
    rootGroup.scale.setScalar(s);
  } else {
    rootGroup.scale.setScalar(1);
  }

  camera.updateProjectionMatrix();
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  updateAuroraTime(delta);
  controls.update();
  interactionManager.update(delta, now);

  renderer.render(scene, camera);
}

init();
