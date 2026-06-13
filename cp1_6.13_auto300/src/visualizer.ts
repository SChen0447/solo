import type { AudioData, PresetType } from './audio.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  life: number;
  maxLife: number;
  band: 'bass' | 'mid' | 'treble';
  angle: number;
  angularVel: number;
  glowPhase: number;
  glowSpeed: number;
  ringIndex: number;
}

export interface VisualizerConfig {
  bpm: number;
  preset: PresetType | null;
}

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private particles: Particle[] = [];
  private maxParticles: number = 1200;
  private ringTimer: number = 0;
  private ringInterval: number = 0.15;
  private lastTime: number = 0;
  private config: VisualizerConfig = { bpm: 110, preset: null };
  private bassColors: [string, string] = ['#ff6b6b', '#feca57'];
  private midColors: [string, string] = ['#48dbfb', '#a29bfe'];
  private trebleColors: [string, string] = ['#ff9ff3', '#e84393'];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public setConfig(config: Partial<VisualizerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.bpm) {
      this.ringInterval = 60 / config.bpm;
    }
  }

  public render(audioData: AudioData | null, deltaTime: number): void {
    if (deltaTime <= 0) deltaTime = 0.016;
    const t = performance.now() / 1000;
    this.lastTime = t;

    this.drawBackground();

    if (!audioData) {
      this.drawIdle();
      this.particles = [];
      return;
    }

    this.spawnParticles(audioData, deltaTime);
    this.updateParticles(deltaTime, audioData);
    this.drawRings(audioData);
    this.drawParticles();
    this.drawBorderGlow(audioData);
  }

  public getDominantGradient(data: AudioData): string {
    const band = data.dominantBand;
    const amp = band === 'bass' ? data.bassAmplitude : band === 'mid' ? data.midAmplitude : data.trebleAmplitude;
    const tClamp = Math.max(0, Math.min(1, amp));
    const colors = band === 'bass' ? this.bassColors : band === 'mid' ? this.midColors : this.trebleColors;
    return this.lerpColor(colors[0], colors[1], tClamp);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.5, '#1a1042');
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawIdle(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const t = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const r = 30 + i * 40 + Math.sin(t * 1.5 + i) * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(72, 219, 251, ${0.1 + 0.05 * Math.sin(t + i)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(72, 219, 251, 0.15)';
    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击上方按钮或上传文件开始体验', cx, cy + 100);
  }

  private spawnParticles(data: AudioData, dt: number): void {
    this.ringTimer += dt;
    const interval = Math.max(0.05, this.ringInterval * (1 - data.bassAmplitude * 0.4));

    while (this.ringTimer >= interval) {
      this.ringTimer -= interval;
      this.emitRing(data);
    }

    const totalAmp = (data.bassAmplitude + data.midAmplitude + data.trebleAmplitude) / 3;
    const extraCount = Math.floor(totalAmp * 8);
    for (let i = 0; i < extraCount; i++) {
      this.emitRandom(data);
    }
  }

  private emitRing(data: AudioData): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const particleCounts = [
      { band: 'bass' as const, count: Math.floor(30 + data.bassAmplitude * 20) },
      { band: 'mid' as const, count: Math.floor(25 + data.midAmplitude * 20) },
      { band: 'treble' as const, count: Math.floor(20 + data.trebleAmplitude * 20) }
    ];
    const ampMultipliers = { bass: data.bassAmplitude, mid: data.midAmplitude, treble: data.trebleAmplitude };

    for (const { band, count } of particleCounts) {
      const amp = ampMultipliers[band];
      if (amp < 0.05) continue;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
        const baseSpeed = this.config.bpm / 60 * 50;
        const speedMult = 0.8 + amp * 1.5;
        const speed = baseSpeed * speedMult * (band === 'treble' ? 1.4 : band === 'mid' ? 1.1 : 0.8);
        const p: Particle = {
          x: cx + Math.cos(angle) * 10,
          y: cy + Math.sin(angle) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1,
          baseRadius: 2 + Math.random() * 6,
          life: 0,
          maxLife: 1.8 + Math.random() * 1.2,
          band,
          angle,
          angularVel: (Math.random() - 0.5) * 0.8,
          glowPhase: Math.random() * Math.PI * 2,
          glowSpeed: 20 + Math.random() * 50,
          ringIndex: 0
        };
        this.particles.push(p);
      }
    }
  }

  private emitRandom(data: AudioData): void {
    if (this.particles.length >= this.maxParticles) return;
    const bands: Array<'bass' | 'mid' | 'treble'> = ['bass', 'mid', 'treble'];
    const probs = [data.bassAmplitude, data.midAmplitude, data.trebleAmplitude];
    const sum = probs[0] + probs[1] + probs[2] || 1;
    const r = Math.random() * sum;
    let acc = 0, bandIdx = 1;
    for (let i = 0; i < 3; i++) {
      acc += probs[i];
      if (r < acc) { bandIdx = i; break; }
    }
    const band = bands[bandIdx];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = this.config.bpm / 60 * 45;
    const speed = baseSpeed * (0.5 + Math.random());
    const p: Particle = {
      x: cx + Math.cos(angle) * 8,
      y: cy + Math.sin(angle) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1,
      baseRadius: 2 + Math.random() * 6,
      life: 0,
      maxLife: 1.2 + Math.random() * 1.0,
      band,
      angle,
      angularVel: (Math.random() - 0.5) * 1.2,
      glowPhase: Math.random() * Math.PI * 2,
      glowSpeed: 20 + Math.random() * 50,
      ringIndex: 0
    };
    this.particles.push(p);
  }

  private updateParticles(dt: number, data: AudioData): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDist = Math.hypot(this.width, this.height) * 0.55;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.angle += p.angularVel * dt;
      const speedBoost = p.band === 'bass' ? 1 + data.bassAmplitude * 0.3 : p.band === 'mid' ? 1 + data.midAmplitude * 0.3 : 1 + data.trebleAmplitude * 0.3;
      const dirMag = Math.hypot(p.vx, p.vy) || 1;
      const dirX = p.vx / dirMag;
      const dirY = p.vy / dirMag;
      p.vx = dirX * dirMag * speedBoost;
      p.vy = dirY * dirMag * speedBoost;
      const tangX = -dirY;
      const tangY = dirX;
      const tangForce = Math.sin(p.life * 3 + p.glowPhase) * 15 * dt;
      p.x += (p.vx + tangX * tangForce) * dt;
      p.y += (p.vy + tangY * tangForce) * dt;
      const dist = Math.hypot(p.x - cx, p.y - cy);
      const lifeT = p.life / p.maxLife;
      const sizeT = Math.sin(lifeT * Math.PI);
      p.radius = 1 + p.baseRadius * sizeT;
      p.glowPhase += p.glowSpeed * dt;
      if (dist > maxDist || p.x < -50 || p.x > this.width + 50 || p.y < -50 || p.y > this.height + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawRings(data: AudioData): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const t = performance.now() / 1000;
    const amps = [
      { amp: data.bassAmplitude, color1: this.bassColors[0], color2: this.bassColors[1] },
      { amp: data.midAmplitude, color1: this.midColors[0], color2: this.midColors[1] },
      { amp: data.trebleAmplitude, color1: this.trebleColors[0], color2: this.trebleColors[1] }
    ];
    const maxR = Math.min(this.width, this.height) * 0.48;
    for (let idx = 0; idx < 3; idx++) {
      const a = amps[idx];
      if (a.amp < 0.03) continue;
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const progress = ((t * (0.6 + idx * 0.2)) + r / numRings) % 1;
        const radius = 20 + progress * maxR;
        const alpha = a.amp * 0.25 * (1 - progress);
        const col = this.lerpColor(a.color1, a.color2, progress);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.withAlpha(col, alpha);
        ctx.lineWidth = 1 + a.amp * 2;
        ctx.stroke();
      }
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const lifeT = p.life / p.maxLife;
      const alpha = 0.9 * (1 - lifeT * lifeT);
      if (alpha <= 0.01) continue;
      const colors = p.band === 'bass' ? this.bassColors : p.band === 'mid' ? this.midColors : this.trebleColors;
      const colorT = Math.max(0, Math.min(1, (1 - lifeT) * 0.5 + Math.sin(p.glowPhase) * 0.5));
      const baseColor = this.lerpColor(colors[0], colors[1], colorT);
      const glowIntensity = 0.5 + 0.5 * Math.sin(p.glowPhase);
      const glowRadius = p.radius * (1.5 + glowIntensity * 2.5);
      const glowAlpha = alpha * (0.25 + glowIntensity * 0.35);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      grad.addColorStop(0, this.withAlpha(baseColor, glowAlpha));
      grad.addColorStop(1, this.withAlpha(baseColor, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.withAlpha(baseColor, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (glowIntensity > 0.7 && p.radius > 2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBorderGlow(data: AudioData): void {
    const ctx = this.ctx;
    const opacity = 0.2 + data.bassAmplitude * 0.2;
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.1 * data.bassAmplitude;
    ctx.save();
    ctx.strokeStyle = `rgba(72, 219, 251, ${opacity})`;
    ctx.lineWidth = pulse;
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 12 + data.bassAmplitude * 20;
    const r = 8;
    const x = 0.5;
    const y = 0.5;
    const w = this.width - 1;
    const h = this.height - 1;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const [r1, g1, b1] = this.hexToRgb(c1);
    const [r2, g2, b2] = this.hexToRgb(c2);
    return this.rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  }

  private withAlpha(hex: string, alpha: number): string {
    const [r, g, b] = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }
}

export class FrequencyPreview {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取预览Canvas上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width || canvas.width;
    this.height = rect.height || canvas.height;
    this.resize();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public render(freqData: Uint8Array | null, dominantColor: string): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, this.width, this.height);
    if (!freqData) return;
    const bars = 256;
    const barWidth = this.width / bars;
    const step = Math.max(1, Math.floor(freqData.length / bars));
    for (let i = 0; i < bars; i++) {
      const value = freqData[i * step] / 255;
      const barHeight = Math.max(1, value * this.height * 0.95);
      const x = i * barWidth;
      const y = this.height - barHeight;
      const grad = ctx.createLinearGradient(0, y, 0, this.height);
      const alpha = 0.5 + value * 0.5;
      const [r, g, b] = this.hexToRgb(dominantColor);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, Math.max(0.4, barWidth - 0.4), barHeight);
    }
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
}
