import {
  GAME_CONFIG,
  GameState,
  InputState,
  ObstacleType,
  PlatformType,
  Player,
  Rect,
  WorldMap,
} from './types';
import { clamp, circleRectOverlap, fastSin, lerp, rectsOverlap } from './utils';
import { WorldGenerator } from './WorldGenerator';

export class EntityManager {
  private worldGenerator: WorldGenerator;
  private worldMap!: WorldMap;
  private player!: Player;

  constructor() {
    this.worldGenerator = new WorldGenerator();
  }

  public initialize(gameState: GameState): void {
    this.worldMap = this.worldGenerator.generate();
    gameState.totalSpores = this.worldMap.spores.length;
    gameState.sporesCollected = 0;
    this.createPlayer();
  }

  public regenerateWorld(gameState: GameState): void {
    this.worldMap = this.worldGenerator.generate();
    gameState.totalSpores = this.worldMap.spores.length;
    gameState.sporesCollected = 0;
    this.createPlayer();
  }

  private createPlayer(): void {
    this.player = {
      x: 80,
      y: GAME_CONFIG.GROUND_Y - GAME_CONFIG.PLAYER_HEIGHT - 10,
      width: GAME_CONFIG.PLAYER_WIDTH,
      height: GAME_CONFIG.PLAYER_HEIGHT,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      canDoubleJump: true,
      facing: 1,
      wingFrame: 0,
      wingTimer: 0,
      breathPhase: 0,
      invincible: false,
      invincibleTimer: 0,
      flashTimer: 0,
      visible: true,
    };
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getWorldMap(): WorldMap {
    return this.worldMap;
  }

  public update(
    dt: number,
    input: InputState,
    gameState: GameState,
    onCollectSpore: (x: number, y: number) => void,
    onPlayerHit: () => void,
  ): void {
    this.updatePlayer(dt, input, gameState, onCollectSpore, onPlayerHit);
    this.updatePlatforms(dt);
    this.updateSpores(dt);
    this.updateObstacles(dt);
  }

  private updatePlayer(
    dt: number,
    input: InputState,
    gameState: GameState,
    onCollectSpore: (x: number, y: number) => void,
    onPlayerHit: () => void,
  ): void {
    const { GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, WORLD_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    if (input.left) {
      this.player.velocityX = -PLAYER_SPEED;
      this.player.facing = -1;
    } else if (input.right) {
      this.player.velocityX = PLAYER_SPEED;
      this.player.facing = 1;
    } else {
      this.player.velocityX = 0;
    }

    if (input.jumpPressed) {
      if (this.player.onGround) {
        this.player.velocityY = -JUMP_VELOCITY;
        this.player.onGround = false;
        this.player.canDoubleJump = true;
      } else if (this.player.canDoubleJump) {
        this.player.velocityY = -JUMP_VELOCITY * 0.9;
        this.player.canDoubleJump = false;
      }
    }

    this.player.velocityY += GRAVITY * dt;
    this.player.velocityY = clamp(this.player.velocityY, -1000, 1000);

    this.movePlayerX(dt);
    this.movePlayerY(dt);

    this.player.x = clamp(this.player.x, 0, WORLD_WIDTH - this.player.width);

    if (this.player.y > CANVAS_HEIGHT + 100) {
      onPlayerHit();
      this.respawnPlayer();
    }

    this.checkSporeCollection(onCollectSpore, gameState);
    this.checkObstacleCollision(onPlayerHit);

    this.player.wingTimer += dt;
    if (this.player.wingTimer > 0.15) {
      this.player.wingTimer = 0;
      this.player.wingFrame = (this.player.wingFrame + 1) % 2;
    }

    this.player.breathPhase += dt * Math.PI;

    if (this.player.invincible) {
      this.player.invincibleTimer -= dt;
      this.player.flashTimer += dt;
      if (this.player.flashTimer >= 0.1) {
        this.player.flashTimer = 0;
        this.player.visible = !this.player.visible;
      }
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
        this.player.visible = true;
      }
    }
  }

  private movePlayerX(dt: number): void {
    this.player.x += this.player.velocityX * dt;

    const playerRect: Rect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    };

    for (const platform of this.worldMap.platforms) {
      if (platform.broken) continue;

      const platRect: Rect = {
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height,
      };

      if (rectsOverlap(playerRect, platRect)) {
        if (this.player.velocityX > 0) {
          this.player.x = platform.x - this.player.width;
        } else if (this.player.velocityX < 0) {
          this.player.x = platform.x + platform.width;
        }
        this.player.velocityX = 0;
        playerRect.x = this.player.x;
      }
    }
  }

  private movePlayerY(dt: number): void {
    this.player.y += this.player.velocityY * dt;
    this.player.onGround = false;

    const playerRect: Rect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    };

    for (const platform of this.worldMap.platforms) {
      if (platform.broken) continue;

      const platRect: Rect = {
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height,
      };

      if (rectsOverlap(playerRect, platRect)) {
        if (this.player.velocityY > 0) {
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.onGround = true;
          this.player.canDoubleJump = true;

          if (platform.type === PlatformType.ICE && !platform.breaking) {
            platform.breaking = true;
            platform.breakTimer = 2.0;
          }
        } else if (this.player.velocityY < 0) {
          this.player.y = platform.y + platform.height;
          this.player.velocityY = 0;
        }
        playerRect.y = this.player.y;
      }
    }
  }

  private checkSporeCollection(
    onCollectSpore: (x: number, y: number) => void,
    gameState: GameState,
  ): void {
    const playerRect: Rect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    };

    for (const spore of this.worldMap.spores) {
      if (spore.collected) continue;

      if (circleRectOverlap(spore.x, spore.y, spore.radius + 4, playerRect)) {
        spore.collected = true;
        gameState.score += 10;
        gameState.sporesCollected++;
        onCollectSpore(spore.x, spore.y);
      }
    }
  }

  private checkObstacleCollision(onPlayerHit: () => void): void {
    if (this.player.invincible) return;

    const playerRect: Rect = {
      x: this.player.x + 4,
      y: this.player.y + 4,
      width: this.player.width - 8,
      height: this.player.height - 8,
    };

    for (const obstacle of this.worldMap.obstacles) {
      const effectiveRadius = obstacle.radius * obstacle.scale;
      if (circleRectOverlap(obstacle.x, obstacle.y, effectiveRadius, playerRect)) {
        obstacle.hitFlash = 0.3;
        onPlayerHit();
        break;
      }
    }
  }

  private respawnPlayer(): void {
    this.player.x = 80;
    this.player.y = GAME_CONFIG.GROUND_Y - GAME_CONFIG.PLAYER_HEIGHT - 10;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.player.invincible = true;
    this.player.invincibleTimer = 0.5;
    this.player.flashTimer = 0;
    this.player.visible = true;
  }

  public triggerInvincibility(): void {
    this.player.invincible = true;
    this.player.invincibleTimer = 0.5;
    this.player.flashTimer = 0;
    this.player.visible = true;
  }

  private updatePlatforms(dt: number): void {
    for (const platform of this.worldMap.platforms) {
      if (platform.type === PlatformType.ICE && platform.breaking && !platform.broken) {
        platform.breakTimer -= dt;
        if (platform.breakTimer <= 0) {
          platform.broken = true;
        }
      }
    }
  }

  private updateSpores(dt: number): void {
    for (const spore of this.worldMap.spores) {
      if (spore.collected) continue;
      spore.floatPhase += dt * Math.PI * 2 * 1.5;
      spore.y = spore.baseY + fastSin(spore.floatPhase) * 3;
    }
  }

  private updateObstacles(dt: number): void {
    for (const obstacle of this.worldMap.obstacles) {
      if (obstacle.hitFlash > 0) {
        obstacle.hitFlash -= dt;
      }

      switch (obstacle.type) {
        case ObstacleType.POISON_MUSHROOM:
          break;

        case ObstacleType.SWELL_MUSHROOM: {
          const dist = Math.sqrt(
            Math.pow(this.player.x + this.player.width / 2 - obstacle.x, 2) +
              Math.pow(this.player.y + this.player.height / 2 - obstacle.y, 2),
          );

          if (dist < 200 && obstacle.recoverTimer <= 0) {
            obstacle.swellTimer += dt;
            if (obstacle.swellTimer >= 2) {
              obstacle.targetScale = 2;
              obstacle.recoverTimer = 5;
            } else {
              obstacle.targetScale = 1 + (obstacle.swellTimer / 2) * 1;
            }
          } else if (obstacle.recoverTimer > 0) {
            obstacle.recoverTimer -= dt;
            obstacle.swellTimer = Math.max(0, obstacle.swellTimer - dt);
            if (obstacle.recoverTimer <= 0) {
              obstacle.targetScale = 1;
              obstacle.swellTimer = 0;
            } else {
              obstacle.targetScale = 1 + (obstacle.recoverTimer / 5) * 1;
            }
          } else {
            obstacle.swellTimer = Math.max(0, obstacle.swellTimer - dt * 0.5);
            obstacle.targetScale = 1 + (obstacle.swellTimer / 2) * 1;
          }

          obstacle.scale = lerp(obstacle.scale, obstacle.targetScale, dt * 4);
          break;
        }

        case ObstacleType.THORN_WHEEL: {
          obstacle.angle += dt * Math.PI * 2 / 2;
          obstacle.orbitPhase += dt * Math.PI * 2 / 4;

          const orbitRadiusX = 40;
          const orbitRadiusY = 25;
          obstacle.x = obstacle.baseX + fastSin(obstacle.orbitPhase) * orbitRadiusX;
          obstacle.y = obstacle.baseY + fastSin(obstacle.orbitPhase * 2) * orbitRadiusY;
          break;
        }
      }
    }
  }
}
