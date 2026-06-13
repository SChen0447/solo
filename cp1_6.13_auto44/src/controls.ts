import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface GalaxyControls {
  orbitControls: OrbitControls;
  update(deltaTime: number): void;
  startExploreMode(): void;
  stopExploreMode(): void;
  isExploring: boolean;
  dispose(): void;
}

export function createControls(camera: THREE.PerspectiveCamera, domElement: HTMLElement): GalaxyControls {
  const orbitControls = new OrbitControls(camera, domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 500;
  orbitControls.enablePan = true;
  orbitControls.enableShiftPan = true;

  const keys: Record<string, boolean> = {};
  const flySpeed = 40;

  let isExploring = false;
  let exploreProgress = 0;
  let exploreCurve: THREE.CatmullRomCurve3 | null = null;
  let savedPosition = new THREE.Vector3();
  let savedTarget = new THREE.Vector3();

  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;

    if (e.code === 'Space' && !isExploring) {
      e.preventDefault();
      startExploreMode();
    }
    if (e.code === 'Escape' && isExploring) {
      e.preventDefault();
      stopExploreMode();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function buildExploreCurve(currentPos: THREE.Vector3): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];

    points.push(currentPos.clone());

    const midY1 = 60;
    points.push(new THREE.Vector3(
      currentPos.x * 0.5 + 30,
      midY1,
      currentPos.z * 0.5 + 30
    ));

    points.push(new THREE.Vector3(15, 25, 15));
    points.push(new THREE.Vector3(5, 8, 5));
    points.push(new THREE.Vector3(2, 3, 2));

    points.push(new THREE.Vector3(-3, 5, -3));
    points.push(new THREE.Vector3(-20, 30, -20));

    points.push(new THREE.Vector3(-60, 50, -80));
    points.push(new THREE.Vector3(-120, 70, -150));
    points.push(new THREE.Vector3(-180, 90, -100));
    points.push(new THREE.Vector3(200, 80, 50));

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  function startExploreMode() {
    isExploring = true;
    exploreProgress = 0;
    savedPosition.copy(camera.position);
    savedTarget.copy(orbitControls.target);
    exploreCurve = buildExploreCurve(camera.position.clone());
    orbitControls.enabled = false;
  }

  function stopExploreMode() {
    isExploring = false;
    exploreCurve = null;
    orbitControls.enabled = true;
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
  }

  function update(deltaTime: number) {
    if (isExploring && exploreCurve) {
      const duration = 15;
      exploreProgress += deltaTime / duration;

      if (exploreProgress >= 1.0) {
        stopExploreMode();
        return;
      }

      const t = exploreProgress;
      const eased = t * t * (3 - 2 * t);

      const point = exploreCurve.getPointAt(eased);
      camera.position.copy(point);
      camera.lookAt(0, 0, 0);
      return;
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVec = new THREE.Vector3();
    let moved = false;

    if (keys['KeyW']) { moveVec.add(forward); moved = true; }
    if (keys['KeyS']) { moveVec.sub(forward); moved = true; }
    if (keys['KeyA']) { moveVec.sub(right); moved = true; }
    if (keys['KeyD']) { moveVec.add(right); moved = true; }

    if (moved) {
      moveVec.normalize().multiplyScalar(flySpeed * deltaTime);
      camera.position.add(moveVec);
      orbitControls.target.add(moveVec);
    }

    orbitControls.update();
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    orbitControls.dispose();
  }

  return {
    orbitControls,
    update,
    startExploreMode,
    stopExploreMode,
    get isExploring() { return isExploring; },
    dispose,
  };
}
