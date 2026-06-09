import { FluidSimulation } from './fluid';
import { FluidRenderer } from './renderer';
import { ControlPanel } from './controls';

function init(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const fluid = new FluidSimulation(40, 40);
  const renderer = new FluidRenderer(canvas, fluid);
  const controls = new ControlPanel(fluid, renderer, canvas);

  const fpsDisplay = document.getElementById('fps-value');
  const particleDisplay = document.getElementById('particle-value');
  renderer.setFpsDisplay(fpsDisplay);
  renderer.setParticleDisplay(particleDisplay);

  renderer.setColor('#00E5FF');

  const onResize = (): void => {
    renderer.resize();
  };
  window.addEventListener('resize', onResize);
  onResize();

  let rafId = 0;
  const loop = (): void => {
    if (!controls.getState().paused) {
      fluid.step();
    }
    renderer.render();
    controls.tickFPS();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  const teardown = (): void => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
  };
  window.addEventListener('beforeunload', teardown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
