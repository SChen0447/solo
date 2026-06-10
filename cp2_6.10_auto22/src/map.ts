export const GRID_SIZE = 20;
export const TILE_SIZE = 32;
export const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

export type TileType = 0 | 1;

export interface Item {
  id: string;
  type: 'coin' | 'key' | 'portal' | 'door';
  x: number;
  y: number;
  collected: boolean;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export class DungeonMap {
  level: number;
  grid: TileType[][];
  rooms: Room[];
  items: Item[];
  isDeep: boolean;
  echoDecay: number;
  playerSpawn: { x: number; y: number };
  explored: boolean[][];

  constructor(level: number) {
    this.level = level;
    this.isDeep = level > 3;
    this.echoDecay = this.isDeep ? 0.7 : 1.0;
    this.grid = [];
    this.rooms = [];
    this.items = [];
    this.playerSpawn = { x: 1, y: 1 };
    this.explored = [];
    this.generate();
  }

  private seedRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  private noise(x: number, y: number, rand: () => number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = rand();
    const b = rand();
    const c = rand();
    const d = rand();
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
  }

  generate(): void {
    const seed = Date.now() + this.level * 1000;
    const rand = this.seedRandom(seed);

    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = 1;
      }
    }

    this.explored = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.explored[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.explored[y][x] = false;
      }
    }

    this.generateRooms(rand);
    this.generateCorridors(rand);
    this.placeItems(rand);
    this.placeDoor(rand);
    this.findPlayerSpawn();
  }

  private generateRooms(rand: () => number): void {
    this.rooms = [];
    const targetRooms = 6;
    let attempts = 0;

    while (this.rooms.length < targetRooms && attempts < 200) {
      attempts++;
      const w = Math.floor(rand() * 4) + 3;
      const h = Math.floor(rand() * 4) + 3;
      const x = Math.floor(rand() * (GRID_SIZE - w - 2)) + 1;
      const y = Math.floor(rand() * (GRID_SIZE - h - 2)) + 1;

      const newRoom: Room = {
        x,
        y,
        w,
        h,
        cx: Math.floor(x + w / 2),
        cy: Math.floor(y + h / 2)
      };

      let overlaps = false;
      for (const room of this.rooms) {
        if (
          newRoom.x <= room.x + room.w + 1 &&
          newRoom.x + newRoom.w + 1 >= room.x &&
          newRoom.y <= room.y + room.h + 1 &&
          newRoom.y + newRoom.h + 1 >= room.y
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x > 0 && x < GRID_SIZE - 1 && y > 0 && y < GRID_SIZE - 1) {
          this.grid[y][x] = 0;
        }
      }
    }
  }

  private generateCorridors(rand: () => number): void {
    if (this.rooms.length < 2) return;

    const connected: Set<number> = new Set([0]);
    const targetCorridors = Math.min(3, this.rooms.length - 1);
    let corridorsMade = 0;

    while (corridorsMade < targetCorridors && connected.size < this.rooms.length) {
      let bestFrom = -1;
      let bestTo = -1;
      let bestDist = Infinity;

      for (const fromIdx of connected) {
        for (let toIdx = 0; toIdx < this.rooms.length; toIdx++) {
          if (connected.has(toIdx)) continue;
          const dist = Math.abs(this.rooms[fromIdx].cx - this.rooms[toIdx].cx) +
                       Math.abs(this.rooms[fromIdx].cy - this.rooms[toIdx].cy);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrom = fromIdx;
            bestTo = toIdx;
          }
        }
      }

      if (bestFrom === -1 || bestTo === -1) break;

      this.carveCorridor(this.rooms[bestFrom], this.rooms[bestTo], rand);
      connected.add(bestTo);
      corridorsMade++;
    }
  }

  private carveCorridor(a: Room, b: Room, rand: () => number): void {
    let x = a.cx;
    let y = a.cy;
    const targetX = b.cx;
    const targetY = b.cy;

    const hFirst = rand() > 0.5;

    if (hFirst) {
      while (x !== targetX) {
        this.grid[y][x] = 0;
        if (y > 1) this.grid[y - 1][x] = 0;
        x += x < targetX ? 1 : -1;
      }
      while (y !== targetY) {
        this.grid[y][x] = 0;
        if (x > 1) this.grid[y][x - 1] = 0;
        y += y < targetY ? 1 : -1;
      }
    } else {
      while (y !== targetY) {
        this.grid[y][x] = 0;
        if (x > 1) this.grid[y][x - 1] = 0;
        y += y < targetY ? 1 : -1;
      }
      while (x !== targetX) {
        this.grid[y][x] = 0;
        if (y > 1) this.grid[y - 1][x] = 0;
        x += x < targetX ? 1 : -1;
      }
    }
    this.grid[targetY][targetX] = 0;
  }

  private placeItems(rand: () => number): void {
    this.items = [];
    const floorTiles: { x: number; y: number }[] = [];

    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === 0) {
          floorTiles.push({ x, y });
        }
      }
    }

    for (let i = floorTiles.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
    }

    const coinCount = 5 + Math.floor(rand() * 4);
    let placed = 0;
    for (const tile of floorTiles) {
      if (placed >= coinCount) break;
      this.items.push({
        id: `coin_${this.level}_${tile.x}_${tile.y}`,
        type: 'coin',
        x: tile.x,
        y: tile.y,
        collected: false
      });
      placed++;
    }

    const keyIdx = placed;
    if (keyIdx < floorTiles.length) {
      this.items.push({
        id: `key_${this.level}`,
        type: 'key',
        x: floorTiles[keyIdx].x,
        y: floorTiles[keyIdx].y,
        collected: false
      });
      placed++;
    }

    const portalIdx = placed;
    if (portalIdx < floorTiles.length) {
      this.items.push({
        id: `portal_${this.level}`,
        type: 'portal',
        x: floorTiles[portalIdx].x,
        y: floorTiles[portalIdx].y,
        collected: false
      });
    }
  }

  private placeDoor(rand: () => number): void {
    if (this.rooms.length < 2) return;

    const lastRoom = this.rooms[this.rooms.length - 1];
    let doorX = lastRoom.cx;
    let doorY = lastRoom.cy;

    const candidates = [
      { x: lastRoom.x + Math.floor(lastRoom.w / 2), y: lastRoom.y },
      { x: lastRoom.x + Math.floor(lastRoom.w / 2), y: lastRoom.y + lastRoom.h - 1 },
      { x: lastRoom.x, y: lastRoom.y + Math.floor(lastRoom.h / 2) },
      { x: lastRoom.x + lastRoom.w - 1, y: lastRoom.y + Math.floor(lastRoom.h / 2) }
    ];

    for (const c of candidates) {
      if (this.grid[c.y] && this.grid[c.y][c.x] === 0) {
        doorX = c.x;
        doorY = c.y;
        break;
      }
    }

    this.items.push({
      id: `door_${this.level}`,
      type: 'door',
      x: doorX,
      y: doorY,
      collected: false
    });
  }

  private findPlayerSpawn(): void {
    if (this.rooms.length > 0) {
      const firstRoom = this.rooms[0];
      this.playerSpawn = {
        x: firstRoom.cx,
        y: firstRoom.cy
      };
    } else {
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        for (let x = 1; x < GRID_SIZE - 1; x++) {
          if (this.grid[y][x] === 0) {
            this.playerSpawn = { x, y };
            return;
          }
        }
      }
    }
  }

  isWall(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return true;
    return this.grid[gy][gx] === 1;
  }

  isWalkable(gx: number, gy: number): boolean {
    return !this.isWall(gx, gy);
  }

  checkCollision(px: number, py: number, radius: number = 8): boolean {
    const tl = this.worldToGrid(px - radius, py - radius);
    const br = this.worldToGrid(px + radius, py + radius);

    for (let y = tl.y; y <= br.y; y++) {
      for (let x = tl.x; x <= br.x; x++) {
        if (this.isWall(x, y)) {
          const wx = x * TILE_SIZE;
          const wy = y * TILE_SIZE;
          const closestX = Math.max(wx, Math.min(px, wx + TILE_SIZE));
          const closestY = Math.max(wy, Math.min(py, wy + TILE_SIZE));
          const dx = px - closestX;
          const dy = py - closestY;
          if (dx * dx + dy * dy < radius * radius) {
            return true;
          }
        }
      }
    }
    return false;
  }

  worldToGrid(wx: number, wy: number): { x: number; y: number } {
    return {
      x: Math.floor(wx / TILE_SIZE),
      y: Math.floor(wy / TILE_SIZE)
    };
  }

  gridToWorld(gx: number, gy: number): { x: number; y: number } {
    return {
      x: gx * TILE_SIZE + TILE_SIZE / 2,
      y: gy * TILE_SIZE + TILE_SIZE / 2
    };
  }

  calculateEchoIntensity(px: number, py: number, radius: number): number {
    const g = this.worldToGrid(px, py);
    let wallCount = 0;
    let totalCount = 0;
    const gridRadius = Math.ceil(radius / TILE_SIZE);

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const gx = g.x + dx;
        const gy = g.y + dy;
        if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) * TILE_SIZE;
        if (dist <= radius) {
          totalCount++;
          if (this.grid[gy][gx] === 1) {
            const decay = 1 - (dist / radius) * this.echoDecay;
            wallCount += Math.max(0, decay);
          }
        }
      }
    }

    if (totalCount === 0) return 0;
    return Math.min(1, wallCount / Math.max(1, totalCount / 4));
  }

  calculateTerrainDensity(px: number, py: number): number {
    const g = this.worldToGrid(px, py);
    let wallCount = 0;
    const range = 3;
    let total = 0;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const gx = g.x + dx;
        const gy = g.y + dy;
        if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) {
          wallCount++;
        } else if (this.grid[gy][gx] === 1) {
          wallCount++;
        }
        total++;
      }
    }

    return wallCount / total;
  }

  getRandomWalkablePosition(): { x: number; y: number } {
    const floors: { x: number; y: number }[] = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (this.grid[y][x] === 0) {
          floors.push({ x, y });
        }
      }
    }
    if (floors.length === 0) return this.playerSpawn;
    const idx = Math.floor(Math.random() * floors.length);
    return floors[idx];
  }

  markExplored(gx: number, gy: number): void {
    const range = 2;
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          this.explored[y][x] = true;
        }
      }
    }
  }
}
