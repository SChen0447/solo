import { ParticleSystem } from './particleSystem';
import { RenderEngine } from './renderEngine';
import { ControlPanel } from './controlPanel';

class App {
  private engine: RenderEngine;
  private system: ParticleSystem;
  private panel: ControlPanel;
  private lastTime: number = 0;

  constructor() {
    this.engine = new RenderEngine('canvas');
    this.system = new ParticleSystem(
      this.engine.getWidth(),
      this.engine.getHeight()
    );
    this.panel = new ControlPanel();

    this.bindEvents();
    this.panel.setConfigChangeCallback((config) => {
      this.system.updateConfig(config);
    });
    this.panel.setResetCallback(() => {
      this.system.reset();
    });

    this.panel.updateForMobileParticleCount();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private bindEvents() {
    const canvas = this.engine.canvas;

    canvas.addEventListener('mousemove', (e) => {
      this.system.setMousePosition(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.system.setDragging(true);
        this.system.setMousePosition(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.system.setDragging(false);
    });

    canvas.addEventListener('mouseleave', () => {
      this.system.setDragging(false);
      this.system.setMousePosition(-1000, -1000);
    });

    canvas.addEventListener('click', (e) => {
      this.system.handleClick(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.system.setDragging(true);
      this.system.setMousePosition(touch.clientX, touch.clientY);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.system.setMousePosition(touch.clientX, touch.clientY);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        this.system.handleClick(touch.clientX, touch.clientY);
      }
      this.system.setDragging(false);
      this.system.setMousePosition(-1000, -1000);
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.system.resize(this.engine.getWidth(), this.engine.getHeight());
      this.panel.updateForMobileParticleCount();
    });
  }

  private loop = (currentTime: number) => {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.system.update(deltaTime);
    this.engine.render(this.system);

    requestAnimationFrame(this.loop);
  };
}

new App();
