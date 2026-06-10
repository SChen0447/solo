import type { GameState, Vec2, CellState, PieceState, Particle } from './core';
import { BOARD_SIZE, CORE_POS, SURGE_DURATION } from './core';

const ELEVATION_COLORS: Record<number, string> = {
  0: '#061226',
  1: '#0b1d3a',
  2: '#153055',
  3: '#1e3a5f',
  4: '#00d4ff',
};

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private wavePhase: number = 0;
  private coreRotation: number = 0;
  private tideWaveProgress: number = 0;
  private isTideAnimating: boolean = false;
  private tideAnimStart: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const minDim = Math.min(w, h);
    const dpr = window.devicePixelRatio || 1;
    const size = Math.floor(minDim * 0.95);
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cellSize = size / BOARD_SIZE;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  getCellAt(clientX: number, clientY: number): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    if (cx < 0 || cx >= BOARD_SIZE || cy < 0 || cy >= BOARD_SIZE) return null;
    return { x: cx, y: cy };
  }

  startTideAnimation(): void {
    this.isTideAnimating = true;
    this.tideAnimStart = performance.now();
  }

  render(state: GameState, now: number): void {
    const ctx = this.ctx;
    const size = this.cellSize * BOARD_SIZE;
    ctx.clearRect(0, 0, size, size);

    this.wavePhase += 0.04;
    this.coreRotation += 0.015;

    if (this.isTideAnimating) {
      this.tideWaveProgress = Math.min(1, (now - this.tideAnimStart) / 2000);
      if (this.tideWaveProgress >= 1) this.isTideAnimating = false;
    }

    this.drawGridBackground(state, now);
    this.drawHighlights(state);
    this.drawFortresses(state, now);
    this.drawCore(state, now);
    this.drawTideWaveOverlay(now);
  }

  private drawGridBackground(state: GameState, now: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = state.board[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        this.drawCell(x, y, cell, now);

        ctx.strokeStyle = 'rgba(74, 144, 217, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, this.cellSize - 1, this.cellSize - 1);
      }
    }

    ctx.shadowColor = '#4a90d9';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    ctx.shadowBlur = 0;
    const size = this.cellSize * BOARD_SIZE;
  }

  private drawCell(x: number, y: number, cell: CellState, now: number): void {
    const ctx = this.ctx;
    const px = x * this.cellSize;
    const py = y * this.cellSize;
    const pad = 2;

    let elev = cell.elevation;
    if (cell.surgeUntil > now) {
      const surgeProgress = 1 - (cell.surgeUntil - now) / SURGE_DURATION;
      elev = 4;
    }

    const baseColor = ELEVATION_COLORS[Math.min(4, Math.max(0, Math.floor(elev)))] || ELEVATION_COLORS[0];

    ctx.fillStyle = baseColor;
    ctx.fillRect(px + pad, py + pad, this.cellSize - pad * 2, this.cellSize - pad * 2);

    if (elev === 0) {
      this.drawWaterRipple(px, py);
    }

    if (elev >= 2 && elev <= 3) {
      const grd = ctx.createLinearGradient(px, py, px, py + this.cellSize);
      grd.addColorStop(0, 'rgba(255,255,255,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = grd;
      ctx.fillRect(px + pad, py + pad, this.cellSize - pad * 2, this.cellSize - pad * 2);
    }

    if (cell.surgeUntil > now) {
      const t = 1 - (cell.surgeUntil - now) / SURGE_DURATION;
      const pulse = Math.sin(t * Math.PI * 4) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(0, 212, 255, ${0.3 * pulse})`;
      ctx.fillRect(px + pad, py + pad, this.cellSize - pad * 2, this.cellSize - pad * 2);

      ctx.strokeStyle = `rgba(0, 230, 255, ${0.8 * pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e6ff';
      ctx.shadowBlur = 12;
      ctx.strokeRect(px + pad + 1, py + pad + 1, this.cellSize - pad * 2 - 2, this.cellSize - pad * 2 - 2);
      ctx.shadowBlur = 0;
    }
  }

  private drawWaterRipple(px: number, py: number): void {
    const ctx = this.ctx;
    const cx = px + this.cellSize / 2;
    const cy = py + this.cellSize / 2;
    const wave = Math.sin(this.wavePhase + (px + py) * 0.02) * 2;
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy + wave, this.cellSize * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - wave, this.cellSize * 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHighlights(state: GameState): void {
    const ctx = this.ctx;
    const selected = state.pieces.find(p => p.id === state.selectedPieceId);
    if (!selected) return;

    const reachable: Vec2[] = [];
    const attackable: Vec2[] = [];

    if (state.pendingAction === 'flash') {
      const cell = state.board[selected.pos.y][selected.pos.x];
      const visionRange = cell.elevation >= 2 ? 2 : 1;
      for (let dy = -visionRange; dy <= visionRange; dy++) {
        for (let dx = -visionRange; dx <= visionRange; dx++) {
          const tx = selected.pos.x + dx;
          const ty = selected.pos.y + dy;
          if (tx >= 0 && tx < BOARD_SIZE && ty >= 0 && ty < BOARD_SIZE) {
            if (!state.pieces.find(p => p.pos.x === tx && p.pos.y === ty && p.hp > 0)) {
              reachable.push({ x: tx, y: ty });
            }
          }
        }
      }
    } else if (state.pendingAction === 'fortify') {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
          const tx = selected.pos.x + dx;
          const ty = selected.pos.y + dy;
          if (tx >= 0 && tx < BOARD_SIZE && ty >= 0 && ty < BOARD_SIZE) {
            reachable.push({ x: tx, y: ty });
          }
        }
      }
    } else {
      const range = selected.moveRange;
      const hasBuff = state.pieces.some(p =>
        p.owner === selected.owner && p.type === 'commander' &&
        Math.max(Math.abs(p.pos.x - selected.pos.x), Math.abs(p.pos.y - selected.pos.y)) <= 1 &&
        p.id !== selected.id
      );
      const effRange = hasBuff ? Math.ceil(range * 1.5) : range;

      for (let dy = -effRange; dy <= effRange; dy++) {
        for (let dx = -effRange; dx <= effRange; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > effRange) continue;
          if (dx === 0 && dy === 0) continue;
          const tx = selected.pos.x + dx;
          const ty = selected.pos.y + dy;
          if (tx < 0 || tx >= BOARD_SIZE || ty < 0 || ty >= BOARD_SIZE) continue;
          const tcell = state.board[ty][tx];
          if (tcell.elevation >= 4) continue;
          if (tcell.fortifyUntil > performance.now() && tcell.fortifyOwner !== selected.owner) continue;
          const tp = state.pieces.find(p => p.pos.x === tx && p.pos.y === ty && p.hp > 0);
          if (!tp) reachable.push({ x: tx, y: ty });
        }
      }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = selected.pos.x + dx;
          const ty = selected.pos.y + dy;
          const tp = state.pieces.find(p => p.pos.x === tx && p.pos.y === ty && p.hp > 0 && p.owner !== selected.owner);
          if (tp) attackable.push({ x: tx, y: ty });
        }
      }
    }

    for (const r of reachable) {
      const px = r.x * this.cellSize;
      const py = r.y * this.cellSize;
      ctx.fillStyle = 'rgba(100, 255, 150, 0.18)';
      ctx.fillRect(px + 3, py + 3, this.cellSize - 6, this.cellSize - 6);
      ctx.strokeStyle = 'rgba(100, 255, 150, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
      ctx.setLineDash([]);
    }

    for (const a of attackable) {
      const px = a.x * this.cellSize;
      const py = a.y * this.cellSize;
      ctx.fillStyle = 'rgba(255, 80, 80, 0.22)';
      ctx.fillRect(px + 3, py + 3, this.cellSize - 6, this.cellSize - 6);
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
      ctx.setLineDash([]);
    }

    const spx = selected.pos.x * this.cellSize;
    const spy = selected.pos.y * this.cellSize;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.strokeRect(spx + 3, spy + 3, this.cellSize - 6, this.cellSize - 6);
    ctx.shadowBlur = 0;
  }

  private drawFortresses(state: GameState, now: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = state.board[y][x];
        if (cell.fortifyUntil > now && cell.fortifyOwner !== undefined) {
          const px = x * this.cellSize;
          const py = y * this.cellSize;
          const progress = (cell.fortifyUntil - now) / 5000;
          const color = cell.fortifyOwner === 1 ? '#00e5ff' : '#ff5252';

          ctx.fillStyle = `${color}22`;
          ctx.fillRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.strokeRect(px + 5, py + 5, this.cellSize - 10, this.cellSize - 10);
          ctx.shadowBlur = 0;

          for (let i = 0; i < 3; i++) {
            const bx = px + 6 + i * (this.cellSize - 12) / 2;
            const by = py + this.cellSize / 2 - 6;
            ctx.fillStyle = color;
            ctx.fillRect(bx, by, (this.cellSize - 16) / 3, 12);
            ctx.fillRect(bx + 1, by - 4, (this.cellSize - 16) / 3 - 2, 4);
          }

          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(px + 6, py + this.cellSize - 8, (this.cellSize - 12) * progress, 3);
        }
      }
    }
  }

  private drawCore(state: GameState, now: number): void {
    const ctx = this.ctx;
    const cx = 3.5 * this.cellSize;
    const cy = 3.5 * this.cellSize;
    const size = 15;

    const pulse = Math.sin(now * 0.004) * 0.15 + 0.85;
    for (let i = 0; i < 3; i++) {
      const r = (size + 8 + i * 6) * pulse + Math.sin(now * 0.003 + i) * 3;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 - i * 0.04})`;
      ctx.lineWidth = 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const angle = this.coreRotation + (i * Math.PI * 2) / 8;
      const dist = size + 18 + Math.sin(now * 0.003 + i) * 4;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(now * 0.005 + i) * 0.3})`;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.coreRotation);
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;

    ctx.fillStyle = 'rgba(255, 215, 0, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.85, -size * 0.3);
    ctx.lineTo(size * 0.6, size * 0.8);
    ctx.lineTo(-size * 0.6, size * 0.8);
    ctx.lineTo(-size * 0.85, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 240, 150, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.85, -size * 0.3);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 200, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.85, -size * 0.3);
    ctx.lineTo(size * 0.6, size * 0.8);
    ctx.lineTo(-size * 0.6, size * 0.8);
    ctx.lineTo(-size * 0.85, -size * 0.3);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size * 0.9);
    ctx.moveTo(-size * 0.85, -size * 0.3);
    ctx.lineTo(size * 0.85, -size * 0.3);
    ctx.moveTo(-size * 0.6, size * 0.8);
    ctx.lineTo(size * 0.6, size * 0.8);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();

    if (state.coreCapturedBy && state.coreCaptureStartedAt) {
      const progress = Math.min(1, (now - state.coreCaptureStartedAt) / 3000);
      const color = state.coreCapturedBy === 1 ? '#00e5ff' : '#ff5252';
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.arc(cx, cy, size + 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawTideWaveOverlay(now: number): void {
    if (!this.isTideAnimating) return;
    const ctx = this.ctx;
    const size = this.cellSize * BOARD_SIZE;
    const progress = this.tideWaveProgress;

    ctx.save();
    const waveY = size * (1 - progress);
    ctx.beginPath();
    ctx.moveTo(0, size);
    for (let x = 0; x <= size; x += 8) {
      const y = waveY + Math.sin((x + now * 0.1) * 0.04) * 8 + Math.sin((x + now * 0.2) * 0.02) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(size, size);
    ctx.closePath();

    const grd = ctx.createLinearGradient(0, waveY - 20, 0, size);
    grd.addColorStop(0, 'rgba(0, 150, 220, 0.1)');
    grd.addColorStop(0.3, 'rgba(0, 120, 200, 0.3)');
    grd.addColorStop(1, 'rgba(0, 80, 160, 0.5)');
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= size; x += 8) {
      const y = waveY + Math.sin((x + now * 0.1) * 0.04) * 8 + Math.sin((x + now * 0.2) * 0.02) * 4;
      if (Math.random() < 0.3) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.4})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(
        p.x * this.cellSize,
        p.y * this.cellSize,
        p.size * alpha,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
