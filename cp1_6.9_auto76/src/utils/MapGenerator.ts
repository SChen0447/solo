export enum TileType {
  WALL = 0,
  FLOOR = 1,
  START = 2,
  END = 3,
  MONSTER_SPAWN = 4,
  CORRIDOR = 5
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}

export interface MapData {
  grid: TileType[][];
  rooms: Room[];
  startRoom: Room | null;
  endRoom: Room | null;
  monsterSpawns: { x: number; y: number }[];
  path: { x: number; y: number }[];
}

export class MapGenerator {
  private width: number;
  private height: number;

  constructor(width: number = 8, height: number = 8) {
    this.width = width;
    this.height = height;
  }

  public generate(): MapData {
    const grid: TileType[][] = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        grid[y][x] = TileType.WALL;
      }
    }

    const rooms: Room[] = this.generateRooms();
    this.carveRooms(grid, rooms);
    this.connectRooms(grid, rooms);

    let startRoom: Room | null = null;
    let endRoom: Room | null = null;
    if (rooms.length > 0) {
      startRoom = rooms[0];
      endRoom = rooms[rooms.length - 1];
      grid[startRoom.centerY][startRoom.centerX] = TileType.START;
      grid[endRoom.centerY][endRoom.centerX] = TileType.END;
    }

    const monsterSpawns = this.placeMonsterSpawns(grid, rooms);
    for (const spawn of monsterSpawns) {
      grid[spawn.y][spawn.x] = TileType.MONSTER_SPAWN;
    }

    const path = this.generatePath(grid, startRoom, endRoom);

    return { grid, rooms, startRoom, endRoom, monsterSpawns, path };
  }

  private generateRooms(): Room[] {
    const rooms: Room[] = [];
    const maxRooms = 5 + Math.floor(Math.random() * 3);

    for (let i = 0; i < maxRooms; i++) {
      const w = 2 + Math.floor(Math.random() * 2);
      const h = 2 + Math.floor(Math.random() * 2);
      const x = Math.floor(Math.random() * (this.width - w - 1)) + 1;
      const y = Math.floor(Math.random() * (this.height - h - 1)) + 1;

      const newRoom: Room = {
        x,
        y,
        w,
        h,
        centerX: Math.floor(x + w / 2),
        centerY: Math.floor(y + h / 2)
      };

      if (!this.roomOverlaps(newRoom, rooms)) {
        rooms.push(newRoom);
      }
    }

    if (rooms.length < 2) {
      rooms.length = 0;
      const r1: Room = { x: 1, y: 3, w: 2, h: 2, centerX: 2, centerY: 4 };
      const r2: Room = { x: 5, y: 3, w: 2, h: 2, centerX: 6, centerY: 4 };
      const r3: Room = { x: 3, y: 1, w: 2, h: 2, centerX: 4, centerY: 2 };
      rooms.push(r1, r3, r2);
    }

    return rooms;
  }

  private roomOverlaps(room: Room, rooms: Room[]): boolean {
    for (const other of rooms) {
      if (
        room.x <= other.x + other.w + 1 &&
        room.x + room.w + 1 >= other.x &&
        room.y <= other.y + other.h + 1 &&
        room.y + room.h + 1 >= other.y
      ) {
        return true;
      }
    }
    return false;
  }

  private carveRooms(grid: TileType[][], rooms: Room[]): void {
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.h && y < this.height; y++) {
        for (let x = room.x; x < room.x + room.w && x < this.width; x++) {
          if (x >= 0 && y >= 0) {
            grid[y][x] = TileType.FLOOR;
          }
        }
      }
    }
  }

  private connectRooms(grid: TileType[][], rooms: Room[]): void {
    for (let i = 1; i < rooms.length; i++) {
      const prev = rooms[i - 1];
      const curr = rooms[i];
      this.createHorizontalCorridor(grid, prev.centerX, curr.centerX, prev.centerY);
      this.createVerticalCorridor(grid, prev.centerY, curr.centerY, curr.centerX);
    }
  }

  private createHorizontalCorridor(grid: TileType[][], x1: number, x2: number, y: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        if (grid[y][x] === TileType.WALL) {
          grid[y][x] = TileType.CORRIDOR;
        }
      }
    }
  }

  private createVerticalCorridor(grid: TileType[][], y1: number, y2: number, x: number): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        if (grid[y][x] === TileType.WALL) {
          grid[y][x] = TileType.CORRIDOR;
        }
      }
    }
  }

  private placeMonsterSpawns(
    grid: TileType[][],
    rooms: Room[]
  ): { x: number; y: number }[] {
    const spawns: { x: number; y: number }[] = [];
    const candidateTiles: { x: number; y: number }[] = [];

    for (let i = 1; i < rooms.length - 1; i++) {
      const room = rooms[i];
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (grid[y][x] === TileType.FLOOR) {
            candidateTiles.push({ x, y });
          }
        }
      }
    }

    const spawnCount = Math.min(1 + Math.floor(Math.random() * 3), candidateTiles.length);
    for (let i = 0; i < spawnCount && candidateTiles.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidateTiles.length);
      spawns.push(candidateTiles.splice(idx, 1)[0]);
    }

    return spawns;
  }

  private generatePath(
    grid: TileType[][],
    start: Room | null,
    end: Room | null
  ): { x: number; y: number }[] {
    if (!start || !end) return [];

    const path: { x: number; y: number }[] = [];
    let cx = start.centerX;
    let cy = start.centerY;
    path.push({ x: cx, y: cy });

    while (cx !== end.centerX) {
      cx += cx < end.centerX ? 1 : -1;
      path.push({ x: cx, y: cy });
    }
    while (cy !== end.centerY) {
      cy += cy < end.centerY ? 1 : -1;
      path.push({ x: cx, y: cy });
    }

    return path;
  }
}
