import * as THREE from 'three';

export interface TerrainHit {
  point: THREE.Vector3;
  elevation: number;
}

export interface ControlsState {
  azimuthAngle: number;
  polarAngle: number;
  distance: number;
  target: THREE.Vector3;
}

export interface ControlsCallbacks {
  onTerrainClick: (hit: TerrainHit) => void;
  onStateChange?: (state: ControlsState) => void;
}

export interface Controls {
  update: (deltaTime: number) => void;
  setAutoRotate: (enabled: boolean) => void;
  setTerrainMesh: (mesh: THREE.Mesh | null) => void;
  dispose: () => void;
}

const AUTO_ROTATE_SPEED = 0.3;
const MIN_DISTANCE = 50;
const MAX_DISTANCE = 400;
const MIN_POLAR = 0.1;
const MAX_POLAR = Math.PI / 2 - 0.05;
const ROTATE_SPEED = 0.005;
const ZOOM_SPEED = 0.001;
const PAN_SPEED = 0.1;
const SMOOTH_LERP = 0.12;
const CLICK_MOVE_THRESHOLD = 3;

export function createControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  callbacks: ControlsCallbacks
): Controls {
  const target = new THREE.Vector3(0, 0, 0);
  let distance = 180;
  let azimuthAngle = Math.PI / 4;
  let polarAngle = Math.PI / 3.5;

  let autoRotate = false;
  let targetAutoRotate = false;

  let isRotating = false;
  let isPanning = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let pointerMoved = false;
  let activePointerId: number | null = null;

  let terrainMesh: THREE.Mesh | null = null;

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const tempSpherical = new THREE.Spherical();
  const panOffset = new THREE.Vector3();

  function updateCamera(): void {
    tempSpherical.set(distance, polarAngle, azimuthAngle);
    const cameraOffset = new THREE.Vector3().setFromSpherical(tempSpherical);
    camera.position.copy(target).add(cameraOffset).add(panOffset);
    camera.lookAt(target.clone().add(panOffset));
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button === 2 && event.pointerType === 'mouse') return;
    activePointerId = event.pointerId;
    domElement.setPointerCapture(event.pointerId);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerMoved = false;

    if (event.button === 2 || event.pointerType !== 'mouse') {
      isPanning = true;
      isRotating = false;
    } else {
      isRotating = true;
      isPanning = false;
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) return;

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    const totalDx = event.clientX - pointerDownX;
    const totalDy = event.clientY - pointerDownY;

    if (Math.abs(totalDx) > CLICK_MOVE_THRESHOLD || Math.abs(totalDy) > CLICK_MOVE_THRESHOLD) {
      pointerMoved = true;
    }

    if (isRotating) {
      azimuthAngle -= dx * ROTATE_SPEED;
      polarAngle = Math.max(MIN_POLAR, Math.min(MAX_POLAR, polarAngle - dy * ROTATE_SPEED));
    } else if (isPanning) {
      const panDistance = distance * PAN_SPEED * 0.01;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      panOffset.add(right.multiplyScalar(-dx * panDistance));
      panOffset.add(up.multiplyScalar(dy * panDistance));
    }

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function onPointerUp(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;

    if (!pointerMoved) {
      handleClick(event.clientX, event.clientY);
    }

    isRotating = false;
    isPanning = false;
  }

  function handleClick(clientX: number, clientY: number): void {
    if (!terrainMesh) return;
    const rect = domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObject(terrainMesh, false);
    if (hits.length > 0) {
      const hit = hits[0];
      callbacks.onTerrainClick({
        point: hit.point.clone(),
        elevation: hit.point.y
      });
    }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const scale = Math.pow(1.0015, event.deltaY * ZOOM_SPEED * 1000);
    distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance * scale));
  }

  function onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  function lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  function update(deltaTime: number): void {
    if (targetAutoRotate !== autoRotate) {
      const t = 0.08;
      if (targetAutoRotate) {
        autoRotate = autoRotate || Math.abs(autoRotate - true) < 0.01;
        autoRotate = Math.random() < t ? true : autoRotate;
      } else {
        autoRotate = Math.random() < t ? false : autoRotate;
      }
    }

    if (autoRotate) {
      azimuthAngle += AUTO_ROTATE_SPEED * deltaTime;
    }

    const targetAzimuth = azimuthAngle;
    const currentAzimuth = camera.position.angleTo(new THREE.Vector3(1, 0, 0));
    void currentAzimuth;
    void lerpAngle;

    updateCamera();

    if (callbacks.onStateChange) {
      callbacks.onStateChange({
        azimuthAngle,
        polarAngle,
        distance,
        target: target.clone()
      });
    }
  }

  function setAutoRotate(enabled: boolean): void {
    targetAutoRotate = enabled;
    autoRotate = enabled;
  }

  function setTerrainMesh(mesh: THREE.Mesh | null): void {
    terrainMesh = mesh;
  }

  function dispose(): void {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
    domElement.removeEventListener('wheel', onWheel, { passive: false } as AddEventListenerOptions);
    domElement.removeEventListener('contextmenu', onContextMenu);
  }

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);
  domElement.addEventListener('wheel', onWheel, { passive: false });
  domElement.addEventListener('contextmenu', onContextMenu);

  updateCamera();

  return {
    update,
    setAutoRotate,
    setTerrainMesh,
    dispose
  };
}
