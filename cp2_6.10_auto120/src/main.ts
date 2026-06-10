import { AudioManager } from './audioManager';
import { Visualizer } from './visualizer';
import { ThemeController } from './themeController';
import { UIController } from './uiController';

function main(): void {
  const waveformCanvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;
  const spectrumCanvas = document.getElementById('spectrumCanvas') as HTMLCanvasElement;

  if (!waveformCanvas || !spectrumCanvas) {
    console.error('Canvas elements not found');
    return;
  }

  const audioManager = new AudioManager();
  const themeController = new ThemeController();
  const visualizer = new Visualizer(waveformCanvas, spectrumCanvas, audioManager, themeController);
  const uiController = new UIController(audioManager, visualizer, themeController);

  uiController.init();
  visualizer.start();
}

document.addEventListener('DOMContentLoaded', main);
