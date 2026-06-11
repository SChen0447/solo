import Phaser from 'phaser';

interface SeedData {
  key: string;
  name: string;
  color: number;
  color2: number;
  rarity: string;
  growthTime: number;
  parents?: [string, string];
}

interface PotData {
  row: number;
  col: number;
  seedKey: string | null;
  growthStage: number;
  health: number;
  mature: boolean;
  emitter: Phaser.GameObjects.Particles.ParticleEmitter | null;
  plantSprite: Phaser.GameObjects.Sprite | null;
  healthBar: Phaser.GameObjects.Graphics | null;
  soilSprite: Phaser.GameObjects.Image | null;
}

const BASE_SEEDS: SeedData[] = [
  { key: 'nightlight', name: '夜光菇', color: 0x7b68ee, color2: 0x9b88ff, rarity: '普通', growthTime: 3 },
  { key: 'icemoss', name: '冰晶苔', color: 0x87ceeb, color2: 0xa0e0ff, rarity: '普通', growthTime: 3 },
  { key: 'firevine', name: '火焰藤', color: 0xff4500, color2: 0xff7744, rarity: '普通', growthTime: 3 },
  { key: 'windbell', name: '风铃花', color: 0x98fb98, color2: 0xb8ffb8, rarity: '普通', growthTime: 3 },
  { key: 'crystal', name: '水晶兰', color: 0xe0e0ff, color2: 0xffffff, rarity: '普通', growthTime: 3 },
  { key: 'rainbow', name: '幻彩蕨', color: 0xff69b4, color2: 0xff99cc, rarity: '普通', growthTime: 3 },
];

const HYBRID_RECIPES: { [combo: string]: SeedData } = {};
let hybridIdCounter = 0;

function getComboKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function generateHybrid(parent1: SeedData, parent2: SeedData): SeedData {
  const combo = getComboKey(parent1.key, parent2.key);
  if (HYBRID_RECIPES[combo]) return HYBRID_RECIPES[combo];

  hybridIdCounter++;
  const blendedColor = blendColors(parent1.color, parent2.color);
  const blendedColor2 = blendColors(parent1.color2, parent2.color2);
  const names = generateHybridName(parent1.name, parent2.name);
  const rarity = parent1.rarity === '稀有' || parent2.rarity === '稀有' ? '史诗' : '稀有';

  const seed: SeedData = {
    key: `hybrid_${hybridIdCounter}`,
    name: names,
    color: blendedColor,
    color2: blendedColor2,
    rarity,
    growthTime: 3,
    parents: [parent1.key, parent2.key],
  };

  HYBRID_RECIPES[combo] = seed;
  return seed;
}

function blendColors(c1: number, c2: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return (r << 16) | (g << 8) | b;
}

function generateHybridName(n1: string, n2: string): string {
  const c1 = n1.length > 1 ? n1.slice(0, Math.ceil(n1.length / 2)) : n1;
  const c2 = n2.length > 1 ? n2.slice(Math.ceil(n2.length / 2)) : n2;
  return c1 + c2;
}

function colorToHex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

export class MainScene extends Phaser.Scene {
  private pots: PotData[][] = [];
  private potContainers: Phaser.GameObjects.Container[][] = [];
  private seedPoolContainer!: Phaser.GameObjects.Container;
  private selectedPlants: { row: number; col: number }[] = [];
  private hybridStation!: Phaser.GameObjects.Container;
  private magicCircle!: Phaser.GameObjects.Image;
  private magicCircleAngle: number = 0;
  private encyclopdiaOpen: boolean = false;
  private encyclopediaOverlay!: Phaser.GameObjects.Container;
  private allSeeds: SeedData[] = [...BASE_SEEDS];
  private discoveredSeeds: Set<string> = new Set(BASE_SEEDS.map((s) => s.key));
  private isWateringMode: boolean = false;
  private waterBtn!: Phaser.GameObjects.Container;
  private hybridBtn!: Phaser.GameObjects.Container;
  private encycloBtn!: Phaser.GameObjects.Container;
  private healthTimer!: Phaser.Time.TimerEvent;
  private draggingSeed: Phaser.GameObjects.Image | null = null;
  private draggingSeedKey: string | null = null;
  private waterDrag: Phaser.GameObjects.Image | null = null;
  private gridStartX: number = 0;
  private gridStartY: number = 0;
  private selectedGlow: Phaser.GameObjects.Arc[] = [];
  private potSize = 120;
  private gridCols = 4;
  private gridRows = 4;
  private totalParticles = 0;
  private maxParticles = 300;

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.createBackground(width, height);
    this.createPotGrid(width, height);
    this.createSeedPool(height);
    this.createHybridStation(width, height);
    this.createButtons(width, height);
    this.createEncyclopediaOverlay(width, height);
    this.setupHealthDecay();
    this.setupInputHandlers();
  }

  update(_time: number, delta: number): void {
    if (this.magicCircle) {
      this.magicCircleAngle += (0.5 * Math.PI * 2 * delta) / 1000;
      this.magicCircle.setRotation(this.magicCircleAngle);
    }
    this.updateHealthBars();
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2818, 1);
    bg.fillRect(0, 0, w, h);

    bg.fillStyle(0x3e2f1b, 1);
    bg.fillRect(0, h * 0.4, w, h * 0.6);

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const x = this.getPotX(col);
        const y = this.getPotY(row);
        bg.lineStyle(1, 0xffffff, 0.15);
        bg.strokeRect(x, y, this.potSize, this.potSize);
      }
    }
  }

  private getPotX(col: number): number {
    const gridW = this.gridCols * this.potSize;
    const startX = (this.cameras.main.width - gridW) / 2 + 80;
    this.gridStartX = startX;
    return startX + col * this.potSize;
  }

  private getPotY(row: number): number {
    const gridH = this.gridRows * this.potSize;
    const startY = (this.cameras.main.height - gridH) / 2 - 20;
    this.gridStartY = startY;
    return startY + row * this.potSize;
  }

  private createPotGrid(w: number, h: number): void {
    for (let row = 0; row < this.gridRows; row++) {
      this.pots[row] = [];
      this.potContainers[row] = [];
      for (let col = 0; col < this.gridCols; col++) {
        const px = this.getPotX(col) + this.potSize / 2;
        const py = this.getPotY(row) + this.potSize / 2;

        const container = this.add.container(px, py);

        const pot = this.add.image(0, 20, 'pot');
        container.add(pot);

        const soil = this.add.image(0, 30, 'soil');
        container.add(soil);

        const potData: PotData = {
          row,
          col,
          seedKey: null,
          growthStage: -1,
          health: 100,
          mature: false,
          emitter: null,
          plantSprite: null,
          healthBar: null,
          soilSprite: soil,
        };

        this.pots[row][col] = potData;
        this.potContainers[row][col] = container;

        pot.setInteractive(new Phaser.Geom.Rectangle(0, 0, 120, 120), Phaser.Geom.Rectangle.Contains);
        pot.on('pointerdown', () => this.onPotClick(row, col));
      }
    }
  }

  private createSeedPool(h: number): void {
    const panelW = 160;
    const panelH = h - 80;
    const panelX = 30;
    const panelY = 40;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x3b2a1a, 0.8);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panelBg.lineStyle(2, 0x8b5e3c, 0.5);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    const title = this.add.text(panelX + panelW / 2, panelY + 20, '种子池', {
      fontSize: '16px',
      color: '#c9a96e',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.seedPoolContainer = this.add.container(0, 0);
    this.seedPoolContainer.add(panelBg);
    this.seedPoolContainer.add(title);

    BASE_SEEDS.forEach((seed, i) => {
      const sy = panelY + 55 + i * 72;
      const sx = panelX + panelW / 2;

      const glow = this.add.graphics();
      glow.fillStyle(seed.color, 0.2);
      glow.fillCircle(sx, sy, 30);
      this.seedPoolContainer.add(glow);

      const seedImg = this.add.image(sx, sy, 'seed_' + seed.key);
      seedImg.setScale(0.9);
      seedImg.setInteractive({ draggable: true });
      seedImg.setData('seedKey', seed.key);
      this.seedPoolContainer.add(seedImg);

      const label = this.add.text(sx, sy + 26, seed.name, {
        fontSize: '12px',
        color: '#e0d0b0',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      this.seedPoolContainer.add(label);

      seedImg.on('dragstart', () => {
        this.draggingSeed = this.add.image(seedImg.x, seedImg.y, 'seed_' + seed.key);
        this.draggingSeed.setScale(1.2);
        this.draggingSeed.setDepth(100);
        this.draggingSeedKey = seed.key;
      });

      seedImg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.draggingSeed) {
          this.draggingSeed.setPosition(dragX, dragY);
        }
      });

      seedImg.on('dragend', () => {
        if (this.draggingSeed) {
          this.handleSeedDrop(this.draggingSeed.x, this.draggingSeed.y);
          this.draggingSeed.destroy();
          this.draggingSeed = null;
          this.draggingSeedKey = null;
        }
      });
    });
  }

  private createHybridStation(w: number, h: number): void {
    const cx = w / 2;
    const cy = h - 80;

    this.hybridStation = this.add.container(cx, cy);

    const stationBg = this.add.graphics();
    stationBg.fillStyle(0x6633cc, 0.2);
    stationBg.fillCircle(0, 0, 120);
    this.hybridStation.add(stationBg);

    this.magicCircle = this.add.image(0, 0, 'magic_circle');
    this.magicCircle.setScale(1.0);
    this.hybridStation.add(this.magicCircle);

    const slot1Marker = this.add.graphics();
    slot1Marker.lineStyle(2, 0xbb88ff, 0.6);
    slot1Marker.strokeCircle(-45, 0, 18);
    slot1Marker.fillStyle(0x9966ff, 0.1);
    slot1Marker.fillCircle(-45, 0, 18);
    this.hybridStation.add(slot1Marker);

    const slot2Marker = this.add.graphics();
    slot2Marker.lineStyle(2, 0xbb88ff, 0.6);
    slot2Marker.strokeCircle(45, 0, 18);
    slot2Marker.fillStyle(0x9966ff, 0.1);
    slot2Marker.fillCircle(45, 0, 18);
    this.hybridStation.add(slot2Marker);

    const plusText = this.add.text(0, -2, '+', {
      fontSize: '20px',
      color: '#bb88ff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.hybridStation.add(plusText);
  }

  private createButtons(w: number, h: number): void {
    const btnY = h - 80;

    this.waterBtn = this.createCircleButton(w / 2 - 200, btnY, '浇', 0x4488cc, () => {
      this.isWateringMode = !this.isWateringMode;
      if (this.isWateringMode) {
        this.showTooltip('点击花盆浇水');
      }
    });
    this.add.existing(this.waterBtn);

    this.hybridBtn = this.createCircleButton(w / 2 + 0, btnY + 80, '杂', 0xc9a96e, () => {
      this.performHybridization();
    });
    this.add.existing(this.hybridBtn);

    this.encycloBtn = this.createCircleButton(w / 2 + 200, btnY, '典', 0x9b59b6, () => {
      this.toggleEncyclopedia();
    });
    this.add.existing(this.encycloBtn);
  }

  private createCircleButton(
    x: number,
    y: number,
    label: string,
    tint: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.image(0, 0, 'btn_circle');
    bg.setTint(tint);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontSize: '20px',
      color: '#3e2f1b',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power1',
      });
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Power1',
      });
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => callback(),
      });
    });

    return container;
  }

  private handleSeedDrop(x: number, y: number): void {
    if (!this.draggingSeedKey) return;

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const pot = this.pots[row][col];
        if (pot.seedKey !== null) continue;

        const px = this.getPotX(col) + this.potSize / 2;
        const py = this.getPotY(row) + this.potSize / 2;
        const dist = Phaser.Math.Distance.Between(x, y, px, py);

        if (dist < this.potSize / 2) {
          this.plantSeed(row, col, this.draggingSeedKey!);
          return;
        }
      }
    }
  }

  private plantSeed(row: number, col: number, seedKey: string): void {
    const pot = this.pots[row][col];
    if (pot.seedKey !== null) return;

    pot.seedKey = seedKey;
    pot.growthStage = 0;
    pot.health = 100;
    pot.mature = false;

    const container = this.potContainers[row][col];

    const seedSprite = this.add.image(0, 30, 'seed_' + seedKey);
    seedSprite.setScale(0.7);
    container.add(seedSprite);

    this.tweens.add({
      targets: seedSprite,
      y: 20,
      duration: 250,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: seedSprite,
          y: 25,
          duration: 250,
          ease: 'Power2',
          onComplete: () => {
            seedSprite.destroy();
            this.startGrowth(row, col, seedKey);
          },
        });
      },
    });
  }

  private startGrowth(row: number, col: number, seedKey: string): void {
    const pot = this.pots[row][col];
    const container = this.potContainers[row][col];

    const seedData = this.getSeedData(seedKey);
    if (!seedData) return;

    const sproutKey = this.getPlantTextureKey(seedKey, '_seedling');
    const sprout = this.add.image(0, 30, sproutKey);
    sprout.setOrigin(0.5, 1);
    container.add(sprout);
    pot.plantSprite = sprout;

    this.tweens.add({
      targets: sprout,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Power2',
    });

    this.time.delayedCall(1000, () => {
      if (pot.seedKey !== seedKey) return;
      sprout.destroy();

      const youngKey = this.getPlantTextureKey(seedKey, '_sprout');
      const young = this.add.image(0, 25, youngKey);
      young.setOrigin(0.5, 1);
      young.setScale(0.2);
      container.add(young);
      pot.plantSprite = young;
      pot.growthStage = 1;

      this.tweens.add({
        targets: young,
        scaleX: 1,
        scaleY: 1,
        duration: 800,
        ease: 'Back.easeOut',
      });
    });

    this.time.delayedCall(2000, () => {
      if (pot.seedKey !== seedKey) return;

      if (pot.plantSprite) {
        pot.plantSprite.destroy();
      }

      const matureKey = this.getPlantTextureKey(seedKey, '_mature');
      const mature = this.add.image(0, 15, matureKey);
      mature.setOrigin(0.5, 1);
      mature.setScale(0.2);
      container.add(mature);
      pot.plantSprite = mature;
      pot.growthStage = 2;
      pot.mature = true;

      this.tweens.add({
        targets: mature,
        scaleX: 1,
        scaleY: 1,
        duration: 700,
        ease: 'Back.easeOut',
      });

      this.startParticleEffect(row, col, seedData);
    });
  }

  private getPlantTextureKey(seedKey: string, suffix: string): string {
    if (seedKey.startsWith('hybrid_')) {
      return seedKey + suffix;
    }
    const baseKey = seedKey;
    return baseKey + suffix;
  }

  private getSeedData(key: string): SeedData | null {
    const base = BASE_SEEDS.find((s) => s.key === key);
    if (base) return base;
    for (const recipe of Object.values(HYBRID_RECIPES)) {
      if (recipe.key === key) return recipe;
    }
    return null;
  }

  private startParticleEffect(row: number, col: number, seedData: SeedData): void {
    const pot = this.pots[row][col];
    if (pot.emitter) {
      pot.emitter.stop();
      pot.emitter = null;
    }

    if (this.totalParticles >= this.maxParticles) return;

    const container = this.potContainers[row][col];
    const colorStr = colorToHex(seedData.color);

    const particles = this.add.particles(container.x, container.y - 20, 'particle', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.4, end: 0.1 },
      lifespan: 800,
      blendMode: 'ADD',
      tint: seedData.color,
      frequency: 2000,
      emitting: false,
      quantity: 6,
    });

    particles.setDepth(50);
    pot.emitter = particles;

    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (!pot.mature || pot.seedKey === null || this.totalParticles >= this.maxParticles) return;
        particles.emit(6);
        this.totalParticles += 6;
        this.time.delayedCall(500, () => {
          this.totalParticles = Math.max(0, this.totalParticles - 6);
        });
      },
    });
  }

  private onPotClick(row: number, col: number): void {
    const pot = this.pots[row][col];

    if (this.isWateringMode && pot.seedKey !== null && pot.health > 0) {
      this.waterPlant(row, col);
      return;
    }

    if (pot.mature && pot.health > 0) {
      const alreadyIdx = this.selectedPlants.findIndex(
        (p) => p.row === row && p.col === col
      );

      if (alreadyIdx >= 0) {
        this.deselectPlant(alreadyIdx);
      } else if (this.selectedPlants.length < 2) {
        this.selectPlant(row, col);
      } else {
        this.deselectPlant(0);
        this.selectPlant(row, col);
      }
    }
  }

  private selectPlant(row: number, col: number): void {
    this.selectedPlants.push({ row, col });
    const container = this.potContainers[row][col];

    const glow = this.add.graphics();
    glow.lineStyle(3, 0xffdd44, 0.8);
    glow.strokeCircle(0, 0, 45);
    glow.fillStyle(0xffdd44, 0.1);
    glow.fillCircle(0, 0, 45);
    container.add(glow);
    this.selectedGlow.push(glow);

    this.tweens.add({
      targets: glow,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private deselectPlant(idx: number): void {
    this.selectedPlants.splice(idx, 1);
    const glow = this.selectedGlow.splice(idx, 1)[0];
    if (glow) {
      this.tweens.killTweensOf(glow);
      glow.destroy();
    }
  }

  private clearSelection(): void {
    this.selectedPlants = [];
    this.selectedGlow.forEach((g) => {
      this.tweens.killTweensOf(g);
      g.destroy();
    });
    this.selectedGlow = [];
  }

  private waterPlant(row: number, col: number): void {
    const pot = this.pots[row][col];
    if (!pot.seedKey || pot.health <= 0) return;

    const container = this.potContainers[row][col];

    for (let i = 0; i < 5; i++) {
      const drop = this.add.graphics();
      drop.fillStyle(0x4488cc, 0.8);
      drop.fillCircle(0, 0, 3);
      drop.setPosition(Phaser.Math.Between(-15, 15), -40);
      container.add(drop);

      this.tweens.add({
        targets: drop,
        y: 25,
        duration: 400 + i * 60,
        ease: 'Power2',
        delay: i * 80,
        onComplete: () => drop.destroy(),
      });
    }

    pot.health = Math.min(100, pot.health + 15);

    if (pot.plantSprite) {
      const plant = pot.plantSprite;
      this.tweens.add({
        targets: plant,
        tint: 0x88ff88,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          plant.clearTint();
        },
      });
    }

    this.isWateringMode = false;
  }

  private performHybridization(): void {
    if (this.selectedPlants.length !== 2) {
      this.showTooltip('请选择两株成株进行杂交');
      return;
    }

    const p1 = this.pots[this.selectedPlants[0].row][this.selectedPlants[0].col];
    const p2 = this.pots[this.selectedPlants[1].row][this.selectedPlants[1].col];

    if (!p1.seedKey || !p2.seedKey || !p1.mature || !p2.mature) {
      this.showTooltip('需要两株成熟的植物');
      return;
    }

    if (p1.seedKey === p2.seedKey && this.selectedPlants[0].row === this.selectedPlants[1].row && this.selectedPlants[0].col === this.selectedPlants[1].col) {
      this.showTooltip('请选择不同的两株植物');
      return;
    }

    const seed1 = this.getSeedData(p1.seedKey);
    const seed2 = this.getSeedData(p2.seedKey);
    if (!seed1 || !seed2) return;

    this.animateMagicCircle(() => {
      const newSeed = generateHybrid(seed1, seed2);
      this.generateHybridTextures(newSeed);

      if (!this.discoveredSeeds.has(newSeed.key)) {
        this.discoveredSeeds.add(newSeed.key);
        this.allSeeds.push(newSeed);
      }

      this.createHybridSeedResult(newSeed);

      const r1 = this.selectedPlants[0].row;
      const c1 = this.selectedPlants[0].col;
      const r2 = this.selectedPlants[1].row;
      const c2 = this.selectedPlants[1].col;

      this.removePlant(r1, c1);
      this.removePlant(r2, c2);
      this.clearSelection();

      this.time.delayedCall(500, () => {
        this.openEncyclopedia();
      });
    });
  }

  private animateMagicCircle(callback: () => void): void {
    if (!this.magicCircle) return;

    this.tweens.add({
      targets: this.magicCircle,
      alpha: { from: 0.5, to: 1.0 },
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: () => callback(),
    });
  }

  private generateHybridTextures(seed: SeedData): void {
    const key = seed.key;
    const textureKeys = [key + '_seedling', key + '_sprout', key + '_mature'];

    textureKeys.forEach((tKey, stage) => {
      const heights = [20, 40, 80];
      const g = this.add.graphics();
      const h = heights[stage];
      const w = 60;

      if (stage === 0) {
        g.fillStyle(seed.color, 0.7);
        g.fillCircle(w / 2, 14, 8);
        g.fillStyle(seed.color2, 0.5);
        g.fillCircle(w / 2, 10, 5);
      } else if (stage === 1) {
        g.fillStyle(0x2a5a1a, 1);
        g.fillRect(w / 2 - 2, 8, 4, h);
        g.fillStyle(seed.color, 0.8);
        g.fillCircle(w / 2 - 10, h - 5, 8);
        g.fillCircle(w / 2 + 10, h - 5, 8);
        g.fillStyle(seed.color2, 0.5);
        g.fillCircle(w / 2, h - 12, 6);
      } else {
        g.fillStyle(0x2a5a1a, 1);
        g.fillRect(w / 2 - 2, 8, 4, h);
        g.fillStyle(seed.color, 0.9);
        g.fillCircle(w / 2 - 14, h - 10, 10);
        g.fillCircle(w / 2 + 14, h - 10, 10);
        g.fillCircle(w / 2, h - 20, 12);
        g.fillStyle(seed.color2, 0.5);
        g.fillCircle(w / 2 - 8, h - 28, 7);
        g.fillCircle(w / 2 + 8, h - 28, 7);
      }

      g.generateTexture(tKey, w, h + 20);
      g.destroy();
    });

    const seedG = this.add.graphics();
    seedG.fillStyle(seed.color, 0.3);
    seedG.fillCircle(22, 22, 20);
    seedG.fillStyle(seed.color, 1);
    seedG.fillCircle(22, 22, 14);
    seedG.fillStyle(seed.color2, 0.6);
    seedG.fillCircle(18, 16, 5);
    seedG.generateTexture('seed_' + key, 44, 44);
    seedG.destroy();
  }

  private createHybridSeedResult(seed: SeedData): void {
    const { width, height } = this.cameras.main;
    const seedImg = this.add.image(width / 2, height - 80, 'seed_' + seed.key);
    seedImg.setScale(0);
    seedImg.setDepth(200);

    this.tweens.add({
      targets: seedImg,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: seedImg,
          scaleX: 0,
          scaleY: 0,
          duration: 300,
          delay: 800,
          onComplete: () => seedImg.destroy(),
        });
      },
    });

    this.showTooltip(`获得新品种: ${seed.name}!`);
  }

  private removePlant(row: number, col: number): void {
    const pot = this.pots[row][col];
    const container = this.potContainers[row][col];

    if (pot.emitter) {
      pot.emitter.stop();
      pot.emitter = null;
    }

    if (pot.plantSprite) {
      this.tweens.add({
        targets: pot.plantSprite,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          pot.plantSprite?.destroy();
          pot.plantSprite = null;
        },
      });
    }

    pot.seedKey = null;
    pot.growthStage = -1;
    pot.health = 100;
    pot.mature = false;
  }

  private setupHealthDecay(): void {
    this.healthTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => {
        for (let row = 0; row < this.gridRows; row++) {
          for (let col = 0; col < this.gridCols; col++) {
            const pot = this.pots[row][col];
            if (pot.seedKey && pot.health > 0) {
              pot.health = Math.max(0, pot.health - 5);
              if (pot.health <= 0) {
                this.witherPlant(row, col);
              }
            }
          }
        }
      },
    });
  }

  private witherPlant(row: number, col: number): void {
    const pot = this.pots[row][col];
    const container = this.potContainers[row][col];

    if (pot.emitter) {
      pot.emitter.stop();
      pot.emitter = null;
    }

    if (pot.plantSprite) {
      this.tweens.add({
        targets: pot.plantSprite,
        alpha: 0.2,
        tint: 0x555555,
        duration: 1000,
        onComplete: () => {
          pot.plantSprite?.destroy();
          pot.plantSprite = null;
          pot.seedKey = null;
          pot.growthStage = -1;
          pot.mature = false;
          pot.health = 100;
        },
      });
    }

    this.showTooltip('一株植物枯萎了...');
  }

  private updateHealthBars(): void {
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const pot = this.pots[row][col];
        const container = this.potContainers[row][col];

        if (pot.healthBar) {
          pot.healthBar.destroy();
          pot.healthBar = null;
        }

        if (pot.seedKey && pot.health > 0 && pot.health < 100) {
          const bar = this.add.graphics();
          const barW = 50;
          const barH = 5;
          const x = -barW / 2;
          const y = -50;

          bar.fillStyle(0x333333, 0.8);
          bar.fillRect(x, y, barW, barH);

          const ratio = pot.health / 100;
          const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
          bar.fillStyle(barColor, 1);
          bar.fillRect(x, y, barW * ratio, barH);

          container.add(bar);
          pot.healthBar = bar;
        }
      }
    }
  }

  private createEncyclopediaOverlay(w: number, h: number): void {
    this.encyclopediaOverlay = this.add.container(w / 2, h / 2);
    this.encyclopediaOverlay.setDepth(500);
    this.encyclopediaOverlay.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d2818, 0.85);
    bg.fillRect(-w / 2, -h / 2, w, h);
    this.encyclopediaOverlay.add(bg);

    const closeBtn = this.add.text(w / 2 - 60, -h / 2 + 20, '✕', {
      fontSize: '28px',
      color: '#c9a96e',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeEncyclopedia());
    this.encyclopediaOverlay.add(closeBtn);

    const title = this.add.text(0, -h / 2 + 40, '魔法植物图鉴', {
      fontSize: '28px',
      color: '#c9a96e',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.encyclopediaOverlay.add(title);
  }

  private toggleEncyclopedia(): void {
    if (this.encyclopdiaOpen) {
      this.closeEncyclopedia();
    } else {
      this.openEncyclopedia();
    }
  }

  private openEncyclopedia(): void {
    this.encyclopdiaOpen = true;
    this.refreshEncyclopediaContent();
    this.encyclopediaOverlay.setVisible(true);

    this.tweens.add({
      targets: this.encyclopediaOverlay,
      alpha: { from: 0, to: 1 },
      duration: 300,
    });
  }

  private closeEncyclopedia(): void {
    this.encyclopdiaOpen = false;
    this.tweens.add({
      targets: this.encyclopediaOverlay,
      alpha: { from: 1, to: 0 },
      duration: 300,
      onComplete: () => {
        this.encyclopediaOverlay.setVisible(false);
      },
    });
  }

  private refreshEncyclopediaContent(): void {
    while (this.encyclopediaOverlay.length > 2) {
      const child = this.encyclopediaOverlay.getAt(2);
      if (child instanceof Phaser.GameObjects.GameObject) {
        child.destroy();
      }
    }

    const discovered = this.allSeeds.filter((s) => this.discoveredSeeds.has(s.key));
    const cols = 3;
    const cardW = 200;
    const cardH = 160;
    const padX = 30;
    const padY = 20;
    const startY = -350;
    const startX = -((cols * (cardW + padX)) / 2) + (cardW + padX) / 2;

    discovered.forEach((seed, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + padX);
      const cy = startY + row * (cardH + padY) + 40;

      const card = this.add.container(cx, cy);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x2a1f10, 0.9);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      cardBg.lineStyle(1, 0x8b5e3c, 0.5);
      cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      card.add(cardBg);

      const thumbG = this.add.graphics();
      thumbG.fillStyle(seed.color, 0.8);
      thumbG.fillCircle(-cardW / 2 + 40, -cardH / 2 + 40, 18);
      thumbG.fillStyle(seed.color2, 0.5);
      thumbG.fillCircle(-cardW / 2 + 36, -cardH / 2 + 36, 8);
      card.add(thumbG);

      const nameText = this.add.text(-cardW / 2 + 70, -cardH / 2 + 18, seed.name, {
        fontSize: '14px',
        color: '#e8d5a0',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      });
      card.add(nameText);

      const rarityColor = seed.rarity === '史诗' ? '#ff4488' : seed.rarity === '稀有' ? '#aa88ff' : '#88cc88';
      const rarityText = this.add.text(-cardW / 2 + 70, -cardH / 2 + 38, seed.rarity, {
        fontSize: '11px',
        color: rarityColor,
        fontFamily: 'sans-serif',
      });
      card.add(rarityText);

      const growthText = this.add.text(-cardW / 2 + 12, -cardH / 2 + 65, `生长周期: ${seed.growthTime}秒`, {
        fontSize: '11px',
        color: '#a09080',
        fontFamily: 'sans-serif',
      });
      card.add(growthText);

      if (seed.parents) {
        const p1 = this.getSeedData(seed.parents[0]);
        const p2 = this.getSeedData(seed.parents[1]);
        const parentNames = (p1 ? p1.name : '?') + ' + ' + (p2 ? p2.name : '?');
        const parentText = this.add.text(-cardW / 2 + 12, -cardH / 2 + 82, `配方: ${parentNames}`, {
          fontSize: '11px',
          color: '#a09080',
          fontFamily: 'sans-serif',
        });
        card.add(parentText);
      }

      this.encyclopediaOverlay.add(card);

      if (i === discovered.length - 1) {
        card.setScale(0.5);
        this.tweens.add({
          targets: card,
          scaleX: 1,
          scaleY: 1,
          duration: 400,
          ease: 'Back.easeOut',
        });

        const flash = this.add.graphics();
        flash.fillStyle(0xffffff, 0.6);
        flash.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
        card.add(flash);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 300,
          onComplete: () => flash.destroy(),
        });
      }
    });
  }

  private showTooltip(msg: string): void {
    const { width, height } = this.cameras.main;
    const tooltip = this.add.text(width / 2, height / 2 - 50, msg, {
      fontSize: '18px',
      color: '#ffdd88',
      fontFamily: 'sans-serif',
      backgroundColor: '#1a0f05aa',
      padding: { x: 16, y: 8 },
    })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    this.tweens.add({
      targets: tooltip,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 1500,
      onComplete: () => tooltip.destroy(),
    });
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (this.encyclopdiaOpen && gameObjects.length === 0) {
        this.closeEncyclopedia();
      }
    });
  }
}
