import { Tile, GridConfig, GridType, PassType, Direction, PRESET_COLORS } from './types';

type TileMapChangeHandler = (tiles: Tile[][]) => void;
type TileSelectHandler = (tile: Tile | null, screenX: number, screenY: number) => void;

export class TileMapEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tiles: Tile[][] = [];
  private config: GridConfig;
  private selectedTile: Tile | null = null;
  private hoverTile: Tile | null = null;
  private changeHandlers: TileMapChangeHandler[] = [];
  private selectHandlers: TileSelectHandler[] = [];
  private offsetX = 40;
  private offsetY = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = {
      type: 'square',
      rows: 6,
      cols: 6,
      tileSize: 60
    };
    this.initTileMap();
    this.bindEvents();
  }

  private initTileMap(): void {
    this.tiles = [];
    for (let r = 0; r < this.config.rows; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < this.config.cols; c++) {
        row.push({
          row: r,
          col: c,
          color: '#868e96',
          label: '',
          passType: 'passable'
        });
      }
      this.tiles.push(row);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverTile = null;
      this.render();
    });
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  public getTileAt(screenX: number, screenY: number): Tile | null {
    const x = screenX - this.offsetX;
    const y = screenY - this.offsetY;
    const ts = this.config.tileSize;

    if (this.config.type === 'square') {
      const col = Math.floor(x / ts);
      const row = Math.floor(y / ts);
      if (row >= 0 && row < this.config.rows && col >= 0 && col < this.config.cols) {
        return this.tiles[row][col];
      }
    } else {
      const hexH = ts * Math.sqrt(3) / 2;
      const hexW = ts;
      const col = Math.floor((x - hexW / 4) / (hexW * 0.75));
      const rowOffset = col % 2 === 0 ? 0 : hexH / 2;
      const row = Math.floor((y - rowOffset) / hexH);
      if (row >= 0 && row < this.config.rows && col >= 0 && col < this.config.cols) {
        return this.tiles[row][col];
      }
    }
    return null;
  }

  public getTileCenter(row: number, col: number): { x: number; y: number } {
    const ts = this.config.tileSize;
    if (this.config.type === 'square') {
      return {
        x: this.offsetX + col * ts + ts / 2,
        y: this.offsetY + row * ts + ts / 2
      };
    } else {
      const hexH = ts * Math.sqrt(3) / 2;
      const hexW = ts;
      const xOffset = col % 2 === 0 ? 0 : hexH / 2;
      return {
        x: this.offsetX + col * hexW * 0.75 + hexW / 2,
        y: this.offsetY + row * hexH + xOffset + hexH / 2
      };
    }
  }

  public getTileBounding(row: number, col: number): { x: number; y: number; w: number; h: number } {
    const ts = this.config.tileSize;
    if (this.config.type === 'square') {
      return {
        x: this.offsetX + col * ts,
        y: this.offsetY + row * ts,
        w: ts,
        h: ts
      };
    } else {
      const hexH = ts * Math.sqrt(3) / 2;
      const hexW = ts;
      const xOffset = col % 2 === 0 ? 0 : hexH / 2;
      return {
        x: this.offsetX + col * hexW * 0.75,
        y: this.offsetY + row * hexH + xOffset,
        w: hexW,
        h: hexH
      };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.hoverTile = this.getTileAt(pos.x, pos.y);
    this.render();
  }

  private onClick(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const tile = this.getTileAt(pos.x, pos.y);
    this.selectedTile = tile;
    this.notifySelect(tile, pos.x, pos.y);
    this.render();
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const pos = this.getMousePos(e);
    const tile = this.getTileAt(pos.x, pos.y);
    this.selectedTile = tile;
    this.notifySelect(tile, pos.x, pos.y);
    this.render();
  }

  public setTileColor(tile: Tile, color: string): void {
    tile.color = color;
    if (color === PRESET_COLORS[3].value) tile.isStart = true;
    else if (color === PRESET_COLORS[4].value) tile.isEnd = true;
    else {
      tile.isStart = false;
      tile.isEnd = false;
    }
    this.notifyChange();
    this.render();
  }

  public setTileLabel(tile: Tile, label: string): void {
    tile.label = label;
    this.notifyChange();
    this.render();
  }

  public setTilePassType(tile: Tile, passType: PassType, direction?: Direction): void {
    tile.passType = passType;
    if (passType === 'oneway') {
      tile.onewayDirection = direction || 'right';
    } else {
      tile.onewayDirection = undefined;
    }
    this.notifyChange();
    this.render();
  }

  public setConfig(config: Partial<GridConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.rows || config.cols) {
      this.initTileMap();
    }
    this.selectedTile = null;
    this.notifyChange();
    this.render();
  }

  public getConfig(): GridConfig {
    return { ...this.config };
  }

  public getTiles(): Tile[][] {
    return this.tiles;
  }

  public setTiles(tiles: Tile[][]): void {
    this.tiles = tiles.map(row => row.map(t => ({ ...t, visitedTiles: undefined } as Tile)));
    this.config.rows = tiles.length;
    this.config.cols = tiles[0]?.length || 0;
    this.notifyChange();
    this.render();
  }

  public getSelectedTile(): Tile | null {
    return this.selectedTile;
  }

  public clearSelection(): void {
    this.selectedTile = null;
    this.notifySelect(null, 0, 0);
    this.render();
  }

  public onChange(handler: TileMapChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  public onSelect(handler: TileSelectHandler): void {
    this.selectHandlers.push(handler);
  }

  private notifyChange(): void {
    this.changeHandlers.forEach(h => h(this.tiles));
  }

  private notifySelect(tile: Tile | null, x: number, y: number): void {
    this.selectHandlers.forEach(h => h(tile, x, y));
  }

  public getNeighbors(row: number, col: number): Array<{ row: number; col: number; direction?: Direction }> {
    const neighbors: Array<{ row: number; col: number; direction?: Direction }> = [];
    if (this.config.type === 'square') {
      const dirs: Array<{ dr: number; dc: number; d: Direction }> = [
        { dr: -1, dc: 0, d: 'up' },
        { dr: 1, dc: 0, d: 'down' },
        { dr: 0, dc: -1, d: 'left' },
        { dr: 0, dc: 1, d: 'right' }
      ];
      for (const { dr, dc, d } of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
          neighbors.push({ row: nr, col: nc, direction: d });
        }
      }
    } else {
      const evenOffsets = [
        { dr: -1, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 },
        { dr: 1, dc: 0 }, { dr: 1, dc: -1 }, { dr: 0, dc: -1 }
      ];
      const oddOffsets = [
        { dr: -1, dc: 0 }, { dr: -1, dc: 1 }, { dr: 0, dc: 1 },
        { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: -1, dc: -1 }
      ];
      const offsets = col % 2 === 0 ? evenOffsets : oddOffsets;
      for (const { dr, dc } of offsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.config.rows && nc >= 0 && nc < this.config.cols) {
          neighbors.push({ row: nr, col: nc });
        }
      }
    }
    return neighbors;
  }

  public isPassable(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const target = this.tiles[toRow]?.[toCol];
    if (!target) return false;
    if (target.passType === 'blocked') return false;

    if (target.passType === 'oneway' && target.onewayDirection) {
      const dr = toRow - fromRow;
      const dc = toCol - fromCol;
      const d = target.onewayDirection;
      if (d === 'up' && dr !== -1) return false;
      if (d === 'down' && dr !== 1) return false;
      if (d === 'left' && dc !== -1) return false;
      if (d === 'right' && dc !== 1) return false;
    }
    return true;
  }

  public render(highlightPath?: Array<{ row: number; col: number }>, animFrame: number = 0): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#252538';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < this.config.rows; r++) {
      for (let c = 0; c < this.config.cols; c++) {
        this.drawTile(this.tiles[r][c], highlightPath, animFrame);
      }
    }
  }

  private drawTile(tile: Tile, highlightPath?: Array<{ row: number; col: number }>, animFrame: number = 0): void {
    const ctx = this.ctx;
    const bbox = this.getTileBounding(tile.row, tile.col);
    const center = this.getTileCenter(tile.row, tile.col);
    const isSelected = this.selectedTile && this.selectedTile.row === tile.row && this.selectedTile.col === tile.col;
    const isHover = this.hoverTile && this.hoverTile.row === tile.row && this.hoverTile.col === tile.col;
    const isHighlight = highlightPath?.some(p => p.row === tile.row && p.col === tile.col);

    ctx.save();

    if (this.config.type === 'square') {
      const isAlt = (tile.row + tile.col) % 2 === 0;
      ctx.fillStyle = tile.color !== '#868e96' ? tile.color : (isAlt ? '#3a3a50' : '#323248');

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillRect(bbox.x + 2, bbox.y + 2, bbox.w - 4, bbox.h - 4);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isSelected ? '#6cb8ff' : (isHover ? '#8888aa' : '#4a4a60');
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(bbox.x + 2, bbox.y + 2, bbox.w - 4, bbox.h - 4);
    } else {
      this.drawHexagon(center.x, center.y, this.config.tileSize / 2 - 2, tile.color);
      ctx.strokeStyle = isSelected ? '#6cb8ff' : (isHover ? '#8888aa' : '#4a4a60');
      ctx.lineWidth = isSelected ? 3 : 1;
      this.drawHexagonStroke(center.x, center.y, this.config.tileSize / 2 - 2);
    }

    if (isHighlight) {
      const pulse = 0.4 + 0.3 * Math.sin(animFrame * 0.15);
      ctx.fillStyle = `rgba(255, 220, 100, ${pulse})`;
      if (this.config.type === 'square') {
        ctx.fillRect(bbox.x + 4, bbox.y + 4, bbox.w - 8, bbox.h - 8);
      } else {
        this.drawHexagon(center.x, center.y, this.config.tileSize / 2 - 6, `rgba(255, 220, 100, ${pulse})`);
      }
    }

    if (tile.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tile.label, center.x, center.y - (this.config.type === 'square' ? 8 : 0));
    }

    if (tile.passType === 'blocked') {
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bbox.x + 8, bbox.y + 8);
      ctx.lineTo(bbox.x + bbox.w - 8, bbox.y + bbox.h - 8);
      ctx.moveTo(bbox.x + bbox.w - 8, bbox.y + 8);
      ctx.lineTo(bbox.x + 8, bbox.y + bbox.h - 8);
      ctx.stroke();
    } else if (tile.passType === 'oneway' && tile.onewayDirection) {
      this.drawDirectionArrow(center.x, center.y, tile.onewayDirection);
    }

    ctx.restore();
  }

  private drawHexagon(cx: number, cy: number, r: number, fill: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawHexagonStroke(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawDirectionArrow(cx: number, cy: number, dir: Direction): void {
    const ctx = this.ctx;
    const size = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    switch (dir) {
      case 'up':
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx - size * 0.7, cy + size * 0.5);
        ctx.lineTo(cx + size * 0.7, cy + size * 0.5);
        break;
      case 'down':
        ctx.moveTo(cx, cy + size);
        ctx.lineTo(cx - size * 0.7, cy - size * 0.5);
        ctx.lineTo(cx + size * 0.7, cy - size * 0.5);
        break;
      case 'left':
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size * 0.5, cy - size * 0.7);
        ctx.lineTo(cx + size * 0.5, cy + size * 0.7);
        break;
      case 'right':
        ctx.moveTo(cx + size, cy);
        ctx.lineTo(cx - size * 0.5, cy - size * 0.7);
        ctx.lineTo(cx - size * 0.5, cy + size * 0.7);
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  public getTotalPassableTiles(): number {
    let count = 0;
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile.passType !== 'blocked') count++;
      }
    }
    return count;
  }
}
