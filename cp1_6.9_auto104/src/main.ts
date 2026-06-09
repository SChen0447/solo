import { LavaLamp, type RGB } from './lavaLamp';
import { ControlPanel } from './controlPanel';

function init(): void {
  const lavaCanvas = document.getElementById('lavaCanvas') as HTMLCanvasElement;
  const controlCanvas = document.getElementById('controlCanvas') as HTMLCanvasElement;
  const hint = document.getElementById('hint') as HTMLDivElement;

  if (!lavaCanvas || !controlCanvas || !hint) {
    console.error('Required DOM elements not found');
    return;
  }

  const lavaLamp = new LavaLamp(lavaCanvas);
  const controlPanel = new ControlPanel(controlCanvas);

  controlPanel.setOnColorChange((color: RGB) => {
    lavaLamp.setColor(color);
  });

  controlPanel.setOnHeatChange((intensity: number) => {
    lavaLamp.setHeatIntensity(intensity);
  });

  lavaCanvas.addEventListener('mouseenter', () => {
    hint.classList.add('visible');
  });

  lavaCanvas.addEventListener('mouseleave', () => {
    hint.classList.remove('visible');
  });

  controlPanel.render();
  lavaLamp.render();

  function gameLoop(): void {
    lavaLamp.update();
    lavaLamp.render();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
