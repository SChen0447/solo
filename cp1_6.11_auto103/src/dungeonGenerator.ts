export type TileType = 'wall' | 'floor' | 'corridor';

export interface Tile {
  type: TileType;
  roomId: number | null;
}

export interface Room {
  id: number;
  gridX: number;
  gridY: number;
  centerX: number;
  centerY: number;
  isEntrance: boolean;
  isExit: boolean;
}

export interface DungeonData {
  tiles: Tile[][];
  width: number;
  height: number;
  tileSize: number;
  rooms: Room[];
  entranceRoom: Room;
  exitRoom: Room;
  playerStartX: number;
  playerStartY: number;
  enemyRoomIds: number[];
  runeRoomIds: number[];
}

const ROOM_GRID_SIZE = 3;
const ROOM_SIZE = 3;
const WALL_SIZE = 1;
const TILE_SIZE = 48;

function getMapSize(): { width: number; height: number } {
  const width = ROOM_GRID_SIZE * ROOM_SIZE + (ROOM_GRID_SIZE + 1) * WALL_SIZE;
  const height = ROOM_GRID_SIZE * ROOM_SIZE + (ROOM_GRID_SIZE + 1) * WALL_SIZE;
  return { width, height };
}

function createEmptyMap(): Tile[][] {
  const { width, height } = getMapSize();
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = { type: 'wall', roomId: null };
    }
  }
  return tiles;
}

function roomGridToTile(gridX: number, gridY: number): { startX: number; startY: number; centerX: number; centerY: number } {
  const startX = gridX * (ROOM_SIZE + WALL_SIZE) + WALL_SIZE;
  const startY = gridY * (ROOM_SIZE + WALL_SIZE) + WALL_SIZE;
  const centerX = startX + Math.floor(ROOM_SIZE / 2);
  const centerY = startY + Math.floor(ROOM_SIZE / 2);
  return { startX, startY, centerX, centerY };
}

function carveRoom(tiles: Tile[][], room: Room): void {
  const { startX, startY } = roomGridToTile(room.gridX, room.gridY);
  for (let dy = 0; dy < ROOM_SIZE; dy++) {
    for (let dx = 0; dx < ROOM_SIZE; dx++) {
      const x = startX + dx;
      const y = startY + dy;
      tiles[y][x] = { type: 'floor', roomId: room.id };
    }
  }
}

function carveCorridor(tiles: Tile[][], from: Room, to: Room): void {
  const fromCenter = roomGridToTile(from.gridX, from.gridY);
  const toCenter = roomGridToTile(to.gridX, to.gridY);

  let x = fromCenter.centerX;
  let y = fromCenter.centerY;

  while (x !== toCenter.centerX) {
    if (tiles[y][x].type === 'wall') {
      tiles[y][x] = { type: 'corridor', roomId: null };
    }
    x += x < toCenter.centerX ? 1 : -1;
  }
  if (tiles[y][x].type === 'wall') {
    tiles[y][x] = { type: 'corridor', roomId: null };
  }

  while (y !== toCenter.centerY) {
    if (tiles[y][x].type === 'wall') {
      tiles[y][x] = { type: 'corridor', roomId: null };
    }
    y += y < toCenter.centerY ? 1 : -1;
  }
  if (tiles[y][x].type === 'wall') {
    tiles[y][x] = { type: 'corridor', roomId: null };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function bfsDistance(adjacency: Map<number, number[]>, startId: number, endId: number): number {
  const visited = new Set<number>();
  const queue: { id: number; dist: number }[] = [{ id: startId, dist: 0 }];
  visited.add(startId);

  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    if (id === endId) return dist;
    const neighbors = adjacency.get(id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, dist: dist + 1 });
      }
    }
  }
  return -1;
}

export function generateDungeon(): DungeonData {
  const tiles = createEmptyMap();
  const { width, height } = getMapSize();

  const allPositions: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < ROOM_GRID_SIZE; gy++) {
    for (let gx = 0; gx < ROOM_GRID_SIZE; gx++) {
      allPositions.push({ gx, gy });
    }
  }

  const entrancePos = { gx: 0, gy: 0 };
  const exitPos = { gx: ROOM_GRID_SIZE - 1, gy: ROOM_GRID_SIZE - 1 };

  const numRooms = 5 + Math.floor(Math.random() * 3);
  const remaining = allPositions.filter(
    p => !(p.gx === entrancePos.gx && p.gy === entrancePos.gy) &&
         !(p.gx === exitPos.gx && p.gy === exitPos.gy)
  );
  const shuffled = shuffle(remaining);
  const selectedPositions = [entrancePos, exitPos, ...shuffled.slice(0, numRooms - 2)];

  const rooms: Room[] = selectedPositions.map((pos, idx) => {
    const { centerX, centerY } = roomGridToTile(pos.gx, pos.gy);
    return {
      id: idx,
      gridX: pos.gx,
      gridY: pos.gy,
      centerX,
      centerY,
      isEntrance: pos.gx === entrancePos.gx && pos.gy === entrancePos.gy,
      isExit: pos.gx === exitPos.gx && pos.gy === exitPos.gy,
    };
  });

  let adjacency = new Map<number, number[]>();
  rooms.forEach(r => adjacency.set(r.id, []));

  const byGrid = new Map<string, Room>();
  rooms.forEach(r => byGrid.set(`${r.gridX},${r.gridY}`, r));

  const edges: { from: Room; to: Room }[] = [];
  for (const room of rooms) {
    const neighbors = [
      { gx: room.gridX + 1, gy: room.gridY },
      { gx: room.gridX - 1, gy: room.gridY },
      { gx: room.gridX, gy: room.gridY + 1 },
      { gx: room.gridX, gy: room.gridY - 1 },
    ];
    for (const n of neighbors) {
      const neighborRoom = byGrid.get(`${n.gx},${n.gy}`);
      if (neighborRoom && neighborRoom.id > room.id) {
        edges.push({ from: room, to: neighborRoom });
      }
    }
  }

  const entranceRoom = rooms.find(r => r.isEntrance)!;
  const exitRoom = rooms.find(r => r.isExit)!;

  const shuffledEdges = shuffle(edges);
  for (const edge of shuffledEdges) {
    adjacency.get(edge.from.id)!.push(edge.to.id);
    adjacency.get(edge.to.id)!.push(edge.from.id);
    const dist = bfsDistance(adjacency, entranceRoom.id, exitRoom.id);
    if (dist >= 3) {
      const connected = new Set<number>();
      const queue = [entranceRoom.id];
      connected.add(entranceRoom.id);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const nb of adjacency.get(curr) || []) {
          if (!connected.has(nb)) {
            connected.add(nb);
            queue.push(nb);
          }
        }
      }
      let allConnected = true;
      for (const r of rooms) {
        if (!connected.has(r.id)) {
          allConnected = false;
          break;
        }
      }
      if (allConnected) {
        break;
      }
    }
  }

  const finalEdges: { from: Room; to: Room }[] = [];
  for (const room of rooms) {
    for (const nbId of adjacency.get(room.id) || []) {
      if (nbId > room.id) {
        const nbRoom = rooms.find(r => r.id === nbId)!;
        finalEdges.push({ from: room, to: nbRoom });
      }
    }
  }

  for (const room of rooms) {
    carveRoom(tiles, room);
  }
  for (const edge of finalEdges) {
    carveCorridor(tiles, edge.from, edge.to);
  }

  const middleRooms = rooms.filter(r => !r.isEntrance && !r.isExit);
  const shuffledMiddle = shuffle(middleRooms);
  const enemyRoomIds = shuffledMiddle.slice(0, Math.min(4, shuffledMiddle.length)).map(r => r.id);

  const runeCandidates = shuffledMiddle.filter(r => !enemyRoomIds.includes(r.id));
  let runeRooms: Room[];
  if (runeCandidates.length >= 3) {
    runeRooms = shuffle(runeCandidates).slice(0, 3);
  } else {
    runeRooms = [...runeCandidates, ...shuffle(shuffledMiddle.filter(r => !runeCandidates.includes(r)))].slice(0, 3);
  }
  const runeRoomIds = runeRooms.map(r => r.id);

  return {
    tiles,
    width,
    height,
    tileSize: TILE_SIZE,
    rooms,
    entranceRoom,
    exitRoom,
    playerStartX: entranceRoom.centerX,
    playerStartY: entranceRoom.centerY,
    enemyRoomIds,
    runeRoomIds,
  };
}

export function isWalkable(dungeon: DungeonData, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= dungeon.width || y >= dungeon.height) return false;
  const tile = dungeon.tiles[y][x];
  return tile.type === 'floor' || tile.type === 'corridor';
}

export function getRoomAt(dungeon: DungeonData, x: number, y: number): Room | null {
  if (x < 0 || y < 0 || x >= dungeon.width || y >= dungeon.height) return null;
  const roomId = dungeon.tiles[y][x].roomId;
  if (roomId === null) return null;
  return dungeon.rooms.find(r => r.id === roomId) || null;
}
