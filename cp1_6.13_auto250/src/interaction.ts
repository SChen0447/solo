import * as THREE from 'three';

export interface InteractionCallbacks {
  onHover: (hovered: boolean) => void;
  onClick: () => void;
}

export interface InteractionController {
  updateCamera: (camera: THREE.PerspectiveCamera, delta: number) => void;
  handleResize: () => void;
  dispose: () => void;
}

export function createInteractionController(
  container: HTMLElement,
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2,
  targetMesh: THREE.Object3D,
  callbacks: InteractionCallbacks
): InteractionController {
  const minDistance = 3;
  const maxDistance = 12;
  const minPolarAngle = THREE.MathUtils.degToRad(30);
  const maxPolarAngle = THREE.MathUtils.degToRad(120);

  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let azimuthAngle = 0;
  let polarAngle = THREE.MathUtils.degToRad(60);
  let targetDistance = 8;
  let currentDistance = 8;

  let isHovered = false;

  function onMouseDown(event: MouseEvent) {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onMouseMove(event: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const deltaX = event.clientX - previousMouseX;
      const deltaY = event.clientY - previousMouseY;

      azimuthAngle -= deltaX * 0.005;
      polarAngle -= deltaY * 0.005;
      polarAngle = Math.max(minPolarAngle, Math.min(maxPolarAngle, polarAngle));

      previousMouseX = event.clientX;
      previousMouseY = event.clientY;
    }

    checkHover();
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    event.stopPropagation();
    const zoomSpeed = 0.001;
    targetDistance += event.deltaY * zoomSpeed;
    targetDistance = Math.max(minDistance, Math.min(maxDistance, targetDistance));
  }

  function onClick(event: MouseEvent) {
    if (isHovered) {
      callbacks.onClick();
    }
  }

  function checkHover() {
    raycaster.setFromCamera(mouse, (raycaster as any).camera);
    const intersects = raycaster.intersectObject(targetMesh, true);

    const hovered = intersects.length > 0;
    if (hovered !== isHovered) {
      isHovered = hovered;
      callbacks.onHover(hovered);
    }
  }

  function updateCamera(camera: THREE.PerspectiveCamera, delta: number) {
    currentDistance += (targetDistance - currentDistance) * 0.1;

    const x = currentDistance * Math.sin(polarAngle) * Math.sin(azimuthAngle);
    const y = currentDistance * Math.cos(polarAngle);
    const z = currentDistance * Math.sin(polarAngle) * Math.cos(azimuthAngle);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }

  function handleResize() {}

  function dispose() {
    container.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('click', onClick);
  }

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('click', onClick);

  return {
    updateCamera,
    handleResize,
    dispose,
  };
}
