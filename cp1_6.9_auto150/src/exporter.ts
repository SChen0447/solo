import type p5 from 'p5';
import type { Renderer } from './renderer';
import type { StrokeManager } from './stroke';

declare global {
  interface Window {
    GIF: any;
  }
}

const WORKER_SCRIPT = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
`;

function createWorkerUrl(): string {
  const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

export class Exporter {
  private p: p5;
  private renderer: Renderer;
  private manager: StrokeManager;
  private workerUrl: string | null = null;

  constructor(p: p5, renderer: Renderer, manager: StrokeManager) {
    this.p = p;
    this.renderer = renderer;
    this.manager = manager;
  }

  private getWorkerUrl(): string {
    if (!this.workerUrl) {
      this.workerUrl = createWorkerUrl();
    }
    return this.workerUrl;
  }

  exportPNG() {
    const canvas = this.p.canvas as HTMLCanvasElement;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `glow-graffiti-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async exportGIF() {
    const GIF = (window as any).GIF;
    if (!GIF) {
      await this.loadGIFJS();
    }
    const strokes = this.manager.getStrokes();
    if (strokes.length === 0) return;

    const strokeCount = strokes.length;
    const frameRate = Math.max(2, strokeCount * 2);
    const delay = 100;
    const totalFrames = strokeCount + 1;
    const useChunking = strokeCount > 20;

    const gif = new (window as any).GIF({
      workers: 2,
      quality: 10,
      width: this.p.width,
      height: this.p.height,
      workerScript: this.getWorkerUrl(),
      repeat: 0
    });

    const allStrokes = [...strokes];

    const captureFrame = (visibleCount: number): ImageData => {
      this.p.clear();
      this.renderer.drawBackground();
      for (let i = 0; i < visibleCount && i < allStrokes.length; i++) {
        this.renderer.drawStroke(allStrokes[i]);
      }
      return this.renderer.captureFrame();
    };

    const addFrameChunk = async (start: number, end: number): Promise<void> => {
      return new Promise((resolve) => {
        for (let i = start; i < end && i <= totalFrames; i++) {
          const imgData = captureFrame(i);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.p.width;
          tempCanvas.height = this.p.height;
          const ctx = tempCanvas.getContext('2d')!;
          ctx.putImageData(imgData, 0, 0);
          gif.addFrame(tempCanvas, { delay, copy: true });
        }
        if (useChunking && end < totalFrames) {
          setTimeout(() => resolve(), 50);
        } else {
          resolve();
        }
      });
    };

    if (useChunking) {
      const chunkSize = 5;
      for (let i = 0; i <= totalFrames; i += chunkSize) {
        await addFrameChunk(i, Math.min(i + chunkSize, totalFrames + 1));
      }
    } else {
      await addFrameChunk(0, totalFrames + 1);
    }

    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `glow-graffiti-${Date.now()}.gif`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.p.clear();
      this.renderer.render();
    });

    gif.render();
  }

  private loadGIFJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-gifjs]') as HTMLScriptElement | null;
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      script.dataset.gifjs = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load gif.js'));
      document.head.appendChild(script);
    });
  }
}
