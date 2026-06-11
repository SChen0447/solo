import Phaser from 'phaser';
import { CaveWorld, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './CaveWorld';
import { Player } from './Player';

enum MonsterType {
  BAT = 'bat',
  SPIDER = 'spider',
}

interface Monster {
  type: MonsterType;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  targetX: number;
  targetY: number;
  speed: number;
  health: number;
  isScared: boolean;
  scaredTimer: number;
  sprite: Phaser.GameObjects.Container;
  lastAttackTime: number;
  attackCooldown: number;
  aiUpdateTimer: number;
  isMoving: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  sprite: Phaser.GameObjects.Arc;
}

export class MonsterManager {
  private scene: Phaser.Scene;
  private caveWorld: CaveWorld;
  private player: Player;

  private monsters: Monster[] = [];
  private projectiles: Projectile[] = [];

  private spawnTimer: number = 0;
  private spawnInterval: number = 5000;
  private minSpawnInterval: number = 1000;
  private gameTime: number = 0;
  private difficultyIncreaseInterval: number = 30000;
  private lastDifficultyIncrease: number = 0;

  private aiUpdateInterval: number = 100;
  private aiTimer: number = 0;

  private maxMonsters: number = 15;

  private onPlayerDamageCallback: ((damage: number, knockbackDir?: { x: number; y: number }) => void) | null = null;
  private onPlayerSlowCallback: ((duration: number) => void) | null = null;

  constructor(scene: Phaser.Scene, caveWorld: CaveWorld, player: Player) {
    this.scene = scene;
    this.caveWorld = caveWorld;
    this.player = player;
  }

  public update(time: number, delta: number): void {
    this.gameTime += delta;

    if (this.gameTime - this.lastDifficultyIncrease >= this.difficultyIncreaseInterval) {
      this.lastDifficultyIncrease = this.gameTime;
      this.spawnInterval = Math.max(this.minSpawnInterval, this.spawnInterval - 500);
    }

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval && this.monsters.length < this.maxMonsters) {
      this.spawnMonster();
      this.spawnTimer = 0;
    }

    this.aiTimer += delta;
    if (this.aiTimer >= this.aiUpdateInterval) {
      this.updateAI();
      this.aiTimer = 0;
    }

    this.updateMonsters(delta);
    this.updateProjectiles(delta);
  }

  private spawnMonster(): void {
    const playerPos = this.player.getGridPosition();
    const spawnDistance = 8;

    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const distance = spawnDistance + Math.random() * 10;
      const x = Math.floor(playerPos.x + Math.cos(angle) * distance);
      const y = Math.floor(playerPos.y + Math.sin(angle) * distance);

      if (x < 2 || x >= MAP_WIDTH - 2 || y < 2 || y >= MAP_HEIGHT - 2) continue;
      if (!this.caveWorld.isWalkable(x, y)) continue;

      const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
      const pixelY = y * TILE_SIZE + TILE_SIZE / 2;

      if (this.player.isPointInLight(pixelX, pixelY)) continue;

      const type = Math.random() < 0.6 ? MonsterType.BAT : MonsterType.SPIDER;
      const monster = this.createMonster(type, x, y);
      if (monster) {
        this.monsters.push(monster);
        return;
      }
    }
  }

  private createMonster(type: MonsterType, gridX: number, gridY: number): Monster | null {
    const pixelX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = gridY * TILE_SIZE + TILE_SIZE / 2;

    const container = this.scene.add.container(pixelX, pixelY);
    container.setDepth(9);

    if (type === MonsterType.BAT) {
      const body = this.scene.add.ellipse(0, 0, 16, 10, 0x4a235a);
      body.setStrokeStyle(1, 0x2c1338);
      container.add(body);

      const leftWing = this.scene.add.triangle(-12, 0, -20, -8, -20, 8, -8, 0, 0x6c3483);
      leftWing.setStrokeStyle(1, 0x4a235a);
      container.add(leftWing);

      const rightWing = this.scene.add.triangle(12, 0, 20, -8, 20, 8, 8, 0, 0x6c3483);
      rightWing.setStrokeStyle(1, 0x4a235a);
      container.add(rightWing);

      const eye1 = this.scene.add.circle(-4, -2, 2, 0xff0000);
      const eye2 = this.scene.add.circle(4, -2, 2, 0xff0000);
      container.add(eye1);
      container.add(eye2);

      return {
        type: MonsterType.BAT,
        x: gridX,
        y: gridY,
        pixelX,
        pixelY,
        targetX: pixelX,
        targetY: pixelY,
        speed: 2 * TILE_SIZE,
        health: 1,
        isScared: false,
        scaredTimer: 0,
        sprite: container,
        lastAttackTime: 0,
        attackCooldown: 1500,
        aiUpdateTimer: 0,
        isMoving: false,
      };
    } else {
      const body = this.scene.add.ellipse(0, 0, 14, 12, 0x1a1a1a);
      body.setStrokeStyle(1, 0x0a0a0a);
      container.add(body);

      for (let i = 0; i < 4; i++) {
        const offsetY = -6 + i * 4;
        const leftLeg = this.scene.add.line(-10, offsetY, -10, offsetY, -18, offsetY - 6, 0x333333);
        leftLeg.setLineWidth(2);
        const rightLeg = this.scene.add.line(10, offsetY, 10, offsetY, 18, offsetY - 6, 0x333333);
        rightLeg.setLineWidth(2);
        container.add(leftLeg);
        container.add(rightLeg);
      }

      const eye1 = this.scene.add.circle(-4, -3, 2, 0x00ff00);
      const eye2 = this.scene.add.circle(4, -3, 2, 0x00ff00);
      container.add(eye1);
      container.add(eye2);

      return {
        type: MonsterType.SPIDER,
        x: gridX,
        y: gridY,
        pixelX,
        pixelY,
        targetX: pixelX,
        targetY: pixelY,
        speed: 1 * TILE_SIZE,
        health: 1,
        isScared: false,
        scaredTimer: 0,
        sprite: container,
        lastAttackTime: 0,
        attackCooldown: 2000,
        aiUpdateTimer: 0,
        isMoving: false,
      };
    }
  }

  private updateAI(): void {
    const playerPos = this.player.getPixelPosition();
    const playerGridPos = this.player.getGridPosition();

    for (const monster of this.monsters) {
      const distToPlayer = Math.sqrt(
        Math.pow(monster.pixelX - playerPos.x, 2) +
        Math.pow(monster.pixelY - playerPos.y, 2)
      );

      const isInLight = this.player.isPointInLight(monster.pixelX, monster.pixelY);

      if (isInLight && !monster.isScared) {
        monster.isScared = true;
        monster.scaredTimer = 1000;
        this.playScaredAnimation(monster);
      }

      if (monster.isScared) {
        const dx = monster.pixelX - playerPos.x;
        const dy = monster.pixelY - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const fleeX = monster.pixelX + (dx / dist) * TILE_SIZE * 2;
        const fleeY = monster.pixelY + (dy / dist) * TILE_SIZE * 2;

        const gridFleeX = Math.floor(fleeX / TILE_SIZE);
        const gridFleeY = Math.floor(fleeY / TILE_SIZE);

        if (this.caveWorld.isWalkable(gridFleeX, gridFleeY)) {
          monster.x = gridFleeX;
          monster.y = gridFleeY;
          monster.targetX = gridFleeX * TILE_SIZE + TILE_SIZE / 2;
          monster.targetY = gridFleeY * TILE_SIZE + TILE_SIZE / 2;
          monster.isMoving = true;
        }
        continue;
      }

      if (distToPlayer < TILE_SIZE * 1.5 && !monster.isScared) {
        const now = this.gameTime;
        if (now - monster.lastAttackTime > monster.attackCooldown) {
          this.attackPlayer(monster);
          monster.lastAttackTime = now;
        }
        continue;
      }

      this.moveTowardsPlayer(monster, playerGridPos);
    }
  }

  private moveTowardsPlayer(monster: Monster, playerPos: { x: number; y: number }): void {
    if (monster.isMoving) return;

    const dx = playerPos.x - monster.x;
    const dy = playerPos.y - monster.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    let moveX = monster.x;
    let moveY = monster.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      moveX += Math.sign(dx);
      if (!this.caveWorld.isWalkable(moveX, moveY)) {
        moveX = monster.x;
        moveY += Math.sign(dy) || (Math.random() < 0.5 ? 1 : -1);
      }
    } else {
      moveY += Math.sign(dy);
      if (!this.caveWorld.isWalkable(moveX, moveY)) {
        moveY = monster.y;
        moveX += Math.sign(dx) || (Math.random() < 0.5 ? 1 : -1);
      }
    }

    if (this.caveWorld.isWalkable(moveX, moveY)) {
      monster.x = moveX;
      monster.y = moveY;
      monster.targetX = moveX * TILE_SIZE + TILE_SIZE / 2;
      monster.targetY = moveY * TILE_SIZE + TILE_SIZE / 2;
      monster.isMoving = true;
    }
  }

  private attackPlayer(monster: Monster): void {
    if (monster.type === MonsterType.BAT) {
      if (this.onPlayerDamageCallback) {
        const dx = this.player.getPixelPosition().x - monster.pixelX;
        const dy = this.player.getPixelPosition().y - monster.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.onPlayerDamageCallback(1, { x: Math.sign(dx), y: Math.sign(dy) });
      }
    } else if (monster.type === MonsterType.SPIDER) {
      this.spitVenom(monster);
    }
  }

  private spitVenom(monster: Monster): void {
    const playerPos = this.player.getPixelPosition();
    const dx = playerPos.x - monster.pixelX;
    const dy = playerPos.y - monster.pixelY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const speed = 200;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const venomSprite = this.scene.add.circle(monster.pixelX, monster.pixelY, 5, 0x00ff00);
    venomSprite.setDepth(11);

    this.projectiles.push({
      x: monster.pixelX,
      y: monster.pixelY,
      vx,
      vy,
      life: 300,
      sprite: venomSprite,
    });
  }

  private updateMonsters(delta: number): void {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];

      if (monster.isScared) {
        monster.scaredTimer -= delta;
        if (monster.scaredTimer <= 0) {
          monster.isScared = false;
          this.stopScaredAnimation(monster);
        }
      }

      if (monster.isMoving) {
        const dx = monster.targetX - monster.pixelX;
        const dy = monster.targetY - monster.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          monster.pixelX = monster.targetX;
          monster.pixelY = monster.targetY;
          monster.isMoving = false;
        } else {
          const speed = monster.isScared ? monster.speed * 1.5 : monster.speed;
          const moveDist = (speed * delta) / 1000;
          monster.pixelX += (dx / dist) * moveDist;
          monster.pixelY += (dy / dist) * moveDist;
        }

        monster.sprite.x = monster.pixelX;
        monster.sprite.y = monster.pixelY;
      }

      if (monster.type === MonsterType.BAT) {
        const wingAngle = Math.sin(this.gameTime / 80) * 0.3;
        const leftWing = monster.sprite.list[1] as Phaser.GameObjects.Triangle;
        const rightWing = monster.sprite.list[2] as Phaser.GameObjects.Triangle;
        if (leftWing && rightWing) {
          leftWing.rotation = wingAngle;
          rightWing.rotation = -wingAngle;
        }
      }

      if (monster.health <= 0) {
        monster.sprite.destroy();
        this.monsters.splice(i, 1);
      }
    }
  }

  private updateProjectiles(delta: number): void {
    const playerPos = this.player.getPixelPosition();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      proj.x += proj.vx * (delta / 1000);
      proj.y += proj.vy * (delta / 1000);
      proj.life -= delta;
      proj.sprite.x = proj.x;
      proj.sprite.y = proj.y;

      const distToPlayer = Math.sqrt(
        Math.pow(proj.x - playerPos.x, 2) +
        Math.pow(proj.y - playerPos.y, 2)
      );

      if (distToPlayer < 15) {
        if (this.onPlayerDamageCallback) {
          this.onPlayerDamageCallback(1);
        }
        if (this.onPlayerSlowCallback) {
          this.onPlayerSlowCallback(2000);
        }
        proj.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.life <= 0) {
        proj.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private playScaredAnimation(monster: Monster): void {
    const tween = this.scene.tweens.add({
      targets: monster.sprite,
      scale: { from: 1, to: 0.7 },
      duration: 200,
      yoyo: true,
      repeat: 2,
    });
  }

  private stopScaredAnimation(monster: Monster): void {
    monster.sprite.scale = 1;
  }

  public setOnPlayerDamageCallback(callback: (damage: number, knockbackDir?: { x: number; y: number }) => void): void {
    this.onPlayerDamageCallback = callback;
  }

  public setOnPlayerSlowCallback(callback: (duration: number) => void): void {
    this.onPlayerSlowCallback = callback;
  }

  public getMonsters(): Monster[] {
    return this.monsters;
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public destroy(): void {
    for (const monster of this.monsters) {
      monster.sprite.destroy();
    }
    this.monsters = [];

    for (const proj of this.projectiles) {
      proj.sprite.destroy();
    }
    this.projectiles = [];
  }
}
