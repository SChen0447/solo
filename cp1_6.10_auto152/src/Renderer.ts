import { GameState, StoneData, Particle } from './GameState';

interface StoneLayout {
  x: number;
  y: number;
  size: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private dpr: number = 1;
  private layout: StoneLayout[] = [];
  private hoveredStone: number = -1;
  private stoneSize: number = 120;
  private stoneGap: number = 16;
  private stoneRadius: number = 16;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;

  private readonly COLOR_STONE_DEFAULT = '#4a4a5a';
  private readonly COLOR_STONE_CORRECT = '#f1c40f';
  private readonly COLOR_STONE_FADED = '#bdc3c7';
  private readonly COLOR_STONE_WRONG = '#e74c3c';
  private readonly COLOR_GLOW = 'rgba(241, 196, 15, ';
  private readonly COLOR_TOWER_BOTTOM = '#8b4513';
  private readonly COLOR_TOWER_TOP = '#d4a017';
  private readonly COLOR_PARTICLE = 'rgba(212, 160, 23, ';

  private readonly PRESS_DURATION = 200;
  private readonly CORRECT_FADE_DURATION = 1000;
  private readonly WRONG_DURATION = 500;
  private readonly GLOW_DURATION = 800;
  private readonly GLOW_MAX_RADIUS = 60;
  private readonly TOWER_DURATION = 2000;
  private readonly TOWER_LAYERS = 20;
  private readonly TOWER_LAYER_HEIGHT = 6;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.gameState = gameState;
    this.resize();
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (w < 800) {
      this.stoneSize = 80;
      this.stoneGap = Math.max(8, 16 * (80 / 120));
      this.stoneRadius = Math.max(10, 16 * (80 / 120));
    } else {
      this.stoneSize = 120;
      this.stoneGap = 16;
      this.stoneRadius = 16;
    }

    this.calculateLayout();
  }

  private calculateLayout(): void {
    this.layout = [];
    const totalW = 3 * this.stoneSize + 2 * this.stoneGap;
    const totalH = 3 * this.stoneSize + 2 * this.stoneGap;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.gridOffsetX = (w - totalW) / 2;
    this.gridOffsetY = (h - totalH) / 2;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        this.layout[idx] = {
          x: this.gridOffsetX + col * (this.stoneSize + this.stoneGap),
          y: this.gridOffsetY + row * (this.stoneSize + this.stoneGap),
          size: this.stoneSize,
        };
      }
    }
  }

  public getStoneAtPoint(px: number, py: number): number {
    for (let i = 0; i < this.layout.length; i++) {
      const l = this.layout[i];
      if (px >= l.x && px <= l.x + l.size && py >= l.y && py <= l.y + l.size) {
        return i;
      }
    }
    return -1;
  }

  public setHoveredStone(idx: number): void {
    this.hoveredStone = idx;
  }

  public getLayout(): StoneLayout[] {
    return this.layout;
  }

  public getStoneCenter(idx: number): { x: number; y: number } {
    const l = this.layout[idx];
    if (!l) return { x: 0, y: 0 };
    return { x: l.x + l.size / 2, y: l.y + l.size / 2 };
  }

  public getTowerBaseCenter(): { x: number; y: number } {
    return this.getStoneCenter(4);
  }

  public render(now: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);

    this.updateStoneAnimations(now);
    this.updateTowerProgress(now);
    this.updateParticles();

    this.drawStones(now);
    this.drawGlows(now);

    if (this.gameState.getTowerProgress() > 0 || this.gameState.isTowerRising()) {
      this.drawTower(now);
    }

    this.drawParticles();
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateStoneAnimations(now: number): void {
    const stones = this.gameState.getStones();
    for (const s of stones) {
      if (s.pressStartTime > 0) {
        const elapsed = now - s.pressStartTime;
        if (elapsed < this.PRESS_DURATION) {
          const t = elapsed / this.PRESS_DURATION;
          s.pressOffset = 2 * (1 - this.easeOut(t));
        } else {
          s.pressOffset = 0;
          s.pressStartTime = 0;
        }
      }

      if (s.state === 'correct') {
        const elapsed = now - s.stateStartTime;
        if (elapsed >= this.CORRECT_FADE_DURATION) {
          s.state = 'fading';
        }
      } else if (s.state === 'wrong') {
        const elapsed = now - s.stateStartTime;
        if (elapsed >= this.WRONG_DURATION) {
          s.state = 'default';
        }
      }
    }
  }

  private updateTowerProgress(now: number): void {
    if (this.gameState.isTowerRising()) {
      const stones = this.gameState.getStones();
      const centerStone = stones[4];
      if (!centerStone) return;

      let startTime = centerStone.stateStartTime;
      if (startTime === 0) {
        startTime = now;
        centerStone.stateStartTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / this.TOWER_DURATION);
      this.gameState.setTowerProgress(progress);

      if (progress >= 1) {
        this.gameState.setTowerRising(false);
      }

      const count = 3 + Math.floor(Math.random() * 3);
      const center = this.getTowerBaseCenter();
      for (let i = 0; i < count; i++) {
        this.spawnParticle(center.x, center.y - this.gameState.getTowerProgress() * this.TOWER_LAYERS * this.TOWER_LAYER_HEIGHT);
      }
    }
  }

  private spawnParticle(x: number, y: number): void {
    const p: Particle = {
      x: x + (Math.random() - 0.5) * 30,
      y: y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1 - Math.random() * 0.5,
      size: 2 + Math.random() * 2,
      alpha: 0.8,
      life: 0,
      maxLife: 60 + Math.random() * 40,
    };
    this.gameState.addParticle(p);
  }

  private updateParticles(): void {
    const particles = this.gameState.getParticles();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 0.8 * (1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.gameState.removeParticle(i);
      }
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private getStoneColor(s: StoneData, now: number): string {
    switch (s.state) {
      case 'correct': {
        const elapsed = now - s.stateStartTime;
        const t = Math.min(1, elapsed / this.CORRECT_FADE_DURATION);
        return this.lerpColor(this.COLOR_STONE_CORRECT, this.COLOR_STONE_FADED, t);
      }
      case 'wrong': {
        const elapsed = now - s.stateStartTime;
        const flash = Math.sin(elapsed / 50) > 0 ? 1 : 0.5;
        return this.hexWithAlpha(this.COLOR_STONE_WRONG, flash);
      }
      case 'fading':
        return this.COLOR_STONE_FADED;
      default:
        return this.COLOR_STONE_DEFAULT;
    }
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawStones(now: number): void {
    const stones = this.gameState.getStones();
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i];
      const l = this.layout[i];
      if (!l) continue;

      const isHovered = this.hoveredStone === i;
      const hoverOffset = isHovered ? -4 : 0;
      const pressOffset = s.pressOffset;
      const offsetY = hoverOffset + pressOffset;

      let shadowBlur = 8;
      let shadowColor = 'rgba(0, 0, 0, 0.4)';
      if (isHovered) {
        shadowBlur = 16;
        shadowColor = 'rgba(0, 0, 0, 0.6)';
      }
      if (s.state === 'correct') {
        shadowBlur = 20;
        shadowColor = 'rgba(241, 196, 15, 0.5)';
      }

      this.ctx.save();
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = shadowBlur;
      this.ctx.shadowOffsetY = 4;

      const color = this.getStoneColor(s, now);
      this.ctx.fillStyle = color;

      this.roundRect(this.ctx, l.x, l.y + offsetY, l.size, l.size, this.stoneRadius);
      this.ctx.fill();

      this.ctx.restore();

      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1;
      this.roundRect(this.ctx, l.x + 2, l.y + offsetY + 2, l.size - 4, l.size - 4, this.stoneRadius - 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawGlows(now: number): void {
    const stones = this.gameState.getStones();
    for (const s of stones) {
      if (s.glowStartTime <= 0) continue;
      const elapsed = now - s.glowStartTime;
      if (elapsed > this.GLOW_DURATION) {
        s.glowStartTime = 0;
        continue;
      }
      const t = elapsed / this.GLOW_DURATION;
      const radius = Math.max(1, this.GLOW_MAX_RADIUS * this.easeOut(t));
      const alpha = 0.6 * (1 - t);
      const center = this.getStoneCenter(s.index);

      const gradient = this.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
      gradient.addColorStop(0, `rgba(241, 196, 15, ${alpha})`);
      gradient.addColorStop(1, 'rgba(241, 196, 15, 0)');

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawTower(now: number): void {
    const progress = this.gameState.getTowerProgress();
    if (progress <= 0) return;

    const center = this.getTowerBaseCenter();
    const visibleLayers = Math.floor(this.TOWER_LAYERS * progress);
    const totalHeight = this.TOWER_LAYERS * this.TOWER_LAYER_HEIGHT;
    const startY = center.y;

    for (let i = 0; i < visibleLayers; i++) {
      const layerT = i / this.TOWER_LAYERS;
      const layerColor = this.lerpColor(this.COLOR_TOWER_BOTTOM, this.COLOR_TOWER_TOP, layerT);
      const baseWidth = this.stoneSize * 0.7;
      const topWidth = this.stoneSize * 0.15;
      const layerWidth = baseWidth + (topWidth - baseWidth) * layerT;
      const layerY = startY - (i + 1) * this.TOWER_LAYER_HEIGHT;

      this.ctx.save();
      this.ctx.fillStyle = layerColor;
      this.ctx.shadowColor = 'rgba(212, 160, 23, 0.5)';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(center.x - layerWidth / 2, layerY + this.TOWER_LAYER_HEIGHT);
      this.ctx.lineTo(center.x + layerWidth / 2, layerY + this.TOWER_LAYER_HEIGHT);
      this.ctx.lineTo(center.x + layerWidth / 2 - 2, layerY);
      this.ctx.lineTo(center.x - layerWidth / 2 + 2, layerY);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    if (progress >= 1) {
      const tipY = startY - totalHeight;
      this.ctx.save();
      this.ctx.fillStyle = this.COLOR_TOWER_TOP;
      this.ctx.shadowColor = 'rgba(241, 196, 15, 0.8)';
      this.ctx.shadowBlur = 16;
      this.ctx.beginPath();
      this.ctx.moveTo(center.x, tipY - 12);
      this.ctx.lineTo(center.x + 8, tipY);
      this.ctx.lineTo(center.x - 8, tipY);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawParticles(): void {
    const particles = this.gameState.getParticles();
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      this.ctx.fillStyle = this.COLOR_PARTICLE + p.alpha + ')';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}
