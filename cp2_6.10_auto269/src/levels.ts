import { LevelData, TILE_SIZE, GRID_COLS, GRID_ROWS } from './types';

function createEmptyGrid(): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    grid.push(new Array(GRID_COLS).fill(0));
  }
  return grid;
}

function buildLevel1Grid(): number[][] {
  const grid = createEmptyGrid();

  for (let x = 0; x < GRID_COLS; x++) {
    grid[GRID_ROWS - 1][x] = 2;
    grid[0][x] = 2;
  }
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[y][0] = 2;
    grid[y][GRID_COLS - 1] = 2;
  }

  for (let x = 5; x < 9; x++) {
    grid[11][x] = 2;
  }
  for (let x = 12; x < 16; x++) {
    grid[8][x] = 2;
  }
  grid[5][6] = 2;
  grid[5][7] = 2;

  grid[13][8] = 1;
  grid[13][9] = 1;
  grid[13][10] = 1;
  grid[10][14] = 1;
  grid[10][15] = 1;

  grid[11][3] = 3;
  grid[7][17] = 3;

  grid[3][17] = 4;

  return grid;
}

function buildLevel2Grid(): number[][] {
  const grid = createEmptyGrid();

  for (let x = 0; x < GRID_COLS; x++) {
    grid[GRID_ROWS - 1][x] = 2;
    grid[0][x] = 2;
  }
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[y][0] = 2;
    grid[y][GRID_COLS - 1] = 2;
  }

  for (let x = 3; x < 7; x++) {
    grid[11][x] = 2;
  }
  for (let y = 5; y < 10; y++) {
    grid[y][9] = 2;
  }
  for (let x = 11; x < 15; x++) {
    grid[4][x] = 2;
  }
  for (let y = 8; y < 13; y++) {
    grid[y][16] = 2;
  }

  grid[13][5] = 1;
  grid[13][6] = 1;
  grid[13][10] = 1;
  grid[13][11] = 1;
  grid[13][12] = 1;
  grid[7][5] = 1;
  grid[7][6] = 1;
  grid[2][12] = 1;
  grid[2][13] = 1;

  grid[10][5] = 3;
  grid[3][13] = 3;
  grid[9][17] = 3;

  grid[13][17] = 4;

  return grid;
}

function buildLevel3Grid(): number[][] {
  const grid = createEmptyGrid();

  for (let x = 0; x < GRID_COLS; x++) {
    grid[GRID_ROWS - 1][x] = 2;
    grid[0][x] = 2;
  }
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[y][0] = 2;
    grid[y][GRID_COLS - 1] = 2;
  }

  for (let x = 2; x < 5; x++) {
    grid[12][x] = 2;
  }
  for (let y = 9; y < 13; y++) {
    grid[y][6] = 2;
  }
  for (let x = 7; x < 11; x++) {
    grid[8][x] = 2;
  }
  for (let y = 3; y < 7; y++) {
    grid[y][10] = 2;
  }
  for (let x = 11; x < 15; x++) {
    grid[2][x] = 2;
  }
  for (let y = 5; y < 10; y++) {
    grid[y][15] = 2;
  }
  grid[10][17] = 2;
  grid[11][17] = 2;
  grid[12][17] = 2;

  for (let x = 7; x < 11; x++) {
    grid[13][x] = 1;
  }
  grid[13][15] = 1;
  grid[13][16] = 1;
  grid[7][13] = 1;
  grid[7][14] = 1;
  grid[4][3] = 1;
  grid[4][4] = 1;
  grid[1][17] = 1;
  grid[1][18] = 1;

  grid[11][3] = 3;
  grid[7][8] = 3;
  grid[1][13] = 3;
  grid[6][17] = 3;

  grid[3][18] = 4;

  return grid;
}

export const LEVELS: LevelData[] = [
  {
    grid: buildLevel1Grid(),
    startPos: { x: 2 * TILE_SIZE + 8, y: 12 * TILE_SIZE + 8 },
    goalPos: { x: 17 * TILE_SIZE, y: 3 * TILE_SIZE },
    movingPlatforms: [
      {
        x: 9 * TILE_SIZE, y: 6 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 9 * TILE_SIZE, startY: 6 * TILE_SIZE,
        endX: 9 * TILE_SIZE, endY: 3 * TILE_SIZE,
        speed: 0.01, axis: 'vertical'
      },
      {
        x: 3 * TILE_SIZE, y: 8 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 3 * TILE_SIZE, startY: 8 * TILE_SIZE,
        endX: 6 * TILE_SIZE, endY: 8 * TILE_SIZE,
        speed: 0.008, axis: 'horizontal'
      },
      {
        x: 15 * TILE_SIZE, y: 11 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 15 * TILE_SIZE, startY: 11 * TILE_SIZE,
        endX: 17 * TILE_SIZE, endY: 11 * TILE_SIZE,
        speed: 0.009, axis: 'horizontal'
      }
    ],
    gravityStones: [
      { gridX: 3, gridY: 11 },
      { gridX: 17, gridY: 7 }
    ]
  },
  {
    grid: buildLevel2Grid(),
    startPos: { x: 2 * TILE_SIZE + 8, y: 10 * TILE_SIZE + 8 },
    goalPos: { x: 17 * TILE_SIZE, y: 13 * TILE_SIZE },
    movingPlatforms: [
      {
        x: 7 * TILE_SIZE, y: 12 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 7 * TILE_SIZE, startY: 12 * TILE_SIZE,
        endX: 7 * TILE_SIZE, endY: 8 * TILE_SIZE,
        speed: 0.012, axis: 'vertical'
      },
      {
        x: 11 * TILE_SIZE, y: 11 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 11 * TILE_SIZE, startY: 11 * TILE_SIZE,
        endX: 14 * TILE_SIZE, endY: 11 * TILE_SIZE,
        speed: 0.011, axis: 'horizontal'
      },
      {
        x: 2 * TILE_SIZE, y: 6 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 2 * TILE_SIZE, startY: 6 * TILE_SIZE,
        endX: 5 * TILE_SIZE, endY: 6 * TILE_SIZE,
        speed: 0.01, axis: 'horizontal'
      }
    ],
    gravityStones: [
      { gridX: 5, gridY: 10 },
      { gridX: 13, gridY: 3 },
      { gridX: 17, gridY: 9 }
    ]
  },
  {
    grid: buildLevel3Grid(),
    startPos: { x: 2 * TILE_SIZE + 8, y: 11 * TILE_SIZE + 8 },
    goalPos: { x: 18 * TILE_SIZE, y: 3 * TILE_SIZE },
    movingPlatforms: [
      {
        x: 5 * TILE_SIZE, y: 7 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 5 * TILE_SIZE, startY: 7 * TILE_SIZE,
        endX: 5 * TILE_SIZE, endY: 4 * TILE_SIZE,
        speed: 0.015, axis: 'vertical'
      },
      {
        x: 11 * TILE_SIZE, y: 6 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 11 * TILE_SIZE, startY: 6 * TILE_SIZE,
        endX: 14 * TILE_SIZE, endY: 6 * TILE_SIZE,
        speed: 0.013, axis: 'horizontal'
      },
      {
        x: 13 * TILE_SIZE, y: 11 * TILE_SIZE,
        width: 2 * TILE_SIZE, height: 8,
        startX: 13 * TILE_SIZE, startY: 11 * TILE_SIZE,
        endX: 13 * TILE_SIZE, endY: 8 * TILE_SIZE,
        speed: 0.014, axis: 'vertical'
      }
    ],
    gravityStones: [
      { gridX: 3, gridY: 11 },
      { gridX: 8, gridY: 7 },
      { gridX: 13, gridY: 1 },
      { gridX: 17, gridY: 6 }
    ]
  }
];
