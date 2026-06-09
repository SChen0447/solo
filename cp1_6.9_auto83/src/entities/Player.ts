import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private baseSpeed: number = 200;
  private speedMultiplier: number = 1;
  private tailWaveTime: number = 0;
  private tailWaveAmplitude: number = 0.2;
  private tailWaveFrequency: number = 8;
  private maxRotation: number = Phaser.Math.DegToRad(30);
  private isInvincible: boolean = false;
  private invincibleTimer: number = 0;
  private flashTimer: number = 0;
  private lives: number = 3;
  private fishGraphics!: Phaser.GameObjects.Graphics;
  private tailGraphics!: Phaser.GameObjects.Graphics;
  private glowPipeline: any;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBodySize(50, 30, true);
    this.setOffset(25, 15);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasdKeys = scene.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    }) as any;

    this.createFishGraphics();
    this.initGlowEffect();
  }

  private createFishGraphics(): void {
    this.fishGraphics = this.scene.add.graphics();
    this.tailGraphics = this.scene.add.graphics();
    this.drawFish(0);
  }

  private drawFish(tailOffset: number): void {
    this.fishGraphics.clear();
    this.tailGraphics.clear();

    const x = this.x;
    const y = this.y;

    this.tailGraphics.fillStyle(0x0066aa, 1);
    this.tailGraphics.beginPath();
    this.tailGraphics.moveTo(x - 30, y);
    this.tailGraphics.lineTo(x - 50, y - 15 + tailOffset * 15);
    this.tailGraphics.lineTo(x - 50, y + 15 + tailOffset * 15);
    this.tailGraphics.closePath();
    this.tailGraphics.fillPath();

    this.fishGraphics.fillStyle(0x00aaff, 1);
    this.fishGraphics.fillEllipse(x, y, 60, 30);

    this.fishGraphics.fillStyle(0x0088dd, 1);
    this.fishGraphics.fillTriangle(x + 10, y - 15, x + 25, y - 25, x + 15, y - 5);
    this.fishGraphics.fillTriangle(x + 10, y + 15, x + 25, y + 25, x + 15, y + 5);

    this.fishGraphics.fillStyle(0xffffff, 1);
    this.fishGraphics.fillCircle(x + 18, y - 6, 5);
    this.fishGraphics.fillStyle(0x000000, 1);
    this.fishGraphics.fillCircle(x + 20, y - 6, 3);
  }

  private initGlowEffect(): void {
    if (this.preFX && this.preFX.addGlow) {
      this.preFX.addGlow(0x00aaff, 100, 0, false, 0.1, 1);
    }
    if (this.fishGraphics.preFX && this.fishGraphics.preFX.addGlow) {
      this.fishGraphics.preFX.addGlow(0x00aaff, 100, 0, false, 0.1, 1);
    }
    if (this.tailGraphics.preFX && this.tailGraphics.preFX.addGlow) {
      this.tailGraphics.preFX.addGlow(0x00aaff, 60, 0, false, 0.1, 1);
    }
  }

  update(time: number, delta: number): void {
    let moveX = 0;
    let moveY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      moveX = -1;
    }
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      moveX = 1;
    }
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      moveY = -1;
    }
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      moveY = 1;
    }

    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
    }

    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    this.setVelocity(moveX * currentSpeed, moveY * currentSpeed);

    if (moveX !== 0 || moveY !== 0) {
      const targetRotation = Phaser.Math.Angle.Between(0, 0, moveX, moveY);
      this.rotation = Phaser.Math.Clamp(targetRotation, -this.maxRotation, this.maxRotation);

      this.tailWaveTime += delta / 1000;
      const tailWave = Math.sin(this.tailWaveTime * this.tailWaveFrequency * Math.PI * 2) * this.tailWaveAmplitude;
      this.drawFish(tailWave);
    } else {
      this.rotation = Phaser.Math.Linear(this.rotation, 0, 0.1);
      this.tailWaveTime += delta / 1000 * 0.3;
      const tailWave = Math.sin(this.tailWaveTime * this.tailWaveFrequency * Math.PI * 2) * this.tailWaveAmplitude * 0.3;
      this.drawFish(tailWave);
    }

    this.fishGraphics.setPosition(this.x - this.x, this.y - this.y);
    this.tailGraphics.setPosition(this.x - this.x, this.y - this.y);
    this.fishGraphics.setRotation(this.rotation);
    this.tailGraphics.setRotation(this.rotation);
    this.fishGraphics.setX(this.x);
    this.fishGraphics.setY(this.y);
    this.tailGraphics.setX(this.x);
    this.tailGraphics.setY(this.y);

    if (this.isInvincible) {
      this.invincibleTimer -= delta;
      this.flashTimer += delta;

      if (this.flashTimer >= 100) {
        this.flashTimer = 0;
        const visible = this.fishGraphics.visible;
        this.fishGraphics.setVisible(!visible);
        this.tailGraphics.setVisible(!visible);
        this.setVisible(!visible);
      }

      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.fishGraphics.setVisible(true);
        this.tailGraphics.setVisible(true);
        this.setVisible(true);
      }
    }
  }

  takeDamage(): boolean {
    if (this.isInvincible) return false;

    this.lives--;
    this.isInvincible = true;
    this.invincibleTimer = 1000;
    this.flashTimer = 0;

    return true;
  }

  getLives(): number {
    return this.lives;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  destroy(fromScene?: boolean): void {
    if (this.fishGraphics) this.fishGraphics.destroy();
    if (this.tailGraphics) this.tailGraphics.destroy();
    super.destroy(fromScene);
  }
}
