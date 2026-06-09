import * as THREE from 'three';
import { scene, camera as mainCamera, treeResult, globalState } from './main';
import { findPathBetweenOrbs } from './tree';
import { spawnCollisionParticles, triggerConstellation } from './particles';
import { StringData, handleStringHover } from './strings';

export interface InteractionState {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  worldMouse: THREE.Vector3;
  selectedOrb: THREE.Mesh | null;
  isDragging: boolean;
}

interface MovingOrb {
  orb: THREE.Mesh;
  path: THREE.Vector3[];
  startTime: number;
  duration: number;
  targetOrb: THREE.Mesh;
}

const movingOrbs: MovingOrb[] = [];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function setupInteraction(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  orbGroup: THREE.Group,
  stringData: StringData
): InteractionState {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const worldMouse = new THREE.Vector3();

  const state: InteractionState = {
    raycaster,
    mouse,
    worldMouse,
    selectedOrb: null,
    isDragging: false
  };

  const domElement = renderer.domElement;

  domElement.addEventListener('mousedown', (event) => {
    updateMouse(event, camera, state);
    state.raycaster.setFromCamera(state.mouse, camera);

    const orbs = orbGroup.children.filter(c => c instanceof THREE.Mesh) as THREE.Mesh[];
    const intersects = state.raycaster.intersectObjects(orbs, false);

    if (intersects.length > 0) {
      const clickedOrb = intersects[0].object as THREE.Mesh;
      state.selectedOrb = clickedOrb;
      state.isDragging = false;

      flashOrb(clickedOrb);
    }
  });

  domElement.addEventListener('mousemove', (event) => {
    updateMouse(event, camera, state);

    if (state.selectedOrb) {
      state.isDragging = true;
    }

    state.raycaster.setFromCamera(state.mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    state.raycaster.ray.intersectPlane(plane, state.worldMouse);

    handleStringHover(new THREE.Vector2(state.worldMouse.x, state.worldMouse.y));

    if (globalState.infoSphere) {
      const infoIntersects = state.raycaster.intersectObject(globalState.infoSphere);
      globalState.infoLookedAt = infoIntersects.length > 0;
    }
  });

  domElement.addEventListener('mouseup', (_event) => {
    if (state.selectedOrb && !state.isDragging) {
      const nearestOrb = findNearestOrb(state.selectedOrb, orbGroup);
      if (nearestOrb && nearestOrb !== state.selectedOrb) {
        moveOrbToTarget(state.selectedOrb, nearestOrb);
      }
    } else if (state.selectedOrb && state.isDragging) {
      const nearestOrb = findNearestOrbToPoint(state.worldMouse, orbGroup, state.selectedOrb);
      if (nearestOrb && nearestOrb !== state.selectedOrb) {
        moveOrbToTarget(state.selectedOrb, nearestOrb);
      }
    }

    state.selectedOrb = null;
    state.isDragging = false;
  });

  domElement.addEventListener('mouseleave', () => {
    state.selectedOrb = null;
    state.isDragging = false;
  });

  domElement.addEventListener('touchstart', (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
      updateMouse(mouseEvent, camera, state);
      state.raycaster.setFromCamera(state.mouse, camera);

      const orbs = orbGroup.children.filter(c => c instanceof THREE.Mesh) as THREE.Mesh[];
      const intersects = state.raycaster.intersectObjects(orbs, false);

      if (intersects.length > 0) {
        const clickedOrb = intersects[0].object as THREE.Mesh;
        state.selectedOrb = clickedOrb;
        flashOrb(clickedOrb);
      }
    }
    event.preventDefault();
  }, { passive: false });

  domElement.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
      updateMouse(mouseEvent, camera, state);
      state.isDragging = true;

      state.raycaster.setFromCamera(state.mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      state.raycaster.ray.intersectPlane(plane, state.worldMouse);

      handleStringHover(new THREE.Vector2(state.worldMouse.x, state.worldMouse.y));
    }
    event.preventDefault();
  }, { passive: false });

  domElement.addEventListener('touchend', () => {
    if (state.selectedOrb) {
      const nearestOrb = state.isDragging
        ? findNearestOrbToPoint(state.worldMouse, orbGroup, state.selectedOrb)
        : findNearestOrb(state.selectedOrb, orbGroup);
      if (nearestOrb && nearestOrb !== state.selectedOrb) {
        moveOrbToTarget(state.selectedOrb, nearestOrb);
      }
    }
    state.selectedOrb = null;
    state.isDragging = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      triggerConstellation();
    }
  });

  startAnimationLoop();

  return state;
}

function updateMouse(
  event: { clientX: number; clientY: number },
  camera: THREE.PerspectiveCamera,
  state: InteractionState
) {
  const rect = (camera as any).domElement?.getBoundingClientRect?.() ||
    document.querySelector('canvas')?.getBoundingClientRect() ||
    { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function flashOrb(orb: THREE.Mesh) {
  const originalScale = orb.scale.x;
  const startTime = performance.now() / 1000;
  const duration = 0.1;

  function animate() {
    const now = performance.now() / 1000;
    const t = (now - startTime) / duration;

    if (t < 1) {
      const pulse = Math.sin(t * Math.PI);
      orb.scale.setScalar(originalScale * (1 + 0.2 * pulse));
      requestAnimationFrame(animate);
    } else {
      orb.scale.setScalar(originalScale);
    }
  }
  animate();
}

function findNearestOrb(orb: THREE.Mesh, orbGroup: THREE.Group): THREE.Mesh | null {
  const orbs = orbGroup.children.filter(c => c instanceof THREE.Mesh && c !== orb) as THREE.Mesh[];
  if (orbs.length === 0) return null;

  let nearest: THREE.Mesh | null = null;
  let nearestDist = Infinity;

  for (const other of orbs) {
    const dist = orb.position.distanceTo(other.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

function findNearestOrbToPoint(
  point: THREE.Vector3,
  orbGroup: THREE.Group,
  excludeOrb: THREE.Mesh
): THREE.Mesh | null {
  const orbs = orbGroup.children.filter(
    c => c instanceof THREE.Mesh && c !== excludeOrb
  ) as THREE.Mesh[];
  if (orbs.length === 0) return null;

  let nearest: THREE.Mesh | null = null;
  let nearestDist = Infinity;

  for (const other of orbs) {
    const dist = point.distanceTo(other.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }

  return nearest;
}

function moveOrbToTarget(sourceOrb: THREE.Mesh, targetOrb: THREE.Mesh) {
  if (!treeResult) return;

  const path = findPathBetweenOrbs(
    sourceOrb.position,
    targetOrb.position,
    treeResult.branchSegments
  );

  const distance = sourceOrb.position.distanceTo(targetOrb.position);
  const speed = 2.0;
  const duration = distance / speed;

  createArcTrail(path, (sourceOrb.userData as { color: number }).color || 0xffffff);

  const startTime = performance.now() / 1000;
  movingOrbs.push({
    orb: sourceOrb,
    path,
    startTime,
    duration,
    targetOrb
  });

  sourceOrb.userData.isMoving = true;
}

function createArcTrail(path: THREE.Vector3[], color: number) {
  if (path.length < 3) return;

  const trailPoints: THREE.Vector3[] = [];
  const segmentCount = 25;

  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const a = path[0].clone().lerp(path[1], t);
    const b = path[1].clone().lerp(path[2], t);
    trailPoints.push(a.lerp(b, t));
  }

  const positions = new Float32Array(trailPoints.length * 3);
  trailPoints.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.4
  });

  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const startTime = performance.now() / 1000;
  const duration = 0.6;

  function fadeTrail() {
    const now = performance.now() / 1000;
    const t = (now - startTime) / duration;
    if (t < 1) {
      material.opacity = 0.4 * (1 - t);
      requestAnimationFrame(fadeTrail);
    } else {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    }
  }
  fadeTrail();
}

function startAnimationLoop() {
  function update() {
    const now = performance.now() / 1000;

    for (let i = movingOrbs.length - 1; i >= 0; i--) {
      const moving = movingOrbs[i];
      const t = Math.min(1, (now - moving.startTime) / moving.duration);
      const eased = easeOutCubic(t);

      if (moving.path.length >= 3) {
        const a = moving.path[0].clone().lerp(moving.path[1], eased);
        const b = moving.path[1].clone().lerp(moving.path[2], eased);
        moving.orb.position.copy(a.lerp(b, eased));
      }

      if (t >= 1) {
        const sourceColor = (moving.orb.userData as { color: number }).color || 0xffffff;
        const targetColor = (moving.targetOrb.userData as { color: number }).color || 0xffffff;

        const collisionPos = moving.orb.position.clone()
          .add(moving.targetOrb.position)
          .multiplyScalar(0.5);

        spawnCollisionParticles(collisionPos, sourceColor, targetColor);

        if (moving.orb.userData.basePosition) {
          setTimeout(() => {
            returnToBase(moving.orb);
          }, 150);
        }

        moving.orb.userData.isMoving = false;
        movingOrbs.splice(i, 1);
      }
    }

    requestAnimationFrame(update);
  }
  update();
}

function returnToBase(orb: THREE.Mesh) {
  const basePos = (orb.userData as { basePosition: THREE.Vector3 }).basePosition;
  if (!basePos) return;

  const startPos = orb.position.clone();
  const startTime = performance.now() / 1000;
  const duration = 0.6;

  function animate() {
    const now = performance.now() / 1000;
    const t = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(t);

    orb.position.lerpVectors(startPos, basePos, eased);

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}
