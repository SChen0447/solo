import Phaser from 'phaser';

interface CreatureData {
  type: string;
  textureKey: string;
  speed: number;
  dirChangeTimer: number;
  dirChangeInterval: number;
  vx: number;
  vy: number;
  collected: boolean;
  specialTimer: number;
  glowAlpha: number;
}

const CREATURE_TYPES = [
  { type: 'clownfish', textureKey: 'clownfish', speed: 50, desc: '橙白相间的小精灵，最爱在海葵间捉迷藏' },
  { type: 'jellyfish', textureKey: 'jellyfish', speed: 25, desc: '半透明的舞者，触须随洋流优雅律动' },
  { type: 'glowing_squid', textureKey: 'glowing_squid', speed: 40, desc: '深海中的霓虹灯，蓝光点点如繁星闪烁' },
  { type: 'anglerfish', textureKey: 'anglerfish', speed: 30, desc: '提着灯笼的猎手，在黑暗中静静守候' },
  { type: 'sea_turtle', textureKey: 'sea_turtle', speed: 20, desc: '悠然自得的老者，穿越万里的深蓝旅者' },
];

const MAX_CREATURES = 20;
const MAX_PARTICLES = 300;
const OXYGEN_DRAIN = 1;
const COLLECT_OXYGEN_COST = 5;

class SimplexNoise {
  private perm: number[];
  private grad3: number[][] = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
  ];

  constructor(seed: number = 42) {
    this.perm = [];
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private dot3(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * this.dot3(this.grad3[gi0], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * this.dot3(this.grad3[gi1], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * this.dot3(this.grad3[gi2], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }
}

export class PlayScene extends Phaser.Scene {
  public oxygen: number = 100;
  public depth: number = 0;
  public collected: string[] = [];
  public gameOver: boolean = false;
  public creatureDescs: Record<string, string> = {};

  private sub!: Phaser.GameObjects.Container;
  private searchlight!: Phaser.GameObjects.Image;
  private bg!: Phaser.GameObjects.TileSprite;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private creatures: Phaser.GameObjects.Image[] = [];
  private creatureData: Map<Phaser.GameObjects.Image, CreatureData> = new Map();
  private bubbles: Phaser.GameObjects.Image[] = [];
  private ventParticles: Phaser.GameObjects.Image[] = [];
  private particleCount: number = 0;
  private noise: SimplexNoise;
  private isDragging: boolean = false;
  private dragTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private subVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private cameraScrollY: number = 0;
  private scrollSpeed: number = 15;
  private worldDepth: number = 0;
  private totalWorldHeight: number = 0;
  private ventPositions: { x: number; y: number }[] = [];
  private terrainPoints: { x: number; y: number }[][] = [];
  private collectEffects: Phaser.GameObjects.Image[] = [];
  private gameOverlay!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;
  private gameOverSubText!: Phaser.GameObjects.Text;
  private gameOverAlpha: number = 0;
  private depthMeters: number = 0;
  private sineTime: number = 0;
  private bubbleTimer: number = 0;
  private ventTimer: number = 0;
  private spawnTimer: number = 0;
  private terrainChunkSize: number = 200;
  private generatedChunks: Set<number> = new Set();
  private maxDepth: number = 3000;

  constructor() {
    super({ key: 'PlayScene' });
    this.noise = new SimplexNoise(Math.random() * 10000);
    CREATURE_TYPES.forEach(c => { this.creatureDescs[c.type] = c.desc; });
  }

  create(): void {
    const { width, height } = this.scale;

    this.totalWorldHeight = this.maxDepth * 10;
    this.physics.world.setBounds(0, 0, width, this.totalWorldHeight);

    this.bg = this.add.tileSprite(0, 0, width, this.totalWorldHeight, 'deepBg').setOrigin(0, 0);

    this.terrainGraphics = this.add.graphics();

    const subX = width / 2;
    const subY = 100;
    this.searchlight = this.add.image(30, 0, 'searchlight').setOrigin(0, 0.5).setDepth(1);

    const subImg = this.add.image(0, 0, 'submarine').setOrigin(0.3, 0.5);

    this.sub = this.add.container(subX, subY, [this.searchlight, subImg]);
    this.sub.setDepth(10);
    this.sub.setSize(40, 32);

    this.physics.add.existing(this.sub);
    const body = this.sub.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setImmovable(true);

    this.gameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setDepth(100).setScrollFactor(0);
    this.gameOverText = this.add.text(width / 2, height / 2 - 40, '潜水结束', {
      fontSize: '48px',
      fontFamily: 'sans-serif',
      color: '#cc0000',
      stroke: '#660000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0).setAlpha(0);
    this.gameOverSubText = this.add.text(width / 2, height / 2 + 30, '', {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: '#00d4ff',
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0).setAlpha(0);

    this.generateInitialTerrain();
    this.generateVentPositions();

    this.cameras.main.setBounds(0, 0, width, this.totalWorldHeight);
    this.cameras.main.startFollow(this.sub, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(50, 50);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      this.isDragging = true;
      this.dragTarget.set(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.gameOver) return;
      this.dragTarget.set(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.events.emit('scene-ready', this);
  }

  update(time: number, delta: number): void {
    if (this.gameOver) {
      this.updateGameOver(delta);
      return;
    }

    const dt = delta / 1000;
    this.sineTime += dt;
    const { width } = this.scale;

    this.updateSubmarine(dt);
    this.updateDepth();
    this.updateFog();
    this.updateTerrainGeneration();
    this.updateCreatureSpawning(dt);
    this.updateCreatures(dt);
    this.updateBubbles(dt);
    this.updateVents(dt);
    this.updateOxygen(dt);
    this.checkCreatureCollision();
    this.updateCollectEffects(dt);

    this.events.emit('oxygen-update', this.oxygen);
    this.events.emit('depth-update', this.depthMeters);
    this.events.emit('collected-update', this.collected);
  }

  private updateSubmarine(dt: number): void {
    const body = this.sub.body as Phaser.Physics.Arcade.Body;
    const damping = 0.3;
    const factor = 1 - damping * dt;

    if (this.isDragging) {
      const dx = this.dragTarget.x - this.sub.x;
      const dy = this.dragTarget.y - this.sub.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const speed = Math.min(dist * 3, 200);
        this.subVelocity.x = (dx / dist) * speed;
        this.subVelocity.y = (dy / dist) * speed;
        const angle = Math.atan2(dy, dx);
        this.sub.setRotation(Phaser.Math.Angle.RotateTo(this.sub.rotation, angle, 0.15));
      } else {
        this.subVelocity.x *= factor;
        this.subVelocity.y *= factor;
      }
    } else {
      this.subVelocity.x *= factor;
      this.subVelocity.y *= factor;
    }

    body.setVelocity(this.subVelocity.x, this.subVelocity.y);
    body.position.set(this.sub.x - body.halfWidth, this.sub.y - body.halfHeight);

    const depthRatio = this.depthMeters / this.maxDepth;
    const searchlightAlpha = Math.min(1, depthRatio * 2);
    this.searchlight.setAlpha(searchlightAlpha * 0.6);
  }

  private updateDepth(): void {
    this.depthMeters = Math.floor(this.sub.y / 10);
    this.depth = this.depthMeters / this.maxDepth;
  }

  private updateFog(): void {
    const fogIntensity = Math.min(0.8, this.depth * 0.8);
    this.cameras.main.setBackgroundColor(
      Phaser.Display.Color.IntegerToColor(
        Phaser.Display.Color.GetColor(0, Math.floor(17 * (1 - fogIntensity)), Math.floor(17 * (1 - fogIntensity)))
      ).rgba
    );
  }

  private generateInitialTerrain(): void {
    const { width } = this.scale;
    const numChunks = Math.ceil(this.totalWorldHeight / this.terrainChunkSize) + 1;
    for (let c = 0; c < Math.min(numChunks, 20); c++) {
      this.generateTerrainChunk(c);
    }
  }

  private generateTerrainChunk(chunkIndex: number): void {
    if (this.generatedChunks.has(chunkIndex)) return;
    this.generatedChunks.add(chunkIndex);

    const { width } = this.scale;
    const startY = chunkIndex * this.terrainChunkSize;
    const endY = startY + this.terrainChunkSize;
    const step = 10;

    const leftPoints: { x: number; y: number }[] = [];
    const rightPoints: { x: number; y: number }[] = [];

    for (let y = startY; y <= endY; y += step) {
      const nv = this.noise.noise2D(y * 0.003, 0.5) * 0.5 + 0.5;
      const leftX = nv * 60 + 20;
      leftPoints.push({ x: leftX, y });

      const nv2 = this.noise.noise2D(y * 0.003, 1.5) * 0.5 + 0.5;
      const rightX = width - (nv2 * 60 + 20);
      rightPoints.push({ x: rightX, y });
    }

    this.terrainPoints.push(leftPoints);
    this.terrainPoints.push(rightPoints);

    this.terrainGraphics.fillStyle(0x2a3b4c, 1);
    this.terrainGraphics.beginPath();
    this.terrainGraphics.moveTo(0, startY);
    leftPoints.forEach(p => this.terrainGraphics.lineTo(p.x, p.y));
    this.terrainGraphics.lineTo(0, endY);
    this.terrainGraphics.closePath();
    this.terrainGraphics.fillPath();

    this.terrainGraphics.beginPath();
    this.terrainGraphics.moveTo(this.scale.width, startY);
    rightPoints.forEach(p => this.terrainGraphics.lineTo(p.x, p.y));
    this.terrainGraphics.lineTo(this.scale.width, endY);
    this.terrainGraphics.closePath();
    this.terrainGraphics.fillPath();

    this.terrainGraphics.lineStyle(2, 0x3a5b6c, 0.6);
    this.terrainGraphics.beginPath();
    leftPoints.forEach((p, i) => { if (i === 0) this.terrainGraphics.moveTo(p.x, p.y); else this.terrainGraphics.lineTo(p.x, p.y); });
    this.terrainGraphics.strokePath();
    this.terrainGraphics.beginPath();
    rightPoints.forEach((p, i) => { if (i === 0) this.terrainGraphics.moveTo(p.x, p.y); else this.terrainGraphics.lineTo(p.x, p.y); });
    this.terrainGraphics.strokePath();
  }

  private updateTerrainGeneration(): void {
    const currentChunk = Math.floor(this.sub.y / this.terrainChunkSize);
    for (let i = currentChunk - 2; i <= currentChunk + 5; i++) {
      if (i >= 0) this.generateTerrainChunk(i);
    }
  }

  private generateVentPositions(): void {
    const { width } = this.scale;
    const numVents = 15;
    for (let i = 0; i < numVents; i++) {
      const x = 80 + Math.random() * (width - 160);
      const y = this.totalWorldHeight * 0.4 + Math.random() * this.totalWorldHeight * 0.55;
      this.ventPositions.push({ x, y });
    }
  }

  private updateVents(dt: number): void {
    this.ventTimer += dt;
    if (this.ventTimer < 0.15) return;
    this.ventTimer = 0;

    const cam = this.cameras.main;
    const camTop = cam.scrollY;
    const camBottom = cam.scrollY + cam.height;

    for (const vent of this.ventPositions) {
      if (vent.y < camTop - 100 || vent.y > camBottom + 100) continue;
      if (this.particleCount >= MAX_PARTICLES) break;

      const size = 3 + Math.random() * 3;
      const particle = this.add.image(vent.x + (Math.random() - 0.5) * 20, vent.y, 'vent_particle')
        .setAlpha(0.6 + Math.random() * 0.3)
        .setScale(size / 4)
        .setDepth(2);
      this.ventParticles.push(particle);
      this.particleCount++;

      this.tweens.add({
        targets: particle,
        y: particle.y - 40 - Math.random() * 30,
        x: particle.x + (Math.random() - 0.5) * 20,
        alpha: 0,
        scaleX: size / 6,
        scaleY: size / 6,
        duration: 1500 + Math.random() * 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          particle.destroy();
          this.ventParticles = this.ventParticles.filter(p => p !== particle);
          this.particleCount--;
        },
      });

      const flickerAlpha = 0.4 + Math.sin(this.sineTime * Math.PI * 2 / 0.5) * 0.3;
      particle.setAlpha(flickerAlpha);
    }
  }

  private updateCreatureSpawning(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer < 2 || this.creatures.length >= MAX_CREATURES) return;
    this.spawnTimer = 0;

    this.spawnCreature();
  }

  private spawnCreature(): void {
    const { width } = this.scale;
    const cam = this.cameras.main;
    const camTop = cam.scrollY;
    const camBottom = cam.scrollY + cam.height;

    const typeInfo = CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)];
    const x = 80 + Math.random() * (width - 160);
    const y = camTop - 50 + Math.random() * (camBottom - camTop + 100);

    const creature = this.add.image(x, y, typeInfo.textureKey).setDepth(5);
    const angle = Math.random() * Math.PI * 2;
    const data: CreatureData = {
      type: typeInfo.type,
      textureKey: typeInfo.textureKey,
      speed: typeInfo.speed + (Math.random() - 0.5) * 20,
      dirChangeTimer: 0,
      dirChangeInterval: 0.5 + Math.random() * 1,
      vx: Math.cos(angle) * typeInfo.speed,
      vy: Math.sin(angle) * typeInfo.speed,
      collected: false,
      specialTimer: 0,
      glowAlpha: 1,
    };

    this.creatures.push(creature);
    this.creatureData.set(creature, data);
  }

  private updateCreatures(dt: number): void {
    const { width } = this.scale;
    const cam = this.cameras.main;

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      const data = this.creatureData.get(creature);
      if (!data) continue;

      data.dirChangeTimer += dt;
      if (data.dirChangeTimer >= data.dirChangeInterval) {
        data.dirChangeTimer = 0;
        data.dirChangeInterval = 0.5 + Math.random() * 1;
        const angle = Math.random() * Math.PI * 2;
        data.vx = Math.cos(angle) * data.speed;
        data.vy = Math.sin(angle) * data.speed;
      }

      let moveX = data.vx;
      let moveY = data.vy;

      if (data.type === 'clownfish') {
        moveY += Math.sin(this.sineTime * 3 + creature.x * 0.01) * 30;
      }

      if (data.type === 'jellyfish') {
        const pulse = Math.sin(this.sineTime * 2 + creature.y * 0.005) * 0.3;
        creature.setScale(1 + pulse * 0.15, 1 - pulse * 0.1);
      }

      if (data.type === 'glowing_squid') {
        data.specialTimer += dt;
        if (data.specialTimer > 0.8) {
          data.specialTimer = 0;
          const flickerOn = Math.random() > 0.3;
          creature.setAlpha(flickerOn ? 1 : 0.4);
          creature.setTint(flickerOn ? 0xffffff : 0x6688ff);
        }
      }

      if (data.type === 'anglerfish') {
        const wobble = Math.sin(this.sineTime * 4) * 3;
        creature.y += wobble * dt * 5;
      }

      creature.x += moveX * dt;
      creature.y += moveY * dt;

      if (moveX !== 0) creature.setFlipX(moveX < 0);

      if (creature.x < 30) { creature.x = 30; data.vx = Math.abs(data.vx); }
      if (creature.x > width - 30) { creature.x = width - 30; data.vx = -Math.abs(data.vx); }

      if (creature.y < cam.scrollY - 200 || creature.y > cam.scrollY + cam.height + 200) {
        this.removeCreature(creature, i);
      }
    }
  }

  private removeCreature(creature: Phaser.GameObjects.Image, index?: number): void {
    this.creatureData.delete(creature);
    creature.destroy();
    if (index !== undefined) {
      this.creatures.splice(index, 1);
    } else {
      this.creatures = this.creatures.filter(c => c !== creature);
    }
  }

  private updateBubbles(dt: number): void {
    this.bubbleTimer += dt;
    if (this.bubbleTimer > 0.3 && this.particleCount < MAX_PARTICLES) {
      this.bubbleTimer = 0;
      const { width } = this.scale;
      const x = Math.random() * width;
      const y = this.sub.y + this.scale.height / 2 + 50;
      const bubble = this.add.image(x, y, 'bubble').setDepth(3).setAlpha(0.4);
      this.bubbles.push(bubble);
      this.particleCount++;

      this.tweens.add({
        targets: bubble,
        y: bubble.y - 80 - Math.random() * 60,
        x: bubble.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeOut',
        onComplete: () => {
          bubble.destroy();
          this.bubbles = this.bubbles.filter(b => b !== bubble);
          this.particleCount--;
        },
      });
    }

    const subBubbleChance = this.isDragging ? 0.3 : 0.1;
    if (Math.random() < subBubbleChance * dt && this.particleCount < MAX_PARTICLES) {
      const offsetX = -10 + Math.random() * 10;
      const offsetY = -5 + Math.random() * 10;
      const bubble = this.add.image(this.sub.x + offsetX, this.sub.y + offsetY, 'bubble')
        .setDepth(11)
        .setScale(0.4 + Math.random() * 0.4)
        .setAlpha(0.5);
      this.bubbles.push(bubble);
      this.particleCount++;

      this.tweens.add({
        targets: bubble,
        y: bubble.y - 30 - Math.random() * 20,
        x: bubble.x + (Math.random() - 0.5) * 15,
        alpha: 0,
        duration: 800 + Math.random() * 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          bubble.destroy();
          this.bubbles = this.bubbles.filter(b => b !== bubble);
          this.particleCount--;
        },
      });
    }
  }

  private updateOxygen(dt: number): void {
    this.oxygen -= OXYGEN_DRAIN * dt;
    if (this.oxygen <= 0) {
      this.oxygen = 0;
      this.triggerGameOver();
    }
  }

  private checkCreatureCollision(): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      const data = this.creatureData.get(creature);
      if (!data || data.collected) continue;

      const dist = Phaser.Math.Distance.Between(this.sub.x, this.sub.y, creature.x, creature.y);
      if (dist < 35) {
        data.collected = true;
        this.collectCreature(creature, data, i);
      }
    }
  }

  private collectCreature(creature: Phaser.GameObjects.Image, data: CreatureData, index: number): void {
    const { width, height } = this.scale;
    const logIconX = width - 50;
    const logIconY = height - 50;

    const sparkle = this.add.image(creature.x, creature.y, 'collect_sparkle').setDepth(20).setScale(2);
    this.tweens.add({
      targets: sparkle,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => sparkle.destroy(),
    });

    this.tweens.add({
      targets: creature,
      x: logIconX,
      y: logIconY,
      alpha: 0,
      scale: 0.2,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.removeCreature(creature, index);
      },
    });

    if (!this.collected.includes(data.type)) {
      this.collected.push(data.type);
    }

    this.oxygen = Math.max(0, this.oxygen - COLLECT_OXYGEN_COST);
    if (this.oxygen <= 0) {
      this.triggerGameOver();
    }
  }

  private updateCollectEffects(dt: number): void {
    // handled by tweens
  }

  private triggerGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.isDragging = false;
    this.subVelocity.set(0, 0);
    const body = this.sub.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    const uniqueCollected = [...new Set(this.collected)];
    const collectedNames = uniqueCollected.map(t => {
      const ct = CREATURE_TYPES.find(c => c.type === t);
      return ct ? ct.type : t;
    }).join('、');

    this.gameOverSubText.setText(`本次收集: ${collectedNames || '无'}`);
  }

  private updateGameOver(delta: number): void {
    const dt = delta / 1000;
    this.gameOverAlpha = Math.min(1, this.gameOverAlpha + dt * 2);
    this.gameOverlay.setAlpha(this.gameOverAlpha * 0.6);
    this.gameOverText.setAlpha(this.gameOverAlpha);
    this.gameOverSubText.setAlpha(this.gameOverAlpha);

    const flicker = 0.7 + Math.sin(this.sineTime * 6) * 0.3;
    this.gameOverText.setAlpha(this.gameOverAlpha * flicker);
    this.sineTime += dt;
  }

  public restartGame(): void {
    this.gameOver = false;
    this.oxygen = 100;
    this.depth = 0;
    this.collected = [];
    this.depthMeters = 0;
    this.gameOverAlpha = 0;
    this.sineTime = 0;
    this.bubbleTimer = 0;
    this.ventTimer = 0;
    this.spawnTimer = 0;
    this.subVelocity.set(0, 0);
    this.isDragging = false;
    this.generatedChunks.clear();
    this.terrainPoints = [];

    this.creatures.forEach(c => { this.creatureData.delete(c); c.destroy(); });
    this.creatures = [];
    this.bubbles.forEach(b => b.destroy());
    this.bubbles = [];
    this.ventParticles.forEach(p => p.destroy());
    this.ventParticles = [];
    this.collectEffects.forEach(e => e.destroy());
    this.collectEffects = [];
    this.particleCount = 0;

    this.tweens.killAll();

    this.gameOverlay.setAlpha(0);
    this.gameOverText.setAlpha(0);
    this.gameOverSubText.setAlpha(0);

    this.sub.setPosition(this.scale.width / 2, 100);
    this.sub.setRotation(0);

    this.terrainGraphics.clear();
    this.noise = new SimplexNoise(Math.random() * 10000);
    this.generateInitialTerrain();
    this.ventPositions = [];
    this.generateVentPositions();

    this.events.emit('oxygen-update', this.oxygen);
    this.events.emit('depth-update', this.depthMeters);
    this.events.emit('collected-update', this.collected);
  }
}
