export interface WaveformRendererOptions {
  sampleRate?: number;
  samplesPerFrame?: number;
  gridIntervalMs?: number;
  scrollSpeed?: number;
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;
  private sampleRate: number;
  private samplesPerFrame: number;
  private gridIntervalMs: number;
  private waveBuffer: Float32Array;
  private bufferIndex: number = 0;
  private scrollOffset: number = 0;
  private scrollSpeed: number;
  private playbackPosition: number = 0;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private duration: number = 0;

  constructor(canvas: HTMLCanvasElement, options: WaveformRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.sampleRate = options.sampleRate || 44100;
    this.samplesPerFrame = options.samplesPerFrame || 1024;
    this.gridIntervalMs = options.gridIntervalMs || 50;
    this.scrollSpeed = options.scrollSpeed || 1;
    this.waveBuffer = new Float32Array(this.samplesPerFrame * 200);
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setDuration(duration: number): void {
    this.duration = duration;
  }

  setPlaying(playing: boolean, currentTime: number = 0): void {
    this.isPlaying = playing;
    if (playing) {
      this.startTime = performance.now() - currentTime * 1000;
    } else {
      this.playbackPosition = currentTime;
    }
  }

  setPlaybackPosition(position: number): void {
    this.playbackPosition = position;
    if (this.isPlaying) {
      this.startTime = performance.now() - position * 1000;
    }
  }

  pushSamples(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.waveBuffer[this.bufferIndex] = samples[i];
      this.bufferIndex = (this.bufferIndex + 1) % this.waveBuffer.length;
    }
  }

  render(timeData: Float32Array | null): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const midY = h / 2;

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid();

    if (timeData) {
      this.pushSamples(timeData);
    }

    this.drawWaveform();
    this.drawPlayhead();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const pxPerMs = this.width / (this.duration * 1000 || 10000);
    const gridIntervalPx = pxPerMs * this.gridIntervalMs;

    ctx.strokeStyle = 'rgba(90, 90, 158, 0.25)';
    ctx.lineWidth = 1;

    const scrollOffsetPx = this.scrollOffset;
    const startX = -((scrollOffsetPx % gridIntervalPx + gridIntervalPx) % gridIntervalPx);

    for (let x = startX; x < w; x += gridIntervalPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const rows = 4;
    for (let i = 1; i < rows; i++) {
      const y = (h / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private drawWaveform(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const midY = h / 2;

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#2c3e7a');
    gradient.addColorStop(0.5, '#6b5bab');
    gradient.addColorStop(1, '#9b6bcb');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bufferLen = this.samplesPerFrame;
    const sliceWidth = w / bufferLen;

    ctx.beginPath();

    for (let i = 0; i < bufferLen; i++) {
      const bufferIdx = (this.bufferIndex - bufferLen + i + this.waveBuffer.length) % this.waveBuffer.length;
      const v = this.waveBuffer[bufferIdx];
      const y = midY + v * (h * 0.45);
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    ctx.fillStyle = 'rgba(107, 91, 171, 0.1)';
    ctx.lineTo(w, midY);
    ctx.lineTo(0, midY);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayhead(): void {
    if (this.duration <= 0) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    let currentPos: number;
    if (this.isPlaying) {
      currentPos = (performance.now() - this.startTime) / 1000;
    } else {
      currentPos = this.playbackPosition;
    }

    const x = (currentPos / this.duration) * w;
    const clampedX = Math.max(0, Math.min(w, x));

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(clampedX, 0);
    ctx.lineTo(clampedX, h);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(clampedX, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(clampedX, h, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  getCurrentPosition(): number {
    if (this.isPlaying) {
      return (performance.now() - this.startTime) / 1000;
    }
    return this.playbackPosition;
  }
}
