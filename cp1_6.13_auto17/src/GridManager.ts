export enum CellState {
  IDLE = 0,
  PATH = 1,
  STORM = 2,
  START = 3,
  END = 4,
}

export interface Cell {
  row: number;
  col: number;
  state: CellState;
  stormEndTime: number;
  placeProgress: number;
  removeProgress: number;
  fadeInProgress: number;
}

export class GridManager {
  public readonly rows: number = 6;
  public readonly cols: number = 6;
  public grid: Cell[][] = [];
  public startPos: { row: number; col: number } | null = null;
  public endPos: { row: number; col: number } | null = null;

  private canvas: HTMLCanvasElement;
  private cellSize: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private onClickCallback: ((row: number, col: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGrid();
    this.bindEvents();
  }

  private initGrid(): void {
    this.grid = [];
    for (let row = 0; row < this.rows; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < this.cols; col++) {
        rowCells.push({
          row,
          col,
          state: CellState.IDLE,
          stormEndTime: 0,
          placeProgress: 0,
          removeProgress: 0,
          fadeInProgress: 0,
        });
      }
      this.grid.push(rowCells);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleTouch(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.processClick(x, y);
  }

  private handleTouch(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    this.processClick(x, y);
  }

  private processClick(x: number, y: number): void {
    const col = Math.floor((x - this.offsetX) / this.cellSize);
    const row = Math.floor((y - this.offsetY) / this.cellSize);

    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      const cell = this.grid[row][col];
      if (cell.state === CellState.IDLE || cell.state === CellState.PATH) {
        if (this.onClickCallback) {
          this.onClickCallback(row, col);
        }
      }
    }
  }

  public setOnClickCallback(callback: (row: number, col: number) => void): void {
    this.onClickCallback = callback;
  }

  public setCellSize(cellSize: number, offsetX: number, offsetY: number): void {
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  public getCell(row: number, col: number): Cell | null {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return this.grid[row][col];
    }
    return null;
  }

  public setCellState(row: number, col: number, state: CellState): void {
    const cell = this.getCell(row, col);
    if (cell) {
      cell.state = state;
    }
  }

  public placePath(row: number, col: number): void {
    const cell = this.getCell(row, col);
    if (cell && cell.state === CellState.IDLE) {
      cell.state = CellState.PATH;
      cell.placeProgress = 0;
    }
  }

  public removePath(row: number, col: number): void {
    const cell = this.getCell(row, col);
    if (cell && cell.state === CellState.PATH) {
      cell.state = CellState.IDLE;
      cell.removeProgress = 1;
    }
  }

  public togglePath(row: number, col: number): void {
    const cell = this.getCell(row, col);
    if (!cell) return;
    if (cell.state === CellState.IDLE) {
      this.placePath(row, col);
    } else if (cell.state === CellState.PATH) {
      this.removePath(row, col);
    }
  }

  public isStart(row: number, col: number): boolean {
    return this.startPos?.row === row && this.startPos?.col === col;
  }

  public isEnd(row: number, col: number): boolean {
    return this.endPos?.row === row && this.endPos?.col === col;
  }

  public setStartEnd(): void {
    const corners = [
      { row: 0, col: 0 },
      { row: 0, col: this.cols - 1 },
      { row: this.rows - 1, col: 0 },
      { row: this.rows - 1, col: this.cols - 1 },
    ];

    const shuffled = corners.sort(() => Math.random() - 0.5);
    this.startPos = shuffled[0];
    this.endPos = shuffled[1];

    this.grid[this.startPos.row][this.startPos.col].state = CellState.START;
    this.grid[this.endPos.row][this.endPos.col].state = CellState.END;
  }

  public getRandomIdleCells(count: number): { row: number; col: number }[] {
    const idleCells: { row: number; col: number }[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col].state === CellState.IDLE) {
          idleCells.push({ row, col });
        }
      }
    }

    const result: { row: number; col: number }[] = [];
    const shuffled = idleCells.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.push(shuffled[i]);
    }
    return result;
  }

  public reset(): void {
    this.initGrid();
    this.setStartEnd();
    this.startFadeIn();
  }

  private startFadeIn(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col].fadeInProgress = 0;
      }
    }
  }

  public updateAnimations(deltaTime: number): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.grid[row][col];

        if (cell.placeProgress < 1 && cell.state === CellState.PATH) {
          cell.placeProgress = Math.min(1, cell.placeProgress + deltaTime * 4);
        }

        if (cell.removeProgress > 0 && cell.state === CellState.IDLE) {
          cell.removeProgress = Math.max(0, cell.removeProgress - deltaTime * 4);
        }

        if (cell.fadeInProgress < 1) {
          const delay = (row + col) * 0.05;
          const adjustedTime = Math.max(0, deltaTime * 2 - delay);
          cell.fadeInProgress = Math.min(1, cell.fadeInProgress + adjustedTime);
        }
      }
    }
  }

  public getGridCopy(): Cell[][] {
    return this.grid.map(row => row.map(cell => ({ ...cell })));
  }
}
