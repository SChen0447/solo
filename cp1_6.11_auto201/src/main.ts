import { ControlPanel, type TimeOfDay, type WindDirection } from './controls';
import { DesertScene } from './scene';
import './styles.css';

class DesertOasisApp {
  private scene: DesertScene;
  private controls: ControlPanel;

  constructor() {
    this.scene = new DesertScene('scene-canvas', 'plant-container', 'tooltip-container');
    this.controls = new ControlPanel('control-panel', {
      onTimeChange: this.handleTimeChange.bind(this),
      onWindChange: this.handleWindChange.bind(this)
    });

    const params = this.controls.getParams();
    this.scene.setTimeOfDay(params.timeOfDay);
    this.scene.setWind(params.windDirection, params.windSpeed);
  }

  private handleTimeChange(time: TimeOfDay): void {
    this.scene.setTimeOfDay(time);
  }

  private handleWindChange(direction: WindDirection, speed: number): void {
    this.scene.setWind(direction, speed);
  }

  destroy(): void {
    this.scene.destroy();
  }
}

let app: DesertOasisApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new DesertOasisApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});
