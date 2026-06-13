import { SceneManager } from './sceneManager';

let sceneManager: SceneManager | null = null;

function init(): void {
  sceneManager = new SceneManager('canvas-container');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
