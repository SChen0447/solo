import {
  Board,
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  getEmptyCells,
  countStonesInRadius,
  isValidPosition
} from './board';

const ALL_DIRECTIONS: [number, number][] = [
  [1, 0], [-1, 0],
  [0, 1], [0, -1],
  [1, 1], [-1, -1],
  [1, -1], [-1, 1]
];

function evaluatePosition(
  board: Board,
  x: number,
  y: number,
  player: 1 | 2
): number {
  const opponent = player === WHITE ? BLACK : WHITE;
  let score = 0;

  const playerWeight = 3;
  const opponentWeight = 2;

  for (const [dx, dy] of ALL_DIRECTIONS) {
    let playerCount = 0;
    let opponentCount = 0;

    for (let i = 1; i <= 4; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (!isValidPosition(nx, ny)) break;
      const cell = board[ny][nx];
      if (cell === player) playerCount++;
      else if (cell === opponent) opponentCount++;
      else break;
    }

    for (let i = 1; i <= 4; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (!isValidPosition(nx, ny)) break;
      const cell = board[ny][nx];
      if (cell === player) playerCount++;
      else if (cell === opponent) opponentCount++;
      else break;
    }

    score += playerCount * playerWeight;
    score += opponentCount * opponentWeight;

    if (playerCount >= 4) score += 10000;
    else if (playerCount === 3) score += 500;
    else if (playerCount === 2) score += 50;

    if (opponentCount >= 4) score += 8000;
    else if (opponentCount === 3) score += 400;
    else if (opponentCount === 2) score += 40;
  }

  const density = countStonesInRadius(board, x, y, 3);
  score += density * 1.5;

  const centerDist = Math.abs(x - 7) + Math.abs(y - 7);
  score += (14 - centerDist) * 0.5;

  return score;
}

export function findBestMove(board: Board): { x: number; y: number } {
  const emptyCells = getEmptyCells(board);

  if (emptyCells.length === 0) {
    return { x: 7, y: 7 };
  }

  if (emptyCells.length === BOARD_SIZE * BOARD_SIZE) {
    return { x: 7, y: 7 };
  }

  let bestScore = -Infinity;
  const bestMoves: { x: number; y: number }[] = [];

  for (const cell of emptyCells) {
    let hasNeighbor = false;
    for (let dy = -2; dy <= 2 && !hasNeighbor; dy++) {
      for (let dx = -2; dx <= 2 && !hasNeighbor; dx++) {
        const nx = cell.x + dx;
        const ny = cell.y + dy;
        if (isValidPosition(nx, ny) && board[ny][nx] !== EMPTY) {
          hasNeighbor = true;
        }
      }
    }
    if (!hasNeighbor) continue;

    const score = evaluatePosition(board, cell.x, cell.y, WHITE);

    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push(cell);
    } else if (score === bestScore) {
      bestMoves.push(cell);
    }
  }

  if (bestMoves.length === 0) {
    const idx = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[idx];
  }

  const idx = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[idx];
}
