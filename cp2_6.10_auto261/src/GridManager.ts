import {
  Direction,
  TrackType,
  GridPos,
  TrackCell,
  LevelConfig,
  posEquals,
  getTrackConnections
} from './types';

export class GridManager {
  public gridSize: number;
  public cellSize: number = 60;
  public grid: TrackCell[][];
  public stations: { green: GridPos; red: GridPos };
  public obstacles: GridPos[];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public maxTracks: number;

  constructor(
    canvas: HTMLCanvasElement,
    levelConfig: LevelConfig
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridSize = levelConfig.gridSize;
    this.stations = { ...levelConfig.stations };
    this.obstacles = [...levelConfig.obstacles];
    this.maxTracks = levelConfig.maxTracks;
    this.grid = this.createEmptyGrid();
    this.resize();
  }

  private createEmptyGrid(): TrackCell[][] {
    const g: TrackCell[][] = [];
    for (let y = 0; y < this.gridSize; y++) {
      g[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        g[y][x] = { type: null, rotation: 0 };
      }
    }
    return g;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const size = this.gridSize * this.cellSize;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public setCellSize(size: number): void {
    this.cellSize = size;
    this.resize();
  }

  public getTrackCount(): number {
    let count = 0;
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].type !== null) count++;
      }
    }
    return count;
  }

  public canPlace(pos: GridPos): boolean {
    if (pos.x < 0 || pos.x >= this.gridSize || pos.y < 0 || pos.y >= this.gridSize) {
      return false;
    }
    if (posEquals(pos, this.stations.green) || posEquals(pos, this.stations.red)) {
      return false;
    }
    if (this.obstacles.some(o => posEquals(o, pos))) {
      return false;
    }
    return true;
  }

  public placeTrack(pos: GridPos, type: TrackType): boolean {
    if (!this.canPlace(pos)) return false;
    if (this.grid[pos.y][pos.x].type === null && this.getTrackCount() >= this.maxTracks) {
      return false;
    }
    this.grid[pos.y][pos.x] = { type, rotation: 0 };
    return true;
  }

  public rotateTrack(pos: GridPos): boolean {
    const cell = this.grid[pos.y]?.[pos.x];
    if (!cell || cell.type === null) return false;
    cell.rotation = (cell.rotation + 90) % 360;
    return true;
  }

  public removeTrack(pos: GridPos): boolean {
    const cell = this.grid[pos.y]?.[pos.x];
    if (!cell || cell.type === null) return false;
    cell.type = null;
    cell.rotation = 0;
    return true;
  }

  public getTrack(pos: GridPos): TrackCell | null {
    if (pos.x < 0 || pos.x >= this.gridSize || pos.y < 0 || pos.y >= this.gridSize) {
      return null;
    }
    return this.grid[pos.y][pos.x];
  }

  public clearTracks(): void {
    this.grid = this.createEmptyGrid();
  }

  public pixelToGrid(px: number, py: number): GridPos {
    return {
      x: Math.floor(px / this.cellSize),
      y: Math.floor(py / this.cellSize)
    };
  }

  public gridToPixel(pos: GridPos, center: boolean = true): { x: number; y: number } {
    if (center) {
      return {
        x: pos.x * this.cellSize + this.cellSize / 2,
        y: pos.y * this.cellSize + this.cellSize / 2
      };
    }
    return { x: pos.x * this.cellSize, y: pos.y * this.cellSize };
  }

  public draw(time: number = 0): void {
    const ctx = this.ctx;
    const size = this.gridSize * this.cellSize;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = '#1e1e36';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#2c2c44';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(size, i * this.cellSize);
      ctx.stroke();
    }

    for (const obs of this.obstacles) {
      this.drawObstacle(obs);
    }

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        if (cell.type !== null) {
          this.drawTrack({ x, y }, cell.type, cell.rotation);
        }
      }
    }

    this.drawStation(this.stations.green, '#00ff88', time);
    this.drawStation(this.stations.red, '#ff4466', time);
  }

  private drawStation(pos: GridPos, color: string, time: number): void {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(pos);
    const s = this.cellSize * 0.65;
    const pulse = Math.sin(time / 300) * 0.2 + 0.8;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * pulse;
    ctx.fillStyle = color;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${this.cellSize * 0.3}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('站', x, y);
    ctx.restore();
  }

  private drawObstacle(pos: GridPos): void {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(pos);
    const s = this.cellSize * 0.5;

    ctx.save();
    ctx.fillStyle = '#5a4a3a';
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6b5a4a';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  public drawTrack(pos: GridPos, type: TrackType, rotation: number): void {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(pos);
    const s = this.cellSize;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);

    const trackColor = '#c0c0c0';
    const trackDark = '#808080';
    const tieColor = '#654321';
    const tieWidth = s * 0.08;
    const trackWidth = s * 0.45;
    const railWidth = s * 0.06;
    const railOffset = s * 0.12;

    ctx.strokeStyle = trackColor;
    ctx.lineCap = 'round';

    switch (type) {
      case 'straight':
        ctx.fillStyle = tieColor;
        for (let i = -3; i <= 3; i++) {
          ctx.fillRect(-trackWidth / 2, i * s * 0.1 - tieWidth / 2, trackWidth, tieWidth);
        }
        ctx.lineWidth = railWidth;
        ctx.beginPath();
        ctx.moveTo(-railOffset, -s / 2);
        ctx.lineTo(-railOffset, s / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(railOffset, -s / 2);
        ctx.lineTo(railOffset, s / 2);
        ctx.stroke();
        this.drawArrow(Direction.UP);
        break;

      case 'curve':
        const r = s * 0.35;
        ctx.fillStyle = tieColor;
        for (let i = 0; i <= 8; i++) {
          const angle = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
          const tx = Math.cos(angle) * r;
          const ty = Math.sin(angle) * r;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle + Math.PI / 2);
          ctx.fillRect(-trackWidth / 2, -tieWidth / 2, trackWidth, tieWidth);
          ctx.restore();
        }
        ctx.lineWidth = railWidth;
        ctx.beginPath();
        ctx.arc(0, 0, r - railOffset, -Math.PI / 2, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r + railOffset, -Math.PI / 2, 0);
        ctx.stroke();
        this.drawArrow(Direction.RIGHT);
        break;

      case 'switch':
        ctx.fillStyle = tieColor;
        for (let i = -3; i <= 3; i++) {
          ctx.fillRect(-trackWidth / 2, i * s * 0.1 - tieWidth / 2, trackWidth, tieWidth);
        }
        const r2 = s * 0.35;
        for (let i = 0; i <= 8; i++) {
          const angle = Math.PI / 2 + (i / 8) * (Math.PI / 2);
          const tx = Math.cos(angle) * r2;
          const ty = Math.sin(angle) * r2;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle - Math.PI / 2);
          ctx.fillRect(-trackWidth / 2, -tieWidth / 2, trackWidth, tieWidth);
          ctx.restore();
        }
        ctx.lineWidth = railWidth;
        ctx.beginPath();
        ctx.moveTo(-railOffset, -s / 2);
        ctx.lineTo(-railOffset, s / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(railOffset, -s / 2);
        ctx.lineTo(railOffset, s / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r2 - railOffset, Math.PI / 2, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r2 + railOffset, Math.PI / 2, Math.PI);
        ctx.stroke();
        this.drawArrow(Direction.UP);
        this.drawArrow(Direction.RIGHT, '#00ff88');
        break;
    }

    ctx.restore();
  }

  private drawArrow(dir: Direction, color: string = '#ffaa00'): void {
    const ctx = this.ctx;
    const s = this.cellSize;
    let dx = 0, dy = 0;
    let angle = 0;
    switch (dir) {
      case Direction.UP: dy = -s * 0.35; angle = 0; break;
      case Direction.RIGHT: dx = s * 0.35; angle = Math.PI / 2; break;
      case Direction.DOWN: dy = s * 0.35; angle = Math.PI; break;
      case Direction.LEFT: dx = -s * 0.35; angle = -Math.PI / 2; break;
    }
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.08);
    ctx.lineTo(s * 0.06, s * 0.04);
    ctx.lineTo(-s * 0.06, s * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  public drawToolIcon(ctx: CanvasRenderingContext2D, type: TrackType, size: number): void {
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    const trackColor = '#c0c0c0';
    const tieColor = '#654321';
    const tieWidth = size * 0.08;
    const trackWidth = size * 0.45;
    const railWidth = size * 0.06;
    const railOffset = size * 0.12;

    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = trackColor;
    ctx.lineCap = 'round';

    if (type === 'straight') {
      ctx.fillStyle = tieColor;
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(-trackWidth / 2, i * size * 0.1 - tieWidth / 2, trackWidth, tieWidth);
      }
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.moveTo(-railOffset, -size / 2 + size * 0.1);
      ctx.lineTo(-railOffset, size / 2 - size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(railOffset, -size / 2 + size * 0.1);
      ctx.lineTo(railOffset, size / 2 - size * 0.1);
      ctx.stroke();
    } else if (type === 'curve') {
      const r = size * 0.3;
      ctx.fillStyle = tieColor;
      for (let i = 0; i <= 6; i++) {
        const angle = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
        const tx = Math.cos(angle) * r;
        const ty = Math.sin(angle) * r;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillRect(-trackWidth / 2, -tieWidth / 2, trackWidth, tieWidth);
        ctx.restore();
      }
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.arc(0, 0, r - railOffset, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r + railOffset, -Math.PI / 2, 0);
      ctx.stroke();
    } else if (type === 'switch') {
      ctx.fillStyle = tieColor;
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(-trackWidth / 2, i * size * 0.1 - tieWidth / 2, trackWidth, tieWidth);
      }
      const r2 = size * 0.3;
      for (let i = 0; i <= 6; i++) {
        const angle = Math.PI / 2 + (i / 6) * (Math.PI / 2);
        const tx = Math.cos(angle) * r2;
        const ty = Math.sin(angle) * r2;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle - Math.PI / 2);
        ctx.fillRect(-trackWidth / 2, -tieWidth / 2, trackWidth, tieWidth);
        ctx.restore();
      }
      ctx.lineWidth = railWidth;
      ctx.beginPath();
      ctx.moveTo(-railOffset, -size / 2 + size * 0.1);
      ctx.lineTo(-railOffset, size / 2 - size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(railOffset, -size / 2 + size * 0.1);
      ctx.lineTo(railOffset, size / 2 - size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r2 - railOffset, Math.PI / 2, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r2 + railOffset, Math.PI / 2, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }
}
