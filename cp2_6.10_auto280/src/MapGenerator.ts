import { TerrainType, GridPos, TerrainCell, MAP_WIDTH, MAP_HEIGHT, BASE_POS, SPAWN_POSITIONS } from './types';

export class SimplexNoise {
  private perm: number[];

  constructor(seed: number = Math.random() * 65536) {
    this.perm = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const perm: number[] = [];
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    return perm;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      this.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }
}

export class MapGenerator {
  private noise: SimplexNoise;
  public grid: TerrainCell[][] = [];
  public seed: number;

  constructor(seedInput?: string) {
    this.seed = this.parseSeed(seedInput);
    this.noise = new SimplexNoise(this.seed);
    this.generate();
  }

  private parseSeed(seedInput?: string): number {
    if (!seedInput || seedInput.trim() === '') {
      return Math.floor(Math.random() * 1000000);
    }
    let hash = 0;
    const s = seedInput.trim();
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  public regenerate(seedInput?: string): void {
    this.seed = this.parseSeed(seedInput);
    this.noise = new SimplexNoise(this.seed);
    this.generate();
  }

  private generate(): void {
    this.grid = [];
    const scale = 0.12;
    const moistureScale = 0.18;

    for (let row = 0; row < MAP_HEIGHT; row++) {
      this.grid[row] = [];
      for (let col = 0; col < MAP_WIDTH; col++) {
        const elevation = this.noise.noise2D(col * scale, row * scale);
        const moisture = this.noise.noise2D(col * moistureScale + 100, row * moistureScale + 100);

        let type = TerrainType.GRASS;

        if (elevation > 0.4) {
          type = TerrainType.ROCK;
        } else if (elevation < -0.25) {
          type = TerrainType.WATER;
        } else if (moisture > 0.15) {
          type = TerrainType.FOREST;
        }

        this.grid[row][col] = {
          type,
          pos: { col, row }
        };
      }
    }

    this.ensureBaseAndSpawns();
    this.ensurePathExists();
  }

  private ensureBaseAndSpawns(): void {
    this.grid[BASE_POS.row][BASE_POS.col].type = TerrainType.GRASS;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = BASE_POS.row + dr;
        const c = BASE_POS.col + dc;
        if (r >= 0 && r < MAP_HEIGHT && c >= 0 && c < MAP_WIDTH) {
          if (this.grid[r][c].type === TerrainType.ROCK) {
            this.grid[r][c].type = TerrainType.GRASS;
          }
        }
      }
    }

    for (const spawn of SPAWN_POSITIONS) {
      this.grid[spawn.row][spawn.col].type = TerrainType.GRASS;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = spawn.row + dr;
          const c = spawn.col + dc;
          if (r >= 0 && r < MAP_HEIGHT && c >= 0 && c < MAP_WIDTH) {
            if (this.grid[r][c].type === TerrainType.ROCK) {
              this.grid[r][c].type = TerrainType.GRASS;
            }
          }
        }
      }
    }
  }

  private findPathAStar(blocked: Set<string>, start: GridPos, goal: GridPos): GridPos[] | null {
    const key = (p: GridPos) => `${p.col},${p.row}`;
    const open: { pos: GridPos; g: number; f: number }[] = [];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();

    const h = (a: GridPos) => Math.abs(a.col - goal.col) + Math.abs(a.row - goal.row);

    open.push({ pos: start, g: 0, f: h(start) });
    gScore.set(key(start), 0);

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;

      if (current.pos.col === goal.col && current.pos.row === goal.row) {
        const path: GridPos[] = [current.pos];
        let ck = key(current.pos);
        while (cameFrom.has(ck)) {
          ck = cameFrom.get(ck)!;
          const [c, r] = ck.split(',').map(Number);
          path.unshift({ col: c, row: r });
        }
        return path;
      }

      const neighbors: GridPos[] = [
        { col: current.pos.col + 1, row: current.pos.row },
        { col: current.pos.col - 1, row: current.pos.row },
        { col: current.pos.col, row: current.pos.row + 1 },
        { col: current.pos.col, row: current.pos.row - 1 }
      ];

      for (const n of neighbors) {
        if (n.col < 0 || n.col >= MAP_WIDTH || n.row < 0 || n.row >= MAP_HEIGHT) continue;
        if (blocked.has(key(n))) continue;

        const tentativeG = (gScore.get(key(current.pos)) ?? Infinity) + 1;
        if (tentativeG < (gScore.get(key(n)) ?? Infinity)) {
          cameFrom.set(key(n), key(current.pos));
          gScore.set(key(n), tentativeG);
          if (!open.find(o => o.pos.col === n.col && o.pos.row === n.row)) {
            open.push({ pos: n, g: tentativeG, f: tentativeG + h(n) });
          }
        }
      }
    }

    return null;
  }

  private ensurePathExists(): void {
    const blocked = new Set<string>();
    for (let r = 0; r < MAP_HEIGHT; r++) {
      for (let c = 0; c < MAP_WIDTH; c++) {
        if (this.grid[r][c].type === TerrainType.ROCK) {
          blocked.add(`${c},${r}`);
        }
      }
    }

    for (const spawn of SPAWN_POSITIONS) {
      const path = this.findPathAStar(blocked, spawn, BASE_POS);
      if (!path) {
        this.carvePath(spawn, BASE_POS, blocked);
      }
    }
  }

  private carvePath(start: GridPos, end: GridPos, blocked: Set<string>): void {
    let cur = { ...start };
    while (cur.col !== end.col || cur.row !== end.row) {
      if (blocked.has(`${cur.col},${cur.row}`)) {
        this.grid[cur.row][cur.col].type = TerrainType.GRASS;
        blocked.delete(`${cur.col},${cur.row}`);
      }
      if (cur.col < end.col) cur.col++;
      else if (cur.col > end.col) cur.col--;
      else if (cur.row < end.row) cur.row++;
      else if (cur.row > end.row) cur.row--;
    }
  }

  public getCell(col: number, row: number): TerrainCell | null {
    if (col < 0 || col >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) return null;
    return this.grid[row][col];
  }

  public isWalkable(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return false;
    return cell.type !== TerrainType.ROCK;
  }

  public canBuildTower(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return false;
    if (cell.type === TerrainType.WATER || cell.type === TerrainType.ROCK) return false;
    if (col === BASE_POS.col && row === BASE_POS.row) return false;
    for (const spawn of SPAWN_POSITIONS) {
      if (col === spawn.col && row === spawn.row) return false;
    }
    return true;
  }

  public getBuildCostMultiplier(col: number, row: number): number {
    const cell = this.getCell(col, row);
    if (!cell) return 1;
    if (cell.type === TerrainType.FOREST) return 0.5;
    return 1;
  }

  public getSpeedMultiplier(col: number, row: number): number {
    const cell = this.getCell(col, row);
    if (!cell) return 1;
    if (cell.type === TerrainType.WATER) return 0.4;
    return 1;
  }
}
