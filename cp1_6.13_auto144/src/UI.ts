import { SolarSystem } from './SolarSystem';
import { Planet } from './Planet';

export class UI {
  private container: HTMLElement;
  private solarSystem: SolarSystem;
  private tooltip: HTMLElement;
  private infoPanel: HTMLElement;
  private resetButton: HTMLElement;

  constructor(container: HTMLElement, solarSystem: SolarSystem) {
    this.container = container;
    this.solarSystem = solarSystem;

    this.tooltip = this.createTooltip();
    this.infoPanel = this.createInfoPanel();
    this.resetButton = this.createResetButton();

    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'planet-tooltip';
    this.container.appendChild(tooltip);
    return tooltip;
  }

  private createInfoPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div class="planet-dot" style="background: #fff;"></div>
        <h2>行星名称</h2>
      </div>
      <div class="panel-body">
        <div class="stat">
          <span class="label">公转周期</span>
          <span class="value">-</span>
        </div>
        <div class="stat">
          <span class="label">自转周期</span>
          <span class="value">-</span>
        </div>
        <div class="stat">
          <span class="label">距日距离</span>
          <span class="value">-</span>
        </div>
        <div class="stat">
          <span class="label">质量</span>
          <span class="value">-</span>
        </div>
        <div class="stat">
          <span class="label">温度范围</span>
          <span class="value">-</span>
        </div>
        <div class="stat">
          <span class="label">卫星数量</span>
          <span class="value">-</span>
        </div>
        <div class="description"></div>
      </div>
    `;
    this.container.appendChild(panel);
    return panel;
  }

  private createResetButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'reset-button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    `;
    button.title = '重置视角';
    this.container.appendChild(button);
    return button;
  }

  private setupEventListeners(): void {
    this.solarSystem.setOnPlanetHover(this.onPlanetHover.bind(this));
    this.solarSystem.setOnPlanetSelect(this.onPlanetSelect.bind(this));

    this.resetButton.addEventListener('click', () => {
      this.solarSystem.resetView();
      this.hideInfoPanel();
    });
  }

  private onPlanetHover(planet: Planet | null): void {
    if (planet) {
      this.showTooltip(planet);
    } else {
      this.hideTooltip();
    }
  }

  private onPlanetSelect(planet: Planet | null): void {
    if (planet) {
      this.showInfoPanel(planet);
    } else {
      this.hideInfoPanel();
    }
  }

  private showTooltip(planet: Planet): void {
    const data = planet.data;
    this.tooltip.innerHTML = `
      <div class="name">${data.name} <span style="color:#9090b0;font-weight:400;font-size:12px;">(${data.nameEn})</span></div>
      <div class="info">公转周期: ${data.orbitalPeriod}</div>
      <div class="info">自转周期: ${data.rotationPeriod}</div>
      <div class="info">距日距离: ${data.distanceFromSun}</div>
    `;
    this.tooltip.classList.add('visible');
    this.updateTooltipPosition(planet);
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  private updateTooltipPosition(planet: Planet): void {
    const camera = this.solarSystem.getCamera();
    const { width, height } = this.solarSystem.getSize();
    const screenPos = planet.getScreenPosition(camera, width, height);

    const tooltipRect = this.tooltip.getBoundingClientRect();
    let x = screenPos.x;
    let y = screenPos.y - 20;

    if (x - tooltipRect.width / 2 < 10) {
      x = tooltipRect.width / 2 + 10;
    }
    if (x + tooltipRect.width / 2 > width - 10) {
      x = width - tooltipRect.width / 2 - 10;
    }
    if (y - tooltipRect.height < 10) {
      y = screenPos.y + 20 + planet.data.size * 2;
      this.tooltip.style.transform = 'translate(-50%, 0)';
    } else {
      this.tooltip.style.transform = 'translate(-50%, -100%)';
    }

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  private showInfoPanel(planet: Planet): void {
    const data = planet.data;
    const colorHex = '#' + data.color.toString(16).padStart(6, '0');

    const header = this.infoPanel.querySelector('.panel-header');
    const dot = header?.querySelector('.planet-dot') as HTMLElement;
    const title = header?.querySelector('h2') as HTMLElement;

    if (dot) {
      dot.style.background = colorHex;
      dot.style.color = colorHex;
    }
    if (title) {
      title.textContent = `${data.name} (${data.nameEn})`;
    }

    const stats = this.infoPanel.querySelectorAll('.stat');
    if (stats[0]) stats[0].querySelector('.value')!.textContent = data.orbitalPeriod;
    if (stats[1]) stats[1].querySelector('.value')!.textContent = data.rotationPeriod;
    if (stats[2]) stats[2].querySelector('.value')!.textContent = data.distanceFromSun;
    if (stats[3]) stats[3].querySelector('.value')!.textContent = data.mass;
    if (stats[4]) stats[4].querySelector('.value')!.textContent = data.temperatureRange;
    if (stats[5]) stats[5].querySelector('.value')!.textContent = data.moons.toString();

    const desc = this.infoPanel.querySelector('.description') as HTMLElement;
    if (desc) {
      desc.textContent = data.description;
    }

    this.infoPanel.classList.add('visible');
  }

  private hideInfoPanel(): void {
    this.infoPanel.classList.remove('visible');
  }

  private startAnimationLoop(): void {
    const animate = () => {
      const hoveredPlanet = this.solarSystem.getHoveredPlanet();
      if (hoveredPlanet && this.tooltip.classList.contains('visible')) {
        this.updateTooltipPosition(hoveredPlanet);
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  public dispose(): void {
    this.tooltip.remove();
    this.infoPanel.remove();
    this.resetButton.remove();
  }
}
