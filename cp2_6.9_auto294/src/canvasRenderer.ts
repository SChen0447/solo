import { audioEngine, AudioData } from './audioEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface BandColors {
  start: string;
  end: string;
}

class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private animationFrameId: number | null = null;
  private particles: Particle[] = [];
  private currentAudioData: AudioData | null = null;
  private breathingPhase = 0;
  private isRunning = false;

  private readonly MAX_PARTICLES = 600;
  private readonly BAND_COLORS: BandColors[] = [
    { start: '#1A237E', end: '#4A148C' },
    { start: '#283593', end: '#6A1B9A' },
    { start: '#00C853', end: '#64DD17' },
    { start: '#00E676', end: '#FFEA00' },
    { start: '#FFD600', end: '#FFAB00' },
    { start: '#FF9100', end: '#FF1744' },
    { start: '#FF1744', end: '#D500F9' },
    { start: '#E040FB', end: '#FF4081' }
  ];

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.resize();
  }

  resize(): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    audioEngine.onData((data) => {
      this.currentAudioData = data;
    });

    this.renderLoop();
  }

  stop(): void {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderLoop(): void {
    if (!this.isRunning) return;

    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    this.breathingPhase += 0.03;

    this.drawBackground();
    this.drawReceiver();

    if (this.currentAudioData && audioEngine.getIsRecording()) {
      this.drawLightBands(this.currentAudioData);
      this.updateAndDrawParticles(this.currentAudioData);
    }
  }

  private drawBackground(): void {
    if (!this.ctx) return;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0B0E1A');
    gradient.addColorStop(1, '#1A1F33');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 97.3) % this.height;
      const r = (i % 3) + 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawReceiver(): void {
    if (!this.ctx) return;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const baseRadius = 40;
    const breathing = Math.sin(this.breathingPhase) * 0.2 + 0.8;
    const alpha = 0.6 + Math.sin(this.breathingPhase) * 0.4;
    const glowRadius = baseRadius * (1.2 + breathing * 0.3);

    const glowGradient = this.ctx.createRadialGradient(
      centerX, centerY, baseRadius * 0.5,
      centerX, centerY, glowRadius * 2
    );
    glowGradient.addColorStop(0, `rgba(108, 99, 255, ${alpha * 0.4})`);
    glowGradient.addColorStop(0.5, `rgba(108, 99, 255, ${alpha * 0.15})`);
    glowGradient.addColorStop(1, 'rgba(108, 99, 255, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, glowRadius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    const innerGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, baseRadius
    );
    innerGradient.addColorStop(0, `rgba(140, 133, 255, ${alpha})`);
    innerGradient.addColorStop(1, `rgba(108, 99, 255, ${alpha * 0.7})`);

    this.ctx.fillStyle = innerGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = `rgba(180, 175, 255, ${alpha * 0.8})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (this.currentAudioData && audioEngine.getIsRecording()) {
      const waveRadius = baseRadius + 5 + this.currentAudioData.volumePeak * 15;
      this.ctx.strokeStyle = `rgba(108, 99, 255, ${0.3 + this.currentAudioData.volumePeak * 0.4})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawLightBands(data: AudioData): void {
    if (!this.ctx) return;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const bandCount = data.bandLevels.length;
    const swingBase = 20 + data.volumePeak * 60;

    for (let band = 0; band < bandCount; band++) {
      const level = data.bandLevels[band];
      if (level < 0.05) continue;

      const colors = this.BAND_COLORS[band];
      const lineWidth = 3 + level * 5;
      const alpha = 0.4 + level * 0.5;

      const swingOffset = (band - bandCount / 2) * (swingBase / bandCount);
      const xSwing = Math.sin(this.breathingPhase * 0.7 + band) * swingBase * level * 0.5;

      this.ctx.beginPath();
      this.ctx.lineWidth = lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const points: { x: number; y: number }[] = [];
      const segmentCount = 60;

      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const angle = Math.PI * 2 * t;

        const waveAmp = 30 + level * 100;
        const freqMod = (band + 1) * 0.5;
        const wave = Math.sin(angle * freqMod + this.breathingPhase * 2) * waveAmp * level;

        const baseRadius = 80 + band * 25;
        const radius = baseRadius + wave + swingOffset * 0.3;

        const x = centerX + Math.cos(angle) * radius + xSwing * Math.sin(angle);
        const y = centerY + Math.sin(angle) * radius;

        points.push({ x, y });
      }

      const gradient = this.ctx.createLinearGradient(
        centerX - 200, centerY,
        centerX + 200, centerY
      );
      gradient.addColorStop(0, this.colorWithAlpha(colors.start, alpha));
      gradient.addColorStop(0.5, this.colorWithAlpha(colors.end, alpha));
      gradient.addColorStop(1, this.colorWithAlpha(colors.start, alpha));

      this.ctx.strokeStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      if (points.length >= 2) {
        const last = points[points.length - 1];
        const secondLast = points[points.length - 2];
        this.ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      }

      this.ctx.stroke();

      this.ctx.strokeStyle = this.colorWithAlpha(colors.end, alpha * 0.3);
      this.ctx.lineWidth = lineWidth * 2.5;
      this.ctx.stroke();
    }
  }

  private updateAndDrawParticles(data: AudioData): void {
    if (!this.ctx) return;

    const targetParticleCount = Math.floor(200 + data.volumePeak * 400);
    const particlesToSpawn = Math.min(
      Math.max(5, Math.floor(targetParticleCount * 0.05)),
      30
    );

    for (let i = 0; i < particlesToSpawn && this.particles.length < this.MAX_PARTICLES; i++) {
      this.spawnParticle(data);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy *= 0.995;
      p.vx *= 0.99;
      p.life -= 1 / p.maxLife;
      p.alpha = Math.max(0, p.life * 0.9);

      if (p.life <= 0 || p.y < -10) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.globalAlpha = p.alpha * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  private spawnParticle(data: AudioData): void {
    const dominantBand = this.findDominantBand(data.bandLevels);
    const colors = this.BAND_COLORS[dominantBand];
    const color = Math.random() > 0.5 ? colors.start : colors.end;

    const x = Math.random() * this.width;
    const y = this.height + 10;

    const vx = (Math.random() - 0.5) * 1.5;
    const vy = -(1 + Math.random() * 2 + data.volumePeak * 2);

    const size = 2 + Math.random() * 4 + data.volumePeak * 2;
    const maxLife = 60 + Math.random() * 120;

    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 0.9,
      life: 1,
      maxLife
    });
  }

  private findDominantBand(levels: number[]): number {
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < levels.length; i++) {
      if (levels[i] > maxValue) {
        maxValue = levels[i];
        maxIndex = i;
      }
    }

    if (maxValue < 0.05) {
      return Math.floor(Math.random() * levels.length);
    }

    return maxIndex;
  }

  private colorWithAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export const canvasRenderer = new CanvasRenderer();
