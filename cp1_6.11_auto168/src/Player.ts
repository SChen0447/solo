export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  hp: number;
  maxHp: number;
  keys: number;
  isMoving: boolean;
  isHurt: boolean;
}

export class Player {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  state: PlayerState;
  tileSize: number;
  moveTween: Phaser.Tweens.Tween | null = null;
  wallStunned: boolean = false;
  invincible: boolean = false;

  private isWallCheckFn: (x: number, y: number) => boolean;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    tileSize: number,
    isWallCheck: (x: number, y: number) => boolean
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.isWallCheckFn = isWallCheck;

    this.state = {
      gridX: startX,
      gridY: startY,
      pixelX: startX * tileSize + tileSize / 2,
      pixelY: startY * tileSize + tileSize / 2,
      hp: 3,
      maxHp: 3,
      keys: 0,
      isMoving: false,
      isHurt: false
    };

    this.container = scene.add.container(this.state.pixelX, this.state.pixelY);
    this.createSprite();
  }

  private createSprite(): void {
    const size = this.tileSize * 0.7;
    const half = size / 2;

    const body = this.scene.add.rectangle(0, 0, size, size, 0x0066ff);
    body.setStrokeStyle(2, 0x0044aa);

    const eyeOffsetX = size * 0.2;
    const eyeY = -size * 0.1;
    const eyeSize = size * 0.15;

    const leftEye = this.scene.add.rectangle(-eyeOffsetX, eyeY, eyeSize, eyeSize, 0xffffff);
    const rightEye = this.scene.add.rectangle(eyeOffsetX, eyeY, eyeSize, eyeSize, 0xffffff);

    const pupilLeft = this.scene.add.rectangle(-eyeOffsetX, eyeY, eyeSize * 0.6, eyeSize * 0.6, 0x000000);
    const pupilRight = this.scene.add.rectangle(eyeOffsetX, eyeY, eyeSize * 0.6, eyeSize * 0.6, 0x000000);

    this.container.add([body, leftEye, rightEye, pupilLeft, pupilRight]);
    this.container.setSize(size, size);
  }

  tryMove(direction: Direction): boolean {
    if (this.state.isMoving || this.wallStunned) return false;

    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    const newX = this.state.gridX + dx;
    const newY = this.state.gridY + dy;

    if (this.isWallCheckFn(newX, newY)) {
      this.playWallHitAnim();
      return false;
    }

    this.state.isMoving = true;
    this.state.gridX = newX;
    this.state.gridY = newY;

    const targetX = newX * this.tileSize + this.tileSize / 2;
    const targetY = newY * this.tileSize + this.tileSize / 2;

    const duration = 250;

    this.moveTween = this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        this.state.pixelX = this.container.x;
        this.state.pixelY = this.container.y;
      },
      onComplete: () => {
        this.state.isMoving = false;
        this.state.pixelX = targetX;
        this.state.pixelY = targetY;
        this.moveTween = null;
      }
    });

    return true;
  }

  playWallHitAnim(): void {
    if (this.wallStunned) return;
    this.wallStunned = true;

    const startX = this.container.x;
    const startY = this.container.y;

    this.scene.tweens.add({
      targets: this.container,
      x: startX + Phaser.Math.Between(-3, 3),
      y: startY + Phaser.Math.Between(-3, 3),
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.container.setPosition(startX, startY);
        this.scene.time.delayedCall(50, () => {
          this.wallStunned = false;
        });
      }
    });
  }

  takeDamage(): boolean {
    if (this.invincible) return false;

    this.state.hp = Math.max(0, this.state.hp - 1);
    this.state.isHurt = true;
    this.invincible = true;

    this.playHurtAnim();

    this.scene.time.delayedCall(1000, () => {
      this.invincible = false;
      this.state.isHurt = false;
      this.container.setAlpha(1);
    });

    return this.state.hp <= 0;
  }

  private playHurtAnim(): void {
    const flashTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 5
    });

    const startX = this.container.x;
    const startY = this.container.y;

    this.scene.tweens.add({
      targets: this.container,
      x: startX + Phaser.Math.Between(-3, 3),
      y: startY + Phaser.Math.Between(-3, 3),
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.container.setPosition(startX, startY);
      }
    });
  }

  collectKey(): void {
    this.state.keys++;
  }

  setPosition(gridX: number, gridY: number): void {
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }

    this.state.gridX = gridX;
    this.state.gridY = gridY;
    this.state.pixelX = gridX * this.tileSize + this.tileSize / 2;
    this.state.pixelY = gridY * this.tileSize + this.tileSize / 2;
    this.container.setPosition(this.state.pixelX, this.state.pixelY);
    this.state.isMoving = false;
  }

  reset(gridX: number, gridY: number): void {
    this.setPosition(gridX, gridY);
    this.state.hp = this.state.maxHp;
    this.state.keys = 0;
    this.state.isMoving = false;
    this.state.isHurt = false;
    this.wallStunned = false;
    this.invincible = false;
    this.container.setAlpha(1);
  }

  destroy(): void {
    if (this.moveTween) {
      this.moveTween.stop();
    }
    this.container.destroy();
  }
}
