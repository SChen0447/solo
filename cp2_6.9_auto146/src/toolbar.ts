import type { WaveformType } from './soundEngine';
import type { ColorMode } from './waveCanvas';

export interface ToolbarEvents {
  onBrushSizeChange?: (size: number) => void;
  onWaveformChange?: (type: WaveformType) => void;
  onColorModeChange?: (mode: ColorMode) => void;
  onFixedColorChange?: (color: string) => void;
  onClear?: () => void;
  onExport?: () => void;
}

export class Toolbar {
  private brushSizeInput: HTMLInputElement;
  private brushSizeValue: HTMLSpanElement;
  private waveTypeSelect: HTMLSelectElement;
  private colorModeRadios: NodeListOf<HTMLInputElement>;
  private colorPicker: HTMLInputElement;
  private clearBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private events: ToolbarEvents;

  constructor(events: ToolbarEvents = {}) {
    this.events = events;

    this.brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
    this.brushSizeValue = document.getElementById('brushSizeValue') as HTMLSpanElement;
    this.waveTypeSelect = document.getElementById('waveType') as HTMLSelectElement;
    this.colorModeRadios = document.querySelectorAll('input[name="colorMode"]') as NodeListOf<HTMLInputElement>;
    this.colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.brushSizeInput.addEventListener('input', () => {
      const size = parseInt(this.brushSizeInput.value, 10);
      this.brushSizeValue.textContent = String(size);
      this.events.onBrushSizeChange?.(size);
    });

    this.waveTypeSelect.addEventListener('change', () => {
      const type = this.waveTypeSelect.value as WaveformType;
      this.events.onWaveformChange?.(type);
    });

    this.colorModeRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          const mode = radio.value as ColorMode;
          this.colorPicker.disabled = mode !== 'fixed';
          this.events.onColorModeChange?.(mode);
        }
      });
    });

    this.colorPicker.addEventListener('input', () => {
      this.events.onFixedColorChange?.(this.colorPicker.value);
    });

    this.clearBtn.addEventListener('click', () => {
      this.events.onClear?.();
    });

    this.exportBtn.addEventListener('click', () => {
      this.events.onExport?.();
    });
  }

  getBrushSize(): number {
    return parseInt(this.brushSizeInput.value, 10);
  }

  getWaveform(): WaveformType {
    return this.waveTypeSelect.value as WaveformType;
  }

  getColorMode(): ColorMode {
    const checked = Array.from(this.colorModeRadios).find((r) => r.checked);
    return (checked?.value as ColorMode) ?? 'hsl';
  }

  getFixedColor(): string {
    return this.colorPicker.value;
  }
}
