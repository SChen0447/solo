import { CanvasRender } from './CanvasRender';
import { Toolbar } from './Toolbar';

function init(): void {
  const canvas = document.getElementById('sand-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const app = document.getElementById('app') as HTMLElement | null;
  if (!app) {
    console.error('App container not found');
    return;
  }

  const renderer = new CanvasRender(canvas);

  new Toolbar(app, {
    onBrushChange: (type) => renderer.setBrushType(type),
    onColorChange: (color) => renderer.setBrushColor(color),
    onLightEffectChange: (effect) => renderer.setLightEffect(effect)
  });

  renderer.start();
}

window.addEventListener('DOMContentLoaded', init);
