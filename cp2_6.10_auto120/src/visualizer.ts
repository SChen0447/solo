import { AudioManager } from './audioManager';
import { ThemeController } from './themeController';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export class Visualizer {
  waveformCanvas: HTMLCanvasElement;
  spectrumCanvas: HTMLCanvasElement;
  waveCtx: CanvasRenderingContext2D;
  specCtx: CanvasRenderingContext2D;
  audioManager: AudioManager;
  themeController: ThemeController;
  opacity: number = 1.0;
  animationId: number = 0;
  fps: number = 60;

  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private particles: Particle[] = [];
  private readonly maxParticles: number = 200;
  private readonly barCount: number = 64;
  private readonly spectrumMaxHeight: number = 200;

  constructor(
    waveformCanvas: HTMLCanvasElement,
    spectrumCanvas: HTMLCanvasElement,
    audioManager: AudioManager,
    themeController: ThemeController
  ) {
    this.waveformCanvas = waveformCanvas;
    this.spectrumCanvas = spectrumCanvas;
    this.audioManager = audioManager;
    this.themeController = themeController;

    const waveCtx = waveformCanvas.getContext('2d');
    const specCtx = spectrumCanvas.getContext('2d');
    if (!waveCtx || !specCtx) {
      throw new Error('Failed to get canvas context');
    }
    this.waveCtx = waveCtx;
    this.specCtx = specCtx;

    this.setupCanvasHiDPI();
  }

  private setupCanvasHiDPI(): void {
    const dpr = window.devicePixelRatio || 1;

    const waveRect = this.waveformCanvas.getBoundingClientRect();
    this.waveformCanvas.width = waveRect.width * dpr;
    this.waveformCanvas.height = waveRect.height * dpr;
    this.waveCtx.scale(dpr, dpr);

    const specRect = this.spectrumCanvas.getBoundingClientRect();
    this.spectrumCanvas.width = specRect.width * dpr;
    this.spectrumCanvas.height = specRect.height * dpr;
    this.specCtx.scale(dpr, dpr);
  }

  setOpacity(value: number): void {
    this.opacity = Math.max(0.2, Math.min(1.0, value));
  }

  getFps(): number {
    return this.fps;
  }

  start(): void {
    const render = () => {
      this.updateFps();
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private render(): void {
    this.clearCanvas();

    const timeData = this.audioManager.getTimeDomainData();
    const freqData = this.audioManager.getFrequencyData();

    if (timeData.length > 0) {
      this.drawWaveform(timeData);
    }

    if (freqData.length > 0) {
      const mode = this.themeController.getAnimationMode();
      switch (mode) {
        case 'pulse':
          this.drawSpectrum(freqData);
          this.drawPulseEffect(freqData);
          break;
        case 'glow':
          this.drawGlowEffect(freqData);
          this.drawSpectrum(freqData);
          break;
        case 'particles':
          this.drawSpectrum(freqData);
          this.drawParticles(freqData);
          break;
        default:
          this.drawSpectrum(freqData);
      }
    }
  }

  private clearCanvas(): void {
    const waveRect = this.waveformCanvas.getBoundingClientRect();
    this.waveCtx.clearRect(0, 0, waveRect.width, waveRect.height);

    const specRect = this.spectrumCanvas.getBoundingClientRect();
    this.specCtx.clearRect(0, 0, specRect.width, specRect.height);
  }

  drawWaveform(data: Uint8Array): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.waveCtx;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const centerY = height / 2;
    const sliceWidth = width / data.length;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.themeController.getWaveColor();
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.themeController.getWaveColor();

    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, centerY - y + centerY - centerY);
      }

      const waveY = centerY + (y - height / 2);
      ctx.lineTo(x, waveY);
      x += sliceWidth;
    }

    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.restore();
  }

  drawSpectrum(data: Uint8Array): void {
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.specCtx;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const barWidth = width / this.barCount;
    const usableData = data.slice(0, this.barCount);

    for (let i = 0; i < usableData.length; i++) {
      const value = usableData[i];
      const barHeight = (value / 255) * this.spectrumMaxHeight;
      const x = i * barWidth;
      const y = height - barHeight;
      const color = this.themeController.interpolateColor(i / this.barCount);

      this.drawRoundedBar(ctx, x + 1, y, barWidth - 2, barHeight, 2, color);
    }

    ctx.restore();
  }

  private drawRoundedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string
  ): void {
    if (height <= 0) return;

    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;

    const actualRadius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + actualRadius, y);
    ctx.lineTo(x + width - actualRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + actualRadius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + actualRadius);
    ctx.quadraticCurveTo(x, y, x + actualRadius, y);
    ctx.closePath();
    ctx.fill();
  }

  private drawPulseEffect(data: Uint8Array): void {
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.specCtx;
    const barWidth = width / this.barCount;
    const usableData = data.slice(0, this.barCount);

    ctx.save();
    ctx.globalAlpha = this.opacity * 0.5;

    for (let i = 0; i < usableData.length; i++) {
      const value = usableData[i];
      if (value < 30) continue;

      const energy = value / 255;
      const glowRadius = energy * this.spectrumMaxHeight * 0.1;
      const barHeight = energy * this.spectrumMaxHeight;
      const x = i * barWidth + barWidth / 2;
      const y = height - barHeight;
      const color = this.themeController.interpolateColor(i / this.barCount);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawGlowEffect(data: Uint8Array): void {
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.specCtx;
    const barWidth = width / this.barCount;
    const usableData = data.slice(0, this.barCount);

    ctx.save();
    ctx.globalAlpha = this.opacity * 0.3;

    for (let i = 0; i < usableData.length; i++) {
      const value = usableData[i];
      const barHeight = (value / 255) * this.spectrumMaxHeight;
      if (barHeight < 5) continue;

      const x = i * barWidth;
      const y = height - barHeight;
      const color = this.themeController.interpolateColor(i / this.barCount);

      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    ctx.restore();
  }

  private drawParticles(data: Uint8Array): void {
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.specCtx;
    const barWidth = width / this.barCount;
    const usableData = data.slice(0, this.barCount);

    for (let i = 0; i < usableData.length; i += 2) {
      const value = usableData[i];
      if (value > 80 && this.particles.length < this.maxParticles) {
        const energy = value / 255;
        const barHeight = energy * this.spectrumMaxHeight;
        const x = i * barWidth + barWidth / 2;
        const y = height - barHeight;

        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3 - 1,
          life: 1.0,
          color: this.themeController.interpolateColor(i / this.barCount),
          size: Math.random() * 3 + 1
        });
      }
    }

    ctx.save();
    ctx.globalAlpha = this.opacity;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 0.02;

      if (p.life <= 0 || p.y > height) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = this.opacity * p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
