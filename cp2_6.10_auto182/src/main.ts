import * as THREE from 'three';
import { GalaxyScene } from './GalaxyScene';
import { UIPanel } from './UIPanel';

class App {
  private container: HTMLElement;
  private scene: GalaxyScene;
  private uiPanel: UIPanel;
  private fpsCounter: HTMLElement;
  private tooltip: HTMLElement;
  private perfToast: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;
    this.fpsCounter = document.getElementById('fpsCounter')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.perfToast = document.getElementById('perfToast')!;

    this.scene = new GalaxyScene(this.container, {
      onFPSUpdate: this.handleFPSUpdate.bind(this),
      onLowPerformance: this.handleLowPerformance.bind(this),
      onParticleHover: this.handleParticleHover.bind(this)
    });

    this.uiPanel = new UIPanel(this.container, {
      onParticleCountChange: this.scene.setParticleCount.bind(this.scene),
      onParticleSizeChange: this.scene.setParticleSize.bind(this.scene),
      onColorThemeChange: this.scene.setColorTheme.bind(this.scene),
      onGravityChange: this.scene.setGravityStrength.bind(this.scene),
      onRotationSpeedChange: this.scene.setRotationSpeed.bind(this.scene),
      onReset: this.handleReset.bind(this)
    });

    this.setupCleanup();
    this.scene.start();
  }

  private handleFPSUpdate(fps: number): void {
    this.fpsCounter.textContent = `FPS: ${fps}`;
  }

  private handleLowPerformance(): void {
    this.showPerformanceToast();
  }

  private handleParticleHover(position: THREE.Vector3 | null, screenX: number, screenY: number): void {
    if (position) {
      this.tooltip.textContent = `X: ${position.x.toFixed(2)}  Y: ${position.y.toFixed(2)}  Z: ${position.z.toFixed(2)}`;
      this.tooltip.style.left = `${screenX + 15}px`;
      this.tooltip.style.top = `${screenY + 15}px`;
      this.tooltip.classList.add('visible');
    } else {
      this.tooltip.classList.remove('visible');
    }
  }

  private handleReset(): void {
    this.scene.reset();
  }

  private showPerformanceToast(): void {
    this.perfToast.classList.add('visible');
    setTimeout(() => {
      this.perfToast.classList.remove('visible');
    }, 3000);
  }

  private setupCleanup(): void {
    window.addEventListener('beforeunload', () => {
      this.scene.dispose();
      this.uiPanel.dispose();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
