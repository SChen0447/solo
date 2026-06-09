import './styles.css';
import { WaveCanvas } from './waveCanvas';
import { SoundEngine, xToFrequency, yToVolume, type WaveformType } from './soundEngine';
import { Toolbar } from './toolbar';
import type { ColorMode } from './waveCanvas';

class App {
  private canvas: HTMLCanvasElement;
  private waveCanvas: WaveCanvas;
  private soundEngine: SoundEngine;
  private toolbar: Toolbar;
  private isDrawing = false;
  private particleCountEl: HTMLSpanElement;
  private frequencyEl: HTMLSpanElement;
  private volumeEl: HTMLSpanElement;
  private lastX = 0;
  private lastY = 0;
  private currentFrequency = 0;
  private currentVolume = 0;

  constructor() {
    this.canvas = document.getElementById('sandCanvas') as HTMLCanvasElement;
    this.particleCountEl = document.getElementById('particleCount') as HTMLSpanElement;
    this.frequencyEl = document.getElementById('frequency') as HTMLSpanElement;
    this.volumeEl = document.getElementById('volume') as HTMLSpanElement;

    this.waveCanvas = new WaveCanvas(this.canvas);
    this.soundEngine = new SoundEngine();

    this.toolbar = new Toolbar({
      onBrushSizeChange: (size) => this.waveCanvas.setBrushSize(size),
      onWaveformChange: (type) => this.soundEngine.setWaveform(type),
      onColorModeChange: (mode) => this.waveCanvas.setColorMode(mode),
      onFixedColorChange: (color) => this.waveCanvas.setFixedColor(color),
      onClear: () => this.waveCanvas.clearAll(),
      onExport: () => this.exportImage()
    });

    this.waveCanvas.setBrushSize(this.toolbar.getBrushSize());
    this.waveCanvas.setColorMode(this.toolbar.getColorMode());
    this.waveCanvas.setFixedColor(this.toolbar.getFixedColor());
    this.soundEngine.setWaveform(this.toolbar.getWaveform());

    this.waveCanvas.setOnParticleCountChange((count) => {
      this.particleCountEl.textContent = String(count);
    });

    this.bindCanvasEvents();
    this.bindWindowEvents();

    this.waveCanvas.start();
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp();
    }, { passive: false });
  }

  private bindWindowEvents(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        this.waveCanvas.resize();
      }, 100);
    });

    window.addEventListener('beforeunload', () => {
      this.soundEngine.destroy();
      this.waveCanvas.stop();
    });
  }

  private getCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getCanvasPoint(e.clientX, e.clientY);
    this.lastX = x;
    this.lastY = y;

    this.waveCanvas.addParticle(x, y);
    this.updateAudio(x, y, true);
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasPoint(e.clientX, e.clientY);
    this.updateAudio(x, y, this.isDrawing);

    if (this.isDrawing) {
      const distance = Math.sqrt(
        Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2)
      );
      const brushSize = this.waveCanvas.getBrushSize();
      const step = Math.max(1, brushSize * 0.3);

      if (distance >= step) {
        const steps = Math.ceil(distance / step);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const px = this.lastX + (x - this.lastX) * t;
          const py = this.lastY + (y - this.lastY) * t;
          this.waveCanvas.addParticle(px, py);
        }
        this.lastX = x;
        this.lastY = y;
      } else {
        this.waveCanvas.addParticle(x, y);
        this.lastX = x;
        this.lastY = y;
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.waveCanvas.triggerFadeRecent();
      this.soundEngine.stop();
      this.currentFrequency = 0;
      this.currentVolume = 0;
      this.updateStatusDisplay();
    }
  }

  private updateAudio(x: number, y: number, playing: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const freq = xToFrequency(x, rect.width);
    const vol = yToVolume(y, rect.height);

    this.currentFrequency = freq;
    this.currentVolume = vol;
    this.updateStatusDisplay();

    if (playing) {
      this.soundEngine.start(freq, vol);
    } else {
      this.soundEngine.update(freq, vol);
    }
  }

  private updateStatusDisplay(): void {
    this.frequencyEl.textContent = Math.round(this.currentFrequency).toString();
    this.volumeEl.textContent = this.currentVolume.toFixed(2);
  }

  private exportImage(): void {
    const dataUrl = this.waveCanvas.exportPNG();
    const link = document.createElement('a');
    link.download = `wave-sand-art-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

export { App, WaveCanvas, SoundEngine, Toolbar };
export type { WaveformType, ColorMode };
