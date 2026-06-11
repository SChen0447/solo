import Phaser from 'phaser';

const MAX_PARTICLES = 200;

export class ForgeParticles {
  private scene: Phaser.Scene;
  private sparkParticles: Phaser.GameObjects.Arc[] = [];
  private steamParticles: Phaser.GameObjects.Arc[] = [];
  private sparkGroup: Phaser.Physics.Arcade.Group;
  private steamGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sparkGroup = scene.physics.add.group();
    this.steamGroup = scene.physics.add.group();
  }

  emitSparks(x: number, y: number, count: number = 12): void {
    const available = MAX_PARTICLES - this.sparkParticles.length - this.steamParticles.length;
    const actual = Math.min(count, available);
    for (let i = 0; i < actual; i++) {
      const size = Phaser.Math.Between(2, 5);
      const spark = this.scene.add.circle(x, y, size, this.getSparkColor()) as Phaser.GameObjects.Arc;
      spark.setDepth(100);
      this.scene.physics.add.existing(spark);
      const body = spark.body as Phaser.Physics.Arcade.Body;
      const angle = Phaser.Math.Between(-180, 0);
      const speed = Phaser.Math.Between(100, 350);
      this.scene.physics.velocityFromAngle(angle, speed, body.velocity);
      body.gravity.y = 400;
      this.sparkParticles.push(spark);
      this.sparkGroup.add(spark);

      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(300, 700),
        ease: 'Power2',
        onComplete: () => {
          this.removeSpark(spark);
        },
      });
    }
  }

  emitSteam(x: number, y: number, count: number = 20): void {
    const available = MAX_PARTICLES - this.sparkParticles.length - this.steamParticles.length;
    const actual = Math.min(count, available);
    for (let i = 0; i < actual; i++) {
      const size = Phaser.Math.Between(4, 10);
      const steam = this.scene.add.circle(
        x + Phaser.Math.Between(-30, 30),
        y + Phaser.Math.Between(-10, 10),
        size,
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 0.7)
      ) as Phaser.GameObjects.Arc;
      steam.setDepth(100);
      this.scene.physics.add.existing(steam);
      const body = steam.body as Phaser.Physics.Arcade.Body;
      body.velocity.y = Phaser.Math.Between(-120, -50);
      body.velocity.x = Phaser.Math.Between(-30, 30);
      this.steamParticles.push(steam);
      this.steamGroup.add(steam);

      this.scene.tweens.add({
        targets: steam,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power1',
        onComplete: () => {
          this.removeSteam(steam);
        },
      });
    }
  }

  emitBurst(x: number, y: number, color: number, count: number = 25): void {
    const available = MAX_PARTICLES - this.sparkParticles.length - this.steamParticles.length;
    const actual = Math.min(count, available);
    for (let i = 0; i < actual; i++) {
      const size = Phaser.Math.Between(2, 6);
      const p = this.scene.add.circle(x, y, size, color, 0.9) as Phaser.GameObjects.Arc;
      p.setDepth(150);
      this.scene.physics.add.existing(p);
      const body = p.body as Phaser.Physics.Arcade.Body;
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(80, 280);
      this.scene.physics.velocityFromAngle(angle, speed, body.velocity);
      body.gravity.y = 150;
      this.steamParticles.push(p);
      this.steamGroup.add(p);

      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Power2',
        onComplete: () => {
          this.removeSteam(p);
        },
      });
    }
  }

  private getSparkColor(): number {
    const colors = [0xff4500, 0xff6600, 0xffaa00, 0xffd700, 0xfffacd];
    return colors[Phaser.Math.Between(0, colors.length - 1)];
  }

  private removeSpark(spark: Phaser.GameObjects.Arc): void {
    const idx = this.sparkParticles.indexOf(spark);
    if (idx !== -1) this.sparkParticles.splice(idx, 1);
    this.sparkGroup.remove(spark, true, true);
    spark.destroy();
  }

  private removeSteam(steam: Phaser.GameObjects.Arc): void {
    const idx = this.steamParticles.indexOf(steam);
    if (idx !== -1) this.steamParticles.splice(idx, 1);
    this.steamGroup.remove(steam, true, true);
    steam.destroy();
  }

  destroy(): void {
    this.sparkParticles.forEach((s) => s.destroy());
    this.steamParticles.forEach((s) => s.destroy());
    this.sparkParticles = [];
    this.steamParticles = [];
    this.sparkGroup.destroy(true);
    this.steamGroup.destroy(true);
  }
}
