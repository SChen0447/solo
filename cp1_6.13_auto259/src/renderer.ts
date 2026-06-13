import type { Meteor, Paddle, Particle, Star } from './entity';

export interface GameUIState {
  score: number;
  combo: number;
  comboActive: boolean;
  backgroundTint: string;
  backgroundTransitionProgress: number;
  edgeFlash: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const parseHex = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const c1 = parseHex(color1);
    const c2 = parseHex(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  drawBackground(stars: Star[], tint: string, transitionProgress: number): void {
    const ctx = this.ctx;
    const baseTop = '#0f0c29';
    const baseBottom = '#24243e';

    const topColor = this.lerpColor(baseTop, tint, transitionProgress);
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, baseBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawStars(stars);
  }

  drawStars(stars: Star[]): void {
    const ctx = this.ctx;
    this.time += 1 / 60;

    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin((this.time / star.twinklePeriod) * Math.PI * 2 + star.twinkleOffset);
      const opacity = star.baseOpacity * (0.6 + 0.4 * twinkle);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
  }

  drawPaddle(paddle: Paddle): void {
    const ctx = this.ctx;

    for (let i = paddle.trail.length - 1; i >= 0; i--) {
      const t = paddle.trail[i];
      const trailWidth = paddle.width * (1 - i * 0.05);
      const trailHeight = paddle.height * (1 - i * 0.06);
      ctx.beginPath();
      ctx.roundRect(t.x - trailWidth / 2, paddle.y, trailWidth, trailHeight, 8);
      ctx.fillStyle = `rgba(255, 255, 255, ${t.opacity * 0.15})`;
      ctx.fill();
    }

    const nearLeft = paddle.isNearLeftEdge(this.width);
    const nearRight = paddle.isNearRightEdge(this.width);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 8);

    const bgGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
    ctx.fillStyle = bgGradient;
    ctx.fill();

    let borderColor = 'rgba(255, 255, 255, 0.3)';
    let glowIntensity = 8;
    if (nearLeft || nearRight) {
      borderColor = 'rgba(255, 255, 255, 0.9)';
      glowIntensity = 20;
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = glowIntensity;
    ctx.stroke();

    ctx.restore();
  }

  drawMeteor(meteor: Meteor): void {
    const ctx = this.ctx;
    const cx = meteor.x + meteor.width / 2;
    const cy = meteor.y + meteor.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(meteor.rotation);

    ctx.beginPath();
    ctx.roundRect(-meteor.width / 2, -meteor.height / 2, meteor.width, meteor.height, 6);

    const gradient = ctx.createLinearGradient(-meteor.width / 2, -meteor.height / 2, meteor.width / 2, meteor.height / 2);
    gradient.addColorStop(0, meteor.gradientColors[0]);
    gradient.addColorStop(1, meteor.gradientColors[1]);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowColor = meteor.borderColor;
    ctx.shadowBlur = meteor.isGold ? 25 : 15;
    ctx.strokeStyle = meteor.borderColor;
    ctx.lineWidth = meteor.isGold ? 3 : 2;
    ctx.stroke();

    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawUI(uiState: GameUIState): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(`积分: ${uiState.score}`, 24, 48);

    if (uiState.comboActive && uiState.combo >= 3) {
      ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#feca57';
      ctx.shadowColor = 'rgba(254, 202, 87, 0.8)';
      ctx.shadowBlur = 16;
      ctx.fillText(`COMBO x${uiState.combo}`, this.width - 24, 56);
    }

    ctx.restore();
  }

  drawEdgeFlash(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  render(
    stars: Star[],
    meteors: Meteor[],
    particles: Particle[],
    paddle: Paddle,
    uiState: GameUIState
  ): void {
    this.drawBackground(stars, uiState.backgroundTint, uiState.backgroundTransitionProgress);

    for (const meteor of meteors) {
      this.drawMeteor(meteor);
    }

    this.drawParticles(particles);
    this.drawPaddle(paddle);
    this.drawUI(uiState);

    if (uiState.edgeFlash) {
      this.drawEdgeFlash();
    }
  }
}
