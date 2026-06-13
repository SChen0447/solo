import { gsap } from 'gsap';

export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  explored: boolean;
  visible: boolean;
}

export interface WallVibration {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  intensity: number;
  startTime: number;
  duration: number;
}

export interface PulseAnimation {
  active: boolean;
  progress: number;
  center: Position;
  maxRadius: number;
}

export const CELL_SIZE = 12;
export const INITIAL_MAZE_SIZE = 15;
export const MAZE_SIZE_INCREMENT = 5;
export const MIN_SONAR_RADIUS = 2;
export const MAX_SONAR_RADIUS = 8;
export const WALL_VIBRATION_DURATION = 300;
export const PULSE_DURATION = 2000;

export const COLORS = {
  background: '#0a0a0a',
  wallDark: '#2a2a2a',
  wallLight: '#4a4a4a',
  floorStart: '#8b7355',
  floorEnd: '#654321',
  exploredGlow: 'rgba(255, 215, 0, 0.15)',
  sonarGlow: 'rgba(255, 255, 255, 0.25)',
  player: '#ffffff',
  gem: '#ffd700',
  vibration: 'rgba(255, 255, 255, 0.8)',
  pulse: 'rgba(255, 215, 0, 0.6)',
};

export class Maze {
  private size: number;
  private cells: Cell[][];
  private playerPos: Position;
  private vibrations: WallVibration[] = [];
  private pulse: PulseAnimation = { active: false, progress: 0, center: { x: 0, y: 0 }, maxRadius: 0 };
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private sonarRadius: number = MIN_SONAR_RADIUS;
  private targetSonarRadius: number = MIN_SONAR_RADIUS;
  private noiseCanvas: OffscreenCanvas | null = null;

  constructor(size: number, canvas: HTMLCanvasElement) {
    this.size = size;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cells = this.generateMaze(size);
    this.playerPos = { x: 0, y: 0 };
    this.generateNoiseTexture();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private generateNoiseTexture(): void {
    this.noiseCanvas = new OffscreenCanvas(CELL_SIZE, CELL_SIZE);
    const nctx = this.noiseCanvas.getContext('2d')!;
    const imgData = nctx.createImageData(CELL_SIZE, CELL_SIZE);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = Math.random() * 30;
      imgData.data[i] = 42 + noise;
      imgData.data[i + 1] = 42 + noise;
      imgData.data[i + 2] = 42 + noise;
      imgData.data[i + 3] = 255;
    }
    nctx.putImageData(imgData, 0, 0);
  }

  private generateMaze(size: number): Cell[][] {
    const cells: Cell[][] = [];
    for (let y = 0; y < size; y++) {
      cells[y] = [];
      for (let x = 0; x < size; x++) {
        cells[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          explored: false,
          visible: false,
        };
      }
    }

    const stack: Cell[] = [];
    const startCell = cells[0][0];
    startCell.explored = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(cells, current, size);

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.explored = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        cells[y][x].explored = false;
      }
    }

    return cells;
  }

  private getUnvisitedNeighbors(cells: Cell[][], cell: Cell, size: number): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !cells[y - 1][x].explored) neighbors.push(cells[y - 1][x]);
    if (x < size - 1 && !cells[y][x + 1].explored) neighbors.push(cells[y][x + 1]);
    if (y < size - 1 && !cells[y + 1][x].explored) neighbors.push(cells[y + 1][x]);
    if (x > 0 && !cells[y][x - 1].explored) neighbors.push(cells[y][x - 1]);

    return neighbors;
  }

  private removeWall(current: Cell, next: Cell): void {
    const dx = next.x - current.x;
    const dy = next.y - current.y;

    if (dx === 1) {
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      current.walls.left = false;
      next.walls.right = false;
    } else if (dy === 1) {
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  public resize(): void {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const mazePixelSize = this.size * CELL_SIZE;

    const scaleX = (containerWidth - 80) / mazePixelSize;
    const scaleY = (containerHeight - 80) / mazePixelSize;
    this.scale = Math.min(scaleX, scaleY, 2);

    const scaledSize = mazePixelSize * this.scale;
    this.offsetX = (containerWidth - scaledSize) / 2;
    this.offsetY = (containerHeight - scaledSize) / 2;

    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
  }

  public regenerate(size: number): void {
    this.size = size;
    this.cells = this.generateMaze(size);
    this.playerPos = { x: 0, y: 0 };
    this.vibrations = [];
    this.pulse = { active: false, progress: 0, center: { x: 0, y: 0 }, maxRadius: 0 };
    this.sonarRadius = MIN_SONAR_RADIUS;
    this.targetSonarRadius = MIN_SONAR_RADIUS;
    this.resize();
  }

  public getPlayerPos(): Position {
    return { ...this.playerPos };
  }

  public getSize(): number {
    return this.size;
  }

  public getCells(): Cell[][] {
    return this.cells;
  }

  public getScale(): number {
    return this.scale;
  }

  public getOffsetX(): number {
    return this.offsetX;
  }

  public getOffsetY(): number {
    return this.offsetY;
  }

  public setSonarRadius(radius: number): void {
    this.targetSonarRadius = Math.max(MIN_SONAR_RADIUS, Math.min(MAX_SONAR_RADIUS, radius));
    gsap.to(this, {
      sonarRadius: this.targetSonarRadius,
      duration: 0.15,
      ease: 'power2.out',
    });
  }

  public movePlayer(dx: number, dy: number): boolean {
    const newX = this.playerPos.x + dx;
    const newY = this.playerPos.y + dy;

    if (newX < 0 || newX >= this.size || newY < 0 || newY >= this.size) {
      return false;
    }

    const currentCell = this.cells[this.playerPos.y][this.playerPos.x];

    if (dx === 1 && currentCell.walls.right) return false;
    if (dx === -1 && currentCell.walls.left) return false;
    if (dy === 1 && currentCell.walls.bottom) return false;
    if (dy === -1 && currentCell.walls.top) return false;

    gsap.to(this.playerPos, {
      x: newX,
      y: newY,
      duration: 0.1,
      ease: 'power1.out',
    });

    return true;
  }

  public addWallVibration(cellX: number, cellY: number, side: 'top' | 'right' | 'bottom' | 'left', intensity: number): void {
    this.vibrations.push({
      x: cellX,
      y: cellY,
      side,
      intensity,
      startTime: performance.now(),
      duration: WALL_VIBRATION_DURATION,
    });
  }

  public triggerPulse(center: Position): void {
    this.pulse = {
      active: true,
      progress: 0,
      center,
      maxRadius: this.size * CELL_SIZE * this.scale,
    };

    gsap.to(this.pulse, {
      progress: 1,
      duration: PULSE_DURATION / 1000,
      ease: 'power2.out',
      onComplete: () => {
        this.pulse.active = false;
      },
    });
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (x !== x2 || y !== y2) {
      const e2 = 2 * err;
      const cell = this.cells[y][x];

      if (e2 > -dy) {
        err -= dy;
        const nextX = x + sx;
        if (nextX !== x2 || y !== y2) {
          if ((sx === 1 && cell.walls.right) || (sx === -1 && cell.walls.left)) {
            return false;
          }
        }
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        const nextY = y + sy;
        if (x !== x2 || nextY !== y2) {
          if ((sy === 1 && cell.walls.bottom) || (sy === -1 && cell.walls.top)) {
            return false;
          }
        }
        y += sy;
      }
    }
    return true;
  }

  public updateVisibility(): void {
    const px = this.playerPos.x;
    const py = this.playerPos.y;
    const radius = Math.ceil(this.sonarRadius);

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.cells[y][x].visible = false;
      }
    }

    for (let y = Math.max(0, py - radius); y <= Math.min(this.size - 1, py + radius); y++) {
      for (let x = Math.max(0, px - radius); x <= Math.min(this.size - 1, px + radius); x++) {
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (dist <= this.sonarRadius) {
          if (this.checkLineOfSight(px, py, x, y)) {
            this.cells[y][x].visible = true;
            this.cells[y][x].explored = true;
          }
        }
      }
    }

    this.cells[py][px].visible = true;
    this.cells[py][px].explored = true;
  }

  public detectWallHits(loudness: number): { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' }[] {
    const hits: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' }[] = [];
    const px = this.playerPos.x;
    const py = this.playerPos.y;
    const radius = Math.ceil(this.sonarRadius);

    for (let y = Math.max(0, py - radius); y <= Math.min(this.size - 1, py + radius); y++) {
      for (let x = Math.max(0, px - radius); x <= Math.min(this.size - 1, px + radius); x++) {
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (dist <= this.sonarRadius && this.checkLineOfSight(px, py, x, y)) {
          const cell = this.cells[y][x];
          const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
          for (const side of sides) {
            if (cell.walls[side]) {
              const nx = x + (side === 'right' ? 1 : side === 'left' ? -1 : 0);
              const ny = y + (side === 'bottom' ? 1 : side === 'top' ? -1 : 0);
              if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size || !this.cells[ny][nx].visible) {
                if (Math.random() < loudness * 0.3) {
                  hits.push({ x, y, side });
                }
              }
            }
          }
        }
      }
    }
    return hits;
  }

  public render(): void {
    const ctx = this.ctx;
    const scaledCell = CELL_SIZE * this.scale;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.cells[y][x];
        if (!cell.visible && !cell.explored) continue;

        const px = this.offsetX + x * scaledCell;
        const py = this.offsetY + y * scaledCell;

        if (cell.explored && !cell.visible) {
          ctx.fillStyle = COLORS.exploredGlow;
          ctx.fillRect(px, py, scaledCell, scaledCell);
        }

        if (cell.visible) {
          const gradient = ctx.createRadialGradient(
            px + scaledCell / 2, py + scaledCell / 2, 0,
            px + scaledCell / 2, py + scaledCell / 2, scaledCell
          );
          gradient.addColorStop(0, COLORS.floorStart);
          gradient.addColorStop(1, COLORS.floorEnd);
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, scaledCell, scaledCell);
        }

        ctx.save();
        if (cell.explored && !cell.visible) {
          ctx.globalAlpha = 0.5;
        }

        if (this.noiseCanvas) {
          ctx.drawImage(this.noiseCanvas, px, py, scaledCell, scaledCell);
        }

        ctx.strokeStyle = cell.visible ? COLORS.wallLight : COLORS.wallDark;
        ctx.lineWidth = Math.max(1, this.scale);

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + scaledCell, py);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + scaledCell, py);
          ctx.lineTo(px + scaledCell, py + scaledCell);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + scaledCell);
          ctx.lineTo(px + scaledCell, py + scaledCell);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + scaledCell);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    this.renderVibrations();
    this.renderSonarGlow();
    this.renderPulse();
    this.renderPlayer();
  }

  private renderSonarGlow(): void {
    const ctx = this.ctx;
    const scaledCell = CELL_SIZE * this.scale;
    const px = this.offsetX + (this.playerPos.x + 0.5) * scaledCell;
    const py = this.offsetY + (this.playerPos.y + 0.5) * scaledCell;
    const radius = this.sonarRadius * scaledCell;

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
    const pulseOffset = Math.sin(performance.now() / 200) * 0.02;

    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(0.5 + pulseOffset, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderVibrations(): void {
    const ctx = this.ctx;
    const scaledCell = CELL_SIZE * this.scale;
    const now = performance.now();

    this.vibrations = this.vibrations.filter(v => now - v.startTime < v.duration);

    for (const vibration of this.vibrations) {
      const progress = (now - vibration.startTime) / vibration.duration;
      const alpha = (1 - progress) * vibration.intensity;
      const rippleSize = progress * scaledCell * 0.5;

      const px = this.offsetX + vibration.x * scaledCell;
      const py = this.offsetY + vibration.y * scaledCell;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2 * this.scale;

      let wx = px, wy = py, ww = scaledCell, wh = scaledCell;

      switch (vibration.side) {
        case 'top':
          wy = py - rippleSize;
          wh = scaledCell * 0.3 + rippleSize;
          break;
        case 'right':
          wx = px + scaledCell - scaledCell * 0.3 - rippleSize;
          ww = scaledCell * 0.3 + rippleSize;
          break;
        case 'bottom':
          wy = py + scaledCell - scaledCell * 0.3 - rippleSize;
          wh = scaledCell * 0.3 + rippleSize;
          break;
        case 'left':
          wx = px - rippleSize;
          ww = scaledCell * 0.3 + rippleSize;
          break;
      }

      ctx.strokeRect(wx, wy, ww, wh);
      ctx.restore();
    }
  }

  private renderPulse(): void {
    if (!this.pulse.active) return;

    const ctx = this.ctx;
    const scaledCell = CELL_SIZE * this.scale;
    const px = this.offsetX + (this.pulse.center.x + 0.5) * scaledCell;
    const py = this.offsetY + (this.pulse.center.y + 0.5) * scaledCell;
    const radius = this.pulse.progress * this.pulse.maxRadius;
    const alpha = (1 - this.pulse.progress) * 0.6;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(px, py, radius * 0.8, px, py, radius);
    gradient.addColorStop(0, `rgba(255, 215, 0, 0)`);
    gradient.addColorStop(1, `rgba(255, 215, 0, ${alpha * 0.3})`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const scaledCell = CELL_SIZE * this.scale;
    const px = this.offsetX + (this.playerPos.x + 0.5) * scaledCell;
    const py = this.offsetY + (this.playerPos.y + 0.5) * scaledCell;
    const playerRadius = scaledCell * 0.35;

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, playerRadius * 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, playerRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(px, py, playerRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
