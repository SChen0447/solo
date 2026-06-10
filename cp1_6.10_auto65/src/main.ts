import { GazeTracker, GazeAction } from './gazeTracker';
import { PageRenderer } from './pageRenderer';
import { UIControls } from './uiControls';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

const HORIZONTAL_THRESHOLD = 30;
const VERTICAL_THRESHOLD = 40;
const HOLD_DURATION = 2000;

let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
let bubbleHideTimer: ReturnType<typeof setTimeout> | null = null;

function showActionBubble(text: string): void {
  const bubble = document.getElementById('action-bubble')!;

  if (bubbleTimer) clearTimeout(bubbleTimer);
  if (bubbleHideTimer) clearTimeout(bubbleHideTimer);

  bubble.classList.remove('visible', 'hiding');
  void bubble.offsetWidth;

  bubble.textContent = text;
  bubble.classList.add('visible');

  bubbleHideTimer = setTimeout(() => {
    bubble.classList.remove('visible');
    bubble.classList.add('hiding');

    bubbleTimer = setTimeout(() => {
      bubble.classList.remove('hiding');
    }, 500);
  }, 1500);
}

async function init(): Promise<void> {
  const videoEl = document.getElementById('video') as HTMLVideoElement;

  const pageRenderer = new PageRenderer();

  const gazeTracker = new GazeTracker({
    horizontalThreshold: HORIZONTAL_THRESHOLD,
    verticalThreshold: VERTICAL_THRESHOLD,
    holdDuration: HOLD_DURATION,
    onAction: (action: GazeAction) => {
      if (action) {
        pageRenderer.handleAction(action);
      }
    },
    onBubble: (text: string) => {
      showActionBubble(text);
    },
  });

  const uiControls = new UIControls({
    onToggle: (isPaused: boolean) => {
      gazeTracker.setPaused(isPaused);
      showActionBubble(isPaused ? '⏸ 已暂停' : '▶ 已恢复');
    },
    onSpeedChange: (speed: number) => {
      gazeTracker.setAutoPageSpeed(speed);
      showActionBubble(`速度: ${speed.toFixed(1)}秒/页`);
    },
    onReset: () => {
      pageRenderer.resetToFirstPage();
      showActionBubble('⟲ 已重置到第一页');
    },
  });

  gazeTracker.setAutoPageSpeed(uiControls.getCurrentSpeed());

  if (!window.FaceMesh) {
    console.error('MediaPipe FaceMesh not loaded');
    showActionBubble('⚠ FaceMesh 加载失败');
    return;
  }

  const faceMesh = new window.FaceMesh({
    locateFile: (file: string) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
    },
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults((results: any) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const width = videoEl.videoWidth || 640;
      const height = videoEl.videoHeight || 480;
      gazeTracker.processLandmarks(landmarks, width, height);
    }
  });

  try {
    if (window.Camera) {
      const camera = new window.Camera(videoEl, {
        onFrame: async () => {
          await faceMesh.send({ image: videoEl });
        },
        width: 640,
        height: 480,
      });
      await camera.start();
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      videoEl.srcObject = stream;
      await videoEl.play();

      const processFrame = async () => {
        if (videoEl.readyState >= 2) {
          await faceMesh.send({ image: videoEl });
        }
        requestAnimationFrame(processFrame);
      };
      requestAnimationFrame(processFrame);
    }
    showActionBubble('✓ 摄像头已启动');
  } catch (err) {
    console.error('Camera error:', err);
    showActionBubble('⚠ 无法访问摄像头');
  }
}

document.addEventListener('DOMContentLoaded', init);
