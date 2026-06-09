import Phaser from 'phaser';

type GameEvent = 'scoreUpdate' | 'fuelUpdate' | 'gameOver' | 'gameStart';
type EventCallback = (event: GameEvent, data?: Record<string, number>) => void;

const CONFIG = {
  GRAVITY: 0.85,
  JUMP_FORCE: -16,
  MOVE_SPEED: 6,
  FRICTION: 0.92,
  MAX_SPEED: 12,
  ACCELERATION: 0.08,
  BASE_SCROLL_SPEED: 4,
  MAX_SCROLL_SPEED: 14,
  FUEL_CONSUMPTION: 0.06,
  FUEL_PICKUP: 35,
  OBSTACLE_POOL_SIZE: 80,
  FUEL_POOL_SIZE: 40,
  GROUND_Y: 0.75,
  BIKE_WIDTH: 70,
  BIKE_HEIGHT: 40,
  LANE_COUNT: 3,
  MIN_OBSTACLE_GAP: 180,
  MAX_OBSTACLE_GAP: 360,
  SCORE_PER_100M: 100
};

interface GameObject extends Phaser.GameObjects.Container {
  active: boolean;
  type?: string;
  reset?: () => void;
}

class WastelandScene extends Phaser.Scene {
  private eventCallback: EventCallback;

  private bike!: Phaser.GameObjects.Container;
  private bikeBody!: { x: number; y: number; vx: number; vy: number; onGround: boolean; rotation: number };
  private bikeSprite!: Phaser.GameObjects.Graphics;
  private exhaust!: Phaser.GameObjects.Particles.ParticleEmitter;

  private obstacles: GameObject[] = [];
  private fuelCans: GameObject[] = [];
  private groundTiles: Phaser.GameObjects.TileSprite[] = [];
  private roadMarkings: Phaser.GameObjects.Rectangle[] = [];

  private scrollSpeed: number = CONFIG.BASE_SCROLL_SPEED;
  private distance: number = 0;
  private score: number = 0;
  private fuel: number = 100;
  private lastScoreMilestone: number = 0;
  private gameTime: number = 0;
  private isPlaying: boolean = false;
  private isGameOver: boolean = false;

  private lastObstacleX: number = 0;
  private nextObstacleGap: number = CONFIG.MIN_OBSTACLE_GAP;

  private screenShake: number = 0;
  private redFlash: number = 0;
  private flashGraphics!: Phaser.GameObjects.Graphics;

  private leftPressed: boolean = false;
  private rightPressed: boolean = false;
  private jumpPressed: boolean = false;

  private audioContext!: AudioContext;
  private crashBuffer!: AudioBuffer;
  private pickupBuffer!: AudioBuffer;
  private engineStopBuffer!: AudioBuffer;

  private _width: number = 0;
  private _height: number = 0;
  private groundLevel: number = 0;

  constructor(callback: EventCallback) {
    super('WastelandScene');
    this.eventCallback = callback;
  }

  preload(): void {}

  create(): void {
    this._width = this.scale.width;
    this._height = this.scale.height;
    this.groundLevel = this._height * CONFIG.GROUND_Y;

    this.initAudio();
    this.createBackground();
    this.createGround();
    this.createBike();
    this.createParticleEffects();
    this.createObjectPools();
    this.createFlashOverlay();
    this.setupInput();

    this.cameras.main.setBackgroundColor('#0a0806');
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.crashBuffer = this.generateCrashSound();
      this.pickupBuffer = this.generatePickupSound();
      this.engineStopBuffer = this.generateEngineStopSound();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  private generateCrashSound(): AudioBuffer {
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / duration, 2) * 0.8;
    }
    return buffer;
  }

  private generatePickupSound(): AudioBuffer {
    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 800 + 1200 * (t / duration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.pow(1 - t / duration, 1.5) * 0.4;
    }
    return buffer;
  }

  private generateEngineStopSound(): AudioBuffer {
    const duration = 1.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 120 * Math.pow(0.3, t / duration);
      data[i] = (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(4 * Math.PI * freq * t)) * Math.pow(1 - t / duration, 0.8) * 0.5;
    }
    return buffer;
  }

  private playSound(buffer: AudioBuffer): void {
    if (!this.audioContext) return;
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioContext.createGain();
      gain.gain.value = 0.3;
      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start();
    } catch (e) { /* noop */ }
  }

  private createBackground(): void {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a1008, 0x2a1810, 0x0a0604, 0x1a1008, 1);
    sky.fillRect(0, 0, this._width, this.groundLevel);

    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * this._width + Phaser.Math.Between(-50, 50);
      const h = Phaser.Math.Between(40, 120);
      const w = Phaser.Math.Between(60, 150);
      const ruin = this.add.graphics();
      const color = Phaser.Display.Color.GetColor(30 + Phaser.Math.Between(0, 20), 20 + Phaser.Math.Between(0, 15), 15 + Phaser.Math.Between(0, 10));
      ruin.fillStyle(color, 0.6);
      ruin.fillRect(x, this.groundLevel - h, w, h);
      ruin.lineStyle(2, 0x0a0604, 0.4);
      ruin.strokeRect(x, this.groundLevel - h, w, h);
    }

    const sun = this.add.graphics();
    const sunGradient = sun.createLinearGradient(this._width * 0.8, this._height * 0.15, this._width * 0.8 + 100, this._height * 0.15 + 100);
    sunGradient.addColorStop(0, 0xff6b35);
    sunGradient.addColorStop(0.5, 0xff4500);
    sunGradient.addColorStop(1, 0x8b0000);
    sun.fillGradientStyle(sunGradient);
    sun.fillCircle(this._width * 0.8, this._height * 0.18, 45);

    const haze = this.add.graphics();
    haze.fillStyle(0x8b4513, 0.08);
    haze.fillRect(0, this.groundLevel - 150, this._width, 150);
  }

  private createGround(): void {
    const groundH = this._height - this.groundLevel;

    const roadBase = this.add.tileSprite(0, this.groundLevel, this._width, groundH, '__EMPTY').setOrigin(0, 0);
    const roadTex = this.createRoadTexture();
    roadBase.setTexture(roadTex);
    this.groundTiles.push(roadBase);

    const curbTop = this.add.graphics();
    curbTop.lineStyle(3, 0x5a4a3a, 1);
    curbTop.lineBetween(0, this.groundLevel, this._width, this.groundLevel);

    const markingCount = 12;
    for (let i = 0; i < markingCount; i++) {
      const mark = this.add.rectangle(
        (i / markingCount) * this._width * 2,
        this.groundLevel + groundH * 0.45,
        60, 4, 0x6b5a4a, 0.4
      ).setOrigin(0, 0.5);
      this.roadMarkings.push(mark);
    }

    for (let i = 0; i < 30; i++) {
      const crack = this.add.graphics();
      crack.lineStyle(1, 0x0a0604, Phaser.Math.FloatBetween(0.3, 0.7));
      const cx = Phaser.Math.Between(0, this._width * 2);
      const cy = this.groundLevel + Phaser.Math.Between(10, groundH - 10);
      crack.beginPath();
      crack.moveTo(cx, cy);
      for (let j = 0; j < 5; j++) {
        crack.lineTo(cx + Phaser.Math.Between(-8, 8), cy + Phaser.Math.Between(-6, 6));
      }
      crack.strokePath();
      this.roadMarkings.push(crack as unknown as Phaser.GameObjects.Rectangle);
    }
  }

  private createRoadTexture(): Phaser.Texture {
    const tex = this.textures.createCanvas('roadTex', 512, 200);
    const ctx = (tex as Phaser.Textures.CanvasTexture).getContext();

    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, '#3a2e24');
    grad.addColorStop(0.3, '#2a2018');
    grad.addColorStop(1, '#1a1410');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 200);

    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 200);
      ctx.lineTo(Math.random() * 512, Math.random() * 200);
      ctx.stroke();
    }

    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${Phaser.Math.Between(10,30)}, ${Phaser.Math.Between(8,20)}, ${Phaser.Math.Between(6,14)}, ${Phaser.Math.FloatBetween(0.2, 0.5)})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 200, Phaser.Math.Between(2, 12), Phaser.Math.Between(2, 8));
    }

    ctx.fillStyle = 'rgba(160, 82, 45, 0.06)';
    ctx.fillRect(0, 0, 512, 200);

    tex.refresh();
    return tex;
  }

  private createBike(): void {
    this.bike = this.add.container(this._width * 0.25, this.groundLevel - CONFIG.BIKE_HEIGHT / 2);
    this.bike.setDepth(10);

    this.bikeSprite = this.add.graphics();
    this.bike.add(this.bikeSprite);

    this.bikeBody = {
      x: this._width * 0.25,
      y: this.groundLevel - CONFIG.BIKE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      onGround: true,
      rotation: 0
    };

    this.drawBike();
  }

  private drawBike(): void {
    const g = this.bikeSprite;
    g.clear();

    const w = CONFIG.BIKE_WIDTH;
    const h = CONFIG.BIKE_HEIGHT;

    g.fillStyle(0x2a1a0a);
    g.fillEllipse(-w * 0.3, h * 0.25, 22, 22);
    g.fillStyle(0x1a0f08);
    g.fillEllipse(-w * 0.3, h * 0.25, 14, 14);
    g.lineStyle(2, 0x5a4a3a);
    g.strokeEllipse(-w * 0.3, h * 0.25, 22, 22);

    g.fillStyle(0x2a1a0a);
    g.fillEllipse(w * 0.3, h * 0.25, 22, 22);
    g.fillStyle(0x1a0f08);
    g.fillEllipse(w * 0.3, h * 0.25, 14, 14);
    g.lineStyle(2, 0x5a4a3a);
    g.strokeEllipse(w * 0.3, h * 0.25, 22, 22);

    g.fillStyle(0x6b3a1a);
    g.fillRect(-w * 0.35, -h * 0.05, w * 0.7, 8);

    g.fillStyle(0x8b4513);
    g.fillRect(-w * 0.15, -h * 0.35, w * 0.45, h * 0.35);
    g.lineStyle(2, 0x3a1d08);
    g.strokeRect(-w * 0.15, -h * 0.35, w * 0.45, h * 0.35);

    g.fillStyle(0x5a2d0a);
    g.fillRect(w * 0.05, -h * 0.3, w * 0.2, h * 0.18);

    g.fillStyle(0xd4a574);
    g.fillRect(-w * 0.08, -h * 0.3, w * 0.1, h * 0.08);

    g.lineStyle(3, 0x4a3a2a);
    g.lineBetween(-w * 0.25, 0, -w * 0.15, -h * 0.35);
    g.lineBetween(w * 0.15, 0, w * 0.25, -h * 0.2);

    g.fillStyle(0xffd700);
    g.fillCircle(w * 0.25, -h * 0.15, 4);
    g.fillStyle(0xff4500);
    g.fillCircle(-w * 0.38, h * 0.05, 3);
  }

  private createParticleEffects(): void {
    const particles = this.add.particles(0, 0, '__EMPTY', {
      lifespan: { min: 200, max: 500 },
      speed: { min: 20, max: 80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });

    const smokeTex = this.createSmokeTexture();
    particles.setTexture(smokeTex);

    this.exhaust = particles.createEmitter({
      x: this.bikeBody.x - CONFIG.BIKE_WIDTH * 0.45,
      y: this.groundLevel - CONFIG.BIKE_HEIGHT * 0.3,
      angle: { min: 160, max: 200 },
      speed: { min: 15, max: 40 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 0.3, end: 1.2 },
      alpha: { start: 0.5, end: 0 },
      quantity: 1,
      frequency: 80,
      on: false
    });
  }

  private createSmokeTexture(): Phaser.Texture {
    const tex = this.textures.createCanvas('smokeTex', 32, 32);
    const ctx = (tex as Phaser.Textures.CanvasTexture).getContext();
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    grad.addColorStop(0, 'rgba(180,160,140,0.9)');
    grad.addColorStop(0.5, 'rgba(100,80,60,0.5)');
    grad.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    tex.refresh();
    return tex;
  }

  private createObjectPools(): void {
    for (let i = 0; i < CONFIG.OBSTACLE_POOL_SIZE; i++) {
      const obj = this.createObstacle();
      obj.active = false;
      obj.setVisible(false);
      this.obstacles.push(obj);
    }
    for (let i = 0; i < CONFIG.FUEL_POOL_SIZE; i++) {
      const obj = this.createFuelCan();
      obj.active = false;
      obj.setVisible(false);
      this.fuelCans.push(obj);
    }
  }

  private createObstacle(): GameObject {
    const container = this.add.container(-1000, 0) as GameObject;
    container.type = 'wreck';

    const type = Phaser.Math.Between(0, 2);
    const g = this.add.graphics();

    if (type === 0) {
      container.type = 'wreck';
      const w = Phaser.Math.Between(50, 90);
      const h = Phaser.Math.Between(30, 55);
      g.fillStyle(0x5a3a2a);
      g.fillRect(-w / 2, -h, w, h);
      g.fillStyle(0x3a2418);
      g.fillRect(-w / 2 + 4, -h + 4, w - 8, 6);
      g.lineStyle(2, 0x1a0f08);
      g.strokeRect(-w / 2, -h, w, h);
      g.fillStyle(0x8b4513);
      for (let i = 0; i < 3; i++) {
        g.fillRect(-w / 2 + 8 + i * 18, -h + 14, 8, 10);
      }
      container.setData('width', w);
      container.setData('height', h);
    } else if (type === 1) {
      container.type = 'crack';
      const w = Phaser.Math.Between(60, 120);
      const h = Phaser.Math.Between(8, 15);
      g.fillStyle(0x0a0604);
      g.fillEllipse(0, -h / 2, w, h);
      g.lineStyle(2, 0x2a1810);
      g.strokeEllipse(0, -h / 2, w, h);
      container.setData('width', w);
      container.setData('height', h);
    } else {
      container.type = 'rock';
      const size = Phaser.Math.Between(25, 45);
      g.fillStyle(0x4a3a2a);
      g.fillCircle(-size * 0.2, -size * 0.6, size * 0.7);
      g.fillStyle(0x5a4a3a);
      g.fillCircle(size * 0.3, -size * 0.5, size * 0.6);
      g.lineStyle(2, 0x1a0f08);
      g.strokeCircle(-size * 0.2, -size * 0.6, size * 0.7);
      container.setData('width', size * 1.5);
      container.setData('height', size);
    }

    container.add(g);
    container.setDepth(5);
    container.reset = () => {
      container.type = ['wreck', 'crack', 'rock'][Phaser.Math.Between(0, 2)];
      g.clear();
      if (container.type === 'wreck') {
        const w = Phaser.Math.Between(50, 90);
        const h = Phaser.Math.Between(30, 55);
        g.fillStyle(0x5a3a2a);
        g.fillRect(-w / 2, -h, w, h);
        g.fillStyle(0x3a2418);
        g.fillRect(-w / 2 + 4, -h + 4, w - 8, 6);
        g.lineStyle(2, 0x1a0f08);
        g.strokeRect(-w / 2, -h, w, h);
        g.fillStyle(0x8b4513);
        for (let i = 0; i < 3; i++) {
          g.fillRect(-w / 2 + 8 + i * 18, -h + 14, 8, 10);
        }
        container.setData('width', w);
        container.setData('height', h);
      } else if (container.type === 'crack') {
        const w = Phaser.Math.Between(60, 120);
        const h = Phaser.Math.Between(8, 15);
        g.fillStyle(0x0a0604);
        g.fillEllipse(0, -h / 2, w, h);
        g.lineStyle(2, 0x2a1810);
        g.strokeEllipse(0, -h / 2, w, h);
        container.setData('width', w);
        container.setData('height', h);
      } else {
        const size = Phaser.Math.Between(25, 45);
        g.fillStyle(0x4a3a2a);
        g.fillCircle(-size * 0.2, -size * 0.6, size * 0.7);
        g.fillStyle(0x5a4a3a);
        g.fillCircle(size * 0.3, -size * 0.5, size * 0.6);
        g.lineStyle(2, 0x1a0f08);
        g.strokeCircle(-size * 0.2, -size * 0.6, size * 0.7);
        container.setData('width', size * 1.5);
        container.setData('height', size);
      }
    };
    return container;
  }

  private createFuelCan(): GameObject {
    const container = this.add.container(-1000, 0) as GameObject;
    const g = this.add.graphics();

    const w = 24;
    const h = 36;
    g.fillStyle(0xdaa520);
    g.fillRect(-w / 2, -h, w, h);
    g.fillStyle(0x8b6914);
    g.fillRect(-w / 2, -h, w, 6);
    g.fillStyle(0xffd700);
    g.fillRect(-w / 2 + 3, -h + 10, w - 6, h - 16);
    g.fillStyle(0x8b0000);
    g.fillRect(-4, -h + 16, 8, 3);
    g.fillRect(-4, -h + 22, 8, 3);
    g.lineStyle(1, 0x4a3a00);
    g.strokeRect(-w / 2, -h, w, h);

    const glow = this.add.graphics();
    glow.fillStyle(0xffd700, 0);
    glow.fillCircle(0, -h / 2, 30);

    container.add([glow, g]);
    container.setDepth(6);
    container.setData('width', w);
    container.setData('height', h);
    container.setData('glow', glow);
    return container;
  }

  private createFlashOverlay(): void {
    this.flashGraphics = this.add.graphics();
    this.flashGraphics.setDepth(100);
    this.flashGraphics.setScrollFactor(0);
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-LEFT', () => { this.leftPressed = true; });
    this.input.keyboard!.on('keyup-LEFT', () => { this.leftPressed = false; });
    this.input.keyboard!.on('keydown-RIGHT', () => { this.rightPressed = true; });
    this.input.keyboard!.on('keyup-RIGHT', () => { this.rightPressed = false; });
    this.input.keyboard!.on('keydown-SPACE', () => { this.jumpPressed = true; });
    this.input.keyboard!.on('keyup-SPACE', () => { this.jumpPressed = false; });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      if (pointer.y < this._height * 0.5) {
        this.jumpPressed = true;
      } else {
        if (pointer.x < this._width * 0.5) this.leftPressed = true;
        else this.rightPressed = true;
      }
    });
    this.input.on('pointerup', () => {
      this.leftPressed = false;
      this.rightPressed = false;
      this.jumpPressed = false;
    });
  }

  public startGame(): void {
    this.isPlaying = true;
    this.isGameOver = false;
    this.distance = 0;
    this.score = 0;
    this.fuel = 100;
    this.scrollSpeed = CONFIG.BASE_SCROLL_SPEED;
    this.gameTime = 0;
    this.lastScoreMilestone = 0;
    this.screenShake = 0;
    this.redFlash = 0;
    this.lastObstacleX = this._width + 200;
    this.nextObstacleGap = CONFIG.MIN_OBSTACLE_GAP;

    this.bikeBody.x = this._width * 0.25;
    this.bikeBody.y = this.groundLevel - CONFIG.BIKE_HEIGHT / 2;
    this.bikeBody.vx = 0;
    this.bikeBody.vy = 0;
    this.bikeBody.onGround = true;
    this.bikeBody.rotation = 0;

    this.obstacles.forEach(o => { o.active = false; o.setVisible(false); o.setX(-1000); });
    this.fuelCans.forEach(f => { f.active = false; f.setVisible(false); f.setX(-1000); });

    this.exhaust.start();
    this.eventCallback('gameStart');
  }

  public restartGame(): void {
    this.startGame();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 33) / 16.67;

    if (!this.isPlaying || this.isGameOver) return;

    this.gameTime += delta;

    this.updateBike(dt);
    this.updateScrolling(dt);
    this.updateDistanceAndScore(dt);
    this.updateFuel(dt);
    this.spawnObjects(dt);
    this.updateObstacles(dt);
    this.updateFuelCans(dt);
    this.checkCollisions();
    this.updateEffects(dt);

    if (this.fuel <= 0) {
      this.triggerGameOver();
    }
  }

  private updateBike(dt: number): void {
    const body = this.bikeBody;

    if (this.leftPressed) body.vx -= CONFIG.MOVE_SPEED * 0.15 * dt;
    if (this.rightPressed) body.vx += CONFIG.MOVE_SPEED * 0.15 * dt;
    body.vx *= Math.pow(CONFIG.FRICTION, dt);
    body.vx = Phaser.Math.Clamp(body.vx, -CONFIG.MAX_SPEED, CONFIG.MAX_SPEED);

    if (this.jumpPressed && body.onGround) {
      body.vy = CONFIG.JUMP_FORCE;
      body.onGround = false;
      this.spawnDust();
    }

    if (!body.onGround) {
      body.vy += CONFIG.GRAVITY * dt;
      body.rotation += body.vx * 0.01 * dt;
    } else {
      body.rotation *= Math.pow(0.85, dt);
    }

    body.x += body.vx * dt;
    body.y += body.vy * dt;

    const minX = 60;
    const maxX = this._width - 60;
    if (body.x < minX) { body.x = minX; body.vx = 0; }
    if (body.x > maxX) { body.x = maxX; body.vx = 0; }

    const groundY = this.groundLevel - CONFIG.BIKE_HEIGHT / 2;
    if (body.y >= groundY) {
      body.y = groundY;
      body.vy = 0;
      body.onGround = true;
    }

    this.bike.setPosition(body.x, body.y);
    this.bike.setRotation(body.rotation);

    this.exhaust.setPosition(body.x - CONFIG.BIKE_WIDTH * 0.45, body.y + CONFIG.BIKE_HEIGHT * 0.1);
  }

  private spawnDust(): void {
    for (let i = 0; i < 8; i++) {
      const dust = this.add.circle(
        this.bikeBody.x + Phaser.Math.Between(-20, 10),
        this.groundLevel - 5,
        Phaser.Math.Between(3, 8),
        0x6b5a4a,
        0.7
      );
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-40, 20),
        y: dust.y - Phaser.Math.Between(10, 30),
        alpha: 0,
        scale: 1.5,
        duration: 400,
        onComplete: () => dust.destroy()
      });
    }
  }

  private updateScrolling(dt: number): void {
    const targetSpeed = Math.min(
      CONFIG.BASE_SCROLL_SPEED + this.gameTime * 0.00008,
      CONFIG.MAX_SCROLL_SPEED
    );
    this.scrollSpeed += (targetSpeed - this.scrollSpeed) * 0.02 * dt;

    this.groundTiles.forEach(tile => {
      tile.tilePositionX += this.scrollSpeed * dt;
    });

    this.roadMarkings.forEach(m => {
      m.x -= this.scrollSpeed * dt;
      if (m.x < -100) m.x += this._width * 2;
    });
  }

  private updateDistanceAndScore(dt: number): void {
    this.distance += this.scrollSpeed * 0.15 * dt;
    const currentMilestone = Math.floor(this.distance / 100);
    if (currentMilestone > this.lastScoreMilestone) {
      const gained = (currentMilestone - this.lastScoreMilestone) * CONFIG.SCORE_PER_100M;
      this.score += gained;
      this.lastScoreMilestone = currentMilestone;
      this.eventCallback('scoreUpdate', { score: this.score, distance: this.distance });
    }
  }

  private updateFuel(dt: number): void {
    const consumption = CONFIG.FUEL_CONSUMPTION * (1 + this.scrollSpeed * 0.03) * dt;
    this.fuel = Math.max(0, this.fuel - consumption);
    this.eventCallback('fuelUpdate', { fuel: this.fuel });
  }

  private spawnObjects(_dt: number): void {
    this.lastObstacleX -= this.scrollSpeed * _dt;
    if (this.lastObstacleX <= this._width - this.nextObstacleGap) {
      this.spawnObstacle();
      const difficultyFactor = Math.min(1, this.gameTime / 60000);
      const minGap = CONFIG.MIN_OBSTACLE_GAP - difficultyFactor * 60;
      const maxGap = CONFIG.MAX_OBSTACLE_GAP - difficultyFactor * 120;
      this.nextObstacleGap = Phaser.Math.Between(minGap, maxGap);
      this.lastObstacleX = this._width;

      if (Math.random() < 0.35) {
        this.spawnFuelCan();
      }
    }
  }

  private spawnObstacle(): void {
    const obstacle = this.obstacles.find(o => !o.active);
    if (!obstacle) return;

    obstacle.reset?.();
    obstacle.active = true;
    obstacle.setVisible(true);

    const h = obstacle.getData('height') as number;
    const side = Phaser.Math.Between(0, 2);
    const laneX = this._width * 0.2 + side * (this._width * 0.25);
    obstacle.setPosition(laneX + Phaser.Math.Between(-30, 30), this.groundLevel);
    obstacle.setData('baseY', this.groundLevel);
    obstacle.setData('objHeight', h);
  }

  private spawnFuelCan(): void {
    const can = this.fuelCans.find(f => !f.active);
    if (!can) return;

    can.active = true;
    can.setVisible(true);
    const side = Math.random() < 0.5 ? 0.1 : 0.85;
    can.setPosition(
      this._width * side + Phaser.Math.Between(-20, 20),
      this.groundLevel - Phaser.Math.Between(30, 80)
    );
  }

  private updateObstacles(dt: number): void {
    this.obstacles.forEach(o => {
      if (!o.active) return;
      o.x -= this.scrollSpeed * dt;
      if (o.x < -100) {
        o.active = false;
        o.setVisible(false);
      }
    });
  }

  private updateFuelCans(dt: number): void {
    this.fuelCans.forEach(f => {
      if (!f.active) return;
      f.x -= this.scrollSpeed * dt;
      const floatY = Math.sin((this.gameTime + f.x) * 0.005) * 5;
      f.y = (f.getData('baseY') || f.y) + floatY;
      if (!f.getData('baseY')) f.setData('baseY', f.y - floatY);

      const glow = f.getData('glow') as Phaser.GameObjects.Graphics;
      if (glow) {
        glow.clear();
        const glowAlpha = 0.2 + Math.sin(this.gameTime * 0.01) * 0.1;
        glow.fillStyle(0xffd700, glowAlpha);
        glow.fillCircle(0, -18, 35);
      }

      if (f.x < -50) {
        f.active = false;
        f.setVisible(false);
      }
    });
  }

  private checkCollisions(): void {
    const bx = this.bikeBody.x;
    const by = this.bikeBody.y;
    const bw = CONFIG.BIKE_WIDTH * 0.6;
    const bh = CONFIG.BIKE_HEIGHT * 0.7;

    for (const o of this.obstacles) {
      if (!o.active) continue;
      const ow = o.getData('width') as number;
      const oh = o.getData('height') as number;
      const ox = o.x;
      const oy = o.y - oh / 2;

      if (
        bx + bw / 2 > ox - ow / 2 &&
        bx - bw / 2 < ox + ow / 2 &&
        by + bh / 2 > oy - oh / 2 &&
        by - bh / 2 < oy + oh / 2
      ) {
        if (o.type === 'crack' && !this.bikeBody.onGround) continue;
        this.onCollision();
        o.active = false;
        o.setVisible(false);
        break;
      }
    }

    for (const f of this.fuelCans) {
      if (!f.active) continue;
      const fx = f.x;
      const fy = f.y - 18;
      const dist = Phaser.Math.Distance.Between(bx, by, fx, fy);
      if (dist < 45) {
        this.onFuelPickup();
        f.active = false;
        f.setVisible(false);
      }
    }
  }

  private onCollision(): void {
    this.screenShake = 12;
    this.redFlash = 1;
    this.fuel = Math.max(0, this.fuel - 18);
    this.playSound(this.crashBuffer);
    this.bikeBody.vx += Phaser.Math.Between(-3, 3);
    this.bikeBody.vy = -6;
    this.bikeBody.onGround = false;

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  private onFuelPickup(): void {
    this.fuel = Math.min(100, this.fuel + CONFIG.FUEL_PICKUP);
    this.playSound(this.pickupBuffer);
    this.eventCallback('fuelUpdate', { fuel: this.fuel });

    const bx = this.bikeBody.x;
    const by = this.bikeBody.y;
    for (let i = 0; i < 12; i++) {
      const spark = this.add.circle(bx, by, 3, 0xffd700, 1);
      const angle = (i / 12) * Math.PI * 2;
      this.tweens.add({
        targets: spark,
        x: bx + Math.cos(angle) * 50,
        y: by + Math.sin(angle) * 50,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        onComplete: () => spark.destroy()
      });
    }
  }

  private updateEffects(dt: number): void {
    if (this.screenShake > 0) {
      const shakeX = Phaser.Math.Between(-this.screenShake, this.screenShake);
      const shakeY = Phaser.Math.Between(-this.screenShake, this.screenShake);
      this.cameras.main.setScroll(shakeX, shakeY);
      this.screenShake *= Math.pow(0.85, dt);
      if (this.screenShake < 0.3) {
        this.screenShake = 0;
        this.cameras.main.setScroll(0, 0);
      }
    }

    this.flashGraphics.clear();
    if (this.redFlash > 0) {
      this.flashGraphics.fillStyle(0xff0000, this.redFlash * 0.4);
      this.flashGraphics.fillRect(0, 0, this._width, this._height);
      this.redFlash *= Math.pow(0.88, dt);
      if (this.redFlash < 0.02) this.redFlash = 0;
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;
    this.exhaust.stop();
    this.playSound(this.engineStopBuffer);
    this.eventCallback('gameOver', { score: this.score });

    this.tweens.add({
      targets: this.bike,
      angle: this.bike.angle + 90,
      alpha: 0.6,
      duration: 800,
      ease: 'Cubic.Out'
    });
  }
}

export default class BikeGame {
  private game: Phaser.Game;
  private scene: WastelandScene;

  constructor(container: HTMLElement, callback: EventCallback) {
    const rect = container.getBoundingClientRect();
    const width = rect.width || 1280;
    const height = rect.height || 720;

    this.scene = new WastelandScene(callback);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: width,
      height: height,
      backgroundColor: '#0a0806',
      scene: [this.scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      fps: {
        target: 60,
        forceSetTimeOut: true
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
      }
    };

    this.game = new Phaser.Game(config);

    const handleResize = () => {
      const r = container.getBoundingClientRect();
      this.game.scale.resize(r.width || 1280, r.height || 720);
    };
    window.addEventListener('resize', handleResize);
  }

  public start(): void {
    this.scene.startGame();
  }

  public restart(): void {
    this.scene.restartGame();
  }

  public destroy(): void {
    this.game.destroy(true);
  }
}
