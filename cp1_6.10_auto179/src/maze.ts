export const GRID_SIZE = 50;
export const CELL_SIZE = 12;
export const WALL_COLOR = '#3498db';
export const GROUND_COLOR = 'rgba(0, 0, 0, 0.7)';
export const MIRROR_COLOR = '#c0c0c0';
export const CRYSTAL_COUNT = 8;
export const MIRROR_COUNT = 10;
export const TRAIL_FADE_DURATION = 3000;
export const MAX_TRAIL_POINTS = 500;

export interface Position {
  x: number;
  y: number;
}

export interface Crystal {
  pos: Position;
  collected: boolean;
  pulsePhase: number;
}

export interface Mirror {
  pos: Position;
  direction: 'horizontal' | 'vertical';
}

export interface Portal {
  pos: Position;
  unlocked: boolean;
  rotation: number;
}

export type CellType = 'empty' | 'wall';

export class Maze {
  private grid: CellType[][] = [];
  public mirrors: Mirror[] = [];
  public crystals: Crystal[] = [];
  public portal: Portal;
  public startPos: Position = { x: 1, y: 1 };

  constructor() {
    this.portal = {
      pos: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
      unlocked: false,
      rotation: 0
    };
    this.generate();
  }

  private generate(): void {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = 'wall';
      }
    }

    this.generateMaze(1, 1);
    this.ensurePathToEnd();
    this.placeMirrors();
    this.placeCrystals();
  }

  private generateMaze(startX: number, startY: number): void {
    const stack: Position[] = [{ x: startX, y: startY }];
    this.grid[startY][startX] = 'empty';
    const directions = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffled = [...directions].sort(() => Math.random() - 0.5);
      let carved = false;

      for (const dir of shuffled) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1 && this.grid[ny][nx] === 'wall') {
          this.grid[ny][nx] = 'empty';
          this.grid[current.y + dir.dy / 2][current.x + dir.dx / 2] = 'empty';
          stack.push({ x: nx, y: ny });
          carved = true;
          break;
        }
      }

      if (!carved) {
        stack.pop();
      }
    }
  }

  private ensurePathToEnd(): void {
    const endX = GRID_SIZE - 2;
    const endY = GRID_SIZE - 2;
    this.grid[endY][endX] = 'empty';

    let x = 1;
    let y = 1;
    while (x < endX || y < endY) {
      if (x < endX && (y >= endY || Math.random() > 0.5)) {
        x++;
      } else if (y < endY) {
        y++;
      }
      this.grid[y][x] = 'empty';
    }
  }

  private getEmptyPositions(): Position[] {
    const positions: Position[] = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === 'empty') {
          if ((x === 1 && y === 1) || (x === GRID_SIZE - 2 && y === GRID_SIZE - 2)) continue;
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }

  private placeMirrors(): void {
    this.mirrors = [];
    const emptyPositions = this.getEmptyPositions();
    const shuffled = [...emptyPositions].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(MIRROR_COUNT, shuffled.length); i++) {
      this.mirrors.push({
        pos: shuffled[i],
        direction: Math.random() > 0.5 ? 'horizontal' : 'vertical'
      });
    }
  }

  private placeCrystals(): void {
    this.crystals = [];
    const emptyPositions = this.getEmptyPositions();
    const mirrorPositions = new Set(this.mirrors.map(m => `${m.pos.x},${m.pos.y}`));
    const validPositions = emptyPositions.filter(p => !mirrorPositions.has(`${p.x},${p.y}`));
    const shuffled = [...validPositions].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(CRYSTAL_COUNT, shuffled.length); i++) {
      this.crystals.push({
        pos: shuffled[i],
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public isWall(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    return this.grid[y][x] === 'wall';
  }

  public collectCrystal(pos: Position): boolean {
    for (const crystal of this.crystals) {
      if (!crystal.collected && crystal.pos.x === pos.x && crystal.pos.y === pos.y) {
        crystal.collected = true;
        return true;
      }
    }
    return false;
  }

  public allCrystalsCollected(): boolean {
    return this.crystals.every(c => c.collected);
  }

  public collectedCrystalsCount(): number {
    return this.crystals.filter(c => c.collected).length;
  }

  public reset(): void {
    this.portal.unlocked = false;
    this.portal.rotation = 0;
    this.generate();
  }

  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, time: number): void {
    this.renderGround(ctx, offsetX, offsetY);
    this.renderWalls(ctx, offsetX, offsetY);
    this.renderMirrors(ctx, offsetX, offsetY);
    this.renderCrystals(ctx, offsetX, offsetY, time);
    if (this.portal.unlocked) {
      this.renderPortal(ctx, offsetX, offsetY, time);
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    ctx.fillStyle = GROUND_COLOR;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === 'empty') {
          ctx.fillRect(
            offsetX + x * CELL_SIZE,
            offsetY + y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      }
    }
  }

  private renderWalls(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = WALL_COLOR;
    ctx.shadowBlur = 4;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === 'wall') {
          const px = offsetX + x * CELL_SIZE;
          const py = offsetY + y * CELL_SIZE;
          ctx.beginPath();
          if (this.isWall(x, y - 1) === false || y === 0) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + CELL_SIZE, py);
          }
          if (this.isWall(x + 1, y) === false || x === GRID_SIZE - 1) {
            ctx.moveTo(px + CELL_SIZE, py);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          }
          if (this.isWall(x, y + 1) === false || y === GRID_SIZE - 1) {
            ctx.moveTo(px, py + CELL_SIZE);
            ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          }
          if (this.isWall(x - 1, y) === false || x === 0) {
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + CELL_SIZE);
          }
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;
  }

  private renderMirrors(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    ctx.strokeStyle = MIRROR_COLOR;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;

    for (const mirror of this.mirrors) {
      const px = offsetX + mirror.pos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = offsetY + mirror.pos.y * CELL_SIZE + CELL_SIZE / 2;
      const half = CELL_SIZE / 2 - 1;

      const gradient = ctx.createLinearGradient(
        mirror.direction === 'horizontal' ? px - half : px,
        mirror.direction === 'horizontal' ? py : py - half,
        mirror.direction === 'horizontal' ? px + half : px,
        mirror.direction === 'horizontal' ? py : py + half
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#c0c0c0');
      gradient.addColorStop(1, '#808080');
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      if (mirror.direction === 'horizontal') {
        ctx.moveTo(px - half, py);
        ctx.lineTo(px + half, py);
      } else {
        ctx.moveTo(px, py - half);
        ctx.lineTo(px, py + half);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private renderCrystals(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, time: number): void {
    for (const crystal of this.crystals) {
      if (crystal.collected) continue;

      const pulse = 1 + 0.2 * Math.sin(time / 1500 * Math.PI * 2 + crystal.pulsePhase);
      const size = 12 * pulse;
      const px = offsetX + crystal.pos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = offsetY + crystal.pos.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(time / 3000);

      ctx.shadowColor = '#ff6347';
      ctx.shadowBlur = 15;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, '#ff6347');
      gradient.addColorStop(1, '#ff4500');
      ctx.fillStyle = gradient;

      this.drawStar(ctx, 0, 0, 5, size, size / 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  private renderPortal(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, time: number): void {
    const px = offsetX + this.portal.pos.x * CELL_SIZE + CELL_SIZE / 2;
    const py = offsetY + this.portal.pos.y * CELL_SIZE + CELL_SIZE / 2;
    const rotation = time / 500;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    const innerR = 15;
    const outerR = 25;

    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 20;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      gradient.addColorStop(0, 'rgba(0, 255, 0, 0.1)');
      gradient.addColorStop(0.5, '#00ff00');
      gradient.addColorStop(1, '#7fff00');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4 - i;
      ctx.arc(0, 0, (innerR + outerR) / 2 + i * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pulse = 1 + 0.15 * Math.sin(time / 200);
    ctx.beginPath();
    ctx.arc(0, 0, innerR * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }
}
