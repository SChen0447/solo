import Phaser from 'phaser';
import { Submarine } from '../entities/Submarine';
import { Artifact, ArtifactType } from '../entities/Artifact';

const MAP_WIDTH = 2700;
const MAP_HEIGHT = 1800;
const TILE_SIZE = 32;

interface OxygenBubble {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  baseY: number;
  collected: boolean;
}

interface EnergyCore {
  container: Phaser.GameObjects.Container;
  x: number;
  y: number;
  calibrated: boolean;
  ringGraphics: Phaser.GameObjects.Graphics;
  energyBall: Phaser.GameObjects.Graphics;
  targetAngle: number;
  currentRingRadius: number;
  ringDirection: number;
  rotation: number;
}

interface SpatialGrid {
  cellSize: number;
  cells: Map<string, OxygenBubble[]>;
}

export class GameScene extends Phaser.Scene {
  private submarine!: Submarine;
  private artifacts: Artifact[] = [];
  private oxygenBubbles: OxygenBubble[] = [];
  private energyCores: EnergyCore[] = [];
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private obstacleLayer!: Phaser.Tilemaps.TilemapLayer | null;
  private backgroundLayer!: Phaser.Tilemaps.TilemapLayer | null;

  private collectedArtifacts: { ceramic: number; bronze: number; gold: number } = {
    ceramic: 0,
    bronze: 0,
    gold: 0
  };

  private totalArtifacts = 15;
  private oxygenBar!: Phaser.GameObjects.Graphics;
  private oxygenBarFill!: Phaser.GameObjects.Graphics;
  private artifactCountText!: Phaser.GameObjects.Text;
  private collectedThumbnails: Phaser.GameObjects.Container[] = [];

  private gameOver = false;
  private gameWon = false;
  private oxygenDepletedTime = 0;
  private oxygenDepletedWarning!: Phaser.GameObjects.Text;
  private warningVisible = false;
  private warningTimer = 0;

  private spatialGrid!: SpatialGrid;
  private currentParticles = 0;
  private maxParticles = 50;
  private particleObjects: Phaser.GameObjects.Graphics[] = [];

  private undercurrentEffects: Phaser.GameObjects.Graphics[] = [];
  private undercurrentRotations: Map<Phaser.GameObjects.Graphics, number> = new Map();
  private undercurrentLifetimes: Map<Phaser.GameObjects.Graphics, number> = new Map();
  private ceramicCollectedTriggered = false;

  private allArtifactsCollected = false;
  private beamGraphics: Phaser.GameObjects.Graphics[] = [];
  private beamColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
  private beamColorIndex = 0;
  private beamTimer = 0;

  private victoryText!: Phaser.GameObjects.Text;
  private victoryOverlay!: Phaser.GameObjects.Graphics;
  private score = 0;

  private gameOverOverlay!: Phaser.GameObjects.Graphics;
  private gameOverText!: Phaser.GameObjects.Text;
  private finalScoreText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Container;

  private hudContainer!: Phaser.GameObjects.Container;
  private bgGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.createBackground();
    this.createTilemap();
    this.createSubmarine();
    this.createArtifacts();
    this.createOxygenBubbles();
    this.createEnergyCores();
    this.createHUD();
    this.setupCamera();
    this.setupCollisions();
    this.initSpatialGrid();
    this.createGameOverScreen();
    this.createVictoryScreen();
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();

    for (let y = 0; y < MAP_HEIGHT; y += 4) {
      const t = y / MAP_HEIGHT;
      const r = Math.floor(11 + t * 2);
      const g = Math.floor(26 + t * 17);
      const b = Math.floor(43 + t * 26);
      const color = Phaser.Display.Color.GetColor(r, g, b);
      this.bgGraphics.fillStyle(color, 1);
      this.bgGraphics.fillRect(0, y, MAP_WIDTH, 4);
    }
  }

  private createTilemap(): void {
    this.tilemap = this.make.tilemap({
      width: MAP_WIDTH / TILE_SIZE,
      height: MAP_HEIGHT / TILE_SIZE,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });

    this.createTilesetTexture();

    this.tilemap.addTilesetImage('ruins_tiles', 'ruins_tiles', TILE_SIZE, TILE_SIZE, 0, 0);

    this.backgroundLayer = this.tilemap.createBlankLayer('background', 'ruins_tiles');
    this.obstacleLayer = this.tilemap.createBlankLayer('obstacles', 'ruins_tiles');

    this.fillBackgroundLayer();
    this.placeObstacles();

    if (this.obstacleLayer) {
      this.obstacleLayer.setCollisionByExclusion([-1]);
    }
  }

  private createTilesetTexture(): void {
    const graphics = this.add.graphics();
    const w = TILE_SIZE * 5;
    const h = TILE_SIZE;

    graphics.fillStyle(0x1a3a5c, 1);
    graphics.fillRect(0, 0, w, h);

    graphics.fillStyle(0x3d6b8a, 1);
    graphics.fillRect(TILE_SIZE * 0 + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);

    graphics.fillStyle(0x5a7a9a, 1);
    graphics.fillRect(TILE_SIZE * 1 + 4, 4, TILE_SIZE - 8, TILE_SIZE - 8);

    graphics.fillStyle(0x4a6080, 1);
    graphics.fillRect(TILE_SIZE * 2 + 6, 6, TILE_SIZE - 12, TILE_SIZE - 12);

    graphics.fillStyle(0x2d4a6a, 1);
    graphics.fillRect(TILE_SIZE * 3 + 8, 8, TILE_SIZE - 16, TILE_SIZE - 16);

    graphics.fillStyle(0x6b8eae, 1);
    graphics.fillRect(TILE_SIZE * 4 + 10, 10, TILE_SIZE - 20, TILE_SIZE - 20);

    graphics.generateTexture('ruins_tiles', w, h);
    graphics.destroy();
  }

  private fillBackgroundLayer(): void {
    if (!this.backgroundLayer) return;

    for (let y = 0; y < MAP_HEIGHT / TILE_SIZE; y++) {
      for (let x = 0; x < MAP_WIDTH / TILE_SIZE; x++) {
        const tileIndex = Math.floor(Math.random() * 3);
        this.backgroundLayer.putTileAt(tileIndex, x, y);
      }
    }
  }

  private placeObstacles(): void {
    if (!this.obstacleLayer) return;

    const obstaclePositions = [
      { x: 10, y: 8, type: 'pillar' },
      { x: 25, y: 12, type: 'pillar' },
      { x: 40, y: 20, type: 'statue' },
      { x: 55, y: 30, type: 'pillar' },
      { x: 70, y: 40, type: 'arch' },
      { x: 15, y: 35, type: 'statue' },
      { x: 30, y: 45, type: 'pillar' },
      { x: 50, y: 10, type: 'arch' },
      { x: 65, y: 25, type: 'statue' },
      { x: 80, y: 15, type: 'pillar' },
      { x: 20, y: 50, type: 'pillar' },
      { x: 45, y: 35, type: 'arch' },
      { x: 60, y: 50, type: 'pillar' },
      { x: 75, y: 35, type: 'statue' },
      { x: 35, y: 8, type: 'pillar' },
      { x: 12, y: 25, type: 'arch' },
      { x: 58, y: 8, type: 'statue' },
      { x: 82, y: 45, type: 'pillar' },
      { x: 72, y: 10, type: 'pillar' },
      { x: 28, y: 30, type: 'statue' },
      { x: 42, y: 52, type: 'arch' },
      { x: 68, y: 48, type: 'pillar' },
      { x: 18, y: 18, type: 'pillar' },
      { x: 78, y: 28, type: 'statue' },
      { x: 38, y: 28, type: 'arch' }
    ];

    obstaclePositions.forEach(({ x, y, type }) => {
      this.placeObstacle(x, y, type);
    });
  }

  private placeObstacle(gridX: number, gridY: number, type: string): void {
    if (!this.obstacleLayer) return;

    let tileIndices: number[] = [];
    let width = 1;
    let height = 1;

    switch (type) {
      case 'pillar':
        tileIndices = [3, 3, 3];
        width = 2;
        height = 3;
        break;
      case 'statue':
        tileIndices = [4, 4, 4, 4];
        width = 2;
        height = 4;
        break;
      case 'arch':
        tileIndices = [5, 5, 5];
        width = 3;
        height = 3;
        break;
      default:
        tileIndices = [3];
    }

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const x = gridX + dx;
        const y = gridY + dy;
        if (x < MAP_WIDTH / TILE_SIZE && y < MAP_HEIGHT / TILE_SIZE) {
          this.obstacleLayer.putTileAt(tileIndices[dy % tileIndices.length], x, y);
        }
      }
    }
  }

  private createSubmarine(): void {
    this.submarine = new Submarine(this, 200, 200);
    this.submarine.setDepth(10);
  }

  private createArtifacts(): void {
    const types: ArtifactType[] = ['ceramic', 'bronze', 'gold'];
    const positions = this.generateArtifactPositions(15);

    positions.forEach((pos, index) => {
      const type = types[Math.floor(index / 5)];
      const artifact = new Artifact(this, { type, x: pos.x, y: pos.y });
      artifact.setDepth(5);
      this.artifacts.push(artifact);
    });
  }

  private generateArtifactPositions(count: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const minDistance = 150;
    const margin = 100;

    let attempts = 0;
    const maxAttempts = count * 100;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      let valid = true;
      for (const pos of positions) {
        if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < minDistance) {
          valid = false;
          break;
        }
      }

      if (valid && !this.isPositionInObstacle(x, y)) {
        positions.push({ x, y });
      }
    }

    return positions;
  }

  private isPositionInObstacle(x: number, y: number): boolean {
    if (!this.obstacleLayer) return false;

    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    const tile = this.obstacleLayer.getTileAt(tileX, tileY);
    return tile !== null && tile.index !== -1;
  }

  private createOxygenBubbles(): void {
    const positions = this.generateOxygenBubblePositions(5);

    positions.forEach(pos => {
      const bubble = this.createOxygenBubble(pos.x, pos.y);
      this.oxygenBubbles.push({
        sprite: bubble,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,
        collected: false
      });
    });
  }

  private generateOxygenBubblePositions(count: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const margin = 100;

    let attempts = 0;
    const maxAttempts = count * 100;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      if (!this.isPositionInObstacle(x, y)) {
        positions.push({ x, y });
      }
    }

    return positions;
  }

  private createOxygenBubble(x: number, y: number): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x5bbaff, 0.6);
    graphics.beginPath();
    graphics.arc(0, 0, 10, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0xffffff, 0.4);
    graphics.beginPath();
    graphics.arc(-3, -3, 3, 0, Math.PI * 2);
    graphics.fill();

    graphics.setPosition(x, y);
    graphics.setDepth(4);

    return graphics;
  }

  private createEnergyCores(): void {
    const positions = [
      { x: 200, y: 200 },
      { x: MAP_WIDTH - 200, y: 200 },
      { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 200 }
    ];

    positions.forEach((pos) => {
      const core = this.createEnergyCore(pos.x, pos.y);
      this.energyCores.push(core);
    });
  }

  private createEnergyCore(x: number, y: number): EnergyCore {
    const container = this.add.container(x, y);
    container.setDepth(3);

    const baseGraphics = this.add.graphics();
    baseGraphics.fillStyle(0x1a4a7a, 0.5);
    baseGraphics.beginPath();
    baseGraphics.moveTo(-30, 20);
    baseGraphics.lineTo(-25, -10);
    baseGraphics.lineTo(25, -10);
    baseGraphics.lineTo(30, 20);
    baseGraphics.closePath();
    baseGraphics.fill();

    baseGraphics.fillStyle(0x2d6a9a, 0.6);
    baseGraphics.beginPath();
    this.drawEllipse(baseGraphics, 0, -10, 25, 10);
    baseGraphics.fill();

    container.add(baseGraphics);

    const energyBall = this.add.graphics();
    this.drawEnergyBall(energyBall, 0);
    energyBall.y = -25;
    container.add(energyBall);

    const ringGraphics = this.add.graphics();
    ringGraphics.setDepth(2);
    container.add(ringGraphics);

    container.setPosition(x, y);

    return {
      container,
      x,
      y,
      calibrated: false,
      ringGraphics,
      energyBall,
      targetAngle: Math.random() * Math.PI * 2,
      currentRingRadius: 120,
      ringDirection: -1,
      rotation: 0
    };
  }

  private drawEllipse(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number
  ): void {
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = x + Math.cos(angle) * radiusX;
      const py = y + Math.sin(angle) * radiusY;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
  }

  private drawEnergyBall(graphics: Phaser.GameObjects.Graphics, rotation: number): void {
    graphics.clear();

    graphics.save();

    graphics.fillStyle(0x00bfff, 0.8);
    graphics.beginPath();
    graphics.arc(0, 0, 12, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0x87ceeb, 0.6);
    graphics.beginPath();
    graphics.arc(-4, -4, 5, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0x1e90ff, 0.5);
    graphics.beginPath();
    graphics.arc(3, 3, 4, 0, Math.PI * 2);
    graphics.fill();

    graphics.restore();
  }

  private createHUD(): void {
    this.hudContainer = this.add.container();
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.createOxygenBar(20, 20);
    this.createArtifactCounter(screenWidth - 150, 20);
    this.createCollectedThumbnails(screenWidth - 20, 60);

    this.oxygenDepletedWarning = this.add.text(
      screenWidth / 2,
      screenHeight / 2,
      '氧气耗尽！',
      {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#ff3333',
        stroke: '#880000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.oxygenDepletedWarning.setVisible(false);
    this.oxygenDepletedWarning.setScrollFactor(0);
    this.oxygenDepletedWarning.setDepth(101);
  }

  private createOxygenBar(x: number, y: number): void {
    const barWidth = 250;
    const barHeight = 20;

    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x0a1628, 0.8);
    bgGraphics.fillRect(x, y, barWidth, barHeight);
    bgGraphics.lineStyle(2, 0x1a4a7a, 0.6);
    bgGraphics.strokeRect(x, y, barWidth, barHeight);
    this.hudContainer.add(bgGraphics);

    this.oxygenBarFill = this.add.graphics();
    this.hudContainer.add(this.oxygenBarFill);

    const label = this.add.text(x + barWidth / 2, y + barHeight / 2, '氧气', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.hudContainer.add(label);
  }

  private updateOxygenBar(oxygenPercent: number): void {
    const barWidth = 250;
    const barHeight = 20;
    const x = 20;
    const y = 20;

    this.oxygenBarFill.clear();

    const fillWidth = (oxygenPercent / 100) * (barWidth - 4);

    const color = oxygenPercent > 50 ? 0x00ff88 : oxygenPercent > 25 ? 0xffcc00 : 0xff3333;
    this.oxygenBarFill.fillStyle(color, 1);
    this.oxygenBarFill.fillRect(x + 2, y + 2, fillWidth, barHeight - 4);
  }

  private createArtifactCounter(x: number, y: number): void {
    const container = this.add.container(x, y);

    const gearIcon = this.add.graphics();
    this.drawGearIcon(gearIcon, 0xffd700);

    container.add(gearIcon);

    this.artifactCountText = this.add.text(20, -8, '0 / 15', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffd700',
      stroke: '#8b7500',
      strokeThickness: 2
    });
    container.add(this.artifactCountText);

    this.hudContainer.add(container);
  }

  private drawGearIcon(graphics: Phaser.GameObjects.Graphics, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r1 = 8;
      const r2 = 12;
      const a1 = angle - 0.2;
      const a2 = angle + 0.2;

      graphics.beginPath();
      graphics.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      graphics.lineTo(Math.cos(a1) * r2, Math.sin(a1) * r2);
      graphics.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      graphics.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
      graphics.closePath();
      graphics.fill();
    }

    graphics.beginPath();
    graphics.arc(0, 0, 6, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0x8b7500, 1);
    graphics.beginPath();
    graphics.arc(0, 0, 3, 0, Math.PI * 2);
    graphics.fill();
  }

  private createCollectedThumbnails(x: number, y: number): void {
    const types: ArtifactType[] = ['ceramic', 'bronze', 'gold'];
    const labels = ['陶瓷', '青铜', '黄金'];

    types.forEach((type, index) => {
      const container = this.add.container(x, y + index * 35);

      const thumb = this.add.graphics();
      const color = type === 'ceramic' ? 0xb87333 : type === 'bronze' ? 0x4a7c59 : 0xd4af37;

      thumb.fillStyle(color, 1);
      thumb.beginPath();
      thumb.arc(0, 0, 12, 0, Math.PI * 2);
      thumb.fill();

      const countLabel = this.add.text(20, -8, '0', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff'
      });

      const nameLabel = this.add.text(40, -8, labels[index], {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#aaaaaa'
      });

      container.add(thumb);
      container.add(countLabel);
      container.add(nameLabel);

      this.collectedThumbnails.push(container);
      this.hudContainer.add(container);
    });
  }

  private updateCollectedThumbnails(): void {
    const counts = [
      this.collectedArtifacts.ceramic,
      this.collectedArtifacts.bronze,
      this.collectedArtifacts.gold
    ];

    this.collectedThumbnails.forEach((container, index) => {
      const countLabel = container.getAt(1) as Phaser.GameObjects.Text;
      countLabel.setText(counts[index].toString());
    });
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.submarine, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  private setupCollisions(): void {
    if (this.obstacleLayer) {
      this.physics.add.collider(this.submarine, this.obstacleLayer);
    }
  }

  private initSpatialGrid(): void {
    this.spatialGrid = {
      cellSize: 100,
      cells: new Map()
    };

    this.updateSpatialGrid();
  }

  private updateSpatialGrid(): void {
    this.spatialGrid.cells.clear();

    this.oxygenBubbles.forEach(bubble => {
      if (bubble.collected) return;

      const cellX = Math.floor(bubble.x / this.spatialGrid.cellSize);
      const cellY = Math.floor(bubble.y / this.spatialGrid.cellSize);
      const key = `${cellX},${cellY}`;

      if (!this.spatialGrid.cells.has(key)) {
        this.spatialGrid.cells.set(key, []);
      }
      this.spatialGrid.cells.get(key)!.push(bubble);
    });
  }

  private createGameOverScreen(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.gameOverOverlay = this.add.graphics();
    this.gameOverOverlay.fillStyle(0x000000, 0.75);
    this.gameOverOverlay.fillRect(0, 0, screenWidth, screenHeight);
    this.gameOverOverlay.setScrollFactor(0);
    this.gameOverOverlay.setDepth(200);
    this.gameOverOverlay.setVisible(false);

    this.gameOverText = this.add.text(
      screenWidth / 2,
      screenHeight / 2 - 80,
      '深海探索结束',
      {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#e0b0ff',
        stroke: '#663399',
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    this.gameOverText.setScrollFactor(0);
    this.gameOverText.setDepth(201);
    this.gameOverText.setVisible(false);

    this.finalScoreText = this.add.text(
      screenWidth / 2,
      screenHeight / 2,
      '最终得分: 0',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);
    this.finalScoreText.setScrollFactor(0);
    this.finalScoreText.setDepth(201);
    this.finalScoreText.setVisible(false);

    this.createRestartButton(screenWidth / 2, screenHeight / 2 + 80);
  }

  private createRestartButton(x: number, y: number): void {
    this.restartButton = this.add.container(x, y);
    this.restartButton.setScrollFactor(0);
    this.restartButton.setDepth(201);
    this.restartButton.setVisible(false);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x2c5aa0, 1);
    buttonBg.fillRect(-80, -25, 160, 50);
    buttonBg.lineStyle(2, 0x5bbaff, 1);
    buttonBg.strokeRect(-80, -25, 160, 50);

    const buttonText = this.add.text(0, 0, '重新开始', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.restartButton.add(buttonBg);
    this.restartButton.add(buttonText);

    this.restartButton.setSize(160, 50);
    this.restartButton.setInteractive({ useHandCursor: true });

    this.restartButton.on('pointerover', () => {
      this.restartButton.setScale(1.1);
      buttonBg.clear();
      buttonBg.fillStyle(0x3d6ab0, 1);
      buttonBg.fillRect(-80, -25, 160, 50);
      buttonBg.lineStyle(3, 0x7bcaff, 1);
      buttonBg.strokeRect(-80, -25, 160, 50);
    });

    this.restartButton.on('pointerout', () => {
      this.restartButton.setScale(1);
      buttonBg.clear();
      buttonBg.fillStyle(0x2c5aa0, 1);
      buttonBg.fillRect(-80, -25, 160, 50);
      buttonBg.lineStyle(2, 0x5bbaff, 1);
      buttonBg.strokeRect(-80, -25, 160, 50);
    });

    this.restartButton.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private createVictoryScreen(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.victoryOverlay = this.add.graphics();
    this.victoryOverlay.fillStyle(0x000000, 0.5);
    this.victoryOverlay.fillRect(0, 0, screenWidth, screenHeight);
    this.victoryOverlay.setScrollFactor(0);
    this.victoryOverlay.setDepth(150);
    this.victoryOverlay.setVisible(false);

    this.victoryText = this.add.text(
      screenWidth / 2,
      screenHeight / 2 - 50,
      '遗迹已唤醒！',
      {
        fontFamily: 'Arial Black',
        fontSize: '56px',
        color: '#ffd700',
        stroke: '#ff8c00',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.victoryText.setScrollFactor(0);
    this.victoryText.setDepth(151);
    this.victoryText.setVisible(false);
  }

  private restartGame(): void {
    this.scene.restart();
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.gameWon) {
      if (this.gameWon) {
        this.updateBeams(delta);
      }
      return;
    }

    this.submarine.update(time, delta);
    this.updateArtifacts(time, delta);
    this.updateOxygenBubbles(time, delta);
    this.updateEnergyCores(time, delta);
    this.updateOxygen(delta);
    this.checkArtifactCollection();
    this.checkOxygenBubbleCollection();
    this.checkCoreCalibration();
    this.updateHUD();
    this.updateUndercurrentEffects(delta);
    this.checkAllArtifactsCollected();
    this.updateBeams(delta);
  }

  private updateArtifacts(time: number, delta: number): void {
    this.artifacts.forEach(artifact => {
      if (!artifact.isCollected()) {
        artifact.update(time, delta);
        artifact.checkProximity(this.submarine.x, this.submarine.y);
      }
    });
  }

  private updateOxygenBubbles(time: number, delta: number): void {
    const amplitude = 15;
    const period = 1500;

    this.oxygenBubbles.forEach(bubble => {
      if (!bubble.collected) {
        const offset = Math.sin(time / period * Math.PI * 2) * amplitude;
        bubble.y = bubble.baseY + offset;
        bubble.sprite.setPosition(bubble.x, bubble.y);
      }
    });

    this.updateSpatialGrid();
  }

  private updateEnergyCores(time: number, delta: number): void {
    this.energyCores.forEach(core => {
      core.rotation += delta / 1000;
      this.drawEnergyBall(core.energyBall, core.rotation);

      if (this.allArtifactsCollected && !core.calibrated) {
        const minRadius = 40;
        const maxRadius = 120;
        const speed = (maxRadius - minRadius) / 1500;

        core.currentRingRadius += speed * delta * core.ringDirection;

        if (core.currentRingRadius <= minRadius) {
          core.currentRingRadius = minRadius;
          core.ringDirection = 1;
        } else if (core.currentRingRadius >= maxRadius) {
          core.currentRingRadius = maxRadius;
          core.ringDirection = -1;
        }

        this.drawCalibrationRing(core);
      }

      if (this.allArtifactsCollected) {
        this.spawnCoreParticles(core);
      }
    });
  }

  private drawCalibrationRing(core: EnergyCore): void {
    core.ringGraphics.clear();

    const t = (core.currentRingRadius - 40) / 80;
    const alpha = 0.3 + t * 0.5;

    core.ringGraphics.save();
    core.ringGraphics.lineStyle(3, 0x00ff88, alpha);
    core.ringGraphics.beginPath();
    core.ringGraphics.arc(0, -20, core.currentRingRadius, 0, Math.PI * 2);
    core.ringGraphics.stroke();
    core.ringGraphics.restore();
  }

  private spawnCoreParticles(core: EnergyCore): void {
    if (this.currentParticles >= this.maxParticles) return;
    if (Math.random() > 0.1) return;

    const particle = this.add.graphics();
    const size = 4 + Math.random() * 2;

    const startX = core.x + (Math.random() - 0.5) * 200;
    const startY = core.y + (Math.random() - 0.5) * 200;

    const colorT = Math.random();
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(0, 191, 255),
      new Phaser.Display.Color(30, 144, 255),
      1,
      colorT
    );

    particle.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.8);
    particle.beginPath();
    particle.arc(0, 0, size, 0, Math.PI * 2);
    particle.fill();

    particle.setPosition(startX, startY);
    particle.setDepth(2);

    const duration = 1500 + Math.random() * 500;
    const targetX = core.x;
    const targetY = core.y - 25;

    this.currentParticles++;
    this.particleObjects.push(particle);

    this.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Cubic.In',
      onComplete: () => {
        particle.destroy();
        this.currentParticles--;
        const index = this.particleObjects.indexOf(particle);
        if (index > -1) {
          this.particleObjects.splice(index, 1);
        }
      }
    });
  }

  private updateOxygen(delta: number): void {
    const oxygen = this.submarine.getOxygen();

    if (oxygen <= 0) {
      this.oxygenDepletedTime += delta;
      this.warningTimer += delta;

      if (this.warningTimer >= 500) {
        this.warningVisible = !this.warningVisible;
        this.warningTimer = 0;
        this.oxygenDepletedWarning.setVisible(this.warningVisible);
      }

      if (this.oxygenDepletedTime >= 5000) {
        this.triggerGameOver();
      }
    } else {
      this.oxygenDepletedWarning.setVisible(false);
    }
  }

  private checkArtifactCollection(): void {
    this.artifacts.forEach(artifact => {
      if (artifact.isCollected()) return;

      const dist = Phaser.Math.Distance.Between(
        this.submarine.x,
        this.submarine.y,
        artifact.x,
        artifact.y
      );

      if (dist < 30) {
        artifact.collect(() => {
          this.collectedArtifacts[artifact.getType()]++;
          this.score += this.getArtifactScore(artifact.getType());
          this.updateArtifactCount();
          this.updateCollectedThumbnails();
          this.checkCeramicUndercurrent();
        });
      }
    });
  }

  private getArtifactScore(type: ArtifactType): number {
    switch (type) {
      case 'ceramic': return 100;
      case 'bronze': return 200;
      case 'gold': return 500;
      default: return 0;
    }
  }

  private updateArtifactCount(): void {
    const total = this.collectedArtifacts.ceramic +
      this.collectedArtifacts.bronze +
      this.collectedArtifacts.gold;
    this.artifactCountText.setText(`${total} / ${this.totalArtifacts}`);
  }

  private checkCeramicUndercurrent(): void {
    if (this.collectedArtifacts.ceramic >= 5 && !this.ceramicCollectedTriggered) {
      this.ceramicCollectedTriggered = true;
      this.spawnUndercurrentEffect();
    }
  }

  private spawnUndercurrentEffect(): void {
    const x = this.submarine.x + (Math.random() - 0.5) * 400;
    const y = this.submarine.y + (Math.random() - 0.5) * 400;

    const vortex = this.add.graphics();
    vortex.setPosition(x, y);
    vortex.setDepth(6);

    this.undercurrentEffects.push(vortex);
    this.undercurrentRotations.set(vortex, 0);
    this.undercurrentLifetimes.set(vortex, 3000);
  }

  private updateUndercurrentEffects(delta: number): void {
    for (let i = this.undercurrentEffects.length - 1; i >= 0; i--) {
      const vortex = this.undercurrentEffects[i];
      let rotation = this.undercurrentRotations.get(vortex) || 0;
      let lifetime = this.undercurrentLifetimes.get(vortex) || 0;

      lifetime -= delta;
      rotation += 0.05;

      if (lifetime <= 0) {
        vortex.destroy();
        this.undercurrentEffects.splice(i, 1);
        this.undercurrentRotations.delete(vortex);
        this.undercurrentLifetimes.delete(vortex);
        continue;
      }

      this.undercurrentRotations.set(vortex, rotation);
      this.undercurrentLifetimes.set(vortex, lifetime);

      this.drawVortex(vortex, rotation, lifetime / 3000);

      const dist = Phaser.Math.Distance.Between(
        this.submarine.x,
        this.submarine.y,
        vortex.x,
        vortex.y
      );

      if (dist < 100) {
        const angle = Math.atan2(
          this.submarine.y - vortex.y,
          this.submarine.x - vortex.x
        );
        const force = 50 * (delta / 1000);
        this.submarine.applyCurrentForce(new Phaser.Math.Vector2(
          Math.cos(angle) * force,
          Math.sin(angle) * force
        ));
      }
    }
  }

  private drawVortex(vortex: Phaser.GameObjects.Graphics, rotation: number, alpha: number): void {
    vortex.clear();

    for (let i = 0; i < 3; i++) {
      const radius = 30 + i * 20;
      const ringAlpha = (0.3 - i * 0.1) * alpha;

      vortex.save();
      vortex.lineStyle(3, 0x4a9eff, ringAlpha);
      vortex.beginPath();

      const rot = rotation + i * 0.5;
      for (let j = 0; j < 360; j += 10) {
        const angle = (j / 180) * Math.PI;
        const r = radius + Math.sin(angle * 3 + rot) * 10;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        if (j === 0) {
          vortex.moveTo(px, py);
        } else {
          vortex.lineTo(px, py);
        }
      }

      vortex.closePath();
      vortex.stroke();
      vortex.restore();
    }
  }

  private checkOxygenBubbleCollection(): void {
    const subX = Math.floor(this.submarine.x / this.spatialGrid.cellSize);
    const subY = Math.floor(this.submarine.y / this.spatialGrid.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${subX + dx},${subY + dy}`;
        const cell = this.spatialGrid.cells.get(key);

        if (cell) {
          cell.forEach(bubble => {
            if (bubble.collected) return;

            const dist = Phaser.Math.Distance.Between(
              this.submarine.x,
              this.submarine.y,
              bubble.x,
              bubble.y
            );

            if (dist < 25) {
              this.collectOxygenBubble(bubble);
            }
          });
        }
      }
    }
  }

  private collectOxygenBubble(bubble: OxygenBubble): void {
    bubble.collected = true;
    this.submarine.addOxygen(15);

    this.tweens.add({
      targets: bubble.sprite,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        bubble.sprite.setVisible(false);
      }
    });
  }

  private checkCoreCalibration(): void {
    if (!this.allArtifactsCollected) return;

    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (Phaser.Input.Keyboard.JustDown(spaceKey!)) {
      this.energyCores.forEach(core => {
        if (core.calibrated) return;

        const dist = Phaser.Math.Distance.Between(
          this.submarine.x,
          this.submarine.y,
          core.x,
          core.y
        );

        if (dist < 100 && core.currentRingRadius < 50) {
          this.calibrateCore(core);
        }
      });
    }
  }

  private calibrateCore(core: EnergyCore): void {
    core.calibrated = true;
    core.ringGraphics.clear();

    core.ringGraphics.save();
    core.ringGraphics.lineStyle(4, 0x00ff88, 1);
    core.ringGraphics.beginPath();
    core.ringGraphics.arc(0, -20, 40, 0, Math.PI * 2);
    core.ringGraphics.stroke();
    core.ringGraphics.restore();

    this.score += 1000;

    const allCalibrated = this.energyCores.every(c => c.calibrated);
    if (allCalibrated) {
      this.triggerVictory();
    }
  }

  private checkAllArtifactsCollected(): void {
    const total = this.collectedArtifacts.ceramic +
      this.collectedArtifacts.bronze +
      this.collectedArtifacts.gold;

    if (total >= this.totalArtifacts && !this.allArtifactsCollected) {
      this.allArtifactsCollected = true;
    }
  }

  private updateHUD(): void {
    const oxygen = this.submarine.getOxygen();
    this.updateOxygenBar(oxygen);
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.gameOverOverlay.setVisible(true);
    this.gameOverText.setVisible(true);
    this.finalScoreText.setText(`最终得分: ${this.score}`);
    this.finalScoreText.setVisible(true);
    this.restartButton.setVisible(true);
    this.oxygenDepletedWarning.setVisible(false);

    this.tweens.add({
      targets: this.gameOverText,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Cubic.Out'
    });
  }

  private triggerVictory(): void {
    this.gameWon = true;
    this.victoryOverlay.setVisible(true);
    this.victoryText.setVisible(true);

    this.energyCores.forEach((core) => {
      const beam = this.add.graphics();
      beam.setPosition(core.x, core.y - 20);
      beam.setDepth(149);
      this.beamGraphics.push(beam);
    });

    this.score += 5000;

    this.tweens.add({
      targets: this.victoryText,
      alpha: { from: 0, to: 1 },
      duration: 1000,
      ease: 'Cubic.Out'
    });

    setTimeout(() => {
      this.finalScoreText.setText(`最终得分: ${this.score}`);
      this.finalScoreText.setVisible(true);
      this.restartButton.setVisible(true);
    }, 3000);
  }

  private updateBeams(delta: number): void {
    if (!this.gameWon || this.beamGraphics.length === 0) return;

    this.beamTimer += delta;
    if (this.beamTimer >= 1000) {
      this.beamTimer = 0;
      this.beamColorIndex = (this.beamColorIndex + 1) % this.beamColors.length;
    }

    const color = this.beamColors[this.beamColorIndex];
    const beamWidth = 20;

    this.beamGraphics.forEach(beam => {
      beam.clear();

      beam.save();
      beam.fillStyle(color, 0.8);
      beam.beginPath();
      beam.moveTo(-beamWidth / 2, 0);
      beam.lineTo(-beamWidth / 2 - 5, -MAP_HEIGHT);
      beam.lineTo(beamWidth / 2 + 5, -MAP_HEIGHT);
      beam.lineTo(beamWidth / 2, 0);
      beam.closePath();
      beam.fill();
      beam.restore();

      beam.save();
      beam.fillStyle(0xffffff, 0.3);
      beam.beginPath();
      beam.moveTo(-beamWidth / 4, 0);
      beam.lineTo(-beamWidth / 4 - 2, -MAP_HEIGHT);
      beam.lineTo(beamWidth / 4 + 2, -MAP_HEIGHT);
      beam.lineTo(beamWidth / 4, 0);
      beam.closePath();
      beam.fill();
      beam.restore();
    });
  }
}
