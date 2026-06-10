import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  buildMolecule,
  disposeMolecule,
  getMoleculeBoundingSphere,
  MoleculeGroup,
  AtomInfo,
  getElementColor,
  MOLECULES,
} from './moleculeBuilder';
import { UIController } from './uiController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let container: HTMLElement;
let uiController: UIController;

let currentMolecule: MoleculeGroup | null = null;
let pendingMolecule: MoleculeGroup | null = null;
let fadeOutTween: number | null = null;
let fadeInTween: number | null = null;
let cameraTween: {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
} | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredAtom: THREE.Mesh | null = null;
let selectedAtom: THREE.Mesh | null = null;
let highlightScale = new Map<THREE.Mesh, { base: THREE.Vector3; target: THREE.Vector3 }>();

const FADE_DURATION = 500;
const CAMERA_TWEEN_DURATION = 600;

function init(): void {
  container = document.getElementById('canvas-container')!;
  uiController = new UIController();

  initScene();
  initCamera();
  initRenderer();
  initLights();
  initControls();

  uiController.onMoleculeChange(handleMoleculeChange);
  uiController.onDeselect(() => {
    clearSelection();
  });

  window.addEventListener('resize', onWindowResize);
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onMouseClick);
  container.addEventListener('mouseleave', () => {
    setHoveredAtom(null);
    uiController.hideTooltip();
  });

  const initialMolecule = uiController.getSelectedMolecule() || 'methane';
  loadMolecule(initialMolecule);

  animate();
}

function initScene(): void {
  scene = new THREE.Scene();

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, 'rgb(40, 20, 80)');
  gradient.addColorStop(1, 'rgb(10, 10, 40)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
}

function initCamera(): void {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8);
}

function initRenderer(): void {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
}

function initLights(): void {
  const ambient1 = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient1);

  const ambient2 = new THREE.AmbientLight(0x8888ff, 0.2);
  scene.add(ambient2);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x8866ff, 0.3);
  fillLight.position.set(-5, -3, -5);
  scene.add(fillLight);
}

function initControls(): void {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.7;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e: MouseEvent): void {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const hit = pickAtom();
  if (hit) {
    setHoveredAtom(hit);
    const info = getAtomInfo(hit);
    if (info) {
      const color = getElementColor(info.element);
      const colorCss = '#' + color.toString(16).padStart(6, '0');
      uiController.showTooltip(e.clientX, e.clientY, info.element, colorCss);
    }
  } else {
    setHoveredAtom(null);
    uiController.hideTooltip();
  }

  if (hoveredAtom || pickAtom()) {
    uiController.moveTooltip(e.clientX, e.clientY);
  }
}

function onMouseClick(e: MouseEvent): void {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const hit = pickAtom();
  if (hit) {
    selectAtom(hit);
  } else {
    clearSelection();
  }
}

function pickAtom(): THREE.Mesh | null {
  if (!currentMolecule) return null;

  raycaster.setFromCamera(mouse, camera);
  const meshes: THREE.Mesh[] = [];
  currentMolecule.userData.atoms.forEach((_info, mesh) => meshes.push(mesh));
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    return intersects[0].object as THREE.Mesh;
  }
  return null;
}

function getAtomInfo(mesh: THREE.Mesh): AtomInfo | null {
  if (!currentMolecule) return null;
  return currentMolecule.userData.atoms.get(mesh) || null;
}

function setHoveredAtom(mesh: THREE.Mesh | null): void {
  if (hoveredAtom && hoveredAtom !== selectedAtom) {
    setAtomHighlight(hoveredAtom, false);
  }
  hoveredAtom = mesh;
  if (hoveredAtom && hoveredAtom !== selectedAtom) {
    setAtomHighlight(hoveredAtom, true);
  }
}

function selectAtom(mesh: THREE.Mesh): void {
  if (selectedAtom && selectedAtom !== mesh) {
    setAtomHighlight(selectedAtom, false);
  }
  selectedAtom = mesh;
  setAtomHighlight(selectedAtom, true);

  const info = getAtomInfo(mesh);
  if (info) {
    uiController.showSelectedAtom(info);
  }
}

function clearSelection(): void {
  if (selectedAtom) {
    setAtomHighlight(selectedAtom, false);
    selectedAtom = null;
  }
  uiController.clearSelectedAtom();
}

function setAtomHighlight(mesh: THREE.Mesh, highlighted: boolean): void {
  if (!highlightScale.has(mesh)) {
    highlightScale.set(mesh, {
      base: mesh.scale.clone(),
      target: mesh.scale.clone(),
    });
  }
  const entry = highlightScale.get(mesh)!;
  if (highlighted) {
    entry.target.copy(entry.base).multiplyScalar(1.25);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat.emissive) {
      const color = getElementColor(getAtomInfo(mesh)?.element || 'C');
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 0.4;
    }
  } else {
    entry.target.copy(entry.base);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat.emissive) {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }
  }
}

function handleMoleculeChange(key: string): void {
  if (pendingMolecule || fadeOutTween !== null) return;
  if (!MOLECULES[key]) return;
  if (currentMolecule && currentMolecule.userData.moleculeName === key) return;

  loadMolecule(key);
}

function loadMolecule(key: string): void {
  clearSelection();
  uiController.hideTooltip();

  const newMolecule = buildMolecule(key);
  newMolecule.scale.set(0.01, 0.01, 0.01);
  scene.add(newMolecule);

  pendingMolecule = newMolecule;

  if (currentMolecule) {
    fadeOutTween = performance.now();
  } else {
    fadeInTween = performance.now();
    currentMolecule = newMolecule;
    pendingMolecule = null;
    adjustCameraForMolecule(newMolecule);
  }
}

function adjustCameraForMolecule(group: MoleculeGroup): void {
  const sphere = getMoleculeBoundingSphere(group);
  const center = sphere.center;
  const radius = Math.max(sphere.radius, 1.5);

  const fov = (camera.fov * Math.PI) / 180;
  const distance = radius / Math.sin(fov / 2) * 1.2;
  const direction = new THREE.Vector3(0.4, 0.6, 1).normalize();
  const targetPos = center.clone().add(direction.multiplyScalar(distance));

  cameraTween = {
    startPos: camera.position.clone(),
    endPos: targetPos,
    startTarget: controls.target.clone(),
    endTarget: center.clone(),
    progress: 0,
    duration: CAMERA_TWEEN_DURATION,
  };

  controls.minDistance = Math.max(radius * 0.5, 1);
  controls.maxDistance = radius * 5;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateFadeAnimations(now: number): void {
  if (fadeOutTween !== null && currentMolecule) {
    const elapsed = now - fadeOutTween;
    const t = Math.min(elapsed / FADE_DURATION, 1);
    const eased = easeInOutCubic(t);
    const scale = 1 - eased;
    currentMolecule.scale.setScalar(Math.max(scale, 0.001));

    if (t >= 1) {
      disposeMolecule(currentMolecule);
      scene.remove(currentMolecule);
      currentMolecule = null;
      fadeOutTween = null;

      if (pendingMolecule) {
        currentMolecule = pendingMolecule;
        pendingMolecule = null;
        fadeInTween = now;
        adjustCameraForMolecule(currentMolecule);
      }
    }
  }

  if (fadeInTween !== null && currentMolecule) {
    const elapsed = now - fadeInTween;
    const t = Math.min(elapsed / FADE_DURATION, 1);
    const eased = easeInOutCubic(t);
    currentMolecule.scale.setScalar(eased);

    if (t >= 1) {
      currentMolecule.scale.setScalar(1);
      fadeInTween = null;
    }
  }
}

function updateCameraTween(delta: number): void {
  if (!cameraTween) return;

  cameraTween.progress += delta * 1000;
  const t = Math.min(cameraTween.progress / cameraTween.duration, 1);
  const eased = easeInOutCubic(t);

  camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, eased);
  controls.target.lerpVectors(
    cameraTween.startTarget,
    cameraTween.endTarget,
    eased
  );

  if (t >= 1) {
    cameraTween = null;
  }
}

function updateHighlights(): void {
  highlightScale.forEach((entry, mesh) => {
    if (!mesh.scale.equals(entry.target)) {
      mesh.scale.lerp(entry.target, 0.2);
    }
  });
}

let lastTime = performance.now();
function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateFadeAnimations(now);
  updateCameraTween(delta);
  updateHighlights();

  controls.update();
  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);
