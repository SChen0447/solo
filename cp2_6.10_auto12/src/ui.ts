import type { CelestialBodyData, PlanetObject } from './solarSystem';
import type { SolarSystem } from './solarSystem';

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10];

export class UIManager {
  private infoPanel: HTMLElement;
  private panelTitle: HTMLElement;
  private panelDiameter: HTMLElement;
  private panelMass: HTMLElement;
  private panelOrbit: HTMLElement;
  private panelDistance: HTMLElement;
  private panelDescription: HTMLElement;
  private texturePreview: HTMLElement;
  private closeBtn: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;

  private solarSystem: SolarSystem;

  constructor(solarSystem: SolarSystem) {
    this.solarSystem = solarSystem;

    this.infoPanel = document.getElementById('info-panel')!;
    this.panelTitle = document.getElementById('panel-title')!;
    this.panelDiameter = document.getElementById('panel-diameter')!;
    this.panelMass = document.getElementById('panel-mass')!;
    this.panelOrbit = document.getElementById('panel-orbit')!;
    this.panelDistance = document.getElementById('panel-distance')!;
    this.panelDescription = document.getElementById('panel-description')!;
    this.texturePreview = document.getElementById('texture-preview')!;
    this.closeBtn = document.getElementById('close-panel')!;
    this.pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeBtn.addEventListener('click', () => {
      this.hidePanel();
    });

    this.pauseBtn.addEventListener('click', () => {
      const paused = this.solarSystem.togglePause();
      this.updatePauseButton(paused);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const idx = parseInt((e.target as HTMLInputElement).value, 10);
      const speed = SPEED_OPTIONS[idx] ?? 1;
      this.solarSystem.setSpeed(speed);
      this.speedValue.textContent = `${speed}x`;
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  public showBodyInfo(body: PlanetObject): void {
    const data = body.data as CelestialBodyData;

    this.panelTitle.textContent = data.name;
    this.panelDiameter.textContent = data.diameter;
    this.panelMass.textContent = data.mass;
    this.panelOrbit.textContent = data.orbitPeriod;
    this.panelDistance.textContent = data.distance;
    this.panelDescription.textContent = data.description;

    this.texturePreview.innerHTML = '';
    const canvas = this.solarSystem.generatePreviewCanvas(
      data.color,
      data.nameEn.toLowerCase()
    );
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = this.texturePreview.clientWidth || 360;
    scaledCanvas.height = this.texturePreview.clientHeight || 180;
    const sctx = scaledCanvas.getContext('2d')!;
    sctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    this.texturePreview.appendChild(scaledCanvas);

    this.infoPanel.classList.add('active');
  }

  public hidePanel(): void {
    this.infoPanel.classList.remove('active');
  }

  private updatePauseButton(paused: boolean): void {
    if (paused) {
      this.pauseBtn.textContent = '▶';
      this.pauseBtn.classList.remove('active');
    } else {
      this.pauseBtn.textContent = '❚❚';
      this.pauseBtn.classList.add('active');
    }
  }

  private handleResize(): void {
    if (this.texturePreview.children.length > 0) {
      const oldCanvas = this.texturePreview.children[0] as HTMLCanvasElement;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = this.texturePreview.clientWidth;
      newCanvas.height = this.texturePreview.clientHeight;
      const sctx = newCanvas.getContext('2d')!;
      sctx.drawImage(oldCanvas, 0, 0, newCanvas.width, newCanvas.height);
      this.texturePreview.innerHTML = '';
      this.texturePreview.appendChild(newCanvas);
    }
  }
}
