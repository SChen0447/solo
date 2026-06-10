import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantParams } from './plantGen';
import { SceneManager } from './sceneManager';
import { UIController } from './uiController';

const DEFAULT_PARAMS: PlantParams = {
  branchAngle: 45,
  branchDepth: 5,
  lengthDecay: 0.7,
  noiseStrength: 0.1
};

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const sceneManager = new SceneManager(container, DEFAULT_PARAMS);

  const controls = new OrbitControls(
    sceneManager.getCamera(),
    sceneManager.getRenderer().domElement
  );
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 3, 0);
  controls.update();

  let lastTime = 0;
  function controlsLoop(time: number): void {
    requestAnimationFrame(controlsLoop);
    if (time - lastTime > 16) {
      controls.update();
      lastTime = time;
    }
  }
  requestAnimationFrame(controlsLoop);

  const uiController = new UIController(sceneManager);

  (window as any)._sceneManager = sceneManager;
  (window as any)._uiController = uiController;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
