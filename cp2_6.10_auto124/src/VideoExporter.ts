import GIF from 'gif.js';

export class VideoExporter {
  private canvas: HTMLCanvasElement;
  private progressBar: HTMLElement;
  private exportBtn: HTMLElement;
  private isRecording: boolean = false;
  private duration: number = 5;
  private fps: number = 15;
  private frameInterval: number;
  private nextFrameTime: number = 0;
  private framesRecorded: number = 0;
  private totalFrames: number;
  private gif: GIF | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.progressBar = document.getElementById('progress-bar') as HTMLElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLElement;
    this.frameInterval = 1000 / this.fps;
    this.totalFrames = this.duration * this.fps;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  startExport(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.framesRecorded = 0;
    this.nextFrameTime = performance.now();

    this.progressBar.classList.add('active');
    this.progressBar.style.width = '0%';
    this.exportBtn.classList.add('recording');

    this.gif = new GIF({
      workers: 2,
      quality: 10,
      width: this.canvas.width,
      height: this.canvas.height,
      workerScript: this.getWorkerScript()
    });

    this.gif.on('progress', (p: number) => {
      const progress = ((this.framesRecorded / this.totalFrames) * 0.6 + p * 0.4) * 100;
      this.progressBar.style.width = `${Math.min(progress, 100)}%`;
    });

    this.gif.on('finished', (blob: Blob) => {
      this.downloadGIF(blob);
      this.cleanup();
    });
  }

  private getWorkerScript(): string {
    try {
      const workerUrl = new URL('gif.js/dist/gif.worker.js', import.meta.url).href;
      return workerUrl;
    } catch {
      return 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js';
    }
  }

  update(currentTime: number): void {
    if (!this.isRecording || !this.gif) return;

    if (currentTime >= this.nextFrameTime) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        this.gif.addFrame(ctx, { copy: true, delay: this.frameInterval });
      }

      this.framesRecorded++;
      const captureProgress = (this.framesRecorded / this.totalFrames) * 60;
      this.progressBar.style.width = `${captureProgress}%`;

      this.nextFrameTime = currentTime + this.frameInterval;

      if (this.framesRecorded >= this.totalFrames) {
        this.finishRecording();
      }
    }
  }

  private finishRecording(): void {
    if (!this.gif) return;
    this.progressBar.style.width = '60%';
    this.gif.render();
  }

  private downloadGIF(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'particle_flow.gif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private cleanup(): void {
    this.isRecording = false;
    this.gif = null;

    setTimeout(() => {
      this.progressBar.classList.remove('active');
      this.progressBar.style.width = '0%';
      this.exportBtn.classList.remove('recording');
    }, 500);
  }
}
