import { ParticleSystem } from './particles.js';

export type VisualEffect = 'bars' | 'halo' | 'nebula' | 'mixed';

export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
  average: number;
  dominantHue: number;
}

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private currentEffect: VisualEffect = 'bars';
  private nextEffect: VisualEffect | null = null;
  private transitionProgress = 1;
  private transitionDuration = 1;
  private haloParticleTimer = 0;
  private nebulaParticleTimer = 0;
  private smoothedData: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.particleSystem = new ParticleSystem();
    this.resize();
  }

  setupAudio(analyser: AnalyserNode): void {
    this.analyser = analyser;
    this.analyser.fftSize = 256;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
    this.smoothedData = new Array(this.analyser.frequencyBinCount).fill(0);
  }

  setEffect(effect: VisualEffect): void {
    if (this.currentEffect === effect) return;
    this.nextEffect = effect;
    this.transitionProgress = 0;
  }

  getCurrentEffect(): VisualEffect {
    return this.currentEffect;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private getFrequencyData(): FrequencyData | null {
    if (!this.analyser || !this.frequencyData || !this.timeData) return null;

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const binCount = this.frequencyData.length;
    for (let i = 0; i < binCount; i++) {
      this.smoothedData[i] += (this.frequencyData[i] - this.smoothedData[i]) * 0.15;
    }

    const lowEnd = Math.floor(binCount * 0.06);
    const midEnd = Math.floor(binCount * 0.5);

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;

    for (let i = 0; i < binCount; i++) {
      const value = this.smoothedData[i];
      totalSum += value;

      if (i < lowEnd) {
        lowSum += value;
      } else if (i < midEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }

    const low = lowSum / (lowEnd * 255);
    const mid = midSum / ((midEnd - lowEnd) * 255);
    const high = highSum / ((binCount - midEnd) * 255);
    const average = totalSum / (binCount * 255);

    let dominantIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < binCount; i++) {
      if (this.smoothedData[i] > maxValue) {
        maxValue = this.smoothedData[i];
        dominantIndex = i;
      }
    }
    const dominantHue = (dominantIndex / binCount) * 360;

    return { low, mid, high, average, dominantHue };
  }

  render(deltaTime: number, isPlaying: boolean): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.fillStyle = '#0B0F19';
    this.ctx.fillRect(0, 0, width, height);

    const freqData = this.getFrequencyData();

    if (this.nextEffect !== null) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.currentEffect = this.nextEffect;
        this.nextEffect = null;
        this.transitionProgress = 1;
      }
    }

    if (!isPlaying || !freqData) {
      this.drawIdleState(width, height);
      return;
    }

    this.particleSystem.update(
      deltaTime,
      freqData.low,
      freqData.mid,
      freqData.high,
      width / 2,
      height / 2
    );

    this.haloParticleTimer += deltaTime;
    this.nebulaParticleTimer += deltaTime;

    const currentAlpha = this.nextEffect !== null ? 1 - this.transitionProgress : 1;
    const nextAlpha = this.nextEffect !== null ? this.transitionProgress : 0;

    if (this.nextEffect === null) {
      this.renderEffect(this.currentEffect, width, height, freqData, 1);
    } else {
      this.renderEffect(this.currentEffect, width, height, freqData, currentAlpha);
      this.renderEffect(this.nextEffect, width, height, freqData, nextAlpha);
    }
  }

  private renderEffect(
    effect: VisualEffect,
    width: number,
    height: number,
    freqData: FrequencyData,
    opacity: number
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;

    switch (effect) {
      case 'bars':
        this.drawBars(width, height, 0.6);
        break;
      case 'halo':
        this.drawHalo(width, height, freqData, 0.4);
        break;
      case 'nebula':
        this.drawNebula(width, height, freqData, 0.8);
        break;
      case 'mixed':
        this.drawMixed(width, height, freqData);
        break;
    }

    this.ctx.restore();
  }

  private drawBars(width: number, height: number, opacity: number): void {
    if (!this.frequencyData) return;

    const barCount = 64;
    const maxBarHeight = height * 0.4;
    const barWidth = (width * 0.8) / barCount;
    const gap = barWidth * 0.2;
    const actualBarWidth = barWidth - gap;
    const startX = width * 0.1;
    const baseY = height * 0.9;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * (this.smoothedData.length / barCount));
      const value = this.smoothedData[dataIndex] / 255;
      const barHeight = value * maxBarHeight;

      const channelBias = (i / barCount) * 2 - 1;
      const tiltAngle = channelBias * 0.05 * value;

      const x = startX + i * barWidth;

      this.ctx.save();
      this.ctx.translate(x + actualBarWidth / 2, baseY);
      this.ctx.rotate(tiltAngle);

      const gradient = this.ctx.createLinearGradient(0, 0, 0, -barHeight);
      gradient.addColorStop(0, `rgba(74, 144, 217, ${opacity})`);
      gradient.addColorStop(1, `rgba(155, 89, 182, ${opacity})`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.roundRect(-actualBarWidth / 2, -barHeight, actualBarWidth, barHeight, 4);
      this.ctx.fill();

      if (barHeight > 10) {
        const glowRadius = 5 + value * 15;
        this.ctx.shadowColor = `rgba(155, 89, 182, ${opacity * 0.8})`;
        this.ctx.shadowBlur = glowRadius;
        this.ctx.beginPath();
        this.ctx.arc(0, -barHeight, actualBarWidth * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }

      this.ctx.restore();
    }
  }

  private drawHalo(
    width: number,
    height: number,
    freqData: FrequencyData,
    opacity: number
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 50;
    const maxRadius = 150;
    const radius = baseRadius + freqData.average * (maxRadius - baseRadius);
    const lineWidth = 2 + freqData.average * 6;

    const hue = 180 + freqData.average * 60;
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, radius * 0.8,
      centerX, centerY, radius * 1.2
    );
    gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
    gradient.addColorStop(0.5, `hsla(${hue + 20}, 100%, 60%, ${opacity})`);
    gradient.addColorStop(1, `hsla(${hue + 120}, 100%, 56%, 0)`);

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = lineWidth;
    this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${opacity})`;
    this.ctx.shadowBlur = 30;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    if (this.haloParticleTimer >= 0.016) {
      const emitCount = Math.floor(3 + freqData.average * 8);
      this.particleSystem.emitHaloParticles(centerX, centerY, emitCount, hue);
      this.haloParticleTimer = 0;
    }

    this.particleSystem.draw(this.ctx, opacity);
  }

  private drawNebula(
    width: number,
    height: number,
    freqData: FrequencyData,
    opacity: number
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const targetParticleCount = Math.floor(200 + freqData.mid * 800);

    if (this.nebulaParticleTimer >= 0.05 && this.particleSystem.getCount() < targetParticleCount) {
      const emitCount = Math.min(20, targetParticleCount - this.particleSystem.getCount());
      const baseHue = this.lerp(350, 200, freqData.high);
      this.particleSystem.emitNebulaParticles(centerX, centerY, emitCount, baseHue);
      this.nebulaParticleTimer = 0;
    }

    const bgGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(width, height) * 0.6
    );
    bgGradient.addColorStop(0, `rgba(139, 0, 0, ${opacity * 0.15})`);
    bgGradient.addColorStop(0.5, `rgba(30, 0, 80, ${opacity * 0.1})`);
    bgGradient.addColorStop(1, `rgba(0, 191, 255, ${opacity * 0.05})`);
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    this.particleSystem.draw(this.ctx, opacity);
  }

  private drawMixed(
    width: number,
    height: number,
    freqData: FrequencyData
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.drawBars(width, height, 1);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = 0.4;
    this.drawHalo(width, height, freqData, 1);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = 0.8;
    this.drawNebula(width, height, freqData, 1);
    this.ctx.restore();
  }

  private drawIdleState(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const time = Date.now() * 0.001;

    for (let i = 0; i < 3; i++) {
      const radius = 50 + i * 40 + Math.sin(time + i) * 10;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(108, 99, 255, ${0.1 + i * 0.05})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '16px -apple-system, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('选择音频文件开始可视化', centerX, centerY + 120);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  clearParticles(): void {
    this.particleSystem.clear();
  }
}
