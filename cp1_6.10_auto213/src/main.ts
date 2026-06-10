import { AppManager } from './AppManager';

function main(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement | null;
  const ampSlider = document.getElementById('ampSlider') as HTMLInputElement | null;
  const freqSlider = document.getElementById('freqSlider') as HTMLInputElement | null;
  const hueSlider = document.getElementById('hueSlider') as HTMLInputElement | null;
  const ampValue = document.getElementById('ampValue') as HTMLSpanElement | null;
  const freqValue = document.getElementById('freqValue') as HTMLSpanElement | null;
  const hueValue = document.getElementById('hueValue') as HTMLSpanElement | null;
  const appContainer = document.getElementById('app') as HTMLElement | null;

  if (!canvas || !playBtn || !ampSlider || !freqSlider || !hueSlider ||
      !ampValue || !freqValue || !hueValue || !appContainer) {
    throw new Error('无法找到必要的 DOM 元素');
  }

  const app = new AppManager(canvas, {
    playBtn,
    ampSlider,
    freqSlider,
    hueSlider,
    ampValue,
    freqValue,
    hueValue,
    appContainer,
  });

  app.start();
}

document.addEventListener('DOMContentLoaded', main);
