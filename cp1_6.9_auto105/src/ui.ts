import * as THREE from 'three';
import { AppState, OrbitControlsState } from './main';
import { LightBeamAPI } from './effects';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 5, 20);
const INITIAL_RADIUS = 20;
const INITIAL_THETA = Math.PI / 2;
const INITIAL_PHI = Math.PI / 3;

export function setupUI(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsState,
  appState: AppState,
  lightBeamAPI: LightBeamAPI | undefined
) {
  const cameraXEl = document.getElementById('camera-x') as HTMLElement;
  const cameraYEl = document.getElementById('camera-y') as HTMLElement;
  const cameraZEl = document.getElementById('camera-z') as HTMLElement;
  const beamIntensityEl = document.getElementById('beam-intensity') as HTMLElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  function updateInfo() {
    cameraXEl.textContent = camera.position.x.toFixed(1);
    cameraYEl.textContent = camera.position.y.toFixed(1);
    cameraZEl.textContent = camera.position.z.toFixed(1);
    
    if (lightBeamAPI) {
      const intensity = Math.round(lightBeamAPI.getIntensity());
      beamIntensityEl.textContent = `${intensity}%`;
    }
    
    requestAnimationFrame(updateInfo);
  }
  updateInfo();

  let resetAnimating = false;

  resetBtn.addEventListener('click', () => {
    if (resetAnimating) return;
    resetAnimating = true;

    const startRadius = controls.radius;
    const startTheta = controls.theta;
    const startPhi = controls.phi;
    const duration = 500;
    const startTime = performance.now();

    function animateReset(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      controls.radius = startRadius + (INITIAL_RADIUS - startRadius) * ease;
      controls.theta = startTheta + (INITIAL_THETA - startTheta) * ease;
      controls.phi = startPhi + (INITIAL_PHI - startPhi) * ease;
      controls.targetRadius = controls.radius;
      controls.targetTheta = controls.theta;
      controls.targetPhi = controls.phi;

      if (lightBeamAPI) {
        lightBeamAPI.reset();
      }

      if (t < 1) {
        requestAnimationFrame(animateReset);
      } else {
        resetAnimating = false;
      }
    }

    requestAnimationFrame(animateReset);
  });
}
