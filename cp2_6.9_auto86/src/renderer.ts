import { Player } from './player';

export interface Platform {
  x: number;
  y: number;
  beatIndex: number;
  hit: boolean;
  spawnedStar: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  rotation: number;
  rotationDir: number;
  passed: boolean;
}

export interface Star {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  collected: boolean;
}

const COLORS = {
  bgTop: '#0F0C29',
  bgBottom: '#302B63',
  trackLow: '#4B3B47',
  trackHigh: '#FF6B6B',
  platform: '#FFD700',
  player: '#00F5FF',
  obstacle: '#FF3366',
  star: '#FFD700',
  hudBg: 'rgba(0, 0, 0, 0.5)',
  comboGreen: '#00FF88'
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  private hexCache: { x: number; y: number }[][] = [];
  private hexCacheKey: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.hexCache = [];
    this.hexCacheKey = '';
  }

  clear(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(1, COLORS.bgBottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private getHexGrid(trackX: number, trackWidth: number, scrollX: number): { x: number; y: number }[][] {
    const cacheKey = `${trackX}-${trackWidth}-${this.height}`;
    if (this.hexCacheKey === cacheKey && this.hexCache.length > 0) {
      return this.hexCache;
    }

    const hexSize = 24;
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;
    const trackY = this.height * 0.55;
    const trackHeight = this.height * 0.35;
    const grid: { x: number; y: number }[][] = [];

    const cols = Math.ceil(trackWidth / (hexWidth * 0.75)) + 4;
    const rows = Math.ceil(trackHeight / (hexHeight * 0.5)) + 2;

    for (let row = 0; row < rows; row++) {
      const rowPoints: { x: number; y: number }[] = [];
      for (let col = 0; col < cols; col++) {
        const offsetX = (row % 2) * (hexWidth * 0.375);
        const x = trackX - hexWidth + col * hexWidth * 0.75 + offsetX;
        const y = trackY - hexHeight + row * hexHeight * 0.5;
        rowPoints.push({ x, y });
      }
      grid.push(rowPoints);
    }

    this.hexCache = grid;
    this.hexCacheKey = cacheKey;
    return grid;
  }

  drawTrack(energy: number, scrollX: number): void {
    const trackWidth = this.width * 0.8;
    const trackX = (this.width - trackWidth) / 2;
    const trackY = this.height * 0.55;
    const trackHeight = this.height * 0.35;

    const trackGradient = this.ctx.createLinearGradient(0, trackY, 0, trackY + trackHeight);
    trackGradient.addColorStop(0, 'rgba(15, 12, 41, 0.6)');
    trackGradient.addColorStop(1, 'rgba(48, 43, 99, 0.8)');
    this.ctx.fillStyle = trackGradient;
    this.ctx.fillRect(trackX, trackY, trackWidth, trackHeight);

    this.ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(trackX, trackY);
    this.ctx.lineTo(trackX, trackY + trackHeight);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(trackX + trackWidth, trackY);
    this.ctx.lineTo(trackX + trackWidth, trackY + trackHeight);
    this.ctx.stroke();

    const gridColor = this.lerpColor(COLORS.trackLow, COLORS.trackHigh, energy);
    const hexSize = 24;
    const grid = this.getHexGrid(trackX, trackWidth, scrollX);

    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.6 + energy * 0.3;

    const scrollOffset = (scrollX % (hexSize * 1.5));

    for (const row of grid) {
      this.ctx.beginPath();
      for (const point of row) {
        const px = point.x - scrollOffset;
        if (px < trackX - hexSize * 2 || px > trackX + trackWidth + hexSize * 2) continue;

        this.ctx.moveTo(px + hexSize * Math.cos(0), point.y + hexSize * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
          const angle = (i * Math.PI) / 3;
          this.ctx.lineTo(px + hexSize * Math.cos(angle), point.y + hexSize * Math.sin(angle));
        }
      }
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;

    const glowGradient = this.ctx.createLinearGradient(0, trackY - 10, 0, trackY + 10);
    glowGradient.addColorStop(0, 'rgba(255, 107, 107, 0)');
    glowGradient.addColorStop(0.5, `rgba(255, 107, 107, ${0.2 + energy * 0.3})`);
    glowGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(trackX, trackY - 5, trackWidth, 10);
  }

  drawBeatPlatforms(platforms: Platform[], playerX: number): void {
    for (const p of platforms) {
      if (p.x < -100 || p.x > this.width + 100) continue;

      const distToPlayer = Math.abs(p.x - playerX);
      const proximityAlpha = Math.max(0.4, 1 - distToPlayer / 400);

      this.ctx.save();
      this.ctx.shadowColor = COLORS.platform;
      this.ctx.shadowBlur = p.hit ? 5 : 15;
      this.ctx.globalAlpha = p.hit ? 0.3 : proximityAlpha;

      const gradient = this.ctx.createLinearGradient(p.x - 20, p.y, p.x + 20, p.y);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
      this.ctx.fillStyle = gradient;

      this.roundRect(p.x - 20, p.y - 10, 40, 20, 4);
      this.ctx.fill();

      if (!p.hit && distToPlayer < 200) {
        this.ctx.globalAlpha = 0.3 + 0.3 * Math.sin(performance.now() / 100);
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
        this.ctx.strokeStyle = COLORS.platform;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  drawObstacles(obstacles: Obstacle[]): void {
    for (const o of obstacles) {
      if (o.x < -50 || o.x > this.width + 50) continue;

      this.ctx.save();
      this.ctx.translate(o.x, o.y);
      this.ctx.rotate((o.rotation * Math.PI) / 180);

      this.ctx.shadowColor = COLORS.obstacle;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = COLORS.obstacle;

      this.ctx.beginPath();
      this.ctx.moveTo(0, -12);
      this.ctx.lineTo(10, 10);
      this.ctx.lineTo(-10, 10);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -8);
      this.ctx.lineTo(4, 2);
      this.ctx.lineTo(-4, 2);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  drawStars(stars: Star[]): void {
    for (const s of stars) {
      if (s.collected) continue;
      if (s.x < -50 || s.x > this.width + 50) continue;

      this.ctx.save();
      this.ctx.globalAlpha = s.alpha;
      this.ctx.shadowColor = COLORS.star;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = COLORS.star;

      this.drawStar(s.x, s.y, 5, 6, 3);

      this.ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawPlayer(player: Player): void {
    for (const ripple of player.ripples) {
      this.ctx.save();
      this.ctx.globalAlpha = ripple.alpha;
      this.ctx.strokeStyle = COLORS.player;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.translate(player.x, player.y);
    this.ctx.scale(player.scale, player.scale);

    this.ctx.shadowColor = COLORS.player;
    this.ctx.shadowBlur = 25;

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
    if (player.flashTimer > 0) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, COLORS.player);
      gradient.addColorStop(1, 'rgba(0, 245, 255, 0.5)');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, COLORS.player);
      gradient.addColorStop(1, 'rgba(0, 245, 255, 0.3)');
    }
    this.ctx.fillStyle = gradient;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(-3, -3, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawHUD(score: number, combo: number, lives: number, maxLives: number): void {
    this.ctx.fillStyle = COLORS.hudBg;
    this.ctx.fillRect(0, 0, this.width, 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Consolas, monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(score.toString().padStart(6, '0'), 24, 20);

    if (combo > 0) {
      const comboAlpha = combo > 10 ? (0.5 + 0.5 * Math.sin(performance.now() / 125)) : 1;
      this.ctx.save();
      this.ctx.globalAlpha = comboAlpha;
      this.ctx.fillStyle = COLORS.comboGreen;
      this.ctx.shadowColor = COLORS.comboGreen;
      this.ctx.shadowBlur = combo > 10 ? 10 : 0;
      this.ctx.fillText(`COMBO ${combo}`, 160, 20);
      this.ctx.restore();
    }

    const heartSize = 18;
    const heartGap = 6;
    const heartsStartX = this.width - (maxLives * (heartSize + heartGap)) + heartGap - 10;

    for (let i = 0; i < maxLives; i++) {
      const hx = heartsStartX + i * (heartSize + heartGap);
      const hy = 20;
      const alive = i < lives;

      this.drawHeart(hx, hy, alive);
    }
  }

  private drawHeart(x: number, y: number, alive: boolean): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    if (alive) {
      this.ctx.fillStyle = '#FF3366';
      this.ctx.shadowColor = '#FF3366';
      this.ctx.shadowBlur = 5;
    } else {
      this.ctx.fillStyle = '#555555';
      this.ctx.shadowBlur = 0;
    }

    const w = 9;
    const h = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.3);
    this.ctx.bezierCurveTo(-w * 0.5, -h * 0.5, -w, h * 0.1, 0, h);
    this.ctx.bezierCurveTo(w, h * 0.1, w * 0.5, -h * 0.5, 0, h * 0.3);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPerfectFlash(alpha: number): void {
    if (alpha <= 0) return;
    const gradient = this.ctx.createLinearGradient(0, this.height * 0.5, 0, this.height);
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0)');
    gradient.addColorStop(1, `rgba(0, 245, 255, ${alpha * 0.4})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
  }

  drawJudgementText(type: string, x: number, y: number): void {
    const colors: Record<string, string> = {
      perfect: '#FFD700',
      good: '#00FF88',
      ok: '#00F5FF',
      miss: '#FF6B6B'
    };
    const labels: Record<string, string> = {
      perfect: 'PERFECT',
      good: 'GOOD',
      ok: 'OK',
      miss: 'MISS'
    };

    this.ctx.save();
    this.ctx.fillStyle = colors[type] || '#ffffff';
    this.ctx.shadowColor = colors[type] || '#ffffff';
    this.ctx.shadowBlur = 15;
    this.ctx.font = 'bold 28px Consolas, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(labels[type] || type.toUpperCase(), x, y);
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
