import Phaser from 'phaser';

export interface PathPoint {
  x: number;
  y: number;
}

export interface EnemyStats {
  maxHealth: number;
  maxShield: number;
  speed: number;
  reward: number;
  damage: number;
  type: 'packet' | 'worm' | 'trojan';
}

export class Enemy extends Phaser.GameObjects.Container {
  public stats: EnemyStats;
  public health: number;
  public shield: number;
  public pathIndex: number = 0;
  public pathProgress: number = 0;
  public isDead: boolean = false;
  public reachedEnd: boolean = false;

  private path: PathPoint[];
  private bodySprite: Phaser.GameObjects.Graphics;
  private shieldBar: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private shieldBrokenFlash: number = 0;
  private hitFlashTime: number = 0;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private trailTimer: number = 0;
  private angle: number = 0;

  constructor(scene: Phaser.Scene, path: PathPoint[], stats: EnemyStats) {
    const start = path[0];
    super(scene, start.x, start.y);
    this.path = path;
    this.stats = stats;
    this.health = stats.maxHealth;
    this.shield = stats.maxShield;

    this.bodySprite = new Phaser.GameObjects.Graphics(scene);
    this.add(this.bodySprite);

    this.shieldBar = new Phaser.GameObjects.Graphics(scene);
    this.healthBar = new Phaser.GameObjects.Graphics(scene);
    this.add(this.shieldBar);
    this.add(this.healthBar);

    this.drawBody();
    this.drawBars();
    this.setupTrail();

    scene.add.existing(this);
    this.setSize(34, 34);
  }

  private setupTrail(): void {
    const textureKey = `enemy_trail_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ffff, 0.6);
    g.fillCircle(4, 4, 4);
    g.generateTexture(textureKey, 8, 8);
    g.destroy();

    const emitter = this.scene.add.particles(0, 0, textureKey, {
      lifespan: 400,
      speed: 0,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: this.stats.type === 'packet' ? 0x00ffff : this.stats.type === 'worm' ? 0xff00ff : 0xffaa00,
      frequency: 60,
      follow: this,
      followOffset: { x: 0, y: 0 }
    });
    this.trailEmitter = emitter;
  }

  private drawBody(): void {
    const g = this.bodySprite;
    g.clear();

    const tint = this.hitFlashTime > 0 ? 0xffffff : this.getBodyColor();
    const alpha = this.shield <= 0 && this.shieldBrokenFlash <= 0 ? 0.7 : 1;

    g.lineStyle(2, this.getBodyGlowColor(), alpha);

    switch (this.stats.type) {
      case 'packet':
        g.fillStyle(tint, alpha);
        this.drawPacketShape(g);
        break;
      case 'worm':
        g.fillStyle(tint, alpha);
        this.drawWormShape(g);
        break;
      case 'trojan':
        g.fillStyle(tint, alpha);
        this.drawTrojanShape(g);
        break;
    }

    g.lineStyle(2, this.getBodyGlowColor(), alpha * 0.6);
    g.strokeRect(-14, -14, 28, 28);
  }

  private drawPacketShape(g: Phaser.GameObjects.Graphics): void {
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(10, -4);
    g.lineTo(8, 10);
    g.lineTo(-8, 10);
    g.lineTo(-10, -4);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRect(-4, -2, 8, 6);
  }

  private drawWormShape(g: Phaser.GameObjects.Graphics): void {
    g.beginPath();
    for (let i = -3; i <= 3; i++) {
      const segX = i * 4;
      const segY = Math.sin(i * 0.8 + this.scene.time.now * 0.008) * 4;
      if (i === -3) {
        g.moveTo(segX - 3, segY);
      }
      g.lineTo(segX + 3, segY);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private drawTrojanShape(g: Phaser.GameObjects.Graphics): void {
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(12, 0);
    g.lineTo(0, 14);
    g.lineTo(-12, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeLine(-6, 0, 6, 0);
    g.strokeLine(0, -6, 0, 6);
  }

  private getBodyColor(): number {
    switch (this.stats.type) {
      case 'packet': return 0x003344;
      case 'worm': return 0x330044;
      case 'trojan': return 0x442200;
    }
  }

  private getBodyGlowColor(): number {
    switch (this.stats.type) {
      case 'packet': return 0x00ffff;
      case 'worm': return 0xff00ff;
      case 'trojan': return 0xffaa00;
    }
  }

  private drawBars(): void {
    const barW = 38;
    const barH = 4;
    const halfW = barW / 2;

    this.shieldBar.clear();
    this.healthBar.clear();

    if (this.stats.maxShield > 0) {
      this.shieldBar.fillStyle(0x001133, 0.8);
      this.shieldBar.fillRect(-halfW, -26, barW, barH);

      const shieldPct = Math.max(0, this.shield / this.stats.maxShield);
      const shieldW = Math.max(0, barW * shieldPct);
      const shieldFlash = this.shieldBrokenFlash > 0 ? 0xffffff : 0x0088ff;
      this.shieldBar.fillStyle(shieldFlash, 0.95);
      this.shieldBar.fillRect(-halfW, -26, shieldW, barH);

      this.shieldBar.lineStyle(1, 0x00aaff, 0.6);
      this.shieldBar.strokeRect(-halfW, -26, barW, barH);
    }

    this.healthBar.fillStyle(0x330011, 0.8);
    this.healthBar.fillRect(-halfW, -20, barW, barH);

    const healthPct = Math.max(0, this.health / this.stats.maxHealth);
    const healthW = Math.max(0, barW * healthPct);
    const healthColor = healthPct > 0.5 ? 0x00ff66 : healthPct > 0.25 ? 0xffcc00 : 0xff3344;
    this.healthBar.fillStyle(healthColor, 0.95);
    this.healthBar.fillRect(-halfW, -20, healthW, barH);

    this.healthBar.lineStyle(1, 0xff6688, 0.6);
    this.healthBar.strokeRect(-halfW, -20, barW, barH);
  }

  public takeDamage(damage: number): { shieldHit: boolean; destroyed: boolean } {
    let shieldHit = false;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      this.shield -= absorbed;
      damage -= absorbed;
      shieldHit = true;

      if (this.shield <= 0 && absorbed > 0) {
        this.shieldBrokenFlash = 350;
        this.spawnShieldBreakParticles();
      }
    }

    if (damage > 0) {
      this.health -= damage;
    }

    this.hitFlashTime = 120;
    this.drawBody();
    this.drawBars();

    this.spawnHitParticles();

    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;
      this.die();
      return { shieldHit, destroyed: true };
    }

    return { shieldHit, destroyed: false };
  }

  private spawnHitParticles(): void {
    const key = `hit_spark_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();

    this.scene.add.particles(this.x, this.y, key, {
      lifespan: 260,
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      tint: [0x00ffff, 0xffffff, 0xff00ff],
      quantity: 6,
      frequency: -1
    });

    this.scene.time.delayedCall(500, () => this.scene.textures.exists(key) && this.scene.textures.remove(key));
  }

  private spawnShieldBreakParticles(): void {
    const key = `shield_brk_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00aaff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture(key, 3, 3);
    g.destroy();

    this.scene.add.particles(this.x, this.y, key, {
      lifespan: 500,
      speed: { min: 100, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x00aaff, 0x00ffff, 0xffffff],
      quantity: 16,
      frequency: -1
    });

    this.scene.time.delayedCall(800, () => this.scene.textures.exists(key) && this.scene.textures.remove(key));
  }

  private die(): void {
    if (this.trailEmitter) {
      this.trailEmitter.stop();
      this.scene.time.delayedCall(400, () => this.trailEmitter?.destroy());
    }

    this.scene.cameras.main.shake(120, 0.004);
  }

  public spawnDeathFragments(): void {
    const key = `frag_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ff88, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture(key, 4, 4);
    g.destroy();

    this.scene.add.particles(this.x, this.y, key, {
      lifespan: 900,
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      gravityY: -40,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x00ff88, 0x00ffcc, 0xffffff],
      quantity: 14,
      frequency: -1
    });

    this.scene.time.delayedCall(1200, () => this.scene.textures.exists(key) && this.scene.textures.remove(key));
  }

  public update(time: number, delta: number): void {
    if (this.isDead || this.reachedEnd) return;

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= delta;
      if (this.hitFlashTime <= 0) {
        this.drawBody();
      }
    }

    if (this.shieldBrokenFlash > 0) {
      this.shieldBrokenFlash -= delta;
      this.drawBody();
      this.drawBars();
    }

    if (this.stats.type === 'worm') {
      this.trailTimer += delta;
      if (this.trailTimer > 30) {
        this.trailTimer = 0;
        this.drawBody();
      }
    }

    if (this.pathIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      return;
    }

    const from = this.path[this.pathIndex];
    const to = this.path[this.pathIndex + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.pathProgress += (this.stats.speed * delta) / 1000;

    if (this.pathProgress >= dist) {
      this.pathProgress -= dist;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.reachedEnd = true;
        this.x = to.x;
        this.y = to.y;
        return;
      }
    }

    const nextFrom = this.path[this.pathIndex];
    const nextTo = this.path[this.pathIndex + 1];
    const ndx = nextTo.x - nextFrom.x;
    const ndy = nextTo.y - nextFrom.y;
    const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
    const t = this.pathProgress / ndist;

    this.x = nextFrom.x + ndx * t;
    this.y = nextFrom.y + ndy * t;
    this.angle = Math.atan2(ndy, ndx);
    this.setRotation(this.angle);
  }

  public destroy(fromScene?: boolean): void {
    if (this.trailEmitter) this.trailEmitter.destroy();
    this.bodySprite.destroy();
    this.shieldBar.destroy();
    this.healthBar.destroy();
    super.destroy(fromScene);
  }
}
