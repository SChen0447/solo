import { Page } from './page';
import { Interaction } from './interaction';
import { UI } from './ui';

class App {
  private container: HTMLElement;
  private page: Page;
  private interaction: Interaction;
  private ui: UI;
  private rafId: number = 0;
  private lastTime: number = 0;

  constructor() {
    const appEl = document.getElementById('app');
    if (!appEl) {
      throw new Error('Container #app not found');
    }
    this.container = appEl;

    this.page = new Page(this.container);
    this.interaction = new Interaction(this.page, this.page.getPaperElement());
    this.ui = new UI(this.container);

    this.interaction.setMouseMoveCallback((x: number, y: number) => {
      this.ui.updateMousePosition(x, y);
    });

    this.lastTime = performance.now();
    this.startLoop();
  }

  private startLoop(): void {
    const loop = (now: number): void => {
      const delta = Math.min(now - this.lastTime, 50);
      this.lastTime = now;

      this.interaction.update(delta);
      this.page.updateCharacters(delta);
      this.ui.update(delta);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.page.destroy();
    this.interaction.destroy();
    this.ui.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
