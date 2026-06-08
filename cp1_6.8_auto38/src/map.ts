export const TILE_WALL = '#';
export const TILE_FLOOR = '.';

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

export class GameMap {
  width: number;
  height: number;
  tiles: string[][];
  rooms: Room[];
  private time: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.rooms = [];
    this.generate();
  }

  generate(): void {
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = TILE_WALL;
      }
    }

    const targetRooms = Math.floor(Math.random() * 3) + 4;
    this.generateRooms(targetRooms);
    this.connectAllRooms();
  }

  private generateRooms(count: number): void {
    const minSize = 3;
    const maxSize = 5;
    let attempts = 0;
    const maxAttempts = 200;

    while (this.rooms.length < count && attempts < maxAttempts) {
      attempts++;
      const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

      const newRoom: Room = {
        x,
        y,
        width: w,
        height: h,
        centerX: Math.floor(x + w / 2),
        centerY: Math.floor(y + h / 2)
      };

      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room, 1)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }

    if (this.rooms.length < count) {
      this.forceAddRooms(count - this.rooms.length);
    }
  }

  private forceAddRooms(count: number): void {
    const minSize = 3;
    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let size = minSize; size >= 3 && !placed; size--) {
        for (let attempt = 0; attempt < 50 && !placed; attempt++) {
          const w = size;
          const h = size;
          const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
          const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

          const newRoom: Room = {
            x,
            y,
            width: w,
            height: h,
            centerX: Math.floor(x + w / 2),
            centerY: Math.floor(y + h / 2)
          };

          let overlaps = false;
          for (const room of this.rooms) {
            if (this.roomsOverlap(newRoom, room, 0)) {
              overlaps = true;
              break;
            }
          }

          if (!overlaps) {
            this.rooms.push(newRoom);
            this.carveRoom(newRoom);
            placed = true;
          }
        }
      }
    }
  }

  private roomsOverlap(r1: Room, r2: Room, padding: number): boolean {
    return !(
      r1.x + r1.width + padding <= r2.x ||
      r2.x + r2.width + padding <= r1.x ||
      r1.y + r1.height + padding <= r2.y ||
      r2.y + r2.height + padding <= r1.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.tiles[y][x] = TILE_FLOOR;
        }
      }
    }
  }

  private connectAllRooms(): void {
    if (this.rooms.length <= 1) return;

    const sortedRooms = [...this.rooms].sort((a, b) => {
      if (a.centerX !== b.centerX) return a.centerX - b.centerX;
      return a.centerY - b.centerY;
    });

    for (let i = 0; i < sortedRooms.length - 1; i++) {
      this.carveCorridor(sortedRooms[i], sortedRooms[i + 1]);
    }

    if (sortedRooms.length > 2) {
      for (let i = 0; i < sortedRooms.length - 2; i += 2) {
        if (Math.random() > 0.5) {
          this.carveCorridor(sortedRooms[i], sortedRooms[i + 2]);
        }
      }
    }
  }

  private carveCorridor(room1: Room, room2: Room): void {
    const x1 = room1.centerX;
    const y1 = room1.centerY;
    const x2 = room2.centerX;
    const y2 = room2.centerY;

    if (Math.random() > 0.5) {
      this.carveHorizontalCorridor(x1, x2, y1);
      this.carveVerticalCorridor(y1, y2, x2);
    } else {
      this.carveVerticalCorridor(y1, y2, x1);
      this.carveHorizontalCorridor(x1, x2, y2);
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.tiles[y][x] = TILE_FLOOR;
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.tiles[y][x] = TILE_FLOOR;
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.tiles[y][x] === TILE_FLOOR;
  }

  getRandomFloorPosition(): { x: number; y: number } {
    if (this.rooms.length === 0) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.tiles[y][x] === TILE_FLOOR) {
            return { x, y };
          }
        }
      }
    }
    const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
    const x = Math.floor(Math.random() * (room.width - 2)) + room.x + 1;
    const y = Math.floor(Math.random() * (room.height - 2)) + room.y + 1;
    return { x, y };
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
  }

  getFloorColor(t: number): string {
    const period = 2;
    const phase = (this.time + t * 0.1) % period / period;
    const intensity = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
    const r1 = 22, g1 = 33, b1 = 62;
    const r2 = 26, g2 = 26, b2 = 46;
    const r = Math.floor(r1 + (r2 - r1) * intensity);
    const g = Math.floor(g1 + (g2 - g1) * intensity);
    const b = Math.floor(b1 + (b2 - b1) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }

  getCenterPosition(): { x: number; y: number } {
    return { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
  }
}
