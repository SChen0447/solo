import { Star, Meteor, Paddle, Particle, GameState } from './entity';

const BG_COLORS = [
  { top: '#0f0c29', bottom: '#24243e' },
  { top: '#1a0b2e', bottom: '#2d1b3a' },
  { top: '#2d1b3a', bottom: '#3d2a5a' },
  { top: '#3d2a5a', bottom: '#4a3070' }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(state: GameState): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    let currentLevel = state.backgroundLevel;
    let targetLevel = state.backgroundTargetLevel;
    let transition = state.backgroundTransition;

    let fromColors = BG_COLORS[currentLevel];
    let toColors = BG_COLORS[targetLevel];

    if (transition > 0 && transition < 1) {
      const topColor = lerpColor(fromColors.top, toColors.top, transition);
      const bottomColor = lerpColor(fromColors.bottom, toColors.bottom, transition);

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(1, bottomColor);
      ctx.fillStyle = gradient;
    } else {
      const colors = BG_COLORS[targetLevel];
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, colors.top);
      gradient.addColorStop(1, colors.bottom);
      ctx.fillStyle = gradient;
    }

    ctx.fillRect(0, 0, w, h);
  }

  drawStars(stars: Star[]): void {
    const ctx = this.ctx;
    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fill();
    }
  }

  drawMeteor(meteor: Meteor): void {
    const ctx = this.ctx;
    const x = meteor.x;
    const y = meteor.y;
    const w = meteor.width;
    const h = meteor.height;
    const radius = meteor.isGolden ? 10 : 6;

    ctx.save();
    ctx.shadowColor = meteor.borderColor;
    ctx.shadowBlur = meteor.isGolden ? 25 : 15;

    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, meteor.gradientColors[0]);
    gradient.addColorStop(0.5, meteor.gradientColors[1]);
    gradient.addColorStop(1, meteor.gradientColors[2]);

    this.roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = meteor.isGolden ? 3 : 2;
    ctx.strokeStyle = meteor.borderColor;
    ctx.stroke();

    ctx.restore();
  }

  drawMeteors(meteors: Meteor[]): void {
    for (const meteor of meteors) {
      if (meteor.alive) {
        this.drawMeteor(meteor);
      }
    }
  }

  drawPaddle(paddle: Paddle): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const atLeftEdge = paddle.isAtLeftEdge(w);
    const atRightEdge = paddle.isAtRightEdge(w);

    for (let i = paddle.trail.length - 1; i >= 0; i--) {
      const t = paddle.trail[i];
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.roundRect(ctx, t.x - paddle.width / 2, paddle.y, paddle.width, paddle.height, 8);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    let borderAlpha = 0.3;
    let glowIntensity = 10;
    if (atLeftEdge || atRightEdge) {
      borderAlpha = 0.8;
      glowIntensity = 25;
    }

    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = glowIntensity;

    ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
    this.roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 8);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${borderAlpha})`;
    ctx.stroke();

    const highlightGradient = ctx.createLinearGradient(
      paddle.x, paddle.y,
      paddle.x, paddle.y + paddle.height
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = highlightGradient;
    this.roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 8);
    ctx.fill();

    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const particle of particles) {
      if (!particle.alive) continue;
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawUI(state: GameState): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${state.score}`, 30, 50);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('积分', 30, 75);
    ctx.restore();

    if (state.combo >= 3) {
      ctx.save();
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.shadowColor = '#feca57';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#feca57';
      ctx.fillText(`${state.combo} COMBO`, this.canvas.width - 30, 55);

      const barWidth = 150;
      const barHeight = 4;
      const barX = this.canvas.width - 30 - barWidth;
      const barY = 70;
      const progress = state.comboTimer / state.comboDuration;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = '#feca57';
      ctx.shadowColor = '#feca57';
      ctx.shadowBlur = 8;
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      ctx.restore();
    }
  }

  drawFlash(state: GameState): void {
    if (state.flashAlpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.flashAlpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  render(
    stars: Star[],
    meteors: Meteor[],
    paddle: Paddle,
    particles: Particle[],
    state: GameState
  ): void {
    this.clear();
    this.drawBackground(state);
    this.drawStars(stars);
    this.drawMeteors(meteors);
    this.drawPaddle(paddle);
    this.drawParticles(particles);
    this.drawUI(state);
    this.drawFlash(state);
  }
}
