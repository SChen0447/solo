import './styles.css';
import { OrbitSimulator } from './simulation/OrbitSimulator';
import { Renderer } from './ui/Renderer';
import { UIManager } from './ui/UIManager';

class SimulationOrchestrator {
  private simulator: OrbitSimulator;
  private renderer: Renderer;
  private uiManager: UIManager;

  private simTime = 0;
  private lastTime = 0;
  private running = true;

  constructor() {
    this.simulator = new OrbitSimulator();
    this.renderer = new Renderer();
    this.uiManager = new UIManager(this.simulator, this.renderer);
  }

  init(): void {
    const sceneContainer = document.getElementById('scene-container');
    const controlPanel = document.getElementById('control-panel');
    const infoPanel = document.getElementById('info-panel');

    if (!sceneContainer || !controlPanel || !infoPanel) {
      console.error('Missing DOM anchors');
      return;
    }

    this.renderer.init(sceneContainer);
    this.renderer.createPlanets(this.simulator.planets);
    this.renderer.updateVisibility(this.simulator.config);
    this.uiManager.init(controlPanel, infoPanel);

    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    if (!this.running) return;

    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.simTime += dt;

    this.simulator.update(dt);
    this.renderer.updatePlanets(this.simulator.planets);
    this.renderer.updateGravityWaves(this.simulator.gravityWaves);
    this.renderer.render();
    this.uiManager.updateInfo(this.simTime);
  };

  dispose(): void {
    this.running = false;
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SimulationOrchestrator();
  app.init();
  (window as unknown as { app: SimulationOrchestrator }).app = app;
});
