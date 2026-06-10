import * as THREE from 'three';
import type { PlanetData } from './planetSystem';

export interface UIControls {
  speedMultiplier: number;
  isPaused: boolean;
  onSpeedChange: (speed: number) => void;
  onTogglePause: () => void;
  onResetView: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private controls: UIControls;
  private speedSlider: HTMLInputElement;
  private speedLabel: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private timeDisplay: HTMLElement;
  private orbitDisplay: HTMLElement;
  private tooltip: HTMLElement;
  private controlPanel: HTMLElement;
  private mobileToggle: HTMLElement | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private planetMeshes: THREE.Mesh[] = [];
  private isMobile: boolean;

  constructor(container: HTMLElement, camera: THREE.PerspectiveCamera, controls: UIControls) {
    this.container = container;
    this.controls = controls;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isMobile = window.innerWidth < 768;

    this.controlPanel = this.createControlPanel();
    this.speedSlider = this.createSpeedSlider();
    this.speedLabel = this.createSpeedLabel();
    this.pauseBtn = this.createPauseButton();
    this.resetBtn = this.createResetButton();
    this.timeDisplay = this.createTimeDisplay();
    this.orbitDisplay = this.createOrbitDisplay();
    this.tooltip = this.createTooltip();

    this.assemblePanel();
    this.setupEventListeners();
    this.setupResponsive();
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 280px;
      background: #1a1a2e;
      border-radius: 12px;
      padding: 20px;
      color: #fff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 10;
      transition: all 0.3s ease;
    `;
    panel.id = 'control-panel';
    return panel;
  }

  private createSpeedSlider(): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 16px;';

    const label = document.createElement('div');
    label.textContent = '时间流速';
    label.style.cssText = 'font-size: 14px; margin-bottom: 8px; color: #a0a0c0;';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '10';
    slider.step = '0.1';
    slider.value = '1';
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #3a3a5e;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      transition: background 0.2s;
    `;

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]:hover { background: #4a4a7e !important; }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c3aed;
        cursor: pointer;
        transition: transform 0.15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c3aed;
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(style);

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    this.controlPanel.appendChild(wrapper);

    return slider;
  }

  private createSpeedLabel(): HTMLElement {
    const label = document.createElement('div');
    label.textContent = '当前速度: 1.0x';
    label.style.cssText = 'font-size: 13px; color: #7c3aed; margin-bottom: 16px; font-weight: 600;';
    this.controlPanel.appendChild(label);
    return label;
  }

  private createPauseButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '暂停';
    btn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: #7c3aed;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 12px;
      transition: all 0.2s ease;
      font-weight: 500;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#6d28d9';
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#7c3aed';
      btn.style.transform = 'scale(1)';
    });
    this.controlPanel.appendChild(btn);
    return btn;
  }

  private createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '重置视角';
    btn.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      padding: 10px 20px;
      background: #7c3aed;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      z-index: 10;
      transition: all 0.2s ease;
      font-weight: 500;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#6d28d9';
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#7c3aed';
      btn.style.transform = 'scale(1)';
    });
    this.container.appendChild(btn);
    return btn;
  }

  private createTimeDisplay(): HTMLElement {
    const display = document.createElement('div');
    display.style.cssText = 'font-size: 13px; color: #a0a0c0; margin-top: 8px; line-height: 1.6;';
    this.controlPanel.appendChild(display);
    return display;
  }

  private createOrbitDisplay(): HTMLElement {
    const display = document.createElement('div');
    display.style.cssText = 'font-size: 13px; color: #a0a0c0; line-height: 1.6;';
    this.controlPanel.appendChild(display);
    return display;
  }

  private createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: #2d2d44;
      color: #fff;
      border-radius: 8px;
      width: 200px;
      padding: 12px;
      pointer-events: none;
      z-index: 100;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      font-size: 13px;
      line-height: 1.6;
    `;
    this.container.appendChild(tooltip);
    return tooltip;
  }

  private assemblePanel(): void {
    this.container.appendChild(this.controlPanel);
  }

  private setupEventListeners(): void {
    this.speedSlider.addEventListener('input', () => {
      const speed = parseFloat(this.speedSlider.value);
      this.speedLabel.textContent = `当前速度: ${speed.toFixed(1)}x`;
      this.controls.onSpeedChange(speed);
    });

    this.pauseBtn.addEventListener('click', () => {
      this.controls.onTogglePause();
      this.pauseBtn.textContent = this.controls.isPaused ? '继续' : '暂停';
    });

    this.resetBtn.addEventListener('click', () => {
      this.controls.onResetView();
    });

    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseleave', () => {
      this.tooltip.style.display = 'none';
    });

    window.addEventListener('resize', this.setupResponsive.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);

    if (intersects.length > 0) {
      const planetData = intersects[0].object.userData.planetData as PlanetData;
      if (planetData) {
        this.showTooltip(planetData, event.clientX, event.clientY);
      }
    } else {
      this.tooltip.style.display = 'none';
    }
  }

  private showTooltip(data: PlanetData, x: number, y: number): void {
    this.tooltip.innerHTML = `
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #fff;">
        ${data.nameCN} (${data.name})
      </div>
      <div style="color: #a0a0c0;">距太阳: <span style="color: #fff;">${data.distanceAU} AU</span></div>
      <div style="color: #a0a0c0;">公转周期: <span style="color: #fff;">${data.orbitalPeriod} 地球日</span></div>
      <div style="color: #a0a0c0;">表面温度: <span style="color: #fff;">${data.temperature}</span></div>
    `;

    const tooltipWidth = 200;
    const tooltipHeight = 120;
    let left = x + 15;
    let top = y + 15;

    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - 15;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - 15;
    }

    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
    this.tooltip.style.display = 'block';
  }

  private setupResponsive(): void {
    this.isMobile = window.innerWidth < 768;

    if (this.isMobile) {
      this.controlPanel.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        background: #1a1a2e;
        border-radius: 12px 12px 0 0;
        padding: 10px 20px;
        color: #fff;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
        z-index: 10;
        height: 60px;
        overflow: hidden;
        transition: height 0.3s ease;
      `;

      if (!this.mobileToggle) {
        const toggle = document.createElement('div');
        toggle.textContent = '控制面板 ▲';
        toggle.style.cssText = `
          text-align: center;
          padding: 8px 0;
          cursor: pointer;
          color: #a0a0c0;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 1px solid #2a2a4e;
          margin-bottom: 10px;
        `;
        toggle.addEventListener('click', () => {
          const isExpanded = this.controlPanel.style.height !== '60px';
          this.controlPanel.style.height = isExpanded ? '60px' : '320px';
          toggle.textContent = isExpanded ? '控制面板 ▲' : '控制面板 ▼';
        });
        this.controlPanel.insertBefore(toggle, this.controlPanel.firstChild);
        this.mobileToggle = toggle;
      }

      this.resetBtn.style.cssText = `
        position: absolute;
        left: 20px;
        bottom: 80px;
        padding: 10px 20px;
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s ease;
        font-weight: 500;
      `;
    } else {
      this.controlPanel.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 280px;
        background: #1a1a2e;
        border-radius: 12px;
        padding: 20px;
        color: #fff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 10;
        height: auto;
        transition: all 0.3s ease;
      `;

      if (this.mobileToggle) {
        this.mobileToggle.remove();
        this.mobileToggle = null;
      }

      this.resetBtn.style.cssText = `
        position: absolute;
        left: 20px;
        bottom: 20px;
        padding: 10px 20px;
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s ease;
        font-weight: 500;
      `;
    }
  }

  public setPlanetMeshes(meshes: THREE.Mesh[]): void {
    this.planetMeshes = meshes;
  }

  public updateSimulationInfo(simulationTime: number, earthOrbits: number): void {
    const years = Math.floor(simulationTime / 365);
    const days = Math.floor(simulationTime % 365);
    this.timeDisplay.textContent = `模拟时间: ${years}年 ${days}天`;
    this.orbitDisplay.textContent = `地球公转: ${earthOrbits.toFixed(2)} 圈`;
  }
}
