export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;

export const PATH_COLOR = '#555555';
export const TILE_COLOR = '#2a2a3e';
export const GRID_LINE_COLOR = '#2a2a3e';

export interface Cell {
  col: number;
  row: number;
  isPath: boolean;
  hasTower: boolean;
}

export class Grid {
  cells: Cell[][] = [];
  path: { col: number; row: number }[] = [];

  constructor() {
    this.initCells();
    this.definePath();
  }

  private initCells() {
    for (let r = 0; r < GRID_ROWS; r++) {
      this.cells[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        this.cells[r][c] = {
          col: c,
          row: r,
          isPath: false,
          hasTower: false
        };
      }
    }
  }

  private definePath() {
    const midRow = Math.floor(GRID_ROWS / 2);
    const path: { col: number; row: number }[] = [];

    for (let c = 0; c <= 4; c++) {
      path.push({ col: c, row: midRow });
    }
    for (let r = midRow - 1; r >= 3; r--) {
      path.push({ col: 4, row: r });
    }
    for (let c = 5; c <= 9; c++) {
      path.push({ col: c, row: 3 });
    }
    for (let r = 4; r <= 11; r++) {
      path.push({ col: 9, row: r });
    }
    for (let c = 10; c <= 14; c++) {
      path.push({ col: c, row: 11 });
    }
    for (let r = 10; r >= midRow; r--) {
      path.push({ col: 14, row: r });
    }
    for (let c = 15; c < GRID_COLS; c++) {
      path.push({ col: c, row: midRow });
    }

    this.path = path;
    for (const p of path) {
      if (p.row >= 0 && p.row < GRID_ROWS && p.col >= 0 && p.col < GRID_COLS) {
        this.cells[p.row][p.col].isPath = true;
      }
    }
  }

  getCell(col: number, row: number): Cell | null {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }
    return this.cells[row][col];
  }

  isPlaceable(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    return cell !== null && !cell.isPath && !cell.hasTower;
  }

  placeTower(col: number, row: number): boolean {
    if (!this.isPlaceable(col, row)) return false;
    this.cells[row][col].hasTower = true;
    return true;
  }

  removeTower(col: number, row: number) {
    const cell = this.getCell(col, row);
    if (cell) cell.hasTower = false;
  }

  getPathPixelPoints(): { x: number; y: number }[] {
    return this.path.map(p => ({
      x: p.col * CELL_SIZE + CELL_SIZE / 2,
      y: p.row * CELL_SIZE + CELL_SIZE / 2
    }));
  }

  getCellAtPixel(x: number, y: number): { col: number; row: number } | null {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }
    return { col, row };
  }

  render(ctx: CanvasRenderingContext2D, offsetY: number) {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = this.cells[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE + offsetY;
        ctx.fillStyle = cell.isPath ? PATH_COLOR : TILE_COLOR;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE + offsetY);
      ctx.lineTo(GRID_COLS * CELL_SIZE, r * CELL_SIZE + offsetY);
      ctx.stroke();
    }
    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, offsetY);
      ctx.lineTo(c * CELL_SIZE, GRID_ROWS * CELL_SIZE + offsetY);
      ctx.stroke();
    }
  }
}
