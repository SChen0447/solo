import type { FrameSnapshot } from './TimeManager';

export const GRID_COLS = 32;
export const GRID_ROWS = 24;
export const TILE_SIZE = 16;
export const PLAYER_SIZE = 8;
export const BOX_SIZE = 8;
export const SHARD_SIZE = 10;
export const BUTTON_SIZE = 6;
export const DOOR_SIZE = 16;
export const WORLD_WIDTH = GRID_COLS * TILE_SIZE;
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE;

export const COLORS = {
  bg1: '#1A1A2E',
  bg2: '#16213E',
  mapBg: '#2A2A3A',
  obstacle: '#4A4A5A',
  gridLine: '#3A3A5A',
  interactive: '#D4A373',
  player: '#E0E0E0',
  shard: '#FFD700',
  box: '#8B5E3C',
  door: '#8B0000',
  button: '#FF4444',
  portal: '#9B59B6',
  star: '#FFFFFF'
} as const;

export interface Shard {
  x: number;
  y: number;
  collected: boolean;
}

export interface Box {
  x: number;
  y: number;
}

export interface Door {
  x: number;
  y: number;
  open: boolean;
}

export interface Button {
  x: number;
  y: number;
  pressed: boolean;
}

export interface Portal {
  x: number;
  y: number;
  active: boolean;
  scale: number;
  particles: PortalParticle[];
}

export interface PortalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export class WorldManager {
  private obstacles: boolean[][] = [];
  public player = { x: 0, y: 0 };
  public shards: Shard[] = [];
  public box: Box = { x: 0, y: 0 };
  public door: Door = { x: 0, y: 0, open: false };
  public button: Button = { x: 0, y: 0, pressed: false };
  public portal: Portal = { x: 0, y: 0, active: false, scale: 0, particles: [] };
  public collectedCount = 0;
  public readonly totalShards = 5;

  constructor() {
    this.initWorld();
  }

  private initWorld(): void {
    this.obstacles = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      this.obstacles[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        this.obstacles[r][c] = false;
      }
    }

    for (let c = 0; c < GRID_COLS; c++) {
      this.obstacles[0][c] = true;
      this.obstacles[GRID_ROWS - 1][c] = true;
    }
    for (let r = 0; r < GRID_ROWS; r++) {
      this.obstacles[r][0] = true;
      this.obstacles[r][GRID_COLS - 1] = true;
    }

    const obstaclePatterns: [number, number][] = [
      [4, 4], [5, 4], [6, 4],
      [10, 8], [10, 9], [10, 10], [11, 10],
      [18, 5], [19, 5], [20, 5], [20, 6], [20, 7],
      [25, 12], [25, 13], [25, 14], [26, 14], [27, 14],
      [8, 16], [9, 16], [10, 16], [11, 16],
      [15, 18], [15, 19], [15, 20],
      [22, 18], [23, 18], [24, 18], [24, 19],
      [5, 12], [6, 12],
      [28, 6], [28, 7]
    ];
    for (const [c, r] of obstaclePatterns) {
      if (r < GRID_ROWS && c < GRID_COLS) {
        this.obstacles[r][c] = true;
      }
    }

    this.player.x = 3 * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    this.player.y = 3 * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;

    const shardPositions: [number, number][] = [
      [7, 8], [15, 4], [26, 9], [12, 14], [27, 20]
    ];
    this.shards = shardPositions.map(([c, r]) => ({
      x: c * TILE_SIZE + (TILE_SIZE - SHARD_SIZE) / 2,
      y: r * TILE_SIZE + (TILE_SIZE - SHARD_SIZE) / 2,
      collected: false
    }));

    this.box.x = 6 * TILE_SIZE + (TILE_SIZE - BOX_SIZE) / 2;
    this.box.y = 18 * TILE_SIZE + (TILE_SIZE - BOX_SIZE) / 2;

    this.button.x = 14 * TILE_SIZE + (TILE_SIZE - BUTTON_SIZE) / 2;
    this.button.y = 18 * TILE_SIZE + (TILE_SIZE - BUTTON_SIZE) / 2;

    this.door.x = 20 * TILE_SIZE;
    this.door.y = 14 * TILE_SIZE;
    this.door.open = false;

    this.portal.x = WORLD_WIDTH / 2;
    this.portal.y = WORLD_HEIGHT / 2;
    this.portal.active = false;
    this.portal.scale = 0;
    this.portal.particles = [];

    this.collectedCount = 0;
  }

  isObstacleAt(x: number, y: number, w: number, h: number): boolean {
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + w - 1) / TILE_SIZE);
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + h - 1) / TILE_SIZE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return true;
        if (this.obstacles[r][c]) return true;
      }
    }

    if (!this.door.open) {
      if (x < this.door.x + DOOR_SIZE && x + w > this.door.x &&
          y < this.door.y + DOOR_SIZE && y + h > this.door.y) {
        return true;
      }
    }

    return false;
  }

  rectsOverlap(x1: number, y1: number, w1: number, h1: number,
                x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  movePlayer(dx: number, dy: number): void {
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return;

    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {
      let newX = this.player.x + stepX;
      if (!this.isObstacleAt(newX, this.player.y, PLAYER_SIZE, PLAYER_SIZE) &&
          !this.rectsOverlap(newX, this.player.y, PLAYER_SIZE, PLAYER_SIZE,
                             this.box.x, this.box.y, BOX_SIZE, BOX_SIZE)) {
        this.player.x = newX;
      } else if (this.rectsOverlap(newX, this.player.y, PLAYER_SIZE, PLAYER_SIZE,
                                   this.box.x, this.box.y, BOX_SIZE, BOX_SIZE)) {
        const boxNewX = this.box.x + Math.sign(stepX);
        if (!this.isObstacleAt(boxNewX, this.box.y, BOX_SIZE, BOX_SIZE)) {
          this.box.x = boxNewX;
          this.player.x = newX;
        }
      }

      let newY = this.player.y + stepY;
      if (!this.isObstacleAt(this.player.x, newY, PLAYER_SIZE, PLAYER_SIZE) &&
          !this.rectsOverlap(this.player.x, newY, PLAYER_SIZE, PLAYER_SIZE,
                             this.box.x, this.box.y, BOX_SIZE, BOX_SIZE)) {
        this.player.y = newY;
      } else if (this.rectsOverlap(this.player.x, newY, PLAYER_SIZE, PLAYER_SIZE,
                                   this.box.x, this.box.y, BOX_SIZE, BOX_SIZE)) {
        const boxNewY = this.box.y + Math.sign(stepY);
        if (!this.isObstacleAt(this.box.x, boxNewY, BOX_SIZE, BOX_SIZE)) {
          this.box.y = boxNewY;
          this.player.y = newY;
        }
      }
    }

    this.updateButtonState();
  }

  updateButtonState(): void {
    this.button.pressed = this.rectsOverlap(
      this.button.x, this.button.y, BUTTON_SIZE, BUTTON_SIZE,
      this.box.x, this.box.y, BOX_SIZE, BOX_SIZE
    );
    if (this.button.pressed) {
      this.door.open = true;
    }
  }

  checkShardCollection(): boolean {
    let collected = false;
    for (const shard of this.shards) {
      if (!shard.collected &&
          this.rectsOverlap(this.player.x, this.player.y, PLAYER_SIZE, PLAYER_SIZE,
                            shard.x, shard.y, SHARD_SIZE, SHARD_SIZE)) {
        shard.collected = true;
        this.collectedCount++;
        collected = true;
        if (this.collectedCount >= this.totalShards) {
          this.activatePortal();
        }
      }
    }
    return collected;
  }

  activatePortal(): void {
    this.portal.active = true;
    this.portal.scale = 0;
  }

  updatePortal(dt: number): void {
    if (!this.portal.active) return;

    if (this.portal.scale < 32) {
      this.portal.scale = Math.min(32, this.portal.scale + (32 * dt / 2));
    }

    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.portal.particles.push({
        x: this.portal.x,
        y: this.portal.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        color: ['#9B59B6', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12'][Math.floor(Math.random() * 5)]
      });
    }

    for (const p of this.portal.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.portal.particles = this.portal.particles.filter(p => p.life < p.maxLife);
  }

  snapshot(): FrameSnapshot {
    return {
      playerX: this.player.x,
      playerY: this.player.y,
      shards: this.shards.map(s => s.collected),
      boxX: this.box.x,
      boxY: this.box.y,
      buttonPressed: this.button.pressed,
      doorOpen: this.door.open
    };
  }

  restoreFromSnapshot(snap: FrameSnapshot): void {
    this.player.x = snap.playerX;
    this.player.y = snap.playerY;
    for (let i = 0; i < this.shards.length && i < snap.shards.length; i++) {
      this.shards[i].collected = snap.shards[i];
    }
    this.collectedCount = this.shards.filter(s => s.collected).length;
    this.box.x = snap.boxX;
    this.box.y = snap.boxY;
    this.button.pressed = snap.buttonPressed;
    this.door.open = snap.doorOpen;

    if (this.collectedCount >= this.totalShards && !this.portal.active) {
      this.activatePortal();
    } else if (this.collectedCount < this.totalShards) {
      this.portal.active = false;
      this.portal.scale = 0;
      this.portal.particles = [];
    }
  }
}
