import Phaser from 'phaser';
import { GameConfig, ComboState, ColorGroup, DEFAULT_CONFIG } from '../types';
import { Player } from '../entities/Player';
import { PlatformManager } from '../managers/PlatformManager';
import { CollectibleManager, CollectEvent } from '../managers/CollectibleManager';
import { DroneManager } from '../managers/DroneManager';
import { BackgroundManager } from '../managers/BackgroundManager';
import { ParticleManager } from '../managers/ParticleManager';
import { UIManager } from '../managers/UIManager';

export class GameScene extends Phaser.Scene {
  private gameConfig!: GameConfig;
  private player!: Player;
  private platformManager!: PlatformManager;
  private collectibleManager!: CollectibleManager;
  private droneManager!: DroneManager;
  private backgroundManager!: BackgroundManager;
  private particleManager!: ParticleManager;
  private uiManager!: UIManager;

  private score: number = 0;
  private speedMultiplier: number = 1;
  private comboState: ComboState = { currentGroup: null, count: 0 };
  private highSpeedMode: boolean = false;
  private gameRunning: boolean = true;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;

  private touchJumpZone!: Phaser.GameObjects.Zone;
  private touchSlideZone!: Phaser.GameObjects.Zone;
  private activePointers: Map<number, string> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(): void {
    this.gameConfig = this.game.registry.get('gameConfig') || DEFAULT_CONFIG;
  }

  create(): void {
    this.score = 0;
    this.speedMultiplier = 1;
    this.comboState = { currentGroup: null, count: 0 };
    this.highSpeedMode = false;
    this.gameRunning = true;

    this.backgroundManager = new BackgroundManager(this);
    this.platformManager = new PlatformManager(this, 1);
    this.platformManager.init(0);
    this.platformManager.setScrollSpeed(this.gameConfig.baseSpeed);

    this.collectibleManager = new CollectibleManager(this, this.platformManager);
    this.collectibleManager.init();
    this.collectibleManager.setScrollSpeed(this.gameConfig.baseSpeed);
    this.collectibleManager.setOnCollect(this.onCollectibleCollected.bind(this));

    this.droneManager = new DroneManager(this);
    this.droneManager.init();
    this.droneManager.setScrollSpeed(this.gameConfig.baseSpeed);
    this.droneManager.setOnPlayerHit(this.onPlayerHit.bind(this));

    this.particleManager = new ParticleManager(this);
    this.uiManager = new UIManager(this);

    this.player = new Player(this, this.gameConfig);
    this.player.setPosition(200, 452);

    this.setupInput();
  }

  private setupInput(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.spaceKey.on('down', () => {
      if (!this.gameRunning) return;
      this.player.startJumpCharge();
    });

    this.spaceKey.on('up', () => {
      if (!this.gameRunning) return;
      this.player.releaseJump();
    });

    this.sKey.on('down', () => {
      if (!this.gameRunning) return;
      this.player.slide();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameRunning) return;

      if (pointer.button === 0) {
        const worldPoint = pointer;
        this.handleGrapple(worldPoint.x, worldPoint.y, pointer.id);
      }
    });

    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.touchJumpZone = this.add.zone(0, 0, w / 2, h).setOrigin(0, 0);
    this.touchJumpZone.setDepth(50);

    this.touchSlideZone = this.add.zone(w / 2, 0, w / 2, h).setOrigin(0, 0);
    this.touchSlideZone.setDepth(50);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameRunning) return;

      const activeCount = this.input.manager.pointers.filter(
        (p: Phaser.Input.Pointer) => p.active
      ).length;
      if (activeCount >= 2) {
        this.handleGrapple(pointer.x, pointer.y, pointer.id);
        return;
      }

      if (pointer.x < this.scale.width / 2) {
        this.activePointers.set(pointer.id, 'jump');
        this.player.startJumpCharge();
      } else {
        this.activePointers.set(pointer.id, 'slide');
        this.player.slide();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameRunning) return;

      const action = this.activePointers.get(pointer.id);
      if (action === 'jump') {
        this.player.releaseJump();
      }
      this.activePointers.delete(pointer.id);
    });
  }

  private handleGrapple(targetX: number, targetY: number, pointerId: number): void {
    if (this.player.grapple.active) return;

    const dx = targetX - this.player.centerX;
    const dy = targetY - this.player.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.gameConfig.grappleMaxDistance) return;

    const nearest = this.platformManager.findNearestPlatformEdge(
      targetX,
      targetY,
      80
    );

    if (nearest) {
      this.player.launchGrapple(nearest.x, nearest.y);

      this.time.delayedCall(150, () => {
        if (this.player.grapple.active) {
          this.player.startGrapplePull();
          this.particleManager.spawnGrappleBurst(nearest.x, nearest.y);
        }
      });
    } else {
      this.player.launchGrapple(targetX, targetY);

      this.time.delayedCall(300, () => {
        if (this.player.grapple.active && !this.player.grapple.pulling) {
          this.player.releaseGrapple();
        }
      });
    }
  }

  private onCollectibleCollected(event: CollectEvent): void {
    if (!this.gameRunning) return;

    this.player.playPulseAura(event.color);
    this.addScore(10, event.group);
  }

  private addScore(base: number, group: ColorGroup): void {
    let total = base;

    if (this.comboState.currentGroup === group) {
      this.comboState.count++;
    } else {
      this.comboState.currentGroup = group;
      this.comboState.count = 1;
    }

    if (this.comboState.count >= 3) {
      const bonus = group === 'warm' ? 20 : 15;
      total += bonus;
      this.comboState.count = 0;
      this.particleManager.spawnComboGlow(group, this.scale.width, this.scale.height);
    }

    this.score += total;
    this.uiManager.setScore(this.score);

    const newMultiplier = 1 + Math.floor(this.score / 50) * 0.05;
    if (newMultiplier !== this.speedMultiplier) {
      this.speedMultiplier = newMultiplier;
      this.uiManager.setSpeedMultiplier(this.speedMultiplier);
    }

    if (!this.highSpeedMode && this.score >= this.gameConfig.highSpeedThreshold) {
      this.enterHighSpeedMode();
    }
  }

  private enterHighSpeedMode(): void {
    this.highSpeedMode = true;
    this.backgroundManager.setHighSpeedMode(true);
    this.platformManager.setDifficulty(2);
    this.droneManager.setSpawnInterval(8000);
  }

  private onPlayerHit(): void {
    if (!this.gameRunning) return;
    this.gameRunning = false;
    this.uiManager.showGameOver(() => {
      this.resetGame();
    });
  }

  private resetGame(): void {
    this.player.destroy();
    this.platformManager.destroy();
    this.collectibleManager.destroy();
    this.droneManager.destroy();
    this.backgroundManager.destroy();
    this.particleManager.destroy();
    this.uiManager.destroy();

    this.activePointers.clear();

    this.create();
  }

  update(_time: number, delta: number): void {
    if (!this.gameRunning) return;

    const clampedDelta = Math.min(delta, 33.33);

    this.backgroundManager.update(clampedDelta, this.speedMultiplier);

    this.platformManager.update(clampedDelta, this.speedMultiplier);

    this.collectibleManager.update(
      clampedDelta,
      this.player.centerX,
      this.player.centerY,
      this.speedMultiplier
    );

    this.droneManager.update(
      clampedDelta,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.speedMultiplier
    );

    this.particleManager.update(clampedDelta);

    if (this.player.state.isGrappling) {
      this.player.updateGrapplePull(clampedDelta);
    } else {
      this.player.update(clampedDelta, this.speedMultiplier);
      this.player.applyGravity(clampedDelta);
      this.player.applyVelocity(clampedDelta);

      const collision = this.platformManager.checkPlatformCollision(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      );

      if (collision.onGround && this.player.state.velocityY >= 0) {
        this.player.land(collision.groundY);
      }
    }

    if (this.player.grapple.active && !this.player.state.isGrappling) {
      this.player.updateGrappleLine();
    }

    if (this.player.y > this.scale.height + 100) {
      this.onPlayerHit();
    }

    if (this.player.x < 50) {
      this.player.setPosition(50, this.player.y);
    }
  }

  destroy(): void {
    if (this.player) this.player.destroy();
    if (this.platformManager) this.platformManager.destroy();
    if (this.collectibleManager) this.collectibleManager.destroy();
    if (this.droneManager) this.droneManager.destroy();
    if (this.backgroundManager) this.backgroundManager.destroy();
    if (this.particleManager) this.particleManager.destroy();
    if (this.uiManager) this.uiManager.destroy();
  }
}
