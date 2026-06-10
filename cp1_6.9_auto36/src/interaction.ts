import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { CrystalMetadata, CrystalColorType } from './crystalGenerator';

interface CrystalSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  crystalGroup: THREE.Group;
  rareGemGroup: THREE.Group;
  regenerate: (boostPoint?: THREE.Vector3) => void;
  setClippingDepth: (depth: number) => void;
  applyColorFilter: (filter: string) => void;
}

let ctx: CrystalSceneContext | null = null;

const keys = new Set<string>();
const moveSpeed = 2;

const cameraTarget = new THREE.Vector3(0, -5, 0);
let cameraYaw = Math.atan2(4, 4);
let cameraPitch = Math.atan2(2, Math.sqrt(32));
let cameraDistance = Math.sqrt(16 + 4 + 16);

const initialYaw = cameraYaw;
const initialPitch = cameraPitch;
const initialDistance = cameraDistance;
const initialTarget = cameraTarget.clone();

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragMoved = false;

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let lastClickWorldPoint: THREE.Vector3 | null = null;

let selectedObject: THREE.Object3D | null = null;
let selectedOriginalScale = new THREE.Vector3(1, 1, 1);
let selectedOriginalRotY = 0;
let isAnimating = false;

const infoPopup = document.getElementById('info-popup') as HTMLDivElement;
const popupName = document.getElementById('popup-name') as HTMLDivElement;
const popupSwatch = document.getElementById('popup-swatch') as HTMLSpanElement;
const popupHex = document.getElementById('popup-hex') as HTMLSpanElement;
const popupHardness = document.getElementById('popup-hardness') as HTMLSpanElement;

const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
const depthValue = document.getElementById('depth-value') as HTMLSpanElement;
const colorFilterSelect = document.getElementById('color-filter') as HTMLSelectElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnTopView = document.getElementById('btn-topview') as HTMLButtonElement;
const btnRegenerate = document.getElementById('btn-regenerate') as HTMLButtonElement;

function updateCameraPosition(): void {
  if (!ctx) return;
  const x = cameraTarget.x + cameraDistance * Math.cos(cameraPitch) * Math.sin(cameraYaw);
  const y = cameraTarget.y + cameraDistance * Math.sin(cameraPitch);
  const z = cameraTarget.z + cameraDistance * Math.cos(cameraPitch) * Math.cos(cameraYaw);
  ctx.camera.position.set(x, y, z);
  ctx.camera.lookAt(cameraTarget);
}

function bindEvents(): void {
  if (!ctx) return;

  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });

  ctx.renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  ctx.renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  ctx.renderer.domElement.addEventListener('click', onCanvasClick);

  depthSlider.addEventListener('input', () => {
    const depth = parseFloat(depthSlider.value);
    depthValue.textContent = depth.toFixed(1);
    ctx!.setClippingDepth(depth);
  });

  colorFilterSelect.addEventListener('change', () => {
    ctx!.applyColorFilter(colorFilterSelect.value);
  });

  btnReset.addEventListener('click', () => {
    animateCameraTo(initialTarget.clone(), initialYaw, initialPitch, initialDistance);
  });

  btnTopView.addEventListener('click', () => {
    animateCameraTo(new THREE.Vector3(0, -5, 0), cameraYaw, Math.PI / 2 - 0.01, 10);
  });

  btnRegenerate.addEventListener('click', () => {
    const boostPt = lastClickWorldPoint;
    ctx!.regenerate(boostPt || undefined);
  });
}

function animateCameraTo(
  targetPos: THREE.Vector3,
  yaw: number,
  pitch: number,
  distance: number
): void {
  const start = {
    tx: cameraTarget.x,
    ty: cameraTarget.y,
    tz: cameraTarget.z,
    yaw: cameraYaw,
    pitch: cameraPitch,
    dist: cameraDistance
  };
  const end = {
    tx: targetPos.x,
    ty: targetPos.y,
    tz: targetPos.z,
    yaw,
    pitch,
    dist: distance
  };

  new TWEEN.Tween(start)
    .to(end, 500)
    .easing(TWEEN.Easing.Cubic.Out)
    .onUpdate(() => {
      cameraTarget.set(start.tx, start.ty, start.tz);
      cameraYaw = start.yaw;
      cameraPitch = start.pitch;
      cameraDistance = start.dist;
      updateCameraPosition();
    })
    .start();
}

function onMouseDown(e: MouseEvent): void {
  isDragging = true;
  dragMoved = false;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseUp(_e: MouseEvent): void {
  isDragging = false;
}

function onMouseMove(e: MouseEvent): void {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragMoved = true;
    }
    cameraYaw -= dx * 0.005;
    cameraPitch += dy * 0.005;
    cameraPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, cameraPitch));
    updateCameraPosition();
  }
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  if (infoPopup.classList.contains('visible') && selectedObject) {
    positionInfoPopup(e.clientX, e.clientY);
  }
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const delta = e.deltaY * 0.003;
  cameraDistance = Math.max(0.5, Math.min(10, cameraDistance + delta));
  updateCameraPosition();
}

function onCanvasClick(e: MouseEvent): void {
  if (!ctx || dragMoved) return;

  const rect = ctx.renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, ctx.camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 5);
  const worldPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, worldPoint)) {
    lastClickWorldPoint = worldPoint.clone();
  }

  const pickables: THREE.Object3D[] = [];
  ctx.crystalGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && (child.userData.isCrystal || child.userData.isRareGem)) {
      pickables.push(child);
    }
  });
  ctx.rareGemGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.isRareGem) {
      pickables.push(child);
    }
  });

  const intersects = raycaster.intersectObjects(pickables, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    let targetGroup: THREE.Object3D | null = null;

    if (hitMesh.userData.isRareGem) {
      targetGroup = hitMesh;
    } else {
      let obj: THREE.Object3D | null = hitMesh;
      while (obj) {
        if (obj instanceof THREE.Group && obj.userData.isCrystalGroup) {
          targetGroup = obj;
          break;
        }
        obj = obj.parent;
      }
    }

    if (targetGroup) {
      const metadata = (targetGroup.userData.metadata || hitMesh.userData.metadata) as CrystalMetadata;
      if (metadata) {
        showCrystalInfo(metadata, e.clientX, e.clientY);
        animateCrystalSelection(targetGroup);
      }
    }
  } else {
    hideInfoPopup();
    if (selectedObject) {
      resetSelectedCrystal();
    }
  }
}

function showCrystalInfo(metadata: CrystalMetadata, mouseX: number, mouseY: number): void {
  popupName.textContent = metadata.name;
  popupSwatch.style.background = metadata.colorHex;
  popupHex.textContent = metadata.colorHex.toUpperCase();
  popupHardness.textContent = metadata.hardness.toString();

  infoPopup.classList.add('visible');
  positionInfoPopup(mouseX, mouseY);
}

function positionInfoPopup(mouseX: number, mouseY: number): void {
  const padding = 14;
  let left = mouseX + padding;
  let top = mouseY - 20;

  requestAnimationFrame(() => {
    const popupRect = infoPopup.getBoundingClientRect();
    if (left + popupRect.width > window.innerWidth) {
      left = mouseX - popupRect.width - padding;
    }
    if (top + popupRect.height > window.innerHeight) {
      top = window.innerHeight - popupRect.height - 10;
    }
    if (top < 10) top = 10;

    infoPopup.style.left = left + 'px';
    infoPopup.style.top = top + 'px';
  });
}

function hideInfoPopup(): void {
  infoPopup.classList.remove('visible');
}

function animateCrystalSelection(obj: THREE.Object3D): void {
  if (isAnimating) return;

  if (selectedObject && selectedObject !== obj) {
    resetSelectedCrystal();
  }

  selectedObject = obj;
  selectedOriginalScale.copy(obj.scale);
  selectedOriginalRotY = obj.rotation.y;
  isAnimating = true;

  const animState = { t: 0 };
  new TWEEN.Tween(animState)
    .to({ t: 1 }, 400)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      const pulseScale = 1 + Math.sin(animState.t * Math.PI) * 0.3;
      obj.scale.setScalar(selectedOriginalScale.x * pulseScale);
      obj.rotation.y = selectedOriginalRotY + animState.t * Math.PI / 2;
    })
    .onComplete(() => {
      isAnimating = false;
    })
    .start();
}

function resetSelectedCrystal(): void {
  if (!selectedObject) return;
  selectedObject.scale.copy(selectedOriginalScale);
  selectedObject.rotation.y = selectedOriginalRotY;
  selectedObject = null;
}

const moveClock = new THREE.Clock();
function tickMovement(): void {
  requestAnimationFrame(tickMovement);
  const delta = Math.min(moveClock.getDelta(), 0.1);
  TWEEN.update();

  if (ctx) {
    const forward = new THREE.Vector3();
    ctx.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0.0001) forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (keys.has('w')) move.add(forward);
    if (keys.has('s')) move.sub(forward);
    if (keys.has('d')) move.add(right);
    if (keys.has('a')) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(moveSpeed * delta);
      cameraTarget.add(move);
      updateCameraPosition();
    }
  }
}
tickMovement();

function waitForContext(): void {
  const check = setInterval(() => {
    const candidate = (window as unknown as { __crystalScene?: CrystalSceneContext }).__crystalScene;
    if (candidate) {
      clearInterval(check);
      ctx = candidate;
      bindEvents();
      updateCameraPosition();
    }
  }, 30);
}

waitForContext();

export {};
