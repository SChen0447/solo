import { GameEngine, Stone, StoneColor, Particle, Spirit, Shockwave, RunePoint } from './gameEngine';

const COLOR_MAP: Record<StoneColor, string> = {
  red: '#ff4d6d',
  blue: '#4dabff',
  green: '#5dff9e',
  purple: '#c77dff',
  gold: '#ffd700',
};

const COLOR_GLOW: Record<StoneColor, string> = {
  red: 'rgba(255, 77, 109, 0.6)',
  blue: 'rgba(77, 171, 255, 0.6)',
  green: 'rgba(93, 255, 158, 0.6)',
  purple: 'rgba(199, 125, 255, 0.6)',
  gold: 'rgba(255, 215, 0, 0.8)',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.engine = engine;
  }

  resize(width: number, height: number, dpr: number = 1): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const uiTop = height * 0.12;
    const gridMargin = Math.min(width, height) * 0.05;
    const gridSize = Math.min(width - gridMargin * 2, height - uiTop - gridMargin * 2);
    const gridX = (width - gridSize) / 2;
    const gridY = uiTop + (height - uiTop - gridSize) / 2;

    this.engine.setGridArea(gridX, gridY, gridSize, gridSize);
  }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawElementSlots();
    this.drawGrid();
    this.drawStones();
    this.drawShockwaves();
    this.drawParticles();
    this.drawRune();
    this.drawSpirits();
    this.drawUI();
    this.drawGameOver();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, '#2d1b47');
    gradient.addColorStop(0.5, '#1a0a2e');
    gradient.addColorStop(1, '#0d051a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 80; i++) {
      const x = (i * 137.5) % w;
      const y = (i * 91.3) % h;
      const r = 1 + (i % 5) * 0.5;
      ctx.fillStyle = '#8b7355';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const engine = this.engine;
    const pulseTime = engine.getPulseTime();
    const pulse = 0.5 + 0.5 * Math.sin(pulseTime * Math.PI);

    const gridSize = Math.min(engine.gridWidth, engine.gridHeight);
    const cellSize = gridSize / 6;
    const startX = engine.gridX + (engine.gridWidth - cellSize * 6) / 2;
    const startY = engine.gridY + (engine.gridHeight - cellSize * 6) / 2;

    ctx.save();
    const bgGrad = ctx.createLinearGradient(startX, startY, startX + cellSize * 6, startY + cellSize * 6);
    bgGrad.addColorStop(0, '#f5e6d3');
    bgGrad.addColorStop(0.5, '#efe0cc');
    bgGrad.addColorStop(1, '#f0dcc6');
    ctx.fillStyle = bgGrad;

    this.roundRect(ctx, startX - 8, startY - 8, cellSize * 6 + 16, cellSize * 6 + 16, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(34, 85, 51, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = startX + i * cellSize;
      const y = startY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + cellSize * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + cellSize * 6, y);
      ctx.stroke();
    }

    const borderGlow = 10 + pulse * 8;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = borderGlow;
    ctx.strokeStyle = `rgba(218, 165, 32, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    this.roundRect(ctx, startX - 8, startY - 8, cellSize * 6 + 16, cellSize * 6 + 16, 8);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, startX - 5, startY - 5, cellSize * 6 + 10, cellSize * 6 + 10, 5);
    ctx.stroke();

    ctx.restore();
  }

  private drawStones(): void {
    const ctx = this.ctx;
    const engine = this.engine;
    const pulseTime = engine.getPulseTime();

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const stone = engine.state.grid[r][c];
        if (stone) {
          this.drawStone(stone, pulseTime);
        }
      }
    }
  }

  private drawStone(stone: Stone, pulseTime: number): void {
    const ctx = this.ctx;
    const pos = this.engine.getStonePosition(stone);
    const size = this.engine.cellSize * 0.75;

    const pulse = 0.5 + 0.5 * Math.sin(pulseTime * Math.PI + stone.id * 0.5);
    const glowSize = size * (0.5 + pulse * 0.3);

    const color = COLOR_MAP[stone.color];
    const glowColor = COLOR_GLOW[stone.color];

    let highlightAlpha = 0;
    if (stone.highlightTime > 0) {
      highlightAlpha = stone.highlightTime / 0.3;
    }

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize * 0.8 * (1 + highlightAlpha);

    const grad = ctx.createRadialGradient(
      pos.x - size * 0.2,
      pos.y - size * 0.2,
      0,
      pos.x,
      pos.y,
      size * 0.6
    );
    grad.addColorStop(0, this.lightenColor(color, 0.4));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darkenColor(color, 0.3));

    ctx.fillStyle = grad;
    this.roundRect(ctx, pos.x - size / 2, pos.y - size / 2, size, size, size * 0.2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, pos.x - size / 2 + 2, pos.y - size / 2 + 2, size - 4, size - 4, size * 0.18);
    ctx.stroke();

    ctx.globalAlpha = 0.5 + pulse * 0.3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(
      pos.x - size * 0.15,
      pos.y - size * 0.2,
      size * 0.18,
      size * 0.08,
      -0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (highlightAlpha > 0) {
      ctx.globalAlpha = highlightAlpha * 0.5;
      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, pos.x - size / 2, pos.y - size / 2, size, size, size * 0.2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawRune(): void {
    if (!this.engine.isDrawingActive()) return;

    const ctx = this.ctx;
    const points = this.engine.getRunePoints();
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const speedFactor = Math.min(1, curr.speed / 500);
      const r = Math.floor(255 - speedFactor * 100);
      const g = Math.floor(255 - speedFactor * 150);
      const b = Math.floor(200 + speedFactor * 55);

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
      ctx.lineWidth = 6 + speedFactor * 4;
      ctx.shadowColor = `rgba(100, 150, 255, ${0.5 + speedFactor * 0.3})`;
      ctx.shadowBlur = 10 + speedFactor * 10;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawShockwaves(): void {
    const ctx = this.ctx;
    const shockwaves = this.engine.state.shockwaves;

    for (const sw of shockwaves) {
      const alpha = Math.max(0, 1 - sw.progress);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 8 * (1 - sw.progress * 0.5);
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (sw.progress < 0.5) {
        ctx.strokeStyle = `rgba(255, 255, 200, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    const particles = this.engine.state.particles;

    for (const p of particles) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.8 ? 1 : (1 - t) / 0.2;
      const size = 4 + (1 - t) * 4;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLOR_MAP[p.color];
      ctx.shadowColor = COLOR_GLOW[p.color];
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawSpirits(): void {
    const ctx = this.ctx;
    const spirits = this.engine.state.spirits;

    for (const s of spirits) {
      const t = s.life / s.maxLife;
      let alpha = 1;
      if (t < 0.2) alpha = t / 0.2;
      if (t > 0.8) alpha = (1 - t) / 0.2;

      const floatY = Math.sin(s.floatPhase) * 8;
      const x = s.x;
      const y = s.y + floatY;
      const size = 24;

      const color = COLOR_MAP[s.color];

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(s.rotation) * 0.2);

      ctx.fillStyle = color;
      ctx.shadowColor = COLOR_GLOW[s.color];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 5;
      const wingFlap = Math.sin(s.floatPhase * 2) * 0.4;

      ctx.save();
      ctx.translate(-size * 0.6, -size * 0.3);
      ctx.rotate(-0.5 + wingFlap);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(size * 0.6, -size * 0.3);
      ctx.rotate(0.5 - wingFlap);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.1, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.25, -size * 0.1, size * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a0a2e';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.05, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.25, -size * 0.05, size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1a0a2e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, size * 0.1, size * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawElementSlots(): void {
    const ctx = this.ctx;
    const engine = this.engine;
    const colors: StoneColor[] = ['red', 'blue', 'green', 'purple', 'gold'];

    const slotY = engine.gridY - engine.cellSize * 0.5;
    const slotSpacing = engine.gridWidth / 5;
    const slotStartX = engine.gridX + slotSpacing / 2;
    const slotSize = engine.cellSize * 0.6;

    for (let i = 0; i < 5; i++) {
      const color = colors[i];
      const x = slotStartX + i * slotSpacing;
      const count = engine.state.elementSlots[color];

      ctx.save();
      ctx.strokeStyle = 'rgba(218, 165, 32, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
      ctx.shadowBlur = 5;

      this.roundRect(ctx, x - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 6);
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 230, 211, 0.3)';
      this.roundRect(ctx, x - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 6);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = COLOR_MAP[color];
      ctx.globalAlpha = 0.8;
      ctx.font = `${Math.floor(slotSize * 0.5)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count.toString(), x, slotY);

      ctx.restore();
    }
  }

  private drawUI(): void {
    const ctx = this.ctx;
    const engine = this.engine;
    const w = this.width;

    const scoreY = this.height * 0.06;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scoreText = Math.floor(engine.state.scoreDisplay).toString();
    const fontSize = Math.min(48, this.height * 0.05);

    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 10;

    const scoreGrad = ctx.createLinearGradient(0, scoreY - fontSize / 2, 0, scoreY + fontSize / 2);
    scoreGrad.addColorStop(0, '#ffd700');
    scoreGrad.addColorStop(0.5, '#fff8dc');
    scoreGrad.addColorStop(1, '#daa520');
    ctx.fillStyle = scoreGrad;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
    ctx.fillText(scoreText, w / 2, scoreY);

    ctx.shadowBlur = 0;
    ctx.font = `${fontSize * 0.45}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255, 248, 220, 0.7)';
    ctx.fillText('积 分', w / 2, scoreY - fontSize * 0.9);

    const drawsText = `绘制次数: ${engine.state.drawsLeft}`;
    ctx.font = `${fontSize * 0.5}px Georgia, serif`;
    ctx.fillStyle = engine.state.drawsLeft <= 1 ? '#ff6b6b' : 'rgba(255, 248, 220, 0.8)';
    ctx.fillText(drawsText, w / 2, scoreY + fontSize * 0.85);

    ctx.restore();
  }

  private drawGameOver(): void {
    if (!this.engine.state.isGameOver) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.fillStyle = 'rgba(13, 5, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const boxW = Math.min(400, w * 0.8);
    const boxH = Math.min(300, h * 0.6);

    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 3;
    this.roundRect(ctx, centerX - boxW / 2, centerY - boxH / 2, boxW, boxH, 12);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(45, 27, 71, 0.95)';
    this.roundRect(ctx, centerX - boxW / 2, centerY - boxH / 2, boxW, boxH, 12);
    ctx.fill();

    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(36, boxH * 0.14)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', centerX, centerY - boxH * 0.3);

    const score = Math.floor(this.engine.state.scoreDisplay);
    ctx.shadowBlur = 8;
    const scoreGrad = ctx.createLinearGradient(0, centerY - 30, 0, centerY + 30);
    scoreGrad.addColorStop(0, '#ffd700');
    scoreGrad.addColorStop(0.5, '#fff8dc');
    scoreGrad.addColorStop(1, '#daa520');
    ctx.fillStyle = scoreGrad;
    ctx.font = `bold ${Math.min(48, boxH * 0.18)}px Georgia, serif`;
    ctx.fillText(`总分: ${score}`, centerX, centerY);

    const btnW = boxW * 0.5;
    const btnH = boxH * 0.18;
    const btnY = centerY + boxH * 0.28;

    const pulseTime = this.engine.getPulseTime();
    const btnPulse = 0.5 + 0.5 * Math.sin(pulseTime * 4);

    ctx.shadowColor = `rgba(255, 215, 0, ${0.5 + btnPulse * 0.5})`;
    ctx.shadowBlur = 10 + btnPulse * 15;
    ctx.fillStyle = '#daa520';
    this.roundRect(ctx, centerX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a2e';
    ctx.font = `bold ${Math.min(22, btnH * 0.5)}px Georgia, serif`;
    ctx.fillText('重新开始', centerX, btnY);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private lightenColor(hex: string, amount: number): string {
    const c = this.hexToRgb(hex);
    const r = Math.min(255, Math.floor(c.r + (255 - c.r) * amount));
    const g = Math.min(255, Math.floor(c.g + (255 - c.g) * amount));
    const b = Math.min(255, Math.floor(c.b + (255 - c.b) * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const c = this.hexToRgb(hex);
    const r = Math.floor(c.r * (1 - amount));
    const g = Math.floor(c.g * (1 - amount));
    const b = Math.floor(c.b * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  isPointOnRestartButton(x: number, y: number): boolean {
    if (!this.engine.state.isGameOver) return false;

    const w = this.width;
    const h = this.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const boxW = Math.min(400, w * 0.8);
    const boxH = Math.min(300, h * 0.6);
    const btnW = boxW * 0.5;
    const btnH = boxH * 0.18;
    const btnY = centerY + boxH * 0.28;

    return (
      x >= centerX - btnW / 2 &&
      x <= centerX + btnW / 2 &&
      y >= btnY - btnH / 2 &&
      y <= btnY + btnH / 2
    );
  }
}
