import * as THREE from 'three';
import { FireManager } from './fireManager';
import { UserInput } from './userInput';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let fireManager: FireManager;
let userInput: UserInput;
let clock: THREE.Clock;
let stars: THREE.Points;
let woodPile: THREE.Group;
let woodShadow: THREE.Mesh;
let cameraBasePosition: THREE.Vector3;
let cameraTargetPosition: THREE.Vector3;
let animTime: number = 0;

function init() {
  const app = document.getElementById('app')!;
  const width = window.innerWidth;
  const height = window.innerHeight;

  scene = new THREE.Scene();
  scene.background = createSkyGradient();
  scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0015);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
  cameraBasePosition = new THREE.Vector3(0, 50, 120);
  cameraTargetPosition = new THREE.Vector3(0, 30, 0);
  camera.position.copy(cameraBasePosition);
  camera.lookAt(cameraTargetPosition);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  app.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  userInput = new UserInput(renderer.domElement, camera);
  fireManager = new FireManager(scene);
  fireManager.setCenter(0, 0);

  userInput.setWindTriggerCallback(() => {
    fireManager.triggerWind();
  });

  createStars();
  createWoodPile();
  createGroundShadow();

  userInput.registerFireHitObject(woodPile);
  userInput.registerFireHitObject(fireManager.getHaloMesh());

  window.addEventListener('resize', onWindowResize);
}

function createSkyGradient(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#050518');
  gradient.addColorStop(0.2, '#0a0e2e');
  gradient.addColorStop(0.5, '#1a1445');
  gradient.addColorStop(0.75, '#2a1a52');
  gradient.addColorStop(1, '#1a1030');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createStars() {
  const starCount = 150;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);

  const colorPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xfff4e0),
    new THREE.Color(0xe0e8ff),
    new THREE.Color(0xffe8c0),
    new THREE.Color(0xf0e8ff)
  ];

  for (let i = 0; i < starCount; i++) {
    const radius = 400 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.7 + 50;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 2 + Math.random() * 4;
    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const starCanvas = document.createElement('canvas');
  starCanvas.width = 64;
  starCanvas.height = 64;
  const sctx = starCanvas.getContext('2d')!;
  const sgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  sgrad.addColorStop(0, 'rgba(255,255,255,1)');
  sgrad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
  sgrad.addColorStop(0.6, 'rgba(255,255,255,0.4)');
  sgrad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 64, 64);

  const starTexture = new THREE.CanvasTexture(starCanvas);

  const material = new THREE.PointsMaterial({
    size: 4,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function createWoodPile() {
  woodPile = new THREE.Group();
  const woodCount = 18;

  for (let i = 0; i < woodCount; i++) {
    const log = createWoodLog(i);
    woodPile.add(log);
  }

  woodPile.position.y = 0;
  scene.add(woodPile);
}

function createWoodLog(index: number): THREE.Mesh {
  const layer = Math.floor(index / 6);
  const indexInLayer = index % 6;

  const woodShape = new THREE.Shape();
  const sides = 5 + Math.floor(Math.random() * 3);
  const radiusVariation: number[] = [];
  for (let i = 0; i < sides; i++) {
    radiusVariation.push(0.7 + Math.random() * 0.6);
  }
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = (3 + Math.random() * 2) * radiusVariation[i % sides];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) woodShape.moveTo(x, y);
    else woodShape.lineTo(x, y);
  }

  const logLength = 25 + Math.random() * 15;
  const extrudeSettings = {
    depth: logLength,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.3,
    bevelSegments: 2
  };

  const geometry = new THREE.ExtrudeGeometry(woodShape, extrudeSettings);
  geometry.rotateZ(Math.PI / 2);

  const woodColors = [
    0x4a2810,
    0x5c3218,
    0x6b3a1e,
    0x3d1e0a,
    0x522a12,
    0x45220f
  ];
  const woodColor = woodColors[Math.floor(Math.random() * woodColors.length)];

  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 256;
  grainCanvas.height = 64;
  const gctx = grainCanvas.getContext('2d')!;

  gctx.fillStyle = `#${woodColor.toString(16).padStart(6, '0')}`;
  gctx.fillRect(0, 0, 256, 64);

  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 64;
    const shade = Math.random() * 0.4 - 0.2;
    gctx.strokeStyle = `rgba(${Math.floor(80 + shade * 40)}, ${Math.floor(40 + shade * 20)}, ${Math.floor(20 + shade * 10)}, 0.3)`;
    gctx.lineWidth = 0.5 + Math.random() * 1;
    gctx.beginPath();
    gctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 10) {
      gctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
    }
    gctx.stroke();
  }

  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 64;
    const r = 1 + Math.random() * 3;
    gctx.fillStyle = `rgba(30, 15, 5, 0.5)`;
    gctx.beginPath();
    gctx.arc(x, y, r, 0, Math.PI * 2);
    gctx.fill();
  }

  const grainTexture = new THREE.CanvasTexture(grainCanvas);
  grainTexture.wrapS = THREE.RepeatWrapping;
  grainTexture.wrapT = THREE.RepeatWrapping;
  grainTexture.repeat.set(2, 1);

  const emissiveStrength = 0.08 + Math.random() * 0.08;
  const emissiveColor = new THREE.Color(woodColor).multiplyScalar(0.6);
  emissiveColor.r = Math.min(1, emissiveColor.r + 0.1);

  const material = new THREE.MeshStandardMaterial({
    map: grainTexture,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    emissive: emissiveColor,
    emissiveIntensity: emissiveStrength,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  const angleOffset = (indexInLayer / 6) * Math.PI * 2 + layer * 0.3;
  const radius = 5 - layer * 1.5;
  mesh.position.set(
    Math.cos(angleOffset) * radius,
    layer * 5 - 2 + (Math.random() - 0.5) * 2,
    Math.sin(angleOffset) * radius
  );

  mesh.rotation.set(
    (Math.random() - 0.5) * 0.3,
    angleOffset + (Math.random() - 0.5) * 0.4,
    (Math.random() - 0.5) * 0.2
  );

  return mesh;
}

function createGroundShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 256);
  gradient.addColorStop(0, 'rgba(255,120,50,0.35)');
  gradient.addColorStop(0.3, 'rgba(200,80,30,0.2)');
  gradient.addColorStop(0.6, 'rgba(150,50,20,0.08)');
  gradient.addColorStop(1, 'rgba(100,30,10,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(200, 100);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.MultiplyBlending
  });

  woodShadow = new THREE.Mesh(geometry, material);
  woodShadow.rotation.x = -Math.PI / 2;
  woodShadow.position.y = -0.5;
  scene.add(woodShadow);
}

function updateStars() {
  const positions = stars.geometry.attributes.position as THREE.BufferAttribute;
  const colors = stars.geometry.attributes.color as THREE.BufferAttribute;
  const phases = stars.geometry.attributes.phase as THREE.BufferAttribute;

  const rotationSpeed = 0.00015;

  for (let i = 0; i < positions.count; i++) {
    const phase = phases.array[i] as number;
    const brightness = 0.2 + (Math.sin(animTime * 0.02 + phase) * 0.5 + 0.5) * 0.7;

    (colors.array as Float32Array)[i * 3] *= brightness / 0.5;
    (colors.array as Float32Array)[i * 3 + 1] *= brightness / 0.5;
    (colors.array as Float32Array)[i * 3 + 2] *= brightness / 0.5;

    const x = positions.array[i * 3] as number;
    const z = positions.array[i * 3 + 2] as number;
    const cos = Math.cos(rotationSpeed);
    const sin = Math.sin(rotationSpeed);
    positions.array[i * 3] = x * cos - z * sin;
    positions.array[i * 3 + 2] = x * sin + z * cos;
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

function updateWoodPile() {
  const pulse = 0.85 + Math.sin(animTime * 0.05) * 0.15;

  woodPile.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const windSway = fireManager.wind.active
        ? Math.cos(fireManager.wind.direction) * fireManager.wind.intensity * 0.02
        : 0;
      child.rotation.z += windSway * 0.001;
      child.material.emissiveIntensity = (0.08 + Math.random() * 0.05) * pulse *
        (fireManager.wind.active ? 1.5 : 1);
    }
  });

  if (woodShadow && woodShadow.material instanceof THREE.MeshBasicMaterial) {
    woodShadow.material.opacity = 0.7 * pulse * (fireManager.wind.active ? 1.3 : 1);
    const sway = fireManager.wind.active
      ? Math.cos(fireManager.wind.direction) * fireManager.wind.intensity * 5
      : Math.sin(animTime * 0.03) * 0.5;
    woodShadow.position.x = sway;
    woodShadow.scale.setScalar(0.95 + pulse * 0.1);
  }
}

function updateCamera() {
  userInput.update();

  const zoom = userInput.getZoom();
  const baseOffset = cameraBasePosition.clone().sub(cameraTargetPosition);
  const scaledOffset = baseOffset.multiplyScalar(1 / zoom);

  const targetPos = cameraTargetPosition.clone().add(scaledOffset);

  const windShake = fireManager.wind.active
    ? new THREE.Vector3(
        Math.sin(animTime * 0.1) * fireManager.wind.intensity * 0.8,
        Math.cos(animTime * 0.08) * fireManager.wind.intensity * 0.3,
        Math.sin(animTime * 0.12) * fireManager.wind.intensity * 0.5
      )
    : new THREE.Vector3(0, 0, 0);

  camera.position.lerp(targetPos.add(windShake), 0.05);
  camera.lookAt(cameraTargetPosition);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  animTime += 1;

  fireManager.update(delta);
  updateStars();
  updateWoodPile();
  updateCamera();

  renderer.render(scene, camera);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

init();
animate();
