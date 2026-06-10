import { CloudSystem, AltitudeLevel } from './cloudSystem';
import { CloudRenderer } from './renderer';

class CloudApp {
  private cloudSystem: CloudSystem;
  private renderer: CloudRenderer;
  private clock: { lastTime: number };
  private animationId: number | null = null;
  private currentAltitude: AltitudeLevel = 'low';
  private currentSaturation: number = 50;

  private altitudeButtons: NodeListOf<HTMLButtonElement>;
  private saturationSlider: HTMLInputElement;
  private saturationValue: HTMLElement;
  private sliderHighlight: HTMLElement;

  constructor() {
    this.cloudSystem = new CloudSystem();
    this.renderer = new CloudRenderer('canvas-container');
    this.clock = { lastTime: performance.now() / 1000 };

    this.altitudeButtons = document.querySelectorAll('.alt-btn');
    this.saturationSlider = document.getElementById('saturation-slider') as HTMLInputElement;
    this.saturationValue = document.getElementById('saturation-value') as HTMLElement;
    this.sliderHighlight = document.getElementById('slider-highlight') as HTMLElement;

    this.bindEvents();
    this.updateUI();
    this.animate();
  }

  private bindEvents(): void {
    this.altitudeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const altitude = btn.dataset.altitude as AltitudeLevel;
        if (altitude && altitude !== this.currentAltitude) {
          this.currentAltitude = altitude;
          this.updateAltitudeButtons();
        }
      });
    });

    this.saturationSlider.addEventListener('input', () => {
      const value = parseInt(this.saturationSlider.value, 10);
      this.currentSaturation = value;
      this.updateSliderUI(value);
    });
  }

  private updateAltitudeButtons(): void {
    this.altitudeButtons.forEach((btn) => {
      const altitude = btn.dataset.altitude as AltitudeLevel;
      btn.classList.toggle('active', altitude === this.currentAltitude);
    });
  }

  private updateSliderUI(value: number): void {
    this.saturationValue.textContent = value.toString();
    this.sliderHighlight.style.width = `${value}%`;
  }

  private updateUI(): void {
    this.updateAltitudeButtons();
    this.updateSliderUI(this.currentSaturation);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(currentTime - this.clock.lastTime, 0.1);
    this.clock.lastTime = currentTime;

    this.cloudSystem.update(
      {
        altitude: this.currentAltitude,
        saturation: this.currentSaturation
      },
      deltaTime
    );

    this.renderer.updateParticles(this.cloudSystem.getParticleData());
    this.renderer.render(deltaTime);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}

let app: CloudApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new CloudApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
