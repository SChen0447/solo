import { AudioEngine, ScaleMode } from './audioEngine';
import { DrawingCanvas } from './drawingCanvas';

function init(): void {
  const canvasEl = document.getElementById('drawing-canvas') as HTMLCanvasElement;
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
  const btnScale = document.getElementById('btn-scale') as HTMLButtonElement;
  const scaleLabel = document.getElementById('scale-label') as HTMLSpanElement;

  if (!canvasEl || !btnClear || !btnPlay || !btnScale || !scaleLabel) {
    console.error('DOM elements not found');
    return;
  }

  const audioEngine = new AudioEngine();
  const drawingCanvas = new DrawingCanvas(canvasEl, audioEngine);

  let currentScale: ScaleMode = 'piano';

  const updateScaleLabel = (): void => {
    scaleLabel.textContent = currentScale === 'piano' ? '钢琴音阶' : '合成电子音';
  };

  btnClear.addEventListener('click', () => {
    drawingCanvas.clear();
    audioEngine.stopAll();
  });

  btnPlay.addEventListener('click', async () => {
    await drawingCanvas.playbackRecording(currentScale);
  });

  btnScale.addEventListener('click', () => {
    currentScale = currentScale === 'piano' ? 'synth' : 'piano';
    audioEngine.setScaleMode(currentScale);
    updateScaleLabel();
  });

  updateScaleLabel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
