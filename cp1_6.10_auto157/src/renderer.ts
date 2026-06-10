import {
  Ball,
  Magnet,
  Blade,
  Particle,
  Level,
  CELL_SIZE,
  GRID_SIZE,
  CANVAS_SIZE,
  MAGNET_SIZE,
  FORCE_RADIUS,
} from './physics';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
  }

  clear(): void {
    this.time++;
    this.ctx.fillStyle = '#2d2d44';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(106, 76, 147, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }
  }

  drawWalls(walls: number[][]): void {
    const ctx = this.ctx;
    const radius = 3;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (walls[y][x] !== 1) continue;
        const px = x * CELL_SIZE + 2;
        const py = y * CELL_SIZE + 2;
        const w = CELL_SIZE - 4;
        const h = CELL_SIZE - 4;

        ctx.beginPath();
        ctx.moveTo(px + radius, py);
        ctx.lineTo(px + w - radius, py);
        ctx.quadraticCurveTo(px + w, py, px + w, py + radius);
        ctx.lineTo(px + w, py + h - radius);
        ctx.quadraticCurveTo(px + w, py + h, px + w - radius, py + h);
        ctx.lineTo(px + radius, py + h);
        ctx.quadraticCurveTo(px, py + h, px, py + h - radius);
        ctx.lineTo(px, py + radius);
        ctx.quadraticCurveTo(px, py, px + radius, py);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(px, py, px + w, py + h);
        gradient.addColorStop(0, '#5a5a5a');
        gradient.addColorStop(1, '#4a4a4a');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
  }

  drawEndArea(endArea: Level['endArea']): void {
    const ctx = this.ctx;
    const alpha = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(this.time * 0.05));
    const left = endArea.x * CELL_SIZE;
    const top = endArea.y * CELL_SIZE;
    const w = endArea.w * CELL_SIZE;
    const h = endArea.h * CELL_SIZE;

    ctx.save();
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.fillRect(left, top, w, h);

    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha + 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(left + 2, top + 2, w - 4, h - 4);
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawBall(ball: Ball): void {
    const ctx = this.ctx;
    const { pos, radius } = ball;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 10;

    const gradient = ctx.createRadialGradient(
      pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.1,
      pos.x, pos.y, radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#e0e0e0');
    gradient.addColorStop(0.7, '#c0c0c0');
    gradient.addColorStop(1, '#808080');

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  drawForceField(magnet: Magnet): void {
    const ctx = this.ctx;
    const { pos, type } = magnet;
    const color = type === 'N' ? '#ff4444' : '#4444ff';

    ctx.save();
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, FORCE_RADIUS);
    gradient.addColorStop(0, hexToRgba(color, 0.25));
    gradient.addColorStop(0.5, hexToRgba(color, 0.1));
    gradient.addColorStop(1, hexToRgba(color, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, FORCE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMagnet(magnet: Magnet): void {
    const ctx = this.ctx;
    const { pos, type, isDragging } = magnet;
    const size = isDragging ? MAGNET_SIZE * 1.1 : MAGNET_SIZE;
    const alpha = isDragging ? 0.8 : 1;
    const radius = 8;
    const color = type === 'N' ? '#ff4444' : '#4444ff';
    const colorDark = type === 'N' ? '#cc2222' : '#2222cc';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pos.x, pos.y);

    ctx.shadowColor = hexToRgba(color, 0.6);
    ctx.shadowBlur = isDragging ? 20 : 12;

    const halfSize = size / 2;
    ctx.beginPath();
    ctx.moveTo(-halfSize + radius, -halfSize);
    ctx.lineTo(halfSize - radius, -halfSize);
    ctx.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize + radius);
    ctx.lineTo(halfSize, halfSize - radius);
    ctx.quadraticCurveTo(halfSize, halfSize, halfSize - radius, halfSize);
    ctx.lineTo(-halfSize + radius, halfSize);
    ctx.quadraticCurveTo(-halfSize, halfSize, -halfSize, halfSize - radius);
    ctx.lineTo(-halfSize, -halfSize + radius);
    ctx.quadraticCurveTo(-halfSize, -halfSize, -halfSize + radius, -halfSize);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, colorDark);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = `bold ${size * 0.55}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(type, 0, 1);

    ctx.restore();
  }

  drawBlade(blade: Blade): void {
    const ctx = this.ctx;

    for (let i = 0; i < blade.count; i++) {
      const bladeAngle = blade.angle + (i * Math.PI * 2) / blade.count;
      ctx.save();
      ctx.translate(blade.center.x, blade.center.y);
      ctx.rotate(bladeAngle);

      const gradient = ctx.createLinearGradient(-blade.length / 2, 0, blade.length / 2, 0);
      gradient.addColorStop(0, '#b0b0b0');
      gradient.addColorStop(0.5, '#d0d0d0');
      gradient.addColorStop(1, '#b0b0b0');

      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 4;
      roundRect(ctx, -blade.length / 2, -blade.width / 2, blade.length, blade.width, 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(blade.center.x, blade.center.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#6a4c93';
    ctx.shadowColor = 'rgba(106, 76, 147, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.scale(p.size / 10, p.size / 10);
      ctx.globalAlpha = alpha;
      drawHeartPath(ctx);

      const gradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, 10);
      gradient.addColorStop(0, '#fff7cc');
      gradient.addColorStop(0.5, '#ffd700');
      gradient.addColorStop(1, '#ffaa00');
      ctx.fillStyle = gradient;
      ctx.shadowColor = `rgba(255, 215, 0, ${alpha})`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
  }

  drawForceLines(ball: Ball, magnets: Magnet[]): void {
    const ctx = this.ctx;
    ctx.save();
    for (const magnet of magnets) {
      const color = magnet.type === 'N' ? '#ff4444' : '#4444ff';
      ctx.strokeStyle = hexToRgba(color, 0.4);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -this.time * 0.5;
      ctx.beginPath();
      ctx.moveTo(ball.pos.x, ball.pos.y);
      ctx.lineTo(magnet.pos.x, magnet.pos.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
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
}

function drawHeartPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(0, 0, -6, -2, -6, 2);
  ctx.bezierCurveTo(-6, 6, 0, 8, 0, 10);
  ctx.bezierCurveTo(0, 8, 6, 6, 6, 2);
  ctx.bezierCurveTo(6, -2, 0, 0, 0, 3);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
