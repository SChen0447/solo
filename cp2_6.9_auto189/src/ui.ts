import { ENV_DEFAULTS, ENV_RANGES, COLORS, HERBIVORE_ATTR, CARNIVORE_ATTR, PLANT_ATTR } from './config';
import type { Ecosystem, PopulationStats } from './ecosystem';

export class UIController {
  ecosystem: Ecosystem;
  temperatureSlider: HTMLInputElement;
  humiditySlider: HTMLInputElement;
  resourceSlider: HTMLInputElement;
  disasterBtn: HTMLButtonElement;
  statusBar: HTMLElement;
  paramDisplay: HTMLElement;
  eventAlert: HTMLElement;
  speciesDisplay: HTMLElement;
  eventBorder: HTMLElement;

  private _lastEventName: string | null = null;
  private _eventAlertTimer: number = 0;

  constructor(ecosystem: Ecosystem) {
    this.ecosystem = ecosystem;
    this.temperatureSlider = document.getElementById('temp-slider') as HTMLInputElement;
    this.humiditySlider = document.getElementById('humidity-slider') as HTMLInputElement;
    this.resourceSlider = document.getElementById('resource-slider') as HTMLInputElement;
    this.disasterBtn = document.getElementById('disaster-btn') as HTMLButtonElement;
    this.statusBar = document.getElementById('status-bar') as HTMLElement;
    this.paramDisplay = document.getElementById('param-display') as HTMLElement;
    this.eventAlert = document.getElementById('event-alert') as HTMLElement;
    this.speciesDisplay = document.getElementById('species-display') as HTMLElement;
    this.eventBorder = document.getElementById('event-border') as HTMLElement;

    this._initSliderValues();
    this.bindEvents();
  }

  private _initSliderValues(): void {
    this.temperatureSlider.min = ENV_RANGES.temperature.min.toString();
    this.temperatureSlider.max = ENV_RANGES.temperature.max.toString();
    this.temperatureSlider.value = ENV_DEFAULTS.temperature.toString();

    this.humiditySlider.min = ENV_RANGES.humidity.min.toString();
    this.humiditySlider.max = ENV_RANGES.humidity.max.toString();
    this.humiditySlider.value = ENV_DEFAULTS.humidity.toString();

    this.resourceSlider.min = ENV_RANGES.resourceRichness.min.toString();
    this.resourceSlider.max = ENV_RANGES.resourceRichness.max.toString();
    this.resourceSlider.step = '0.5';
    this.resourceSlider.value = ENV_DEFAULTS.resourceRichness.toString();
  }

  bindEvents(): void {
    this.temperatureSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.ecosystem.setTemperature(val);
      this.updateParamDisplay();
    });

    this.humiditySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.ecosystem.setHumidity(val);
      this.updateParamDisplay();
    });

    this.resourceSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.ecosystem.setResourceRichness(val);
      this.updateParamDisplay();
    });

    this.disasterBtn.addEventListener('click', () => {
      if (!this.ecosystem.activeEvent) {
        this.ecosystem.triggerDisaster();
      }
    });

    this.disasterBtn.addEventListener('mousedown', () => {
      this.disasterBtn.style.transform = 'scale(0.95)';
    });
    this.disasterBtn.addEventListener('mouseup', () => {
      this.disasterBtn.style.transform = '';
    });
    this.disasterBtn.addEventListener('mouseleave', () => {
      this.disasterBtn.style.transform = '';
    });
  }

  updateParamDisplay(): void {
    const temp = this.ecosystem.paramsDirty ? this.ecosystem.pendingTemperature : this.ecosystem.temperature;
    const hum = this.ecosystem.paramsDirty ? this.ecosystem.pendingHumidity : this.ecosystem.humidity;
    const res = this.ecosystem.paramsDirty ? this.ecosystem.pendingResourceRichness : this.ecosystem.resourceRichness;
    this.paramDisplay.innerHTML = `
      <div class="param-item">温度: ${temp.toFixed(0)}°C</div>
      <div class="param-item">湿度: ${hum.toFixed(0)}%</div>
      <div class="param-item">资源: ${res.toFixed(1)}x</div>
    `;
  }

  updateSpeciesDisplay(stats: PopulationStats): void {
    const items: string[] = [];
    if (!stats.extinctSpecies.includes('植物')) {
      items.push(`<div class="species-item"><span class="plant-icon"></span> ${stats.plants}</div>`);
    }
    if (!stats.extinctSpecies.includes('草食动物')) {
      items.push(`<div class="species-item"><span class="herbivore-icon"></span> ${stats.herbivores}</div>`);
    }
    if (!stats.extinctSpecies.includes('肉食动物')) {
      items.push(`<div class="species-item"><span class="carnivore-icon"></span> ${stats.carnivores}</div>`);
    }
    this.speciesDisplay.innerHTML = items.join('');
  }

  updateStatusBar(fps: number, stats: PopulationStats, generation: number): void {
    const fpsColor = fps >= 30 ? COLORS.fpsGood : COLORS.fpsBad;
    const extinctText = stats.lastExtinct ? `灭绝: ${stats.lastExtinct}` : '生态系统稳定';
    this.statusBar.innerHTML = `
      <span style="color:${fpsColor}">FPS: ${fps.toFixed(0)}</span>
      <span>|</span>
      <span>代数: ${generation}</span>
      <span>|</span>
      <span>总生物量: ${stats.total}</span>
      <span>|</span>
      <span>${extinctText}</span>
    `;
  }

  updateEventAlert(): void {
    const ev = this.ecosystem.activeEvent;
    if (ev && ev.name !== this._lastEventName) {
      this._lastEventName = ev.name;
      this._eventAlertTimer = 180;
      this.eventAlert.textContent = `⚠ ${ev.name}来袭！`;
      this.eventAlert.style.opacity = '1';
    }
    if (this._eventAlertTimer > 0) {
      this._eventAlertTimer--;
      if (this._eventAlertTimer <= 0) {
        this.eventAlert.style.opacity = '0';
      }
    }
    if (!ev) {
      this._lastEventName = null;
    }

    const alpha = this.ecosystem.getEventPulseAlpha();
    if (alpha > 0) {
      this.eventBorder.style.opacity = alpha.toString();
      this.eventBorder.style.display = 'block';
    } else {
      this.eventBorder.style.opacity = '0';
      this.eventBorder.style.display = 'none';
    }
  }

  update(fps: number): void {
    const stats = this.ecosystem.getPopulationStats();
    this.updateParamDisplay();
    this.updateSpeciesDisplay(stats);
    this.updateStatusBar(fps, stats, this.ecosystem.generation);
    this.updateEventAlert();
  }
}
