import type { PhysicsState, Particle } from './physics';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: Star[];
  private time: number;
  private mouseX: number;
  private mouseY: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.stars = [];
    this.time = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        baseOpacity: 0.3 + Math.random() * 0.4,
        twinkleSpeed: 1 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initStars();
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  draw(state: PhysicsState, dt: number): void {
    this.time += dt;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawStars(ctx);
    this.drawRadialGlows(ctx, state);
    this.drawAuraCircles(ctx, state);
    this.drawSeesaw(ctx, state);
    this.drawPivot(ctx, state);
    this.drawBarriers(ctx, state);
    this.drawBalls(ctx, state);
    this.drawParticles(ctx, state);
    this.drawScore(ctx, state);
    this.drawScreenFlash(ctx, state);

    if (state.isGameOver) {
      this.drawGameOver(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#24243e');
    gradient.addColorStop(1, '#302b63');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinklePhase);
      const opacity = star.baseOpacity + twinkle * 0.2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.9, opacity))})`;
      ctx.fill();
    }
  }

  private drawRadialGlows(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const ep = state.endpoints;

    const leftGlow = ctx.createRadialGradient(ep.leftX, ep.leftY, 0, ep.leftX, ep.leftY, 200);
    leftGlow.addColorStop(0, 'rgba(255, 107, 107, 0.1)');
    leftGlow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(ep.leftX - 200, ep.leftY - 200, 400, 400);

    const rightGlow = ctx.createRadialGradient(ep.rightX, ep.rightY, 0, ep.rightX, ep.rightY, 200);
    rightGlow.addColorStop(0, 'rgba(72, 219, 251, 0.1)');
    rightGlow.addColorStop(1, 'rgba(72, 219, 251, 0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(ep.rightX - 200, ep.rightY - 200, 400, 400);
  }

  private drawAuraCircles(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const ep = state.endpoints;

    const leftY = ep.leftY - 70;
    ctx.beginPath();
    ctx.arc(ep.leftX, leftY, 60, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(state.nextBallColor, state.leftAuraOpacity);
    ctx.fill();

    const rightY = ep.rightY - 70;
    ctx.beginPath();
    ctx.arc(ep.rightX, rightY, 60, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(state.nextBallColor, state.rightAuraOpacity);
    ctx.fill();
  }

  private drawSeesaw(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const ep = state.endpoints;

    ctx.save();
    ctx.translate(state.pivotX, state.pivotY);
    ctx.rotate(state.seesawAngle);

    const gradient = ctx.createLinearGradient(-300, 0, 300, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#48dbfb');

    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 12;

    ctx.fillStyle = gradient;
    ctx.fillRect(-300, -3, 600, 6);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawPivot(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const px = state.pivotX;
    const py = state.pivotY;
    const size = 15;

    ctx.save();
    ctx.shadowColor = '#feca57';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(px, py - size);
    ctx.lineTo(px - size, py + size);
    ctx.lineTo(px + size, py + size);
    ctx.closePath();

    ctx.fillStyle = '#feca57';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawBarriers(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const ep = state.endpoints;
    const angle = state.seesawAngle;

    ctx.save();
    ctx.globalAlpha = 0.5;

    ctx.translate(ep.leftX, ep.leftY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, 25, Math.PI, 0, false);
    ctx.strokeStyle = '#feca57';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.resetTransform();

    ctx.translate(ep.rightX, ep.rightY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, 25, Math.PI, 0, false);
    ctx.strokeStyle = '#feca57';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  private drawBalls(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    for (const ball of state.balls) {
      ctx.save();
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, ball.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    for (const p of state.particles) {
      const progress = 1 - p.life / p.maxLife;
      const opacity = 1 - progress;
      const size = p.initialSize * (1 - progress * (5 / 6));

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(p.color, opacity);
      ctx.fill();
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    ctx.save();

    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 10;
    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#48dbfb';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${state.score}`, 20, 40);

    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#48dbfb';
    ctx.fillText(`最高分: ${state.highScore}`, 20, 70);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawScreenFlash(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    if (state.screenFlashTimer <= 0) return;

    const progress = state.screenFlashTimer / 0.5;
    const borderWidth = 4 + 16 * Math.sin(progress * Math.PI);

    ctx.save();
    ctx.strokeStyle = `rgba(254, 202, 87, ${0.6 * Math.sin(progress * Math.PI)})`;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 8;
    ctx.font = '72px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 40);

    ctx.shadowBlur = 0;

    const btnX = this.width / 2 - 80;
    const btnY = this.height / 2 + 10;
    const btnW = 160;
    const btnH = 50;

    const isHover =
      this.mouseX >= btnX &&
      this.mouseX <= btnX + btnW &&
      this.mouseY >= btnY &&
      this.mouseY <= btnY + btnH;

    const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    if (isHover) {
      gradient.addColorStop(0, '#5ced8e');
      gradient.addColorStop(1, '#4fe8cc');
      ctx.shadowColor = '#2ed573';
      ctx.shadowBlur = 12;
    } else {
      gradient.addColorStop(0, '#2ed573');
      gradient.addColorStop(1, '#2bcbba');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 25);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', this.width / 2, btnY + btnH / 2);

    ctx.restore();
  }

  isRestartButtonHit(mx: number, my: number): boolean {
    const btnX = this.width / 2 - 80;
    const btnY = this.height / 2 + 10;
    const btnW = 160;
    const btnH = 50;
    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
