import Phaser from 'phaser';

export interface PlayerState {
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  isBouncing: boolean;
}

export class PlayerController {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.Ellipse;
  private wingL!: Phaser.GameObjects.Triangle;
  private wingR!: Phaser.GameObjects.Triangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private speed: number = 280;
  private wingTimer: number = 0;
  private wingFrameDuration: number = 100;
  private wingIsUp: boolean = false;
  private currentTilt: number = 0;
  private targetTilt: number = 0;
  private isBouncing: boolean = false;
  private bounceVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private bounceTime: number = 0;
  private bounceDuration: number = 500;
  private worldBounds: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene, worldBounds: Phaser.Geom.Rectangle) {
    this.scene = scene;
    this.worldBounds = worldBounds;
    this.createPlayer();
    this.setupInput();
  }

  private createPlayer(): void {
    this.container = this.scene.add.container(
      this.worldBounds.centerX,
      this.worldBounds.centerY
    );
    this.container.setDepth(100);

    this.body = this.scene.add.ellipse(0, 0, 28, 18, 0xffd700);
    this.body.setStrokeStyle(2, 0xff8c00);

    const eye = this.scene.add.circle(6, -3, 3, 0x000000);
    const beak = this.scene.add.triangle(18, 0, 10, -2, 22, 0, 10, 2, 0xff4500);

    this.wingL = this.scene.add.triangle(
      -4, -4,
      -6, -4,
      -18, -20,
      -14, 4,
      0xff69b4,
      0.7
    );

    this.wingR = this.scene.add.triangle(
      -4, 4,
      -6, 4,
      -18, 20,
      -14, -4,
      0x87ceeb,
      0.7
    );

    this.container.add([this.body, eye, beak, this.wingL, this.wingR]);
  }

  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.scene.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasdKeys;
  }

  public update(delta: number): void {
    this.updateWings(delta);
    this.updateMovement(delta);
    this.updateTilt(delta);
    this.clampToWorldBounds();
  }

  private updateWings(delta: number): void {
    this.wingTimer += delta;
    if (this.wingTimer >= this.wingFrameDuration) {
      this.wingTimer = 0;
      this.wingIsUp = !this.wingIsUp;
      if (this.wingIsUp) {
        this.wingL.y = -8;
        this.wingL.rotation = -0.3;
        this.wingR.y = 8;
        this.wingR.rotation = 0.3;
      } else {
        this.wingL.y = -2;
        this.wingL.rotation = 0.1;
        this.wingR.y = 2;
        this.wingR.rotation = -0.1;
      }
    }
  }

  private updateMovement(delta: number): void {
    if (this.isBouncing) {
      this.bounceTime += delta;
      const t = 1 - this.bounceTime / this.bounceDuration;
      const bounceFactor = Math.max(t, 0);
      this.container.x += this.bounceVelocity.x * (delta / 1000) * bounceFactor;
      this.container.y += this.bounceVelocity.y * (delta / 1000) * bounceFactor;
      if (this.bounceTime >= this.bounceDuration) {
        this.isBouncing = false;
      }
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.targetTilt = dx * 15 * (Math.PI / 180);
    } else {
      this.targetTilt = 0;
    }

    this.velocity.x = dx * this.speed;
    this.velocity.y = dy * this.speed;
    this.container.x += this.velocity.x * (delta / 1000);
    this.container.y += this.velocity.y * (delta / 1000);
  }

  private updateTilt(delta: number): void {
    const tiltSpeed = 5;
    const diff = this.targetTilt - this.currentTilt;
    this.currentTilt += diff * Math.min(tiltSpeed * (delta / 1000) / 0.2, 1);
    this.container.rotation = this.currentTilt;
  }

  private clampToWorldBounds(): void {
    const margin = 20;
    this.container.x = Phaser.Math.Clamp(
      this.container.x,
      this.worldBounds.x + margin,
      this.worldBounds.right - margin
    );
    this.container.y = Phaser.Math.Clamp(
      this.container.y,
      this.worldBounds.y + margin,
      this.worldBounds.bottom - margin
    );
  }

  public applyBounce(collisionAngle: number, force: number = 400): void {
    this.isBouncing = true;
    this.bounceTime = 0;
    this.bounceVelocity.set(
      Math.cos(collisionAngle) * force,
      Math.sin(collisionAngle) * force
    );
  }

  public getState(): PlayerState {
    return {
      x: this.container.x,
      y: this.container.y,
      rotation: this.container.rotation,
      velocityX: this.velocity.x,
      velocityY: this.velocity.y,
      isBouncing: this.isBouncing
    };
  }

  public getGameObjects(): {
    container: Phaser.GameObjects.Container;
    body: Phaser.GameObjects.Ellipse;
  } {
    return { container: this.container, body: this.body };
  }

  public reset(x?: number, y?: number): void {
    this.container.x = x ?? this.worldBounds.centerX;
    this.container.y = y ?? this.worldBounds.centerY;
    this.velocity.set(0, 0);
    this.isBouncing = false;
    this.currentTilt = 0;
    this.targetTilt = 0;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
