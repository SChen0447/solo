import Phaser from 'phaser';

export type ResourceType = 'food' | 'wood' | 'stone';

export interface ResourceConfig {
  type: ResourceType;
  x: number;
  y: number;
}

export class Resource extends Phaser.GameObjects.Container {
  public type: ResourceType;
  public resourceSprite!: Phaser.GameObjects.Shape;
  public shadow!: Phaser.GameObjects.Shape;
  public glowCircle!: Phaser.GameObjects.Arc;
  public isDragging: boolean = false;
  public isCollected: boolean = false;
  public originalScale: number = 1;
  public originalX: number;
  public originalY: number;

  constructor(scene: Phaser.Scene, config: ResourceConfig) {
    super(scene, config.x, config.y);
    this.type = config.type;
    this.originalX = config.x;
    this.originalY = config.y;

    this.createShadow();
    this.createResourceSprite();
    this.createGlowEffect();

    this.setSize(this.getResourceSize(), this.getResourceSize());
    this.setInteractive({ useHandCursor: true });
    this.setupEventListeners();

    scene.add.existing(this);
  }

  private getResourceSize(): number {
    switch (this.type) {
      case 'food': return 20;
      case 'wood': return 30;
      case 'stone': return 30;
    }
  }

  private createShadow(): void {
    this.shadow = this.scene.add.ellipse(5, 5, this.getResourceSize(), this.getResourceSize() * 0.4, 0x000000, 0.3);
    this.add(this.shadow);
  }

  private createResourceSprite(): void {
    switch (this.type) {
      case 'food':
        this.resourceSprite = this.scene.add.circle(0, 0, 10, 0xff4444);
        this.resourceSprite.setStrokeStyle(2, 0xcc2222);
        break;
      case 'wood':
        this.resourceSprite = this.scene.add.rectangle(0, 0, 20, 30, 0x8b5a2b);
        this.resourceSprite.setStrokeStyle(2, 0x6b3a0b);
        break;
      case 'stone':
        this.resourceSprite = this.createHexagon(0, 0, 15, 0x888888);
        break;
    }
    this.add(this.resourceSprite);
  }

  private createHexagon(x: number, y: number, radius: number, color: number): Phaser.GameObjects.Polygon {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push(new Phaser.Geom.Point(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      ));
    }
    const polygon = this.scene.add.polygon(0, 0, points, color);
    polygon.setStrokeStyle(2, 0x666666);
    return polygon;
  }

  private createGlowEffect(): void {
    this.glowCircle = this.scene.add.circle(0, 0, this.getResourceSize() * 0.8, 0xffffff, 0);
    this.add(this.glowCircle);
  }

  private setupEventListeners(): void {
    this.on('pointerover', () => {
      if (!this.isDragging && !this.isCollected) {
        this.scene.tweens.add({
          targets: this,
          scale: 1.1,
          duration: 150,
          ease: 'Quad.easeOut'
        });
      }
    });

    this.on('pointerout', () => {
      if (!this.isDragging && !this.isCollected) {
        this.scene.tweens.add({
          targets: this,
          scale: 1,
          duration: 150,
          ease: 'Quad.easeOut'
        });
      }
    });

    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCollected) {
        this.showSelectionFlash();
        this.playClickFeedback();
      }
    });
  }

  public showSelectionFlash(): void {
    this.glowCircle.setAlpha(0.8);
    this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      ease: 'Quad.easeOut'
    });
  }

  public playClickFeedback(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });
  }

  public startDrag(): void {
    this.isDragging = true;
    this.originalScale = this.scale;
    this.scene.tweens.add({
      targets: this,
      scale: 0.8,
      duration: 200,
      ease: 'Quad.easeOut'
    });
  }

  public updateDragPosition(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging) {
      this.x = pointer.x;
      this.y = pointer.y;
    }
  }

  public endDrag(): void {
    this.isDragging = false;
  }

  public collect(): void {
    this.isCollected = true;
    this.playCollectEffect();
  }

  private playCollectEffect(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  public respawn(x: number, y: number): void {
    this.isCollected = false;
    this.isDragging = false;
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.setAlpha(1);
    this.setScale(1);
    this.setActive(true);
    this.setVisible(true);
  }

  public recycle(): void {
    this.isCollected = true;
    this.isDragging = false;
    this.setActive(false);
    this.setVisible(false);
  }
}
