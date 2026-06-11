import { GRID_SIZE, CELL_SIZE } from './GameManager';
import type { GameManager, Cell } from './GameManager';
import type { Player } from './Player';
import { Direction } from './Player';
import type { Obstacle } from './Obstacle';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

export interface GemFlight {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  progress: number;
  duration: number;
}

const LIGHT_RADIUS = 50;
const LIGHT_CENTER_OFFSET_X = 16;
const LIGHT_CENTER_OFFSET_Y = 6;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameManager: GameManager;
  private stoneTexture: HTMLCanvasElement;
  private borderTexture: HTMLCanvasElement;
  private titleTime: number;

  private viewportOffsetX: number;
  private viewportOffsetY: number;

  constructor(canvas: HTMLCanvasElement, gameManager: GameManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.gameManager = gameManager;
    this.stoneTexture = this.createStoneTexture();
    this.borderTexture = this.createBorderTexture();
    this.titleTime = 0;
    this.viewportOffsetX = 0;
    this.viewportOffsetY = 0;
  }

  private createStoneTexture(): HTMLCanvasElement {
    const tex = document.createElement('canvas');
    tex.width = CELL_SIZE;
    tex.height = CELL_SIZE;
    const tctx = tex.getContext('2d')!;

    tctx.fillStyle = '#3d2817';
    tctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * CELL_SIZE);
      const y = Math.floor(Math.random() * CELL_SIZE);
      const gray = Math.floor(40 + Math.random() * 40);
      tctx.fillStyle = `rgb(${gray + 20}, ${gray}, ${gray - 10})`;
      tctx.fillRect(x, y, 2, 2);
    }

    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * CELL_SIZE);
      const y = Math.floor(Math.random() * CELL_SIZE);
      tctx.fillStyle = 'rgba(80, 50, 30, 0.4)';
      tctx.fillRect(x, y, 3, 3);
    }

    return tex;
  }

  private createBorderTexture(): HTMLCanvasElement {
    const tex = document.createElement('canvas');
    tex.width = 8;
    tex.height = 8;
    const tctx = tex.getContext('2d')!;

    tctx.fillStyle = '#5a5a5a';
    tctx.fillRect(0, 0, 8, 8);

    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 8);
      const y = Math.floor(Math.random() * 8);
      const shade = Math.floor(60 + Math.random() * 40);
      tctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      tctx.fillRect(x, y, 1, 1);
    }

    return tex;
  }

  private updateViewport(): void {
    const player = this.gameManager.getPlayer;
    const totalGridW = GRID_SIZE * CELL_SIZE;
    const totalGridH = GRID_SIZE * CELL_SIZE;

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const panelLeftW = 160;
    const panelRightW = 130;
    const topMargin = 50;
    const bottomMargin = 20;
    const borderW = 2;

    const viewW = cw - panelLeftW - panelRightW - borderW * 2;
    const viewH = ch - topMargin - bottomMargin - borderW * 2;

    let playerScreenX = player.getPixelX() + 16;
    let playerScreenY = player.getPixelY() + 16;

    let offsetX = cw / 2 - playerScreenX;
    let offsetY = (topMargin + viewH / 2) - playerScreenY;

    offsetX = Math.min(panelLeftW + borderW, Math.max(cw - panelRightW - borderW - totalGridW, offsetX));
    offsetY = Math.min(topMargin + borderW, Math.max(ch - bottomMargin - borderW - totalGridH, offsetY));

    this.viewportOffsetX = offsetX;
    this.viewportOffsetY = offsetY;
  }

  public render(): void {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    this.titleTime += 16;

    this.updateViewport();

    this.ctx.fillStyle = '#1a0f0a';
    this.ctx.fillRect(0, 0, cw, ch);

    this.drawBorders();
    this.drawTitle();
    this.drawGrid();
    this.drawExit();
    this.drawFlashes();
    this.drawObstacles();
    this.drawParticles();
    this.drawGemFlights();
    this.drawLightAndPlayer();
    this.drawLeftPanel();
    this.drawRightPanel();
    this.drawLevelComplete();
    this.drawGameOver();
  }

  private drawBorders(): void {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const pattern = this.ctx.createPattern(this.borderTexture, 'repeat');

    this.ctx.save();
    this.ctx.fillStyle = pattern || '#666';
    this.ctx.fillRect(0, 0, cw, 2);
    this.ctx.fillRect(0, ch - 2, cw, 2);
    this.ctx.fillRect(0, 0, 2, ch);
    this.ctx.fillRect(cw - 2, 0, 2, ch);
    this.ctx.restore();
  }

  private drawTitle(): void {
    const cw = this.canvas.width;
    const bob = Math.sin(this.titleTime * 0.005) * 2;

    this.ctx.save();
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    this.ctx.fillStyle = '#8b6914';
    this.ctx.fillText('矿 工 冒 险', cw / 2 + 1, 10 + bob + 1);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText('矿 工 冒 险', cw / 2, 10 + bob);

    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.fillText('矿 工 冒 险', cw / 2, 10 + bob);
    this.ctx.restore();
  }

  private drawGrid(): void {
    const grid = this.gameManager.getGrid;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.drawCell(row, col, grid[row][col]);
      }
    }
  }

  private drawCell(row: number, col: number, cell: Cell): void {
    const x = col * CELL_SIZE + this.viewportOffsetX;
    const y = row * CELL_SIZE + this.viewportOffsetY;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (x + CELL_SIZE < 0 || x > cw || y + CELL_SIZE < 0 || y > ch) return;

    if (cell.dug) {
      this.ctx.fillStyle = '#0a1628';
      this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      for (const frag of cell.fragments) {
        this.ctx.fillStyle = `rgba(120, 90, 70, ${frag.opacity})`;
        this.ctx.fillRect(x + frag.x, y + frag.y, frag.size, frag.size);
      }

      this.ctx.strokeStyle = 'rgba(60, 80, 100, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    } else {
      this.ctx.drawImage(this.stoneTexture, x, y);

      this.ctx.save();
      this.ctx.setLineDash([3, 3]);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      this.ctx.restore();

      this.drawOre(x, y, cell);
    }
  }

  private drawOre(x: number, y: number, cell: Cell): void {
    if (cell.ore === 'none' || cell.ore === 'exit') return;

    const color = this.gameManager.getOreColor(cell.ore, cell.gemColor);
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    if (cell.ore === 'gem') {
      this.drawDiamond(cx, cy, 10, color);
    } else if (cell.ore === 'silver') {
      const grad = this.ctx.createLinearGradient(cx - 8, cy - 8, cx + 8, cy + 8);
      grad.addColorStop(0, '#e8e8e8');
      grad.addColorStop(0.5, '#a8a8a8');
      grad.addColorStop(1, '#c8c8c8');
      this.drawTriangle(cx, cy, 9, grad);
    } else {
      this.drawTriangle(cx, cy, 8 + Math.random() * 1, color);
    }

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(cx - 3, cy - 5, 2, 2);
    this.ctx.restore();
  }

  private drawTriangle(cx: number, cy: number, size: number, color: string | CanvasGradient): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx - size, cy + size * 0.7);
    this.ctx.lineTo(cx + size, cy + size * 0.7);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawDiamond(cx: number, cy: number, size: number, color: string): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx + size, cy);
    this.ctx.lineTo(cx, cy + size);
    this.ctx.lineTo(cx - size, cy);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 2, cy - size + 2);
    this.ctx.lineTo(cx - 2, cy - 2);
    this.ctx.lineTo(cx - size + 3, cy - 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx + size, cy);
    this.ctx.lineTo(cx, cy + size);
    this.ctx.lineTo(cx - size, cy);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawExit(): void {
    if (!this.gameManager.isExitVisible) return;

    const row = this.gameManager.getExitRow;
    const col = this.gameManager.getExitCol;
    const x = col * CELL_SIZE + this.viewportOffsetX;
    const y = row * CELL_SIZE + this.viewportOffsetY;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    const flash = (Math.sin(this.titleTime * 0.01) + 1) / 2;

    this.ctx.save();
    this.ctx.fillStyle = `rgba(231, 76, 60, ${0.3 + flash * 0.4})`;
    this.ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + 8);
    this.ctx.lineTo(cx - 8, cy - 4);
    this.ctx.lineTo(cx - 3, cy - 4);
    this.ctx.lineTo(cx - 3, cy - 10);
    this.ctx.lineTo(cx + 3, cy - 10);
    this.ctx.lineTo(cx + 3, cy - 4);
    this.ctx.lineTo(cx + 8, cy - 4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawFlashes(): void {
    const flashes = this.gameManager.getFlashCells;
    const now = performance.now();

    for (const f of flashes) {
      const x = f.col * CELL_SIZE + this.viewportOffsetX;
      const y = f.row * CELL_SIZE + this.viewportOffsetY;
      const alpha = 1 - (now - f.startTime) / f.duration;

      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha) * 0.7})`;
      this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      this.ctx.restore();
    }
  }

  private drawObstacles(): void {
    const obstacles = this.gameManager.getObstacles;

    for (const obs of obstacles as unknown as Obstacle[]) {
      const x = (obs as unknown as { getX(): number }).getX() + this.viewportOffsetX;
      const y = (obs as unknown as { getY(): number }).getY() + this.viewportOffsetY;
      const s = (obs as unknown as { getSize(): number }).getSize();

      this.ctx.save();
      this.ctx.fillStyle = '#6b6b6b';
      this.ctx.fillRect(x, y, s, s);

      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.fillRect(x + 1, y + s - 3, s - 2, 2);
      this.ctx.fillRect(x + s - 3, y + 1, 2, s - 2);

      this.ctx.fillStyle = '#8a8a8a';
      this.ctx.fillRect(x + 1, y + 1, 3, 3);
      this.ctx.fillRect(x + 5, y + 2, 2, 2);
      this.ctx.fillRect(x + 2, y + 7, 2, 2);

      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      this.ctx.restore();
    }
  }

  private drawParticles(): void {
    const particles = this.gameManager.getParticles;

    for (const p of particles) {
      const x = p.x + this.viewportOffsetX;
      const y = p.y + this.viewportOffsetY;
      const alpha = Math.max(0, p.life / 500);

      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      this.ctx.restore();
    }
  }

  private drawGemFlights(): void {
    const flights = this.gameManager.getGemFlights;

    for (const g of flights) {
      const t = g.progress;
      const easeT = t * t * (3 - 2 * t);
      const x = g.fromX + (g.toX - g.fromX) * easeT + this.viewportOffsetX;
      const y = g.fromY + (g.toY - g.fromY) * easeT + Math.sin(t * Math.PI) * -30 + this.viewportOffsetY;

      this.ctx.save();
      this.ctx.shadowColor = g.color;
      this.ctx.shadowBlur = 10;
      this.drawDiamond(x, y, 6, g.color);
      this.ctx.restore();
    }
  }

  private drawLightAndPlayer(): void {
    const player = this.gameManager.getPlayer as unknown as Player;
    const px = player.getPixelX() + this.viewportOffsetX;
    const py = player.getPixelY() + this.viewportOffsetY;
    const lightCx = px + LIGHT_CENTER_OFFSET_X;
    const lightCy = py + LIGHT_CENTER_OFFSET_Y;

    this.drawPlayer(px, py, player);

    if (player.getIsGoldenGlow()) {
      this.ctx.save();
      const glow = player.getGoldenGlowOpacity();
      const grad = this.ctx.createRadialGradient(px + 16, py + 16, 0, px + 16, py + 16, 40);
      grad.addColorStop(0, `rgba(255, 215, 0, ${0.6 * glow})`);
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(px - 30, py - 30, 92, 92);
      this.ctx.restore();
    }

    this.ctx.save();
    const lightGrad = this.ctx.createRadialGradient(lightCx, lightCy, 0, lightCx, lightCy, LIGHT_RADIUS);
    lightGrad.addColorStop(0, 'rgba(255, 245, 150, 0.35)');
    lightGrad.addColorStop(0.4, 'rgba(255, 220, 100, 0.15)');
    lightGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.fillStyle = lightGrad;
    this.ctx.fillRect(lightCx - LIGHT_RADIUS, lightCy - LIGHT_RADIUS, LIGHT_RADIUS * 2, LIGHT_RADIUS * 2);
    this.ctx.restore();
  }

  private drawPlayer(x: number, y: number, player: Player): void {
    const bobDeg = player.getWalkBob();
    const dir = player.getDirection();

    this.ctx.save();
    this.ctx.translate(x + 16, y + 16);
    this.ctx.rotate((bobDeg * Math.PI) / 180);
    this.ctx.translate(-16, -16);

    this.ctx.fillStyle = '#2980b9';
    this.ctx.fillRect(8, 14, 16, 14);

    this.ctx.fillStyle = '#8b5a2b';
    this.ctx.fillRect(20, 16, 6, 10);
    this.ctx.fillStyle = '#6b4423';
    this.ctx.fillRect(21, 17, 4, 2);

    this.ctx.fillStyle = '#f5cba7';
    this.ctx.fillRect(9, 6, 14, 10);

    this.ctx.fillStyle = '#f1c40f';
    this.ctx.beginPath();
    this.ctx.ellipse(16, 6, 10, 5, 0, Math.PI, 0);
    this.ctx.fill();

    this.ctx.fillStyle = '#d4ac0d';
    this.ctx.fillRect(6, 5, 20, 2);

    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.fillRect(14, 2, 4, 3);
    this.ctx.fillStyle = '#fff59d';
    this.ctx.fillRect(15, 3, 2, 1);

    if (dir === Direction.LEFT) {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(11, 10, 2, 2);
    } else if (dir === Direction.RIGHT) {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(19, 10, 2, 2);
    } else if (dir === Direction.UP) {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(12, 10, 2, 2);
      this.ctx.fillRect(18, 10, 2, 2);
    } else {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(12, 11, 2, 2);
      this.ctx.fillRect(18, 11, 2, 2);
    }

    const armAngle = player.getDigArmAngle();
    if (armAngle !== 0) {
      this.ctx.save();
      let pivotX = 26;
      let pivotY = 18;
      if (dir === Direction.LEFT) {
        pivotX = 6;
      } else if (dir === Direction.UP) {
        pivotX = 16;
        pivotY = 12;
      } else if (dir === Direction.DOWN) {
        pivotX = 16;
        pivotY = 26;
      }

      this.ctx.translate(pivotX, pivotY);
      let rotAngle = armAngle;
      if (dir === Direction.LEFT) rotAngle = -rotAngle;
      if (dir === Direction.UP) rotAngle = Math.PI / 2 + rotAngle;
      if (dir === Direction.DOWN) rotAngle = -Math.PI / 2 + rotAngle;
      this.ctx.rotate(rotAngle);

      this.ctx.fillStyle = '#f5cba7';
      this.ctx.fillRect(-2, -2, 10, 4);

      this.ctx.fillStyle = '#8b4513';
      this.ctx.fillRect(6, -1, 8, 2);
      this.ctx.fillStyle = '#7f8c8d';
      this.ctx.fillRect(12, -5, 6, 10);

      this.ctx.restore();
    } else {
      this.ctx.fillStyle = '#f5cba7';
      if (dir === Direction.LEFT) {
        this.ctx.fillRect(4, 18, 4, 8);
      } else if (dir === Direction.RIGHT) {
        this.ctx.fillRect(24, 18, 4, 8);
      } else {
        this.ctx.fillRect(4, 18, 4, 8);
        this.ctx.fillRect(24, 18, 4, 8);
      }
    }

    this.ctx.fillStyle = '#1a5276';
    this.ctx.fillRect(9, 28, 5, 4);
    this.ctx.fillRect(18, 28, 5, 4);

    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(8, 30, 7, 2);
    this.ctx.fillRect(17, 30, 7, 2);

    this.ctx.restore();
  }

  private drawLeftPanel(): void {
    const panelX = 4;
    const panelY = 50;
    const panelW = 150;
    const panelH = 180;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);

    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);
    this.ctx.setLineDash([]);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.font = 'bold 13px "Courier New", monospace';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    let y = panelY + 10;
    this.ctx.fillText('生命值:', panelX + 12, y);
    this.drawHearts(panelX + 80, y, this.gameManager.getLives);

    y += 30;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`得分:`, panelX + 12, y);
    this.ctx.fillStyle = '#59ff59';
    this.ctx.fillText(`${this.gameManager.getScore}`, panelX + 68, y);

    y += 24;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`层数:`, panelX + 12, y);
    this.ctx.fillStyle = '#59e0ff';
    this.ctx.fillText(`${this.gameManager.getLevel}`, panelX + 68, y);

    y += 24;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`挖掘:`, panelX + 12, y);
    this.ctx.fillStyle = '#ffaa59';
    this.ctx.fillText(`${this.gameManager.getDugCount}格`, panelX + 68, y);

    y += 32;
    this.ctx.fillStyle = '#cccccc';
    this.ctx.font = '10px "Courier New", monospace';
    this.ctx.fillText('方向键/WASD: 移动', panelX + 12, y);
    y += 14;
    this.ctx.fillText('空格: 挖掘前方', panelX + 12, y);

    this.ctx.restore();
  }

  private drawHearts(x: number, y: number, lives: number): void {
    for (let i = 0; i < 3; i++) {
      const hx = x + i * 22;
      const hy = y - 2;
      if (i < lives) {
        this.drawHeart(hx, hy, '#ff3344');
      } else {
        this.drawHeart(hx, hy, '#555555');
      }
    }
  }

  private drawHeart(x: number, y: number, color: string): void {
    this.ctx.save();
    this.ctx.fillStyle = color;

    this.ctx.fillRect(x + 2, y + 2, 4, 2);
    this.ctx.fillRect(x + 10, y + 2, 4, 2);
    this.ctx.fillRect(x + 1, y + 4, 6, 2);
    this.ctx.fillRect(x + 9, y + 4, 6, 2);
    this.ctx.fillRect(x + 1, y + 6, 14, 2);
    this.ctx.fillRect(x + 2, y + 8, 12, 2);
    this.ctx.fillRect(x + 3, y + 10, 10, 2);
    this.ctx.fillRect(x + 4, y + 12, 8, 2);
    this.ctx.fillRect(x + 5, y + 14, 6, 2);
    this.ctx.fillRect(x + 6, y + 16, 4, 2);
    this.ctx.fillRect(x + 7, y + 18, 2, 2);

    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.fillRect(x + 2, y + 4, 2, 2);
    this.ctx.restore();
  }

  private drawRightPanel(): void {
    const cw = this.canvas.width;
    const panelX = cw - 124;
    const panelY = 50;
    const panelW = 120;
    const panelH = 180;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(panelX, panelY, panelW, panelH);

    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);
    this.ctx.setLineDash([]);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.font = 'bold 13px "Courier New", monospace';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.fillText('背包', panelX + 12, panelY + 10);

    const inventory = this.gameManager.getInventory;
    for (let i = 0; i < 5; i++) {
      const sx = panelX + 16;
      const sy = panelY + 40 + i * 26;
      const slot = inventory[i];

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
      this.ctx.fillRect(sx, sy, 88, 20);
      this.ctx.strokeStyle = '#888';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(sx + 0.5, sy + 0.5, 87, 19);
      this.ctx.restore();

      if (slot) {
        for (let j = 0; j < slot.count; j++) {
          const gx = sx + 6 + j * 18;
          const gy = sy + 4;
          this.ctx.save();
          this.ctx.shadowColor = slot.color;
          this.ctx.shadowBlur = 4;
          this.drawDiamond(gx + 6, gy + 6, 6, slot.color);
          this.ctx.restore();
        }
      }
    }

    this.ctx.restore();
  }

  private drawLevelComplete(): void {
    if (!this.gameManager.isLevelComplete) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, cw, ch);

    const alpha = (Math.sin(this.titleTime * 0.01) + 1) / 2;
    this.ctx.font = 'bold 48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = `rgba(0, 255, 100, ${0.7 + alpha * 0.3})`;
    this.ctx.fillText('通 关!', cw / 2, ch / 2 - 20);

    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`进入第 ${this.gameManager.getLevel + 1} 层...`, cw / 2, ch / 2 + 30);
    this.ctx.restore();
  }

  private drawGameOver(): void {
    if (!this.gameManager.isGameOver) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const elapsed = performance.now() - this.gameManager.getGameOverTime;

    const redAlpha = Math.max(0, 1 - elapsed / 300);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 0, 0, ${redAlpha * 0.4})`;
    this.ctx.fillRect(0, 0, cw, ch);

    if (elapsed > 300) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.ctx.fillRect(0, 0, cw, ch);

      this.ctx.font = 'bold 56px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.fillStyle = '#8b0000';
      this.ctx.fillText('游戏结束', cw / 2 + 2, ch / 2 - 40 + 2);

      this.ctx.fillStyle = '#ff4444';
      this.ctx.fillText('游戏结束', cw / 2, ch / 2 - 40);

      this.ctx.font = 'bold 24px "Courier New", monospace';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`最终得分: ${this.gameManager.getScore}`, cw / 2, ch / 2 + 20);

      this.ctx.font = '18px "Courier New", monospace';
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText(`到达第 ${this.gameManager.getLevel} 层`, cw / 2, ch / 2 + 60);

      this.ctx.font = '14px "Courier New", monospace';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText('刷新页面重新开始', cw / 2, ch / 2 + 110);
    }
    this.ctx.restore();
  }
}
