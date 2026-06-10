import { v4 as uuidv4 } from 'uuid';
import {
  CollisionResult,
  GravityDirection,
  GravityStone,
  GRID_COLS,
  GRID_ROWS,
  LevelData,
  MovingPlatform,
  Rect,
  TILE_SIZE,
  TileType,
  Vector2
} from './types';
import { rectIntersect } from './utils';
import { LEVELS } from './levels';

export class Level {
  public grid: number[][];
  public startPos: Vector2;
  public goalPos: Vector2;
  public movingPlatforms: MovingPlatform[];
  public gravityStones: GravityStone[];
  public readonly levelIndex: number;

  private noiseDots: { x: number; y: number; size: number; alpha: number }[] = [];

  constructor(levelIndex: number) {
    this.levelIndex = Math.min(levelIndex, LEVELS.length - 1);
    const data = LEVELS[this.levelIndex];

    this.grid = data.grid.map(row => [...row]);
    this.startPos = { ...data.startPos };
    this.goalPos = { ...data.goalPos };

    this.movingPlatforms = data.movingPlatforms.map(mp => ({
      ...mp,
      id: uuidv4(),
      progress: 0,
      direction: 1
    }));

    this.gravityStones = data.gravityStones.map(gs => ({
      ...gs,
      id: uuidv4(),
      triggered: false,
      cooldown: 0
    }));

    this.generateNoiseDots();
  }

  private generateNoiseDots(): void {
    this.noiseDots = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.noiseDots.push({
        x: Math.random() * GRID_COLS * TILE_SIZE,
        y: Math.random() * GRID_ROWS * TILE_SIZE,
        size: Math.random() < 0.7 ? 1 : 2,
        alpha: 0.05 + Math.random() * 0.15
      });
    }
  }

  public get totalLevels(): number {
    return LEVELS.length;
  }

  public update(deltaTime: number = 1): void {
    for (const platform of this.movingPlatforms) {
      platform.progress += platform.speed * platform.direction * deltaTime;

      if (platform.progress >= 1) {
        platform.progress = 1;
        platform.direction = -1;
      } else if (platform.progress <= 0) {
        platform.progress = 0;
        platform.direction = 1;
      }

      if (platform.axis === 'horizontal') {
        platform.x = platform.startX + (platform.endX - platform.startX) * platform.progress;
      } else {
        platform.y = platform.startY + (platform.endY - platform.startY) * platform.progress;
      }
    }

    for (const stone of this.gravityStones) {
      if (stone.cooldown > 0) {
        stone.cooldown -= deltaTime * 16.67;
        if (stone.cooldown <= 0) {
          stone.triggered = false;
        }
      }
    }
  }

  public checkCollision(playerRect: Rect, gravityDir: GravityDirection): CollisionResult {
    const result: CollisionResult = {
      hitSpike: false,
      hitGoal: false,
      hitGravityStone: null,
      onGround: false,
      groundNormal: null
    };

    const goalRect: Rect = {
      x: this.goalPos.x,
      y: this.goalPos.y,
      width: TILE_SIZE,
      height: TILE_SIZE
    };
    if (rectIntersect(playerRect, goalRect)) {
      result.hitGoal = true;
    }

    let collisionCount = 0;
    const maxCollisions = 200;

    const tiles = this.getOverlappingTiles(playerRect);
    for (const tile of tiles) {
      if (collisionCount >= maxCollisions) break;
      collisionCount++;

      const tileType = this.grid[tile.y][tile.x];
      const tileRect: Rect = {
        x: tile.x * TILE_SIZE,
        y: tile.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE
      };

      if (tileType === TileType.SPIKE) {
        const spikeRect = this.getSpikeRect(tileRect);
        if (rectIntersect(playerRect, spikeRect)) {
          result.hitSpike = true;
        }
      }

      if (tileType === TileType.GRAVITY_STONE) {
        if (rectIntersect(playerRect, tileRect)) {
          const stone = this.gravityStones.find(
            s => s.gridX === tile.x && s.gridY === tile.y
          );
          if (stone && !stone.triggered) {
            result.hitGravityStone = stone.id;
          }
        }
      }
    }

    for (const platform of this.movingPlatforms) {
      if (collisionCount >= maxCollisions) break;
      collisionCount++;
    }

    this.checkPlatformGround(playerRect, gravityDir, result);
    this.checkTileGround(playerRect, gravityDir, result, maxCollisions);

    return result;
  }

  public resolvePlatformCollisions(
    playerRect: Rect,
    playerVel: { vx: number; vy: number },
    gravityDir: GravityDirection
  ): { x: number; y: number; onGround: boolean } {
    let newX = playerRect.x;
    let newY = playerRect.y;
    let onGround = false;

    for (const platform of this.movingPlatforms) {
      const platRect: Rect = {
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height
      };

      if (!rectIntersect({ ...playerRect, x: newX, y: newY }, platRect)) continue;

      switch (gravityDir) {
        case GravityDirection.DOWN:
          if (playerVel.vy >= 0 && playerRect.y + playerRect.height <= platRect.y + 4) {
            newY = platRect.y - playerRect.height;
            onGround = true;
          } else if (playerVel.vy < 0 && playerRect.y >= platRect.y + platRect.height - 4) {
            newY = platRect.y + platRect.height;
          } else if (playerVel.vx > 0) {
            newX = platRect.x - playerRect.width;
          } else if (playerVel.vx < 0) {
            newX = platRect.x + platRect.width;
          }
          break;
        case GravityDirection.UP:
          if (playerVel.vy <= 0 && playerRect.y >= platRect.y + platRect.height - 4) {
            newY = platRect.y + platRect.height;
            onGround = true;
          } else if (playerVel.vy > 0 && playerRect.y + playerRect.height <= platRect.y + 4) {
            newY = platRect.y - playerRect.height;
          } else if (playerVel.vx > 0) {
            newX = platRect.x - playerRect.width;
          } else if (playerVel.vx < 0) {
            newX = platRect.x + platRect.width;
          }
          break;
        case GravityDirection.RIGHT:
          if (playerVel.vx >= 0 && playerRect.x + playerRect.width <= platRect.x + 4) {
            newX = platRect.x - playerRect.width;
            onGround = true;
          } else if (playerVel.vx < 0 && playerRect.x >= platRect.x + platRect.width - 4) {
            newX = platRect.x + platRect.width;
          } else if (playerVel.vy > 0) {
            newY = platRect.y - playerRect.height;
          } else if (playerVel.vy < 0) {
            newY = platRect.y + platRect.height;
          }
          break;
        case GravityDirection.LEFT:
          if (playerVel.vx <= 0 && playerRect.x >= platRect.x + platRect.width - 4) {
            newX = platRect.x + platRect.width;
            onGround = true;
          } else if (playerVel.vx > 0 && playerRect.x + playerRect.width <= platRect.x + 4) {
            newX = platRect.x - playerRect.width;
          } else if (playerVel.vy > 0) {
            newY = platRect.y - playerRect.height;
          } else if (playerVel.vy < 0) {
            newY = platRect.y + platRect.height;
          }
          break;
      }
    }

    return { x: newX, y: newY, onGround };
  }

  public resolveTileCollisions(
    playerRect: Rect,
    playerVel: { vx: number; vy: number },
    gravityDir: GravityDirection
  ): { x: number; y: number; onGround: boolean } {
    let newX = playerRect.x;
    let newY = playerRect.y;
    let onGround = false;

    const tiles = this.getOverlappingTiles({ ...playerRect, x: newX, y: newY });
    let count = 0;
    const maxCount = 200;

    for (const tile of tiles) {
      if (count >= maxCount) break;
      count++;

      const tileType = this.grid[tile.y][tile.x];
      if (tileType !== TileType.PLATFORM) continue;

      const tileRect: Rect = {
        x: tile.x * TILE_SIZE,
        y: tile.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE
      };

      if (!rectIntersect({ ...playerRect, x: newX, y: newY }, tileRect)) continue;

      switch (gravityDir) {
        case GravityDirection.DOWN:
          if (playerVel.vy >= 0 && playerRect.y + playerRect.height <= tileRect.y + 6) {
            newY = tileRect.y - playerRect.height;
            onGround = true;
          } else if (playerVel.vy < 0 && playerRect.y >= tileRect.y + tileRect.height - 6) {
            newY = tileRect.y + tileRect.height;
          } else if (playerVel.vx > 0 && playerRect.x + playerRect.width <= tileRect.x + 6) {
            newX = tileRect.x - playerRect.width;
          } else if (playerVel.vx < 0 && playerRect.x >= tileRect.x + tileRect.width - 6) {
            newX = tileRect.x + tileRect.width;
          }
          break;
        case GravityDirection.UP:
          if (playerVel.vy <= 0 && playerRect.y >= tileRect.y + tileRect.height - 6) {
            newY = tileRect.y + tileRect.height;
            onGround = true;
          } else if (playerVel.vy > 0 && playerRect.y + playerRect.height <= tileRect.y + 6) {
            newY = tileRect.y - playerRect.height;
          } else if (playerVel.vx > 0 && playerRect.x + playerRect.width <= tileRect.x + 6) {
            newX = tileRect.x - playerRect.width;
          } else if (playerVel.vx < 0 && playerRect.x >= tileRect.x + tileRect.width - 6) {
            newX = tileRect.x + tileRect.width;
          }
          break;
        case GravityDirection.RIGHT:
          if (playerVel.vx >= 0 && playerRect.x + playerRect.width <= tileRect.x + 6) {
            newX = tileRect.x - playerRect.width;
            onGround = true;
          } else if (playerVel.vx < 0 && playerRect.x >= tileRect.x + tileRect.width - 6) {
            newX = tileRect.x + tileRect.width;
          } else if (playerVel.vy > 0 && playerRect.y + playerRect.height <= tileRect.y + 6) {
            newY = tileRect.y - playerRect.height;
          } else if (playerVel.vy < 0 && playerRect.y >= tileRect.y + tileRect.height - 6) {
            newY = tileRect.y + tileRect.height;
          }
          break;
        case GravityDirection.LEFT:
          if (playerVel.vx <= 0 && playerRect.x >= tileRect.x + tileRect.width - 6) {
            newX = tileRect.x + tileRect.width;
            onGround = true;
          } else if (playerVel.vx > 0 && playerRect.x + playerRect.width <= tileRect.x + 6) {
            newX = tileRect.x - playerRect.width;
          } else if (playerVel.vy > 0 && playerRect.y + playerRect.height <= tileRect.y + 6) {
            newY = tileRect.y - playerRect.height;
          } else if (playerVel.vy < 0 && playerRect.y >= tileRect.y + tileRect.height - 6) {
            newY = tileRect.y + tileRect.height;
          }
          break;
      }
    }

    return { x: newX, y: newY, onGround };
  }

  public triggerGravityStone(stoneId: string): void {
    const stone = this.gravityStones.find(s => s.id === stoneId);
    if (stone) {
      stone.triggered = true;
      stone.cooldown = 1000;
    }
  }

  public isOutOfBounds(rect: Rect): boolean {
    return (
      rect.x < -TILE_SIZE ||
      rect.y < -TILE_SIZE ||
      rect.x > GRID_COLS * TILE_SIZE + TILE_SIZE ||
      rect.y > GRID_ROWS * TILE_SIZE + TILE_SIZE
    );
  }

  private getOverlappingTiles(rect: Rect): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    const startX = Math.max(0, Math.floor(rect.x / TILE_SIZE));
    const endX = Math.min(GRID_COLS - 1, Math.floor((rect.x + rect.width) / TILE_SIZE));
    const startY = Math.max(0, Math.floor(rect.y / TILE_SIZE));
    const endY = Math.min(GRID_ROWS - 1, Math.floor((rect.y + rect.height) / TILE_SIZE));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  private getSpikeRect(tileRect: Rect): Rect {
    return {
      x: tileRect.x + 4,
      y: tileRect.y + 8,
      width: tileRect.width - 8,
      height: tileRect.height - 8
    };
  }

  private checkPlatformGround(
    playerRect: Rect,
    gravityDir: GravityDirection,
    result: CollisionResult
  ): void {
    for (const platform of this.movingPlatforms) {
      const platRect: Rect = {
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height
      };

      const groundCheck = this.isOnSurface(playerRect, platRect, gravityDir);
      if (groundCheck.onSurface) {
        result.onGround = true;
        result.groundNormal = groundCheck.normal;
        return;
      }
    }
  }

  private checkTileGround(
    playerRect: Rect,
    gravityDir: GravityDirection,
    result: CollisionResult,
    maxCount: number
  ): void {
    const tiles = this.getGroundCheckTiles(playerRect, gravityDir);
    let count = 0;

    for (const tile of tiles) {
      if (count >= maxCount) break;
      if (this.grid[tile.y]?.[tile.x] !== TileType.PLATFORM) continue;
      count++;

      const tileRect: Rect = {
        x: tile.x * TILE_SIZE,
        y: tile.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE
      };

      const groundCheck = this.isOnSurface(playerRect, tileRect, gravityDir);
      if (groundCheck.onSurface) {
        result.onGround = true;
        result.groundNormal = groundCheck.normal;
        return;
      }
    }
  }

  private getGroundCheckTiles(
    playerRect: Rect,
    gravityDir: GravityDirection
  ): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    let checkX: number, checkY: number;

    switch (gravityDir) {
      case GravityDirection.DOWN:
        checkY = playerRect.y + playerRect.height + 1;
        for (let px = playerRect.x; px < playerRect.x + playerRect.width; px += TILE_SIZE / 2) {
          const tx = Math.floor(px / TILE_SIZE);
          const ty = Math.floor(checkY / TILE_SIZE);
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            tiles.push({ x: tx, y: ty });
          }
        }
        break;
      case GravityDirection.UP:
        checkY = playerRect.y - 1;
        for (let px = playerRect.x; px < playerRect.x + playerRect.width; px += TILE_SIZE / 2) {
          const tx = Math.floor(px / TILE_SIZE);
          const ty = Math.floor(checkY / TILE_SIZE);
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            tiles.push({ x: tx, y: ty });
          }
        }
        break;
      case GravityDirection.RIGHT:
        checkX = playerRect.x + playerRect.width + 1;
        for (let py = playerRect.y; py < playerRect.y + playerRect.height; py += TILE_SIZE / 2) {
          const tx = Math.floor(checkX / TILE_SIZE);
          const ty = Math.floor(py / TILE_SIZE);
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            tiles.push({ x: tx, y: ty });
          }
        }
        break;
      case GravityDirection.LEFT:
        checkX = playerRect.x - 1;
        for (let py = playerRect.y; py < playerRect.y + playerRect.height; py += TILE_SIZE / 2) {
          const tx = Math.floor(checkX / TILE_SIZE);
          const ty = Math.floor(py / TILE_SIZE);
          if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
            tiles.push({ x: tx, y: ty });
          }
        }
        break;
    }

    return tiles;
  }

  private isOnSurface(
    playerRect: Rect,
    surfaceRect: Rect,
    gravityDir: GravityDirection
  ): { onSurface: boolean; normal: Vector2 | null } {
    const tolerance = 2;
    const overlap =
      playerRect.x < surfaceRect.x + surfaceRect.width &&
      playerRect.x + playerRect.width > surfaceRect.x &&
      playerRect.y < surfaceRect.y + surfaceRect.height &&
      playerRect.y + playerRect.height > surfaceRect.y;

    if (!overlap) return { onSurface: false, normal: null };

    switch (gravityDir) {
      case GravityDirection.DOWN:
        if (Math.abs(playerRect.y + playerRect.height - surfaceRect.y) <= tolerance) {
          return { onSurface: true, normal: { x: 0, y: -1 } };
        }
        break;
      case GravityDirection.UP:
        if (Math.abs(playerRect.y - (surfaceRect.y + surfaceRect.height)) <= tolerance) {
          return { onSurface: true, normal: { x: 0, y: 1 } };
        }
        break;
      case GravityDirection.RIGHT:
        if (Math.abs(playerRect.x + playerRect.width - surfaceRect.x) <= tolerance) {
          return { onSurface: true, normal: { x: -1, y: 0 } };
        }
        break;
      case GravityDirection.LEFT:
        if (Math.abs(playerRect.x - (surfaceRect.x + surfaceRect.width)) <= tolerance) {
          return { onSurface: true, normal: { x: 1, y: 0 } };
        }
        break;
    }

    return { onSurface: false, normal: null };
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    this.renderBackground(ctx);
    this.renderTiles(ctx, time);
    this.renderMovingPlatforms(ctx, time);
    this.renderGravityStones(ctx, time);
    this.renderGoal(ctx, time);
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    for (const dot of this.noiseDots) {
      ctx.fillStyle = `rgba(138, 43, 226, ${dot.alpha})`;
      ctx.fillRect(Math.floor(dot.x), Math.floor(dot.y), dot.size, dot.size);
    }
  }

  private renderTiles(ctx: CanvasRenderingContext2D, time: number): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tileType = this.grid[y][x];
        if (tileType === TileType.EMPTY) continue;

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        switch (tileType) {
          case TileType.PLATFORM:
            this.renderPlatform(ctx, px, py);
            break;
          case TileType.SPIKE:
            this.renderSpike(ctx, px, py);
            break;
        }
      }
    }
  }

  private renderPlatform(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#555555';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y, 2, TILE_SIZE);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 4, y + 4, 2, 2);
    ctx.fillRect(x + 24, y + 12, 2, 2);
    ctx.fillRect(x + 12, y + 24, 2, 2);
  }

  private renderSpike(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#ff3333';

    for (let i = 0; i < 4; i++) {
      const sx = x + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx, y + TILE_SIZE);
      ctx.lineTo(sx + 4, y + 8);
      ctx.lineTo(sx + 8, y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ff6666';
    for (let i = 0; i < 4; i++) {
      const sx = x + i * 8;
      ctx.fillRect(sx + 3, y + 10, 1, TILE_SIZE - 12);
    }
  }

  private renderMovingPlatforms(ctx: CanvasRenderingContext2D, time: number): void {
    for (const platform of this.movingPlatforms) {
      const px = Math.floor(platform.x);
      const py = Math.floor(platform.y);

      ctx.fillStyle = '#444466';
      ctx.fillRect(px, py, platform.width, platform.height);

      ctx.fillStyle = '#6666aa';
      ctx.fillRect(px, py, platform.width, 1);
      ctx.fillRect(px, py, 1, platform.height);

      ctx.fillStyle = '#222244';
      ctx.fillRect(px, py + platform.height - 1, platform.width, 1);
      ctx.fillRect(px + platform.width - 1, py, 1, platform.height);

      this.renderPlatformArrow(ctx, px, py, platform);
    }
  }

  private renderPlatformArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    platform: MovingPlatform
  ): void {
    const cx = x + platform.width / 2;
    const cy = y + platform.height / 2;
    ctx.fillStyle = '#aaaaff';

    if (platform.axis === 'horizontal') {
      const dir = platform.direction;
      ctx.beginPath();
      if (dir > 0) {
        ctx.moveTo(cx + 6, cy);
        ctx.lineTo(cx - 2, cy - 3);
        ctx.lineTo(cx - 2, cy + 3);
      } else {
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx + 2, cy - 3);
        ctx.lineTo(cx + 2, cy + 3);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      const dir = platform.direction;
      ctx.beginPath();
      if (dir > 0) {
        ctx.moveTo(cx, cy + 3);
        ctx.lineTo(cx - 3, cy - 2);
        ctx.lineTo(cx + 3, cy - 2);
      } else {
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx - 3, cy + 2);
        ctx.lineTo(cx + 3, cy + 2);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderGravityStones(ctx: CanvasRenderingContext2D, time: number): void {
    for (const stone of this.gravityStones) {
      const px = stone.gridX * TILE_SIZE;
      const py = stone.gridY * TILE_SIZE;
      const cx = px + TILE_SIZE / 2;
      const cy = py + TILE_SIZE / 2;

      const breathPhase = Math.sin(time * 0.003) * 0.5 + 0.5;
      const glowRadius = 18 + breathPhase * 8;
      const glowAlpha = 0.3 + breathPhase * 0.3;

      if (!stone.triggered) {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        gradient.addColorStop(0, `rgba(0, 102, 255, ${glowAlpha})`);
        gradient.addColorStop(0.5, `rgba(0, 102, 255, ${glowAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 102, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(px - glowRadius, py - glowRadius, TILE_SIZE + glowRadius * 2, TILE_SIZE + glowRadius * 2);
      }

      ctx.fillStyle = stone.triggered ? '#333366' : '#0066ff';
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      ctx.fillStyle = stone.triggered ? '#1a1a33' : '#00aaff';
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, 2);
      ctx.fillRect(px + 4, py + 4, 2, TILE_SIZE - 8);

      ctx.fillStyle = stone.triggered ? '#111122' : '#0033aa';
      ctx.fillRect(px + 4, py + TILE_SIZE - 6, TILE_SIZE - 8, 2);
      ctx.fillRect(px + TILE_SIZE - 6, py + 4, 2, TILE_SIZE - 8);

      ctx.fillStyle = stone.triggered ? '#222244' : '#66bbff';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
  }

  private renderGoal(ctx: CanvasRenderingContext2D, time: number): void {
    const px = this.goalPos.x;
    const py = this.goalPos.y;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;

    const pulse = Math.sin(time * 0.005) * 0.5 + 0.5;
    const glowRadius = 20 + pulse * 10;
    const glowAlpha = 0.4 + pulse * 0.3;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, `rgba(0, 255, 100, ${glowAlpha})`);
    gradient.addColorStop(0.6, `rgba(0, 255, 100, ${glowAlpha * 0.4})`);
    gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(px - glowRadius, py - glowRadius, TILE_SIZE + glowRadius * 2, TILE_SIZE + glowRadius * 2);

    ctx.fillStyle = '#00ff66';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    ctx.fillStyle = '#66ffaa';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, 2);
    ctx.fillRect(px + 4, py + 4, 2, TILE_SIZE - 8);

    ctx.fillStyle = '#00aa44';
    ctx.fillRect(px + 4, py + TILE_SIZE - 6, TILE_SIZE - 8, 2);
    ctx.fillRect(px + TILE_SIZE - 6, py + 4, 2, TILE_SIZE - 8);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, py + 8, 4, TILE_SIZE - 16);
    ctx.fillRect(px + 8, cy - 2, TILE_SIZE - 16, 4);
  }
}
