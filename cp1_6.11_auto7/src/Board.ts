export type BlockType = 0 | 1 | 2 | 3 | 4 | 5;
export type BlockShape = 'circle' | 'triangle' | 'star';

export interface Block {
  type: BlockType;
  shape: BlockShape;
  color: string;
  id: number;
  row: number;
  col: number;
  removed: boolean;
  falling: boolean;
  fallTargetRow: number;
  fallProgress: number;
  fallDuration: number;
  removing: boolean;
  removeProgress: number;
  shakeX: number;
  shakeY: number;
  shakeProgress: number;
  scale: number;
  rotation: number;
  fadeIn: boolean;
  fadeInProgress: number;
}

export interface Point {
  row: number;
  col: number;
}

export interface PathResult {
  valid: boolean;
  path: Point[];
  turnCount: number;
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  0: '#ff4757',
  1: '#ff6b81',
  2: '#ffa502',
  3: '#2ed573',
  4: '#1e90ff',
  5: '#a55eea',
};

export const BLOCK_SHAPES: BlockShape[] = ['circle', 'triangle', 'star'];
export const TILE_TYPE_COUNT = 6;
export const ROWS = 8;
export const COLS = 8;

let blockIdCounter = 0;

export class Board {
  rows: number;
  cols: number;
  grid: (Block | null)[][];
  paddingRow: number;
  paddingCol: number;

  constructor(rows: number = ROWS, cols: number = COLS) {
    this.rows = rows;
    this.cols = cols;
    this.paddingRow = 2;
    this.paddingCol = 2;
    this.grid = this.createEmptyGrid();
  }

  createEmptyGrid(): (Block | null)[][] {
    const totalRows = this.rows + this.paddingRow * 2;
    const totalCols = this.cols + this.paddingCol * 2;
    const grid: (Block | null)[][] = [];
    for (let r = 0; r < totalRows; r++) {
      grid[r] = [];
      for (let c = 0; c < totalCols; c++) {
        grid[r][c] = null;
      }
    }
    return grid;
  }

  initialize(guaranteePairs: number = 3): void {
    blockIdCounter = 0;
    this.grid = this.createEmptyGrid();
    const totalCells = this.rows * this.cols;
    const minPerType = 4;
    const types: BlockType[] = [];

    for (let t = 0; t < TILE_TYPE_COUNT; t++) {
      for (let i = 0; i < minPerType; i++) {
        types.push(t as BlockType);
      }
    }

    while (types.length < totalCells) {
      types.push(Math.floor(Math.random() * TILE_TYPE_COUNT) as BlockType);
    }

    if (types.length > totalCells) {
      types.length = totalCells;
    }

    for (let attempt = 0; attempt < 100; attempt++) {
      this.shuffleArray(types);
      this.fillGridWithTypes(types);
      if (this.countValidPairs() >= guaranteePairs) {
        break;
      }
    }
  }

  shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  fillGridWithTypes(types: BlockType[]): void {
    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = types[idx++];
        const shape = BLOCK_SHAPES[type % BLOCK_SHAPES.length];
        this.grid[r + this.paddingRow][c + this.paddingCol] = {
          type,
          shape,
          color: BLOCK_COLORS[type],
          id: blockIdCounter++,
          row: r,
          col: c,
          removed: false,
          falling: false,
          fallTargetRow: r,
          fallProgress: 0,
          fallDuration: 0,
          removing: false,
          removeProgress: 0,
          shakeX: 0,
          shakeY: 0,
          shakeProgress: 0,
          scale: 1,
          rotation: 0,
          fadeIn: true,
          fadeInProgress: 1,
        };
      }
    }
  }

  getBlock(row: number, col: number): Block | null {
    const pr = row + this.paddingRow;
    const pc = col + this.paddingCol;
    if (pr < 0 || pr >= this.grid.length || pc < 0 || pc >= this.grid[0].length) {
      return null;
    }
    return this.grid[pr][pc];
  }

  setBlock(row: number, col: number, block: Block | null): void {
    this.grid[row + this.paddingRow][col + this.paddingCol] = block;
  }

  isEmpty(row: number, col: number): boolean {
    if (row < -1 || row > this.rows || col < -1 || col > this.cols) {
      return true;
    }
    if (row === -1 || row === this.rows || col === -1 || col === this.cols) {
      return true;
    }
    const block = this.getBlock(row, col);
    return block === null || block.removed;
  }

  isPassable(row: number, col: number): boolean {
    return this.isEmpty(row, col);
  }

  findPath(start: Point, end: Point): PathResult {
    if (start.row === end.row && start.col === end.col) {
      return { valid: false, path: [], turnCount: -1 };
    }

    const startBlock = this.getBlock(start.row, start.col);
    const endBlock = this.getBlock(end.row, end.col);

    if (!startBlock || !endBlock || startBlock.type !== endBlock.type) {
      return { valid: false, path: [], turnCount: -1 };
    }

    const result = this.bfsWithTurns(start, end);
    return result;
  }

  private bfsWithTurns(start: Point, end: Point): PathResult {
    const totalRows = this.rows + this.paddingRow * 2;
    const totalCols = this.cols + this.paddingCol * 2;
    const minRow = -1;
    const maxRow = this.rows;
    const minCol = -1;
    const maxCol = this.cols;

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    const visited = new Map<string, number>();
    const parentMap = new Map<string, { from: string; point: Point }>();

    interface State {
      point: Point;
      direction: number;
      turns: number;
      key: string;
    }

    const queue: State[] = [];
    const startKey = `${start.row},${start.col},-1`;
    visited.set(startKey, 0);
    queue.push({ point: start, direction: -1, turns: 0, key: startKey });

    let foundPath: Point[] | null = null;
    let foundTurns = -1;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { point, direction, turns, key } = current;

      if (point.row === end.row && point.col === end.col) {
        if (turns <= 2) {
          foundTurns = turns;
          foundPath = this.reconstructPath(parentMap, key, start, end);
          break;
        }
      }

      for (let d = 0; d < directions.length; d++) {
        const dir = directions[d];
        const newTurns = direction === -1 ? 0 : direction === d ? turns : turns + 1;

        if (newTurns > 2) continue;

        const nr = point.row + dir.dr;
        const nc = point.col + dir.dc;

        if (nr < minRow || nr > maxRow || nc < minCol || nc > maxCol) continue;

        const isEndPoint = nr === end.row && nc === end.col;
        if (!isEndPoint && !this.isPassable(nr, nc)) continue;

        const newPoint: Point = { row: nr, col: nc };
        const newKey = `${nr},${nc},${d}`;

        const existingTurns = visited.get(newKey);
        if (existingTurns !== undefined && existingTurns <= newTurns) continue;

        visited.set(newKey, newTurns);
        parentMap.set(newKey, { from: key, point });
        queue.push({ point: newPoint, direction: d, turns: newTurns, key: newKey });
      }
    }

    if (foundPath) {
      return { valid: true, path: foundPath, turnCount: foundTurns };
    }

    return { valid: false, path: [], turnCount: -1 };
  }

  private reconstructPath(
    parentMap: Map<string, { from: string; point: Point }>,
    endKey: string,
    start: Point,
    end: Point
  ): Point[] {
    const path: Point[] = [end];
    let currentKey = endKey;

    while (parentMap.has(currentKey)) {
      const entry = parentMap.get(currentKey)!;
      path.unshift(entry.point);
      currentKey = entry.from;
      if (entry.point.row === start.row && entry.point.col === start.col) break;
    }

    return path;
  }

  countValidPairs(): number {
    const blocks: Block[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) {
          blocks.push(block);
        }
      }
    }

    let pairCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (blocks[i].type === blocks[j].type) {
          const result = this.findPath(
            { row: blocks[i].row, col: blocks[i].col },
            { row: blocks[j].row, col: blocks[j].col }
          );
          if (result.valid) {
            pairCount++;
            if (pairCount >= 5) return pairCount;
          }
        }
      }
    }
    return pairCount;
  }

  findAnyValidPair(): [Point, Point] | null {
    const blocks: Block[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) {
          blocks.push(block);
        }
      }
    }

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (blocks[i].type === blocks[j].type) {
          const result = this.findPath(
            { row: blocks[i].row, col: blocks[i].col },
            { row: blocks[j].row, col: blocks[j].col }
          );
          if (result.valid) {
            return [
              { row: blocks[i].row, col: blocks[i].col },
              { row: blocks[j].row, col: blocks[j].col },
            ];
          }
        }
      }
    }
    return null;
  }

  shuffleRemaining(): void {
    const blocks: Block[] = [];
    const positions: Point[] = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) {
          blocks.push({ ...block });
          positions.push({ row: r, col: c });
        }
      }
    }

    if (blocks.length < 2) return;

    for (let attempt = 0; attempt < 50; attempt++) {
      this.shuffleArray(blocks);
      for (let i = 0; i < blocks.length; i++) {
        const pos = positions[i];
        const block = this.getBlock(pos.row, pos.col);
        if (block) {
          block.type = blocks[i].type;
          block.shape = BLOCK_SHAPES[blocks[i].type % BLOCK_SHAPES.length];
          block.color = BLOCK_COLORS[blocks[i].type];
          block.rotation = Math.random() * Math.PI * 2;
          block.fadeIn = true;
          block.fadeInProgress = 0;
        }
      }

      if (this.countValidPairs() >= 1) {
        break;
      }
    }
  }

  applyGravity(): boolean {
    let anyFalling = false;
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) {
          if (writeRow !== r) {
            const targetBlock = this.getBlock(writeRow, c);
            const fallingBlock = block;
            fallingBlock.falling = true;
            fallingBlock.fallTargetRow = writeRow;
            fallingBlock.fallProgress = 0;
            const distance = writeRow - r;
            fallingBlock.fallDuration = Math.max(0.25, distance * 0.1);
            this.setBlock(writeRow, c, fallingBlock);
            this.setBlock(r, c, null);
            const movedBlock = this.getBlock(writeRow, c);
            if (movedBlock) {
              movedBlock.row = writeRow;
            }
            anyFalling = true;
          }
          writeRow--;
        }
      }
    }
    return anyFalling;
  }

  isGameComplete(): boolean {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) return false;
      }
    }
    return true;
  }

  hasAnyBlocks(): boolean {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) return true;
      }
    }
    return false;
  }

  cloneState(): (Block | null)[][] {
    const copy: (Block | null)[][] = [];
    for (let r = 0; r < this.rows; r++) {
      copy[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        copy[r][c] = block ? { ...block } : null;
      }
    }
    return copy;
  }

  restoreState(state: (Block | null)[][]): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = state[r][c];
        this.setBlock(r, c, block ? { ...block } : null);
      }
    }
  }

  countRemainingBlocks(): number {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.getBlock(r, c);
        if (block && !block.removed) count++;
      }
    }
    return count;
  }
}
