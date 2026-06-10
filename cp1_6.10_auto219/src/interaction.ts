import { Maze, MazeCell, isWalkable, areAdjacent } from './maze';
import { PathPoint, Renderer } from './renderer';

export interface InteractionState {
  path: PathPoint[];
  visitedCells: Map<string, { order: number; cell: MazeCell }>;
  currentPosition: { row: number; col: number } | null;
}

export type InteractionCallback = (state: InteractionState) => void;

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private maze: Maze;
  private state: InteractionState;
  private isDragging: boolean = false;
  private onUpdate: InteractionCallback | null = null;
  private lastCellKey: string | null = null;

  constructor(canvas: HTMLCanvasElement, renderer: Renderer, maze: Maze) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.maze = maze;
    this.state = {
      path: [],
      visitedCells: new Map(),
      currentPosition: null
    };
    this.bindEvents();
    this.initializePath();
  }

  setMaze(maze: Maze): void {
    this.maze = maze;
    this.reset();
  }

  setOnUpdate(callback: InteractionCallback): void {
    this.onUpdate = callback;
  }

  getState(): InteractionState {
    return this.state;
  }

  reset(): void {
    this.state = {
      path: [],
      visitedCells: new Map(),
      currentPosition: null
    };
    this.initializePath();
    this.notifyUpdate();
  }

  private initializePath(): void {
    const startRow = 0;
    const startCol = 0;
    if (!isWalkable(this.maze, startRow, startCol)) return;

    const startCell = this.maze[startRow][startCol];
    const key = `${startRow},${startCol}`;

    this.state.path.push({
      row: startRow,
      col: startCol,
      timestamp: Date.now()
    });
    this.state.visitedCells.set(key, { order: 0, cell: startCell });
    startCell.visited = true;
    startCell.visitOrder = 0;
    this.state.currentPosition = { row: startRow, col: startCol };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  unbindEvents(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private getMousePosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.undo();
      return;
    }

    if (e.button !== 0) return;

    e.preventDefault();
    this.isDragging = true;

    const pos = this.getMousePosition(e);
    const cell = this.renderer.getCellAtPixel(pos.x, pos.y);
    if (cell) {
      this.lastCellKey = `${cell.row},${cell.col}`;
      this.tryMoveTo(cell.row, cell.col);
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const pos = this.getMousePosition(e);
    const cell = this.renderer.getCellAtPixel(pos.x, pos.y);
    if (!cell) return;

    const key = `${cell.row},${cell.col}`;
    if (key === this.lastCellKey) return;
    this.lastCellKey = key;

    this.tryMoveTo(cell.row, cell.col);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = false;
    this.lastCellKey = null;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.undo();
  };

  private tryMoveTo(row: number, col: number): boolean {
    if (!this.state.currentPosition) return false;

    const { row: currRow, col: currCol } = this.state.currentPosition;

    if (currRow === row && currCol === col) return false;

    if (!areAdjacent(currRow, currCol, row, col)) {
      return this.tryStepTowards(row, col);
    }

    if (!isWalkable(this.maze, row, col)) return false;

    const key = `${row},${col}`;

    if (this.state.path.length >= 2) {
      const prevPoint = this.state.path[this.state.path.length - 2];
      if (prevPoint.row === row && prevPoint.col === col) {
        this.undo();
        return true;
      }
    }

    if (this.state.visitedCells.has(key)) {
      this.rewindTo(key);
      return true;
    }

    this.moveForward(row, col);
    return true;
  }

  private tryStepTowards(targetRow: number, targetCol: number): boolean {
    if (!this.state.currentPosition) return false;

    const { row: currRow, col: currCol } = this.state.currentPosition;

    const candidates = [
      { row: currRow - 1, col: currCol },
      { row: currRow + 1, col: currCol },
      { row: currRow, col: currCol - 1 },
      { row: currRow, col: currCol + 1 }
    ];

    for (const candidate of candidates) {
      if (!isWalkable(this.maze, candidate.row, candidate.col)) continue;

      const key = `${candidate.row},${candidate.col}`;
      if (this.state.path.length >= 2) {
        const prevPoint = this.state.path[this.state.path.length - 2];
        if (prevPoint.row === candidate.row && prevPoint.col === candidate.col) {
          continue;
        }
      }

      if (this.state.visitedCells.has(key)) continue;

      const distToTarget = Math.abs(targetRow - candidate.row) + Math.abs(targetCol - candidate.col);
      const distFromCurrent = Math.abs(targetRow - currRow) + Math.abs(targetCol - currCol);

      if (distToTarget < distFromCurrent ||
          (candidate.row === targetRow && Math.abs(candidate.col - targetCol) <= 1) ||
          (candidate.col === targetCol && Math.abs(candidate.row - targetRow) <= 1)) {
        this.moveForward(candidate.row, candidate.col);
        return true;
      }
    }

    return false;
  }

  private moveForward(row: number, col: number): void {
    const cell = this.maze[row][col];
    const key = `${row},${col}`;
    const order = this.state.visitedCells.size;

    cell.visited = true;
    cell.visitOrder = order;

    this.state.path.push({
      row,
      col,
      timestamp: Date.now()
    });
    this.state.visitedCells.set(key, { order, cell });
    this.state.currentPosition = { row, col };

    this.notifyUpdate();
  }

  private rewindTo(key: string): void {
    const target = this.state.visitedCells.get(key);
    if (!target) return;

    while (this.state.path.length > target.order + 1) {
      const point = this.state.path.pop();
      if (point) {
        const k = `${point.row},${point.col}`;
        const removed = this.state.visitedCells.get(k);
        if (removed && removed.order > target.order) {
          this.state.visitedCells.delete(k);
          removed.cell.visited = false;
          removed.cell.visitOrder = -1;
        }
      }
    }

    let order = 0;
    this.state.visitedCells.forEach((value) => {
      value.order = order++;
      value.cell.visitOrder = value.order;
    });

    if (this.state.path.length > 0) {
      const last = this.state.path[this.state.path.length - 1];
      this.state.currentPosition = { row: last.row, col: last.col };
    }

    this.notifyUpdate();
  }

  undo(): void {
    if (this.state.path.length <= 1) return;

    const point = this.state.path.pop();
    if (point) {
      const key = `${point.row},${point.col}`;
      const removed = this.state.visitedCells.get(key);
      if (removed) {
        this.state.visitedCells.delete(key);
        removed.cell.visited = false;
        removed.cell.visitOrder = -1;
      }
    }

    let order = 0;
    this.state.visitedCells.forEach((value) => {
      value.order = order++;
      value.cell.visitOrder = value.order;
    });

    if (this.state.path.length > 0) {
      const last = this.state.path[this.state.path.length - 1];
      this.state.currentPosition = { row: last.row, col: last.col };
    }

    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate(this.state);
    }
  }

  getTotalWalkable(): number {
    let count = 0;
    for (const row of this.maze) {
      for (const cell of row) {
        if (!cell.isWall) count++;
      }
    }
    return count;
  }
}
