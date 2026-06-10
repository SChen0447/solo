import * as THREE from 'three';
import { createSceneManager, SceneManager } from './scene';
import { createUIController, UIController } from './ui';
import { AsteroidData } from './data';

const START_DATE = new Date('2024-01-01');
const DAYS_PER_YEAR = 365.25;
const FIXED_TIMESTEP = 1 / 60;

function createOrbitCamera(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
  const spherical = new THREE.Spherical();
  const target = new THREE.Vector3(0, 0, 0);
  spherical.setFromVector3(camera.position.clone().sub(target));

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let velocityTheta = 0;
  let velocityPhi = 0;
  const damping = 0.92;
  const inertiaTime = 300;
  let lastMoveTime = 0;

  function updateCamera() {
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }

  updateCamera();

  domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velocityTheta = 0;
    velocityPhi = 0;
    domElement.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      domElement.style.cursor = 'grab';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const now = performance.now();
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    const dt = Math.max(now - lastMoveTime, 1);

    const rotationSpeed = 0.005;
    const dTheta = -deltaX * rotationSpeed;
    const dPhi = -deltaY * rotationSpeed;

    velocityTheta = dTheta / dt * 16;
    velocityPhi = dPhi / dt * 16;

    spherical.theta += dTheta;
    spherical.phi += dPhi;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

    lastX = e.clientX;
    lastY = e.clientY;
    lastMoveTime = now;

    updateCamera();
  });

  domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    spherical.radius *= (1 + e.deltaY * zoomSpeed);
    spherical.radius = Math.max(50, Math.min(800, spherical.radius));
    updateCamera();
  }, { passive: false });

  domElement.style.cursor = 'grab';

  return {
    update() {
      if (!isDragging && (Math.abs(velocityTheta) > 0.001 || Math.abs(velocityPhi) > 0.001)) {
        spherical.theta += velocityTheta;
        spherical.phi += velocityPhi;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        velocityTheta *= damping;
        velocityPhi *= damping;
        updateCamera();
      }
    }
  };
}

function main() {
  const container = document.getElementById('canvas-container')!;

  const sceneManager: SceneManager = createSceneManager();
  sceneManager.init(container);

  const uiController: UIController = createUIController();
  uiController.init(sceneManager);

  const cameraControls = createOrbitCamera(sceneManager.camera, sceneManager.renderer.domElement);

  let simTimeYears = 0;
  let accumulator = 0;
  let lastFrameTime = performance.now();

  uiController.onAsteroidSelect((asteroid: AsteroidData | null) => {
    sceneManager.selectAsteroid(asteroid ? asteroid.id : null);
  });

  function getSimDate(): Date {
    const days = simTimeYears * DAYS_PER_YEAR;
    return new Date(START_DATE.getTime() + days * 24 * 60 * 60 * 1000);
  }

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    let deltaMs = now - lastFrameTime;
    lastFrameTime = now;

    deltaMs = Math.min(deltaMs, 100);
    const deltaSeconds = deltaMs / 1000;

    if (uiController.getPlaying()) {
      accumulator += deltaSeconds;
      const stepYears = FIXED_TIMESTEP * (uiController.getTimeScale() / 10);

      while (accumulator >= FIXED_TIMESTEP) {
        simTimeYears += stepYears;
        accumulator -= FIXED_TIMESTEP;
      }
    }

    sceneManager.update(simTimeYears);
    cameraControls.update();
    uiController.setSimDate(getSimDate());

    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  }

  window.addEventListener('resize', () => {
    sceneManager.onResize();
  });

  animate();
}

main();
