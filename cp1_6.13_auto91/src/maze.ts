export interface HexCoord {
  q: number;
  r: number;
}

export interface Wall {
  from: HexCoord;
  to: HexCoord;
  exists: boolean;
  visible: number;
  hitEffect: number;
}

export interface EchoCore {
  coord: HexCoord;
  pulsePhase: number;
}

export interface EchoShard {
  id: number;
  coord: HexCoord;
  collected: boolean;
  floatPhase: number;
}

export const HEX_SIZE = 80;
export const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
export const HEX_HEIGHT = HEX_SIZE * 2;

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function hexToPixel(coord: HexCoord): { x: number; y: number } {
  const x = HEX_WIDTH * (coord.q + coord.r / 2);
  const y = (HEX_HEIGHT * 3) / 4 * coord.r;
  return { x, y };
}

export function pixelToHex(x: number, y: number): HexCoord {
  const q = ((x * Math.sqrt(3)) / 3 - y / 3) / HEX_SIZE;
  const r = ((2 * y) / 3) / HEX_SIZE;
  return hexRound({ q, r });
}

function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function getHexCorners(center: { x: number; y: number }): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push({
      x: center.x + HEX_SIZE * Math.cos(angle),
      y: center.y + HEX_SIZE * Math.sin(angle),
    });
  }
  return corners;
}

export function getNeighbor(coord: HexCoord, direction: number): HexCoord {
  const dir = HEX_DIRECTIONS[direction];
  return { q: coord.q + dir.q, r: coord.r + dir.r };
}

export class Maze {
  rooms: Map<string, HexCoord> = new Map();
  walls: Map<string, Wall> = new Map();
  cores: EchoCore[] = [];
  shards: EchoShard[] = [];
  exit: HexCoord;
  start: HexCoord;
  radius: number;

  constructor(radius: number = 3) {
    this.radius = radius;
    this.generateRooms();
    this.generateWalls();
    this.carveMaze();
    this.placeCores();
    this.placeShards(5);
    this.start = { q: 0, r: 0 };
    this.exit = this.findFarthestRoom();
  }

  private generateRooms(): void {
    for (let q = -this.radius; q <= this.radius; q++) {
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        const coord = { q, r };
        this.rooms.set(hexKey(coord), coord);
      }
    }
  }

  private wallKey(a: HexCoord, b: HexCoord): string {
    const keys = [hexKey(a), hexKey(b)].sort();
    return `${keys[0]}|${keys[1]}`;
  }

  private generateWalls(): void {
    for (const coord of this.rooms.values()) {
      for (let d = 0; d < 6; d++) {
        const neighbor = getNeighbor(coord, d);
        const key = this.wallKey(coord, neighbor);
        if (!this.walls.has(key)) {
          const hasNeighbor = this.rooms.has(hexKey(neighbor));
          this.walls.set(key, {
            from: coord,
            to: neighbor,
            exists: true,
            visible: 0,
            hitEffect: 0,
          });
          if (!hasNeighbor) {
            this.walls.get(key)!.exists = true;
          }
        }
      }
    }
  }

  private carveMaze(): void {
    const visited = new Set<string>();
    const stack: HexCoord[] = [];
    const start = { q: 0, r: 0 };
    visited.add(hexKey(start));
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: { coord: HexCoord; direction: number }[] = [];
      for (let d = 0; d < 6; d++) {
        const n = getNeighbor(current, d);
        if (this.rooms.has(hexKey(n)) && !visited.has(hexKey(n))) {
          neighbors.push({ coord: n, direction: d });
        }
      }
      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const key = this.wallKey(current, next.coord);
        if (this.walls.has(key)) {
          this.walls.get(key)!.exists = false;
        }
        visited.add(hexKey(next.coord));
        stack.push(next.coord);
      } else {
        stack.pop();
      }
    }
  }

  private placeCores(): void {
    for (const coord of this.rooms.values()) {
      this.cores.push({
        coord,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private placeShards(count: number): void {
    const roomList = Array.from(this.rooms.values()).filter(
      (c) => !(c.q === 0 && c.r === 0)
    );
    for (let i = roomList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roomList[i], roomList[j]] = [roomList[j], roomList[i]];
    }
    for (let i = 0; i < Math.min(count, roomList.length); i++) {
      this.shards.push({
        id: i,
        coord: roomList[i],
        collected: false,
        floatPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private findFarthestRoom(): HexCoord {
    let farthest: HexCoord = { q: 0, r: 0 };
    let maxDist = 0;
    for (const coord of this.rooms.values()) {
      const dist = hexDistance({ q: 0, r: 0 }, coord);
      if (dist > maxDist) {
        maxDist = dist;
        farthest = coord;
      }
    }
    return farthest;
  }

  hasWall(a: HexCoord, b: HexCoord): boolean {
    const key = this.wallKey(a, b);
    const wall = this.walls.get(key);
    return wall ? wall.exists : true;
  }

  getWall(a: HexCoord, b: HexCoord): Wall | undefined {
    const key = this.wallKey(a, b);
    return this.walls.get(key);
  }

  isRoom(coord: HexCoord): boolean {
    return this.rooms.has(hexKey(coord));
  }

  checkCollision(px: number, py: number, playerRadius: number = 10): boolean {
    const hex = pixelToHex(px, py);
    if (!this.isRoom(hex)) return true;
    const center = hexToPixel(hex);
    const dx = px - center.x;
    const dy = py - center.y;
    const corners = getHexCorners({ x: 0, y: 0 });
    for (let d = 0; d < 6; d++) {
      const c1 = corners[d];
      const c2 = corners[(d + 1) % 6];
      const nx = c2.y - c1.y;
      const ny = c1.x - c2.x;
      const len = Math.sqrt(nx * nx + ny * ny);
      const dist = (dx * (nx / len) + dy * (ny / len));
      if (dist > HEX_SIZE * 0.866 - playerRadius) {
        const neighbor = getNeighbor(hex, d);
        if (this.hasWall(hex, neighbor)) {
          return true;
        }
      }
    }
    return false;
  }

  revealRoom(coord: HexCoord, duration: number = 3000): void {
    for (let d = 0; d < 6; d++) {
      const neighbor = getNeighbor(coord, d);
      const wall = this.getWall(coord, neighbor);
      if (wall) {
        wall.visible = duration;
      }
    }
  }

  update(deltaTime: number): void {
    for (const wall of this.walls.values()) {
      if (wall.visible > 0) {
        wall.visible = Math.max(0, wall.visible - deltaTime);
      }
      if (wall.hitEffect > 0) {
        wall.hitEffect = Math.max(0, wall.hitEffect - deltaTime);
      }
    }
    for (const core of this.cores) {
      core.pulsePhase += deltaTime * 0.002;
    }
    for (const shard of this.shards) {
      shard.floatPhase += deltaTime * 0.003;
    }
  }
}
