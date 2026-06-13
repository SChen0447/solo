import Phaser from 'phaser';
import { GameConfig } from './main';

interface MineralData {
  color: number;
  glowColor: number;
  score: number;
  name: string;
}

const MINERAL_TYPES: MineralData[] = [
  { color: 0xff4444, glowColor: 0xff6666, score: 5, name: '红晶' },
  { color: 0xffd700, glowColor: 0xffee66, score: 10, name: '金晶' },
  { color: 0xaa44ff, glowColor: 0xcc88ff, score: 20, name: '紫晶' }
];

export class Scene_Main extends Phaser.Scene {
  private submarine!: Phaser.GameObjects.Container;
  private submarineBody!: Phaser.GameObjects.Graphics;
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private angleVelocity: number = 0;
  private keys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private bubbleParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private jellyfishParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private minerals: Phaser.GameObjects.Container[] = [];
  private spikes: Phaser.GameObjects.Graphics[] = [];
  private hydroVents: { gfx: Phaser.GameObjects.Graphics; timer: number; active: boolean; particles: Phaser.GameObjects.Particles.ParticleEmitter }[] = [];
  private canyonLeft: Phaser.GameObjects.Graphics[] = [];
  private canyonRight: Phaser.GameObjects.Graphics[] = [];
  private portals: Phaser.GameObjects.Container[] = [];
  private collectParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private audioContext!: AudioContext;
  
  public depth: number = 0;
  public maxDepth: number = 0;
  public oxygen: number = 100;
  public score: number = 0;
  public mineralCount: number = 0;
  public gameOver: boolean = false;
  public gameStarted: boolean = false;
  
  private screenShake: number = 0;
  private damageFlash: number = 0;
  private worldY: number = 0;
  private noiseSeed: number = 0;
  private canyonWidth: number = 500;
  private bubblePool: Phaser.GameObjects.Particles.Particle[] = [];
  
  private collectEffects: { particles: Phaser.GameObjects.Particles.ParticleEmitter; timer: number }[] = [];

  constructor() {
    super({ key: 'Scene_Main' });
  }

  preload(): void {
    this.load.setPath('assets/');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#001a33');
    
    this.initAudio();
    this.createInput();
    this.createSubmarine();
    this.createParticleSystems();
    this.generateTerrain();
    this.generateMinerals();
    this.generateObstacles();
    this.generatePortals();
    this.createJellyfish();
    
    this.cameras.main.startFollow(this.submarine);
    this.cameras.main.setLerp(0.05, 0.05);
    
    this.scene.launch('Scene_UI');
    this.scene.bringToTop('Scene_UI');
    
    this.showStartMenu();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  private playCollectSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1760, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  private playDamageSound(): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  private createInput(): void {
    this.keys = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
      LEFT: this.input.keyboard!.addKey('LEFT'),
      RIGHT: this.input.keyboard!.addKey('RIGHT'),
      UP: this.input.keyboard!.addKey('UP'),
      DOWN: this.input.keyboard!.addKey('DOWN'),
      SPACE: this.input.keyboard!.addKey('SPACE')
    };
  }

  private createSubmarine(): void {
    this.submarine = this.add.container(400, 200);
    
    this.submarineBody = this.add.graphics();
    this.drawSubmarine();
    this.submarine.add(this.submarineBody);
    
    this.submarine.setSize(60, 30);
    this.physics.add.existing(this.submarine);
    const body = this.submarine.body as Phaser.Physics.Arcade.Body;
    body.setCircle(25);
    body.setCollideWorldBounds(false);
    body.setBounce(0.2);
  }

  private drawSubmarine(): void {
    const g = this.submarineBody;
    g.clear();
    
    g.lineStyle(2, 0x64c8ff, 1);
    g.fillStyle(0xa0b8c8, 1);
    
    g.beginPath();
    g.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.fillStyle(0x003355, 1);
    g.beginPath();
    g.arc(0, -6, 10, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.fillStyle(0x64c8ff, 0.6);
    g.beginPath();
    g.ellipse(0, -6, 6, 4, 0, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(0x64c8ff, 1);
    g.fillRect(-22, -3, 6, 6);
    
    g.fillStyle(0x8090a0, 1);
    g.beginPath();
    g.moveTo(28, 0);
    g.lineTo(38, -8);
    g.lineTo(38, 8);
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.lineStyle(1.5, 0x64c8ff, 1);
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(0, -22);
    g.closePath();
    g.strokePath();
    
    g.fillStyle(0xff6b6b, 1);
    g.beginPath();
    g.arc(0, -24, 3, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(0xffd93d, 1);
    g.beginPath();
    g.arc(-12, 0, 2.5, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    g.beginPath();
    g.arc(12, 0, 2.5, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
  }

  private createParticleSystems(): void {
    const bubbleTexture = this.createBubbleTexture();
    
    this.bubbleParticles = this.add.particles(0, 0, bubbleTexture, {
      lifespan: { min: 1500, max: 3000 },
      speed: { min: 20, max: 50 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.3, end: 1 },
      alpha: { start: 0.8, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      frequency: 100
    });
    this.bubbleParticles.stop();
    
    this.collectParticles = this.add.particles(0, 0, bubbleTexture, {
      lifespan: { min: 500, max: 1000 },
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      frequency: -1
    });
    this.collectParticles.stop();
  }

  private createBubbleTexture(): string {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.8);
    g.beginPath();
    g.arc(8, 8, 6, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.arc(6, 6, 2, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    const key = 'bubble_texture';
    g.generateTexture(key, 16, 16);
    g.destroy();
    
    return key;
  }

  private perlinNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    
    const v00 = this.perlinNoise(x0, y0, seed);
    const v10 = this.perlinNoise(x0 + 1, y0, seed);
    const v01 = this.perlinNoise(x0, y0 + 1, seed);
    const v11 = this.perlinNoise(x0 + 1, y0 + 1, seed);
    
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    
    const vx0 = v00 + (v10 - v00) * sx;
    const vx1 = v01 + (v11 - v01) * sx;
    
    return vx0 + (vx1 - vx0) * sy;
  }

  private fbmNoise(x: number, y: number, seed: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }

  private generateTerrain(): void {
    this.noiseSeed = Math.random() * 1000;
    const worldHeight = GameConfig.WORLD_HEIGHT;
    const segmentHeight = 100;
    const segments = Math.ceil(worldHeight / segmentHeight);
    
    for (let i = 0; i < segments; i++) {
      const y = i * segmentHeight;
      this.createCanyonSegment(y, segmentHeight);
    }
    
    const seafloorGfx = this.add.graphics();
    seafloorGfx.fillStyle(0x000814, 1);
    seafloorGfx.fillRect(0, 0, GameConfig.WIDTH, worldHeight);
    seafloorGfx.setDepth(-10);
  }

  private createCanyonSegment(y: number, height: number): void {
    const steps = Math.ceil(height / 20);
    
    const leftWall = this.add.graphics();
    const rightWall = this.add.graphics();
    
    leftWall.fillStyle(0x0a1a2a, 1);
    rightWall.fillStyle(0x0a1a2a, 1);
    
    leftWall.beginPath();
    rightWall.beginPath();
    
    leftWall.moveTo(0, y);
    rightWall.moveTo(GameConfig.WIDTH, y);
    
    for (let i = 0; i <= steps; i++) {
      const currentY = y + i * 20;
      const noiseVal = this.fbmNoise(currentY * 0.003, 0, this.noiseSeed, 4);
      const offset = (noiseVal - 0.5) * 150;
      
      const leftX = (GameConfig.WIDTH - this.canyonWidth) / 2 + offset - 50;
      const rightX = (GameConfig.WIDTH + this.canyonWidth) / 2 + offset + 50;
      
      leftWall.lineTo(leftX, currentY);
      rightWall.lineTo(rightX, currentY);
    }
    
    leftWall.lineTo(0, y + height);
    rightWall.lineTo(GameConfig.WIDTH, y + height);
    
    leftWall.closePath();
    rightWall.closePath();
    
    leftWall.fillPath();
    rightWall.fillPath();
    
    leftWall.lineStyle(3, 0x1a3a5a, 0.8);
    rightWall.lineStyle(3, 0x1a3a5a, 0.8);
    
    leftWall.strokePath();
    rightWall.strokePath();
    
    this.canyonLeft.push(leftWall);
    this.canyonRight.push(rightWall);
  }

  private getCanyonX(y: number, side: 'left' | 'right'): number {
    const noiseVal = this.fbmNoise(y * 0.003, 0, this.noiseSeed, 4);
    const offset = (noiseVal - 0.5) * 150;
    
    if (side === 'left') {
      return (GameConfig.WIDTH - this.canyonWidth) / 2 + offset + 20;
    } else {
      return (GameConfig.WIDTH + this.canyonWidth) / 2 + offset - 20;
    }
  }

  private generateMinerals(): void {
    const count = Phaser.Math.Between(20, 30);
    
    for (let i = 0; i < count; i++) {
      const y = Phaser.Math.Between(300, GameConfig.WORLD_HEIGHT - 200);
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const baseX = this.getCanyonX(y, side);
      const xOffset = side === 'left' 
        ? Phaser.Math.Between(30, 80) 
        : Phaser.Math.Between(-80, -30);
      const x = baseX + xOffset;
      
      this.createMineral(x, y);
    }
  }

  private createMineral(x: number, y: number): void {
    const typeIndex = Phaser.Math.Between(0, MINERAL_TYPES.length - 1);
    const type = MINERAL_TYPES[typeIndex];
    
    const mineral = this.add.container(x, y);
    mineral.setData('type', type);
    mineral.setData('collected', false);
    
    const g = this.add.graphics();
    mineral.add(g);
    
    const size = Phaser.Math.Between(12, 20);
    mineral.setData('size', size);
    
    const points: Phaser.Geom.Point[] = [];
    const sides = Phaser.Math.Between(5, 8);
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const r = size * (0.7 + Math.random() * 0.3);
      points.push(new Phaser.Geom.Point(Math.cos(angle) * r, Math.sin(angle) * r));
    }
    
    g.fillStyle(type.color, 1);
    g.lineStyle(2, type.glowColor, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.fillStyle(0xffffff, 0.4);
    g.beginPath();
    g.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    const glow = this.add.graphics();
    glow.fillStyle(type.glowColor, 0.3);
    glow.beginPath();
    glow.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    glow.closePath();
    glow.fillPath();
    mineral.add(glow);
    glow.setDepth(-1);
    
    mineral.setData('glow', glow);
    mineral.setData('gfx', g);
    mineral.setData('baseRotation', Math.random() * Math.PI * 2);
    mineral.setData('pulseOffset', Math.random() * Math.PI * 2);
    
    this.minerals.push(mineral);
  }

  private generateObstacles(): void {
    const spikeCount = Phaser.Math.Between(15, 25);
    
    for (let i = 0; i < spikeCount; i++) {
      const y = Phaser.Math.Between(400, GameConfig.WORLD_HEIGHT - 200);
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const baseX = this.getCanyonX(y, side);
      const x = side === 'left' ? baseX - 10 : baseX + 10;
      
      this.createSpike(x, y, side);
    }
    
    const ventCount = Phaser.Math.Between(5, 10);
    
    for (let i = 0; i < ventCount; i++) {
      const y = Phaser.Math.Between(500, GameConfig.WORLD_HEIGHT - 300);
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const baseX = this.getCanyonX(y, side);
      const x = side === 'left' ? baseX - 5 : baseX + 5;
      
      this.createHydroVent(x, y, side);
    }
  }

  private createSpike(x: number, y: number, side: 'left' | 'right'): void {
    const g = this.add.graphics();
    const size = Phaser.Math.Between(20, 40);
    
    g.fillStyle(0xff3333, 0.7);
    g.lineStyle(2, 0xff6666, 0.9);
    
    g.beginPath();
    if (side === 'left') {
      g.moveTo(0, 0);
      g.lineTo(size, -size / 2);
      g.lineTo(size, size / 2);
    } else {
      g.moveTo(0, 0);
      g.lineTo(-size, -size / 2);
      g.lineTo(-size, size / 2);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.setPosition(x, y);
    g.setData('side', side);
    g.setData('size', size);
    
    this.spikes.push(g);
  }

  private createHydroVent(x: number, y: number, side: 'left' | 'right'): void {
    const g = this.add.graphics();
    
    g.fillStyle(0x332211, 1);
    g.lineStyle(2, 0x664422, 1);
    
    const width = 40;
    const height = 30;
    
    g.beginPath();
    if (side === 'left') {
      g.moveTo(0, -height / 2);
      g.lineTo(width, -height / 3);
      g.lineTo(width, height / 3);
      g.lineTo(0, height / 2);
    } else {
      g.moveTo(0, -height / 2);
      g.lineTo(-width, -height / 3);
      g.lineTo(-width, height / 3);
      g.lineTo(0, height / 2);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    
    g.setPosition(x, y);
    
    const textureKey = 'vent_particle_' + side;
    const pg = this.add.graphics();
    pg.fillStyle(0xff8800, 1);
    pg.beginPath();
    pg.arc(8, 8, 6, 0, Math.PI * 2);
    pg.closePath();
    pg.fillPath();
    pg.generateTexture(textureKey, 16, 16);
    pg.destroy();
    
    const particles = this.add.particles(side === 'left' ? x + width : x - width, y, textureKey, {
      lifespan: { min: 1000, max: 2000 },
      speed: { min: 30, max: 60 },
      angle: side === 'left' ? { min: -20, max: 20 } : { min: 160, max: 200 },
      scale: { start: 0.5, end: 2 },
      alpha: { start: 0.8, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      frequency: 50
    });
    particles.stop();
    
    this.hydroVents.push({
      gfx: g,
      timer: Phaser.Math.Between(2000, 5000),
      active: false,
      particles: particles
    });
  }

  private generatePortals(): void {
    const portalCount = Phaser.Math.Between(2, 4);
    
    for (let i = 0; i < portalCount; i++) {
      const y = Phaser.Math.Between(800, GameConfig.WORLD_HEIGHT - 400);
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const baseX = this.getCanyonX(y, side);
      const x = side === 'left' ? baseX + 60 : baseX - 60;
      
      this.createPortal(x, y);
    }
  }

  private createPortal(x: number, y: number): void {
    const portal = this.add.container(x, y);
    
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(0x00ccff, 0.2);
    outerGlow.beginPath();
    outerGlow.arc(0, 0, 50, 0, Math.PI * 2);
    outerGlow.closePath();
    outerGlow.fillPath();
    portal.add(outerGlow);
    
    const swirl = this.add.graphics();
    portal.add(swirl);
    
    for (let i = 0; i < 3; i++) {
      const r = 30 - i * 8;
      swirl.lineStyle(3, 0x00ccff, 0.6 - i * 0.15);
      swirl.beginPath();
      swirl.arc(0, 0, r, 0, Math.PI * 1.5);
      swirl.strokePath();
    }
    
    const center = this.add.graphics();
    center.fillStyle(0x00ffff, 0.8);
    center.beginPath();
    center.arc(0, 0, 10, 0, Math.PI * 2);
    center.closePath();
    center.fillPath();
    portal.add(center);
    
    portal.setData('swirl', swirl);
    portal.setData('rotation', 0);
    portal.setData('pulse', 0);
    
    this.portals.push(portal);
  }

  private createJellyfish(): void {
    const jellyfishTexture = this.createJellyfishTexture();
    
    this.jellyfishParticles = this.add.particles(0, 0, jellyfishTexture, {
      lifespan: { min: 8000, max: 15000 },
      speed: { min: 5, max: 15 },
      angle: { min: -100, max: -80 },
      scale: { min: 0.3, max: 1 },
      alpha: { min: 0.3, max: 0.7 },
      quantity: 50,
      blendMode: 'ADD',
      frequency: 200,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(0, 0, GameConfig.WIDTH, GameConfig.WORLD_HEIGHT)
      }
    });
  }

  private createJellyfishTexture(): string {
    const g = this.add.graphics();
    
    g.fillStyle(0x64c8ff, 0.5);
    g.beginPath();
    g.ellipse(20, 15, 15, 10, 0, 0, Math.PI * 2);
    g.closePath();
    g.fillPath();
    
    g.lineStyle(1, 0x64c8ff, 0.4);
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(20 + i * 4, 20);
      g.quadraticCurveTo(20 + i * 4 + 2, 28, 20 + i * 4, 35);
      g.strokePath();
    }
    
    const key = 'jellyfish_texture';
    g.generateTexture(key, 40, 40);
    g.destroy();
    
    return key;
  }

  private showStartMenu(): void {
    const centerX = GameConfig.WIDTH / 2;
    const centerY = GameConfig.HEIGHT / 2;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000510, 0.85);
    overlay.fillRect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);
    
    const title = this.add.text(centerX, centerY - 80, '深渊潜航', {
      fontSize: '48px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#64c8ff',
      stroke: '#003366',
      strokeThickness: 4
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(101);
    title.setAlpha(0);
    
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 2000,
      ease: 'Sine.easeInOut'
    });
    
    const subtitle = this.add.text(centerX, centerY - 20, '驾驶潜艇探索深海，收集矿物，躲避危险', {
      fontSize: '18px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(101);
    subtitle.setAlpha(0);
    
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 2000,
      delay: 500,
      ease: 'Sine.easeInOut'
    });
    
    const startBtnBg = this.add.graphics();
    startBtnBg.fillStyle(0x0066aa, 0.8);
    startBtnBg.lineStyle(2, 0x64c8ff, 1);
    startBtnBg.fillRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
    startBtnBg.strokeRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
    startBtnBg.setScrollFactor(0);
    startBtnBg.setDepth(101);
    startBtnBg.setInteractive(new Phaser.Geom.Rectangle(centerX - 100, centerY + 40, 200, 50), Phaser.Geom.Rectangle.Contains);
    
    const startBtnText = this.add.text(centerX, centerY + 65, '开始探索', {
      fontSize: '24px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#ffffff'
    });
    startBtnText.setOrigin(0.5);
    startBtnText.setScrollFactor(0);
    startBtnText.setDepth(102);
    
    startBtnBg.on('pointerover', () => {
      startBtnBg.clear();
      startBtnBg.fillStyle(0x0088cc, 0.9);
      startBtnBg.lineStyle(2, 0x88ddff, 1);
      startBtnBg.fillRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
      startBtnBg.strokeRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
    });
    
    startBtnBg.on('pointerout', () => {
      startBtnBg.clear();
      startBtnBg.fillStyle(0x0066aa, 0.8);
      startBtnBg.lineStyle(2, 0x64c8ff, 1);
      startBtnBg.fillRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
      startBtnBg.strokeRoundedRect(centerX - 100, centerY + 40, 200, 50, 10);
    });
    
    startBtnBg.on('pointerdown', () => {
      this.startGame(overlay, title, subtitle, startBtnBg, startBtnText);
    });
  }

  private startGame(overlay: Phaser.GameObjects.Graphics, title: Phaser.GameObjects.Text, subtitle: Phaser.GameObjects.Text, btnBg: Phaser.GameObjects.Graphics, btnText: Phaser.GameObjects.Text): void {
    const bubbleTexture = 'bubble_texture';
    const particles = this.add.particles(GameConfig.WIDTH / 2, GameConfig.HEIGHT, bubbleTexture, {
      lifespan: { min: 1500, max: 3000 },
      speed: { min: 100, max: 200 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.5, end: 2 },
      alpha: { start: 0.8, end: 0 },
      quantity: 30,
      blendMode: 'ADD',
      frequency: 50
    });
    particles.setScrollFactor(0);
    particles.setDepth(103);
    
    this.tweens.add({
      targets: [overlay, title, subtitle, btnBg, btnText],
      alpha: 0,
      duration: 1000,
      ease: 'Sine.easeIn',
      onComplete: () => {
        overlay.destroy();
        title.destroy();
        subtitle.destroy();
        btnBg.destroy();
        btnText.destroy();
        particles.destroy();
        this.gameStarted = true;
      }
    });
  }

  public showGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    
    const centerX = GameConfig.WIDTH / 2;
    const centerY = GameConfig.HEIGHT / 2;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GameConfig.WIDTH, GameConfig.HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);
    overlay.setAlpha(0);
    
    const panel = this.add.graphics();
    panel.fillStyle(0x001122, 0.9);
    panel.lineStyle(2, 0x0066aa, 0.8);
    panel.fillRoundedRect(centerX - 200, centerY - 150, 400, 300, 15);
    panel.strokeRoundedRect(centerX - 200, centerY - 150, 400, 300, 15);
    panel.setScrollFactor(0);
    panel.setDepth(101);
    panel.setAlpha(0);
    panel.setScale(0.5);
    
    const title = this.add.text(centerX, centerY - 100, '航程结束', {
      fontSize: '36px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#ff6b6b'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(102);
    title.setAlpha(0);
    
    const scoreText = this.add.text(centerX, centerY - 30, `最终得分: ${this.score}`, {
      fontSize: '24px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#ffd700'
    });
    scoreText.setOrigin(0.5);
    scoreText.setScrollFactor(0);
    scoreText.setDepth(102);
    scoreText.setAlpha(0);
    
    const mineralText = this.add.text(centerX, centerY + 10, `采集矿物: ${this.mineralCount} 个`, {
      fontSize: '20px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#64c8ff'
    });
    mineralText.setOrigin(0.5);
    mineralText.setScrollFactor(0);
    mineralText.setDepth(102);
    mineralText.setAlpha(0);
    
    const depthText = this.add.text(centerX, centerY + 45, `最大深度: ${Math.floor(this.maxDepth)} 米`, {
      fontSize: '18px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    depthText.setOrigin(0.5);
    depthText.setScrollFactor(0);
    depthText.setDepth(102);
    depthText.setAlpha(0);
    
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x0066aa, 0.9);
    btnBg.lineStyle(2, 0x64c8ff, 1);
    btnBg.fillRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
    btnBg.strokeRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
    btnBg.setScrollFactor(0);
    btnBg.setDepth(102);
    btnBg.setAlpha(0);
    btnBg.setInteractive(new Phaser.Geom.Rectangle(centerX - 90, centerY + 80, 180, 45), Phaser.Geom.Rectangle.Contains);
    
    const btnText = this.add.text(centerX, centerY + 102, '再潜一次', {
      fontSize: '20px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#ffffff'
    });
    btnText.setOrigin(0.5);
    btnText.setScrollFactor(0);
    btnText.setDepth(103);
    btnText.setAlpha(0);
    
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 500,
      ease: 'Linear'
    });
    
    this.tweens.add({
      targets: [panel, title, scoreText, mineralText, depthText, btnBg, btnText],
      alpha: 1,
      scale: 1,
      duration: 800,
      delay: 300,
      ease: 'Back.easeOut'
    });
    
    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x0088cc, 0.9);
      btnBg.lineStyle(2, 0x88ddff, 1);
      btnBg.fillRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
      btnBg.strokeRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
    });
    
    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x0066aa, 0.9);
      btnBg.lineStyle(2, 0x64c8ff, 1);
      btnBg.fillRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
      btnBg.strokeRoundedRect(centerX - 90, centerY + 80, 180, 45, 8);
    });
    
    btnBg.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  update(time: number, delta: number): void {
    if (!this.gameStarted || this.gameOver) return;
    
    const dt = delta / 1000;
    
    this.updateSubmarine(dt);
    this.updateBubbles();
    this.updateMinerals(dt);
    this.updateHydroVents(dt);
    this.updatePortals(dt);
    this.updateDepth();
    this.updateCameraEffects(dt);
    this.checkCollisions();
    this.updateOxygen(dt);
    this.updateCollectEffects(dt);
  }

  private updateSubmarine(dt: number): void {
    const depthFactor = Math.min(this.depth / 2000, 1);
    const turnSensitivity = 2 - depthFactor * 1.2;
    const thrust = 150 * (1 - depthFactor * 0.3);
    const drag = 0.98;
    const angularDrag = 0.95;
    
    if (this.keys.LEFT.isDown || this.keys.A.isDown) {
      this.angleVelocity -= turnSensitivity * 180 * dt;
    }
    if (this.keys.RIGHT.isDown || this.keys.D.isDown) {
      this.angleVelocity += turnSensitivity * 180 * dt;
    }
    
    this.submarine.rotation += this.angleVelocity * dt * Phaser.Math.DEG_TO_RAD;
    this.angleVelocity *= angularDrag;
    
    if (this.keys.W.isDown || this.keys.UP.isDown) {
      const angle = this.submarine.rotation;
      this.velocity.x += Math.cos(angle) * thrust * dt;
      this.velocity.y += Math.sin(angle) * thrust * dt;
    }
    if (this.keys.S.isDown || this.keys.DOWN.isDown) {
      const angle = this.submarine.rotation;
      this.velocity.x -= Math.cos(angle) * thrust * 0.5 * dt;
      this.velocity.y -= Math.sin(angle) * thrust * 0.5 * dt;
    }
    
    this.velocity.x *= drag;
    this.velocity.y *= drag;
    
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    const maxSpeed = 200;
    if (speed > maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * maxSpeed;
    }
    
    const body = this.submarine.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.velocity.x, this.velocity.y);
    
    const leftBound = this.getCanyonX(this.submarine.y, 'left') + 30;
    const rightBound = this.getCanyonX(this.submarine.y, 'right') - 30;
    
    if (this.submarine.x < leftBound) {
      this.submarine.x = leftBound;
      this.velocity.x = Math.abs(this.velocity.x) * 0.3;
      this.takeDamage(5);
    }
    if (this.submarine.x > rightBound) {
      this.submarine.x = rightBound;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.3;
      this.takeDamage(5);
    }
    
    if (this.submarine.y < 50) {
      this.submarine.y = 50;
      this.velocity.y = Math.abs(this.velocity.y) * 0.3;
    }
    if (this.submarine.y > GameConfig.WORLD_HEIGHT - 50) {
      this.submarine.y = GameConfig.WORLD_HEIGHT - 50;
      this.velocity.y = -Math.abs(this.velocity.y) * 0.3;
    }
  }

  private updateBubbles(): void {
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    
    if (speed > 30) {
      const angle = this.submarine.rotation + Math.PI;
      const offsetX = Math.cos(angle) * 30;
      const offsetY = Math.sin(angle) * 30;
      
      this.bubbleParticles.emitParticleAt(
        this.submarine.x + offsetX,
        this.submarine.y + offsetY
      );
    }
  }

  private updateMinerals(dt: number): void {
    for (const mineral of this.minerals) {
      if (mineral.getData('collected')) continue;
      
      const baseRot = mineral.getData('baseRotation');
      const pulseOffset = mineral.getData('pulseOffset');
      const time = this.time.now / 1000;
      
      mineral.rotation = baseRot + time * 0.5;
      
      const pulse = 0.8 + 0.2 * Math.sin(time * 2 + pulseOffset);
      const glow = mineral.getData('glow') as Phaser.GameObjects.Graphics;
      glow.setScale(pulse);
      glow.setAlpha(0.3 * pulse);
    }
  }

  private updateHydroVents(dt: number): void {
    for (const vent of this.hydroVents) {
      vent.timer -= dt * 1000;
      
      if (vent.timer <= 0 && !vent.active) {
        vent.active = true;
        vent.particles.start();
        vent.timer = Phaser.Math.Between(2000, 4000);
        
        vent.gfx.lineStyle(3, 0xff6600, 1);
        vent.gfx.strokePath();
      } else if (vent.timer <= 0 && vent.active) {
        vent.active = false;
        vent.particles.stop();
        vent.timer = Phaser.Math.Between(4000, 8000);
        
        vent.gfx.lineStyle(2, 0x664422, 1);
        vent.gfx.strokePath();
      }
      
      if (!vent.active && vent.timer < 1000) {
        const flash = Math.sin(vent.timer / 100) > 0;
        if (flash) {
          vent.gfx.lineStyle(3, 0xffaa00, 0.8);
        } else {
          vent.gfx.lineStyle(2, 0x664422, 1);
        }
        vent.gfx.strokePath();
      }
      
      if (vent.active) {
        const dist = Phaser.Math.Distance.Between(
          this.submarine.x, this.submarine.y,
          vent.particles.x, vent.particles.y
        );
        
        if (dist < 60) {
          this.takeDamage(20 * dt);
        }
      }
    }
  }

  private updatePortals(dt: number): void {
    for (const portal of this.portals) {
      const rotation = portal.getData('rotation') as number;
      portal.setData('rotation', rotation + dt * 2);
      portal.rotation = rotation;
      
      const pulse = portal.getData('pulse') as number;
      portal.setData('pulse', pulse + dt * 3);
      const scale = 1 + 0.1 * Math.sin(pulse);
      portal.setScale(scale);
      
      const dist = Phaser.Math.Distance.Between(
        this.submarine.x, this.submarine.y,
        portal.x, portal.y
      );
      
      if (dist < 30) {
        this.enterPortal(portal);
      }
    }
  }

  private enterPortal(portal: Phaser.GameObjects.Container): void {
    const depthIncrease = Phaser.Math.Between(500, 1000);
    this.depth += depthIncrease;
    this.maxDepth = Math.max(this.maxDepth, this.depth);
    
    this.noiseSeed = Math.random() * 1000;
    
    for (const m of this.minerals) {
      m.destroy();
    }
    this.minerals = [];
    
    for (const s of this.spikes) {
      s.destroy();
    }
    this.spikes = [];
    
    for (const v of this.hydroVents) {
      v.gfx.destroy();
      v.particles.destroy();
    }
    this.hydroVents = [];
    
    for (const p of this.portals) {
      p.destroy();
    }
    this.portals = [];
    
    for (const left of this.canyonLeft) {
      left.destroy();
    }
    for (const right of this.canyonRight) {
      right.destroy();
    }
    this.canyonLeft = [];
    this.canyonRight = [];
    
    this.generateTerrain();
    this.generateMinerals();
    this.generateObstacles();
    this.generatePortals();
    
    const newY = 300;
    this.submarine.y = newY;
    this.submarine.x = GameConfig.WIDTH / 2;
    this.velocity.set(0, 0);
    
    this.cameras.main.flash(500, 0, 200, 255);
  }

  private updateDepth(): void {
    this.depth = Math.max(0, this.submarine.y - 100);
    if (this.depth > this.maxDepth) {
      this.maxDepth = this.depth;
    }
    
    const depthFactor = Math.min(this.depth / 2000, 1);
    const r = Math.floor(5 + depthFactor * 0);
    const g = Math.floor(26 - depthFactor * 20);
    const b = Math.floor(51 - depthFactor * 40);
    this.cameras.main.setBackgroundColor(`rgb(${r}, ${g}, ${b})`);
  }

  private updateOxygen(dt: number): void {
    const depthFactor = Math.min(this.depth / 2000, 1);
    const consumeRate = 0.5 + depthFactor * 1.5;
    
    this.oxygen -= consumeRate * dt;
    this.oxygen = Math.max(0, this.oxygen);
    
    if (this.oxygen <= 0) {
      this.showGameOver();
    }
  }

  private updateCameraEffects(dt: number): void {
    if (this.screenShake > 0) {
      this.cameras.main.shake(50, 0.01);
      this.screenShake -= dt;
    }
    
    if (this.damageFlash > 0) {
      this.damageFlash -= dt;
    }
  }

  private checkCollisions(): void {
    for (const mineral of this.minerals) {
      if (mineral.getData('collected')) continue;
      
      const size = mineral.getData('size') as number;
      const dist = Phaser.Math.Distance.Between(
        this.submarine.x, this.submarine.y,
        mineral.x, mineral.y
      );
      
      if (dist < size + 20) {
        this.collectMineral(mineral);
      }
    }
    
    for (const spike of this.spikes) {
      const side = spike.getData('side') as string;
      const size = spike.getData('size') as number;
      
      const dist = Phaser.Math.Distance.Between(
        this.submarine.x, this.submarine.y,
        spike.x, spike.y
      );
      
      if (dist < size + 15) {
        this.takeDamage(15);
        this.velocity.x *= -0.5;
        this.velocity.y *= -0.5;
      }
    }
  }

  private collectMineral(mineral: Phaser.GameObjects.Container): void {
    mineral.setData('collected', true);
    
    const type = mineral.getData('type') as MineralData;
    this.score += type.score;
    this.mineralCount++;
    
    this.playCollectSound();
    
    const textureKey = 'collect_' + type.name;
    if (!this.textures.exists(textureKey)) {
      const g = this.add.graphics();
      g.fillStyle(type.color, 1);
      g.beginPath();
      g.arc(8, 8, 5, 0, Math.PI * 2);
      g.closePath();
      g.fillPath();
      g.generateTexture(textureKey, 16, 16);
      g.destroy();
    }
    
    const particles = this.add.particles(mineral.x, mineral.y, textureKey, {
      lifespan: { min: 400, max: 800 },
      speed: { min: 60, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 15,
      blendMode: 'ADD'
    });
    
    this.collectEffects.push({ particles, timer: 1 });
    
    mineral.setVisible(false);
    
    const uiScene = this.scene.get('Scene_UI') as any;
    if (uiScene && uiScene.triggerScoreAnimation) {
      uiScene.triggerScoreAnimation(type.score);
    }
  }

  private updateCollectEffects(dt: number): void {
    for (let i = this.collectEffects.length - 1; i >= 0; i--) {
      this.collectEffects[i].timer -= dt;
      if (this.collectEffects[i].timer <= 0) {
        this.collectEffects[i].particles.destroy();
        this.collectEffects.splice(i, 1);
      }
    }
  }

  private takeDamage(amount: number): void {
    if (this.gameOver) return;
    
    this.oxygen -= amount;
    this.oxygen = Math.max(0, this.oxygen);
    
    this.screenShake = 0.3;
    this.damageFlash = 0.3;
    
    this.playDamageSound();
    
    this.cameras.main.flash(100, 255, 0, 0);
    
    if (this.oxygen <= 0) {
      this.showGameOver();
    }
  }

  public getMineralPositions(): { x: number; y: number; color: number }[] {
    return this.minerals
      .filter(m => !m.getData('collected'))
      .map(m => ({
        x: m.x,
        y: m.y,
        color: (m.getData('type') as MineralData).color
      }));
  }

  public getCanyonBoundsAtY(y: number): { left: number; right: number } {
    return {
      left: this.getCanyonX(y, 'left'),
      right: this.getCanyonX(y, 'right')
    };
  }
}
