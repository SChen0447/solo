import type { AudioData } from './AudioEngine';

interface UIControllerOptions {
  onRecordToggle?: (isRecording: boolean) => Promise<boolean>;
}

export class UIController {
  private recordButton: HTMLButtonElement;
  private volumeFill: HTMLElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private isRecording: boolean = false;
  private onRecordToggle?: (isRecording: boolean) => Promise<boolean>;

  constructor(options: UIControllerOptions = {}) {
    this.onRecordToggle = options.onRecordToggle;

    const recordBtn = document.getElementById('recordBtn');
    const volFill = document.getElementById('volumeFill');
    const waveCanvas = document.getElementById('waveform');

    if (!recordBtn || !(recordBtn instanceof HTMLButtonElement)) {
      throw new Error('Record button not found');
    }
    if (!volFill) {
      throw new Error('Volume fill element not found');
    }
    if (!waveCanvas || !(waveCanvas instanceof HTMLCanvasElement)) {
      throw new Error('Waveform canvas not found');
    }

    this.recordButton = recordBtn;
    this.volumeFill = volFill;
    this.waveformCanvas = waveCanvas;

    const ctx = waveCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.waveformCtx = ctx;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.recordButton.addEventListener('click', this.handleRecordToggle);
  }

  private handleRecordToggle = async (): Promise<void> => {
    if (this.onRecordToggle) {
      const newState = !this.isRecording;
      const success = await this.onRecordToggle(newState);

      if (success) {
        this.setRecordingState(newState);
      }
    }
  };

  setRecordingState(isRecording: boolean): void {
    this.isRecording = isRecording;

    if (isRecording) {
      this.recordButton.classList.add('recording');
    } else {
      this.recordButton.classList.remove('recording');
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  update(audioData: AudioData): void {
    this.updateVolumeBar(audioData.volume);
    this.drawWaveform(audioData.timeDomainData);
  }

  private updateVolumeBar(volume: number): void {
    const normalizedVolume = Math.min(Math.max(volume * 2, 0), 1);
    const percentage = normalizedVolume * 100;
    this.volumeFill.style.width = `${percentage}%`;
  }

  private drawWaveform(timeDomainData: Uint8Array): void {
    const ctx = this.waveformCtx;
    const width = this.waveformCanvas.width;
    const height = this.waveformCanvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  drawIdleWaveform(): void {
    const ctx = this.waveformCtx;
    const width = this.waveformCanvas.width;
    const height = this.waveformCanvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const time = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * 0.05 + time) * 5;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  dispose(): void {
    this.recordButton.removeEventListener('click', this.handleRecordToggle);
  }
}
