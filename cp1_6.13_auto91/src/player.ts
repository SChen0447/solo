import {
  Maze,
  HexCoord,
  hexToPixel,
  pixelToHex,
  hexKey,
  getNeighbor,
  getHexCorners,
  HEX_SIZE,
} from './maze';

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  radius: number;
}

export interface VisibleWallRecord {
  key: string;
  expiresAt: number;
}

export class Player {
  x: number;
  y: number;
  angle: number;
  speed: number = 160;
  radius: number = 12;
  maze: Maze;
  currentRoom: HexCoord;
  visibleWalls: Map<string, number> = new Map();
  memoryDuration: number = 3000;
  keys: Set<string> = new Set();
  lastStepTime: number = 0;
  stepInterval: number = 180;
  onStep?: () => void;
  onCollision?: (wallDirection: number, hitX: number, hitY: number) => void;
  onCollectShard?: (shardId: number) => void;
  onEnterRoom?: (coord: HexCoord) => void;
  onAllShardsCollected?: () => void;
  onReachExit?: () => void;
  collectedShards: Set<number> = new Set();
  hasAllShards: boolean = false;
  reachedExit: boolean = false;
  brightnessBoost: number = 0;

  constructor(maze: Maze) {
    this.maze = maze;
    const startPos = hexToPixel(maze.start);
    this.x = startPos.x;
    this.y = startPos.y;
    this.angle = 0;
    this.currentRoom = { ...maze.start };
    this.revealCurrentRoom();
  }

  setKey(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key.toLowerCase());
    } else {
      this.keys.delete(key.toLowerCase());
    }
  }

  revealCurrentRoom(): void {
    const now = performance.now();
    for (let d = 0; d < 6; d++) {
      const neighbor = getNeighbor(this.currentRoom, d);
      const wall = this.maze.getWall(this.currentRoom, neighbor);
      if (wall) {
        const key = this.wallRecordKey(this.currentRoom, neighbor);
        this.visibleWalls.set(key, now + this.memoryDuration);
      }
    }
  }

  private wallRecordKey(a: HexCoord, b: HexCoord): string {
    const keys = [hexKey(a), hexKey(b)].sort();
    return `${keys[0]}|${keys[1]}`;
  }

  isWallVisible(a: HexCoord, b: HexCoord): number {
    const key = this.wallRecordKey(a, b);
    const expiresAt = this.visibleWalls.get(key);
    if (!expiresAt) return 0;
    const now = performance.now();
    const remaining = expiresAt - now;
    if (remaining <= 0) {
      this.visibleWalls.delete(key);
      return 0;
    }
    return Math.min(1, remaining / 800);
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
      this.angle = Math.atan2(dy, dx);
    }

    const moveX = dx * this.speed * dt;
    const moveY = dy * this.speed * dt;

    let moved = false;
    if (!this.maze.checkCollision(this.x + moveX, this.y, this.radius)) {
      this.x += moveX;
      moved = true;
    } else {
      this.handleWallCollision(this.x + moveX, this.y);
    }
    if (!this.maze.checkCollision(this.x, this.y + moveY, this.radius)) {
      this.y += moveY;
      moved = true;
    } else {
      this.handleWallCollision(this.x, this.y + moveY);
    }

    if (moved && length > 0) {
      const now = performance.now();
      if (now - this.lastStepTime > this.stepInterval) {
        this.lastStepTime = now;
        this.onStep?.();
      }
    }

    const newRoom = pixelToHex(this.x, this.y);
    if (this.maze.isRoom(newRoom) && (newRoom.q !== this.currentRoom.q || newRoom.r !== this.currentRoom.r)) {
      this.currentRoom = { ...newRoom };
      this.revealCurrentRoom();
      this.onEnterRoom?.(newRoom);
    }

    this.checkShardCollection();
    this.checkExit();

    if (this.brightnessBoost > 0) {
      this.brightnessBoost = Math.max(0, this.brightnessBoost - deltaTime);
    }
  }

  private handleWallCollision(testX: number, testY: number): void {
    const hex = pixelToHex(this.x, this.y);
    const center = hexToPixel(hex);
    const dx = testX - center.x;
    const dy = testY - center.y;
    const corners = getHexCorners({ x: 0, y: 0 });
    for (let d = 0; d < 6; d++) {
      const c1 = corners[d];
      const c2 = corners[(d + 1) % 6];
      const nx = c2.y - c1.y;
      const ny = c1.x - c2.x;
      const len = Math.sqrt(nx * nx + ny * ny);
      const dist = (dx * (nx / len) + dy * (ny / len));
      if (dist > HEX_SIZE * 0.866 - this.radius - 2) {
        const neighbor = getNeighbor(hex, d);
        if (this.maze.hasWall(hex, neighbor)) {
          const wall = this.maze.getWall(hex, neighbor);
          if (wall) {
            wall.hitEffect = 500;
          }
          const midX = (c1.x + c2.x) / 2 + center.x;
          const midY = (c1.y + c2.y) / 2 + center.y;
          this.onCollision?.(d, midX, midY);
          return;
        }
      }
    }
  }

  private checkShardCollection(): void {
    for (const shard of this.maze.shards) {
      if (shard.collected || this.collectedShards.has(shard.id)) continue;
      const pos = hexToPixel(shard.coord);
      const dist = Math.sqrt((this.x - pos.x) ** 2 + (this.y - pos.y) ** 2);
      if (dist < 30) {
        shard.collected = true;
        this.collectedShards.add(shard.id);
        this.brightnessBoost = 1000;
        this.onCollectShard?.(shard.id);
        if (this.collectedShards.size >= this.maze.shards.length) {
          this.hasAllShards = true;
          this.onAllShardsCollected?.();
        }
      }
    }
  }

  private checkExit(): void {
    if (this.hasAllShards && !this.reachedExit) {
      const exitPos = hexToPixel(this.maze.exit);
      const dist = Math.sqrt((this.x - exitPos.x) ** 2 + (this.y - exitPos.y) ** 2);
      if (dist < 40) {
        this.reachedExit = true;
        this.onReachExit?.();
      }
    }
  }
}
