export type GemColor = 'red' | 'blue' | 'green';

export interface Gem {
  id: string;
  color: GemColor;
  row: number;
  col: number;
  element: HTMLElement | null;
}

export const GRID_SIZE = 4;
export const GEM_COLORS: GemColor[] = ['red', 'blue', 'green'];

const COLOR_HEX: Record<GemColor, string> = {
  red: '#ff3b3b',
  blue: '#3b8bff',
  green: '#3bff7a',
};

let gemIdCounter = 0;

function generateGemId(): string {
  return `gem-${Date.now()}-${gemIdCounter++}`;
}

export function getRandomColor(): GemColor {
  return GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
}

export function isAdjacent(gem1: Gem, gem2: Gem): boolean {
  const rowDiff = Math.abs(gem1.row - gem2.row);
  const colDiff = Math.abs(gem1.col - gem2.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

export function createEmptyGrid(): (Gem | null)[][] {
  const grid: (Gem | null)[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: (Gem | null)[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(null);
    }
    grid.push(row);
  }
  return grid;
}

function hasValidMatch(grid: (Gem | null)[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const gem = grid[r][c];
      if (!gem) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            const neighbor = grid[nr][nc];
            if (neighbor && neighbor.color === gem.color) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

export function initializeGrid(): (Gem | null)[][] {
  let grid: (Gem | null)[][];
  let attempts = 0;
  do {
    grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = {
          id: generateGemId(),
          color: getRandomColor(),
          row: r,
          col: c,
          element: null,
        };
      }
    }
    attempts++;
  } while (!hasValidMatch(grid) && attempts < 100);
  return grid;
}

export function createGemElement(gem: Gem): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gem';
  el.dataset.gemId = gem.id;
  el.dataset.row = String(gem.row);
  el.dataset.col = String(gem.col);
  el.style.backgroundColor = COLOR_HEX[gem.color];
  el.style.transition = 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease';
  return el;
}

export function renderGrid(gridContainer: HTMLElement, grid: (Gem | null)[][]): void {
  gridContainer.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const gem = grid[r][c];
      if (gem) {
        const el = createGemElement(gem);
        gem.element = el;
        gridContainer.appendChild(el);
      }
    }
  }
}

export function findGemByPosition(
  grid: (Gem | null)[][],
  row: number,
  col: number
): Gem | null {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return grid[row][col];
}

export function findGemByElement(
  grid: (Gem | null)[][],
  element: HTMLElement
): Gem | null {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const gem = grid[r][c];
      if (gem && gem.element === element) return gem;
    }
  }
  return null;
}

export function applyGravity(grid: (Gem | null)[][]): number {
  let movedCount = 0;
  for (let c = 0; c < GRID_SIZE; c++) {
    let writeRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        if (r !== writeRow) {
          const gem = grid[r][c]!;
          grid[writeRow][c] = gem;
          grid[r][c] = null;
          gem.row = writeRow;
          if (gem.element) {
            gem.element.dataset.row = String(writeRow);
          }
          movedCount++;
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      const newGem: Gem = {
        id: generateGemId(),
        color: getRandomColor(),
        row: r,
        col: c,
        element: null,
      };
      grid[r][c] = newGem;
      movedCount++;
    }
  }
  return movedCount;
}

export function ensureNoDeadlock(grid: (Gem | null)[][]): void {
  let attempts = 0;
  while (!hasValidMatch(grid) && attempts < 50) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = grid[r][c];
        if (gem) {
          gem.color = getRandomColor();
          if (gem.element) {
            gem.element.style.backgroundColor = COLOR_HEX[gem.color];
          }
        }
      }
    }
    attempts++;
  }
}

export function removeGems(
  grid: (Gem | null)[][],
  gems: Gem[]
): void {
  for (const gem of gems) {
    if (grid[gem.row][gem.col] === gem) {
      if (gem.element) {
        gem.element.style.transform = 'scale(0) translateY(-30px)';
        gem.element.style.opacity = '0';
      }
      grid[gem.row][gem.col] = null;
    }
  }
}

export function getColorHex(color: GemColor): string {
  return COLOR_HEX[color];
}
