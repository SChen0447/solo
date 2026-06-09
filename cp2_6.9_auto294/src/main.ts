import { audioEngine } from './audioEngine';
import { canvasRenderer } from './canvasRenderer';

class App {
  private canvas: HTMLCanvasElement;
  private recordBtn: HTMLButtonElement;
  private volumeBar: HTMLDivElement;
  private freqBarsContainer: HTMLDivElement;
  private freqBars: HTMLDivElement[] = [];
  private statusUpdateId: number | null = null;

  constructor() {
    const canvasEl = document.getElementById('visualizer');
    const btnEl = document.getElementById('recordBtn');
    const volumeBarEl = document.getElementById('volumeBar');
    const freqBarsContainerEl = document.getElementById('freqBars');

    if (!canvasEl || !btnEl || !volumeBarEl || !freqBarsContainerEl) {
      throw new Error('Required DOM elements not found');
    }

    this.canvas = canvasEl as HTMLCanvasElement;
    this.recordBtn = btnEl as HTMLButtonElement;
    this.volumeBar = volumeBarEl as HTMLDivElement;
    this.freqBarsContainer = freqBarsContainerEl as HTMLDivElement;

    this.freqBars = Array.from(
      this.freqBarsContainer.querySelectorAll('.freq-bar')
    ) as HTMLDivElement[];
  }

  init(): void {
    canvasRenderer.initialize(this.canvas);
    canvasRenderer.start();

    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    window.addEventListener('resize', () => this.handleResize());

    this.startStatusUpdates();
  }

  private async toggleRecording(): Promise<void> {
    if (audioEngine.getIsRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      await audioEngine.start();
      this.recordBtn.classList.add('recording');
      this.recordBtn.title = '停止录音';
      this.recordBtn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      `;
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问麦克风，请检查浏览器权限设置。');
    }
  }

  private stopRecording(): void {
    audioEngine.stop();
    this.recordBtn.classList.remove('recording');
    this.recordBtn.title = '开始录音';
    this.recordBtn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    `;
    this.resetStatusUI();
  }

  private startStatusUpdates(): void {
    const update = () => {
      if (audioEngine.getIsRecording()) {
        audioEngine.onData((data) => {
          this.updateVolumeBar(data.volumePeak);
          this.updateFreqBars(data.bandLevels);
        });
      }

      this.statusUpdateId = requestAnimationFrame(update);
    };

    update();
  }

  private updateVolumeBar(volumePeak: number): void {
    const percentage = Math.min(volumePeak * 100, 100);
    this.volumeBar.style.width = `${percentage}%`;
  }

  private updateFreqBars(bandLevels: number[]): void {
    for (let i = 0; i < this.freqBars.length; i++) {
      const level = bandLevels[i] || 0;
      const height = Math.max(4, level * 36);
      this.freqBars[i].style.height = `${height}px`;
    }
  }

  private resetStatusUI(): void {
    this.volumeBar.style.width = '0%';
    for (const bar of this.freqBars) {
      bar.style.height = '4px';
    }
  }

  private handleResize(): void {
    canvasRenderer.resize();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.init();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
