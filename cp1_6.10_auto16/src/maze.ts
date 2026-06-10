export type CellType = 0 | 1;

export interface MazeData {
  grid: CellType[][];
  size: number;
  start: { x: number; z: number };
  exit: { x: number; z: number };
  pathCells: { x: number; z: number }[];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMaze(size: number): MazeData {
  if (size % 2 === 0) size += 1;
  const n = size;
  const grid: CellType[][] = [];
  for (let z = 0; z < n; z++) {
    grid[z] = [];
    for (let x = 0; x < n; x++) {
      grid[z][x] = 1;
    }
  }

  const startX = 1;
  const startZ = 1;

  const stack: Array<{ x: number; z: number }> = [];
  grid[startZ][startX] = 0;
  stack.push({ x: startX, z: startZ });

  const dirs = [
    { dx: 0, dz: -2 },
    { dx: 2, dz: 0 },
    { dx: 0, dz: 2 },
    { dx: -2, dz: 0 }
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const shuffled = shuffle([...dirs]);
    let carved = false;
    for (const d of shuffled) {
      const nx = current.x + d.dx;
      const nz = current.z + d.dz;
      if (nx > 0 && nx < n - 1 && nz > 0 && nz < n - 1 && grid[nz][nx] === 1) {
        grid[current.z + d.dz / 2][current.x + d.dx / 2] = 0;
        grid[nz][nx] = 0;
        stack.push({ x: nx, z: nz });
        carved = true;
        break;
      }
    }
    if (!carved) {
      stack.pop();
    }
  }

  const pathCells: { x: number; z: number }[] = [];
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      if (grid[z][x] === 0) {
        pathCells.push({ x, z });
      }
    }
  }

  const candidates: { x: number; z: number; dist: number }[] = [];
  for (const p of pathCells) {
    if (p.x === 0 || p.x === n - 1 || p.z === 0 || p.z === n - 1) continue;
    const onEdge =
      p.x === 1 || p.x === n - 2 || p.z === 1 || p.z === n - 2;
    if (!onEdge) continue;
    const dist = Math.abs(p.x - startX) + Math.abs(p.z - startZ);
    candidates.push({ ...p, dist });
  }
  candidates.sort((a, b) => b.dist - a.dist);
  const far = candidates[0] ?? { x: n - 2, z: n - 2 };

  let exitX = far.x;
  let exitZ = far.z;
  if (far.x === 1) {
    exitX = 0;
    grid[far.z][0] = 0;
  } else if (far.x === n - 2) {
    exitX = n - 1;
    grid[far.z][n - 1] = 0;
  } else if (far.z === 1) {
    exitZ = 0;
    grid[0][far.x] = 0;
  } else if (far.z === n - 2) {
    exitZ = n - 1;
    grid[n - 1][far.x] = 0;
  }
  if (!pathCells.find(c => c.x === exitX && c.z === exitZ)) {
    pathCells.push({ x: exitX, z: exitZ });
  }

  return {
    grid,
    size: n,
    start: { x: startX, z: startZ },
    exit: { x: exitX, z: exitZ },
    pathCells
  };
}
