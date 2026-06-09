import type { BranchInfo } from './crystalGrowth';

export interface UIParams {
  temperature: number;
  humidity: number;
}

export type ParamChangeCallback = (params: UIParams) => void;

export class UIControl {
  private tempSlider: HTMLInputElement;
  private humiditySlider: HTMLInputElement;
  private tempValue: HTMLSpanElement;
  private humidityValue: HTMLSpanElement;
  private crystalCountEl: HTMLSpanElement;
  private avgGrowthRateEl: HTMLSpanElement;
  private infoPanel: HTMLDivElement;
  private branchLengthEl: HTMLSpanElement;
  private branchCountEl: HTMLSpanElement;
  private branchRateEl: HTMLSpanElement;

  private params: UIParams = {
    temperature: -15,
    humidity: 80
  };

  private onChangeCallback: ParamChangeCallback | null = null;

  constructor() {
    this.tempSlider = document.getElementById('temp-slider') as HTMLInputElement;
    this.humiditySlider = document.getElementById('humidity-slider') as HTMLInputElement;
    this.tempValue = document.getElementById('temp-value') as HTMLSpanElement;
    this.humidityValue = document.getElementById('humidity-value') as HTMLSpanElement;
    this.crystalCountEl = document.getElementById('crystal-count') as HTMLSpanElement;
    this.avgGrowthRateEl = document.getElementById('avg-growth-rate') as HTMLSpanElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLDivElement;
    this.branchLengthEl = document.getElementById('branch-length') as HTMLSpanElement;
    this.branchCountEl = document.getElementById('branch-count') as HTMLSpanElement;
    this.branchRateEl = document.getElementById('branch-rate') as HTMLSpanElement;
  }

  public init(onChange: ParamChangeCallback): void {
    this.onChangeCallback = onChange;
    this.updateDisplayValues();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.tempSlider.addEventListener('input', () => {
      this.params.temperature = parseInt(this.tempSlider.value, 10);
      this.updateDisplayValues();
      this.notifyChange();
    });

    this.humiditySlider.addEventListener('input', () => {
      this.params.humidity = parseInt(this.humiditySlider.value, 10);
      this.updateDisplayValues();
      this.notifyChange();
    });
  }

  private updateDisplayValues(): void {
    this.tempValue.textContent = `${this.params.temperature}°C`;
    this.humidityValue.textContent = `${this.params.humidity}%`;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback({ ...this.params });
    }
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public updateStats(crystalCount: number, avgGrowthRate: number): void {
    this.crystalCountEl.textContent = crystalCount.toString();
    this.avgGrowthRateEl.textContent = avgGrowthRate.toFixed(4);
  }

  public showBranchInfo(info: BranchInfo): void {
    this.branchLengthEl.textContent = info.length.toFixed(2);
    this.branchCountEl.textContent = info.branchCount.toString();
    this.branchRateEl.textContent = info.growthRate.toFixed(4);
    this.infoPanel.classList.add('visible');
  }

  public hideBranchInfo(): void {
    this.infoPanel.classList.remove('visible');
  }
}
