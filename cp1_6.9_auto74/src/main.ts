import { HandTracker, GestureType } from './handTracker';
import { SceneRenderer } from './sceneRenderer';

const videoElement = document.getElementById('video') as HTMLVideoElement;
const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement;
const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
const fpsElement = document.getElementById('fps') as HTMLElement;
const gestureElement = document.getElementById('gesture') as HTMLElement;

let currentGesture: GestureType = 'none';
let currentHandOpenness: number = 0;

function getGestureDisplay(gesture: GestureType): string {
  switch (gesture) {
    case 'fist': return '握拳前进';
    case 'open': return '张开后退';
    case 'swipe_left': return '左转';
    case 'swipe_right': return '右转';
    default: return '无';
  }
}

const sceneRenderer = new SceneRenderer(canvasContainer, {
  onFpsUpdate: (fps: number) => {
    fpsElement.textContent = fps.toString();
    if (fps < 30) {
      fpsElement.classList.add('low');
    } else {
      fpsElement.classList.remove('low');
    }
  }
});

const handTracker = new HandTracker(videoElement, overlayCanvas, {
  onGesture: (gesture: GestureType) => {
    currentGesture = gesture;
    gestureElement.textContent = getGestureDisplay(gesture);
    sceneRenderer.setControllerState({
      gesture: currentGesture,
      handOpenness: currentHandOpenness
    });
  },
  onHandOpenness: (distance: number) => {
    currentHandOpenness = distance;
    sceneRenderer.setControllerState({
      gesture: currentGesture,
      handOpenness: currentHandOpenness
    });
  }
});

async function init(): Promise<void> {
  try {
    sceneRenderer.start();
    await handTracker.start();
    console.log('🌌 手势控制3D粒子星图探索系统已启动');
  } catch (error) {
    console.error('初始化失败:', error);
    const uiPanel = document.getElementById('ui-panel');
    if (uiPanel) {
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#ff6666';
      errorDiv.style.marginTop = '8px';
      errorDiv.textContent = '⚠️ 摄像头启动失败，请检查权限';
      uiPanel.appendChild(errorDiv);
    }
  }
}

window.addEventListener('beforeunload', () => {
  handTracker.stop();
  sceneRenderer.dispose();
});

init();
