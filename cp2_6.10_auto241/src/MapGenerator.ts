export enum TileType {
  WALL = 0,
  FLOOR = 1,
  FLOOR_LIT = 2,
  STAIRS = 3
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface GeneratedMap {
  tiles: TileType[][];
  rooms: Room[];
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  stairsX: number;
  stairsY: number;
  spawnX: number;
  spawnY: number;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createRoom(tiles: TileType[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
        tiles[y][x] = TileType.FLOOR;
      }
    }
  }
}

function createHorizontalCorridor(
  tiles: TileType[][],
  x1: number,
  x2: number,
  y: number
): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = TileType.FLOOR;
    }
  }
}

function createVerticalCorridor(
  tiles: TileType[][],
  y1: number,
  y2: number,
  x: number
): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = TileType.FLOOR;
    }
  }
}

function connectRooms(tiles: TileType[][], r1: Room, r2: Room): void {
  if (Math.random() < 0.5) {
    createHorizontalCorridor(tiles, r1.centerX, r2.centerX, r1.centerY);
    createVerticalCorridor(tiles, r1.centerY, r2.centerY, r2.centerX);
  } else {
    createVerticalCorridor(tiles, r1.centerY, r2.centerY, r1.centerX);
    createHorizontalCorridor(tiles, r1.centerX, r2.centerX, r2.centerY);
  }
}

export function generateDungeon(
  gridWidth: number = 10,
  gridHeight: number = 10,
  tileSize: number = 32,
  minRooms: number = 5,
  maxRooms: number = 8
): GeneratedMap {
  const tiles: TileType[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    tiles[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      tiles[y][x] = TileType.WALL;
    }
  }

  const rooms: Room[] = [];
  const roomCount = randomInt(minRooms, maxRooms);
  let attempts = 0;
  const maxAttempts = 100;

  while (rooms.length < roomCount && attempts < maxAttempts) {
    attempts++;
    const roomWidth = randomInt(4, Math.min(6, Math.floor(gridWidth / 2)));
    const roomHeight = randomInt(4, Math.min(6, Math.floor(gridHeight / 2)));
    const roomX = randomInt(1, gridWidth - roomWidth - 1);
    const roomY = randomInt(1, gridHeight - roomHeight - 1);

    const newRoom: Room = {
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
      centerX: Math.floor(roomX + roomWidth / 2),
      centerY: Math.floor(roomY + roomHeight / 2)
    };

    let overlaps = false;
    for (const room of rooms) {
      if (
        newRoom.x < room.x + room.width + 1 &&
        newRoom.x + newRoom.width + 1 > room.x &&
        newRoom.y < room.y + room.height + 1 &&
        newRoom.y + newRoom.height + 1 > room.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      createRoom(tiles, newRoom);
      if (rooms.length > 0) {
        const prevRoom = rooms[rooms.length - 1];
        connectRooms(tiles, prevRoom, newRoom);
      }
      rooms.push(newRoom);
    }
  }

  const spawnRoom = rooms[0];
  const spawnX = spawnRoom.centerX;
  const spawnY = spawnRoom.centerY;

  const stairsRoom = rooms[rooms.length - 1];
  const stairsX = stairsRoom.centerX;
  const stairsY = stairsRoom.centerY;
  tiles[stairsY][stairsX] = TileType.STAIRS;

  tiles[spawnY][spawnX] = TileType.FLOOR_LIT;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = spawnX + dx;
      const ny = spawnY + dy;
      if (
        ny >= 0 &&
        ny < gridHeight &&
        nx >= 0 &&
        nx < gridWidth &&
        tiles[ny][nx] === TileType.FLOOR
      ) {
        tiles[ny][nx] = TileType.FLOOR_LIT;
      }
    }
  }

  return {
    tiles,
    rooms,
    gridWidth,
    gridHeight,
    tileSize,
    stairsX,
    stairsY,
    spawnX,
    spawnY
  };
}

export function revealAround(
  tiles: TileType[][],
  x: number,
  y: number,
  radius: number = 1
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        ny >= 0 &&
        ny < tiles.length &&
        nx >= 0 &&
        nx < tiles[0].length &&
        tiles[ny][nx] === TileType.FLOOR
      ) {
        tiles[ny][nx] = TileType.FLOOR_LIT;
      }
    }
  }
}

export function isWalkable(tiles: TileType[][], x: number, y: number): boolean {
  if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) {
    return false;
  }
  const tile = tiles[y][x];
  return tile !== TileType.WALL;
}
