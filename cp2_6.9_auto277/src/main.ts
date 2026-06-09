import { SceneManager } from './SceneManager';
import { WindowController } from './WindowController';
import { ControlPanel } from './ControlPanel';

function initApp(): void {
  const container = document.getElementById('window-container');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  const resizeHandle = document.getElementById('resize-handle');
  const seasonTrigger = document.getElementById('season-trigger');

  if (!container || !canvas || !resizeHandle || !seasonTrigger) {
    console.error('Required DOM elements not found');
    return;
  }

  const sceneManager = new SceneManager(canvas);
  const windowController = new WindowController(container, resizeHandle, canvas);
  const controlPanel = new ControlPanel(sceneManager, windowController);

  const initialSize = windowController.getSize();
  sceneManager.setWindowSize(initialSize);
  sceneManager.setScale(windowController.getScale());

  windowController.onResize((event) => {
    sceneManager.setWindowSize(event.size);
  });

  windowController.onZoom((scale) => {
    sceneManager.setScale(scale);
  });

  seasonTrigger.addEventListener('click', () => {
    sceneManager.nextSeason();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const distance = Math.sqrt(
      Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
    );
    if (distance < Math.min(rect.width, rect.height) * 0.3) {
      sceneManager.nextSeason();
    }
  });

  let lastTime = performance.now();

  function animate(currentTime: number): void {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    sceneManager.update(deltaTime, currentTime);
    sceneManager.render();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  console.log('%c 窗景剧场已启动 ', 'background: #6C63FF; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;');
  console.log('点击窗户中央切换季节，拖拽右下角把手调整窗口大小，滚轮缩放画面');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
