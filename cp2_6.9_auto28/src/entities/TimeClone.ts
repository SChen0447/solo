import type { FrameSnapshot } from './Player';

export class TimeClone {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public body!: Phaser.Physics.Arcade.Body;
  private scene: Phaser.Scene;
  private snapshots: FrameSnapshot[] = [];
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private rippleParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private onComplete?: () => void;

  constructor(scene: Phaser.Scene, snapshots: FrameSnapshot[]) {
    this.scene = scene;
    this.snapshots = [...snapshots];

    const startSnapshot = this.snapshots[0];
    this.sprite = scene.physics.add.sprite(startSnapshot.x, startSnapshot.y, '');
    this.sprite.setSize(32, 32);
    this.sprite.setDisplaySize(32, 32);
    this.sprite.setImmovable(true);
    this.sprite.setVelocity(0, 0);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.createVisual();
    this.createRippleParticles();
  }

  private createVisual(): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xff4444, 0.5);
    graphics.fillRoundedRect(0, 0, 32, 32, 4);
    graphics.generateTexture('clone-texture', 32, 32);
    graphics.destroy();

    this.sprite.setTexture('clone-texture');
    this.sprite.setAlpha(0.6);
    this.sprite.setDepth(8);
  }

  private createRippleParticles(): void {
    const pg = this.scene.add.graphics();
    pg.fillStyle(0xff8888, 0.7);
    pg.fillCircle(3, 3, 3);
    pg.generateTexture('ripple-particle', 6, 6);
    pg.destroy();

    this.rippleParticles = this.scene.add.particles(0, 0, 'ripple-particle', {
      speed: { min: 20, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 500,
      quantity: 2,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Rectangle(-16, -16, 32, 32),
        quantity: 4,
      },
    });
    this.rippleParticles.startFollow(this.sprite);
    this.rippleParticles.setDepth(7);
  }

  public startPlayback(onComplete?: () => void): void {
    this.isPlaying = true;
    this.currentFrame = 0;
    this.onComplete = onComplete;
  }

  public update(): void {
    if (!this.isPlaying) return;

    if (this.currentFrame < this.snapshots.length) {
      const snap = this.snapshots[this.currentFrame];
      this.sprite.setPosition(snap.x, snap.y);
      this.body.reset(snap.x, snap.y);
      this.currentFrame++;
    } else {
      this.isPlaying = false;
      this.destroy();
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  public isActive(): boolean {
    return this.isPlaying;
  }

  public destroy(): void {
    this.rippleParticles.destroy();
    this.sprite.destroy();
  }
}
