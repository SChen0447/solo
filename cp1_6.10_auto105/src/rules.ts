export type Species = 0 | 1 | 2 | 3;

export const SPECIES_EMPTY = 0 as const;
export const SPECIES_A = 1 as const;
export const SPECIES_B = 2 as const;
export const SPECIES_C = 3 as const;

export const SPECIES_COLORS: Record<Species, string> = {
  [SPECIES_EMPTY]: '#0a0f1e',
  [SPECIES_A]: '#ff6b35',
  [SPECIES_B]: '#00d4aa',
  [SPECIES_C]: '#a855f7',
};

export type RuleMode =
  | 'life'
  | 'predator'
  | 'dla'
  | 'avalanche'
  | 'forest'
  | 'crystal'
  | 'walker'
  | 'custom';

export const RULE_MODES: RuleMode[] = [
  'life',
  'predator',
  'dla',
  'avalanche',
  'forest',
  'crystal',
  'walker',
  'custom',
];

export const RULE_LABELS: Record<RuleMode, string> = {
  life: '基础生命游戏',
  predator: '捕食者-猎物',
  dla: '扩散限制聚集',
  avalanche: '雪崩',
  forest: '森林火灾',
  crystal: '晶核生长',
  walker: '随机游走绑定',
  custom: '用户自定义',
};

export interface Cell {
  species: Species;
  age: number;
  state: number;
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[];
}

export function createEmptyGrid(width: number, height: number): Grid {
  const cells: Cell[] = new Array(width * height);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { species: SPECIES_EMPTY, age: 0, state: 0 };
  }
  return { width, height, cells };
}

export function cloneGrid(grid: Grid): Grid {
  return {
    width: grid.width,
    height: grid.height,
    cells: grid.cells.map((c) => ({ ...c })),
  };
}

function idx(x: number, y: number, w: number): number {
  return y * w + x;
}

function countNeighbors(grid: Grid, x: number, y: number): Record<Species, number> {
  const counts: Record<Species, number> = {
    [SPECIES_EMPTY]: 0,
    [SPECIES_A]: 0,
    [SPECIES_B]: 0,
    [SPECIES_C]: 0,
  };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + grid.width) % grid.width;
      const ny = (y + dy + grid.height) % grid.height;
      const cell = grid.cells[idx(nx, ny, grid.width)];
      counts[cell.species]++;
    }
  }
  return counts;
}

export function applyTemperature(cell: Cell, temperature: number): boolean {
  const deathProb = (temperature / 100) * 0.2;
  if (cell.species !== SPECIES_EMPTY && Math.random() < deathProb) {
    cell.species = SPECIES_EMPTY;
    cell.age = 0;
    cell.state = 0;
    return true;
  }
  return false;
}

export function adaptGridToRule(grid: Grid, _newRule: RuleMode): void {
  for (const cell of grid.cells) {
    if (cell.species !== SPECIES_EMPTY && Math.random() < 0.5) {
      if (Math.random() < 0.5) {
        cell.species = SPECIES_EMPTY;
        cell.age = 0;
      } else {
        const choices: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
        cell.species = choices[Math.floor(Math.random() * 3)];
      }
      cell.state = 0;
    }
  }
}

function ruleLife(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      const total = neighbors[SPECIES_A] + neighbors[SPECIES_B] + neighbors[SPECIES_C];
      if (pCell.species !== SPECIES_EMPTY) {
        if (total < 2 || total > 3) {
          nCell.species = SPECIES_EMPTY;
          nCell.age = 0;
        } else {
          nCell.species = pCell.species;
          nCell.age = pCell.age + 1;
        }
      } else {
        if (total === 3) {
          let maxCount = 0;
          let maxSpecies: Species = SPECIES_A;
          for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
            if (neighbors[sp] > maxCount) {
              maxCount = neighbors[sp];
              maxSpecies = sp;
            }
          }
          nCell.species = maxSpecies;
          nCell.age = 0;
        }
      }
      nCell.state = 0;
    }
  }
}

function rulePredator(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      nCell.age = pCell.species !== SPECIES_EMPTY ? pCell.age + 1 : 0;
      nCell.state = pCell.state;
      if (pCell.species === SPECIES_B && neighbors[SPECIES_A] > 0) {
        if (Math.random() < 0.3) {
          nCell.species = SPECIES_A;
          nCell.age = 0;
          continue;
        }
      }
      if (pCell.species === SPECIES_C && neighbors[SPECIES_B] > 0) {
        if (Math.random() < 0.3) {
          nCell.species = SPECIES_B;
          nCell.age = 0;
          continue;
        }
      }
      if (pCell.species === SPECIES_A && neighbors[SPECIES_C] > 0) {
        if (Math.random() < 0.3) {
          nCell.species = SPECIES_C;
          nCell.age = 0;
          continue;
        }
      }
      if (pCell.species !== SPECIES_EMPTY) {
        const same = neighbors[pCell.species];
        if (same < 1 || same > 4) {
          if (Math.random() < 0.4) {
            nCell.species = SPECIES_EMPTY;
            nCell.age = 0;
            continue;
          }
        }
        nCell.species = pCell.species;
      } else {
        const candidates: Species[] = [];
        for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
          if (neighbors[sp] >= 2) candidates.push(sp);
        }
        if (candidates.length > 0) {
          nCell.species = candidates[Math.floor(Math.random() * candidates.length)];
          nCell.age = 0;
        }
      }
    }
  }
}

function ruleDLA(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      const total = neighbors[SPECIES_A] + neighbors[SPECIES_B] + neighbors[SPECIES_C];
      if (pCell.species !== SPECIES_EMPTY) {
        nCell.species = pCell.species;
        nCell.age = pCell.age + 1;
      } else if (total > 0 && Math.random() < 0.15) {
        let maxCount = 0;
        let maxSpecies: Species = SPECIES_A;
        for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
          if (neighbors[sp] > maxCount) {
            maxCount = neighbors[sp];
            maxSpecies = sp;
          }
        }
        nCell.species = maxSpecies;
        nCell.age = 0;
      } else {
        if (Math.random() < 0.02) {
          const choices: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
          nCell.species = choices[Math.floor(Math.random() * 3)];
          nCell.age = 0;
        }
      }
    }
  }
  for (let i = 0; i < 20; i++) {
    const rx = Math.floor(Math.random() * w);
    const ry = Math.floor(Math.random() * prev.height);
    const cell = next.cells[idx(rx, ry, w)];
    if (cell.species !== SPECIES_EMPTY && cell.age === 0) {
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      const nx = (rx + dx + w) % w;
      const ny = (ry + dy + prev.height) % prev.height;
      const target = next.cells[idx(nx, ny, w)];
      if (target.species === SPECIES_EMPTY) {
        target.species = cell.species;
        target.age = 0;
        cell.species = SPECIES_EMPTY;
        cell.age = 0;
      }
    }
  }
}

function ruleAvalanche(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      const total = neighbors[SPECIES_A] + neighbors[SPECIES_B] + neighbors[SPECIES_C];
      if (pCell.species !== SPECIES_EMPTY) {
        if (total >= 5) {
          nCell.species = SPECIES_EMPTY;
          nCell.age = 0;
          nCell.state = 1;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = (x + dx + w) % w;
              const ny = (y + dy + prev.height) % prev.height;
              const target = next.cells[idx(nx, ny, w)];
              if (target.species === SPECIES_EMPTY && Math.random() < 0.6) {
                target.species = pCell.species;
                target.age = 0;
              }
            }
          }
        } else {
          nCell.species = pCell.species;
          nCell.age = pCell.age + 1;
        }
      } else if (Math.random() < 0.01) {
        const choices: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
        nCell.species = choices[Math.floor(Math.random() * 3)];
        nCell.age = 0;
      }
    }
  }
}

function ruleForest(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      if (pCell.species !== SPECIES_EMPTY) {
        if (pCell.state === 1) {
          nCell.species = SPECIES_EMPTY;
          nCell.age = 0;
          nCell.state = 0;
        } else {
          let onFire = false;
          for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
            if (neighbors[sp] > 0) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = (x + dx + w) % w;
                  const ny = (y + dy + prev.height) % prev.height;
                  const nc = prev.cells[idx(nx, ny, w)];
                  if (nc.species === sp && nc.state === 1 && Math.random() < 0.4) {
                    onFire = true;
                    break;
                  }
                }
                if (onFire) break;
              }
            }
            if (onFire) break;
          }
          if (onFire || Math.random() < 0.002) {
            nCell.species = pCell.species;
            nCell.state = 1;
            nCell.age = pCell.age;
          } else {
            nCell.species = pCell.species;
            nCell.age = pCell.age + 1;
            nCell.state = 0;
          }
        }
      } else {
        if (Math.random() < 0.005) {
          const choices: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
          nCell.species = choices[Math.floor(Math.random() * 3)];
          nCell.age = 0;
          nCell.state = 0;
        }
      }
    }
  }
}

function ruleCrystal(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      if (pCell.species !== SPECIES_EMPTY) {
        nCell.species = pCell.species;
        nCell.age = pCell.age + 1;
        nCell.state = 1;
      } else {
        let bestSpecies: Species = SPECIES_EMPTY;
        let bestCount = 0;
        for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
          if (neighbors[sp] > bestCount) {
            bestCount = neighbors[sp];
            bestSpecies = sp;
          }
        }
        if (bestCount >= 2 && Math.random() < 0.5) {
          nCell.species = bestSpecies;
          nCell.age = 0;
          nCell.state = 0;
        } else if (bestCount >= 3) {
          nCell.species = bestSpecies;
          nCell.age = 0;
          nCell.state = 0;
        }
      }
    }
  }
}

function ruleWalker(prev: Grid, next: Grid): void {
  const w = prev.width;
  const h = prev.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nCell = next.cells[idx(x, y, w)];
      nCell.species = SPECIES_EMPTY;
      nCell.age = 0;
      nCell.state = 0;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      if (pCell.species === SPECIES_EMPTY) continue;
      const dirs = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const [dx, dy] = dirs[Math.floor(Math.random() * 5)];
      const nx = (x + dx + w) % w;
      const ny = (y + dy + h) % h;
      const target = next.cells[idx(nx, ny, w)];
      if (target.species === SPECIES_EMPTY) {
        target.species = pCell.species;
        target.age = pCell.age + 1;
      } else if (target.species === pCell.species && Math.random() < 0.3) {
        target.age = Math.max(target.age, pCell.age + 1);
      } else {
        const rx = Math.floor(Math.random() * w);
        const ry = Math.floor(Math.random() * h);
        const alt = next.cells[idx(rx, ry, w)];
        if (alt.species === SPECIES_EMPTY) {
          alt.species = pCell.species;
          alt.age = pCell.age + 1;
        }
      }
    }
  }
}

function ruleCustom(prev: Grid, next: Grid): void {
  const w = prev.width;
  for (let y = 0; y < prev.height; y++) {
    for (let x = 0; x < prev.width; x++) {
      const pCell = prev.cells[idx(x, y, w)];
      const nCell = next.cells[idx(x, y, w)];
      const neighbors = countNeighbors(prev, x, y);
      const total = neighbors[SPECIES_A] + neighbors[SPECIES_B] + neighbors[SPECIES_C];
      if (pCell.species !== SPECIES_EMPTY) {
        if (total < 1 || total > 5) {
          if (Math.random() < 0.5) {
            nCell.species = SPECIES_EMPTY;
            nCell.age = 0;
            nCell.state = 0;
            continue;
          }
        }
        nCell.species = pCell.species;
        nCell.age = pCell.age + 1;
        if (neighbors[pCell.species] === 0 && Math.random() < 0.1) {
          const candidates: Species[] = [];
          for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
            if (neighbors[sp] > 0) candidates.push(sp);
          }
          if (candidates.length > 0) {
            nCell.species = candidates[Math.floor(Math.random() * candidates.length)];
            nCell.age = 0;
          }
        }
      } else {
        if (total >= 2 && Math.random() < 0.3) {
          let maxCount = 0;
          let maxSpecies: Species = SPECIES_A;
          for (const sp of [SPECIES_A, SPECIES_B, SPECIES_C] as Species[]) {
            if (neighbors[sp] > maxCount) {
              maxCount = neighbors[sp];
              maxSpecies = sp;
            }
          }
          nCell.species = maxSpecies;
          nCell.age = 0;
        }
      }
    }
  }
}

const RULE_FNS: Record<RuleMode, (prev: Grid, next: Grid) => void> = {
  life: ruleLife,
  predator: rulePredator,
  dla: ruleDLA,
  avalanche: ruleAvalanche,
  forest: ruleForest,
  crystal: ruleCrystal,
  walker: ruleWalker,
  custom: ruleCustom,
};

export function evolveGrid(grid: Grid, mode: RuleMode, temperature: number): Grid {
  const next = createEmptyGrid(grid.width, grid.height);
  RULE_FNS[mode](grid, next);
  for (const cell of next.cells) {
    applyTemperature(cell, temperature);
  }
  return next;
}

export function countSpecies(grid: Grid): Record<Species, number> {
  const counts: Record<Species, number> = {
    [SPECIES_EMPTY]: 0,
    [SPECIES_A]: 0,
    [SPECIES_B]: 0,
    [SPECIES_C]: 0,
  };
  for (const cell of grid.cells) {
    counts[cell.species]++;
  }
  return counts;
}
