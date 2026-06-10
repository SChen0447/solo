import { PolarizationMode } from './wave';

export interface UICallbacks {
  onFrequencyChange: (freq: number) => void;
  onAmplitudeChange: (amp: number) => void;
  onPhaseDiffChange: (phase: number) => void;
  onPolarizationChange: (mode: PolarizationMode) => void;
  getPolarizationState: () => {
    eAmp: number;
    hAmp: number;
    phaseDiff: number;
    polarization: PolarizationMode;
  };
}

type AnimateValueFn = (element: HTMLElement, newValue: string, duration?: number) => void;

export class UIController {
  private freqSlider!: HTMLInputElement;
  private ampSlider!: HTMLInputElement;
  private phaseSlider!: HTMLInputElement;

  private freqValue!: HTMLElement;
  private ampValue!: HTMLElement;
  private phaseValue!: HTMLElement;
  private polarizationValue!: HTMLElement;

  private modeButtons!: NodeListOf<HTMLButtonElement>;

  private polarizationCanvas!: HTMLCanvasElement;
  private polarizationCtx!: CanvasRenderingContext2D;
  private fpsValue!: HTMLElement;

  private callbacks: UICallbacks;
  private animTime: number = 0;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.initElements();
    this.bindEvents();
    this.startPolarizationPreview();
  }

  private initElements(): void {
    this.freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    this.ampSlider = document.getElementById('amp-slider') as HTMLInputElement;
    this.phaseSlider = document.getElementById('phase-slider') as HTMLInputElement;

    this.freqValue = document.getElementById('freq-value') as HTMLElement;
    this.ampValue = document.getElementById('amp-value') as HTMLElement;
    this.phaseValue = document.getElementById('phase-value') as HTMLElement;
    this.polarizationValue = document.getElementById('polarization-value') as HTMLElement;

    this.modeButtons = document.querySelectorAll('.mode-btn');

    this.polarizationCanvas = document.getElementById('polarization-canvas') as HTMLCanvasElement;
    this.polarizationCtx = this.polarizationCanvas.getContext('2d')!;
    this.fpsValue = document.getElementById('fps-value') as HTMLElement;
  }

  private bindEvents(): void {
    this.freqSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onFrequencyChange(value);
      this.animateValue(this.freqValue, `${value.toFixed(1)} Hz`);
    });

    this.ampSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onAmplitudeChange(value);
      this.animateValue(this.ampValue, value.toFixed(2));
    });

    this.phaseSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onPhaseDiffChange(value);
      this.animateValue(this.phaseValue, `${value.toFixed(0)}°`);
    });

    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as PolarizationMode;
        this.setActiveButton(mode);
        this.callbacks.onPolarizationChange(mode);

        const modeNames: Record<PolarizationMode, string> = {
          linear: '线极化',
          circular: '圆极化',
          elliptical: '椭圆极化'
        };
        this.animateValue(this.polarizationValue, modeNames[mode]);

        if (mode === 'linear') {
          this.phaseSlider.value = '0';
          this.callbacks.onPhaseDiffChange(0);
          this.animateValue(this.phaseValue, '0°');
        } else if (mode === 'circular') {
          this.phaseSlider.value = '90';
          this.callbacks.onPhaseDiffChange(90);
          this.animateValue(this.phaseValue, '90°');
        } else if (mode === 'elliptical') {
          this.phaseSlider.value = '45';
          this.callbacks.onPhaseDiffChange(45);
          this.animateValue(this.phaseValue, '45°');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.dropdown-container')) {
        document.querySelectorAll('.dropdown-menu.open').forEach((menu) => {
          menu.classList.remove('open');
          const btn = (menu as HTMLElement).previousElementSibling;
          if (btn) btn.classList.remove('open');
        });
      }
    });
  }

  private animateValue: AnimateValueFn = (element, newValue, duration = 200) => {
    element.classList.add('updating');
    element.textContent = newValue;
    setTimeout(() => {
      element.classList.remove('updating');
    }, duration);
  };

  private setActiveButton(mode: PolarizationMode): void {
    this.modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  private startPolarizationPreview(): void {
    const animate = () => {
      this.animTime += 0.03;
      this.drawPolarizationPreview();
      requestAnimationFrame(animate);
    };
    animate();
  }

  private drawPolarizationPreview(): void {
    const ctx = this.polarizationCtx;
    const w = this.polarizationCanvas.width;
    const h = this.polarizationCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 3.2;

    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();

    ctx.fillStyle = '#5a5a8a';
    ctx.font = '10px Consolas, monospace';
    ctx.fillText('E (Y)', cx + 4, 16);
    ctx.fillText('H (X)', w - 28, cy - 4);

    const state = this.callbacks.getPolarizationState();

    let trajectoryColor: string;
    if (state.polarization === 'circular' || state.polarization === 'linear') {
      trajectoryColor = '#ffd700';
    } else {
      trajectoryColor = '#00ff88';
    }

    ctx.strokeStyle = trajectoryColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = trajectoryColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const omega = 2 * Math.PI;
    for (let i = 0; i <= 360; i++) {
      const t = i / 360;
      const phase = -omega * t;
      const eY = Math.sin(phase) * state.eAmp;
      const hX = Math.sin(phase + state.phaseDiff) * state.hAmp;

      const px = cx + hX * scale;
      const py = cy - eY * scale;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    const currentPhase = -omega * (this.animTime % 1);
    const currentEY = Math.sin(currentPhase) * state.eAmp;
    const currentHX = Math.sin(currentPhase + state.phaseDiff) * state.hAmp;
    const dotX = cx + currentHX * scale;
    const dotY = cy - currentEY * scale;

    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, dotY);
    ctx.stroke();

    ctx.strokeStyle = '#4444ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(dotX, cy);
    ctx.stroke();
  }

  public updateFPS(fps: number): void {
    this.fpsValue.textContent = Math.round(fps).toString();
  }

  public setFrequency(freq: number): void {
    this.freqSlider.value = freq.toString();
    this.freqValue.textContent = `${freq.toFixed(1)} Hz`;
  }

  public setAmplitude(amp: number): void {
    this.ampSlider.value = amp.toString();
    this.ampValue.textContent = amp.toFixed(2);
  }

  public setPhaseDiff(phase: number): void {
    this.phaseSlider.value = phase.toString();
    this.phaseValue.textContent = `${phase.toFixed(0)}°`;
  }

  public setPolarization(mode: PolarizationMode): void {
    this.setActiveButton(mode);
    const modeNames: Record<PolarizationMode, string> = {
      linear: '线极化',
      circular: '圆极化',
      elliptical: '椭圆极化'
    };
    this.polarizationValue.textContent = modeNames[mode];
  }
}
