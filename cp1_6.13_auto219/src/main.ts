import { Renderer } from './renderer';
import { InteractionManager } from './interaction';

class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  interaction: InteractionManager;
  lastTime: number = 0;
  running: boolean = false;
  rafId: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    this.renderer = new Renderer(this.canvas);
    this.interaction = new InteractionManager(this.canvas, this.renderer);
    this.start();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.renderer.drawBackground(now);
    this.interaction.update(dt);
    this.renderer.updateParticles(dt);

    const ctx = this.renderer.ctx;
    for (const kite of this.interaction.kites) {
      kite.draw(ctx);
    }

    this.renderer.drawParticles();

    this.rafId = requestAnimationFrame(this.loop);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
