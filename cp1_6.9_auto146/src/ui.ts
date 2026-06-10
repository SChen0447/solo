import type { WaveformType } from './synth';

export interface UIParams {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
}

export class UIController {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  onGenerate: (() => void) | null = null;
  onClear: (() => void) | null = null;
  onChange: ((params: UIParams) => void) | null = null;

  private freqSlider: HTMLInputElement;
  private ampSlider: HTMLInputElement;
  private waveformSelect: HTMLSelectElement;
  private generateBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private freqValue: HTMLElement;
  private ampValue: HTMLElement;

  constructor() {
    this.frequency = 440;
    this.amplitude = 0.5;
    this.waveform = 'sine';

    this.freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    this.ampSlider = document.getElementById('amp-slider') as HTMLInputElement;
    this.waveformSelect = document.getElementById(
      'waveform-select'
    ) as HTMLSelectElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.freqValue = document.getElementById('freq-value') as HTMLElement;
    this.ampValue = document.getElementById('amp-value') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.freqSlider.addEventListener('input', () => {
      this.frequency = parseFloat(this.freqSlider.value);
      this.freqValue.textContent = String(this.frequency);
      this.emitChange();
    });

    this.ampSlider.addEventListener('input', () => {
      this.amplitude = parseFloat(this.ampSlider.value);
      this.ampValue.textContent = this.amplitude.toFixed(2);
      this.emitChange();
    });

    this.waveformSelect.addEventListener('change', () => {
      this.waveform = this.waveformSelect.value as WaveformType;
      this.emitChange();
    });

    this.generateBtn.addEventListener('click', () => {
      if (this.onGenerate) this.onGenerate();
    });

    this.clearBtn.addEventListener('click', () => {
      if (this.onClear) this.onClear();
    });
  }

  private emitChange(): void {
    if (this.onChange) {
      this.onChange({
        frequency: this.frequency,
        amplitude: this.amplitude,
        waveform: this.waveform
      });
    }
  }

  getParams(): UIParams {
    return {
      frequency: this.frequency,
      amplitude: this.amplitude,
      waveform: this.waveform
    };
  }

  setFrequency(f: number): void {
    this.frequency = f;
    this.freqSlider.value = String(f);
    this.freqValue.textContent = String(f);
  }

  setAmplitude(a: number): void {
    this.amplitude = a;
    this.ampSlider.value = String(a);
    this.ampValue.textContent = a.toFixed(2);
  }
}
