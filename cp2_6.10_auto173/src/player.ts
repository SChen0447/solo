import {
  LevelEntity,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS
} from './types';

const GRAVITY = 0.4;
const MOVE_SPEED = 4;
const JUMP_VELOCITY = -8;
const PLAYER_RADIUS = 12;
const MAX_FALL_SPEED = 12;
const HIT_FLASH_DURATION = 60;
const ENEMY_SPEED = 1.5;

interface EnemyState {
  id: string;
  x: number;
  y: number;
  dir: number;
  originGridX: number;
  originGridY: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpatialHash {
  [key: string]: Rect[];
}

export class PlayMode {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    onGround: false,
    lives: 3,
    isHit: false,
    hitTimer: 0,
    spawnX: 0,
    spawnY: 0
  };
  private keys: Record<string, boolean> = {};
  private platforms: Rect[] = [];
  private spikes: Rect[] = [];
  private enemies: EnemyState[] = [];
  private goals: Rect[] = [];
  private spatialHash: SpatialHash = {};
  private hashCellSize = CELL_SIZE * 2;
  private victory = false;
  private onVictory?: () => void;
  private onLivesChange?: (lives: number) => void;
  private scaleX = 1;
  private scaleY = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  setCallbacks(onVictory: () => void, onLivesChange: (lives: number) => void): void {
    this.onVictory = onVictory;
    this.onLivesChange = onLivesChange;
  }

  setScale(scaleX: number, scaleY: number, offsetX: number, offsetY: number): void {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  loadLevel(entities: LevelEntity[]): boolean {
    this.platforms = [];
    this.spikes = [];
    this.enemies = [];
    this.goals = [];
    this.victory = false;
    this.player.lives = 3;
    this.onLivesChange?.(this.player.lives);

    entities.forEach(e => {
      const r: Rect = {
        x: e.gridX * CELL_SIZE + 2,
        y: e.gridY * CELL_SIZE + 2,
        w: CELL_SIZE - 4,
        h: CELL_SIZE - 4
      };
      switch (e.type) {
        case 'platform':
          this.platforms.push(r);
          break;
        case 'spike':
          this.spikes.push({
            x: e.gridX * CELL_SIZE + 8,
            y: e.gridY * CELL_SIZE + 8,
            w: CELL_SIZE - 16,
            h: CELL_SIZE - 12
          });
          break;
        case 'enemy':
          this.enemies.push({
            id: e.id,
            x: e.gridX * CELL_SIZE + CELL_SIZE / 2,
            y: e.gridY * CELL_SIZE + CELL_SIZE / 2,
            dir: 1,
            originGridX: e.gridX,
            originGridY: e.gridY
          });
          break;
        case 'goal':
          this.goals.push({
            x: e.gridX * CELL_SIZE + CELL_SIZE / 2 - 4,
            y: e.gridY * CELL_SIZE + 4,
            w: 20,
            h: CELL_SIZE - 8
          });
          break;
      }
    });

    if (this.platforms.length === 0) return false;

    const firstPlatform = this.platforms
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))[0];
    this.player.spawnX = firstPlatform.x + PLAYER_RADIUS + 2;
    this.player.spawnY = firstPlatform.y - PLAYER_RADIUS - 2;
    this.resetPlayer();
    this.buildSpatialHash();
    return true;
  }

  private resetPlayer(): void {
    this.player.x = this.player.spawnX;
    this.player.y = this.player.spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = false;
    this.player.isHit = false;
    this.player.hitTimer = 0;
  }

  private buildSpatialHash(): void {
    this.spatialHash = {};
    this.platforms.forEach(r => {
      const minCX = Math.floor(r.x / this.hashCellSize);
      const maxCX = Math.floor((r.x + r.w) / this.hashCellSize);
      const minCY = Math.floor(r.y / this.hashCellSize);
      const maxCY = Math.floor((r.y + r.h) / this.hashCellSize);
      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cy = minCY; cy <= maxCY; cy++) {
          const key = `${cx},${cy}`;
          if (!this.spatialHash[key]) this.spatialHash[key] = [];
          this.spatialHash[key].push(r);
        }
      }
    });
  }

  private queryNearby(x: number, y: number, w: number, h: number): Rect[] {
    const result: Rect[] = [];
    const seen = new Set<Rect>();
    const minCX = Math.floor(x / this.hashCellSize);
    const maxCX = Math.floor((x + w) / this.hashCellSize);
    const minCY = Math.floor(y / this.hashCellSize);
    const maxCY = Math.floor((y + h) / this.hashCellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = `${cx},${cy}`;
        if (this.spatialHash[key]) {
          this.spatialHash[key].forEach(r => {
            if (!seen.has(r)) {
              seen.add(r);
              result.push(r);
            }
          });
        }
      }
    }
    return result;
  }

  setKey(code: string, pressed: boolean): void {
    this.keys[code] = pressed;
  }

  resetKeys(): void {
    this.keys = {};
  }

  update(): void {
    if (this.victory) return;

    if (this.player.isHit) {
      this.player.hitTimer--;
      if (this.player.hitTimer <= 0) {
        this.player.isHit = false;
      }
    }

    let moveX = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveX -= MOVE_SPEED;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) moveX += MOVE_SPEED;
    this.player.vx = moveX;

    if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && this.player.onGround) {
      this.player.vy = JUMP_VELOCITY;
      this.player.onGround = false;
    }

    this.player.vy = Math.min(this.player.vy + GRAVITY, MAX_FALL_SPEED);

    this.moveAndCollide();

    if (this.player.x < PLAYER_RADIUS) this.player.x = PLAYER_RADIUS;
    if (this.player.x > CANVAS_WIDTH - PLAYER_RADIUS) this.player.x = CANVAS_WIDTH - PLAYER_RADIUS;
    if (this.player.y > CANVAS_HEIGHT + 100) {
      this.hurtPlayer(true);
    }

    this.updateEnemies();

    if (!this.player.isHit) {
      this.checkSpikeCollision();
      this.checkEnemyCollision();
    }
    this.checkGoalCollision();
  }

  private moveAndCollide(): void {
    this.player.x += this.player.vx;
    this.resolveCollisionsAxis('x');
    this.player.y += this.player.vy;
    this.player.onGround = false;
    this.resolveCollisionsAxis('y');
  }

  private resolveCollisionsAxis(axis: 'x' | 'y'): void {
    const pr: Rect = {
      x: this.player.x - PLAYER_RADIUS,
      y: this.player.y - PLAYER_RADIUS,
      w: PLAYER_RADIUS * 2,
      h: PLAYER_RADIUS * 2
    };
    const nearby = this.queryNearby(pr.x, pr.y, pr.w, pr.h);
    for (const plat of nearby) {
      if (rectIntersect(pr, plat)) {
        if (axis === 'x') {
          if (this.player.vx > 0) {
            this.player.x = plat.x - PLAYER_RADIUS;
          } else if (this.player.vx < 0) {
            this.player.x = plat.x + plat.w + PLAYER_RADIUS;
          }
          this.player.vx = 0;
          pr.x = this.player.x - PLAYER_RADIUS;
        } else {
          if (this.player.vy > 0) {
            this.player.y = plat.y - PLAYER_RADIUS;
            this.player.onGround = true;
          } else if (this.player.vy < 0) {
            this.player.y = plat.y + plat.h + PLAYER_RADIUS;
          }
          this.player.vy = 0;
          pr.y = this.player.y - PLAYER_RADIUS;
        }
      }
    }
  }

  private updateEnemies(): void {
    this.enemies.forEach(en => {
      en.x += en.dir * ENEMY_SPEED;
      const minX = en.originGridX * CELL_SIZE;
      const maxX = (en.originGridX + 1) * CELL_SIZE;
      if (en.x < minX + 14) {
        en.x = minX + 14;
        en.dir = 1;
      } else if (en.x > maxX - 14) {
        en.x = maxX - 14;
        en.dir = -1;
      }
    });
  }

  private checkSpikeCollision(): void {
    const pr: Rect = {
      x: this.player.x - PLAYER_RADIUS + 2,
      y: this.player.y - PLAYER_RADIUS + 2,
      w: PLAYER_RADIUS * 2 - 4,
      h: PLAYER_RADIUS * 2 - 4
    };
    for (const s of this.spikes) {
      if (rectIntersect(pr, s)) {
        this.hurtPlayer(true);
        return;
      }
    }
  }

  private checkEnemyCollision(): void {
    for (const en of this.enemies) {
      const dx = this.player.x - en.x;
      const dy = this.player.y - en.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + 14) {
        this.hurtPlayer(false);
        return;
      }
    }
  }

  private checkGoalCollision(): void {
    const pr: Rect = {
      x: this.player.x - PLAYER_RADIUS,
      y: this.player.y - PLAYER_RADIUS,
      w: PLAYER_RADIUS * 2,
      h: PLAYER_RADIUS * 2
    };
    for (const g of this.goals) {
      if (rectIntersect(pr, g)) {
        this.victory = true;
        this.onVictory?.();
        return;
      }
    }
  }

  private hurtPlayer(resetPos: boolean): void {
    this.player.lives--;
    this.onLivesChange?.(this.player.lives);
    if (resetPos || this.player.lives <= 0) {
      if (this.player.lives <= 0) {
        this.player.lives = 3;
        this.onLivesChange?.(this.player.lives);
      }
      this.resetPlayer();
    } else {
      this.player.isHit = true;
      this.player.hitTimer = HIT_FLASH_DURATION;
      this.player.vy = JUMP_VELOCITY * 0.6;
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scaleX, this.scaleY);

    ctx.fillStyle = COLORS.gridLine;
    ctx.globalAlpha = 0.15;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.fillRect(x * CELL_SIZE, 0, 1, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.fillRect(0, y * CELL_SIZE, CANVAS_WIDTH, 1);
    }
    ctx.globalAlpha = 1;

    this.platforms.forEach(p => {
      ctx.fillStyle = COLORS.platform;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(p.x, p.y, p.w, 4);
    });

    this.spikes.forEach(s => {
      const cx = s.x + s.w / 2;
      ctx.fillStyle = COLORS.spike;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.h);
      ctx.lineTo(cx, s.y);
      ctx.lineTo(s.x + s.w, s.y + s.h);
      ctx.closePath();
      ctx.fill();
    });

    this.goals.forEach(g => {
      const cx = g.x + 4;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(cx, g.y, 3, g.h);
      ctx.fillStyle = COLORS.goal;
      ctx.beginPath();
      ctx.moveTo(cx + 3, g.y);
      ctx.lineTo(cx + 18, g.y + 8);
      ctx.lineTo(cx + 3, g.y + 16);
      ctx.closePath();
      ctx.fill();
    });

    this.enemies.forEach(en => {
      ctx.save();
      ctx.translate(en.x, en.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.enemy;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-8, -6, 4, 4);
      ctx.fillRect(4, -6, 4, 4);
      ctx.restore();
    });

    if (this.player.isHit && Math.floor(this.player.hitTimer / 6) % 2 === 0) {
      ctx.fillStyle = '#ff8888';
    } else {
      ctx.fillStyle = COLORS.player;
    }
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  canvasToWorld(clientX: number, clientY: number): { x: number; y: number } {
    return {
      x: (clientX - this.offsetX) / this.scaleX,
      y: (clientY - this.offsetY) / this.scaleY
    };
  }
}

function rectIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
