import * as THREE from 'three';

export interface UIPanelCallbacks {
  onStartGrowth: () => void;
  onResetGrowth: () => void;
  onSoilOpacityChange: (opacity: number) => void;
  onGrowthSpeedChange: (speed: number) => void;
}

export interface PlantInfo {
  name: string;
  depth: number;
  totalLength: number;
  lateralCount: number;
  growTime: number;
}

export class UIPanel {
  private callbacks: UIPanelCallbacks;

  private nameEl: HTMLElement;
  private depthEl: HTMLElement;
  private lengthEl: HTMLElement;
  private lateralEl: HTMLElement;
  private growTimeEl: HTMLElement;

  private soilOpacitySlider: HTMLInputElement;
  private soilOpacityValue: HTMLElement;
  private growthSpeedSlider: HTMLInputElement;
  private growthSpeedValue: HTMLElement;

  private btnGrow: HTMLElement;
  private btnReset: HTMLElement;

  private tooltipEl: HTMLElement;
  private hamburgerBtn: HTMLElement;
  private panelEl: HTMLElement;

  constructor(callbacks: UIPanelCallbacks) {
    this.callbacks = callbacks;

    this.nameEl = this._getEl('plant-name');
    this.depthEl = this._getEl('root-depth');
    this.lengthEl = this._getEl('root-length');
    this.lateralEl = this._getEl('lateral-count');
    this.growTimeEl = this._getEl('growth-time');

    this.soilOpacitySlider = this._getInput('soil-opacity');
    this.soilOpacityValue = this._getEl('soil-opacity-value');
    this.growthSpeedSlider = this._getInput('growth-speed');
    this.growthSpeedValue = this._getEl('growth-speed-value');

    this.btnGrow = this._getEl('btn-grow');
    this.btnReset = this._getEl('btn-reset');

    this.tooltipEl = this._getEl('tooltip');
    this.hamburgerBtn = this._getEl('hamburger-btn');
    this.panelEl = this._getEl('ui-panel');

    this._bindEvents();
    this.updatePlantInfo(null);
  }

  private _getEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element with id "${id}" not found`);
    return el;
  }

  private _getInput(id: string): HTMLInputElement {
    const el = document.getElementById(id);
    if (!el || !(el instanceof HTMLInputElement)) {
      throw new Error(`Input element with id "${id}" not found`);
    }
    return el;
  }

  private _bindEvents(): void {
    this.btnGrow.addEventListener('click', () => {
      this.callbacks.onStartGrowth();
    });

    this.btnReset.addEventListener('click', () => {
      this.callbacks.onResetGrowth();
    });

    this.soilOpacitySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.soilOpacityValue.textContent = val.toFixed(2);
      this.callbacks.onSoilOpacityChange(val);
    });

    this.growthSpeedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.growthSpeedValue.textContent = val.toFixed(1) + 'x';
      this.callbacks.onGrowthSpeedChange(val);
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.panelEl.classList.toggle('open');
    });
  }

  public updatePlantInfo(info: PlantInfo | null): void {
    if (!info) {
      this.nameEl.textContent = '未选择';
      this.depthEl.textContent = '0.00';
      this.lengthEl.textContent = '0.00';
      this.lateralEl.textContent = '0';
      this.growTimeEl.textContent = '0.00s';
      return;
    }

    this.nameEl.textContent = info.name;
    this.depthEl.textContent = info.depth.toFixed(2);
    this.lengthEl.textContent = info.totalLength.toFixed(2);
    this.lateralEl.textContent = info.lateralCount.toString();
    this.growTimeEl.textContent = info.growTime.toFixed(2) + 's';
  }

  public updateGrowthTime(growTime: number): void {
    this.growTimeEl.textContent = growTime.toFixed(2) + 's';
  }

  public showTooltip(info: { depth: number; color: number } | null, x: number, y: number): void {
    if (!info) {
      this.tooltipEl.style.opacity = '0';
      return;
    }

    const colorHex = '#' + new THREE.Color(info.color).getHexString();
    this.tooltipEl.innerHTML = `深度: ${info.depth.toFixed(2)}<br/>颜色: <span style="color:${colorHex}">${colorHex}</span>`;
    this.tooltipEl.style.left = (x + 12) + 'px';
    this.tooltipEl.style.top = (y + 12) + 'px';
    this.tooltipEl.style.opacity = '1';
  }

  public setGrowButtonState(isGrowing: boolean): void {
    if (isGrowing) {
      this.btnGrow.textContent = '生长中...';
      (this.btnGrow as HTMLButtonElement).disabled = true;
      this.btnGrow.style.opacity = '0.6';
      this.btnGrow.style.cursor = 'not-allowed';
    } else {
      this.btnGrow.textContent = '开始生长';
      (this.btnGrow as HTMLButtonElement).disabled = false;
      this.btnGrow.style.opacity = '1';
      this.btnGrow.style.cursor = 'pointer';
    }
  }
}
