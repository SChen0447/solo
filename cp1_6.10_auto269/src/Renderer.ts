import { GameEngine, BOARD_SIZE, PLAYER_COLORS, Position, CellState, Player } from './GameEngine';

const CELL_SIZE = 40;
const CELL_GAP = 2;
const BOARD_PADDING = 0;
const MAX_PARTICLES = 100;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private scale: number;
  private particles: Particle[];
  private particlePool: Particle[];

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.scale = 1;
    this.particles = [];
    this.particlePool = [];
    this.resizeCanvas();
  }

  resizeCanvas(): void {
    const totalSize = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * CELL_GAP + BOARD_PADDING * 2;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = totalSize * dpr;
    this.canvas.height = totalSize * dpr;
    this.canvas.style.width = `${totalSize}px`;
    this.canvas.style.height = `${totalSize}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  getBoardPixelSize(): number {
    return BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * CELL_GAP + BOARD_PADDING * 2;
  }

  pixelToCell(px: number, py: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (px - rect.left) / this.scale - BOARD_PADDING;
    const y = (py - rect.top) / this.scale - BOARD_PADDING;
    const cellWithGap = CELL_SIZE + CELL_GAP;
    
    if (x < 0 || y < 0) return null;
    
    const cellX = Math.floor(x / cellWithGap);
    const cellY = Math.floor(y / cellWithGap);
    
    if (cellX >= BOARD_SIZE || cellY >= BOARD_SIZE) return null;
    
    const offsetX = x - cellX * cellWithGap;
    const offsetY = y - cellY * cellWithGap;
    if (offsetX > CELL_SIZE || offsetY > CELL_SIZE) return null;
    
    return { x: cellX, y: cellY };
  }

  spawnParticles(cellX: number, cellY: number, color: string, count: number): void {
    const centerX = this.getCellCenterX(cellX);
    const centerY = this.getCellCenterY(cellY);
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      
      const particle: Particle = this.particlePool.length > 0 
        ? this.particlePool.pop()! 
        : { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '', size: 0 };
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      
      particle.x = centerX;
      particle.y = centerY;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.maxLife = 30 + Math.random() * 30;
      particle.life = particle.maxLife;
      particle.color = Math.random() > 0.5 ? color : lightenColor(color, 0.3);
      particle.size = 2 + Math.random() * 3;
      
      this.particles.push(particle);
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      
      if (p.life <= 0) {
        this.particlePool.push(p);
        this.particles.splice(i, 1);
      }
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private getCellCenterX(cellX: number): number {
    return BOARD_PADDING + cellX * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  }

  private getCellCenterY(cellY: number): number {
    return BOARD_PADDING + cellY * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
  }

  private getCellX(cellX: number): number {
    return BOARD_PADDING + cellX * (CELL_SIZE + CELL_GAP);
  }

  private getCellY(cellY: number): number {
    return BOARD_PADDING + cellY * (CELL_SIZE + CELL_GAP);
  }

  private getCellColor(cell: CellState): string {
    if (cell.assimilating && cell.assimilationFrom !== null && cell.owner !== null) {
      const fromColor = PLAYER_COLORS[cell.assimilationFrom];
      const toColor = PLAYER_COLORS[cell.owner];
      return lerpColor(fromColor, toColor, cell.assimilationProgress);
    }
    if (cell.owner !== null) {
      return PLAYER_COLORS[cell.owner];
    }
    return 'rgba(255, 255, 255, 0.05)';
  }

  render(hoverCell: Position | null, selectedCell: Position | null): void {
    this.updateParticles();
    
    const board = this.engine.getBoard();
    const totalSize = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * CELL_GAP + BOARD_PADDING * 2;
    
    this.ctx.clearRect(0, 0, totalSize, totalSize);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cx = this.getCellX(x);
        const cy = this.getCellY(y);
        this.ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
      }
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = board[y][x];
        if (cell.owner === null && !cell.assimilating) continue;
        
        const cx = this.getCellX(x);
        const cy = this.getCellY(y);
        const isHover = hoverCell && hoverCell.x === x && hoverCell.y === y;
        const isSelected = selectedCell && selectedCell.x === x && selectedCell.y === y;
        const isFuseFirst = this.engine.getFuseFirstCell();
        const isFuseHighlight = isFuseFirst && isFuseFirst.x === x && isFuseFirst.y === y;
        
        let drawX = cx;
        let drawY = cy;
        let drawSize = CELL_SIZE;
        
        if (isHover || cell.placeAnimationProgress < 1) {
          const scale = isHover ? 1.05 : (0.5 + cell.placeAnimationProgress * 0.5);
          drawSize = CELL_SIZE * scale;
          drawX = cx + (CELL_SIZE - drawSize) / 2;
          drawY = cy + (CELL_SIZE - drawSize) / 2;
        }
        
        const color = this.getCellColor(cell);
        let fillColor = color;
        
        if (isHover) {
          fillColor = lightenColor(color.startsWith('#') ? color : PLAYER_COLORS[cell.owner as Player], 0.2);
        }
        
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(drawX, drawY, drawSize, drawSize);
        
        if (cell.assimilating) {
          const flash = Math.sin(cell.assimilationProgress * Math.PI * 4) * 0.3 + 0.7;
          this.ctx.globalAlpha = flash;
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(drawX, drawY, drawSize, drawSize);
          this.ctx.globalAlpha = 1;
        }
        
        if (cell.isReinforced) {
          const borderWidth = 3;
          this.ctx.strokeStyle = '#F1C40F';
          this.ctx.lineWidth = borderWidth;
          this.ctx.strokeRect(
            drawX + borderWidth / 2, 
            drawY + borderWidth / 2, 
            drawSize - borderWidth, 
            drawSize - borderWidth
          );
          
          const timeLeft = Math.max(0, cell.reinforceEndTime - performance.now());
          const progress = 1 - timeLeft / 2000;
          this.ctx.beginPath();
          this.ctx.arc(
            drawX + drawSize / 2, 
            drawY + drawSize / 2, 
            drawSize / 2 + 4, 
            -Math.PI / 2, 
            -Math.PI / 2 + progress * Math.PI * 2
          );
          this.ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
        
        if (isSelected || isFuseHighlight) {
          this.ctx.save();
          this.ctx.setLineDash([4, 4]);
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(
            drawX + 1, 
            drawY + 1, 
            drawSize - 2, 
            drawSize - 2
          );
          this.ctx.restore();
        }
      }
    }
    
    const fuseFirst = this.engine.getFuseFirstCell();
    if (fuseFirst && hoverCell) {
      if ((fuseFirst.x === hoverCell.x || fuseFirst.y === hoverCell.y) && 
          !(fuseFirst.x === hoverCell.x && fuseFirst.y === hoverCell.y)) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        
        const minX = Math.min(fuseFirst.x, hoverCell.x);
        const maxX = Math.max(fuseFirst.x, hoverCell.x);
        const minY = Math.min(fuseFirst.y, hoverCell.y);
        const maxY = Math.max(fuseFirst.y, hoverCell.y);
        
        if (fuseFirst.y === hoverCell.y) {
          for (let cx = minX; cx <= maxX; cx++) {
            const cell = board[hoverCell.y][cx];
            if (cell.owner === null) {
              const cx_ = this.getCellX(cx);
              const cy_ = this.getCellY(hoverCell.y);
              this.ctx.fillRect(cx_, cy_, CELL_SIZE, CELL_SIZE);
            }
          }
        } else {
          for (let cy = minY; cy <= maxY; cy++) {
            const cell = board[cy][hoverCell.x];
            if (cell.owner === null) {
              const cx_ = this.getCellX(hoverCell.x);
              const cy_ = this.getCellY(cy);
              this.ctx.fillRect(cx_, cy_, CELL_SIZE, CELL_SIZE);
            }
          }
        }
        this.ctx.restore();
      }
    }

    this.drawParticles();
  }

  spawnParticlesForEvents(): void {
    const assimilationEvents = this.engine.consumeAssimilationEvents();
    for (const ev of assimilationEvents) {
      this.spawnParticles(ev.pos.x, ev.pos.y, PLAYER_COLORS[ev.to], 8);
    }
    
    const placeEvents = this.engine.consumePlaceEvents();
    for (const ev of placeEvents) {
      this.spawnParticles(ev.pos.x, ev.pos.y, PLAYER_COLORS[ev.player], 6);
    }
  }
}
