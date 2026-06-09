import { PlanetData } from './PlanetSystem';

export interface UICallbacks {
  onSpeedChange: (speed: number) => void;
  onOrbitToggle: (visible: boolean) => void;
  onCardClose: () => void;
}

export class UI {
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private orbitToggle: HTMLDivElement;
  private infoCard: HTMLDivElement;
  private cardTitle: HTMLDivElement;
  private cardPeriod: HTMLSpanElement;
  private cardInclination: HTMLSpanElement;
  private cardDistance: HTMLSpanElement;
  private cardClose: HTMLButtonElement;
  private controlPanel: HTMLDivElement;
  private panelToggle: HTMLButtonElement;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.orbitToggle = document.getElementById('orbit-toggle') as HTMLDivElement;
    this.infoCard = document.getElementById('info-card') as HTMLDivElement;
    this.cardTitle = document.getElementById('card-title') as HTMLDivElement;
    this.cardPeriod = document.getElementById('card-period') as HTMLSpanElement;
    this.cardInclination = document.getElementById('card-inclination') as HTMLSpanElement;
    this.cardDistance = document.getElementById('card-distance') as HTMLSpanElement;
    this.cardClose = document.getElementById('card-close') as HTMLButtonElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLDivElement;
    this.panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = `${value.toFixed(1)}x`;
      this.callbacks.onSpeedChange(value);
    });

    this.orbitToggle.addEventListener('click', () => {
      const isActive = this.orbitToggle.classList.toggle('active');
      this.callbacks.onOrbitToggle(isActive);
    });

    this.cardClose.addEventListener('click', () => {
      this.hideInfoCard();
    });

    this.panelToggle.addEventListener('click', () => {
      this.controlPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        this.infoCard.classList.contains('visible') &&
        !this.infoCard.contains(target) &&
        !target.classList.contains('planet-label') &&
        target.tagName !== 'CANVAS'
      ) {
        const isPlanetClick = target.closest('#info-card');
        if (!isPlanetClick) {
          this.hideInfoCard();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.infoCard.classList.contains('visible')) {
        this.hideInfoCard();
      }
    });
  }

  public showInfoCard(planetData: PlanetData): void {
    this.cardTitle.textContent = planetData.name;
    this.cardPeriod.textContent = `${planetData.orbitalPeriod.toFixed(2)} 地球天`;
    this.cardInclination.textContent = `${planetData.inclination.toFixed(1)}°`;
    this.cardDistance.textContent = `${planetData.avgDistance.toFixed(1)} 百万公里`;

    this.infoCard.classList.add('visible');
  }

  public hideInfoCard(): void {
    this.infoCard.classList.remove('visible');
    this.callbacks.onCardClose();
  }
}
