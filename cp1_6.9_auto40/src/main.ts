import { World } from './world';

function initApp(): void {
  const world = new World('canvas-container');
  world.start();
}

document.addEventListener('DOMContentLoaded', initApp);
