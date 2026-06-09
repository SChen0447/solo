import Phaser from 'phaser';

interface Asteroid {
  sprite: Phaser.Physics.Arcade.Sprite;
  angularVelocity: number;
  size: number;
}

export class AsteroidManager {
  private scene: Phaser.Scene;
  private asteroids: Asteroid[] = [];
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private explosionParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private readonly MAX_ASTEROIDS: number = 30;
  private difficulty: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createExplosionParticles();
  }

  private createExplosionParticles(): void {
    if (!this.scene.textures.exists('debris')) {
      const debrisGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
      debrisGraphics.fillStyle(0xd4a75c);
      debrisGraphics.fillRect(0, 0, 3, 3);
      debrisGraphics.fillStyle(0xa07840);
      debrisGraphics.fillRect(1, 1, 2, 2);
      debrisGraphics.generateTexture('debris', 4, 4);
      debrisGraphics.destroy();
    }

    this.explosionParticles = this.scene.add.particles(0, 0, 'debris', {
      lifespan: 600,
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      gravityY: 0,
      blendMode: 'NORMAL',
      emitting: false
    });
  }

  startSpawning(): void {
    this.scheduleNextSpawn();
  }

  stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove(false);
      this.spawnTimer = null;
    }
  }

  setDifficulty(level: number): void {
    this.difficulty = Math.max(1, Math.min(level, 3));
  }

  private scheduleNextSpawn(): void {
    const minDelay = Math.max(400, 800 / this.difficulty);
    const maxDelay = Math.max(800, 1500 / this.difficulty);
    const delay = Phaser.Math.Between(minDelay, maxDelay);

    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      this.spawnAsteroid();
      this.scheduleNextSpawn();
    });
  }

  private spawnAsteroid(): void {
    if (this.asteroids.length >= this.MAX_ASTEROIDS) return;

    const size = Phaser.Math.Between(24, 48);
    const seed = Math.random() * 1000;

    if (!this.scene.textures.exists(`asteroid_${seed}_${size}`)) {
      this.createAsteroidTexture(seed, size);
    }

    const y = Phaser.Math.Between(50, this.scene.scale.height - 50);
    const sprite = this.scene.physics.add.sprite(
      this.scene.scale.width + size,
      y,
      `asteroid_${seed}_${size}`
    );

    const speed = Phaser.Math.Between(60, 180) * this.difficulty;
    sprite.setVelocityX(-speed);
    sprite.setSize(size * 0.7, size * 0.7);
    sprite.setOffset(size * 0.15, size * 0.15);

    const angularVelocity = Phaser.Math.Between(0.5, 1.5) * (Math.random() > 0.5 ? 1 : -1);

    const asteroid: Asteroid = {
      sprite,
      angularVelocity,
      size
    };

    this.asteroids.push(asteroid);
  }

  private createAsteroidTexture(seed: number, size: number): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });

    const rng = Phaser.Math.RND;
    rng.sow([seed]);

    const vertices: Phaser.Geom.Point[] = [];
    const numVertices = Math.floor(rng.between(7, 12));

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radius = (size / 2) * rng.between(0.7, 1.0);
      vertices.push(new Phaser.Geom.Point(
        Math.cos(angle) * radius + size / 2,
        Math.sin(angle) * radius + size / 2
      ));
    }

    const baseGray = rng.between(80, 140);
    const baseBrown = rng.between(40, 80);
    const baseColor = Phaser.Display.Color.GetColor(
      baseGray + baseBrown,
      baseGray,
      baseGray - baseBrown
    );

    graphics.fillStyle(baseColor, 1);
    graphics.beginPath();
    graphics.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      graphics.lineTo(vertices[i].x, vertices[i].y);
    }
    graphics.closePath();
    graphics.fillPath();

    const darkColor = Phaser.Display.Color.GetColor(
      baseGray + baseBrown - 40,
      baseGray - 30,
      baseGray - baseBrown - 20
    );
    graphics.fillStyle(darkColor, 0.6);
    for (let i = 0; i < 5; i++) {
      const cx = rng.between(size * 0.25, size * 0.75);
      const cy = rng.between(size * 0.25, size * 0.75);
      const cr = rng.between(size * 0.05, size * 0.12);
      graphics.fillCircle(cx, cy, cr);
    }

    const lightColor = Phaser.Display.Color.GetColor(
      Math.min(255, baseGray + baseBrown + 30),
      Math.min(255, baseGray + 30),
      Math.min(255, baseGray - baseBrown + 20)
    );
    graphics.fillStyle(lightColor, 0.4);
    for (let i = 0; i < 3; i++) {
      const cx = rng.between(size * 0.3, size * 0.7);
      const cy = rng.between(size * 0.2, size * 0.5);
      const cr = rng.between(size * 0.03, size * 0.08);
      graphics.fillCircle(cx, cy, cr);
    }

    graphics.generateTexture(`asteroid_${seed}_${size}`, size, size);
    graphics.destroy();
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.asteroids.length; i++) {
      const asteroid = this.asteroids[i];
      asteroid.sprite.rotation += asteroid.angularVelocity * (delta / 1000);

      if (asteroid.sprite.x < -asteroid.size * 2) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.asteroids[idx].sprite.destroy();
      this.asteroids.splice(idx, 1);
    }
  }

  checkCollision(playerSprite: Phaser.Physics.Arcade.Sprite): boolean {
    for (const asteroid of this.asteroids) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        playerSprite.getBounds(),
        asteroid.sprite.getBounds()
      )) {
        this.explode(asteroid.sprite.x, asteroid.sprite.y);
        return true;
      }
    }
    return false;
  }

  private explode(x: number, y: number): void {
    if (this.explosionParticles) {
      this.explosionParticles.emitParticleAt(x, y, 20);
    }
  }

  getAsteroidSprites(): Phaser.Physics.Arcade.Sprite[] {
    return this.asteroids.map(a => a.sprite);
  }

  destroy(): void {
    this.stopSpawning();
    for (const asteroid of this.asteroids) {
      asteroid.sprite.destroy();
    }
    this.asteroids = [];
    if (this.explosionParticles) {
      this.explosionParticles.destroy();
    }
  }
}
