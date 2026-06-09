import type { InstrumentType } from './audioEngine';

export interface RendererConfig {
  minFreq: number;
  maxFreq: number;
  minDb: number;
  maxDb: number;
  pixelsPerSecond: number;
  fadeRate: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  minFreq: 100,
  maxFreq: 4000,
  minDb: -80,
  maxDb: 0,
  pixelsPerSecond: 10,
  fadeRate: 0.1
};

const FREQ_TICKS = [125, 250, 500, 1000, 2000];
const GRID_COLOR = 'rgba(42, 42, 74, 0.8)';
const BG_COLOR = '#0D0D2B';

function freqToY(freq: number, height: number, minFreq: number, maxFreq: number): number {
  const logMin = Math.log2(minFreq);
  const logMax = Math.log2(maxFreq);
  const logF = Math.log2(Math.max(minFreq, Math.min(maxFreq, freq)));
  const ratio = (logF - logMin) / (logMax - logMin);
  return height - ratio * height;
}

function dbToColor(db: number, minDb: number, maxDb: number): string {
  const t = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
  if (t < 0.25) {
    const r = Math.floor(t * 4 * 30);
    const g = Math.floor(t * 4 * 60);
    const b = Math.floor(80 + t * 4 * 175);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.5) {
    const t2 = (t - 0.25) * 4;
    const r = Math.floor(30 + t2 * 100);
    const g = Math.floor(60 + t2 * 160);
    const b = Math.floor(255 - t2 * 100);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.75) {
    const t2 = (t - 0.5) * 4;
    const r = Math.floor(130 + t2 * 125);
    const g = Math.floor(220 - t2 * 60);
    const b = Math.floor(155 - t2 * 155);
    return `rgb(${r},${g},${b})`;
  } else {
    const t2 = (t - 0.75) * 4;
    const r = Math.floor(255);
    const g = Math.floor(160 - t2 * 160);
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

export class SpectrumRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private width: number = 0;
  private height: number = 0;
  private currentX: number = 0;
  private startTime: number = 0;
  private isRendering: boolean = false;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private fps: number = 0;
  private onFpsUpdate?: (fps: number) => void;
  private spectrumHistory: Map<InstrumentType, Float32Array[]> = new Map();
  private recordingInstrument: InstrumentType | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RendererConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resize();
  }

  setFpsCallback(cb: (fps: number) => void): void {
    this.onFpsUpdate = cb;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const minW = 400;
    const maxW = 800;
    const targetW = Math.max(minW, Math.min(maxW, rect.width));
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.floor(targetW);
    this.height = Math.floor(rect.height);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.clear();
    this.drawGrid();
  }

  clear(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.currentX = 0;
  }

  drawGrid(): void {
    this.ctx.save();
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = 1;
    for (const freq of FREQ_TICKS) {
      const y = Math.floor(freqToY(freq, this.height, this.config.minFreq, this.config.maxFreq)) + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    const timeStepSec = 2;
    const stepPx = timeStepSec * this.config.pixelsPerSecond;
    for (let x = this.currentX % stepPx; x < this.width; x += stepPx) {
      const xi = Math.floor(x) + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(xi, 0);
      this.ctx.lineTo(xi, this.height);
      this.ctx.globalAlpha = 0.3;
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  startRecording(instrument: InstrumentType): void {
    this.recordingInstrument = instrument;
    if (!this.spectrumHistory.has(instrument)) {
      this.spectrumHistory.set(instrument, []);
    }
    this.startTime = performance.now();
    this.currentX = 0;
    this.isRendering = true;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.clear();
    this.drawGrid();
  }

  stopRecording(): void {
    this.isRendering = false;
    this.recordingInstrument = null;
  }

  isRecording(): boolean {
    return this.isRendering;
  }

  getHistory(instrument: InstrumentType): Float32Array[] | undefined {
    return this.spectrumHistory.get(instrument);
  }

  clearHistory(): void {
    this.spectrumHistory.clear();
  }

  update(floatData: Float32Array): number {
    if (!this.isRendering) return 0;
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round(this.frameCount / ((now - this.lastFpsTime) / 1000));
      if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    const elapsed = (now - this.startTime) / 1000;
    const targetX = elapsed * this.config.pixelsPerSecond;

    while (this.currentX < targetX) {
      this.drawColumn(floatData);
      this.currentX++;
      if (this.currentX >= this.width) {
        this.scrollLeft();
        this.currentX = this.width - 1;
      }
    }

    this.drawGrid();
    this.drawCurrentColumn(floatData);
    this.recordFrame(floatData);

    return elapsed;
  }

  private recordFrame(data: Float32Array): void {
    if (!this.recordingInstrument) return;
    const history = this.spectrumHistory.get(this.recordingInstrument);
    if (!history) return;
    const copy = new Float32Array(data.length);
    copy.set(data);
    history.push(copy);
    if (history.length > 6000) history.shift();
  }

  private scrollLeft(): void {
    const imageData = this.ctx.getImageData(1, 0, this.width - 1, this.height);
    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(this.width - 1, 0, 1, this.height);
  }

  private drawColumn(_floatData: Float32Array): void {
    const x = this.currentX;
    const imageData = this.ctx.getImageData(x, 0, 1, this.height);
    const data = imageData.data;
    const fade = 1 - this.config.fadeRate;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] * fade);
      data[i + 1] = Math.floor(data[i + 1] * fade);
      data[i + 2] = Math.floor(data[i + 2] * fade);
    }
    this.ctx.putImageData(imageData, x, 0);
  }

  private drawCurrentColumn(floatData: Float32Array): void {
    const x = Math.floor(this.currentX);
    const dpr = window.devicePixelRatio || 1;
    const colW = 3 * dpr;
    this.ctx.save();
    for (let py = 0; py < this.height; py += 1) {
      const yRatio = 1 - py / this.height;
      const logMin = Math.log2(this.config.minFreq);
      const logMax = Math.log2(this.config.maxFreq);
      const freq = Math.pow(2, logMin + yRatio * (logMax - logMin));
      const binIndex = Math.floor(freq * 2048 / 48000);
      const idx = Math.max(0, Math.min(floatData.length - 1, binIndex));
      const db = floatData[idx];
      const colorStr = dbToColor(db, this.config.minDb, this.config.maxDb);
      const alpha = Math.min(1, (db - this.config.minDb) / (this.config.maxDb - this.config.minDb) + this.config.fadeRate);
      this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      this.ctx.fillStyle = colorStr;
      this.ctx.fillRect(x, py, colW, 1.1);
    }
    this.ctx.restore();
  }

  renderComparison(targetCanvas: HTMLCanvasElement, history: Float32Array[]): void {
    const w = 300;
    const h = 200;
    const dpr = window.devicePixelRatio || 1;
    targetCanvas.width = w * dpr;
    targetCanvas.height = h * dpr;
    targetCanvas.style.width = `${w}px`;
    targetCanvas.style.height = `${h}px`;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (const freq of FREQ_TICKS) {
      const y = Math.floor(freqToY(freq, h, this.config.minFreq, this.config.maxFreq)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    if (history.length === 0) return;

    const framesPerPixel = history.length / w;
    for (let px = 0; px < w; px++) {
      const frameIdx = Math.min(history.length - 1, Math.floor(px * framesPerPixel));
      const data = history[frameIdx];
      if (!data) continue;
      for (let py = 0; py < h; py += 1) {
        const yRatio = 1 - py / h;
        const logMin = Math.log2(this.config.minFreq);
        const logMax = Math.log2(this.config.maxFreq);
        const freq = Math.pow(2, logMin + yRatio * (logMax - logMin));
        const binIndex = Math.floor(freq * 2048 / 48000);
        const idx = Math.max(0, Math.min(data.length - 1, binIndex));
        const db = data[idx];
        const colorStr = dbToColor(db, this.config.minDb, this.config.maxDb);
        const alpha = Math.max(0, Math.min(1, (db - this.config.minDb) / (this.config.maxDb - this.config.minDb)));
        if (alpha < 0.05) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colorStr;
        ctx.fillRect(px, py, 1, 1.1);
      }
    }
    ctx.globalAlpha = 1;
  }

  getFps(): number {
    return this.fps;
  }

  getTotalPixels(): number {
    return Math.ceil(this.currentX);
  }

  getPixelsPerSecond(): number {
    return this.config.pixelsPerSecond;
  }

  freqAtY(y: number, canvasHeight: number): number {
    const ratio = 1 - y / canvasHeight;
    const logMin = Math.log2(this.config.minFreq);
    const logMax = Math.log2(this.config.maxFreq);
    return Math.pow(2, logMin + ratio * (logMax - logMin));
  }
}
