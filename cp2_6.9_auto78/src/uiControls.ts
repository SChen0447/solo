import type { WeaveParams, WeaveType } from './weaveEngine';

export type ParamsChangeCallback = (params: WeaveParams) => void;
export type WeaveTypeChangeCallback = (
  newType: WeaveType,
  oldType: WeaveType
) => void;
export type ExportCallback = () => void;

interface UIControlsOptions {
  onParamsChange: ParamsChangeCallback;
  onWeaveTypeChange: WeaveTypeChangeCallback;
  onExport: ExportCallback;
}

export class UIControls {
  private warpDensitySlider: HTMLInputElement;
  private weftDensitySlider: HTMLInputElement;
  private warpColorPicker: HTMLInputElement;
  private weftColorPicker: HTMLInputElement;
  private weaveTypeSelect: HTMLSelectElement;
  private exportButton: HTMLButtonElement;
  private warpDensityValue: HTMLSpanElement;
  private weftDensityValue: HTMLSpanElement;

  private onParamsChange: ParamsChangeCallback;
  private onWeaveTypeChange: WeaveTypeChangeCallback;
  private onExport: ExportCallback;

  private currentWeaveType: WeaveType;

  constructor(options: UIControlsOptions) {
    this.warpDensitySlider = document.getElementById(
      'warpDensity'
    ) as HTMLInputElement;
    this.weftDensitySlider = document.getElementById(
      'weftDensity'
    ) as HTMLInputElement;
    this.warpColorPicker = document.getElementById(
      'warpColor'
    ) as HTMLInputElement;
    this.weftColorPicker = document.getElementById(
      'weftColor'
    ) as HTMLInputElement;
    this.weaveTypeSelect = document.getElementById(
      'weaveType'
    ) as HTMLSelectElement;
    this.exportButton = document.getElementById(
      'exportBtn'
    ) as HTMLButtonElement;
    this.warpDensityValue = document.getElementById(
      'warpDensityValue'
    ) as HTMLSpanElement;
    this.weftDensityValue = document.getElementById(
      'weftDensityValue'
    ) as HTMLSpanElement;

    this.onParamsChange = options.onParamsChange;
    this.onWeaveTypeChange = options.onWeaveTypeChange;
    this.onExport = options.onExport;

    this.currentWeaveType = this.weaveTypeSelect.value as WeaveType;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.warpDensitySlider.addEventListener('input', () => {
      this.warpDensityValue.textContent = this.warpDensitySlider.value;
      this.notifyParamsChange();
    });

    this.weftDensitySlider.addEventListener('input', () => {
      this.weftDensityValue.textContent = this.weftDensitySlider.value;
      this.notifyParamsChange();
    });

    this.warpColorPicker.addEventListener('input', () => {
      this.notifyParamsChange();
    });

    this.weftColorPicker.addEventListener('input', () => {
      this.notifyParamsChange();
    });

    this.weaveTypeSelect.addEventListener('change', () => {
      const oldType = this.currentWeaveType;
      const newType = this.weaveTypeSelect.value as WeaveType;
      this.currentWeaveType = newType;
      this.onWeaveTypeChange(newType, oldType);
    });

    this.exportButton.addEventListener('click', () => {
      this.onExport();
    });
  }

  private notifyParamsChange(): void {
    const params = this.getParams();
    this.onParamsChange(params);
  }

  public getParams(): WeaveParams {
    return {
      warpDensity: parseInt(this.warpDensitySlider.value, 10),
      weftDensity: parseInt(this.weftDensitySlider.value, 10),
      warpColor: this.warpColorPicker.value,
      weftColor: this.weftColorPicker.value,
      weaveType: this.weaveTypeSelect.value as WeaveType,
    };
  }
}
