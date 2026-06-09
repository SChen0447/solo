import { HandTracker, HandTrackingResult } from './handTracker';
import { CanvasController, DrawingMode } from './canvasController';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

async function initCamera(video: HTMLVideoElement): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: CANVAS_WIDTH },
      height: { ideal: CANVAS_HEIGHT },
      facingMode: 'user'
    },
    audio: false
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve();
    };
  });
}

function updateStatusUI(
  statusModeEl: HTMLElement,
  statusBrushEl: HTMLElement,
  mode: DrawingMode,
  brushSize: number
): void {
  if (mode === 'drawing') {
    statusModeEl.textContent = '绘图中';
    statusModeEl.classList.remove('paused');
    statusModeEl.classList.add('drawing');
  } else {
    statusModeEl.textContent = '已暂停';
    statusModeEl.classList.remove('drawing');
    statusModeEl.classList.add('paused');
  }
  statusBrushEl.textContent = `笔刷: ${brushSize}px`;
}

async function main(): Promise<void> {
  const video = document.getElementById('video') as HTMLVideoElement;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
  const colorSlider = document.getElementById('colorSlider') as HTMLInputElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const statusModeEl = document.getElementById('statusMode') as HTMLElement;
  const statusBrushEl = document.getElementById('statusBrush') as HTMLElement;

  if (!video || !canvas || !sizeSlider || !colorSlider || !clearBtn || !statusModeEl || !statusBrushEl) {
    console.error('Required DOM elements not found');
    return;
  }

  const canvasController = new CanvasController(canvas);
  updateStatusUI(statusModeEl, statusBrushEl, canvasController.getMode(), canvasController.getBrushSize());

  sizeSlider.addEventListener('input', () => {
    const size = parseInt(sizeSlider.value, 10);
    canvasController.setBrushSize(size);
    updateStatusUI(statusModeEl, statusBrushEl, canvasController.getMode(), canvasController.getBrushSize());
  });

  colorSlider.addEventListener('input', () => {
    const hue = parseInt(colorSlider.value, 10);
    canvasController.setColorHue(hue);
  });

  clearBtn.addEventListener('click', () => {
    canvasController.clear();
  });

  try {
    await initCamera(video);
  } catch (err) {
    console.error('Failed to access camera:', err);
    alert('无法访问摄像头，请确保已授权摄像头权限。');
    return;
  }

  const handTracker = new HandTracker(video);
  try {
    await handTracker.init();
  } catch (err) {
    console.error('Failed to initialize hand tracker:', err);
    alert('手势识别模型加载失败。');
    return;
  }

  let lastHandDetected = false;
  let rafId: number;

  async function loop(): Promise<void> {
    try {
      const result: HandTrackingResult = await handTracker.detect();

      if (result.isFist) {
        canvasController.setMode('paused');
        updateStatusUI(statusModeEl, statusBrushEl, canvasController.getMode(), canvasController.getBrushSize());
      } else if (result.isOpenPalm) {
        canvasController.setMode('drawing');
        updateStatusUI(statusModeEl, statusBrushEl, canvasController.getMode(), canvasController.getBrushSize());
      }

      if (result.isHandDetected && result.indexFingerTip) {
        const x = (1 - result.indexFingerTip.x) * CANVAS_WIDTH;
        const y = result.indexFingerTip.y * CANVAS_HEIGHT;
        canvasController.drawPoint(x, y);
        lastHandDetected = true;
      } else {
        if (lastHandDetected) {
          canvasController.resetLastPoint();
          lastHandDetected = false;
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    rafId = requestAnimationFrame(() => {
      void loop();
    });
  }

  rafId = requestAnimationFrame(() => {
    void loop();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void main();
});
