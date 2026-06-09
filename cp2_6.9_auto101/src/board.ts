export type Cell = 0 | 1 | 2;
export type Board = Cell[][];

export interface Move {
  x: number;
  y: number;
  player: 1 | 2;
  timestamp: number;
}

export const BOARD_SIZE = 15;
export const EMPTY: Cell = 0;
export const BLACK: Cell = 1;
export const WHITE: Cell = 2;

export function createBoard(): Board {
  const board: Board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board.push(new Array(BOARD_SIZE).fill(EMPTY));
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function placeStone(board: Board, x: number, y: number, player: 1 | 2): boolean {
  if (!isValidPosition(x, y) || board[y][x] !== EMPTY) {
    return false;
  }
  board[y][x] = player;
  return true;
}

export function removeStone(board: Board, x: number, y: number): void {
  if (isValidPosition(x, y)) {
    board[y][x] = EMPTY;
  }
}

const DIRECTIONS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

export function checkWin(board: Board, x: number, y: number, player: 1 | 2): boolean {
  if (!isValidPosition(x, y) || board[y][x] !== player) {
    return false;
  }

  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;

    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (!isValidPosition(nx, ny) || board[ny][nx] !== player) break;
      count++;
    }

    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (!isValidPosition(nx, ny) || board[ny][nx] !== player) break;
      count++;
    }

    if (count >= 5) return true;
  }

  return false;
}

export function isBoardFull(board: Board): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY) return false;
    }
  }
  return true;
}

export function getEmptyCells(board: Board): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

export function countConsecutive(
  board: Board,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: 1 | 2
): number {
  let count = 0;
  let nx = x + dx;
  let ny = y + dy;
  while (isValidPosition(nx, ny) && board[ny][nx] === player) {
    count++;
    nx += dx;
    ny += dy;
  }
  return count;
}

export function countStonesInRadius(
  board: Board,
  x: number,
  y: number,
  radius: number
): number {
  let count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (isValidPosition(nx, ny) && board[ny][nx] !== EMPTY) {
        count++;
      }
    }
  }
  return count;
}
