import * as THREE from 'three';
import { setupScene } from './rendering/SceneSetup';
import { PlateManager } from './core/PlateManager';
import { UIModule } from './ui/UIModule';

const ctx = setupScene('canvas-container');
const { scene, camera, renderer, controls } = ctx;

const plateManager = new PlateManager(scene);
const uiModule = new UIModule(plateManager);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let mouseDownPos = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
  if (event.button !== 0) return;
  isDragging = false;
  mouseDownPos.set(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('pointermove', (event: PointerEvent) => {
  const dx = event.clientX - mouseDownPos.x;
  const dy = event.clientY - mouseDownPos.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) {
    isDragging = true;
  }
});

renderer.domElement.addEventListener('pointerup', (event: PointerEvent) => {
  if (event.button !== 0) return;
  if (isDragging) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const plateMeshes = plateManager.getPlates().map((p) => p.mesh);
  const intersects = raycaster.intersectObjects(plateMeshes, true);
  plateManager.handleClick(intersects);
});

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  plateManager.update(dt);
  controls.update();
  uiModule.updateStats();

  renderer.render(scene, camera);
}

animate();
