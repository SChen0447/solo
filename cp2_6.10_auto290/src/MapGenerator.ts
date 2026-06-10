import { createNoise2D } from 'simplex-noise';
import { Position, TileType, GeneratedMap, LevelConfig } from './types';

export class MapGenerator {
  private noise2D: (x: number, y: number) => number;

  constructor(seed?: number) {
    const actualSeed = seed ?? Math.random() * 10000;
    this.noise2D = createNoise2D(() => actualSeed);
  }

  public generate(config: LevelConfig): GeneratedMap {
    const { mapSize, shardCount, monsterCount } = config;
    const tiles = this.generateTiles(mapSize);
    const start = this.findStartPosition(tiles, mapSize);
    this.carvePassages(tiles, start);
    const exit = this.findFarPosition(tiles, start, mapSize);
    this.ensurePath(tiles, start, exit);

    const shards = this.placeShards(tiles, start, exit, shardCount, mapSize);
    const monsterSpawns = this.placeMonsterSpawns(tiles, start, exit, shards, monsterCount, mapSize);

    tiles[start.y][start.x] = 'start';
    tiles[exit.y][exit.x] = 'exit';
    for (const shard of shards) {
      tiles[shard.y][shard.x] = 'shard';
    }

    return { tiles, size: mapSize, start, exit, shards, monsterSpawns };
  }

  private generateTiles(size: number): TileType[][] {
    const tiles: TileType[][] = [];
    const scale = 0.12;

    for (let y = 0; y < size; y++) {
      tiles[y] = [];
      for (let x = 0; x < size; x++) {
        if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
          tiles[y][x] = 'wall';
        } else {
          const noise = this.noise2D(x * scale, y * scale);
          tiles[y][x] = noise > 0.15 ? 'wall' : 'floor';
        }
      }
    }
    return tiles;
  }

  private findStartPosition(tiles: TileType[][], size: number): Position {
    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        if (tiles[y][x] === 'floor') {
          return { x, y };
        }
      }
    }
    const mid = Math.floor(size / 2);
    tiles[mid][mid] = 'floor';
    return { x: mid, y: mid };
  }

  private carvePassages(tiles: TileType[][], start: Position): void {
    const size = tiles.length;
    const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const stack: Position[] = [start];
    visited[start.y][start.x] = true;

    const directions = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffled = [...directions].sort(() => Math.random() - 0.5);
      let carved = false;

      for (const dir of shuffled) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && !visited[ny][nx]) {
          visited[ny][nx] = true;
          tiles[ny][nx] = 'floor';
          tiles[current.y + dir.dy / 2][current.x + dir.dx / 2] = 'floor';
          stack.push({ x: nx, y: ny });
          carved = true;
          break;
        }
      }

      if (!carved) {
        stack.pop();
      }
    }
  }

  private findFarPosition(tiles: TileType[][], start: Position, size: number): Position {
    const dist: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
    const queue: Position[] = [start];
    dist[start.y][start.x] = 0;
    let farthest = start;
    let maxDist = 0;

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && dist[ny][nx] === -1 && tiles[ny][nx] === 'floor') {
          dist[ny][nx] = dist[cur.y][cur.x] + 1;
          queue.push({ x: nx, y: ny });
          if (dist[ny][nx] > maxDist) {
            maxDist = dist[ny][nx];
            farthest = { x: nx, y: ny };
          }
        }
      }
    }
    return farthest;
  }

  private ensurePath(tiles: TileType[][], start: Position, exit: Position): void {
    const size = tiles.length;
    const parent: (Position | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const queue: Position[] = [start];
    visited[start.y][start.x] = true;

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === exit.x && cur.y === exit.y) break;
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx] && tiles[ny][nx] === 'floor') {
          visited[ny][nx] = true;
          parent[ny][nx] = cur;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    if (!visited[exit.y][exit.x]) {
      let cur = exit;
      while (cur.x !== start.x || cur.y !== start.y) {
        tiles[cur.y][cur.x] = 'floor';
        if (cur.x < start.x) cur = { x: cur.x + 1, y: cur.y };
        else if (cur.x > start.x) cur = { x: cur.x - 1, y: cur.y };
        else if (cur.y < start.y) cur = { x: cur.x, y: cur.y + 1 };
        else cur = { x: cur.x, y: cur.y - 1 };
      }
    }
  }

  private placeShards(
    tiles: TileType[][],
    start: Position,
    exit: Position,
    count: number,
    size: number
  ): Position[] {
    const shards: Position[] = [];
    const candidates: Position[] = [];

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (tiles[y][x] === 'floor' && !(x === start.x && y === start.y) && !(x === exit.x && y === exit.y)) {
          candidates.push({ x, y });
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);
    for (const pos of candidates) {
      if (shards.length >= count) break;
      if (!shards.some(s => Math.abs(s.x - pos.x) + Math.abs(s.y - pos.y) < 3)) {
        shards.push(pos);
      }
    }
    return shards;
  }

  private placeMonsterSpawns(
    tiles: TileType[][],
    start: Position,
    exit: Position,
    shards: Position[],
    count: number,
    size: number
  ): Position[] {
    const spawns: Position[] = [];
    const candidates: Position[] = [];

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (tiles[y][x] !== 'floor') continue;
        if (x === start.x && y === start.y) continue;
        if (x === exit.x && y === exit.y) continue;
        if (shards.some(s => s.x === x && s.y === y)) continue;
        const distToStart = Math.abs(x - start.x) + Math.abs(y - start.y);
        if (distToStart < 6) continue;
        candidates.push({ x, y });
      }
    }

    candidates.sort(() => Math.random() - 0.5);
    for (const pos of candidates) {
      if (spawns.length >= count) break;
      if (!spawns.some(s => Math.abs(s.x - pos.x) + Math.abs(s.y - pos.y) < 4)) {
        spawns.push(pos);
      }
    }
    return spawns;
  }

  public generatePatrolPath(tiles: TileType[][], start: Position, size: number): Position[] {
    const path: Position[] = [start];
    let current = start;
    const pathLength = 8 + Math.floor(Math.random() * 5);
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (let i = 0; i < pathLength - 1; i++) {
      const validDirs = dirs.filter(d => {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        return nx >= 0 && nx < size && ny >= 0 && ny < size &&
          tiles[ny][nx] !== 'wall' &&
          !path.some(p => p.x === nx && p.y === ny);
      });

      if (validDirs.length === 0) break;
      const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      current = { x: current.x + dir.dx, y: current.y + dir.dy };
      path.push(current);
    }
    return path;
  }

  public isWalkable(tiles: TileType[][], x: number, y: number): boolean {
    if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) return false;
    return tiles[y][x] !== 'wall';
  }
}
