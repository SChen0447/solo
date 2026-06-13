import type { Board, GridPoint } from './board';

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Wave {
  x: number;
  y: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  startTime: number;
  duration: number;
  rotation: number;
  rotationSpeed: number;
}

const PIECE_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

export class Piece {
  public id: number;
  public x: number;
  public y: number;
  public gridX: number;
  public gridY: number;
  public color: string;
  public isMirror: boolean;
  public velocityX: number;
  public velocityY: number;
  public moving: boolean;
  public trail: TrailPoint[];
  public lastWaveTime: number;
  public targetX: number;
  public targetY: number;

  private static pieceIdCounter: number = 0;
  private static readonly PIECE_RADIUS: number = 6;
  private static readonly MOVE_SPEED: number = 40 / 0.3;
  private static readonly TRAIL_DURATION: number = 1500;
  private static readonly WAVE_INTERVAL: number = 500;

  constructor(
    gridX: number,
    gridY: number,
    x: number,
    y: number,
    color?: string,
    isMirror: boolean = false
  ) {
    this.id = Piece.pieceIdCounter++;
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = x;
    this.y = y;
    this.color = color || PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
    this.isMirror = isMirror;
    this.velocityX = 0;
    this.velocityY = 0;
    this.moving = false;
    this.trail = [];
    this.lastWaveTime = 0;
    this.targetX = x;
    this.targetY = y;
  }

  public setDirection(fromGrid: GridPoint, toGrid: GridPoint): void {
    const dx = toGrid.gridX - fromGrid.gridX;
    const dy = toGrid.gridY - fromGrid.gridY;
    this.velocityX = dx;
    this.velocityY = dy;
    this.moving = true;
  }

  public setMirrorDirection(fromGrid: GridPoint, toGrid: GridPoint): void {
    const dx = -(toGrid.gridX - fromGrid.gridX);
    const dy = -(toGrid.gridY - fromGrid.gridY);
    this.velocityX = dx;
    this.velocityY = dy;
    this.moving = true;
  }

  public update(deltaTime: number, currentTime: number, board: Board): { bounced: boolean; waves: Wave[] } {
    const result: { bounced: boolean; waves: Wave[] } = { bounced: false, waves: [] };

    if (this.trail.length > 0) {
      const cutoffTime = currentTime - Piece.TRAIL_DURATION;
      this.trail = this.trail.filter(p => p.timestamp > cutoffTime);
    }

    if (this.moving) {
      if (this.trail.length === 0 || 
          Math.hypot(this.x - this.trail[this.trail.length - 1].x, 
                     this.y - this.trail[this.trail.length - 1].y) > 5) {
        this.trail.push({ x: this.x, y: this.y, timestamp: currentTime });
      }

      this.x += this.velocityX * Piece.MOVE_SPEED * (deltaTime / 1000);
      this.y += this.velocityY * Piece.MOVE_SPEED * (deltaTime / 1000) * 0.5;

      const collision = board.checkBoundaryCollision(this.x, this.y);
      if (collision.hit) {
        this.velocityX *= collision.newVx;
        this.velocityY *= collision.newVy;
        result.bounced = true;
      }

      if (currentTime - this.lastWaveTime > Piece.WAVE_INTERVAL) {
        result.waves.push({
          x: this.x,
          y: this.y,
          color: this.color,
          startTime: currentTime,
          duration: 1000
        });
        this.lastWaveTime = currentTime;
      }
    }

    return result;
  }

  public draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    this.drawTrail(ctx, currentTime);

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, Piece.PIECE_RADIUS * 2
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.6, this.color);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(this.x, this.y, Piece.PIECE_RADIUS * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, Piece.PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, Piece.PIECE_RADIUS * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (this.trail.length < 2) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      const age = currentTime - curr.timestamp;
      const alpha = Math.max(0.2, 1 - age / Piece.TRAIL_DURATION);

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = this.hexToRgba(this.color, alpha);
      ctx.stroke();
    }

    if (this.trail.length > 0) {
      const last = this.trail[this.trail.length - 1];
      const age = currentTime - last.timestamp;
      const alpha = Math.max(0.2, 1 - age / Piece.TRAIL_DURATION);

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.hexToRgba(this.color, alpha);
      ctx.stroke();
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public containsPoint(px: number, py: number): boolean {
    const dist = Math.hypot(px - this.x, py - this.y);
    return dist <= Piece.PIECE_RADIUS * 2;
  }

  public createCollectParticles(currentTime: number): Particle[] {
    const particles: Particle[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.color,
        startTime: currentTime,
        duration: 800,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    return particles;
  }

  public static getComplementaryColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const { h, s, l } = Piece.rgbToHsl(r, g, b);
    const newH = (h + 180) % 360;
    const { r: nr, g: ng, b: nb } = Piece.hslToRgb(newH, s, l);
    
    return `#${Piece.componentToHex(nr)}${Piece.componentToHex(ng)}${Piece.componentToHex(nb)}`;
  }

  private static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s, l };
  }

  private static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private static componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
}
