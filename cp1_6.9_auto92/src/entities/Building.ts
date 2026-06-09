import Phaser from 'phaser';

export type BuildingType = 'shelter' | 'campfire';

export interface BuildingConfig {
  type: BuildingType;
  x: number;
  y: number;
}

export class Building extends Phaser.GameObjects.Container {
  public type: BuildingType;
  public isBuilt: boolean = false;
  public level: number = 1;
  public shadow!: Phaser.GameObjects.Shape;
  public buildingParts: Phaser.GameObjects.Shape[] = [];
  public fireParticles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, config: BuildingConfig) {
    super(scene, config.x, config.y);
    this.type = config.type;

    this.createShadow();

    if (this.type === 'shelter') {
      this.createShelter();
    } else if (this.type === 'campfire') {
      this.createCampfire();
    }

    this.setInteractive({ useHandCursor: true });
    this.setupEventListeners();

    scene.add.existing(this);
    this.playBuildAnimation();
  }

  private createShadow(): void {
    const width = this.type === 'shelter' ? 80 : 40;
    this.shadow = this.scene.add.ellipse(5, 30, width, width * 0.3, 0x000000, 0.3);
    this.add(this.shadow);
  }

  private createShelter(): void {
    const base = this.scene.add.rectangle(0, 10, 80, 60, 0x6a4a2a);
    base.setStrokeStyle(3, 0x4a2a0a);
    this.buildingParts.push(base);
    this.add(base);

    const roofPoints = [
      new Phaser.Geom.Point(-45, -20),
      new Phaser.Geom.Point(45, -20),
      new Phaser.Geom.Point(0, -50)
    ];
    const roof = this.scene.add.polygon(0, 0, roofPoints, 0x8a3a1a);
    roof.setStrokeStyle(3, 0x6a1a0a);
    this.buildingParts.push(roof);
    this.add(roof);

    const door = this.scene.add.rectangle(0, 25, 20, 30, 0x3a1a0a);
    this.buildingParts.push(door);
    this.add(door);
  }

  private createCampfire(): void {
    const stoneRing = this.scene.add.arc(0, 5, 22, 0, 360, false, 0x7a7a7a, 1);
    stoneRing.setStrokeStyle(8, 0x5a5a5a);
    this.buildingParts.push(stoneRing);
    this.add(stoneRing);

    const innerStone1 = this.scene.add.circle(-12, 10, 7, 0x6a6a6a);
    const innerStone2 = this.scene.add.circle(12, 10, 7, 0x6a6a6a);
    const innerStone3 = this.scene.add.circle(0, 15, 7, 0x6a6a6a);
    this.buildingParts.push(innerStone1, innerStone2, innerStone3);
    this.add(innerStone1);
    this.add(innerStone2);
    this.add(innerStone3);

    this.createFireParticles();
  }

  private createFireParticles(): void {
    this.fireParticles = this.scene.add.particles(0, 0, undefined, {
      x: { min: -5, max: 5 },
      y: { min: 0, max: -10 },
      lifespan: 600,
      speedY: { min: -40, max: -80 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      frequency: 80,
      tint: [0xffaa00, 0xff6600, 0xffff00],
      quantity: 2,
      emitting: true
    });
    this.add(this.fireParticles);
  }

  private setupEventListeners(): void {
    this.on('pointerover', () => {
      this.scene.tweens.add({
        targets: this,
        scale: 1.05,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });

    this.on('pointerout', () => {
      this.scene.tweens.add({
        targets: this,
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });

    this.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeInOut'
      });
    });
  }

  private playBuildAnimation(): void {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 800,
      ease: 'Elastic.easeOut',
      onComplete: () => {
        this.isBuilt = true;
      }
    });
  }

  public upgrade(): void {
    this.level++;
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });
  }

  public getFireRadius(): number {
    return 50;
  }

  public isPointNearFire(px: number, py: number): boolean {
    if (this.type !== 'campfire') return false;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    return distance <= this.getFireRadius();
  }

  public destroy(fromScene?: boolean): void {
    if (this.fireParticles) {
      this.fireParticles.stop();
      this.fireParticles.destroy();
    }
    super.destroy(fromScene);
  }
}
