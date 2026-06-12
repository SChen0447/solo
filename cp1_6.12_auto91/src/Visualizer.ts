import { AudioEngine, WaveformType } from './AudioEngine';

const WAVE_COLORS: Record<WaveformType, string> = {
  sine: '#4CAF50',
  square: '#FF7043',
  sawtooth: '#AB47BC'
};

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioEngine: AudioEngine;
  private animationId: number | null = null;
  private currentWaveform: WaveformType = 'sine';
  private phase: number = 0;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    this.ctx = ctx;
    this.audioEngine = audioEngine;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setWaveform(wave: WaveformType): void {
    this.currentWaveform = wave;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.drawStatic();
  }

  private getLogicalSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  private drawGrid(): void {
    const { width, height } = this.getLogicalSize();
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  drawStatic(): void {
    const { width, height } = this.getLogicalSize();
    const ctx = this.ctx;

    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, width, height);

    this