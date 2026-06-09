import { AudioEngine, generateCMajorScale } from './audioEngine';
import { SpectrumRenderer } from './spectrumRenderer';
import { UIController } from './uiController';

function bootstrap(): void {
  const melody = generateCMajorScale();

  const audio = new AudioEngine();

  const canvas = document.getElementById('spectrumCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('spectrumCanvas not found');
    return;
  }

  const renderer = new SpectrumRenderer(canvas, {
    minFreq: 100,
    maxFreq: 4000,
    minDb: -80,
    maxDb: 0,
    pixelsPerSecond: 10,
    fadeRate: 0.1
  });

  new UIController(audio, renderer, melody);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
