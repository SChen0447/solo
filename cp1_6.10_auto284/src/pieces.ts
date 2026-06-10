import type { GameState, PieceState, PlayerId, PieceType } from './core';
import { BOARD_SIZE } from './core';

const PIECE_COLORS: Record<PlayerId, Record<PieceType, string>> = {
  1: {
    scout: '#00e5ff',
    engineer: '#ff9800',
    commander: '#ffd700',
  },
  2: {
    scout: '#00e5ff',
    engineer: '#ff9800',
    commander: '#ffd700',
  },
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class PieceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 0;
  private animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.recalcCellSize();
  }

  recalcCellSize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssSize = parseFloat(this.canvas.style.width) || this.canvas.width / dpr;
    this.cellSize = cssSize / BOARD_SIZE;
  }

  render(state: GameState, now: number): void {
    this.recalcCellSize();
    this.animTime = now;
    const ctx = this.ctx;

    for (const piece of state.pieces) {
      if (piece.hp <= 0) continue;
      this.drawPiece(piece, state.currentPlayer, now);
    }
  }

  private drawPiece(piece: PieceState, currentPlayer: PlayerId, now: number): void {
    const ctx = this.ctx;
    let px: number, py: number;

    if (piece.animating && piece.animFrom && piece.animTo) {
      const t = easeOutCubic(Math.min(1, piece.animProgress));
      px = lerp(piece.animFrom.x, piece.animTo.x, t) + 0.5;
      py = lerp(piece.animFrom.y, piece.animTo.y, t) + 0.5;
    } else {
      px = piece.pos.x + 0.5;
      py = piece.pos.y + 0.5;
    }

    const cx = px * this.cellSize;
    const cy = py * this.cellSize;
    const radius = this.cellSize * 0.3;
    const color = PIECE_COLORS[piece.owner][piece.type];
    const isOwn = piece.owner === currentPlayer;
    const isStunned = piece.stunnedUntil > now;

    const outlineColor = isOwn ? 'rgba(0, 229, 255, 0.55)' : 'rgba(255, 82, 82, 0.55)';
    const outlineWidth = isOwn ? 3 : 2.5;

    ctx.save();
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = isOwn ? 14 : 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + outlineWidth, 0, Math.PI * 2);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    const grd = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 1, cx, cy, radius);
    grd.addColorStop(0, this.lightenColor(color, 40));
    grd.addColorStop(0.6, color);
    grd.addColorStop(1, this.darkenColor(color, 40));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.strokeStyle = this.lightenColor(color, 60);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    this.drawPieceIcon(cx, cy, radius, color, piece.type, now);

    this.drawHpBar(cx, cy, radius, piece);

    if (isStunned) {
      this.drawStunIndicator(cx, cy, radius, now);
    }

    if (piece.owner === currentPlayer && (piece.movedThisTurn || piece.attackedThisTurn)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPieceIcon(
    cx: number,
    cy: number,
    radius: number,
    color: string,
    type: PieceType,
    now: number
  ): void {
    const ctx = this.ctx;
    const iconSize = radius * 0.7;

    ctx.save();
    ctx.translate(cx, cy);

    switch (type) {
      case 'scout': {
        const rot = now * 0.003;
        ctx.rotate(rot);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-iconSize, 0);
        ctx.lineTo(iconSize, 0);
        ctx.moveTo(0, -iconSize);
        ctx.lineTo(0, iconSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, iconSize * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, iconSize * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }

      case 'engineer': {
        const blink = Math.sin(now * 0.01) * 0.3 + 0.7;
        ctx.rotate(-Math.PI / 4 + Math.sin(now * 0.005) * 0.08);
        ctx.strokeStyle = `rgba(255, 255, 255, ${blink})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-iconSize, -iconSize * 0.6);
        ctx.lineTo(iconSize * 0.3, iconSize * 0.6);
        ctx.moveTo(iconSize * 0.5, iconSize * 0.3);
        ctx.lineTo(iconSize, iconSize * 0.8);
        ctx.moveTo(iconSize * 0.1, iconSize * 0.1);
        ctx.lineTo(iconSize * 0.6, iconSize * 0.6);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-iconSize * 0.15, -iconSize * 0.15, iconSize * 0.3, iconSize * 0.3);
        ctx.shadowBlur = 0;
        break;
      }

      case 'commander': {
        const pulse = Math.sin(now * 0.004) * 0.1 + 1;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        const sp = iconSize;
        ctx.moveTo(-sp * 0.8, sp * 0.4);
        ctx.lineTo(-sp * 0.8, -sp * 0.1);
        ctx.lineTo(-sp * 0.4, sp * 0.15);
        ctx.lineTo(0, -sp * 0.3);
        ctx.lineTo(sp * 0.4, sp * 0.15);
        ctx.lineTo(sp * 0.8, -sp * 0.1);
        ctx.lineTo(sp * 0.8, sp * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-sp * 0.6, 0, 1.8, 0, Math.PI * 2);
        ctx.arc(0, -sp * 0.1, 2, 0, Math.PI * 2);
        ctx.arc(sp * 0.6, 0, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
    }

    ctx.restore();
  }

  private drawHpBar(cx: number, cy: number, radius: number, piece: PieceState): void {
    const ctx = this.ctx;
    const barWidth = radius * 1.6;
    const barHeight = 4;
    const barX = cx - barWidth / 2;
    const barY = cy + radius + 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    const hpRatio = piece.hp / piece.maxHp;
    const hpColor = hpRatio > 0.6 ? '#66ff66' : hpRatio > 0.3 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private drawStunIndicator(cx: number, cy: number, radius: number, now: number): void {
    const ctx = this.ctx;
    const off = radius * 0.7;
    const wobble = Math.sin(now * 0.01) * 2;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 6;
    ctx.fillText('★', cx - off + wobble, cy - radius - 4);
    ctx.fillText('★', cx + off - wobble, cy - radius - 2);
    ctx.fillText('?', cx, cy - radius - 8 + Math.sin(now * 0.008) * 2);
    ctx.shadowBlur = 0;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
