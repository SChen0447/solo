import * as THREE from 'three';
import { generateTree, DEFAULT_CONFIG, type TreeConfig, type TreeResult, type BranchData } from './fractalTree';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let treeGroup: THREE.Group;
let ground: THREE.Mesh;
let interactionManager: InteractionManager;
let uiManager: UIManager;
let treeResult: TreeResult | null = null;
let currentConfig: TreeConfig = { ...DEFAULT_CONFIG };
let growthSpeed: number = 1.0;

let isGrowing: boolean = false;
let growthStartTime: number = 0;
let currentGrowthDepth: number = -1;
const LAYER_GROWTH_TIME = 800;
let isSwaying: boolean = false;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0D1117);
  scene.fog = new THREE.FogExp2(0x0D1117, 0.05);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  createGround();
  createLights();

  uiManager = new UIManager({
    onDepthChange: (depth) => {
      currentConfig.maxDepth = depth;
      regenerateTree(false);
    },
    onAngleChange: (angle) => {
      currentConfig.branchAngle = angle;
      regenerateTree(false);
    },
    onSpeedChange: (speed) => {
      growthSpeed = speed;
    },
  });

  interactionManager = new InteractionManager(camera, renderer, scene, currentConfig);
  interactionManager.onBranchBreak(() => {
    uiManager.updateBranchCount(interactionManager.getBranchCount());
  });
  interactionManager.onRegenerate(() => {
    regenerateTree(true);
  });

  generateNewTree();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function createGround(): void {
  const ringGeometry = new THREE.RingGeometry(0.1, 5, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  ground = new THREE.Mesh(ringGeometry, ringMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  scene.add(ground);

  const glowGeometry = new THREE.CircleGeometry(5.2, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00D4AA,
    transparent: true,
    opacity: 0.03,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  scene.add(glow);
}

function createLights(): void {
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(5, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x00D4AA, 0.3);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xFF6B6B, 0.4, 20);
  rimLight.position.set(0, 5, -8);
  scene.add(rimLight);
}

function generateNewTree(): void {
  if (treeResult) {
    scene.remove(treeResult.group);
    disposeTree(treeResult);
  }

  treeResult = generateTree(currentConfig);
  treeGroup = treeResult.group;
  treeGroup.position.y = 0;
  scene.add(treeGroup);

  interactionManager.setTreeResult(treeResult);
  uiManager.updateBranchCount(treeResult.branchCount);

  startGrowthAnimation();
}

function regenerateTree(withAnimation: boolean): void {
  interactionManager.setConfig(currentConfig);
  
  if (treeResult) {
    scene.remove(treeResult.group);
    disposeTree(treeResult);
  }

  treeResult = generateTree(currentConfig);
  treeGroup = treeResult.group;
  treeGroup.position.y = 0;
  scene.add(treeGroup);

  interactionManager.setTreeResult(treeResult);
  uiManager.updateBranchCount(treeResult.branchCount);

  if (withAnimation) {
    startGrowthAnimation();
  } else {
    if (treeResult) {
      treeResult.branches.forEach((branch) => {
        if (branch.mesh) {
          branch.mesh.scale.setScalar(1);
          branch.mesh.visible = true;
        }
      });
    }
    isGrowing = false;
    isSwaying = true;
  }
}

function startGrowthAnimation(): void {
  isGrowing = true;
  isSwaying = false;
  growthStartTime = performance.now();
  currentGrowthDepth = -1;

  if (treeResult) {
    treeResult.branches.forEach((branch) => {
      if (branch.mesh) {
        branch.mesh.scale.setScalar(0);
        branch.mesh.visible = false;
      }
    });
  }
}

function updateGrowthAnimation(currentTime: number): void {
  if (!treeResult || !isGrowing) return;

  const elapsed = (currentTime - growthStartTime) * growthSpeed;
  const targetDepth = Math.floor(elapsed / LAYER_GROWTH_TIME);

  if (targetDepth > currentGrowthDepth && targetDepth <= currentConfig.maxDepth) {
    currentGrowthDepth = targetDepth;
    showBranchesAtDepth(currentGrowthDepth);
  }

  if (currentGrowthDepth <= currentConfig.maxDepth) {
    const layerProgress = (elapsed % LAYER_GROWTH_TIME) / LAYER_GROWTH_TIME;
    const easedProgress = easeOutCubic(Math.min(1, layerProgress));
    scaleBranchesAtDepth(currentGrowthDepth, easedProgress);
  }

  const totalDuration = (currentConfig.maxDepth + 1) * LAYER_GROWTH_TIME;
  if (elapsed >= totalDuration) {
    isGrowing = false;
    isSwaying = true;
  }
}

function showBranchesAtDepth(depth: number): void {
  if (!treeResult) return;
  treeResult.branches.forEach((branch) => {
    if (branch.depth === depth && branch.mesh) {
      branch.mesh.visible = true;
      branch.mesh.scale.setScalar(0.01);
    }
  });
}

function scaleBranchesAtDepth(depth: number, scale: number): void {
  if (!treeResult) return;
  treeResult.branches.forEach((branch: BranchData) => {
    if (branch.depth === depth && branch.mesh) {
      branch.mesh.scale.setScalar(Math.max(0.01, scale));
    }
  });
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function disposeTree(result: TreeResult): void {
  result.branches.forEach((branch) => {
    if (branch.mesh) {
      branch.mesh.geometry.dispose();
      if (Array.isArray(branch.mesh.material)) {
        branch.mesh.material.forEach((m) => m.dispose());
      } else {
        branch.mesh.material.dispose();
      }
    }
  });
  result.meshes.clear();
  result.branches.clear();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const currentTime = performance.now();

  interactionManager.updateCamera();

  if (isGrowing) {
    updateGrowthAnimation(currentTime);
  } else if (isSwaying && treeResult) {
    interactionManager.updateSway(currentTime);
  }

  interactionManager.updateFallingBranches(currentTime);
  interactionManager.updateRegrowAnimations(currentTime);

  uiManager.updateFPS(currentTime);
  uiManager.updateBranchCount(interactionManager.getBranchCount());

  renderer.render(scene, camera);
}

init();
