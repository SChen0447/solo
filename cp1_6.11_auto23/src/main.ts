import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createTree,
  createTreeMesh,
  interpolateTreeData,
  scaleGrowth,
  TreeParams,
  TreeObject,
  TreeMeshData
} from './treeGenerator';
import { setupUI } from './uiManager';

const app = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a2e1a, 15, 50);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(10, 5, 10);
camera.lookAt(0, 2.5, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setClearColor(0x000000, 0);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 2, 0);
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.48;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
};
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN
};

const ambientLight = new THREE.AmbientLight(0x4a6b4a, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
sunLight.position.set(8, 12, 6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.camera.left = -15;
sunLight.shadow.camera.right = 15;
sunLight.shadow.camera.top = 15;
sunLight.shadow.camera.bottom = -15;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x88ccaa, 0.4);
fillLight.position.set(-6, 4, -6);
scene.add(fillLight);

const groundGeometry = new THREE.CircleGeometry(20, 64);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a3d20,
  roughness: 0.9,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const seedGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const seedMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a3728,
  roughness: 0.8
});
const seed = new THREE.Mesh(seedGeometry, seedMaterial);
seed.position.y = 0.15;
seed.castShadow = true;
scene.add(seed);

let currentParams: TreeParams = {
  light: 1.0,
  water: 1.0,
  wind: 0.3
};

let currentTree: TreeObject | null = null;
let targetTreeData: TreeMeshData | null = null;
let previousTreeData: TreeMeshData | null = null;

type AnimationState = 'idle' | 'growing' | 'transitioning';

let animationState: AnimationState = 'idle';
let animationStartTime = 0;
let animationDuration = 3000;

const ui = setupUI(app, {
  onParamsChange: (params) => {
    if (animationState === 'growing') return;
    handleParamsChange(params);
  },
  onGrow: () => {
    startGrowthAnimation();
  }
});

function handleParamsChange(params: TreeParams): void {
  currentParams = { ...params };

  if (currentTree && animationState === 'idle') {
    previousTreeData = currentTree.data;
    targetTreeData = createTree(currentParams);

    const newBranchCount = targetTreeData.branchPositions.length;
    const prevBranchCount = previousTreeData.branchPositions.length;
    const newLeafCount = targetTreeData.leafPositions.length;
    const prevLeafCount = previousTreeData.leafPositions.length;

    if (newBranchCount !== prevBranchCount || newLeafCount !== prevLeafCount) {
      rebuildTreeGeometry(targetTreeData);
    }

    animationState = 'transitioning';
    animationStartTime = performance.now();
    animationDuration = 800;
  } else if (!currentTree) {
    targetTreeData = createTree(currentParams);
    rebuildTreeGeometry(targetTreeData);
    applyScale(0);
  }
}

function rebuildTreeGeometry(data: TreeMeshData): void {
  if (currentTree) {
    currentTree.group.removeFromParent();
  }

  currentTree = createTreeMesh(data, currentParams);
  scene.add(currentTree.group);

  ui.updateStats(data.stats, currentParams);
}

function applyScale(t: number): void {
  if (!currentTree) return;

  const scaled = scaleGrowth(currentTree.data, t);

  const branchPosAttr = currentTree.branchMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const leafPosAttr = currentTree.leafMesh.geometry.getAttribute('position') as THREE.BufferAttribute;

  if (scaled.branchPositions.length === branchPosAttr.array.length) {
    (branchPosAttr.array as Float32Array).set(scaled.branchPositions);
  }

  if (scaled.leafPositions.length === leafPosAttr.array.length) {
    (leafPosAttr.array as Float32Array).set(scaled.leafPositions);
  }

  branchPosAttr.needsUpdate = true;
  leafPosAttr.needsUpdate = true;

  currentTree.branchMesh.geometry.computeVertexNormals();
  currentTree.leafMesh.geometry.computeVertexNormals();

  seed.visible = t < 0.15;
}

function applyTransition(t: number): void {
  if (!currentTree || !previousTreeData || !targetTreeData) return;

  const interpolated = interpolateTreeData(previousTreeData, targetTreeData, t);

  const branchPosAttr = currentTree.branchMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const leafPosAttr = currentTree.leafMesh.geometry.getAttribute('position') as THREE.BufferAttribute;

  const branchArr = branchPosAttr.array as Float32Array;
  const leafArr = leafPosAttr.array as Float32Array;

  const branchCopyLen = Math.min(interpolated.branchPositions.length, branchArr.length);
  const leafCopyLen = Math.min(interpolated.leafPositions.length, leafArr.length);

  for (let i = 0; i < branchCopyLen; i++) {
    branchArr[i] = interpolated.branchPositions[i];
  }

  for (let i = 0; i < leafCopyLen; i++) {
    leafArr[i] = interpolated.leafPositions[i];
  }

  branchPosAttr.needsUpdate = true;
  leafPosAttr.needsUpdate = true;

  currentTree.branchMesh.geometry.computeVertexNormals();
  currentTree.leafMesh.geometry.computeVertexNormals();
}

function startGrowthAnimation(): void {
  targetTreeData = createTree(currentParams);
  rebuildTreeGeometry(targetTreeData);

  animationState = 'growing';
  animationStartTime = performance.now();
  animationDuration = 3000;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = now - lastTime;
  lastTime = now;

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 1000) {
    currentFps = (frameCount * 1000) / fpsTime;
    frameCount = 0;
    fpsTime = 0;
  }

  if (animationState !== 'idle') {
    const elapsed = now - animationStartTime;
    const t = Math.min(elapsed / animationDuration, 1);

    if (animationState === 'growing') {
      applyScale(easeOutCubic(t));
      if (t >= 1) {
        animationState = 'idle';
      }
    } else if (animationState === 'transitioning') {
      applyTransition(easeOutCubic(t));
      if (t >= 1 && targetTreeData) {
        animationState = 'idle';
      }
    }
  }

  if (currentTree && animationState === 'idle') {
    const time = now * 0.001;
    const swayAmount = currentParams.wind * 0.03;
    currentTree.group.rotation.z = Math.sin(time * 0.7) * swayAmount;
    currentTree.group.rotation.x = Math.cos(time * 0.5) * swayAmount * 0.5;
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

handleParamsChange(currentParams);
applyScale(0);
animate();
