import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraControls {
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  update: (delta: number) => void;
  resetView: () => void;
  getZoomLevel: () => number;
  getTarget: () => THREE.Vector3;
}

const DEFAULT_POSITION = new THREE.Vector3(0, 7.5, 16);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export function createControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): CameraControls {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.5;

  controls.minDistance = 2.5;
  controls.maxDistance = 35;

  controls.minPolarAngle = 0.15 * Math.PI;
  controls.maxPolarAngle = 0.85 * Math.PI;

  controls.enablePan = false;

  camera.position.copy(DEFAULT_POSITION);
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  function update(_delta: number): void {
    controls.update();
  }

  function resetView(): void {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = DEFAULT_POSITION.clone();
    const endTarget = DEFAULT_TARGET.clone();

    const duration = 500;
    const startTime = performance.now();

    function animate(): void {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPos, endPos, easeT);
      controls.target.lerpVectors(startTarget, endTarget, easeT);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  function getZoomLevel(): number {
    const dist = camera.position.distanceTo(controls.target);
    const norm = (dist - 2.5) / (35 - 2.5);
    return 1 - norm;
  }

  function getTarget(): THREE.Vector3 {
    return controls.target.clone();
  }

  return {
    controls,
    camera,
    update,
    resetView,
    getZoomLevel,
    getTarget
  };
}
