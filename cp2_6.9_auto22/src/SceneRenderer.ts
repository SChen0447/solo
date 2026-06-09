import type { AudioData } from './AudioAnalyzer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };
  active: boolean;
}

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number;

  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles: number = 100;
  private particleSpawnTimer: number = 0;

  private smoothedLow: number = 0;
  private smoothedMid: number = 0;
  private smoothedHigh: number = 0;
  private smoothedBPM: number = 120;

  private bgOffset: number = 0;
  private platformPulsePhase: number = 0;

  private baseBgColor = { r: 10, g: 15, b: 50 };
  private targetBgColor = { r: 10, g: 15, b: 50 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height * 0.78;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    this.groundY = this.height * 0.78;
  }

  getGroundY(): number {
    return this.groundY;
  }

  reset(): void {
    this.particles = [];
    this.particleSpawnTimer = 0;
    this.smoothedLow = 0;
    this.smoothedMid = 0;
    this.smoothedHigh = 0;
    this.bgOffset = 0;
    this.platformPulsePhase = 0;
  }

  update(deltaTime: number, audioData: AudioData): void {
    const smoothing = 0.12;
    this.smoothedLow += (audioData.lowEnergy - this.smoothedLow) * smoothing;
    this.smoothedMid += (audioData.midEnergy - this.smoothedMid) * smoothing;
    this.smoothedHigh += (audioData.highEnergy - this.smoothedHigh) * smoothing;
    this.smoothedBPM += (audioData.bpm - this.smoothedBPM) * 0.05;

    this.targetBgColor = {
      r: Math.floor(5 + this.smoothedLow * 15 + this.smoothedHigh * 40),
      g: Math.floor(10 + this.smoothedLow * 20 + this.smoothedMid * 80),
      b: Math.floor(40 + this.smoothedLow * 180 + this.smoothedHigh * 20)
    };

    this.baseBgColor.r += (this.targetBgColor.r - this.baseBgColor.r) * 0.04;
    this.baseBgColor.g += (this.targetBgColor.g - this.baseBgColor.g) * 0.04;
    this.baseBgColor.b += (this.targetBgColor.b - this.baseBgColor.b) * 0.04;

    this.platformPulsePhase += deltaTime * (2 + this.smoothedMid * 6);

    const speedFactor = this.smoothedBPM / 120;
    this.bgOffset += deltaTime * (20 + speedFactor * 60);
    if (this.bgOffset > 100) this.bgOffset -= 100;

    const baseParticlesPerSecond = 5 + this.smoothedHigh * 25;
    const particlesPerFrame = baseParticlesPerSecond * deltaTime;
    this.particleSpawnTimer += particlesPerFrame;

    while (this.particleSpawnTimer >= 1 && this.particles.length < this.maxParticles) {
      this.particleSpawnTimer -= 1;
      this.spawnParticle();
    }
    if (this.particleSpawnTimer > 1) this.particleSpawnTimer = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 40 * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0 || p.y > this.groundY + 20) {
        p.active = false;
        this.particlePool.push(p);
        this.particles.splice(i, 1);
      }
    }

    while (this.particles.length > this.maxParticles) {
      const removed = this.particles.shift()!;
      removed.active = false;
      this.particlePool.push(removed);
    }
  }

  private spawnParticle(): void {
    const p = this.particlePool.length > 0 ? this.particlePool.pop()! : this.createParticle();
    const bpmFactor = this.smoothedBPM / 120;

    p.x = this.width + 10;
    p.y = this.groundY - Math.random() * this.height * 0.7;
    p.vx = -(100 + Math.random() * 200 + bpmFactor * 100);
    p.vy = -30 + Math.random() * 80;
    p.life = 1 + Math.random() * 2;
    p.maxLife = p.life;
    p.size = 2 + Math.random() * 5 + this.smoothedHigh * 5;
    p.active = true;

    const highRatio = this.smoothedHigh;
    const midRatio = this.smoothedMid;
    p.color = {
      r: Math.floor(100 + highRatio * 155),
      g: Math.floor(100 + midRatio * 155),
      b: Math.floor(200 + (1 - highRatio) * 55)
    };

    this.particles.push(p);
  }

  private createParticle(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 2,
      color: { r: 255, g: 255, b: 255 },
      active: false
    };
  }

  drawBackground(): void {
    const ctx = this.ctx;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    const r = Math.floor(this.baseBgColor.r);
    const g = Math.floor(this.baseBgColor.g);
    const b = Math.floor(this.baseBgColor.b);
    bgGradient.addColorStop(0, `rgb(${Math.floor(r * 1.3)}, ${Math.floor(g * 1.2)}, ${Math.floor(b * 1.1)})`);
    bgGradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    bgGradient.addColorStop(1, `rgb(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.8)})`);

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const radialGradient = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.4, 0,
      this.width * 0.5, this.height * 0.4, this.width * 0.6
    );
    const lowGlow = this.smoothedLow;
    radialGradient.addColorStop(0, `rgba(${10 + lowGlow * 30}, ${30 + lowGlow * 80}, ${60 + lowGlow * 180}, ${0.3 + lowGlow * 0.4})`);
    radialGradient.addColorStop(0.5, `rgba(${5 + lowGlow * 15}, ${15 + lowGlow * 40}, ${80 + lowGlow * 100}, ${0.15 + lowGlow * 0.2})`);
    radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawStars();
    this.drawGridLines();
  }

  private drawStars(): void {
    const ctx = this.ctx;
    const starCount = 80;
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const seed = i * 7919;
      const x = ((seed % 10000) / 10000) * this.width;
      const y = ((seed * 3 % 7000) / 7000) * this.groundY * 0.8;
      const size = ((seed % 7) / 7) * 1.5 + 0.5;
      const twinkle = (Math.sin(this.platformPulsePhase * 0.3 + i) + 1) * 0.5;
      ctx.globalAlpha = 0.3 + twinkle * 0.5 + this.smoothedHigh * 0.2;
      ctx.fillStyle = `rgba(200, 220, 255, 1)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGridLines(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 210, 255, ${0.05 + this.smoothedMid * 0.05})`;
    ctx.lineWidth = 1;

    const perspectiveY = this.groundY - 20;
    const horizonY = this.height * 0.45;
    const lineCount = 12;

    for (let i = 0; i <= lineCount; i++) {
      const t = i / lineCount;
      const y = horizonY + (perspectiveY - horizonY) * t;
      ctx.globalAlpha = 0.05 + t * 0.1 + this.smoothedLow * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    const verticalLines = 10;
    for (let i = 0; i <= verticalLines; i++) {
      const t = (i + (this.bgOffset / 100)) % (verticalLines + 1);
      const normalizedT = t / verticalLines;
      const bottomX = normalizedT * this.width;
      const topX = this.width * 0.5 + (bottomX - this.width * 0.5) * 0.15;

      ctx.globalAlpha = 0.03 + this.smoothedLow * 0.08;
      ctx.beginPath();
      ctx.moveTo(topX, horizonY);
      ctx.lineTo(bottomX, perspectiveY + 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPlatform(): void {
    const ctx = this.ctx;
    const pulseRadius = 10 + this.smoothedMid * 30;
    const platformTop = this.groundY;
    const platformHeight = this.height - platformTop + 20;

    const glowGradient = ctx.createLinearGradient(0, platformTop - pulseRadius * 2, 0, platformTop + pulseRadius * 2);
    glowGradient.addColorStop(0, `rgba(0, 210, 255, 0)`);
    glowGradient.addColorStop(0.4, `rgba(0, 210, 255, ${0.15 + this.smoothedMid * 0.25})`);
    glowGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.3 + this.smoothedMid * 0.4})`);
    glowGradient.addColorStop(0.6, `rgba(0, 210, 255, ${0.15 + this.smoothedMid * 0.25})`);
    glowGradient.addColorStop(1, `rgba(0, 210, 255, 0)`);

    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, platformTop - pulseRadius * 2, this.width, pulseRadius * 4);

    const platformGradient = ctx.createLinearGradient(0, platformTop, 0, this.height);
    platformGradient.addColorStop(0, `rgba(60, 70, 100, 0.85)`);
    platformGradient.addColorStop(0.3, `rgba(35, 40, 70, 0.9)`);
    platformGradient.addColorStop(1, `rgba(15, 15, 35, 0.95)`);

    ctx.fillStyle = platformGradient;
    ctx.fillRect(0, platformTop, this.width, platformHeight);

    ctx.beginPath();
    ctx.moveTo(0, platformTop);
    ctx.lineTo(this.width, platformTop);
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.6 + this.smoothedMid * 0.4})`;
    ctx.lineWidth = 2 + this.smoothedMid * 2;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = `rgba(0, 210, 255, ${0.15 + this.smoothedMid * 0.2})`;
    ctx.lineWidth = 1;
    const stripeSpacing = 50;
    const offset = this.bgOffset % stripeSpacing;

    for (let x = -offset; x < this.width; x += stripeSpacing) {
      ctx.globalAlpha = 0.2 + this.smoothedLow * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, platformTop + 5);
      ctx.lineTo(x - 20, this.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      const size = p.size * (0.5 + alpha * 0.5);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawVignette(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, this.width * 0.2,
      this.width * 0.5, this.height * 0.5, this.width * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  render(audioData: AudioData, deltaTime: number): void {
    this.update(deltaTime, audioData);
    this.drawBackground();
    this.drawParticles();
    this.drawPlatform();
    this.drawVignette();
  }
}
