import Phaser from 'phaser';

export type ArtifactType = 'ceramic' | 'bronze' | 'gold';

export interface ArtifactConfig {
  type: ArtifactType;
  x: number;
  y: number;
}

export class Artifact extends Phaser.Physics.Arcade.Sprite {
  private artifactType: ArtifactType;
  private baseY: number;
  private floatOffset: number = 0;
  private readonly FLOAT_AMPLITUDE = 1;
  private readonly FLOAT_PERIOD = 1500;
  private readonly GLOW_RADIUS = 80;
  private isGlowing: boolean = false;
  private glowGraphics!: Phaser.GameObjects.Graphics;
  private glowIntensity: number = 0;
  private targetGlowIntensity: number = 0;
  private collected: boolean = false;
  private baseColor: number;
  private glowColor: number;
  private _destroyed: boolean = false;

  constructor(scene: Phaser.Scene, config: ArtifactConfig) {
    super(scene, config.x, config.y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.artifactType = config.type;
    this.baseY = config.y;

    const colors = this.getColors();
    this.baseColor = colors.base;
    this.glowColor = colors.glow;

    this.createArtifactSprite();
    this.createGlowEffect();
    if (this.body) {
      this.body.setSize(24, 24);
    }
    this.setImmovable(true);
  }

  private getColors(): { base: number; glow: number } {
    switch (this.artifactType) {
      case 'ceramic':
        return { base: 0xb87333, glow: 0xd4956a };
      case 'bronze':
        return { base: 0x4a7c59, glow: 0x6ba878 };
      case 'gold':
        return { base: 0xd4af37, glow: 0xffd700 };
      default:
        return { base: 0xffffff, glow: 0xffffff };
    }
  }

  private createArtifactSprite(): void {
    const graphics = this.scene.add.graphics();

    switch (this.artifactType) {
      case 'ceramic':
        this.drawCeramicVase(graphics);
        break;
      case 'bronze':
        this.drawBronzeStatue(graphics);
        break;
      case 'gold':
        this.drawGoldCoin(graphics);
        break;
    }

    graphics.generateTexture(`artifact_${this.artifactType}`, 40, 40);
    graphics.destroy();

    this.setTexture(`artifact_${this.artifactType}`);
    this.setDisplaySize(32, 32);
  }

  private drawCeramicVase(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(this.baseColor, 1);

    graphics.beginPath();
    graphics.moveTo(0, -15);
    graphics.lineTo(6, -12);
    graphics.lineTo(8, -5);
    graphics.lineTo(10, 0);
    graphics.lineTo(10, 8);
    graphics.lineTo(8, 15);
    graphics.lineTo(-8, 15);
    graphics.lineTo(-10, 8);
    graphics.lineTo(-10, 0);
    graphics.lineTo(-8, -5);
    graphics.lineTo(-6, -12);
    graphics.closePath();
    graphics.fill();

    graphics.fillStyle(0x8b5a2b, 0.6);
    graphics.fillRect(-8, 0, 16, 2);
    graphics.fillRect(-7, 5, 14, 2);
  }

  private drawBronzeStatue(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(this.baseColor, 1);

    graphics.fillRect(-4, -15, 8, 10);

    graphics.beginPath();
    graphics.arc(0, -18, 5, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillRect(-8, -5, 16, 20);

    graphics.fillRect(-12, 0, 4, 12);
    graphics.fillRect(8, 0, 4, 12);

    graphics.fillRect(-6, 15, 4, 5);
    graphics.fillRect(2, 15, 4, 5);

    graphics.fillStyle(0x6ba878, 0.5);
    graphics.fillRect(-10, 2, 20, 3);
  }

  private drawGoldCoin(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(this.baseColor, 1);

    graphics.beginPath();
    graphics.arc(0, 0, 12, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0xfff8dc, 0.5);
    graphics.beginPath();
    graphics.arc(-3, -3, 5, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0xaa8c00, 0.4);
    graphics.beginPath();
    graphics.arc(3, 3, 4, 0, Math.PI * 2);
    graphics.fill();
  }

  private createGlowEffect(): void {
    this.glowGraphics = this.scene.add.graphics();
    this.glowGraphics.setPosition(this.x, this.y);
    this.glowGraphics.setDepth(this.depth - 1);
    this.updateGlow();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();

    if (this.glowIntensity <= 0) return;

    const radius = 20 + this.glowIntensity * 10;
    const alpha = this.glowIntensity * 0.6;

    this.glowGraphics.save();
    this.glowGraphics.beginPath();
    this.glowGraphics.arc(0, 0, radius, 0, Math.PI * 2);
    this.glowGraphics.fillStyle(this.glowColor, alpha);
    this.glowGraphics.fill();
    this.glowGraphics.restore();

    this.glowGraphics.save();
    this.glowGraphics.lineStyle(2, this.glowColor, this.glowIntensity * 0.8);
    this.glowGraphics.beginPath();
    this.glowGraphics.arc(0, 0, radius - 5, 0, Math.PI * 2);
    this.glowGraphics.stroke();
    this.glowGraphics.restore();
  }

  update(time: number, delta: number): void {
    if (this.collected || this._destroyed) return;

    this.floatOffset = Math.sin(time / this.FLOAT_PERIOD * Math.PI * 2) * this.FLOAT_AMPLITUDE;
    this.y = this.baseY + this.floatOffset;

    this.glowGraphics.setPosition(this.x, this.y);

    const glowSpeed = delta / 300;
    if (this.isGlowing) {
      this.targetGlowIntensity = 1;
    } else {
      this.targetGlowIntensity = 0;
    }

    if (this.glowIntensity < this.targetGlowIntensity) {
      this.glowIntensity = Math.min(1, this.glowIntensity + glowSpeed);
    } else if (this.glowIntensity > this.targetGlowIntensity) {
      this.glowIntensity = Math.max(0, this.glowIntensity - glowSpeed);
    }

    this.updateGlow();
  }

  public checkProximity(submarineX: number, submarineY: number): void {
    if (this.collected || this._destroyed) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, submarineX, submarineY);
    this.isGlowing = dist <= this.GLOW_RADIUS;
  }

  public collect(onComplete?: () => void): void {
    if (this.collected || this._destroyed) return;
    this.collected = true;

    const startX = this.x;
    const startY = this.y;
    const arcRadius = 50;
    const duration = 500;

    this.scene.tweens.add({
      targets: this,
      x: startX + arcRadius,
      y: startY - arcRadius,
      duration: duration,
      ease: 'Quad.easeOut',
      yoyo: false,
      onUpdate: (tween) => {
        const progress = tween.progress;
        const angle = progress * Math.PI;
        this.x = startX + Math.cos(angle) * arcRadius;
        this.y = startY - Math.sin(angle) * arcRadius;
        this.alpha = 1 - progress;
        this.glowGraphics.alpha = 1 - progress;
      },
      onComplete: () => {
        this._destroyed = true;
        this.destroy();
        this.glowGraphics.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  public getType(): ArtifactType {
    return this.artifactType;
  }

  public isCollected(): boolean {
    return this.collected;
  }

  public getGlowRadius(): number {
    return this.GLOW_RADIUS;
  }

  destroy(fromScene?: boolean): void {
    if (this.glowGraphics && !this._destroyed) {
      this.glowGraphics.destroy();
    }
    this._destroyed = true;
    super.destroy(fromScene);
  }
}
