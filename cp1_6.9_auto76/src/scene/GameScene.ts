import Phaser from 'phaser';
import { MapGenerator, TileType, MapData } from '../utils/MapGenerator';
import {
  BattleController,
  Hero,
  Monster,
  Trap,
  GameState,
  HeroClass,
  TrapType,
  BattleEvent
} from '../utils/BattleController';

const GRID_COLS = 8;
const GRID_ROWS = 8;
const BASE_TILE_SIZE = 60;
const MOBILE_TILE_SIZE = 45;

export class GameScene extends Phaser.Scene {
  private mapData!: MapData;
  private battleController!: BattleController;
  private tileSize: number = BASE_TILE_SIZE;
  private mapOffsetX: number = 0;
  private mapOffsetY: number = 0;

  private tileGraphics!: Phaser.GameObjects.Graphics;
  private gridLineGraphics!: Phaser.GameObjects.Graphics;
  private heroesGroup!: Phaser.GameObjects.Group;
  private monstersGroup!: Phaser.GameObjects.Group;
  private trapsGroup!: Phaser.GameObjects.Group;
  private effectsGroup!: Phaser.GameObjects.Group;
  private uiLayer!: Phaser.GameObjects.Container;

  private heroUIElements: Map<string, { hpBar: Phaser.GameObjects.Graphics; hpText: Phaser.GameObjects.Text }> = new Map();
  private turnText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private shopPanel?: Phaser.GameObjects.Container;
  private selectedHeroId: string | null = null;
  private selectedTrapType: TrapType = 'spike';

  private trapCooldowns: Map<TrapType, number> = new Map([['spike', 0], ['ice', 0], ['fire', 0]]);
  private trapMaxCooldowns: Map<TrapType, number> = new Map([['spike', 5], ['ice', 8], ['fire', 12]]);
  private trapPrices: Map<TrapType, number> = new Map([['spike', 20], ['ice', 35], ['fire', 50]]);

  private hasTreasure: boolean = false;
  private gameStartTime: number = 0;
  private isGameOver: boolean = false;
  private isMobile: boolean = false;
  private particleCount: number = 20;
  private playerPhaseTimer: number = 60;
  private lastTime: number = 0;
  private fpsHistory: number[] = [];
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.gameStartTime = this.time.now;
    this.isMobile = window.innerWidth < 768;
    this.tileSize = this.isMobile ? MOBILE_TILE_SIZE : BASE_TILE_SIZE;
    this.mapData = new MapGenerator(GRID_COLS, GRID_ROWS).generate();

    const totalWidth = GRID_COLS * this.tileSize;
    const totalHeight = GRID_ROWS * this.tileSize;
    this.mapOffsetX = (this.cameras.main.width - totalWidth) / 2;
    this.mapOffsetY = (this.cameras.main.height - totalHeight) / 2 + 20;

    this.initializeBattleController();
    this.createMap();
    this.createGroups();
    this.spawnHeroes();
    this.createUI();
    this.setupInput();
    this.setupEventListeners();
    this.startPlayerPhase();
    this.lastTime = this.time.now;
  }

  private initializeBattleController(): void {
    const startRoom = this.mapData.startRoom!;
    const heroes: Hero[] = [
      this.createHero('warrior', '战士', startRoom.centerX - 1, startRoom.centerY),
      this.createHero('archer', '弓箭手', startRoom.centerX, startRoom.centerY),
      this.createHero('mage', '法师', startRoom.centerX + 1, startRoom.centerY)
    ];
    const state: GameState = {
      heroes, monsters: [], traps: [], gold: 100, turn: 1, phase: 'player',
      playerPhaseTime: 60, score: 0, sealedSpawns: new Set()
    };
    this.battleController = new BattleController(state);
  }

  private createHero(cls: HeroClass, name: string, gridX: number, gridY: number): Hero {
    const startRoom = this.mapData.startRoom!;
    const clampedX = Phaser.Math.Clamp(gridX, startRoom.x, startRoom.x + startRoom.w - 1);
    const clampedY = Phaser.Math.Clamp(gridY, startRoom.y, startRoom.y + startRoom.h - 1);
    const stats = {
      warrior: { hp: 150, attack: 20, skillCd: 4 },
      archer: { hp: 100, attack: 25, skillCd: 3 },
      mage: { hp: 80, attack: 30, skillCd: 5 }
    }[cls];
    return {
      id: `hero_${cls}`, name, class: cls, hp: stats.hp, maxHp: stats.hp,
      attack: stats.attack, level: 1, exp: 0, expToNext: 50,
      skillCooldown: 0, skillMaxCooldown: stats.skillCd,
      gridX: clampedX, gridY: clampedY, isSelected: false
    };
  }

  private createMap(): void {
    this.tileGraphics = this.add.graphics();
    this.gridLineGraphics = this.add.graphics();
    this.drawTiles();
    this.drawGridLines();
    this.drawEndRoomGlow();
  }

  private drawTiles(): void {
    this.tileGraphics.clear();
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tile = this.mapData.grid[y][x];
        const px = this.mapOffsetX + x * this.tileSize;
        const py = this.mapOffsetY + y * this.tileSize;
        if (tile === TileType.WALL) {
          this.tileGraphics.fillStyle(0x2a2a2a, 1);
          this.tileGraphics.fillRect(px, py, this.tileSize, this.tileSize);
        } else {
          this.tileGraphics.fillStyle(0x4a4a4a, 1);
          this.tileGraphics.fillRect(px, py, this.tileSize, this.tileSize);
          this.drawFloorTexture(px, py);
          if (tile === TileType.START) {
            this.tileGraphics.fillStyle(0x22c55e, 0.5);
            this.tileGraphics.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            this.tileGraphics.lineStyle(2, 0x22c55e, 0.9);
            this.tileGraphics.strokeRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
          } else if (tile === TileType.END) {
            this.tileGraphics.fillStyle(0xfbbf24, 0.4);
            this.tileGraphics.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
          } else if (tile === TileType.MONSTER_SPAWN) {
            this.tileGraphics.fillStyle(0xef4444, 0.45);
            this.tileGraphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 3);
          }
        }
      }
    }
  }

  private drawFloorTexture(px: number, py: number): void {
    const seed = (px * 31 + py * 17) % 100;
    this.tileGraphics.fillStyle(0x5a5a5a, 0.15);
    for (let i = 0; i < 3; i++) {
      const nx = ((seed + i * 13) % 100) / 100 * (this.tileSize - 6) + 3;
      const ny = ((seed + i * 29) % 100) / 100 * (this.tileSize - 6) + 3;
      this.tileGraphics.fillRect(px + nx, py + ny, 2, 2);
    }
  }

  private drawGridLines(): void {
    this.gridLineGraphics.clear();
    this.gridLineGraphics.lineStyle(1, 0x334466, 0.5);
    for (let x = 0; x <= GRID_COLS; x++) {
      const px = this.mapOffsetX + x * this.tileSize;
      this.gridLineGraphics.lineBetween(px, this.mapOffsetY, px, this.mapOffsetY + GRID_ROWS * this.tileSize);
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      const py = this.mapOffsetY + y * this.tileSize;
      this.gridLineGraphics.lineBetween(this.mapOffsetX, py, this.mapOffsetX + GRID_COLS * this.tileSize, py);
    }
  }

  private drawEndRoomGlow(): void {
    const endRoom = this.mapData.endRoom;
    if (!endRoom) return;
    const px = this.mapOffsetX + endRoom.centerX * this.tileSize + this.tileSize / 2;
    const py = this.mapOffsetY + endRoom.centerY * this.tileSize + this.tileSize / 2;
    const glow = this.add.circle(px, py, this.tileSize / 2.5, 0xfbbf24, 0.6);
    this.tweens.add({
      targets: glow, alpha: { from: 0.3, to: 0.8 }, scale: { from: 0.9, to: 1.1 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  private createGroups(): void {
    this.heroesGroup = this.add.group();
    this.monstersGroup = this.add.group();
    this.trapsGroup = this.add.group();
    this.effectsGroup = this.add.group();
  }

  private spawnHeroes(): void {
    for (const hero of this.battleController.getState().heroes) {
      this.createHeroSprite(hero);
    }
  }

  private createHeroSprite(hero: Hero): void {
    const pos = this.gridToPixel(hero.gridX, hero.gridY);
    const container = this.add.container(pos.x, pos.y);
    container.setData('heroId', hero.id);
    container.setSize(this.tileSize * 0.8, this.tileSize * 0.8);
    container.setInteractive({ useHandCursor: true });

    const colors = {
      warrior: { body: 0x6b7280, accent: 0xef4444 },
      archer: { body: 0x22c55e, accent: 0x84cc16 },
      mage: { body: 0x8b5cf6, accent: 0x3b82f6 }
    }[hero.class];

    const circle = this.add.circle(0, 0, this.tileSize * 0.35, colors.body);
    circle.setStrokeStyle(3, colors.accent);
    const iconText = { warrior: '⚔', archer: '🏹', mage: '🔮' }[hero.class];
    const icon = this.add.text(0, 0, iconText, { fontFamily: 'sans-serif', fontSize: `${this.tileSize * 0.4}px` });
    icon.setOrigin(0.5);

    const lvlBg = this.add.circle(this.tileSize * 0.28, -this.tileSize * 0.28, this.tileSize * 0.15, 0xfbbf24);
    const lvlText = this.add.text(this.tileSize * 0.28, -this.tileSize * 0.28, hero.level.toString(), {
      fontFamily: 'sans-serif', fontSize: `${this.tileSize * 0.2}px`, color: '#1a1a2e', fontStyle: 'bold'
    });
    lvlText.setOrigin(0.5);

    const hpBg = this.add.rectangle(0, this.tileSize * 0.38, this.tileSize * 0.7, 6, 0x000000, 0.6);
    hpBg.setStrokeStyle(1, 0x333333);
    const hpFill = this.add.rectangle(-this.tileSize * 0.35, this.tileSize * 0.38, this.tileSize * 0.7, 6, 0x22c55e);
    hpFill.setOrigin(0, 0.5);
    container.setData('hpFill', hpFill);

    container.add([circle, icon, lvlBg, lvlText, hpBg, hpFill]);
    this.heroesGroup.add(container);

    container.on('pointerdown', () => this.selectHero(hero.id));
  }

  private createUI(): void {
    this.uiLayer = this.add.container(0, 0);
    this.createHeroUI();
    this.createTopRightUI();
    this.createBottomTrapBar();
    this.createFPSMonitor();
  }

  private createHeroUI(): void {
    const state = this.battleController.getState();
    const startX = this.isMobile ? 10 : 20;
    const startY = this.isMobile ? 10 : 20;
    const cardW = this.isMobile ? 110 : 140;
    const cardH = this.isMobile ? 50 : 60;
    const gap = this.isMobile ? 8 : 12;

    state.heroes.forEach((hero, idx) => {
      const y = startY + idx * (cardH + gap);
      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.6);
      this.drawRoundedRect(card, startX, y, cardW, cardH, 8);
      card.setData('heroId', hero.id);
      card.setInteractive(new Phaser.Geom.Rectangle(startX, y, cardW, cardH), Phaser.Geom.Rectangle.Contains);
      card.on('pointerdown', () => this.selectHero(hero.id));
      this.uiLayer.add(card);

      const colors = { warrior: 0xef4444, archer: 0x84cc16, mage: 0x3b82f6 }[hero.class];
      const avatarBg = this.add.circle(startX + 25, y + cardH / 2, this.isMobile ? 16 : 20, colors);
      avatarBg.setStrokeStyle(2, 0xffffff, 0.3);
      const avatarIcon = { warrior: '⚔', archer: '🏹', mage: '🔮' }[hero.class];
      const iconTxt = this.add.text(startX + 25, y + cardH / 2, avatarIcon, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '16px' : '20px'
      });
      iconTxt.setOrigin(0.5);

      const nameY = y + (this.isMobile ? 10 : 12);
      const nameText = this.add.text(startX + 48, nameY, hero.name, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '12px' : '14px', color: '#ffffff'
      });
      const lvlText = this.add.text(startX + cardW - 25, nameY, `Lv.${hero.level}`, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '11px' : '12px',
        color: '#fbbf24', fontStyle: 'bold'
      });
      lvlText.setOrigin(1, 0);

      const hpBg = this.add.graphics();
      hpBg.fillStyle(0x000000, 0.7);
      hpBg.fillRect(startX + 48, y + cardH - 16, cardW - 60, 8);
      const hpBar = this.add.graphics();
      const hpText = this.add.text(startX + cardW - 12, y + cardH - 12, '', {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '9px' : '10px', color: '#ffffff'
      });
      hpText.setOrigin(1, 0.5);

      this.uiLayer.add([avatarBg, iconTxt, nameText, lvlText, hpBg, hpBar, hpText]);
      this.heroUIElements.set(hero.id, { hpBar, hpText });
    });
    this.updateHeroUI();
  }

  private createTopRightUI(): void {
    const w = this.cameras.main.width;
    this.phaseText = this.add.text(w - 20, 20, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '14px' : '18px', color: '#ffffff', fontStyle: 'bold'
    });
    this.phaseText.setOrigin(1, 0);
    this.turnText = this.add.text(w - 20, 50, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '13px' : '16px', color: '#a0aec0'
    });
    this.turnText.setOrigin(1, 0);
    this.timerText = this.add.text(w - 20, 78, '', {
      fontFamily: 'sans-serif', fontSize: this.isMobile ? '12px' : '14px', color: '#fbbf24'
    });
    this.timerText.setOrigin(1, 0);

    const goldIcon = this.add.text(w - 140, 105, '💰', {
      fontFamily: 'sans-serif', fontSize: this.isMobile ? '18px' : '22px'
    });
    goldIcon.setOrigin(1, 0);
    this.tweens.add({
      targets: goldIcon, angle: { from: -10, to: 10 }, scale: { from: 1, to: 1.15 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this.goldText = this.add.text(w - 20, 108, '', {
      fontFamily: 'sans-serif', fontSize: this.isMobile ? '15px' : '18px',
      color: '#fbbf24', fontStyle: 'bold'
    });
    this.goldText.setOrigin(1, 0);
    this.uiLayer.add([this.phaseText, this.turnText, this.timerText, goldIcon, this.goldText]);
    this.updateTopRightUI();
  }

  private createBottomTrapBar(): void {
    const h = this.cameras.main.height;
    const trapTypes: TrapType[] = ['spike', 'ice', 'fire'];
    const trapInfo = {
      spike: { icon: '🔺', name: '尖刺', color: 0xef4444 },
      ice: { icon: '❄', name: '冰冻', color: 0x60a5fa },
      fire: { icon: '🔥', name: '火墙', color: 0xf97316 }
    };
    const btnSize = this.isMobile ? 55 : 70;
    const gap = this.isMobile ? 8 : 12;
    const totalW = trapTypes.length * btnSize + (trapTypes.length - 1) * gap;
    const startX = (this.cameras.main.width - totalW) / 2;
    const y = h - (this.isMobile ? 65 : 90);

    trapTypes.forEach((type, idx) => {
      const x = startX + idx * (btnSize + gap);
      const info = trapInfo[type];
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x000000, 0.6);
      this.drawRoundedRect(btnBg, x, y, btnSize, btnSize, 8);
      btnBg.setData('trapType', type);
      btnBg.setInteractive(new Phaser.Geom.Rectangle(x, y, btnSize, btnSize), Phaser.Geom.Rectangle.Contains);

      btnBg.on('pointerover', () => {
        if (this.battleController.getState().phase !== 'player') return;
        btnBg.clear();
        btnBg.fillStyle(0xffffff, 0.15);
        this.drawRoundedRect(btnBg, x, y, btnSize, btnSize, 8);
        this.tweens.add({ targets: btnBg, scaleX: 1.05, scaleY: 1.05, duration: 200 });
      });
      btnBg.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x000000, this.selectedTrapType === type ? 0.75 : 0.6);
        this.drawRoundedRect(btnBg, x, y, btnSize, btnSize, 8);
        this.tweens.add({ targets: btnBg, scaleX: 1, scaleY: 1, duration: 200 });
      });
      btnBg.on('pointerdown', () => {
        if (this.battleController.getState().phase !== 'player') return;
        this.tweens.add({ targets: btnBg, scaleX: 0.95, scaleY: 0.95, duration: 100, yoyo: true });
        this.selectedTrapType = type;
      });

      const icon = this.add.text(x + btnSize / 2, y + btnSize * 0.35, info.icon, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '22px' : '28px'
      });
      icon.setOrigin(0.5);
      const name = this.add.text(x + btnSize / 2, y + btnSize * 0.68, info.name, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '10px' : '12px', color: '#ffffff'
      });
      name.setOrigin(0.5);
      const price = this.add.text(x + btnSize / 2, y + btnSize * 0.88, `${this.trapPrices.get(type)}金`, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '9px' : '10px', color: '#fbbf24'
      });
      price.setOrigin(0.5);
      this.uiLayer.add([btnBg, icon, name, price]);
    });
    this.createShopButton();
  }

  private createShopButton(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = this.isMobile ? 80 : 100;
    const btnH = this.isMobile ? 40 : 50;
    const x = w - btnW - (this.isMobile ? 10 : 20);
    const y = h - btnH - (this.isMobile ? 10 : 20);

    const shopBtn = this.add.graphics();
    shopBtn.fillStyle(0x000000, 0.6);
    this.drawRoundedRect(shopBtn, x, y, btnW, btnH, 8);
    shopBtn.setInteractive(new Phaser.Geom.Rectangle(x, y, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    shopBtn.on('pointerover', () => {
      shopBtn.clear();
      shopBtn.fillStyle(0xffffff, 0.15);
      this.drawRoundedRect(shopBtn, x, y, btnW, btnH, 8);
      this.tweens.add({ targets: shopBtn, scaleX: 1.05, scaleY: 1.05, duration: 200 });
    });
    shopBtn.on('pointerout', () => {
      shopBtn.clear();
      shopBtn.fillStyle(0x000000, 0.6);
      this.drawRoundedRect(shopBtn, x, y, btnW, btnH, 8);
      this.tweens.add({ targets: shopBtn, scaleX: 1, scaleY: 1, duration: 200 });
    });
    shopBtn.on('pointerdown', () => {
      this.tweens.add({ targets: shopBtn, scaleX: 0.95, scaleY: 0.95, duration: 100, yoyo: true });
      this.toggleShop();
    });

    const shopText = this.add.text(x + btnW / 2, y + btnH / 2, '商店', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '14px' : '16px', color: '#fbbf24', fontStyle: 'bold'
    });
    shopText.setOrigin(0.5);
    this.uiLayer.add([shopBtn, shopText]);
  }

  private createFPSMonitor(): void {
    this.fpsText = this.add.text(10, this.cameras.main.height - 20, 'FPS: 60', {
      fontFamily: 'monospace', fontSize: '12px', color: '#6ee7b7'
    });
    this.uiLayer.add(this.fpsText);
  }

  private toggleShop(): void {
    if (this.shopPanel) {
      this.shopPanel.destroy();
      this.shopPanel = undefined;
      return;
    }
    const trapTypes: TrapType[] = ['spike', 'ice', 'fire'];
    const trapInfo = {
      spike: { icon: '🔺', name: '尖刺陷阱', desc: '造成15点伤害', cd: '5秒' },
      ice: { icon: '❄', name: '冰冻陷阱', desc: '造成10点伤害并减速', cd: '8秒' },
      fire: { icon: '🔥', name: '火墙陷阱', desc: '造成25点伤害', cd: '12秒' }
    };
    const cardW = this.isMobile ? 120 : 160;
    const cardH = this.isMobile ? 140 : 170;
    const gap = this.isMobile ? 10 : 16;
    const totalW = trapTypes.length * cardW + (trapTypes.length - 1) * gap;
    let panelX: number, panelY: number;
    if (this.isMobile) {
      panelX = (this.cameras.main.width - totalW) / 2;
      panelY = this.cameras.main.height - cardH - 80;
    } else {
      panelX = this.cameras.main.width - cardW - 30;
      panelY = this.cameras.main.height - cardH - 90;
    }
    this.shopPanel = this.add.container(panelX, panelY);

    trapTypes.forEach((type, idx) => {
      const info = trapInfo[type];
      const price = this.trapPrices.get(type)!;
      const cx = idx * (cardW + gap);
      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.75);
      this.drawRoundedRect(card, cx, 0, cardW, cardH, 8);
      card.lineStyle(2, 0x3b82f6, 0.5);
      this.drawRoundedRectStroke(card, cx, 0, cardW, cardH, 8);
      card.setInteractive(new Phaser.Geom.Rectangle(cx, 0, cardW, cardH), Phaser.Geom.Rectangle.Contains);
      card.on('pointerover', () => {
        card.clear();
        card.fillStyle(0xffffff, 0.1);
        this.drawRoundedRect(card, cx, 0, cardW, cardH, 8);
        card.lineStyle(2, 0x60a5fa, 0.8);
        this.drawRoundedRectStroke(card, cx, 0, cardW, cardH, 8);
        this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 200 });
      });
      card.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x000000, 0.75);
        this.drawRoundedRect(card, cx, 0, cardW, cardH, 8);
        card.lineStyle(2, 0x3b82f6, 0.5);
        this.drawRoundedRectStroke(card, cx, 0, cardW, cardH, 8);
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 200 });
      });
      card.on('pointerdown', () => {
        this.tweens.add({ targets: card, scaleX: 0.95, scaleY: 0.95, duration: 100, yoyo: true });
        this.buyTrap(type);
      });

      const icon = this.add.text(cx + cardW / 2, 35, info.icon, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '30px' : '40px'
      });
      icon.setOrigin(0.5);
      const nameText = this.add.text(cx + cardW / 2, 65, info.name, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '12px' : '14px', color: '#ffffff', fontStyle: 'bold'
      });
      nameText.setOrigin(0.5);
      const descText = this.add.text(cx + cardW / 2, 90, info.desc, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '10px' : '12px', color: '#a0aec0', align: 'center',
        wordWrap: { width: cardW - 20 }
      });
      descText.setOrigin(0.5, 0);
      const cdText = this.add.text(cx + cardW / 2, 115, `冷却: ${info.cd}`, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '9px' : '11px', color: '#60a5fa'
      });
      cdText.setOrigin(0.5);
      const priceText = this.add.text(cx + cardW / 2, cardH - 20, `💰 ${price}`, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '14px' : '16px',
        color: '#fbbf24', fontStyle: 'bold'
      });
      priceText.setOrigin(0.5);

      this.shopPanel!.add([card, icon, nameText, descText, cdText, priceText]);
    });

    this.shopPanel.setAlpha(0);
    this.tweens.add({
      targets: this.shopPanel, alpha: 1, duration: 250, ease: 'Back.easeOut'
    });
  }

  private buyTrap(type: TrapType): void {
    const price = this.trapPrices.get(type)!;
    const state = this.battleController.getState();
    if (state.gold < price) {
      this.showToast('金币不足！');
      return;
    }
    state.gold -= price;
    this.updateTopRightUI();
    this.showToast(`购买了${type === 'spike' ? '尖刺' : type === 'ice' ? '冰冻' : '火墙'}陷阱！`);
    this.selectedTrapType = type;
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.handleMapClick(pointer.x, pointer.y);
    });
  }

  private handleMapClick(px: number, py: number): void {
    const grid = this.pixelToGrid(px, py);
    if (!grid) return;
    if (grid.x < 0 || grid.x >= GRID_COLS || grid.y < 0 || grid.y >= GRID_ROWS) return;
    const state = this.battleController.getState();
    if (state.phase !== 'player') return;
    const tile = this.mapData.grid[grid.y][grid.x];
    if (tile === TileType.WALL) return;

    const clickedHero = state.heroes.find((h) => h.hp > 0 && h.gridX === grid.x && h.gridY === grid.y);
    if (clickedHero) {
      this.selectHero(clickedHero.id);
      return;
    }

    if (this.selectedHeroId) {
      const hero = state.heroes.find((h) => h.id === this.selectedHeroId);
      if (hero && hero.hp > 0) {
        const dx = Math.abs(grid.x - hero.gridX);
        const dy = Math.abs(grid.y - hero.gridY);
        if (dx + dy === 1) {
          if (this.battleController.moveHero(hero.id, grid.x, grid.y)) {
            this.animateHeroMove(hero);
            return;
          }
        }
      }
    }

    const existingTrap = state.traps.find((t) => t.gridX === grid.x && t.gridY === grid.y);
    if (existingTrap) {
      this.showToast('此处已有陷阱');
      return;
    }

    if (tile === TileType.MONSTER_SPAWN || tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
      const cd = this.trapCooldowns.get(this.selectedTrapType)!;
      if (cd > 0) {
        this.showToast(`陷阱冷却中: ${cd}秒`);
        return;
      }
      const price = this.trapPrices.get(this.selectedTrapType)!;
      if (state.gold < price) {
        this.showToast('金币不足！');
        return;
      }
      const placed = this.battleController.placeTrap(this.selectedTrapType, grid.x, grid.y);
      if (placed) {
        state.gold -= price;
        this.trapCooldowns.set(this.selectedTrapType, this.trapMaxCooldowns.get(this.selectedTrapType)!);
        this.createTrapSprite(placed);
        this.animateTrapPlacement(placed);
        this.updateTopRightUI();
      }
    }

    if (tile === TileType.END && !this.hasTreasure) {
      const heroNear = state.heroes.find((h) => h.hp > 0 && Math.abs(h.gridX - grid.x) + Math.abs(h.gridY - grid.y) <= 1);
      if (heroNear) {
        this.hasTreasure = true;
        state.score += 500;
        this.showToast('拾取了宝箱！+500分');
        this.checkVictory();
      }
    }
  }

  private selectHero(heroId: string): void {
    const state = this.battleController.getState();
    for (const hero of state.heroes) {
      hero.isSelected = hero.id === heroId;
    }
    this.selectedHeroId = heroId;
    this.heroesGroup.getChildren().forEach((obj) => {
      const go = obj as Phaser.GameObjects.Container;
      const id = go.getData('heroId');
      const circle = go.list[0] as Phaser.GameObjects.Arc;
      if (id === heroId) {
        circle.setStrokeStyle(4, 0xffffff, 0.9);
        this.tweens.add({ targets: go, scale: 1.1, duration: 200, yoyo: true });
      } else {
        const colors: Record<string, number> = {
          hero_warrior: 0xef4444, hero_archer: 0x84cc16, hero_mage: 0x3b82f6
        };
        circle.setStrokeStyle(3, colors[id] || 0xffffff);
      }
    });
  }

  private animateHeroMove(hero: Hero): void {
    const pos = this.gridToPixel(hero.gridX, hero.gridY);
    const go = this.heroesGroup.getChildren().find(
      (g) => (g as Phaser.GameObjects.Container).getData('heroId') === hero.id
    ) as Phaser.GameObjects.Container;
    if (go) {
      this.tweens.add({ targets: go, x: pos.x, y: pos.y, duration: 200, ease: 'Sine.easeOut' });
    }
  }

  private createTrapSprite(trap: Trap): void {
    const pos = this.gridToPixel(trap.gridX, trap.gridY);
    const colors = { spike: 0xef4444, ice: 0x60a5fa, fire: 0xf97316 };
    const icons = { spike: '🔺', ice: '❄', fire: '🔥' };
    const container = this.add.container(pos.x, pos.y);
    container.setData('trapId', trap.id);
    const bg = this.add.circle(0, 0, this.tileSize * 0.3, colors[trap.type], 0.6);
    bg.setStrokeStyle(2, colors[trap.type], 0.9);
    const icon = this.add.text(0, 0, icons[trap.type], {
      fontFamily: 'sans-serif', fontSize: `${this.tileSize * 0.45}px`
    });
    icon.setOrigin(0.5);
    container.add([bg, icon]);
    this.trapsGroup.add(container);
  }

  private animateTrapPlacement(trap: Trap): void {
    const go = this.trapsGroup.getChildren().find(
      (g) => (g as Phaser.GameObjects.Container).getData('trapId') === trap.id
    ) as Phaser.GameObjects.Container;
    if (go) {
      go.setScale(0.3);
      this.tweens.add({
        targets: go, scale: { from: 0.3, to: 1.2 },
        duration: 150, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: go, scale: 1, duration: 150, ease: 'Back.easeIn' });
        }
      });
    }
  }

  private setupEventListeners(): void {
    this.battleController.addListener((event: BattleEvent) => {
      if (event.type === 'damage' && event.targetId && event.value !== undefined) {
        this.onDamage(event.targetId, event.value);
      } else if (event.type === 'kill' && event.targetId) {
        this.onKill(event.targetId);
      } else if (event.type === 'exp' && event.targetId && event.value !== undefined) {
        this.onExpGain(event.targetId, event.value);
      } else if (event.type === 'levelup' && event.targetId && event.message) {
        this.onLevelUp(event.targetId, event.message);
      } else if (event.type === 'trap' && event.sourceId && event.targetId) {
        this.onTrapTrigger(event.sourceId, event.targetId);
      } else if (event.type === 'gold') {
        this.updateTopRightUI();
      } else if (event.type === 'seal' && event.message) {
        this.showToast(event.message);
      }
    });
  }

  private onDamage(targetId: string, damage: number): void {
    const state = this.battleController.getState();
    const hero = state.heroes.find((h) => h.id === targetId);
    if (hero) {
      this.updateHeroUI();
      const go = this.heroesGroup.getChildren().find(
        (g) => (g as Phaser.GameObjects.Container).getData('heroId') === targetId
      ) as Phaser.GameObjects.Container;
      if (go) {
        this.tweens.add({ targets: go, alpha: { from: 1, to: 0.4 }, duration: 100, yoyo: true, repeat: 2 });
      }
      this.showDamageText(hero.gridX, hero.gridY, damage, 0xef4444);
      return;
    }
    const monster = state.monsters.find((m) => m.id === targetId);
    if (monster) {
      const go = this.monstersGroup.getChildren().find(
        (g) => (g as Phaser.GameObjects.Container).getData('monsterId') === targetId
      ) as Phaser.GameObjects.Container;
      if (go) {
        const hpFill = go.getData('hpFill') as Phaser.GameObjects.Rectangle;
        if (hpFill) {
          const pct = Math.max(0, monster.hp / monster.maxHp);
          hpFill.width = this.tileSize * 0.55 * pct;
          hpFill.fillColor = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xfbbf24 : 0xef4444;
        }
        this.tweens.add({ targets: go, alpha: { from: 1, to: 0.5 }, duration: 80, yoyo: true, repeat: 1 });
      }
      this.showDamageText(monster.gridX, monster.gridY, damage, 0xfbbf24);
    }
  }

  private onKill(targetId: string): void {
    const heroGo = this.heroesGroup.getChildren().find(
      (g) => (g as Phaser.GameObjects.Container).getData('heroId') === targetId
    ) as Phaser.GameObjects.Container;
    if (heroGo) {
      this.tweens.add({ targets: heroGo, alpha: 0.2, scale: 0.6, duration: 500, ease: 'Back.easeIn' });
    }
    const monsterGo = this.monstersGroup.getChildren().find(
      (g) => (g as Phaser.GameObjects.Container).getData('monsterId') === targetId
    ) as Phaser.GameObjects.Container;
    if (monsterGo) {
      const monster = this.battleController.getState().monsters.find((m) => m.id === targetId);
      const gx = monster ? monster.gridX : 0;
      const gy = monster ? monster.gridY : 0;
      this.spawnDeathParticles(gx, gy);
      this.tweens.add({
        targets: monsterGo, alpha: 0, scale: 0.2, duration: 400, ease: 'Back.easeIn',
        onComplete: () => { this.monstersGroup.remove(monsterGo, true, true); }
      });
    }
    this.updateHeroUI();
    this.checkDefeat();
  }

  private onExpGain(_heroId: string, _exp: number): void {
    this.updateHeroUI();
  }

  private onLevelUp(heroId: string, message: string): void {
    this.showToast(message);
    const hero = this.battleController.getState().heroes.find((h) => h.id === heroId);
    if (!hero) return;
    const pos = this.gridToPixel(hero.gridX, hero.gridY);
    const beam = this.add.rectangle(pos.x, pos.y - this.tileSize * 0.5, 20, this.tileSize * 2, 0xfbbf24, 0);
    beam.setStrokeStyle(3, 0xfbbf24, 0.6);
    this.effectsGroup.add(beam);
    this.tweens.add({
      targets: beam, alpha: { from: 0, to: 0.8 }, height: { from: this.tileSize * 0.5, to: this.tileSize * 2 },
      duration: 600, yoyo: true, onComplete: () => beam.destroy()
    });
    this.showLevelUpOptions(heroId);
    this.updateHeroUI();
  }

  private showLevelUpOptions(heroId: string): void {
    const options = [
      { name: '攻击强化', desc: '攻击力 +8', icon: '⚔', effect: (h: Hero) => { h.attack += 8; } },
      { name: '生命强化', desc: '最大生命 +30', icon: '❤', effect: (h: Hero) => { h.maxHp += 30; h.hp = Math.min(h.maxHp, h.hp + 30); } },
      { name: '技能精通', desc: '技能冷却 -1', icon: '⚡', effect: (h: Hero) => { h.skillMaxCooldown = Math.max(1, h.skillMaxCooldown - 1); } }
    ];
    const cardW = this.isMobile ? 100 : 140;
    const cardH = this.isMobile ? 120 : 150;
    const gap = this.isMobile ? 10 : 16;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = (this.cameras.main.width - totalW) / 2;
    const startY = (this.cameras.main.height - cardH) / 2;

    const dimBg = this.add.rectangle(
      this.cameras.main.width / 2, this.cameras.main.height / 2,
      this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6
    );
    this.effectsGroup.add(dimBg);

    options.forEach((opt, idx) => {
      const x = startX + idx * (cardW + gap);
      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.85);
      this.drawRoundedRect(card, x, startY, cardW, cardH, 8);
      card.lineStyle(2, 0xfbbf24, 0.7);
      this.drawRoundedRectStroke(card, x, startY, cardW, cardH, 8);
      card.setInteractive(new Phaser.Geom.Rectangle(x, startY, cardW, cardH), Phaser.Geom.Rectangle.Contains);

      const icon = this.add.text(x + cardW / 2, startY + 35, opt.icon, {
        fontFamily: 'sans-serif', fontSize: this.isMobile ? '28px' : '36px'
      });
      icon.setOrigin(0.5);
      const name = this.add.text(x + cardW / 2, startY + 75, opt.name, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '13px' : '16px', color: '#fbbf24', fontStyle: 'bold'
      });
      name.setOrigin(0.5);
      const desc = this.add.text(x + cardW / 2, startY + 105, opt.desc, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '10px' : '12px', color: '#ffffff', align: 'center'
      });
      desc.setOrigin(0.5);

      this.effectsGroup.add([card, icon, name, desc]);

      card.on('pointerover', () => {
        card.clear();
        card.fillStyle(0xffffff, 0.1);
        this.drawRoundedRect(card, x, startY, cardW, cardH, 8);
        card.lineStyle(2, 0xfde047, 1);
        this.drawRoundedRectStroke(card, x, startY, cardW, cardH, 8);
        this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 200 });
      });
      card.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x000000, 0.85);
        this.drawRoundedRect(card, x, startY, cardW, cardH, 8);
        card.lineStyle(2, 0xfbbf24, 0.7);
        this.drawRoundedRectStroke(card, x, startY, cardW, cardH, 8);
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 200 });
      });
      card.on('pointerdown', () => {
        this.tweens.add({ targets: card, scaleX: 0.95, scaleY: 0.95, duration: 100, yoyo: true });
        const hero = this.battleController.getState().heroes.find((h) => h.id === heroId);
        if (hero) opt.effect(hero);
        this.effectsGroup.clear(true, true);
        this.updateHeroUI();
      });
    });
  }

  private onTrapTrigger(trapId: string, _targetId: string): void {
    const trap = this.battleController.getState().traps.find((t) => t.id === trapId);
    if (!trap) return;
    this.spawnTrapParticles(trap);
    const trapGo = this.trapsGroup.getChildren().find(
      (g) => (g as Phaser.GameObjects.Container).getData('trapId') === trapId
    ) as Phaser.GameObjects.Container;
    if (trapGo) {
      this.tweens.add({ targets: trapGo, alpha: 0.3, scale: 0.7, duration: 300 });
    }
  }

  private spawnTrapParticles(trap: Trap): void {
    const pos = this.gridToPixel(trap.gridX, trap.gridY);
    const colors = { spike: 0xef4444, ice: 0x60a5fa, fire: 0xf97316 };
    const color = colors[trap.type];
    const count = Math.floor(this.particleCount * 0.5);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const p = this.add.circle(
        pos.x + (Math.random() - 0.5) * 10,
        pos.y + (Math.random() - 0.5) * 10,
        3 + Math.random() * 4, color, 1
      );
      this.effectsGroup.add(p);
      this.tweens.add({
        targets: p,
        x: pos.x + Math.cos(angle) * (30 + Math.random() * 40),
        y: pos.y + Math.sin(angle) * (30 + Math.random() * 40),
        alpha: 0, scale: 0.3,
        duration: 400 + Math.random() * 300, ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private spawnDeathParticles(gx: number, gy: number): void {
    const pos = this.gridToPixel(gx, gy);
    const count = Math.floor(this.particleCount * 0.6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const p = this.add.circle(pos.x, pos.y, 2 + Math.random() * 3, 0xa0aec0, 1);
      this.effectsGroup.add(p);
      this.tweens.add({
        targets: p,
        x: pos.x + Math.cos(angle) * (30 + Math.random() * 50),
        y: pos.y + Math.sin(angle) * (30 + Math.random() * 50),
        alpha: 0, duration: 500 + Math.random() * 400, ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private showDamageText(gx: number, gy: number, damage: number, color: number): void {
    const pos = this.gridToPixel(gx, gy);
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    const text = this.add.text(pos.x, pos.y - this.tileSize * 0.3, `-${damage}`, {
      fontFamily: 'sans-serif', fontSize: 'bold 20px', color: colorStr,
      stroke: '#000000', strokeThickness: 3
    });
    text.setOrigin(0.5);
    this.effectsGroup.add(text);
    this.tweens.add({
      targets: text, y: pos.y - this.tileSize, alpha: 0, scale: 1.3,
      duration: 700, ease: 'Cubic.easeOut', onComplete: () => text.destroy()
    });
  }

  private startPlayerPhase(): void {
    this.battleController.getState().phase = 'player';
    this.playerPhaseTimer = 60;
    this.updateTopRightUI();
  }

  private startMonsterWarning(): void {
    this.battleController.getState().phase = 'transition';
    this.updateTopRightUI();
    let count = 2;
    const warning = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height / 2, count.toString(),
      { fontFamily: 'sans-serif', fontSize: 'bold 96px', color: '#ef4444', stroke: '#000000', strokeThickness: 6 }
    );
    warning.setOrigin(0.5);
    this.effectsGroup.add(warning);
    this.tweens.add({
      targets: warning, scale: { from: 0.5, to: 1.5 }, alpha: { from: 1, to: 0.2 },
      duration: 1000, repeat: 1,
      onRepeat: () => { count -= 1; warning.setText(count.toString()); },
      onComplete: () => { warning.destroy(); this.startMonsterPhase(); }
    });
  }

  private startMonsterPhase(): void {
    this.battleController.getState().phase = 'monster';
    this.updateTopRightUI();
    this.battleController.spawnMonsters(this.mapData.monsterSpawns);
    const state = this.battleController.getState();
    for (const monster of state.monsters) {
      const found = this.monstersGroup.getChildren().find(
        (g) => (g as Phaser.GameObjects.Container).getData('monsterId') === monster.id
      );
      if (!found) this.createMonsterSprite(monster);
    }
    this.time.delayedCall(300, () => this.moveMonstersStep());
  }

  private createMonsterSprite(monster: Monster): void {
    const pos = this.gridToPixel(monster.gridX, monster.gridY);
    const container = this.add.container(pos.x, pos.y);
    container.setData('monsterId', monster.id);
    container.setSize(this.tileSize * 0.7, this.tileSize * 0.7);
    const colors = {
      skeleton: { body: 0xe5e7eb, accent: 0x9ca3af },
      slime: { body: 0x84cc16, accent: 0x22c55e },
      bat: { body: 0x7c3aed, accent: 0xa855f7 }
    }[monster.type];
    const circle = this.add.circle(0, 0, this.tileSize * 0.3, colors.body);
    circle.setStrokeStyle(2, colors.accent);
    const iconText = { skeleton: '💀', slime: '🟢', bat: '🦇' }[monster.type];
    const icon = this.add.text(0, 0, iconText, { fontFamily: 'sans-serif', fontSize: `${this.tileSize * 0.35}px` });
    icon.setOrigin(0.5);
    const hpBg = this.add.rectangle(0, this.tileSize * 0.35, this.tileSize * 0.55, 5, 0x000000, 0.6);
    hpBg.setStrokeStyle(1, 0x333333);
    const hpFill = this.add.rectangle(-this.tileSize * 0.275, this.tileSize * 0.35, this.tileSize * 0.55, 5, 0x22c55e);
    hpFill.setOrigin(0, 0.5);
    container.setData('hpFill', hpFill);
    container.add([circle, icon, hpBg, hpFill]);
    this.monstersGroup.add(container);
    container.setScale(0.3);
    this.tweens.add({ targets: container, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  private moveMonstersStep(): void {
    const state = this.battleController.getState();
    if (state.phase !== 'monster') return;

    this.battleController.moveMonstersAlongPath(this.mapData.path);

    let allDone = true;
    state.monsters.forEach((monster) => {
      const go = this.monstersGroup.getChildren().find(
        (g) => (g as Phaser.GameObjects.Container).getData('monsterId') === monster.id
      ) as Phaser.GameObjects.Container;
      if (go) {
        const targetPos = this.gridToPixel(monster.gridX, monster.gridY);
        if (Math.abs(go.x - targetPos.x) > 1 || Math.abs(go.y - targetPos.y) > 1) {
          allDone = false;
          this.tweens.add({
            targets: go, x: targetPos.x, y: targetPos.y,
            duration: monster.isSlowed ? 1000 : 500, ease: 'Linear'
          });
        }
      }
    });

    this.time.delayedCall(allDone ? 500 : 600, () => {
      this.battleController.monstersAttackHeroes();
      this.battleController.heroesAttackMonsters();
      this.battleController.tickCooldowns();
      this.trapCooldowns.forEach((cd, type) => {
        if (cd > 0) this.trapCooldowns.set(type, cd - 1);
      });
      this.updateHeroUI();
      this.updateTopRightUI();
      if (this.isGameOver) return;
      this.battleController.getState().turn += 1;
      this.battleController.getState().playerPhaseTime = 60;
      this.startPlayerPhase();
    });
  }

  private updateHeroUI(): void {
    const state = this.battleController.getState();
    const startX = this.isMobile ? 10 : 20;
    const cardW = this.isMobile ? 110 : 140;
    const cardH = this.isMobile ? 50 : 60;
    const gap = this.isMobile ? 8 : 12;

    state.heroes.forEach((hero, idx) => {
      const ui = this.heroUIElements.get(hero.id);
      if (!ui) return;
      const pct = Math.max(0, hero.hp / hero.maxHp);
      ui.hpBar.clear();
      const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xfbbf24 : 0xef4444;
      ui.hpBar.fillStyle(color, 1);
      const startY = this.isMobile ? 10 : 20;
      const y = startY + idx * (cardH + gap);
      ui.hpBar.fillRect(startX + 48, y + cardH - 16, (cardW - 60) * pct, 8);
      ui.hpText.setText(`${hero.hp}/${hero.maxHp}`);
    });
  }

  private updateTopRightUI(): void {
    const state = this.battleController.getState();
    this.turnText.setText(`回合: ${state.turn}`);
    this.goldText.setText(` ${state.gold}`);
    const phaseLabels: Record<string, string> = { player: '玩家阶段', monster: '怪物阶段', transition: '准备阶段' };
    const phaseColors: Record<string, string> = { player: '#22c55e', monster: '#ef4444', transition: '#fbbf24' };
    this.phaseText.setText(phaseLabels[state.phase]);
    this.phaseText.setColor(phaseColors[state.phase]);
    this.timerText.setText(state.phase === 'player' ? `⏱ ${Math.ceil(this.playerPhaseTimer)}s` : '');
  }

  private showToast(message: string): void {
    const toast = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height / 2 - 120, message,
      {
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        fontSize: this.isMobile ? '16px' : '20px', color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 16, y: 8 }
      }
    );
    toast.setOrigin(0.5);
    this.effectsGroup.add(toast);
    this.tweens.add({
      targets: toast, alpha: { from: 0, to: 1 }, y: '-=10', duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, y: '-=30', duration: 600, delay: 1000,
          onComplete: () => toast.destroy()
        });
      }
    });
  }

  private checkVictory(): void {
    if (this.isGameOver) return;
    const state = this.battleController.getState();
    if (this.battleController.checkVictory(this.mapData.monsterSpawns.length, this.hasTreasure)) {
      this.isGameOver = true;
      this.showVictoryPanel(state.score);
    }
  }

  private checkDefeat(): void {
    if (this.isGameOver) return;
    if (this.battleController.checkDefeat()) {
      this.isGameOver = true;
      this.showDefeatPanel(this.battleController.getState().turn);
    }
  }

  private showVictoryPanel(score: number): void {
    const elapsed = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.showEndPanel(true, `胜利！\n总分: ${score}\n用时: ${elapsed}秒`, 0xfbbf24);
  }

  private showDefeatPanel(turns: number): void {
    this.showEndPanel(false, `失败...\n坚持回合: ${turns}`, 0xef4444);
  }

  private showEndPanel(isVictory: boolean, text: string, accentColor: number): void {
    const dimBg = this.add.rectangle(
      this.cameras.main.width / 2, this.cameras.main.height / 2,
      this.cameras.main.width, this.cameras.main.height, 0x000000, 0.75
    );
    this.effectsGroup.add(dimBg);

    const panelW = this.isMobile ? 280 : 360;
    const panelH = this.isMobile ? 200 : 260;
    const px = this.cameras.main.width / 2 - panelW / 2;
    const py = this.cameras.main.height / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(isVictory ? 0x1a1a2e : 0x2a0a0a, 0.95);
    this.drawRoundedRect(panel, px, py, panelW, panelH, 12);
    panel.lineStyle(3, accentColor, 0.8);
    this.drawRoundedRectStroke(panel, px, py, panelW, panelH, 12);
    this.effectsGroup.add(panel);

    const title = this.add.text(this.cameras.main.width / 2, py + 45, isVictory ? '🏆 胜利！' : '💀 失败', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '24px' : '32px',
      color: '#' + accentColor.toString(16).padStart(6, '0'), fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    const body = this.add.text(this.cameras.main.width / 2, py + panelH / 2, text, {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '16px' : '20px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8
    });
    body.setOrigin(0.5);

    const btnW = this.isMobile ? 120 : 160;
    const btnH = this.isMobile ? 40 : 50;
    const btnX = this.cameras.main.width / 2 - btnW / 2;
    const btnY = py + panelH - btnH - 25;

    const restartBtn = this.add.graphics();
    restartBtn.fillStyle(accentColor, 0.85);
    this.drawRoundedRect(restartBtn, btnX, btnY, btnW, btnH, 8);
    restartBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    restartBtn.on('pointerover', () => {
      restartBtn.clear();
      restartBtn.fillStyle(accentColor, 1);
      this.drawRoundedRect(restartBtn, btnX, btnY, btnW, btnH, 8);
      this.tweens.add({ targets: restartBtn, scaleX: 1.05, scaleY: 1.05, duration: 200 });
    });
    restartBtn.on('pointerout', () => {
      restartBtn.clear();
      restartBtn.fillStyle(accentColor, 0.85);
      this.drawRoundedRect(restartBtn, btnX, btnY, btnW, btnH, 8);
      this.tweens.add({ targets: restartBtn, scaleX: 1, scaleY: 1, duration: 200 });
    });
    restartBtn.on('pointerdown', () => {
      this.tweens.add({ targets: restartBtn, scaleX: 0.95, scaleY: 0.95, duration: 100, yoyo: true });
      this.scene.restart();
    });

    const restartText = this.add.text(this.cameras.main.width / 2, btnY + btnH / 2, '重新开始', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#0d0d1a',
      fontStyle: 'bold'
    });
    restartText.setOrigin(0.5);

    this.effectsGroup.add([title, body, restartBtn, restartText]);

    this.tweens.add({
      targets: [panel, title, body, restartBtn, restartText],
      scale: { from: 0.8, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.easeOut'
    });
  }

  public update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;
    const state = this.battleController.getState();

    if (state.phase === 'player') {
      this.playerPhaseTimer -= dt;
      if (this.playerPhaseTimer <= 0) {
        this.playerPhaseTimer = 0;
        this.startMonsterWarning();
      }
      this.updateTopRightUI();
    }

    this.fpsHistory.push(1000 / Math.max(delta, 1));
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    const fpsColor = avgFps >= 55 ? '#6ee7b7' : avgFps >= 50 ? '#fbbf24' : '#ef4444';
    this.fpsText.setText(`FPS: ${Math.round(avgFps)}`);
    this.fpsText.setColor(fpsColor);

    if (avgFps < 50) {
      this.particleCount = Math.max(5, this.particleCount - 1);
    } else if (avgFps > 58 && this.particleCount < 20) {
      this.particleCount = Math.min(20, this.particleCount + 1);
    }

    this.lastTime = time;
  }

  private gridToPixel(gx: number, gy: number): { x: number; y: number } {
    return {
      x: this.mapOffsetX + gx * this.tileSize + this.tileSize / 2,
      y: this.mapOffsetY + gy * this.tileSize + this.tileSize / 2
    };
  }

  private pixelToGrid(px: number, py: number): { x: number; y: number } | null {
    if (
      px < this.mapOffsetX ||
      px > this.mapOffsetX + GRID_COLS * this.tileSize ||
      py < this.mapOffsetY ||
      py > this.mapOffsetY + GRID_ROWS * this.tileSize
    ) {
      return null;
    }
    return {
      x: Math.floor((px - this.mapOffsetX) / this.tileSize),
      y: Math.floor((py - this.mapOffsetY) / this.tileSize)
    };
  }

  private drawRoundedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number): void {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
    g.fillPath();
  }

  private drawRoundedRectStroke(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number): void {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
    g.strokePath();
  }
}
