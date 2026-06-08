import { Player } from './player';
import { Ball } from './ball';
import { Wall } from './collision';

export interface ShardParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private wall: Wall;

  constructor(canvas: HTMLCanvasElement, wall: Wall) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.wall = wall;
  }

  setWall(wall: Wall): void {
    this.wall = wall;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) / 2
    );
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.5, '#2d1b4e');
    gradient.addColorStop(1, '#0f0a1e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    const gridSize = 30;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    for (let x = this.wall.left; x <= this.wall.right; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.wall.top);
      this.ctx.lineTo(x, this.wall.bottom);
      this.ctx.stroke();
    }

    for (let y = this.wall.top; y <= this.wall.bottom; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.wall.left, y);
      this.ctx.lineTo(this.wall.right, y);
      this.ctx.stroke();
    }
  }

  drawBorder(): void {
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = 20;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      this.wall.left,
      this.wall.top,
      this.wall.right - this.wall.left,
      this.wall.bottom - this.wall.top
    );
    this.ctx.restore();
  }

  drawPlayer(player: Player): void {
    this.ctx.save();

    let fillColor = player.color;
    if (player.isHit && player.showWhite) {
      fillColor = '#ffffff';
    }

    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(player.x, player.y, player.width, player.height);

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(player.x, player.y, player.width, player.height);

    const eyeOffsetX = player.facingX * 4;
    const eyeY = player.y + player.height * 0.35;
    const eyeSize = 4;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(
      player.x + player.width * 0.3 + eyeOffsetX,
      eyeY,
      eyeSize,
      eyeSize
    );
    this.ctx.fillRect(
      player.x + player.width * 0.6 + eyeOffsetX,
      eyeY,
      eyeSize,
      eyeSize
    );

    this.ctx.restore();
  }

  drawBall(ball: Ball): void {
    if (!ball.active) return;

    const trail = ball.getTrailParticles();
    const color = ball.getColor();

    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const sizeRatio = p.life;
      const radius = ball.radius * sizeRatio * 0.8;

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.3,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.restore();
  }

  drawShards(shards: ShardParticle[]): void {
    for (const shard of shards) {
      this.ctx.save();
      this.ctx.translate(shard.x, shard.y);
      this.ctx.rotate(shard.rotation);
      this.ctx.globalAlpha = shard.alpha;
      this.ctx.fillStyle = '#ff4444';
      this.ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
      this.ctx.restore();
    }
  }

  render(
    players: Player[],
    balls: Ball[],
    shards: ShardParticle[]
  ): void {
    this.clear();
    this.drawBackground();
    this.drawGrid();
    this.drawBorder();

    for (const ball of balls) {
      this.drawBall(ball);
    }

    for (const player of players) {
      this.drawPlayer(player);
    }

    this.drawShards(shards);
  }
}
