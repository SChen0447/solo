import { DrawEngine } from './drawEngine';
import { AudioReactor } from './audioReactor';

function main(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const drawEngine = new DrawEngine(canvas);
  const audioReactor = new AudioReactor();

  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
  const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const echoSlider = document.getElementById('echo-slider') as HTMLInputElement;
  const echoValue = document.getElementById('echo-value') as HTMLSpanElement;
  const statusText = document.getElementById('status-text') as HTMLSpanElement;

  audioReactor.onBeat((anchorIndex, energy) => {
    drawEngine.handleBeat(anchorIndex, energy);
  });

  const updateStatus = (): void => {
    const beat = String(audioReactor.getBeatCount()).padStart(2, '0');
    const active = String(drawEngine.getActivatedCount()).padStart(2, '0');
    statusText.textContent = `节拍: ${beat} | 激活: ${active}`;
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawEngine.onPointerDown(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointermove', (e) => {
    drawEngine.onPointerMove(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', (e) => {
    drawEngine.onPointerUp(e.clientX, e.clientY);
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  canvas.addEventListener('pointercancel', () => {
    drawEngine.onPointerUp(0, 0);
  });

  btnReset.addEventListener('click', () => {
    drawEngine.resetAll();
    audioReactor.reset();
    updateStatus();
  });

  speedSlider.addEventListener('input', () => {
    const v = parseFloat(speedSlider.value);
    audioReactor.setSpeed(v);
    speedValue.textContent = `${v.toFixed(1)}x`;
  });

  echoSlider.addEventListener('input', () => {
    const v = parseFloat(echoSlider.value);
    drawEngine.setEchoIntensity(v);
    echoValue.textContent = v.toFixed(2);
  });

  btnGenerate.addEventListener('click', () => {
    drawEngine.triggerGenerateSequence(() => {
      audioReactor.generateReverbSound();
    });
  });

  window.addEventListener('resize', () => {
    drawEngine.resize();
  });

  audioReactor.start();
  drawEngine.start();

  const statusInterval = setInterval(updateStatus, 100);
  updateStatus();

  const cleanup = (): void => {
    clearInterval(statusInterval);
    drawEngine.stop();
    audioReactor.stop();
  };
  window.addEventListener('beforeunload', cleanup);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
