export const MAP_SIZE = 25;
export const TILE_SIZE = 24;

export enum TileType {
  WALL = 0,
  FLOOR = 1,
  TRAP = 2,
  KEY = 3,
  EXIT = 4,
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Guard {
  x: number;
  y: number;
  patrolPath: { x: number; y: number }[];
  pathIndex: number;
  isChasing: boolean;
  renderX: number;
  renderY: number;
  lastMoveTime: number;
  footprints: { x: number; y: number; createTime: number }[];
}

export interface GeneratedMap {
  map: TileType[][];
  rooms: Room[];
  traps: { x: number; y: number }[];
  keyPositions: { x: number; y: number }[];
  guards: Guard[];
  exitPosition: { x: number; y: number };
  playerStart: { x: number; y: number };
}

function createEmptyMap(): TileType[][] {
  const map: TileType[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      map[y][x] = TileType.WALL;
    }
  }
  return map;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function carveRoom(map: TileType[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (y >= 0 && y < MAP_SIZE && x >= 0 && x < MAP_SIZE) {
        map[y][x] = TileType.FLOOR;
      }
    }
  }
}

function carveHorizontalCorridor(map: TileType[][], x1: number, x2: number, y: number): void {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    if (y >= 0 && y < MAP_SIZE && x >= 0 && x < MAP_SIZE) {
      map[y][x] = TileType.FLOOR;
    }
  }
}

function carveVerticalCorridor(map: TileType[][], y1: number, y2: number, x: number): void {
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  for (let y = startY; y <= endY; y++) {
    if (y >= 0 && y < MAP_SIZE && x >= 0 && x < MAP_SIZE) {
      map[y][x] = TileType.FLOOR;
    }
  }
}

function generateRooms(): Room[] {
  const rooms: Room[] = [];
  const minRoomSize = 4;
  const maxRoomSize = 7;
  const targetRooms = 6;
  let attempts = 0;
  const maxAttempts = 100;

  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;
    const width = randomInt(minRoomSize, maxRoomSize);
    const height = randomInt(minRoomSize, maxRoomSize);
    const x = randomInt(1, MAP_SIZE - width - 2);
    const y = randomInt(1, MAP_SIZE - height - 2);

    const newRoom: Room = {
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
    };

    let overlaps = false;
    for (const room of rooms) {
      const expandedX = room.x - 1;
      const expandedY = room.y - 1;
      const expandedW = room.width + 2;
      const expandedH = room.height + 2;

      if (
        newRoom.x < expandedX + expandedW &&
        newRoom.x + newRoom.width > expandedX &&
        newRoom.y < expandedY + expandedH &&
        newRoom.y + newRoom.height > expandedY
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
    }
  }

  if (rooms.length < 5) {
    return generateRooms();
  }

  return rooms;
}

function getRandomFloorPosition(
  map: TileType[][],
  room: Room,
  excludePositions: { x: number; y: number }[]
): { x: number; y: number } | null {
  const floorPositions: { x: number; y: number }[] = [];
  
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (
        map[y][x] === TileType.FLOOR &&
        !excludePositions.some((p) => p.x === x && p.y === y)
      ) {
        floorPositions.push({ x, y });
      }
    }
  }

  if (floorPositions.length === 0) return null;
  return floorPositions[randomInt(0, floorPositions.length - 1)];
}

function generatePatrolPath(room: Room, startX: number, startY: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  path.push({ x: startX, y: startY });

  const pathLength = randomInt(3, 5);
  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < pathLength; i++) {
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const validDirs = directions.filter((d) => {
      const nx = currentX + d.dx * randomInt(1, 2);
      const ny = currentY + d.dy * randomInt(1, 2);
      return (
        nx >= room.x + 1 &&
        nx < room.x + room.width - 1 &&
        ny >= room.y + 1 &&
        ny < room.y + room.height - 1
      );
    });

    if (validDirs.length > 0) {
      const dir = validDirs[randomInt(0, validDirs.length - 1)];
      const steps = randomInt(1, 2);
      currentX = Math.max(room.x + 1, Math.min(room.x + room.width - 2, currentX + dir.dx * steps));
      currentY = Math.max(room.y + 1, Math.min(room.y + room.height - 2, currentY + dir.dy * steps));
      path.push({ x: currentX, y: currentY });
    }
  }

  return path;
}

export function generateDungeon(): GeneratedMap {
  const map = createEmptyMap();
  const rooms = generateRooms();

  for (const room of rooms) {
    carveRoom(map, room);
  }

  for (let i = 0; i < rooms.length - 1; i++) {
    const roomA = rooms[i];
    const roomB = rooms[i + 1];

    if (Math.random() < 0.5) {
      carveHorizontalCorridor(map, roomA.centerX, roomB.centerX, roomA.centerY);
      carveVerticalCorridor(map, roomA.centerY, roomB.centerY, roomB.centerX);
    } else {
      carveVerticalCorridor(map, roomA.centerY, roomB.centerY, roomA.centerX);
      carveHorizontalCorridor(map, roomA.centerX, roomB.centerX, roomB.centerY);
    }
  }

  if (rooms.length >= 4) {
    const extraConnections = randomInt(1, 2);
    for (let i = 0; i < extraConnections; i++) {
      const idxA = randomInt(0, rooms.length - 1);
      let idxB = randomInt(0, rooms.length - 1);
      while (idxB === idxA) {
        idxB = randomInt(0, rooms.length - 1);
      }
      const roomA = rooms[idxA];
      const roomB = rooms[idxB];
      carveHorizontalCorridor(map, roomA.centerX, roomB.centerX, roomA.centerY);
      carveVerticalCorridor(map, roomA.centerY, roomB.centerY, roomB.centerX);
    }
  }

  const usedPositions: { x: number; y: number }[] = [];

  const playerStart = { x: rooms[0].centerX, y: rooms[0].centerY };
  usedPositions.push(playerStart);

  const lastRoom = rooms[rooms.length - 1];
  const exitPosition = {
    x: lastRoom.x + lastRoom.width - 2,
    y: lastRoom.y + lastRoom.height - 2,
  };
  map[exitPosition.y][exitPosition.x] = TileType.EXIT;
  usedPositions.push(exitPosition);

  const traps: { x: number; y: number }[] = [];
  const trapCount = 4;
  let trapAttempts = 0;
  while (traps.length < trapCount && trapAttempts < 100) {
    trapAttempts++;
    const roomIdx = randomInt(1, rooms.length - 1);
    const pos = getRandomFloorPosition(map, rooms[roomIdx], usedPositions);
    if (pos) {
      map[pos.y][pos.x] = TileType.TRAP;
      traps.push(pos);
      usedPositions.push(pos);
    }
  }

  const keyPositions: { x: number; y: number }[] = [];
  const keyCount = 3;
  let keyAttempts = 0;
  while (keyPositions.length < keyCount && keyAttempts < 100) {
    keyAttempts++;
    const roomIdx = randomInt(1, rooms.length - 1);
    const pos = getRandomFloorPosition(map, rooms[roomIdx], usedPositions);
    if (pos) {
      map[pos.y][pos.x] = TileType.KEY;
      keyPositions.push(pos);
      usedPositions.push(pos);
    }
  }

  const guards: Guard[] = [];
  const guardCount = 2;
  let guardAttempts = 0;
  while (guards.length < guardCount && guardAttempts < 100) {
    guardAttempts++;
    const roomIdx = randomInt(Math.max(1, Math.floor(rooms.length / 2)), rooms.length - 1);
    const room = rooms[roomIdx];
    const pos = getRandomFloorPosition(map, room, usedPositions);
    if (pos) {
      const patrolPath = generatePatrolPath(room, pos.x, pos.y);
      guards.push({
        x: pos.x,
        y: pos.y,
        patrolPath,
        pathIndex: 0,
        isChasing: false,
        renderX: pos.x * TILE_SIZE,
        renderY: pos.y * TILE_SIZE,
        lastMoveTime: 0,
        footprints: [],
      });
      usedPositions.push(pos);
    }
  }

  return {
    map,
    rooms,
    traps,
    keyPositions,
    guards,
    exitPosition,
    playerStart,
  };
}

export function isWalkable(map: TileType[][], x: number, y: number): boolean {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
  return map[y][x] !== TileType.WALL;
}
