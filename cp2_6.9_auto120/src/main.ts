import { BodyRenderer } from './body.js';
import { ControlsManager, ControlState } from './controls.js';
import { FlowParams } from './meridians.js';

class App {
  private container: HTMLElement;
  private bodyContainer!: HTMLElement;
  private controlsContainer!: HTMLElement;
  private bodyRenderer!: BodyRenderer;
  private controlsManager!: ControlsManager;
  private controlState: ControlState;
  private startTime: number;
  private animationFrameId: number | null = null;

  constructor() {
    const app = document.getElementById('app');
    if (!app) throw new Error('App container not found');
    this.container = app;
    this.controlState = {
      intensity: 60,
      speedMultiplier: 1,
      temperature: 0.5,
      isNightMode: true,
      autoMode: false
    };
    this.startTime = performance.now();
    this.setupLayout();
    this.initModules();
    this.startRenderLoop();
  }

  private setupLayout(): void {
    this.bodyContainer = document.createElement('div');
    this.bodyContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      min-width: 600px;
    `;
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this.container.appendChild(this.bodyContainer);
    this.container.appendChild(this.controlsContainer);
  }

  private initModules(): void {
    this.bodyRenderer = new BodyRenderer(this.bodyContainer);
    this.controlsManager = new ControlsManager(this.controlsContainer);
    this.controlsManager.subscribe((state) => {
      this.controlState = state;
    });
    this.controlState = this.controlsManager.getState();
  }

  private getFlowParams(): FlowParams {
    const currentTime = (performance.now() - this.startTime) / 1000;
    return {
      intensity: this.controlState.intensity,
      speedMultiplier: this.controlState.speedMultiplier,
      temperature: this.controlState.temperature,
      isNightMode: this.controlState.isNightMode,
      time: currentTime
    };
  }

  private startRenderLoop(): void {
    const render = () => {
      const params = this.getFlowParams();
      this.bodyRenderer.render(params);
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

let app: App | null = null;

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new App();
    });
  } else {
    app = new App();
  }
}

bootstrap();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) {
      app.destroy();
      app = null;
    }
  });
}
