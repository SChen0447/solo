import { Sequencer } from './sequencer';
import { ParticleSystem } from './particles';
import { UI } from './ui';

function bootstrap(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const sequencer = new Sequencer();
  const particles = new ParticleSystem(canvas);
  const ui = new UI(sequencer, particles);

  sequencer.onBeat((event) => {
    particles.handleBeatEvent(event);
  });

  ui.init();
  particles.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
