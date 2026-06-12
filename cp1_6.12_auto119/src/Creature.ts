import type { AudioData, Particle } from './types';

export class Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowIntensity: number;
  baseY: number;
  isJumping: boolean;
  jumpVelocity: number;
  particles: Particle[];
  private lastVolume: number;
  private lastFrequency: number;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.radius = 18;
    this.x = canvasWidth / 2;
    this.baseY = canvasHeight * 0.7;
    this.y = this.baseY;
    this.vx = 0;
    this.vy = 0;
    this.color = '#FFD700';
    this.glowIntensity = 0.5;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.particles = [];
    this.lastVolume = 0;
    this.lastFrequency = 0;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const ratioX = canvasWidth / this.canvasWidth;
    const ratioY = canvasHeight / this.canvasHeight;
    this.x *= ratioX;
    this.baseY = canvasHeight * 0.7;
    this.y = this.baseY;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.radius = 18 * Math.min(ratioX, ratioY);
  }

  update(audioData: AudioData, deltaTime: number): void {
    const { volume, frequency } = audioData;

    this.lastVolume = volume;
    this.lastFrequency = frequency;

    this.updateColor(frequency);

    this.glowIntensity = 0.3 + volume * 0.7;

    const normalizedFreq = frequency > 0 ? (frequency - 20) / (2000 - 20) : 0.5;
    const targetVx = (normalizedFreq - 0.5) * 2 * 300;
    this.vx += (targetVx - this.vx) * 0.1;

    this.x += this.vx * deltaTime;

    const margin = this.radius + 20;
    if (this.x < margin) {
      this.x = margin;
      this.vx = 0;
    }
    if (this.x > this.canvasWidth - margin) {
      this.x = this.canvasWidth - margin;
      this.vx = 0;
    }

    const jumpThreshold = 0.1;
    if (volume > jumpThreshold && !this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = -volume * 600 - 100;
    }

    if (this.isJumping) {
      this.jumpVelocity += 1500 * deltaTime;
      this.y += this.jumpVelocity * deltaTime;

      if (this.y >= this.baseY) {
        this.y = this.baseY;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    } else {
      this.y = this.baseY + Math.sin(Date.now() * 0.003) * 2;
    }

    this.updateParticles(deltaTime);
    this.emitParticles(volume);
  }

  private updateColor(frequency: number): void {
    if (frequency === 0) {
      this.color = '#FFD700';
      return;
    }
    const t = (frequency - 20) / (2000 - 20);
    const clampedT = Math.max(0, Math.min(1, t));

    const r1 = 0xFF, g1 = 0xD7, b1 = 0x00;
    const r2 = 0x00, g2 = 0xFF, b2 = 0x88;

    const r = Math.round(r1 + (r2 - r1) * clampedT);
    const g = Math.round(g1 + (g2 - g1) * clampedT);
    const b = Math.round(b1 + (b2 - b1) * clampedT);

    this.color = `rgb(${r}, ${g}, ${b})`;
  }

  private emitParticles(volume: number): void {
    const count = Math.floor(1 + volume * 4);

    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 20 + Math.random() * 30;
      const size = 3 + Math.random() * 2;

      this.particles.push({
        x: this.x - this.vx * 0.02 + (Math.random() - 0.5) * this.radius * 0.5,
        y: this.y + (Math.random() - 0.5) * this.radius * 0.3,
        vx: Math.cos(angle) * speed - this.vx * 0.3,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size,
        color: this.color,
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 50 * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    const glowSize = this.radius * (1.5 + this.glowIntensity * 1.5);
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowSize
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.3, this.color + 'AA');
    gradient.addColorStop(0.6, this.color + '40');
    gradient.addColorStop(1, this.color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 * this.glowIntensity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 0;
    const eyeOffset = this.radius * 0.35;
    const eyeSize = this.radius * 0.25;
    ctx.beginPath();
    ctx.arc(this.x - eyeOffset, this.y - eyeSize, eyeSize, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffset, this.y - eyeSize, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0B0C10';
    const pupilSize = eyeSize * 0.5;
    const pupilOffset = eyeSize * 0.3 * (this.vx > 0 ? 1 : -1);
    ctx.beginPath();
    ctx.arc(this.x - eyeOffset + pupilOffset, this.y - eyeSize, pupilSize, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffset + pupilOffset, this.y - eyeSize, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getBoundingBox(): { x: number; y: number; width: number; height: number } {
    const padding = 60;
    const maxDim = Math.max(this.radius * 4, 80) + padding;
    return {
      x: this.x - maxDim,
      y: this.y - maxDim,
      width: maxDim * 2,
      height: maxDim * 2,
    };
  }
}
