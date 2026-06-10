import { Renderer } from './renderer';

async function bootstrap() {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const video = document.getElementById('videoElement') as HTMLVideoElement;

  if (!canvas || !video) {
    console.error('Required DOM elements not found');
    return;
  }

  const renderer = new Renderer(canvas, video);
  renderer.start();

  await renderer.init();

  window.addEventListener('beforeunload', () => {
    renderer.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
