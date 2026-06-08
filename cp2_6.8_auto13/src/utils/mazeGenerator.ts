import { Cell, Position, MAZE_WIDTH, MAZE_HEIGHT, TRAP_COUNT } from './gameTypes';

export function generateMaze(): { maze: Cell[][]; startPos: Position; endPos: Position; traps: Position[] } {
  const maze: Cell[][] = [];
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    maze[y] = [];
    for (let x = 0; x < MAZE_WIDTH; x++) {
      maze[y][x] = { type: 'wall', explored: false };
    }
  }

  const startX = 1;
  const startY = 1;
  const stack: Position[] = [{ x: startX, y: startY }];
  maze[startY][startX].type = 'path';

  const directions = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const shuffled = [...directions].sort(() => Math.random() - 0.5);
    let found = false;

    for (const dir of shuffled) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx > 0 && nx < MAZE_WIDTH - 1 && ny > 0 && ny < MAZE_HEIGHT - 1 && maze[ny][nx].type === 'wall') {
        maze[current.y + dir.dy / 2][current.x + dir.dx / 2].type = 'path';
        maze[ny][nx].type = 'path';
        stack.push({ x: nx, y: ny });
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }

  const pathCells: Position[] = [];
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      if (maze[y][x].type === 'path') {
        pathCells.push({ x, y });
      }
    }
  }

  const startPos = { x: 1, y: 1 };
  maze[startPos.y][startPos.x].type = 'start';

  const endPos = { x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 };
  if (maze[endPos.y][endPos.x].type !== 'path') {
    let farthest = pathCells[0];
    let maxDist = 0;
    for (const cell of pathCells) {
      const dist = Math.abs(cell.x - startPos.x) + Math.abs(cell.y - startPos.y);
      if (dist > maxDist) {
        maxDist = dist;
        farthest = cell;
      }
    }
    endPos.x = farthest.x;
    endPos.y = farthest.y;
  }
  maze[endPos.y][endPos.x].type = 'end';

  const traps: Position[] = [];
  const availableTraps = pathCells.filter(
    (c) =>
      !(c.x === startPos.x && c.y === startPos.y) &&
      !(c.x === endPos.x && c.y === endPos.y) &&
      Math.abs(c.x - startPos.x) + Math.abs(c.y - startPos.y) > 3
  );

  for (let i = 0; i < TRAP_COUNT && availableTraps.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableTraps.length);
    traps.push(availableTraps[idx]);
    availableTraps.splice(idx, 1);
  }

  return { maze, startPos, endPos, traps };
}

export function isWalkable(maze: Cell[][], x: number, y: number): boolean {
  if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) return false;
  return maze[y][x].type !== 'wall';
}

export function isTrap(traps: Position[], x: number, y: number): boolean {
  return traps.some((t) => t.x === x && t.y === y);
}

export function getNeighbors(maze: Cell[][], pos: Position, includeTraps = true): Position[] {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  const result: Position[] = [];
  for (const dir of directions) {
    const nx = pos.x + dir.dx;
    const ny = pos.y + dir.dy;
    if (isWalkable(maze, nx, ny)) {
      result.push({ x: nx, y: ny });
    }
  }
  return result;
}
