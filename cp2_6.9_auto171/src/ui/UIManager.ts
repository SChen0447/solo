import { OrbitSimulator } from '../simulation/OrbitSimulator';
import { Renderer } from './Renderer';

export class UIManager {
  private simulator: OrbitSimulator;
  private renderer: Renderer;

  private controlPanel: HTMLElement | null = null;
  private infoPanel: HTMLElement | null = null;

  private planetSelect: HTMLSelectElement | null = null;
  private massSlider: HTMLInputElement | null = null;
  private massValue: HTMLElement | null = null;

  private showOrbitsToggle: HTMLInputElement | null = null;
  private showVelocityToggle: HTMLInputElement | null = null;
  private showFieldLinesToggle: HTMLInputElement | null = null;
  private showGridToggle: HTMLInputElement | null = null;

  private gSlider: HTMLInputElement | null = null;
  private gValue: HTMLElement | null = null;

  private timeDisplay: HTMLElement | null = null;
  private planetCountDisplay: HTMLElement | null = null;
  private selectedPlanetDisplay: HTMLElement | null = null;
  private orbitRadiusDisplay: HTMLElement | null = null;
  private eccentricityDisplay: HTMLElement | null = null;
  private eccentricityControlDisplay: HTMLElement | null = null;
  private fpsDisplay: HTMLElement | null = null;

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;

  constructor(simulator: OrbitSimulator, renderer: Renderer) {
    this.simulator = simulator;
    this.renderer = renderer;
  }

  init(controlPanel: HTMLElement, infoPanel: HTMLElement): void {
    this.controlPanel = controlPanel;
    this.infoPanel = infoPanel;
    this.buildControlPanel();
    this.buildInfoPanel();
    this.bindRendererEvents();
    this.updatePlanetList();
  }

  private buildControlPanel(): void {
    if (!this.controlPanel) return;

    this.controlPanel.innerHTML = `
      <div class="panel-title">控制面板</div>

      <div class="control-row">
        <label>选择行星</label>
        <select id="planetSelect" class="select-input"></select>
      </div>

      <div class="control-row">
        <label>行星质量: <span id="massValue">5.0</span> M⊕</label>
        <input type="range" id="massSlider" class="slider" min="0.5" max="50" step="0.1" value="5">
      </div>

      <div class="control-row toggle-row">
        <label class="toggle-label">
          <input type="checkbox" id="showOrbits" checked>
          <span>轨道线</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="showVelocity" checked>
          <span>速度矢量</span>
        </label>
      </div>

      <div class="control-row toggle-row">
        <label class="toggle-label">
          <input type="checkbox" id="showFieldLines">
          <span>引力场线</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="showGrid" checked>
          <span>背景网格</span>
        </label>
      </div>

      <div class="control-row info-row">
        <span>FPS: <span id="fpsDisplay">--</span></span>
        <span>偏心率: <span id="eccentricityControl">--</span></span>
      </div>
    `;

    this.planetSelect = this.controlPanel.querySelector('#planetSelect') as HTMLSelectElement;
    this.massSlider = this.controlPanel.querySelector('#massSlider') as HTMLInputElement;
    this.massValue = this.controlPanel.querySelector('#massValue') as HTMLElement;
    this.showOrbitsToggle = this.controlPanel.querySelector('#showOrbits') as HTMLInputElement;
    this.showVelocityToggle = this.controlPanel.querySelector('#showVelocity') as HTMLInputElement;
    this.showFieldLinesToggle = this.controlPanel.querySelector('#showFieldLines') as HTMLInputElement;
    this.showGridToggle = this.controlPanel.querySelector('#showGrid') as HTMLInputElement;
    this.fpsDisplay = this.controlPanel.querySelector('#fpsDisplay') as HTMLElement;
    this.eccentricityControlDisplay = this.controlPanel.querySelector('#eccentricityControl') as HTMLElement;

    this.planetSelect.addEventListener('change', (e) => {
      const id = parseInt((e.target as HTMLSelectElement).value, 10);
      this.simulator.setSelectedPlanetId(id);
      this.updateMassSliderForPlanet(id);
      this.renderer.playSelectionPulse(id);
    });

    this.massSlider.addEventListener('input', (e) => {
      const mass = parseFloat((e.target as HTMLInputElement).value);
      const selectedId = this.simulator.getSelectedPlanetId();
      if (selectedId !== null) {
        this.simulator.setPlanetMass(selectedId, mass);
        if (this.massValue) this.massValue.textContent = mass.toFixed(1);
      }
    });

    this.showOrbitsToggle.addEventListener('change', () => {
      this.simulator.config.showOrbits = this.showOrbitsToggle!.checked;
      this.renderer.updateVisibility(this.simulator.config);
    });

    this.showVelocityToggle.addEventListener('change', () => {
      this.simulator.config.showVelocity = this.showVelocityToggle!.checked;
      this.renderer.updateVisibility(this.simulator.config);
    });

    this.showFieldLinesToggle.addEventListener('change', () => {
      this.simulator.config.showFieldLines = this.showFieldLinesToggle!.checked;
      this.renderer.updateVisibility(this.simulator.config);
    });

    this.showGridToggle.addEventListener('change', () => {
      this.simulator.config.showGrid = this.showGridToggle!.checked;
      this.renderer.updateVisibility(this.simulator.config);
    });
  }

  private buildInfoPanel(): void {
    if (!this.infoPanel) return;

    this.infoPanel.innerHTML = `
      <div class="panel-title">模拟信息</div>

      <div class="info-row">
        <span class="info-label">模拟时间</span>
        <span class="info-value" id="timeDisplay">00:00</span>
      </div>

      <div class="info-row">
        <span class="info-label">活跃行星</span>
        <span class="info-value" id="planetCountDisplay">--</span>
      </div>

      <div class="info-row">
        <span class="info-label">选中行星</span>
        <span class="info-value" id="selectedPlanetDisplay">--</span>
      </div>

      <div class="info-row">
        <span class="info-label">轨道半径</span>
        <span class="info-value" id="orbitRadiusDisplay">-- AU</span>
      </div>

      <div class="info-row">
        <span class="info-label">偏心率</span>
        <span class="info-value" id="eccentricityDisplay">--</span>
      </div>

      <div class="control-row" style="margin-top: 12px;">
        <label>引力常数 G: <span id="gValue">1.00</span></label>
        <input type="range" id="gSlider" class="slider" min="0.1" max="2.0" step="0.01" value="1.0">
      </div>
    `;

    this.timeDisplay = this.infoPanel.querySelector('#timeDisplay') as HTMLElement;
    this.planetCountDisplay = this.infoPanel.querySelector('#planetCountDisplay') as HTMLElement;
    this.selectedPlanetDisplay = this.infoPanel.querySelector('#selectedPlanetDisplay') as HTMLElement;
    this.orbitRadiusDisplay = this.infoPanel.querySelector('#orbitRadiusDisplay') as HTMLElement;
    this.eccentricityDisplay = this.infoPanel.querySelector('#eccentricityDisplay') as HTMLElement;
    this.gSlider = this.infoPanel.querySelector('#gSlider') as HTMLInputElement;
    this.gValue = this.infoPanel.querySelector('#gValue') as HTMLElement;

    this.gSlider.addEventListener('input', (e) => {
      const g = parseFloat((e.target as HTMLInputElement).value);
      this.simulator.config.G = g;
      if (this.gValue) this.gValue.textContent = g.toFixed(2);
    });
  }

  private bindRendererEvents(): void {
    this.renderer.onPlanetClick((id) => {
      this.simulator.setSelectedPlanetId(id);
      if (this.planetSelect) this.planetSelect.value = String(id);
      this.updateMassSliderForPlanet(id);
      this.renderer.playSelectionPulse(id);
    });

    this.renderer.onPlanetDragStart((id) => {
      this.simulator.startDrag(id);
    });

    this.renderer.onPlanetDragMove((id, pos) => {
      this.simulator.setPlanetPosition(id, pos);
    });

    this.renderer.onPlanetDragEnd((id) => {
      this.simulator.endDrag(id);
    });
  }

  private updatePlanetList(): void {
    if (!this.planetSelect) return;
    this.planetSelect.innerHTML = '';
    for (const planet of this.simulator.planets) {
      const option = document.createElement('option');
      option.value = String(planet.id);
      option.textContent = planet.name;
      this.planetSelect.appendChild(option);
    }
    if (this.simulator.planets.length > 0) {
      const firstId = this.simulator.planets[0].id;
      this.simulator.setSelectedPlanetId(firstId);
      this.updateMassSliderForPlanet(firstId);
    }
  }

  private updateMassSliderForPlanet(id: number): void {
    const planet = this.simulator.planets.find(p => p.id === id);
    if (planet && this.massSlider && this.massValue) {
      this.massSlider.value = String(planet.mass);
      this.massValue.textContent = planet.mass.toFixed(1);
    }
  }

  updateInfo(simTime: number): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      if (this.fpsDisplay) this.fpsDisplay.textContent = String(this.currentFps);
    }

    if (this.timeDisplay) {
      const totalSeconds = Math.floor(simTime);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.timeDisplay.textContent =
        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    if (this.planetCountDisplay) {
      this.planetCountDisplay.textContent = String(this.simulator.planets.length);
    }

    const selectedId = this.simulator.getSelectedPlanetId();
    if (selectedId !== null) {
      const planet = this.simulator.planets.find(p => p.id === selectedId);
      if (planet) {
        if (this.selectedPlanetDisplay) {
          this.selectedPlanetDisplay.textContent = planet.name;
        }
        if (this.orbitRadiusDisplay) {
          this.orbitRadiusDisplay.textContent = planet.orbitRadius.toFixed(2) + ' AU';
        }
        if (this.eccentricityDisplay) {
          this.eccentricityDisplay.textContent = planet.eccentricity.toFixed(4);
        }
        if (this.eccentricityControlDisplay) {
          this.eccentricityControlDisplay.textContent = planet.eccentricity.toFixed(4);
        }
      }
    } else {
      if (this.selectedPlanetDisplay) this.selectedPlanetDisplay.textContent = '--';
      if (this.orbitRadiusDisplay) this.orbitRadiusDisplay.textContent = '-- AU';
      if (this.eccentricityDisplay) this.eccentricityDisplay.textContent = '--';
      if (this.eccentricityControlDisplay) this.eccentricityControlDisplay.textContent = '--';
    }
  }
}
