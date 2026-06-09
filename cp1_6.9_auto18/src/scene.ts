import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  moonLight: THREE.PointLight;
  ambientLight: THREE.AmbientLight;
  ground: THREE.Mesh;
  trees: THREE.Group[];
  groundParticles: THREE.Points;
  moonOrbitRadius: number;
  moonCycleTime: number;
}

const GROUND_SIZE = 25;
const GROUND_SEGMENTS = 100;
const TREE_COUNT = 35;
const GROUND_PARTICLE_COUNT = 200;

export function initScene(canvas: HTMLCanvasElement): SceneObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.Fog(0x050510, 20, 50);

  const camera = new THREE.PerspectiveCamera(60, 3 / 2, 0.1, 100);
  camera.position.set(0, 12, 22);
  camera.lookAt(0, 3, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
  scene.add(ambientLight);

  const moonLight = new THREE.PointLight(0xffffff, 1.5, 80, 1.5);
  moonLight.position.set(-10, 15, -10);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  scene.add(moonLight);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  moonMesh.position.copy(moonLight.position);
  scene.add(moonMesh);
  (moonLight as any).mesh = moonMesh;

  const ground = createGround();
  scene.add(ground);

  const trees = createTrees();
  trees.forEach(tree => scene.add(tree));

  const groundParticles = createGroundParticles();
  scene.add(groundParticles);

  return {
    scene,
    camera,
    renderer,
    moonLight,
    ambientLight,
    ground,
    trees,
    groundParticles,
    moonOrbitRadius: Math.sqrt(10 * 10 + 10 * 10),
    moonCycleTime: 40
  };
}

function createGround(): THREE.Mesh {
  const noise2D = createNoise2D();
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const colorStart = new THREE.Color(0x0a1a2a);
  const colorEnd = new THREE.Color(0x2a1a3a);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const noiseVal = noise2D(x * 0.15, z * 0.15) * 0.8 + noise2D(x * 0.4, z * 0.4) * 0.2;
    positions.setY(i, noiseVal);

    const t = (noiseVal + 1) / 2;
    const color = colorStart.clone().lerp(colorEnd, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function createTrees(): THREE.Group[] {
  const trees: THREE.Group[] = [];
  const noise2D = createNoise2D();

  for (let i = 0; i < TREE_COUNT; i++) {
    const tree = new THREE.Group();
    const height = 5 + Math.random() * 4;
    const trunkRadius = 0.15 + Math.random() * 0.1;

    const trunkGeom = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, height * 0.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.95
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = height * 0.2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const crownRadius = 1.2 + Math.random() * 0.8;
    const crownHeight = height * 0.7;
    const crownGeom = new THREE.ConeGeometry(crownRadius, crownHeight, 10);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a2a,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const crown = new THREE.Mesh(crownGeom, crownMat);
    crown.position.y = height * 0.4 + crownHeight * 0.5;
    crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(crown);

    const haloGeom = new THREE.SphereGeometry(crownRadius * 1.1, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x2a1a4a,
      transparent: true,
      opacity: 0.25
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.copy(crown.position);
    tree.add(halo);

    let x, z;
    const margin = 2;
    do {
      x = (Math.random() - 0.5) * (GROUND_SIZE - margin * 2);
      z = (Math.random() - 0.5) * (GROUND_SIZE - margin * 2);
    } while (Math.sqrt(x * x + z * z) < 4);

    const groundY = noise2D(x * 0.15, z * 0.15) * 0.8 + noise2D(x * 0.4, z * 0.4) * 0.2;
    tree.position.set(x, groundY, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(0.8 + Math.random() * 0.5);

    trees.push(tree);
  }

  return trees;
}

function createGroundParticles(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(GROUND_PARTICLE_COUNT * 3);
  const noise2D = createNoise2D();

  for (let i = 0; i < GROUND_PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * GROUND_SIZE * 0.9;
    const z = (Math.random() - 0.5) * GROUND_SIZE * 0.9;
    const y = noise2D(x * 0.15, z * 0.15) * 0.8 + noise2D(x * 0.4, z * 0.4) * 0.2 + 0.1 + Math.random() * 0.5;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x4488ff,
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

export function resizeRenderer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
  const aspect = 3 / 2;
  const maxWidth = Math.min(window.innerWidth * 0.85, 1200);
  const maxHeight = Math.min(window.innerHeight * 0.85, 800);

  let width = maxWidth;
  let height = width / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  renderer.setSize(width, height, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

export function updateMoonLight(moonLight: THREE.PointLight, elapsed: number, cycleTime: number, brightnessMultiplier: number): void {
  const angle = (elapsed / cycleTime) * Math.PI * 2 - Math.PI / 2;
  const radius = 14;
  moonLight.position.x = Math.cos(angle) * radius;
  moonLight.position.z = Math.sin(angle) * radius;
  moonLight.position.y = 15 + Math.sin(angle) * 2;

  if ((moonLight as any).mesh) {
    (moonLight as any).mesh.position.copy(moonLight.position);
  }

  const t = (Math.sin(angle) + 1) / 2;
  const coldWhite = new THREE.Color(0xffffff);
  const lightBlue = new THREE.Color(0xaaccff);
  const color = coldWhite.clone().lerp(lightBlue, t);
  moonLight.color.copy(color);
  if ((moonLight as any).mesh) {
    ((moonLight as any).mesh as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color });
  }

  const baseIntensity = 1.2;
  const zenithBoost = Math.max(0, Math.sin(angle));
  moonLight.intensity = (baseIntensity + zenithBoost * 0.5) * brightnessMultiplier;
}

export function updateGroundParticles(particles: THREE.Points, elapsed: number): void {
  const material = particles.material as THREE.PointsMaterial;
  const pulse = 0.4 + Math.sin(elapsed * 2) * 0.2 + Math.sin(elapsed * 5.3) * 0.1;
  material.opacity = pulse;
}
