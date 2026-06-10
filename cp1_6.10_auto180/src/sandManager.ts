export type StoneShape = 'circle' | 'ellipse' | 'triangle' | 'rectangle' | 'irregular';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  color: string;
  vx: number;
  vy: number;
}

interface Stone {
  x: number;
  y: number;
  shape: StoneShape;
  size: number;
  color: string;
  animOffsetX?: number;
  animOffsetY?: number;
  animOpacity?: number;
}

const SAND_COLORS = ['#c2a77a', '#b8956a', '#a37c52', '#8c663a'];
const STONE_COLORS = ['#4a4a4a', '#4e4e4e', '#525252', '#565656', '#5a5a5a'];
const GRID_COLS = 200;
const GRID_ROWS = 200;
const PARTICLE_SIZE = 2;
const FLOW_SPEED = 0.5;
const WIND_SPEED = 0.05;
const INFLUENCE_RADIUS = 30;
const STONE_SHADOW_RADIUS = 8;
const RESET_DURATION = 300;

export class SandManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private stones: Stone[] = [];
  private gridCols: number = GRID_COLS;
  private gridRows: number = GRID_ROWS;
  private cellSize: number = 4;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private isDrawing: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private brushWidth: number = 27.5;
  private selectedStone: StoneShape | null = null;
  private frameCount: number = 0;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.initParticles();
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('sand:brushWidthChange', ((e: CustomEvent<{ width: number }>) => {
      this.brushWidth = 5 + (e.detail.width / 100) * 45;
    }) as EventListener);

    window.addEventListener('sand:stoneSelect', ((e: CustomEvent<{ shape: StoneShape | null }>) => {
      this.selectedStone = e.detail.shape;
      this.canvas.style.cursor = this.selectedStone ? 'crosshair' : 'default';
    }) as EventListener);

    window.addEventListener('sand:reset', (() => {
      this.startResetAnimation();
    }) as EventListener);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.cellSize = Math.max(2, Math.min(width / this.gridCols, height / this.gridRows));
    this.offsetX = (width - this.gridCols * this.cellSize) / 2;
    this.offsetY = (height - this.gridRows * this.cellSize) / 2;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const newOriginX = this.offsetX + col * this.cellSize + this.cellSize / 2;
      const newOriginY = this.offsetY + row * this.cellSize + this.cellSize / 2;
      const dx = newOriginX - p.originX;
      const dy = newOriginY - p.originY;
      p.originX = newOriginX;
      p.originY = newOriginY;
      p.x += dx;
      p.y += dy;
    }
  }

  private initParticles(): void {
    this.particles = [];
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;
    this.cellSize = Math.max(2, Math.min(width / this.gridCols, height / this.gridRows));
    this.offsetX = (width - this.gridCols * this.cellSize) / 2;
    this.offsetY = (height - this.gridRows * this.cellSize) / 2;

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const originX = this.offsetX + col * this.cellSize + this.cellSize / 2;
        const originY = this.offsetY + row * this.cellSize + this.cellSize / 2;
        this.particles.push({
          x: originX,
          y: originY,
          originX,
          originY,
          color: SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)],
          vx: 0,
          vy: 0,
        });
      }
    }
  }

  public setMouseDown(x: number, y: number): void {
    if (this.selectedStone) {
      this.placeStone(x, y);
      return;
    }
    this.isDrawing = true;
    this.mouseX = x;
    this.mouseY = y;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  public setMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public setMouseUp(): void {
    this.isDrawing = false;
  }

  private placeStone(x: number, y: number): void {
    if (!this.selectedStone) return;
    const stone: Stone = {
      x,
      y,
      shape: this.selectedStone,
      size: 40,
      color: STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)],
    };
    this.stones.push(stone);
    this.flattenSandAroundStone(x, y);
    this.selectedStone = null;
    this.canvas.style.cursor = 'default';
    window.dispatchEvent(new CustomEvent('sand:stoneSelect', { detail: { shape: null } }));
  }

  private flattenSandAroundStone(cx: number, cy: number): void {
    const radius = 20 + STONE_SHADOW_RADIUS;
    const radiusSq = radius * radius;
    for (const p of this.particles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      if (dx * dx + dy * dy < radiusSq) {
        p.x = p.originX;
        p.y = p.originY;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  private startResetAnimation(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    for (const stone of this.stones) {
      stone.animOffsetX = 0;
      stone.animOffsetY = 0;
      stone.animOpacity = 1;
    }
  }

  private updateResetAnimation(now: number): void {
    if (!this.isResetting) return;
    const elapsed = now - this.resetStartTime;
    const progress = Math.min(1, elapsed / RESET_DURATION);

    if (progress < 0.5) {
      const t = progress * 2;
      for (const p of this.particles) {
        const blurAmount = Math.sin(t * Math.PI) * 3;
        p.x = p.originX + (Math.random() - 0.5) * blurAmount * 2;
        p.y = p.originY + (Math.random() - 0.5) * blurAmount * 2;
      }
    } else {
      const t = (progress - 0.5) * 2;
      for (const p of this.particles) {
        p.x = p.originX;
        p.y = p.originY;
        p.vx = 0;
        p.vy = 0;
      }
    }

    for (const stone of this.stones) {
      const targetX = this.canvas.width - stone.x;
      const targetY = this.canvas.height - stone.y;
      stone.animOffsetX = targetX * progress;
      stone.animOffsetY = targetY * progress;
      stone.animOpacity = 1 - progress;
    }

    if (progress >= 1) {
      this.isResetting = false;
      this.stones = [];
      this.initParticles();
    }
  }

  private updateParticles(): void {
    if (this.isResetting) return;

    if (this.isDrawing) {
      const dx = this.mouseX - this.lastMouseX;
      const dy = this.mouseY - this.lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const radius = INFLUENCE_RADIUS + this.brushWidth;
        const radiusSq = radius * radius;
        const brushHalf = this.brushWidth / 2;

        for (const p of this.particles) {
          const px = p.x - this.mouseX;
          const py = p.y - this.mouseY;
          const distSq = px * px + py * py;
          if (distSq < radiusSq) {
            const perpX = -dirY;
            const perpY = dirX;
            const perpDist = Math.abs(px * perpX + py * perpY);
            if (perpDist < brushHalf + INFLUENCE_RADIUS) {
              const influence = 1 - Math.sqrt(distSq) / radius;
              p.vx = dirX * FLOW_SPEED * influence;
              p.vy = dirY * FLOW_SPEED * influence;
            }
          }
        }
      }
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
    }

    this.frameCount++;
    const applyWind = this.frameCount % 2 === 0;

    for (const p of this.particles) {
      if (applyWind && !this.isDrawing) {
        p.vx += (Math.random() - 0.5) * WIND_SPEED;
        p.vy += (Math.random() - 0.5) * WIND_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;

      p.vx *= 0.98;
      p.vy *= 0.98;

      const toOriginX = p.originX - p.x;
      const toOriginY = p.originY - p.y;
      p.vx += toOriginX * 0.0005;
      p.vy += toOriginY * 0.0005;

      p.x = Math.max(this.offsetX, Math.min(this.canvas.width - this.offsetX, p.x));
      p.y = Math.max(this.offsetY, Math.min(this.canvas.height - this.offsetY, p.y));
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#d4c9a8');
    gradient.addColorStop(1, '#b8a98a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
    }

    for (const stone of this.stones) {
      this.renderStone(stone);
    }
  }

  private renderStone(stone: Stone): void {
    const ctx = this.ctx;
    const offsetX = stone.animOffsetX ?? 0;
    const offsetY = stone.animOffsetY ?? 0;
    const opacity = stone.animOpacity ?? 1;
    const x = stone.x + offsetX;
    const y = stone.y + offsetY;
    const s = stone.size;

    ctx.save();
    ctx.globalAlpha = opacity * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 6, s / 2 + STONE_SHADOW_RADIUS, s / 2.5 + STONE_SHADOW_RADIUS, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = stone.color;
    ctx.beginPath();

    switch (stone.shape) {
      case 'circle':
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        break;
      case 'ellipse':
        ctx.ellipse(x, y, s / 2, s / 3, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
        ctx.moveTo(x, y - s / 2);
        ctx.lineTo(x - s / 2, y + s / 2);
        ctx.lineTo(x + s / 2, y + s / 2);
        ctx.closePath();
        break;
      case 'rectangle':
        ctx.rect(x - s / 2, y - s / 2.5, s, s / 1.25);
        break;
      case 'irregular':
        ctx.moveTo(x - s / 2, y + s / 4);
        ctx.quadraticCurveTo(x - s / 2.2, y - s / 2, x, y - s / 2.2);
        ctx.quadraticCurveTo(x + s / 2, y - s / 2.5, x + s / 2.2, y + s / 6);
        ctx.quadraticCurveTo(x + s / 3, y + s / 2, x - s / 4, y + s / 2.2);
        ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.restore();
  }

  public tick(now: number): void {
    if (this.isResetting) {
      this.updateResetAnimation(now);
    } else {
      this.updateParticles();
    }
    this.render();
  }
}
