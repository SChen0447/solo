export type MazeGrid = number[][];

function createFullGrid(rows: number, cols: number): MazeGrid {
  const grid: MazeGrid = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(1);
    }
    grid.push(row);
  }
  return grid;
}

function carvePassage(
  grid: MazeGrid,
  startR: number,
  startC: number,
  endR: number,
  endC: number
): void {
  const midR = Math.floor((startR + endR) / 2);
  const midC = Math.floor((startC + endC) / 2);

  for (let c = startC; c <= endC; c++) {
    grid[midR][c] = 0;
  }
  for (let r = startR; r <= endR; r++) {
    grid[r][midC] = 0;
  }
}

function recursiveDivide(
  grid: MazeGrid,
  startR: number,
  startC: number,
  endR: number,
  endC: number
): void {
  const width = endC - startC + 1;
  const height = endR - startR + 1;

  if (width <= 3 || height <= 3) {
    return;
  }

  const midR = Math.floor((startR + endR) / 2);
  const midC = Math.floor((startC + endC) / 2);

  carvePassage(grid, startR, startC, endR, endC);

  const openings: [number, number][] = [];

  if (midR - 1 > startR + 1) {
    const c = startC + Math.floor(Math.random() * (midC - startC));
    openings.push([midR, c]);
  }
  if (midC + 1 < endC - 1) {
    const r = startR + Math.floor(Math.random() * (midR - startR));
    openings.push([r, midC]);
  }
  if (midR + 1 < endR - 1) {
    const c = midC + 1 + Math.floor(Math.random() * (endC - midC));
    openings.push([midR, c]);
  }
  if (midC - 1 > startC + 1) {
    const r = midR + 1 + Math.floor(Math.random() * (endR - midR));
    openings.push([r, midC]);
  }

  openings.forEach(([r, c]) => {
    grid[r][c] = 0;
  });

  recursiveDivide(grid, startR, startC, midR - 1, midC - 1);
  recursiveDivide(grid, startR, midC + 1, midR - 1, endC);
  recursiveDivide(grid, midR + 1, startC, endR, midC - 1);
  recursiveDivide(grid, midR + 1, midC + 1, endR, endC);
}

export function generateMaze(rows: number, cols: number): MazeGrid {
  const actualRows = rows % 2 === 0 ? rows + 1 : rows;
  const actualCols = cols % 2 === 0 ? cols + 1 : cols;

  const grid = createFullGrid(actualRows, actualCols);
  recursiveDivide(grid, 0, 0, actualRows - 1, actualCols - 1);

  for (let r = 1; r < actualRows - 1; r++) {
    for (let c = 1; c < actualCols - 1; c++) {
      if (r === 1 || r === actualRows - 2 || c === 1 || c === actualCols - 2) {
        grid[r][c] = 0;
      }
    }
  }

  return grid;
}
