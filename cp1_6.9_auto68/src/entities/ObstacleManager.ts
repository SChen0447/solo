import Phaser from 'phaser';

export interface Treasure {
  sprite: Phaser.Physics.Arcade.Sprite;
  glowTween: Phaser.Tweens.Tween | null;
}

export class ObstacleManager {
  private scene: Phaser.Scene;
  private asteroids: Phaser.Physics.Arcade.Sprite[] = [];
  private policeShips: Phaser.Physics.Arcade.Sprite[] = [];
  private treasures: Treasure[] = [];
  private asteroidTimer: Phaser.Time.TimerEvent | null = null;
  private policeTimer: Phaser.Time.TimerEvent | null = null;
  private treasureTimer: Phaser.Time.TimerEvent | null = null;
  private onTreasureCollect: ((treasure: Treasure, position: Phaser.Math.Vector2) => void) | null = null;
  private asteroidTextureCreated: boolean = false;
  private policeTextureCreated: boolean = false;
  private treasureTextureCreated: boolean = false;
  private static readonly ASTEROID_KEY: string = 'asteroidTex';
  private static readonly POLICE_KEY: string = 'policeTex';
  private static readonly TREASURE_KEY: string = 'treasureTex';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTextures();
  }

  private createTextures(): void {
    this.createAsteroidTexture();
    this.createPoliceTexture();
    this.createTreasureTexture();
  }

  private createAsteroidTexture(): void {
    if (this.asteroidTextureCreated) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x8b7355);
    graphics.beginPath();
    graphics.moveTo(20, 0);
    graphics.lineTo(35, 8);
    graphics.lineTo(40, 25);
    graphics.lineTo(30, 40);
    graphics.lineTo(10, 38);
    graphics.lineTo(0, 22);
    graphics.lineTo(5, 8);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x6b5344);
    graphics.fillCircle(12, 15, 5);
    graphics.fillCircle(28, 28, 4);
    graphics.fillCircle(20, 10, 3);
    graphics.generateTexture(ObstacleManager.ASTEROID_KEY, 40, 40);
    graphics.destroy();
    this.asteroidTextureCreated = true;
  }

  private createPoliceTexture(): void {
    if (this.policeTextureCreated) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xcc2222);
    graphics.beginPath();
    graphics.moveTo(16, 32);
    graphics.lineTo(32, 0);
    graphics.lineTo(0, 0);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0xff4444);
    graphics.fillRect(12, 8, 8, 12);
    graphics.fillStyle(0x0000ff);
    graphics.fillRect(10, 2, 4, 4);
    graphics.fillStyle(0xff0000);
    graphics.fillRect(18, 2, 4, 4);
    graphics.generateTexture(ObstacleManager.POLICE_KEY, 32, 36);
    graphics.destroy();
    this.policeTextureCreated = true;
  }

  private createTreasureTexture(): void {
    if (this.treasureTextureCreated) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffd700);
    graphics.fillRect(0, 0, 16, 16);
    graphics.fillStyle(0xffec8b);
    graphics.fillRect(2, 2, 12, 4);
    graphics.fillStyle(0xb8860b);
    graphics.fillRect(6, 6, 4, 6);
    graphics.generateTexture(ObstacleManager.TREASURE_KEY, 16, 16);
    graphics.destroy();
    this.treasureTextureCreated = true;
  }

  public setTreasureCollectCallback(callback: (treasure: Treasure, position: Phaser.Math.Vector2) => void): void {
    this.onTreasureCollect = callback;
  }

  public startSpawning(): void {
    this.spawnInitialTreasures();

    this.asteroidTimer = this.scene.time.addEvent({
      delay: 1500,
      callback: () => this.spawnAsteroid(),
      loop: true
    });

    this.policeTimer = this.scene.time.addEvent({
      delay: 4000,
      callback: () => this.spawnPolice(),
      loop: true
    });

    this.treasureTimer = this.scene.time.addEvent({
      delay: 3000,
      callback: () => this.spawnTreasure(),
      loop: true
    });
  }

  private spawnInitialTreasures(): void {
    for (let i = 0; i < 3; i++) {
      this.spawnTreasure();
    }
  }

  private spawnAsteroid(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const y = Phaser.Math.Between(50, gameHeight - 50);
    const speed = Phaser.Math.Between(50, 120);

    const asteroid = this.scene.physics.add.sprite(gameWidth + 40, y, ObstacleManager.ASTEROID_KEY);
    asteroid.setDisplaySize(36, 36);
    asteroid.setVelocity(-speed, 0);
    asteroid.setAngularVelocity(Phaser.Math.Between(-50, 50));
    asteroid.body!.setCircle(16, 4, 4);
    this.asteroids.push(asteroid);
  }

  private spawnPolice(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const y = Phaser.Math.Between(80, gameHeight - 80);
    const fromLeft = Math.random() > 0.5;
    const speed = Phaser.Math.Between(80, 150);
    const startX = fromLeft ? -30 : gameWidth + 30;
    const velocityX = fromLeft ? speed : -speed;

    const police = this.scene.physics.add.sprite(startX, y, ObstacleManager.POLICE_KEY);
    police.setDisplaySize(28, 32);
    police.setVelocity(velocityX, 0);
    if (!fromLeft) {
      police.setFlipX(true);
    }
    this.policeShips.push(police);
  }

  private spawnTreasure(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const x = Phaser.Math.Between(60, gameWidth - 60);
    const y = Phaser.Math.Between(60, gameHeight - 100);

    const sprite = this.scene.physics.add.sprite(x, y, ObstacleManager.TREASURE_KEY);
    sprite.setDisplaySize(16, 16);
    sprite.body!.setCircle(8, 0, 0);

    const glowTween = this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 0.7, to: 1 },
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.treasures.push({ sprite, glowTween });
  }

  public dropTreasures(x: number, y: number): void {
    const count = Math.min(this.treasures.length, 5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const distance = 40;
      const dropX = x + Math.cos(angle) * distance;
      const dropY = y + Math.sin(angle) * distance;
      this.spawnTreasureAt(dropX, dropY);
    }
  }

  private spawnTreasureAt(x: number, y: number): void {
    const sprite = this.scene.physics.add.sprite(x, y, ObstacleManager.TREASURE_KEY);
    sprite.setDisplaySize(16, 16);
    sprite.body!.setCircle(8, 0, 0);

    const glowTween = this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 0.7, to: 1 },
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.treasures.push({ sprite, glowTween });
  }

  public collectTreasure(treasure: Treasure): void {
    if (this.onTreasureCollect) {
      this.onTreasureCollect(treasure, new Phaser.Math.Vector2(treasure.sprite.x, treasure.sprite.y));
    }

    if (treasure.glowTween) {
      treasure.glowTween.stop();
    }

    this.scene.tweens.add({
      targets: treasure.sprite,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        treasure.sprite.destroy();
      }
    });

    const index = this.treasures.indexOf(treasure);
    if (index > -1) {
      this.treasures.splice(index, 1);
    }
  }

  public update(): void {
    const gameWidth = this.scene.scale.width;

    this.asteroids = this.asteroids.filter(asteroid => {
      if (asteroid.x < -60) {
        asteroid.destroy();
        return false;
      }
      return true;
    });

    this.policeShips = this.policeShips.filter(police => {
      if (police.x < -60 || police.x > gameWidth + 60) {
        police.destroy();
        return false;
      }
      return true;
    });
  }

  public getAsteroids(): Phaser.Physics.Arcade.Sprite[] {
    return this.asteroids;
  }

  public getPoliceShips(): Phaser.Physics.Arcade.Sprite[] {
    return this.policeShips;
  }

  public getTreasures(): Treasure[] {
    return this.treasures;
  }

  public destroy(): void {
    if (this.asteroidTimer) this.asteroidTimer.remove(false);
    if (this.policeTimer) this.policeTimer.remove(false);
    if (this.treasureTimer) this.treasureTimer.remove(false);

    this.asteroids.forEach(a => a.destroy());
    this.policeShips.forEach(p => p.destroy());
    this.treasures.forEach(t => {
      if (t.glowTween) t.glowTween.stop();
      t.sprite.destroy();
    });

    this.asteroids = [];
    this.policeShips = [];
    this.treasures = [];
  }
}
