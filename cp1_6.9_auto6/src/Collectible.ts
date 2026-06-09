import Phaser from 'phaser';

export interface CollectibleConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
}

export class EnergyCore {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public position: Phaser.Math.Vector2;
  public isCollected: boolean = false;
  public isActive: boolean = true;
  private scene: Phaser.Scene;
  private baseScale: number = 1;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private light: Phaser.GameObjects.Arc | null = null;
  private activeParticles: number = 0;
  private readonly maxExplosionParticles: number = 40;

  constructor(config: CollectibleConfig) {
    this.scene = config.scene;
    this.position = new Phaser.Math.Vector2(config.x, config.y);

    this.sprite = this.scene.physics.add.sprite(config.x, config.y, 'energyCore');
    this.sprite.setOrigin(0.5);
    this.sprite.setCircle(18);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.enable = true;

    this.light = this.scene.add.circle(config.x, config.y, 40, 0xffd700, 0.15);
    this.light.setBlendMode(Phaser.BlendModes.ADD);
    this.light.setDepth(-1);

    this.startPulse();
    this.startFloat();
  }

  private startPulse(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.9, to: 1.1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (this.light) {
      this.scene.tweens.add({
        targets: this.light,
        radius: { from: 35, to: 50 },
        alpha: { from: 0.1, to: 0.2 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private startFloat(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.position.y - 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public checkCollision(playerSprite: Phaser.Physics.Arcade.Sprite): boolean {
    if (!this.isActive) return false;

    const dx = this.sprite.x - playerSprite.x;
    const dy = this.sprite.y - playerSprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < 34;
  }

  public collect(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.isCollected = true;

    this.triggerExplosion();
    this.triggerLightFlash();
  }

  private triggerExplosion(): void {
    const centerX = this.sprite.x;
    const centerY = this.sprite.y;

    for (let i = 0; i < 20 && this.activeParticles < this.maxExplosionParticles; i++) {
      const angle = (i / 20) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const speed = Phaser.Math.Between(60, 160);

      const particle = this.scene.add.image(centerX, centerY, 'explosionParticle');
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(10);

      this.activeParticles++;

      this.scene.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * Phaser.Math.Between(60, 100),
        y: centerY + Math.sin(angle) * Phaser.Math.Between(60, 100),
        scale: { from: 1, to: 0 },
        alpha: { from: 1, to: 0 },
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(400, 700),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy();
          this.activeParticles--;
        }
      });

      void speed;
    }

    for (let i = 0; i < 12 && this.activeParticles < this.maxExplosionParticles; i++) {
      const spark = this.scene.add.image(
        centerX + Phaser.Math.Between(-10, 10),
        centerY + Phaser.Math.Between(-10, 10),
        'sparkParticle'
      );
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(10);

      this.activeParticles++;

      this.scene.tweens.add({
        targets: spark,
        scale: { from: 0.8, to: 0 },
        alpha: { from: 1, to: 0 },
        duration: 600,
        ease: 'Expo.easeOut',
        onComplete: () => {
          spark.destroy();
          this.activeParticles--;
        }
      });
    }

    this.sprite.destroy();

    this.pulseTween?.remove();
  }

  private triggerLightFlash(): void {
    if (!this.light) return;

    const originalRadius = 40;
    const boostedRadius = originalRadius * 1.3;

    this.scene.tweens.add({
      targets: this.light,
      radius: { from: originalRadius, to: boostedRadius },
      alpha: { from: 0.2, to: 0.5 },
      duration: 300,
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: 1700,
      onComplete: () => {
        this.light?.destroy();
      }
    });
  }

  public getActiveParticleCount(): number {
    return this.activeParticles;
  }

  public destroy(): void {
    this.pulseTween?.remove();
    this.sprite.destroy();
    this.light?.destroy();
  }
}

export class CollectibleManager {
  private scene: Phaser.Scene;
  public cores: EnergyCore[] = [];
  public readonly TOTAL_CORES: number = 5;
  public onCollect: ((score: number) => void) | null = null;
  private lightBoostActive: boolean = false;
  private lightBoostTimer: number = 0;
  public globalLight: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawnCores(positions: Phaser.Math.Vector2[]): void {
    this.cores = [];
    positions.slice(0, this.TOTAL_CORES).forEach(pos => {
      this.cores.push(new EnergyCore({
        scene: this.scene, x: pos.x, y: pos.y }));
    });
  }

  public update(time: number, delta: number, playerSprite: Phaser.Physics.Arcade.Sprite): void {
    let collected = false;

    this.cores.forEach((core) => {
      if (core.isActive && core.checkCollision(playerSprite)) {
        core.collect();
        this.onCollect?.(10);
        collected = true;
        this.triggerGlobalLightBoost();
      }
    });

    if (this.lightBoostActive) {
      this.lightBoostTimer -= delta;
      if (this.lightBoostTimer <= 0) {
        this.lightBoostActive = false;
        this.fadeGlobalLight();
      }
    }
  }

  private triggerGlobalLightBoost(): void {
    this.lightBoostActive = true;
    this.lightBoostTimer = 2000;

    if (!this.globalLight) {
      this.globalLight = this.scene.add.circle(0, 0, 200, 0xffaa33, 0);
      this.globalLight.setBlendMode(Phaser.BlendModes.ADD);
      this.globalLight.setDepth(-5);
      this.globalLight.setScrollFactor(0);
      this.globalLight.setPosition(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2
      );
    }

    this.scene.tweens.add({
      targets: this.globalLight,
      alpha: { from: this.globalLight.alpha, to: 0.15 },
      radius: { from: this.globalLight.radius, to: 400 },
      duration: 300,
      ease: 'Cubic.easeOut'
    });
  }

  private fadeGlobalLight(): void {
    if (this.globalLight) {
      this.scene.tweens.add({
        targets: this.globalLight,
        alpha: 0,
        radius: 200,
        duration: 500,
        ease: 'Cubic.easeIn'
      });
    }
  }

  public getRemainingCount(): number {
    return this.cores.filter(c => c.isActive).length;
  }

  public getTotalActiveParticles(): number {
    return this.cores.reduce((sum, c) => sum + c.getActiveParticleCount(), 0);
  }

  public destroy(): void {
    this.cores.forEach(c => c.destroy());
    this.globalLight?.destroy();
  }
}
