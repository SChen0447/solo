import { FFTFrame, Marker } from './audioEngine';

const PRESET_COLORS = ['#f85149', '#f0883e', '#d29922', '#3fb950', '#58a6ff', '#a371f7'];

function frequencyToColor(freqRatio: number, energy: number): string {
  let r: number, g: number, b: number;

  if (freqRatio < 0.33) {
    const t = freqRatio / 0.33;
    r = Math.floor(13 + t * 100);
    g = Math.floor(27 + t * 0);
    b = Math.floor(42 + t * 180);
  } else if (freqRatio < 0.66) {
    const t = (freqRatio - 0.33) / 0.33;
    r = Math.floor(113 + t * 120);
    g = Math.floor(27 + t * 200);
    b = Math.floor(222 - t * 170);
  } else {
    const t = (freqRatio - 0.66) / 0.34;
    r = Math.floor(233 + t * 22);
    g = Math.floor(227 + t * 28);
    b = Math.floor(52 + t * 203);
  }

  const intensity = Math.min(1, energy * 3);
  r = Math.floor(r * (0.3 + intensity * 0.7));
  g = Math.floor(g * (0.3 + intensity * 0.7));
  b = Math.floor(b * (0.3 + intensity * 0.7));

  return `rgb(${r},${g},${b})`;
}

interface RendererCallbacks {
  onMarkerClick: (marker: Marker) => void;
  onCanvasClick: (time: number, x: number, y: number) => void;
  onHover: (time: number | null) => void;
}

export class TerrainRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fftFrames: FFTFrame[] = [];
  private markers: Marker[] = [];
  private scrollOffset = 0;
  private barWidth = 20;
  private scrollSpeed = 2;
  private animationId: number | null = null;
  private lastFrameTime = performance.now();
  private fps = 60;
  private fpsHistory: number[] = [];
  private hoverX: number | null = null;
  private callbacks: RendererCallbacks;
  private audioDuration = 0;
  private hasReducedResolution = false;
  private maxEnergy = 0.01;

  constructor(canvas: HTMLCanvasElement, callbacks: RendererCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.setupEvents();
    this.resize();
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.hoverX = e.clientX - rect.left;
      const time = this.xToTime(this.hoverX);
      this.callbacks.onHover(time);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = null;
      this.callbacks.onHover(null);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedMarker = this.findMarkerAt(x, y);
      if (clickedMarker) {
        this.callbacks.onMarkerClick(clickedMarker);
      } else {
        const time = this.xToTime(x);
        if (time >= 0) {
          this.callbacks.onCanvasClick(time, x, y);
        }
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setFFTFrames(frames: FFTFrame[]): void {
    this.fftFrames = frames;
    this.maxEnergy = 0.01;
    for (const frame of frames) {
      for (let i = 0; i < frame.magnitude.length; i++) {
        if (frame.magnitude[i] > this.maxEnergy) {
          this.maxEnergy = frame.magnitude[i];
        }
      }
    }
  }

  addFFTFrame(frame: FFTFrame): void {
    this.fftFrames.push(frame);
    for (let i = 0; i < frame.magnitude.length; i++) {
      if (frame.magnitude[i] > this.maxEnergy) {
        this.maxEnergy = frame.magnitude[i];
      }
    }
  }

  setMarkers(markers: Marker[]): void {
    this.markers = markers;
  }

  setAudioDuration(duration: number): void {
    this.audioDuration = duration;
  }

  getFPS(): number {
    return this.fps;
  }

  getBarWidth(): number {
    return this.barWidth;
  }

  xToTime(x: number): number {
    if (this.audioDuration <= 0) {
      const totalBars = this.fftFrames.length;
      if (totalBars === 0) return -1;
      const canvasWidth = this.canvas.getBoundingClientRect().width;
      const totalWidth = totalBars * this.barWidth;
      const effectiveX = (x + this.scrollOffset) % Math.max(totalWidth, canvasWidth);
      return (effectiveX / Math.max(totalWidth, canvasWidth)) * (totalBars * 0.0116);
    }
    const canvasWidth = this.canvas.getBoundingClientRect().width;
    const totalWidth = this.audioDuration * (this.barWidth / 0.05);
    const effectiveX = (x + this.scrollOffset) % Math.max(totalWidth, canvasWidth);
    return (effectiveX / Math.max(totalWidth, canvasWidth)) * this.audioDuration;
  }

  timeToX(time: number): number {
    if (this.audioDuration <= 0) return -1;
    const canvasWidth = this.canvas.getBoundingClientRect().width;
    const totalWidth = this.audioDuration * (this.barWidth / 0.05);
    const x = (time / this.audioDuration) * Math.max(totalWidth, canvasWidth) - this.scrollOffset;
    return ((x % canvasWidth) + canvasWidth) % canvasWidth;
  }

  private findMarkerAt(x: number, y: number): Marker | null {
    for (const marker of this.markers) {
      const mx = this.timeToX(marker.time);
      if (Math.abs(mx - x) < 15 && y < 40) {
        return marker;
      }
    }
    return null;
  }

  start(): void {
    if (this.animationId !== null) return;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset(): void {
    this.fftFrames = [];
    this.markers = [];
    this.scrollOffset = 0;
    this.audioDuration = 0;
    this.maxEnergy = 0.01;
    this.hasReducedResolution = false;
    this.barWidth = 20;
  }

  private animate(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const instantFps = 1000 / delta;
    this.fpsHistory.push(instantFps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    this.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (this.fps < 30 && !this.hasReducedResolution && this.barWidth === 20) {
      this.barWidth = 10;
      this.hasReducedResolution = true;
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(1, '#161b22');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    if (this.fftFrames.length === 0) {
      ctx.fillStyle = '#6e7681';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击上方"录制"或"上传"按钮开始', width / 2, height / 2);
      return;
    }

    this.scrollOffset = (this.scrollOffset + this.scrollSpeed) % (this.fftFrames.length * this.barWidth);

    const barsPerScreen = Math.ceil(width / this.barWidth) + 2;
    const startFrame = Math.floor(this.scrollOffset / this.barWidth);

    for (let i = 0; i < barsPerScreen; i++) {
      const frameIdx = (startFrame + i) % this.fftFrames.length;
      const frame = this.fftFrames[frameIdx];
      if (!frame) continue;

      const x = i * this.barWidth - (this.scrollOffset % this.barWidth);
      this.drawTerrainBar(x, frame, height);
    }

    if (this.hoverX !== null) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.hoverX, 0);
      ctx.lineTo(this.hoverX, height);
      ctx.stroke();
    }

    this.drawMarkers(height);
  }

  private drawTerrainBar(x: number, frame: FFTFrame, canvasHeight: number): void {
    const ctx = this.ctx;
    const binCount = frame.magnitude.length;
    const displayBins = Math.min(binCount, 128);
    const barHeight = canvasHeight / displayBins;

    for (let bin = 0; bin < displayBins; bin++) {
      const originalBin = Math.floor((bin / displayBins) * binCount);
      const energy = frame.magnitude[originalBin] / this.maxEnergy;
      const freqRatio = bin / displayBins;
      const barW = this.barWidth * Math.max(0.15, energy);
      const y = canvasHeight - (bin + 1) * barHeight;

      ctx.fillStyle = frequencyToColor(freqRatio, energy);
      ctx.fillRect(
        x + (this.barWidth - barW) / 2,
        y,
        barW,
        barHeight + 0.5
      );
    }
  }

  private drawMarkers(canvasHeight: number): void {
    const ctx = this.ctx;

    for (const marker of this.markers) {
      const x = this.timeToX(marker.time);
      if (x < -20 || x > this.canvas.getBoundingClientRect().width + 20) continue;

      ctx.fillStyle = '#f85149';
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x - 6, 8);
      ctx.lineTo(x + 6, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = marker.color || '#f85149';
      ctx.beginPath();
      ctx.arc(x, 5, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export { PRESET_COLORS };
