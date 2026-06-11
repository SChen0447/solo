import Phaser from 'phaser';
import { CaveWorld, TILE_SIZE, TileType } from './CaveWorld';

export interface PlayerState {
  health: number;
  maxHealth: number;
  gold: number;
  iron: number;
  coal: number;
  x: number;
  y: number;
  isSlowed: boolean;
  slowTimeLeft: number;
}

export class Player {
  private scene: Phaser.Scene;
  private caveWorld: CaveWorld;
  private gridX: number;
  private gridY: number;
  private targetX: number;
  private targetY: number;
  private pixelX: number;
  private pixelY: number;
  private lightX: number;
  private lightY: number;
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  private health: number = 3;
  private maxHealth: number = 3;
  private gold: number = 0;
  private iron: number = 0;
  private coal: number = 0;
  private isMoving: boolean = false;
  private moveSpeed: number = 180;
  private baseMoveSpeed: number = 180;
  private isDigging: boolean = false;
  private digTimer: number = 0;
  private digDuration: number = 300;
  private digTargetX: number = 0;
  private digTargetY: number = 0;

  private lightRadius: number = 150;
  private lightAngle: number = Math.PI / 3;
  private lightDirection: number = Math.PI / 2;

  private sprite!: Phaser.GameObjects.Container;
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private redFlash!: Phaser.GameObjects.Graphics;
  private isFlashing: boolean = false;
  private flashTimer: number = 0;

  private isSlowed: boolean = false;
  private slowTimeLeft: number = 0;

  private keysW: Phaser.Input.Keyboard.Key;
  private keysA: Phaser.Input.Keyboard.Key;
  private keysS: Phaser.Input.Keyboard.Key;
  private keysD: Phaser.Input.Keyboard.Key;
  private keysE: Phaser.Input.Keyboard.Key;
  private keysSPACE: Phaser.Input.Keyboard.Key;

  private moveCooldown: number = 0;
  private moveCooldownDuration: number = 150;

  private cameraShake: number = 0;

  private onDigCallback: ((value: number, type: TileType) => void) | null = null;
  private onDamageCallback: (() => void) | null = null;
  private onPlaceLadderCallback: (() => void) | null = null;

  private debrisSprites: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, caveWorld: CaveWorld, startX: number, startY: number) {
    this.scene = scene;
    this.caveWorld = caveWorld;
    this.gridX = startX;
    this.gridY = startY;
    this.pixelX = startX * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = startY * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.pixelX;
    this.targetY = this.pixelY;
    this.lightX = this.pixelX;
    this.lightY = this.pixelY;

    this.keysW = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keysA = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keysS = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keysD = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keysE = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keysSPACE = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.sprite = scene.add.container(this.pixelX, this.pixelY);
    this.sprite.setDepth(10);

    const body = scene.add.circle(0, 0, 12, 0x6b4423);
    body.setStrokeStyle(2, 0x3d2b1f);
    this.sprite.add(body);

    const helmet = scene.add.circle(0, -4, 10, 0x8b7355);
    helmet.setStrokeStyle(2, 0x5c4033);
    this.sprite.add(helmet);

    const headlight = scene.add.circle(0, -8, 4, 0xffff00);
    this.sprite.add(headlight);

    this.lightGraphics = scene.add.graphics();
    this.lightGraphics.setDepth(5);

    this.redFlash = scene.add.graphics();
    this.redFlash.setDepth(100);
    this.redFlash.setScrollFactor(0);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handleClick(pointer);
      }
    });
  }

  public update(time: number, delta: number): void {
    if (this.moveCooldown > 0) {
      this.moveCooldown -= delta;
    }

    if (!this.isMoving && !this.isDigging && this.moveCooldown <= 0) {
      this.handleMovement();
    }

    if (this.isMoving) {
      this.updateMovement(delta);
    }

    if (this.isDigging) {
      this.digTimer -= delta;
      if (this.digTimer <= 0) {
        this.finishDig();
      }
    }

    if (this.isFlashing) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
        this.redFlash.clear();
      } else {
        const alpha = (this.flashTimer / 200) * 0.4;
        this.redFlash.clear();
        this.redFlash.fillStyle(0xff0000, alpha);
        this.redFlash.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
      }
    }

    if (this.isSlowed) {
      this.slowTimeLeft -= delta;
      if (this.slowTimeLeft <= 0) {
        this.isSlowed = false;
        this.moveSpeed = this.baseMoveSpeed;
      }
    }

    if (this.cameraShake > 0) {
      this.cameraShake -= delta;
      const shakeAmount = this.cameraShake > 0 ? 2 : 0;
      const shakeX = (Math.random() - 0.5) * shakeAmount;
      const shakeY = (Math.random() - 0.5) * shakeAmount;
      this.sprite.x = this.pixelX + shakeX;
      this.sprite.y = this.pixelY + shakeY;
    } else {
      this.sprite.x = this.pixelX;
      this.sprite.y = this.pixelY;
    }

    const lerpFactor = 0.1;
    this.lightX += (this.pixelX - this.lightX) * lerpFactor;
    this.lightY += (this.pixelY - this.lightY) * lerpFactor;

    this.updateLight();
    this.updateDebris(delta);
  }

  private handleMovement(): void {
    let dx = 0,
      dy = 0;

    if (this.keysW.isDown) {
      dy = -1;
      this.facing = 'up';
      this.lightDirection = -Math.PI / 2;
    } else if (this.keysS.isDown) {
      dy = 1;
      this.facing = 'down';
      this.lightDirection = Math.PI / 2;
    } else if (this.keysA.isDown) {
      dx = -1;
      this.facing = 'left';
      this.lightDirection = Math.PI;
    } else if (this.keysD.isDown) {
      dx = 1;
      this.facing = 'right';
      this.lightDirection = 0;
    }

    if (dx !== 0 || dy !== 0) {
      const newX = this.gridX + dx;
      const newY = this.gridY + dy;

      if (this.caveWorld.isWalkable(newX, newY)) {
        this.startMove(newX, newY);
      }
    }
  }

  private startMove(newX: number, newY: number): void {
    this.isMoving = true;
    this.gridX = newX;
    this.gridY = newY;
    this.targetX = newX * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = newY * TILE_SIZE + TILE_SIZE / 2;
  }

  private updateMovement(delta: number): void {
    const dx = this.targetX - this.pixelX;
    const dy = this.targetY - this.pixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.pixelX = this.targetX;
      this.pixelY = this.targetY;
      this.isMoving = false;
      this.moveCooldown = this.moveCooldownDuration;
    } else {
      const speed = (this.moveSpeed * delta) / 1000;
      this.pixelX += (dx / dist) * speed;
      this.pixelY += (dy / dist) * speed;
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.isDigging || this.isMoving) return;

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    const dx = tileX - this.gridX;
    const dy = tileY - this.gridY;

    if (Math.abs(dx) + Math.abs(dy) !== 1) return;

    if (dx === 1) {
      this.facing = 'right';
      this.lightDirection = 0;
    } else if (dx === -1) {
      this.facing = 'left';
      this.lightDirection = Math.PI;
    } else if (dy === 1) {
      this.facing = 'down';
      this.lightDirection = Math.PI / 2;
    } else if (dy === -1) {
      this.facing = 'up';
      this.lightDirection = -Math.PI / 2;
    }

    if (this.caveWorld.isDigable(tileX, tileY)) {
      this.startDig(tileX, tileY);
    }
  }

  private startDig(tileX: number, tileY: number): void {
    this.isDigging = true;
    this.digTimer = this.digDuration;
    this.digTargetX = tileX;
    this.digTargetY = tileY;
    this.cameraShake = 100;

    this.spawnDebris(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2);
  }

  private spawnDebris(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 100;
      const size = 2 + Math.random() * 4;

      const debris = this.scene.add.rectangle(x, y, size, size, 0x8b7355);
      debris.setDepth(8);
      debris.setData('vx', Math.cos(angle) * speed);
      debris.setData('vy', Math.sin(angle) * speed);
      debris.setData('life', 400);

      this.debrisSprites.push(debris);
    }
  }

  private updateDebris(delta: number): void {
    for (let i = this.debrisSprites.length - 1; i >= 0; i--) {
      const debris = this.debrisSprites[i];
      const vx = debris.getData('vx') as number;
      const vy = debris.getData('vy') as number;
      let life = debris.getData('life') as number;

      life -= delta;
      debris.setData('life', life);

      debris.x += vx * (delta / 1000);
      debris.y += vy * (delta / 1000) + 0.5 * 300 * (delta / 1000) * (delta / 1000);
      debris.setData('vy', vy + 300 * (delta / 1000));

      debris.setAlpha(Math.max(0, life / 400));

      if (life <= 0) {
        debris.destroy();
        this.debrisSprites.splice(i, 1);
      }
    }
  }

  private finishDig(): void {
    this.isDigging = false;

    const result = this.caveWorld.digTile(this.digTargetX, this.digTargetY);
    if (result && this.onDigCallback) {
      this.onDigCallback(result.value, result.type);
    }
  }

  private updateLight(): void {
    this.lightGraphics.clear();

    const startAngle = this.lightDirection - this.lightAngle / 2;
    const endAngle = this.lightDirection + this.lightAngle / 2;

    const steps = 30;

    this.lightGraphics.fillStyle(0xffe680, 0.3);
    this.lightGraphics.beginPath();
    this.lightGraphics.moveTo(this.lightX, this.lightY);

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const radius = this.lightRadius;
      const x = this.lightX + Math.cos(angle) * radius;
      const y = this.lightY + Math.sin(angle) * radius;
      this.lightGraphics.lineTo(x, y);
    }

    this.lightGraphics.closePath();
    this.lightGraphics.fillPath();
  }

  public addOre(value: number, type: TileType): void {
    switch (type) {
      case TileType.GOLD_ORE:
        this.gold += value;
        break;
      case TileType.IRON_ORE:
        this.iron += value;
        break;
      case TileType.COAL_ORE:
        this.coal += value;
        break;
    }
  }

  public takeDamage(amount: number = 1): void {
    this.health = Math.max(0, this.health - amount);
    this.isFlashing = true;
    this.flashTimer = 200;

    if (this.onDamageCallback) {
      this.onDamageCallback();
    }
  }

  public applySlow(duration: number = 2000): void {
    this.isSlowed = true;
    this.slowTimeLeft = duration;
    this.moveSpeed = this.baseMoveSpeed * 0.5;
  }

  public knockback(direction: { x: number; y: number }, distance: number = 2): void {
    let newX = this.gridX;
    let newY = this.gridY;

    for (let i = 0; i < distance; i++) {
      const testX = newX + direction.x;
      const testY = newY + direction.y;
      if (this.caveWorld.isWalkable(testX, testY)) {
        newX = testX;
        newY = testY;
      } else {
        break;
      }
    }

    this.gridX = newX;
    this.gridY = newY;
    this.pixelX = newX * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = newY * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.pixelX;
    this.targetY = this.pixelY;
  }

  public getGridPosition(): { x: number; y: number } {
    return { x: this.gridX, y: this.gridY };
  }

  public getPixelPosition(): { x: number; y: number } {
    return { x: this.pixelX, y: this.pixelY };
  }

  public getLightCenter(): { x: number; y: number } {
    return { x: this.lightX, y: this.lightY };
  }

  public getLightDirection(): number {
    return this.lightDirection;
  }

  public getLightRadius(): number {
    return this.lightRadius;
  }

  public getLightAngle(): number {
    return this.lightAngle;
  }

  public isPointInLight(px: number, py: number): boolean {
    const dx = px - this.lightX;
    const dy = py - this.lightY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.lightRadius) return false;

    const angle = Math.atan2(dy, dx);
    let angleDiff = angle - this.lightDirection;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    return Math.abs(angleDiff) <= this.lightAngle / 2;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getGold(): number {
    return this.gold;
  }

  public getIron(): number {
    return this.iron;
  }

  public getCoal(): number {
    return this.coal;
  }

  public getTotalOres(): number {
    return this.gold + this.iron + this.coal;
  }

  public getState(): PlayerState {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      gold: this.gold,
      iron: this.iron,
      coal: this.coal,
      x: this.gridX,
      y: this.gridY,
      isSlowed: this.isSlowed,
      slowTimeLeft: this.slowTimeLeft,
    };
  }

  public setOnDigCallback(callback: (value: number, type: TileType) => void): void {
    this.onDigCallback = callback;
  }

  public setOnDamageCallback(callback: () => void): void {
    this.onDamageCallback = callback;
  }

  public setOnPlaceLadderCallback(callback: () => void): void {
    this.onPlaceLadderCallback = callback;
  }

  public isEKeyJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keysE);
  }

  public isSpaceKeyJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keysSPACE);
  }

  public getFacing(): 'up' | 'down' | 'left' | 'right' {
    return this.facing;
  }

  public getLightGraphics(): Phaser.GameObjects.Graphics {
    return this.lightGraphics;
  }

  public getSprite(): Phaser.GameObjects.Container {
    return this.sprite;
  }
}
