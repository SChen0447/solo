import Phaser from 'phaser';
import { GameConfig, GrappleState, PlayerState, COLOR_HEX, CollectibleColor } from '../types';

const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 48;
const PLAYER_SLIDE_HEIGHT = 24;

export class Player {
  private scene: Phaser.Scene;
  private config: GameConfig;
  public sprite: Phaser.Physics.Arcade.Sprite;
  public graphics: Phaser.GameObjects.Graphics;
  public container: Phaser.GameObjects.Container;
  public auraGraphics: Phaser.GameObjects.Graphics;
  public state: PlayerState;
  public grapple: GrappleState;
  public animFrame: number = 0;
  public animTimer: number = 0;
  public facing: number = 1;

  constructor(scene: Phaser.Scene, config: GameConfig) {
    this.scene = scene;
    this.config = config;

    this.state = {
      isJumping: false,
      isSliding: false,
      isGrappling: false,
      jumpChargeTime: 0,
      jumpCharging: false,
      slideTimer: 0,
      velocityX: config.baseSpeed,
      velocityY: 0,
      originalHeight: PLAYER_HEIGHT
    };

    this.grapple = {
      active: false,
      targetX: 0,
      targetY: 0,
      pulling: false
    };

    this.container = scene.add.container(200, 400);
    this.graphics = scene.add.graphics();
    this.auraGraphics = scene.add.graphics();
    this.container.add([this.graphics, this.auraGraphics]);

    this.sprite = scene.physics.add.sprite(200, 400, '');
    this.sprite.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.sprite.setOffset(0, 0);
    this.sprite.setVisible(false);
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).allowGravity = true;
    }

    this.container.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.drawPlayer();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  get width(): number {
    return this.state.isSliding ? PLAYER_WIDTH : PLAYER_WIDTH;
  }

  get height(): number {
    return this.state.isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
  }

  get centerX(): number {
    return this.x + PLAYER_WIDTH / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.sprite.setPosition(x + PLAYER_WIDTH / 2, y + this.height / 2);
    if (this.sprite.body) {
      this.sprite.body.position.x = x;
      this.sprite.body.position.y = y;
    }
  }

  update(delta: number, speedMultiplier: number): void {
    this.animTimer += delta;
    if (this.animTimer >= 60) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    let currentSpeed = this.config.baseSpeed * speedMultiplier;
    if (this.state.isSliding) {
      currentSpeed *= this.config.slideSpeedMultiplier;
    }
    this.state.velocityX = currentSpeed;

    if (this.state.jumpCharging && !this.state.isJumping) {
      this.state.jumpChargeTime = Math.min(
        this.state.jumpChargeTime + delta / 1000,
        this.config.maxJumpChargeTime
      );
    }

    if (this.state.isSliding) {
      this.state.slideTimer -= delta / 1000;
      if (this.state.slideTimer <= 0) {
        this.state.isSliding = false;
        this.sprite.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
      }
    }

    this.drawPlayer();
  }

  applyGravity(delta: number): void {
    if (!this.state.isGrappling) {
      this.state.velocityY += (this.config.gravity * delta) / 1000;
    }
  }

  jump(): void {
    if (!this.state.isJumping && !this.state.isGrappling) {
      const chargeRatio = this.state.jumpChargeTime / this.config.maxJumpChargeTime;
      const multiplier = 1 + chargeRatio * (this.config.jumpChargeMultiplier - 1);
      this.state.velocityY = -this.config.jumpForce * multiplier;
      this.state.isJumping = true;
      this.state.jumpCharging = false;
      this.state.jumpChargeTime = 0;
    }
  }

  startJumpCharge(): void {
    if (!this.state.isJumping && !this.state.isGrappling) {
      this.state.jumpCharging = true;
      this.state.jumpChargeTime = 0;
    }
  }

  releaseJump(): void {
    if (this.state.jumpCharging) {
      this.jump();
    }
  }

  slide(): void {
    if (!this.state.isSliding && !this.state.isJumping) {
      this.state.isSliding = true;
      this.state.slideTimer = this.config.slideDuration;
      this.sprite.setSize(PLAYER_WIDTH, PLAYER_SLIDE_HEIGHT);
    }
  }

  launchGrapple(targetX: number, targetY: number): void {
    if (this.grapple.active) return;

    this.grapple.active = true;
    this.grapple.targetX = targetX;
    this.grapple.targetY = targetY;
    this.grapple.pulling = false;
    this.state.isGrappling = false;

    this.grapple.lineGraphics = this.scene.add.graphics();
    this.grapple.endPoint = this.scene.add.circle(targetX, targetY, 6, 0xffff00, 1);

    this.scene.tweens.add({
      targets: this.grapple.endPoint,
      scale: { from: 0.5, to: 1.5 },
      duration: 200,
      yoyo: true,
      repeat: -1
    });
  }

  startGrapplePull(): void {
    this.grapple.pulling = true;
    this.state.isGrappling = true;
    this.state.velocityY = 0;
  }

  updateGrapplePull(delta: number): boolean {
    if (!this.grapple.pulling) return false;

    const dx = this.grapple.targetX - this.centerX;
    const dy = this.grapple.targetY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.releaseGrapple();
      return true;
    }

    const speed = (this.config.grapplePullSpeed * delta) / 1000;
    const ratio = Math.min(speed / dist, 1);
    const newX = this.x + dx * ratio;
    const newY = this.y + dy * ratio;

    this.setPosition(newX, newY);

    this.updateGrappleLine();

    return true;
  }

  updateGrappleLine(): void {
    if (!this.grapple.active || !this.grapple.lineGraphics) return;

    this.grapple.lineGraphics.clear();
    this.grapple.lineGraphics.lineStyle(2, 0x00e5ff, 1);
    this.grapple.lineGraphics.beginPath();
    this.grapple.lineGraphics.moveTo(this.centerX, this.centerY);
    this.grapple.lineGraphics.lineTo(this.grapple.targetX, this.grapple.targetY);
    this.grapple.lineGraphics.strokePath();

    if (this.grapple.endPoint) {
      this.grapple.endPoint.setPosition(this.grapple.targetX, this.grapple.targetY);
    }
  }

  releaseGrapple(): void {
    if (this.grapple.lineGraphics) {
      this.grapple.lineGraphics.destroy();
      this.grapple.lineGraphics = undefined;
    }
    if (this.grapple.endPoint) {
      this.grapple.endPoint.destroy();
      this.grapple.endPoint = undefined;
    }
    this.grapple.active = false;
    this.grapple.pulling = false;
    this.state.isGrappling = false;
  }

  setVelocityY(vy: number): void {
    this.state.velocityY = vy;
  }

  applyVelocity(delta: number): void {
    if (!this.state.isGrappling) {
      const newY = this.y + (this.state.velocityY * delta) / 1000;
      this.setPosition(this.x, newY);
    }
  }

  playPulseAura(color: CollectibleColor): void {
    const hexColor = Phaser.Display.Color.HexStringToColor(COLOR_HEX[color]).color;
    let progress = 0;
    const duration = 300;
    const startTime = this.scene.time.now;

    const updateAura = () => {
      progress = (this.scene.time.now - startTime) / duration;
      if (progress >= 1) {
        this.auraGraphics.clear();
        return;
      }

      this.auraGraphics.clear();
      const radius = 40 + progress * 20;
      const alpha = 1 - progress;

      this.auraGraphics.lineStyle(3, hexColor, alpha);
      this.auraGraphics.strokeCircle(PLAYER_WIDTH / 2, this.height / 2, radius);

      this.scene.time.delayedCall(16, updateAura);
    };

    updateAura();
  }

  private drawPlayer(): void {
    this.graphics.clear();

    const h = this.height;
    const w = PLAYER_WIDTH;

    this.graphics.fillStyle(0x00d4ff, 1);
    this.graphics.fillRect(4, h * 0.15, w - 8, h * 0.5);

    this.graphics.fillStyle(0xff6b9d, 1);
    this.graphics.fillRect(6, 0, w - 12, h * 0.2);

    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRect(w * 0.55, h * 0.05, 4, 4);

    this.graphics.fillStyle(0x1a1a2e, 1);
    if (this.state.isJumping) {
      this.graphics.fillRect(6, h * 0.65, 6, h * 0.35);
      this.graphics.fillRect(w - 12, h * 0.6, 6, h * 0.3);
    } else if (this.state.isSliding) {
      this.graphics.fillRect(4, h - 6, w - 8, 6);
    } else {
      const legOffset = Math.sin(this.animFrame * Math.PI / 2) * 4;
      this.graphics.fillRect(6, h * 0.65, 6, h * 0.3 - legOffset);
      this.graphics.fillRect(w - 12, h * 0.65, 6, h * 0.3 + legOffset);
    }

    this.graphics.lineStyle(1, 0x39ff14, 0.8);
    this.graphics.strokeRect(0, 0, w, h);
  }

  land(groundY: number): void {
    this.setPosition(this.x, groundY - this.height);
    this.state.velocityY = 0;
    this.state.isJumping = false;
  }

  destroy(): void {
    this.releaseGrapple();
    this.graphics.destroy();
    this.auraGraphics.destroy();
    this.container.destroy();
    this.sprite.destroy();
  }
}
