import Phaser from 'phaser';
import type { GameState } from './UIOverlay';

type OreColor = 'blue' | 'green' | 'purple';
type AsteroidSize = 'large' | 'medium' | 'small';

const ASTEROID_CONFIG: Record<AsteroidSize, { diameter: number; hp: number; oreDrop: number }> = {
  large: { diameter: 80, hp: 3, oreDrop: 5 },
  medium: { diameter: 50, hp: 2, oreDrop: 3 },
  small: { diameter: 30, hp: 1, oreDrop: 1 }
};

const COLOR_MAP: Record<OreColor, { main: number; light: number; glow: number }> = {
  blue: { main: 0x3a7bd5, light: 0x8ed0ff, glow: 0x00aaff },
  green: { main: 0x2ecc71, light: 0xa8ffcc, glow: 0x00ff88 },
  purple: { main: 0x9b59b6, light: 0xe0a8ff, glow: 0xaa55ff }
};

const ORE_COLORS: OreColor[] = ['blue', 'green', 'purple'];

interface AsteroidData {
  size: AsteroidSize;
  hp: number;
  color: OreColor;
  maxHp: number;
}

export class GameScene extends Phaser.Scene {
  private ship!: Phaser.Physics.Arcade.Image;
  private shipAngle = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private asteroids!: Phaser.Physics.Arcade.Group;
  private meteors!: Phaser.Physics.Arcade.Group;
  private beams!: Phaser.Physics.Arcade.Group;
  private orePickups!: Phaser.Physics.Arcade.Group;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private meteorTimer!: Phaser.Time.TimerEvent;
  private asteroidTimer!: Phaser.Time.TimerEvent;
  private shieldGraphics!: Phaser.GameObjects.Graphics;
  private lastFireTime = 0;
  private invincibleUntil = 0;
  private shieldActive = false;
  private shieldEndAt = 0;
  private currentBeamColor: OreColor = 'blue';
  private shakeUntil = 0;
  private shakeIntensity = 0;
  private baseCameraX = 0;
  private baseCameraY = 0;

  private state: GameState = {
    ores: { blue: 0, green: 0, purple: 0 },
    lives: 3,
    maxLives: 3,
    score: 0,
    shieldActive: false,
    shieldTimeLeft: 0,
    gameOver: false,
    currentBeamColor: 'blue'
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createStarfield();
    this.createShip();
    this.createGroups();
    this.createShieldGraphics();
    this.createInput();
    this.createTimers();
    this.game.events.on('restartGame', this.restartGame, this);
    this.baseCameraX = this.cameras.main.x;
    this.baseCameraY = this.cameras.main.y;

    for (let i = 0; i < 6; i++) {
      this.spawnAsteroid();
    }
    this.emitState();
  }

  private createStarfield(): void {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x0a1628, 0x120a2a, 0x061228, 1);
    bg.fillRect(0, 0, width, height);
    bg.setScrollFactor(0);
    bg.setDepth(-10);

    this.particles = this.add.particles(0, 0, '');
    this.stars = this.particles.createEmitter({
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 2000, max: 4000 },
      speed: 0,
      scale: { min: 0.3, max: 1.2 },
      quantity: 120,
      alpha: { min: 0.2, max: 1 },
      tint: [0xffffff, 0xaad4ff, 0xffd4aa],
      blendMode: 'ADD',
      frequency: 100,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, width, height) }
    });
    this.stars.start();
    this.stars.setScrollFactor(0);
    this.stars.setDepth(-5);

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      bg.clear();
      bg.fillGradientStyle(0x1a0a2e, 0x0a1628, 0x120a2a, 0x061228, 1);
      bg.fillRect(0, 0, size.width, size.height);
      this.stars.setEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(0, 0, size.width, size.height) });
    });
  }

  private createShip(): void {
    const { width, height } = this.scale;
    const key = '__ship_gfx__';
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.lineStyle(0, 0, 0);
      const grd = g.createLinearGradient(0, -20, 0, 20);
      grd.addColorStop(0, 0x00ffcc);
      grd.addColorStop(0.5, 0x00aaff);
      grd.addColorStop(1, 0x0066ff);
      g.fillGradientStyle(0x00ffcc, 0x00aaff, 0x0066ff, 0x0088cc, 1);
      g.beginPath();
      g.moveTo(0, -22);
      g.lineTo(16, 18);
      g.lineTo(0, 10);
      g.lineTo(-16, 18);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0x88ffff, 0.8);
      g.strokePath();
      g.fillStyle(0xaaffff, 0.9);
      g.fillCircle(0, -4, 4);
      g.generateTexture(key, 50, 50);
      g.destroy();
    }
    this.ship = this.physics.add.image(width / 2, height / 2, key);
    this.ship.setDamping(true);
    this.ship.setDrag(0.92, 0.92);
    this.ship.setMaxVelocity(380);
    this.ship.setCollideWorldBounds(true);
    this.ship.setBounce(0.2);
    this.ship.setBodySize(28, 36, true);
    this.ship.setDepth(10);
  }

  private createGroups(): void {
    this.asteroids = this.physics.add.group({
      maxSize: 40,
      allowGravity: false,
      immovable: false
    });

    this.meteors = this.physics.add.group({
      maxSize: 30,
      allowGravity: false
    });

    this.beams = this.physics.add.group({
      maxSize: 30,
      allowGravity: false
    });

    this.orePickups = this.physics.add.group({
      maxSize: 80,
      allowGravity: false
    });

    this.physics.add.overlap(this.beams, this.asteroids, this.handleBeamHit, undefined, this);
    this.physics.add.overlap(this.ship, this.meteors, this.handleShipHit, undefined, this);
    this.physics.add.overlap(this.ship, this.orePickups, this.handleOrePickup, undefined, this);
  }

  private createShieldGraphics(): void {
    this.shieldGraphics = this.add.graphics();
    this.shieldGraphics.setDepth(9);
  }

  private createInput(): void {
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    };

    this.keys.Q.on('down', () => {
      if (this.state.gameOver) return;
      const idx = ORE_COLORS.indexOf(this.currentBeamColor);
      this.currentBeamColor = ORE_COLORS[(idx + 1) % ORE_COLORS.length];
      this.state.currentBeamColor = this.currentBeamColor;
      this.emitState();
    });
  }

  private createTimers(): void {
    this.meteorTimer = this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: this.spawnMeteor,
      callbackScope: this
    });

    this.asteroidTimer = this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        if (this.asteroids.getLength() < 15) this.spawnAsteroid();
      },
      callbackScope: this
    });
  }

  private spawnAsteroid(size?: AsteroidSize): void {
    const { width, height } = this.scale;
    const actualSize: AsteroidSize = size || (['large', 'medium', 'small'] as AsteroidSize[])[Phaser.Math.Between(0, 2)];
    const cfg = ASTEROID_CONFIG[actualSize];
    const color: OreColor = ORE_COLORS[Phaser.Math.Between(0, 2)];

    let x: number, y: number;
    const side = Phaser.Math.Between(0, 3);
    const padding = 60;
    switch (side) {
      case 0: x = Phaser.Math.Between(padding, width - padding); y = -padding; break;
      case 1: x = width + padding; y = Phaser.Math.Between(padding, height - padding); break;
      case 2: x = Phaser.Math.Between(padding, width - padding); y = height + padding; break;
      default: x = -padding; y = Phaser.Math.Between(padding, height - padding); break;
    }

    const texKey = this.getAsteroidTexture(actualSize, color);
    const asteroid = this.asteroids.get(x, y, texKey) as Phaser.Physics.Arcade.Image;
    if (!asteroid) return;

    asteroid.setActive(true);
    asteroid.setVisible(true);
    asteroid.setCircle(cfg.diameter / 2);
    asteroid.setData({
      size: actualSize,
      hp: cfg.hp,
      color: color,
      maxHp: cfg.hp
    } as AsteroidData);

    const centerX = width / 2 + Phaser.Math.Between(-200, 200);
    const centerY = height / 2 + Phaser.Math.Between(-200, 200);
    const angle = Phaser.Math.Angle.Between(x, y, centerX, centerY);
    const speed = 20 + Phaser.Math.Between(0, 35);
    asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    asteroid.setAngularVelocity(Phaser.Math.Between(-40, 40));
    asteroid.setBounce(0.8);
    asteroid.setCollideWorldBounds(true);
    asteroid.setDepth(5);
  }

  private getAsteroidTexture(size: AsteroidSize, color: OreColor): string {
    const key = `__ast_${size}_${color}__`;
    if (this.textures.exists(key)) return key;
    const cfg = ASTEROID_CONFIG[size];
    const d = cfg.diameter;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const c = COLOR_MAP[color];

    g.fillStyle(c.main, 1);
    g.beginPath();
    const segs = 10;
    const r = d / 2;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rr = r * (0.85 + Math.sin(i * 1.7) * 0.1);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(c.light, 0.55);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - 0.8;
      const rr = r * 0.55;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(-r * 0.35, -r * 0.3, r * 0.18);

    g.lineStyle(2, c.light, 0.7);
    g.strokePath();

    g.generateTexture(key, d + 4, d + 4);
    g.destroy();
    return key;
  }

  private spawnMeteor(): void {
    if (this.state.gameOver) return;
    const { width, height } = this.scale;
    const texKey = this.getMeteorTexture();
    let x: number, y: number;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
      case 0: x = Phaser.Math.Between(0, width); y = -40; break;
      case 1: x = width + 40; y = Phaser.Math.Between(0, height); break;
      case 2: x = Phaser.Math.Between(0, width); y = height + 40; break;
      default: x = -40; y = Phaser.Math.Between(0, height); break;
    }

    const meteor = this.meteors.get(x, y, texKey) as Phaser.Physics.Arcade.Image;
    if (!meteor) return;
    meteor.setActive(true);
    meteor.setVisible(true);
    const size = 35 + Phaser.Math.Between(0, 25);
    meteor.setCircle(size * 0.45);
    meteor.setBodySize(size, size, true);
    const tx = Phaser.Math.Between(width * 0.2, width * 0.8);
    const ty = Phaser.Math.Between(height * 0.2, height * 0.8);
    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 80 + Phaser.Math.Between(0, 80);
    meteor.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    meteor.setAngularVelocity(Phaser.Math.Between(-80, 80));
    meteor.setCollideWorldBounds(false);
    meteor.setDepth(6);

    this.time.delayedCall(15000, () => {
      if (meteor.active) meteor.disableBody(true, true);
    });
  }

  private getMeteorTexture(): string {
    const key = `__meteor_gfx__`;
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4a403a, 1);
    g.beginPath();
    const pts = 9;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 28 + Math.sin(i * 2.3) * 8;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0x2a2420, 0.7);
    g.fillCircle(-10, 5, 7);
    g.fillCircle(8, -8, 5);
    g.fillStyle(0x6a5a50, 0.6);
    g.fillCircle(-5, -12, 4);
    g.lineStyle(2.5, 0xff6633, 0.85);
    g.strokePath();
    g.generateTexture(key, 70, 70);
    g.destroy();
    return key;
  }

  private fireBeam(): void {
    const now = this.time.now;
    if (now - this.lastFireTime < 180) return;
    this.lastFireTime = now;

    const texKey = this.getBeamTexture();
    const beam = this.beams.get(this.ship.x, this.ship.y, texKey) as Phaser.Physics.Arcade.Image;
    if (!beam) return;
    beam.setActive(true);
    beam.setVisible(true);
    beam.setCircle(6);
    beam.setDepth(8);
    const angle = this.ship.rotation - Math.PI / 2;
    const speed = 620;
    beam.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    beam.rotation = this.ship.rotation;
    beam.setData('color', this.currentBeamColor);

    this.time.delayedCall(1200, () => {
      if (beam.active) beam.disableBody(true, true);
    });
  }

  private getBeamTexture(): string {
    const key = `__beam_${this.currentBeamColor}__`;
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const c = COLOR_MAP[this.currentBeamColor];
    g.fillStyle(c.light, 1);
    g.fillRect(-3, -18, 6, 36);
    g.fillStyle(c.main, 0.7);
    g.fillRect(-6, -12, 12, 24);
    g.fillStyle(0xffffff, 0.95);
    g.fillRect(-1.5, -14, 3, 28);
    g.generateTexture(key, 20, 40);
    g.destroy();
    return key;
  }

  private handleBeamHit(beamObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject): void {
    const beam = beamObj as Phaser.Physics.Arcade.Image;
    const asteroid = asteroidObj as Phaser.Physics.Arcade.Image;
    if (!beam.active || !asteroid.active) return;

    const data = asteroid.getData('AsteroidData') || asteroid.data.getAll();
    const astData = (data as unknown) as AsteroidData;
    const beamColor = beam.getData('color') as OreColor;

    const damage = (beamColor === astData.color) ? 2 : 1;
    astData.hp -= damage;

    beam.disableBody(true, true);
    this.spawnHitParticles(asteroid.x, asteroid.y, astData.color);
    this.shakeCamera(3, 150);

    if (astData.hp <= 0) {
      this.destroyAsteroid(asteroid, astData);
    } else {
      asteroid.setScale(1.05);
      this.tweens.add({
        targets: asteroid,
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    }
  }

  private destroyAsteroid(asteroid: Phaser.Physics.Arcade.Image, data: AsteroidData): void {
    const cfg = ASTEROID_CONFIG[data.size];
    this.spawnExplosion(asteroid.x, asteroid.y, data.color);
    this.shakeCamera(8, 350);
    this.spawnOrePickups(asteroid.x, asteroid.y, data.color, cfg.oreDrop);

    if (data.size === 'large') {
      for (let i = 0; i < 2; i++) this.spawnChildAsteroid(asteroid.x, asteroid.y, 'medium', data.color);
    } else if (data.size === 'medium') {
      for (let i = 0; i < 2; i++) this.spawnChildAsteroid(asteroid.x, asteroid.y, 'small', data.color);
    }

    asteroid.disableBody(true, true);
  }

  private spawnChildAsteroid(x: number, y: number, size: AsteroidSize, color: OreColor): void {
    const cfg = ASTEROID_CONFIG[size];
    const texKey = this.getAsteroidTexture(size, color);
    const ast = this.asteroids.get(x, y, texKey) as Phaser.Physics.Arcade.Image;
    if (!ast) return;
    ast.setActive(true);
    ast.setVisible(true);
    ast.setCircle(cfg.diameter / 2);
    ast.setData({ size, hp: cfg.hp, color, maxHp: cfg.hp } as AsteroidData);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = 60 + Phaser.Math.Between(0, 50);
    ast.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    ast.setAngularVelocity(Phaser.Math.Between(-90, 90));
    ast.setBounce(0.8);
    ast.setCollideWorldBounds(true);
    ast.setDepth(5);
  }

  private spawnHitParticles(x: number, y: number, color: OreColor): void {
    const c = COLOR_MAP[color];
    const emitter = this.particles.createEmitter({
      x, y,
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: 400,
      quantity: 8,
      scale: { start: 0.5, end: 0 },
      tint: [c.light, c.main, 0xffffff],
      blendMode: 'ADD',
      on: false
    });
    emitter.explode(8, x, y);
    this.time.delayedCall(500, () => emitter.remove());
  }

  private spawnExplosion(x: number, y: number, color: OreColor): void {
    const c = COLOR_MAP[color];
    const emitter = this.particles.createEmitter({
      x, y,
      speed: { min: 60, max: 240 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 900 },
      quantity: 25,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [c.light, c.main, c.glow, 0xffffff],
      blendMode: 'ADD',
      on: false
    });
    emitter.explode(25, x, y);
    this.time.delayedCall(1000, () => emitter.remove());

    const glow = this.add.circle(x, y, 80, c.main, 0.35);
    glow.setDepth(7);
    this.tweens.add({
      targets: glow,
      scale: { from: 0.3, to: 1.6 },
      alpha: { from: 0.4, to: 0 },
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => glow.destroy()
    });
  }

  private spawnOrePickups(x: number, y: number, color: OreColor, count: number): void {
    for (let i = 0; i < count; i++) {
      const texKey = this.getOreTexture(color);
      const ore = this.orePickups.get(x, y, texKey) as Phaser.Physics.Arcade.Image;
      if (!ore) continue;
      ore.setActive(true);
      ore.setVisible(true);
      ore.setCircle(10);
      ore.setDepth(4);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = 70 + Phaser.Math.Between(0, 90);
      ore.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      ore.setDrag(0.96, 0.96);
      ore.setData('color', color);
      ore.setCollideWorldBounds(true);
      ore.setBounce(0.6);

      this.tweens.add({
        targets: ore,
        scale: { from: 0.3, to: 1 },
        duration: 250,
        ease: 'Back.easeOut'
      });

      this.time.delayedCall(10000, () => {
        if (ore.active) ore.disableBody(true, true);
      });
    }
  }

  private getOreTexture(color: OreColor): string {
    const key = `__ore_${color}__`;
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const c = COLOR_MAP[color];
    g.fillStyle(c.light, 1);
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(8, -3);
    g.lineTo(6, 8);
    g.lineTo(-6, 8);
    g.lineTo(-8, -3);
    g.closePath();
    g.fillPath();
    g.fillStyle(c.main, 0.8);
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(5, -1);
    g.lineTo(3, 5);
    g.lineTo(-3, 5);
    g.lineTo(-5, -1);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-2, -3, 2);
    g.generateTexture(key, 22, 22);
    g.destroy();
    return key;
  }

  private handleShipHit(shipObj: Phaser.GameObjects.GameObject, meteorObj: Phaser.GameObjects.GameObject): void {
    const meteor = meteorObj as Phaser.Physics.Arcade.Image;
    if (!meteor.active) return;
    const now = this.time.now;
    if (this.shieldActive) {
      this.spawnExplosion(meteor.x, meteor.y, 'blue');
      meteor.disableBody(true, true);
      this.shakeCamera(5, 200);
      return;
    }
    if (now < this.invincibleUntil) return;

    meteor.disableBody(true, true);
    this.spawnExplosion(meteor.x, meteor.y, 'blue');
    this.state.lives = Math.max(0, this.state.lives - 1);
    this.invincibleUntil = now + 1500;
    this.shakeCamera(14, 600);

    this.ship.setAlpha(0.3);
    this.tweens.add({
      targets: this.ship,
      alpha: 1,
      yoyo: true,
      repeat: 5,
      duration: 120,
      onComplete: () => { if (this.ship.active) this.ship.setAlpha(1); }
    });

    if (this.state.lives <= 0) {
      this.gameOver();
    }
    this.emitState();
  }

  private handleOrePickup(shipObj: Phaser.GameObjects.GameObject, oreObj: Phaser.GameObjects.GameObject): void {
    const ore = oreObj as Phaser.Physics.Arcade.Image;
    if (!ore.active) return;
    const color = ore.getData('color') as OreColor;
    ore.disableBody(true, true);

    this.state.ores[color]++;
    this.state.score += 10;

    const c = COLOR_MAP[color];
    const pickupEmitter = this.particles.createEmitter({
      x: ore.x,
      y: ore.y,
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      lifespan: 350,
      quantity: 6,
      scale: { start: 0.5, end: 0 },
      tint: [c.light, c.main],
      blendMode: 'ADD',
      on: false
    });
    pickupEmitter.explode(6, ore.x, ore.y);
    this.time.delayedCall(400, () => pickupEmitter.remove());

    this.game.events.emit('bounceScore');

    if (this.state.ores[color] >= 20 && !this.shieldActive) {
      this.state.ores[color] -= 20;
      this.activateShield();
      this.state.score += 50;
    }
    this.emitState();
  }

  private activateShield(): void {
    this.shieldActive = true;
    this.state.shieldActive = true;
    this.shieldEndAt = this.time.now + 8000;
    this.shakeCamera(6, 400);
  }

  private shakeCamera(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeUntil = Math.max(this.shakeUntil, this.time.now + duration);
  }

  private gameOver(): void {
    this.state.gameOver = true;
    this.spawnExplosion(this.ship.x, this.ship.y, 'blue');
    this.ship.setActive(false);
    this.ship.setVisible(false);
    this.shakeCamera(22, 1200);
    this.emitState();
  }

  private restartGame(): void {
    this.asteroids.clear(true, true);
    this.meteors.clear(true, true);
    this.beams.clear(true, true);
    this.orePickups.clear(true, true);

    this.ship.setActive(true);
    this.ship.setVisible(true);
    this.ship.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.ship.setVelocity(0, 0);
    this.ship.setAlpha(1);

    this.state = {
      ores: { blue: 0, green: 0, purple: 0 },
      lives: 3,
      maxLives: 3,
      score: 0,
      shieldActive: false,
      shieldTimeLeft: 0,
      gameOver: false,
      currentBeamColor: this.currentBeamColor
    };
    this.shieldActive = false;
    this.invincibleUntil = 0;

    for (let i = 0; i < 6; i++) this.spawnAsteroid();
    this.emitState();
  }

  private emitState(): void {
    this.state.currentBeamColor = this.currentBeamColor;
    this.state.shieldActive = this.shieldActive;
    this.state.shieldTimeLeft = Math.max(0, this.shieldEndAt - this.time.now);
    this.game.events.emit('updateState', { ...this.state });
  }

  update(_time: number, delta: number): void {
    if (this.state.gameOver) {
      this.updateCameraShake();
      return;
    }
    this.updateShip(delta);
    this.updateBeamColor();
    this.updateShield(delta);
    this.updateCameraShake();
    this.cleanupOffscreenObjects();
    this.emitStateThrottled();
  }

  private emitStateTimer = 0;
  private emitStateThrottled(): void {
    this.emitStateTimer++;
    if (this.emitStateTimer >= 3) {
      this.emitStateTimer = 0;
      this.emitState();
    }
  }

  private updateShip(_delta: number): void {
    const accel = 26;
    const rotSpeed = 0.07;

    if (this.keys.A.isDown) this.ship.rotation -= rotSpeed;
    if (this.keys.D.isDown) this.ship.rotation += rotSpeed;

    if (this.keys.W.isDown) {
      const angle = this.ship.rotation - Math.PI / 2;
      this.ship.setAcceleration(Math.cos(angle) * accel, Math.sin(angle) * accel);
      if (this.time.now % 80 < 20) {
        const thrustEmitter = this.particles.createEmitter({
          x: this.ship.x + Math.cos(this.ship.rotation + Math.PI / 2) * 18,
          y: this.ship.y + Math.sin(this.ship.rotation + Math.PI / 2) * 18,
          speed: { min: 40, max: 100 },
          angle: { min: (this.ship.rotation + Math.PI / 2) * 180 / Math.PI - 20, max: (this.ship.rotation + Math.PI / 2) * 180 / Math.PI + 20 },
          lifespan: 250,
          quantity: 1,
          scale: { start: 0.5, end: 0 },
          tint: [0x88ffff, 0x00aaff, 0xffaa55],
          blendMode: 'ADD',
          on: false
        });
        thrustEmitter.explode(1);
        this.time.delayedCall(300, () => thrustEmitter.remove());
      }
    } else if (this.keys.S.isDown) {
      const angle = this.ship.rotation - Math.PI / 2;
      this.ship.setAcceleration(-Math.cos(angle) * accel * 0.6, -Math.sin(angle) * accel * 0.6);
    } else {
      this.ship.setAcceleration(0, 0);
    }

    if (this.keys.SPACE.isDown) this.fireBeam();
  }

  private updateBeamColor(): void {
    this.currentBeamColor;
  }

  private updateShield(_delta: number): void {
    this.shieldGraphics.clear();
    if (this.shieldActive) {
      if (this.time.now >= this.shieldEndAt) {
        this.shieldActive = false;
        this.state.shieldActive = false;
        return;
      }
      const t = this.time.now / 200;
      const pulse = 1 + Math.sin(t) * 0.08;
      const timeLeft = (this.shieldEndAt - this.time.now) / 8000;
      this.shieldGraphics.lineStyle(3, 0x66ddff, 0.6 + Math.sin(t * 2) * 0.2);
      this.shieldGraphics.strokeCircle(this.ship.x, this.ship.y, 42 * pulse);
      this.shieldGraphics.fillStyle(0x00aaff, 0.12 + Math.sin(t) * 0.05);
      this.shieldGraphics.fillCircle(this.ship.x, this.ship.y, 40 * pulse);
      this.shieldGraphics.lineStyle(1.5, 0xaaffff, 0.5 * timeLeft + 0.2);
      this.shieldGraphics.strokeCircle(this.ship.x, this.ship.y, 46 * pulse);
    }
  }

  private updateCameraShake(): void {
    const now = this.time.now;
    if (now < this.shakeUntil) {
      const remaining = this.shakeUntil - now;
      const intensity = this.shakeIntensity * Math.min(1, remaining / 400);
      const ox = Phaser.Math.FloatBetween(-intensity, intensity);
      const oy = Phaser.Math.FloatBetween(-intensity, intensity);
      this.cameras.main.scrollX = -ox;
      this.cameras.main.scrollY = -oy;
    } else {
      this.cameras.main.scrollX = 0;
      this.cameras.main.scrollY = 0;
      this.shakeIntensity = 0;
    }
  }

  private cleanupOffscreenObjects(): void {
    const { width, height } = this.scale;
    const margin = 120;
    this.meteors.getChildren().forEach((m) => {
      const meteor = m as Phaser.Physics.Arcade.Image;
      if (!meteor.active) return;
      if (meteor.x < -margin || meteor.x > width + margin || meteor.y < -margin || meteor.y > height + margin) {
        meteor.disableBody(true, true);
      }
    });
    this.beams.getChildren().forEach((b) => {
      const beam = b as Phaser.Physics.Arcade.Image;
      if (!beam.active) return;
      if (beam.x < -50 || beam.x > width + 50 || beam.y < -50 || beam.y > height + 50) {
        beam.disableBody(true, true);
      }
    });
  }
}
