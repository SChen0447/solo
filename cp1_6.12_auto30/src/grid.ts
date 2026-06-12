export interface RuleConfig {
  birth: Set<number>;
  survive: Set<number>;
}

export const DEFAULT_RULE: RuleConfig = {
  birth: new Set([3]),
  survive: new Set([2, 3]),
};

export const GRID_SIZE = 50;

export type CellState = 0 | 1;

export interface PatternInfo {
  stillLifes: number;
  oscillators: number;
  gliders: number;
}

export class Grid {
  cells: CellState[][];
  ages: number[][];
  rule: RuleConfig;
  iteration: number;
  private previousCells: CellState[][] | null;
  private twoAgoCells: CellState[][] | null;

  constructor(rule?: RuleConfig) {
    this.rule = rule ?? { birth: new Set(DEFAULT_RULE.birth), survive: new Set(DEFAULT_RULE.survive) };
    this.cells = this.createEmptyGrid();
    this.ages = this.createAgeGrid();
    this.iteration = 0;
    this.previousCells = null;
    this.twoAgoCells = null;
  }

  private createEmptyGrid(): CellState[][] {
    const grid: CellState[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = new Array<CellState>(GRID_SIZE).fill(0);
    }
    return grid;
  }

  private createAgeGrid(): number[][] {
    const grid: number[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = new Array<number>(GRID_SIZE).fill(0);
    }
    return grid;
  }

  toggleCell(row: number, col: number): void {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    if (this.cells[row][col] === 0) {
      this.cells[row][col] = 1;
      this.ages[row][col] = 0;
    } else {
      this.cells[row][col] = 0;
      this.ages[row][col] = 0;
    }
  }

  setCell(row: number, col: number, state: CellState): void {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    this.cells[row][col] = state;
    if (state === 1) {
      this.ages[row][col] = 0;
    } else {
      this.ages[row][col] = 0;
    }
  }

  countNeighbors(row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = (row + dr + GRID_SIZE) % GRID_SIZE;
        const nc = (col + dc + GRID_SIZE) % GRID_SIZE;
        count += this.cells[nr][nc];
      }
    }
    return count;
  }

  step(): void {
    const newCells = this.createEmptyGrid();
    const newAges = this.createAgeGrid();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const neighbors = this.countNeighbors(r, c);
        const alive = this.cells[r][c] === 1;

        if (alive && this.rule.survive.has(neighbors)) {
          newCells[r][c] = 1;
          newAges[r][c] = this.ages[r][c] + 1;
        } else if (!alive && this.rule.birth.has(neighbors)) {
          newCells[r][c] = 1;
          newAges[r][c] = 0;
        } else {
          newCells[r][c] = 0;
          newAges[r][c] = 0;
        }
      }
    }

    this.twoAgoCells = this.previousCells;
    this.previousCells = this.cells;
    this.cells = newCells;
    this.ages = newAges;
    this.iteration++;
  }

  reset(): void {
    this.cells = this.createEmptyGrid();
    this.ages = this.createAgeGrid();
    this.iteration = 0;
    this.previousCells = null;
    this.twoAgoCells = null;
  }

  applyPreset(preset: 'random' | 'glider' | 'oscillator'): void {
    this.reset();

    if (preset === 'random') {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          this.cells[r][c] = Math.random() < 0.3 ? 1 : 0;
        }
      }
    } else if (preset === 'glider') {
      const patterns: [number, number][] = [
        [22, 25], [23, 26], [24, 24], [24, 25], [24, 26],
        [12, 5], [13, 6], [14, 4], [14, 5], [14, 6],
        [30, 40], [31, 41], [32, 39], [32, 40], [32, 41],
      ];
      for (const [r, c] of patterns) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          this.cells[r][c] = 1;
        }
      }
    } else if (preset === 'oscillator') {
      const blinker1: [number, number][] = [
        [10, 10], [10, 11], [10, 12],
      ];
      const blinker2: [number, number][] = [
        [20, 25], [21, 25], [22, 25],
      ];
      const toad: [number, number][] = [
        [30, 30], [30, 31], [30, 32],
        [31, 29], [31, 30], [31, 31],
      ];
      const beacon: [number, number][] = [
        [40, 10], [40, 11], [41, 10], [41, 11],
        [42, 12], [42, 13], [43, 12], [43, 13],
      ];

      for (const [r, c] of [...blinker1, ...blinker2, ...toad, ...beacon]) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          this.cells[r][c] = 1;
        }
      }
    }
  }

  getAliveCount(): number {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        count += this.cells[r][c];
      }
    }
    return count;
  }

  getAliveCells(): { row: number; col: number }[] {
    const result: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.cells[r][c] === 1) {
          result.push({ row: r, col: c });
        }
      }
    }
    return result;
  }

  detectPatterns(): PatternInfo {
    const visited = new Set<string>();
    let stillLifes = 0;
    let oscillators = 0;
    let gliders = 0;

    const components = this.findConnectedComponents();

    for (const component of components) {
      if (component.length === 0) continue;
      const key = component.map(p => `${p[0]},${p[1]}`).sort().join('|');
      if (visited.has(key)) continue;
      visited.add(key);

      const pattern = this.classifyComponent(component);
      if (pattern === 'still') stillLifes++;
      else if (pattern === 'oscillator') oscillators++;
      else if (pattern === 'glider') gliders++;
    }

    return { stillLifes, oscillators, gliders };
  }

  private findConnectedComponents(): [number, number][][] {
    const visited = new Set<string>();
    const components: [number, number][][] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.cells[r][c] === 1 && !visited.has(`${r},${c}`)) {
          const component: [number, number][] = [];
          const stack: [number, number][] = [[r, c]];
          visited.add(`${r},${c}`);

          while (stack.length > 0) {
            const [cr, cc] = stack.pop()!;
            component.push([cr, cc]);

            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = cr + dr;
                const nc = cc + dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                  const nk = `${nr},${nc}`;
                  if (this.cells[nr][nc] === 1 && !visited.has(nk)) {
                    visited.add(nk);
                    stack.push([nr, nc]);
                  }
                }
              }
            }
          }

          components.push(component);
        }
      }
    }

    return components;
  }

  private classifyComponent(component: [number, number][]): 'still' | 'oscillator' | 'glider' | 'unknown' {
    if (component.length <= 2) return 'still';

    if (this.previousCells) {
      const currentSet = new Set(component.map(([r, c]) => `${r},${c}`));

      if (this.twoAgoCells) {
        let matchesPrev = true;
        let matchesTwoAgo = true;

        for (const [r, c] of component) {
          if (this.previousCells[r][c] !== 1) { matchesPrev = false; break; }
        }

        if (matchesPrev) {
          const prevCompSet = new Set<string>();
          const stack: [number, number][] = [component[0]];
          const pv = new Set<string>();
          pv.add(`${component[0][0]},${component[0][1]}`);

          while (stack.length > 0) {
            const [cr, cc] = stack.pop()!;
            prevCompSet.add(`${cr},${cc}`);
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = cr + dr;
                const nc = cc + dc;
                const nk = `${nr},${nc}`;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE &&
                    this.previousCells[nr][nc] === 1 && !pv.has(nk)) {
                  pv.add(nk);
                  stack.push([nr, nc]);
                }
              }
            }
          }

          if (prevCompSet.size === currentSet.size) {
            let allMatch = true;
            for (const key of prevCompSet) {
              if (!currentSet.has(key)) { allMatch = false; break; }
            }
            if (allMatch) return 'still';
          }
        }

        const twoAgoCompSet = new Set<string>();
        const stack2: [number, number][] = [component[0]];
        const pv2 = new Set<string>();
        pv2.add(`${component[0][0]},${component[0][1]}`);

        while (stack2.length > 0) {
          const [cr, cc] = stack2.pop()!;
          twoAgoCompSet.add(`${cr},${cc}`);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = cr + dr;
              const nc = cc + dc;
              const nk = `${nr},${nc}`;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE &&
                  this.twoAgoCells![nr][nc] === 1 && !pv2.has(nk)) {
                pv2.add(nk);
                stack2.push([nr, nc]);
              }
            }
          }
        }

        if (twoAgoCompSet.size === currentSet.size) {
          let allMatch = true;
          for (const key of twoAgoCompSet) {
            if (!currentSet.has(key)) { allMatch = false; break; }
          }
          if (allMatch) return 'oscillator';
        }

        if (twoAgoCompSet.size === currentSet.size) {
          let dx: number | null = null;
          let dy: number | null = null;
          let isTranslation = true;

          for (const [r, c] of component) {
            const curKey = `${r},${c}`;
            if (twoAgoCompSet.has(curKey)) continue;

            const minR = Math.min(...component.map(p => p[0]));
            const minC = Math.min(...component.map(p => p[1]));
            const candidates = [...twoAgoCompSet].map(k => {
              const [tr, tc] = k.split(',').map(Number);
              return [tr, tc] as [number, number];
            });
            const minR2 = Math.min(...candidates.map(p => p[0]));
            const minC2 = Math.min(...candidates.map(p => p[1]));

            const tdx = minR - minR2;
            const tdy = minC - minC2;

            if (dx === null) { dx = tdx; dy = tdy; }
            else if (tdx !== dx || tdy !== dy) { isTranslation = false; break; }
          }

          if (isTranslation && dx !== null && (dx !== 0 || dy !== 0)) {
            return 'glider';
          }
        }
      }
    }

    if (component.length <= 4) return 'still';

    return 'unknown';
  }

  exportJSON(): string {
    const data = {
      iteration: this.iteration,
      rule: {
        birth: Array.from(this.rule.birth),
        survive: Array.from(this.rule.survive),
      },
      aliveCells: this.getAliveCells(),
    };
    return JSON.stringify(data, null, 2);
  }

  importJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (typeof data.iteration !== 'number' || !Array.isArray(data.aliveCells)) return false;

      this.reset();
      this.iteration = data.iteration;

      if (data.rule) {
        this.rule = {
          birth: new Set(data.rule.birth as number[]),
          survive: new Set(data.rule.survive as number[]),
        };
      }

      for (const cell of data.aliveCells) {
        if (typeof cell.row === 'number' && typeof cell.col === 'number' &&
            cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE) {
          this.cells[cell.row][cell.col] = 1;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
