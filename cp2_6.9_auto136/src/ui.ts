import type { EngineParams } from './engine';

export interface UICallbacks {
  onEnergyChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
  onParticleCountChange: (value: number) => void;
}

export class UIController {
  private container: HTMLElement;
  private callbacks: UICallbacks;

  private statusTemperature: HTMLElement;
  private statusEnergy: HTMLElement;
  private statusParticles: HTMLElement;

  private sliderEnergy: HTMLInputElement;
  private sliderTemperature: HTMLInputElement;
  private sliderParticles: HTMLInputElement;

  private energyValue: HTMLElement;
  private temperatureValue: HTMLElement;
  private particlesValue: HTMLElement;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const statusPanel = this.createStatusPanel();
    const controlPanel = this.createControlPanel();

    this.container.appendChild(statusPanel);
    this.container.appendChild(controlPanel);

    this.statusTemperature = statusPanel.querySelector('[data-status="temperature"]') as HTMLElement;
    this.statusEnergy = statusPanel.querySelector('[data-status="energy"]') as HTMLElement;
    this.statusParticles = statusPanel.querySelector('[data-status="particles"]') as HTMLElement;

    this.sliderEnergy = controlPanel.querySelector('[data-slider="energy"]') as HTMLInputElement;
    this.sliderTemperature = controlPanel.querySelector('[data-slider="temperature"]') as HTMLInputElement;
    this.sliderParticles = controlPanel.querySelector('[data-slider="particles"]') as HTMLInputElement;

    this.energyValue = controlPanel.querySelector('[data-value="energy"]') as HTMLElement;
    this.temperatureValue = controlPanel.querySelector('[data-value="temperature"]') as HTMLElement;
    this.particlesValue = controlPanel.querySelector('[data-value="particles"]') as HTMLElement;

    this.bindEvents();
  }

  private createStatusPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'status-panel';
    panel.innerHTML = `
      <div class="panel-title">Engine Status</div>
      <div class="status-item">
        <span class="status-label">TEMPERATURE</span>
        <span class="status-value cool" data-status="temperature">2500 K</span>
      </div>
      <div class="status-item">
        <span class="status-label">ENERGY</span>
        <span class="status-value" data-status="energy">50 %</span>
      </div>
      <div class="status-item">
        <span class="status-label">PARTICLES</span>
        <span class="status-value" data-status="particles">25</span>
      </div>
    `;
    return panel;
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.innerHTML = `
      <div class="panel-title">Control Center</div>
      <div class="control-group">
        <div class="control-label">
          <span class="control-name">Energy Output</span>
          <span class="control-value" data-value="energy">50%</span>
        </div>
        <input type="range" data-slider="energy" min="0" max="100" value="50" />
      </div>
      <div class="control-group">
        <div class="control-label">
          <span class="control-name">Engine Temperature</span>
          <span class="control-value" data-value="temperature">2500K</span>
        </div>
        <input type="range" data-slider="temperature" min="0" max="5000" value="2500" />
      </div>
      <div class="control-group">
        <div class="control-label">
          <span class="control-name">Particle Density</span>
          <span class="control-value" data-value="particles">25</span>
        </div>
        <input type="range" data-slider="particles" min="1" max="50" value="25" />
      </div>
    `;
    return panel;
  }

  private bindEvents(): void {
    this.sliderEnergy.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.energyValue.textContent = `${value}%`;
      this.callbacks.onEnergyChange(value);
    });

    this.sliderTemperature.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.temperatureValue.textContent = `${value}K`;
      this.callbacks.onTemperatureChange(value);
    });

    this.sliderParticles.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.particlesValue.textContent = `${value}`;
      this.callbacks.onParticleCountChange(value);
    });
  }

  updateStatus(params: EngineParams): void {
    this.statusTemperature.textContent = `${Math.round(params.temperature)} K`;
    this.statusEnergy.textContent = `${Math.round(params.energy)} %`;
    this.statusParticles.textContent = `${params.particleCount}`;

    if (params.temperature > 3500) {
      this.statusTemperature.classList.remove('cool');
      this.statusTemperature.classList.add('hot');
    } else if (params.temperature < 1500) {
      this.statusTemperature.classList.remove('hot');
      this.statusTemperature.classList.add('cool');
    } else {
      this.statusTemperature.classList.remove('hot', 'cool');
    }
  }
}
