import { Ball, Pocket } from './BallManager';
import { InputHandler } from './InputHandler';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
}

const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 500;
const BORDER_WIDTH = 30;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 30;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = TABLE_WIDTH;
    this.bgCanvas.height = TABLE_HEIGHT;
    this.bgCtx = this.bgCanvas.getContext('2d')!;
    this.renderStaticBackground();
  }

  private renderStaticBackground(): void {
    const ctx = this.bgCtx;

    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    const gradient = ctx.createLinearGradient(
      BORDER_WIDTH, BORDER_WIDTH,
      TABLE_WIDTH - BORDER_WIDTH, TABLE_HEIGHT - BORDER_WIDTH
    );
    gradient.addColorStop(0, '#3d7a5e');
    gradient.addColorStop(0.5, '#35654D');
    gradient.addColorStop(1, '#2d5741');
    ctx.fillStyle = gradient;
    ctx.fillRect(
      BORDER_WIDTH, BORDER_WIDTH,
      TABLE_WIDTH - BORDER_WIDTH * 2,
      TABLE_HEIGHT - BORDER_WIDTH * 2
    );

    const feltPattern = ctx.createRadialGradient(
      TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 50,
      TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH / 2
    );
    feltPattern.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
    feltPattern.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    ctx.fillStyle = feltPattern;
    ctx.fillRect(
      BORDER_WIDTH, BORDER_WIDTH,
      TABLE_WIDTH - BORDER_WIDTH * 2,
      TABLE_HEIGHT - BORDER_WIDTH * 2
    );

    const pockets: Pocket[] = [
      { x: BORDER_WIDTH, y: BORDER_WIDTH, radius: 18 },
      { x: TABLE_WIDTH / 2, y: BORDER_WIDTH, radius: 18 },
      { x: TABLE_WIDTH - BORDER_WIDTH, y: BORDER_WIDTH, radius: 18 },
      { x: BORDER_WIDTH, y: TABLE_HEIGHT - BORDER_WIDTH, radius: 18 },
      { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - BORDER_WIDTH, radius: 18 },
      { x: TABLE_WIDTH - BORDER_WIDTH, y: TABLE_HEIGHT - BORDER_WIDTH, radius: 18 }
    ];

    for (const pocket of pockets) {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
    }

    ctx.strokeStyle = '#3d2515';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      BORDER_WIDTH, BORDER_WIDTH,
      TABLE_WIDTH - BORDER_WIDTH * 2,
      TABLE_HEIGHT - BORDER_WIDTH * 2
    );
  }

  addParticles(x: number, y: number, color: string): void {
    const colors = [color, '#FFD700', '#FF3B30', '#0055A4', '#FFFFFF'];
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.5,
        maxLife: 0.5,
        radius: 2 + Math.random() * 2
      });
    }
  }

  updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(
    balls: Ball[],
    inputHandler: InputHandler,
    deltaTime: number
  ): void {
    this.ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    this.ctx.drawImage(this.bgCanvas, 0, 0);

    for (const ball of balls) {
      if (!ball.isPotted) {
        this.drawBall(ball);
      }
    }

    if (inputHandler.isAimingActive() && inputHandler.canShoot) {
      this.drawAimLine(inputHandler);
    }

    this.drawPowerBar(inputHandler);
    this.updateParticles(deltaTime);
    this.drawParticles();
  }

  private drawBall(ball: Ball): void {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const ballGradient = ctx.createRadialGradient(
      ball.x - 3, ball.y - 3, 1,
      ball.x, ball.y, ball.radius
    );
    ballGradient.addColorStop(0, this.lightenColor(ball.color, 40));
    ballGradient.addColorStop(1, ball.color);
    ctx.fillStyle = ballGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x - 3, ball.y - 3, 6, 0, Math.PI * 2);
    const highlightGradient = ctx.createRadialGradient(
      ball.x - 3, ball.y - 3, 0,
      ball.x - 3, ball.y - 3, 6
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    if (ball.number > 0 && ball.number <= 15) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.number.toString(), ball.x, ball.y + 1);
    }
  }

  private lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawAimLine(inputHandler: InputHandler): void {
    const ctx = this.ctx;
    const cueX = inputHandler.getCueBallX();
    const cueY = inputHandler.getCueBallY();
    const angle = inputHandler.getAimAngle();
    const lineLength = inputHandler.AIM_LINE_LENGTH;

    const endX = cueX + Math.cos(angle) * lineLength;
    const endY = cueY + Math.sin(angle) * lineLength;

    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.moveTo(cueX, cueY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    if (inputHandler.isChargingActive()) {
      const powerRatio = inputHandler.getDisplayPower() / inputHandler.MAX_POWER;
      const cueLength = 30 + powerRatio * 50;
      const cueStartX = cueX - Math.cos(angle) * (cueLength + 20);
      const cueStartY = cueY - Math.sin(angle) * (cueLength + 20);
      const cueEndX = cueX - Math.cos(angle) * 15;
      const cueEndY = cueY - Math.sin(angle) * 15;

      ctx.beginPath();
      ctx.moveTo(cueStartX, cueStartY);
      ctx.lineTo(cueEndX, cueEndY);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawPowerBar(inputHandler: InputHandler): void {
    const ctx = this.ctx;
    const barX = 20;
    const barY = TABLE_HEIGHT - 40;
    const barWidth = 200;
    const barHeight = 20;
    const radius = 4;

    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.fillStyle = '#333333';
    ctx.fill();

    const power = inputHandler.getDisplayPower();
    const powerRatio = Math.max(0, (power - inputHandler.MIN_POWER) / (inputHandler.MAX_POWER - inputHandler.MIN_POWER));
    const fillWidth = barWidth * powerRatio;

    if (fillWidth > 0) {
      const powerGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      powerGradient.addColorStop(0, '#00FF00');
      powerGradient.addColorStop(0.5, '#FFFF00');
      powerGradient.addColorStop(1, '#FF0000');

      ctx.beginPath();
      this.roundRect(ctx, barX, barY, fillWidth, barHeight, radius);
      ctx.fillStyle = powerGradient;
      ctx.fill();
    }

    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  private drawParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
