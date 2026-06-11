import Phaser from 'phaser';
import { CaveWorld, TILE_SIZE, TileType } from './CaveWorld';
import { Player } from './Player';
import { MonsterManager } from './MonsterManager';
import { LadderSystem } from './LadderSystem';

class GameScene extends Phaser.Scene {
  private caveWorld!: CaveWorld;
  private player!: Player;
  private monsterManager!: MonsterManager;
  private ladderSystem!: LadderSystem;

  private darknessGraphics!: Phaser.GameObjects.Graphics;
  private lightMaskGraphics!: Phaser.GameObjects.Graphics;
  private uiLayer!: Phaser.GameObjects.Container;

  private heartGraphics!: Phaser.GameObjects.Graphics;
  private goldText!: Phaser.GameObjects.Text;
  private ironText!: Phaser.GameObjects.Text;
  private coalText!: Phaser.GameObjects.Text;
  private ladderText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private victoryPanel!: Phaser.GameObjects.Container;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private depthPanel!: Phaser.GameObjects.Graphics;

  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private currentDepth: number = 1;

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.caveWorld = new CaveWorld(this);

    const spawnPoint = this.caveWorld.findSpawnPoint();
    this.player = new Player(this, this.caveWorld, spawnPoint.x, spawnPoint.y);

    this.monsterManager = new MonsterManager(this, this.caveWorld, this.player);

    this.ladderSystem = new LadderSystem(this);

    this.setupCamera();
    this.createUI();
    this.setupCallbacks();
    this.createDarkness();

    this.cameras.main.startFollow(this.player.getSprite(), true);
    this.cameras.main.setZoom(1);

    this.isGameOver = false;
    this.isVictory = false;
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(
      0,
      0,
      80 * TILE_SIZE,
      80 * TILE_SIZE
    );
  }

  private createDarkness(): void {
    this.darknessGraphics = this.add.graphics();
    this.darknessGraphics.setDepth(20);
    this.darknessGraphics.setScrollFactor(0);

    this.lightMaskGraphics = this.add.graphics();
    this.lightMaskGraphics.setDepth(5);
    this.lightMaskGraphics.setScrollFactor(0);
  }

  private createUI(): void {
    this.uiLayer = this.add.container(0, 0);
    this.uiLayer.setDepth(50);
    this.uiLayer.setScrollFactor(0);

    this.createHealthUI();
    this.createOreUI();
    this.createLadderUI();
    this.createDepthUI();
  }

  private createHealthUI(): void {
    this.heartGraphics = this.add.graphics();
    this.heartGraphics.x = 20;
    this.heartGraphics.y = 20;
    this.uiLayer.add(this.heartGraphics);

    this.updateHealthUI();
  }

  private createOreUI(): void {
    const startY = 60;

    const goldIcon = this.add.graphics();
    goldIcon.fillStyle(0xffd700, 1);
    goldIcon.fillRoundedRect(20, startY, 16, 16, 2);
    goldIcon.lineStyle(1, 0xb8860b, 1);
    goldIcon.strokeRoundedRect(20, startY, 16, 16, 2);
    this.uiLayer.add(goldIcon);

    this.goldText = this.add.text(44, startY + 2, '0', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '12px',
      color: '#ffd700',
    });
    this.goldText.setScrollFactor(0);
    this.uiLayer.add(this.goldText);

    const ironIcon = this.add.graphics();
    ironIcon.fillStyle(0xa0522d, 1);
    ironIcon.fillRoundedRect(20, startY + 24, 16, 16, 2);
    ironIcon.lineStyle(1, 0x6b3a17, 1);
    ironIcon.strokeRoundedRect(20, startY + 24, 16, 16, 2);
    this.uiLayer.add(ironIcon);

    this.ironText = this.add.text(44, startY + 26, '0', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '12px',
      color: '#cd853f',
    });
    this.ironText.setScrollFactor(0);
    this.uiLayer.add(this.ironText);

    const coalIcon = this.add.graphics();
    coalIcon.fillStyle(0x333333, 1);
    coalIcon.fillRoundedRect(20, startY + 48, 16, 16, 2);
    coalIcon.lineStyle(1, 0x555555, 1);
    coalIcon.strokeRoundedRect(20, startY + 48, 16, 16, 2);
    this.uiLayer.add(coalIcon);

    this.coalText = this.add.text(44, startY + 50, '0', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '12px',
      color: '#888888',
    });
    this.coalText.setScrollFactor(0);
    this.uiLayer.add(this.coalText);
  }

  private createLadderUI(): void {
    const { width } = this.scale;

    const ladderIcon = this.add.graphics();
    ladderIcon.x = width - 80;
    ladderIcon.y = 20;
    ladderIcon.fillStyle(0x8b4513, 1);
    ladderIcon.fillRect(-8, 0, 3, 28);
    ladderIcon.fillRect(8, 0, 3, 28);
    ladderIcon.fillRect(-6, 6, 16, 2);
    ladderIcon.fillRect(-6, 14, 16, 2);
    ladderIcon.fillRect(-6, 22, 16, 2);
    ladderIcon.setScrollFactor(0);
    this.uiLayer.add(ladderIcon);

    this.ladderText = this.add.text(width - 50, 24, '0', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#daa520',
    });
    this.ladderText.setScrollFactor(0);
    this.uiLayer.add(this.ladderText);
  }

  private createDepthUI(): void {
    const { width, height } = this.scale;

    this.depthPanel = this.add.graphics();
    this.depthPanel.fillStyle(0x000000, 0.6);
    this.depthPanel.fillRoundedRect(width / 2 - 60, height - 40, 120, 30, 5);
    this.depthPanel.setScrollFactor(0);
    this.uiLayer.add(this.depthPanel);

    this.depthText = this.add.text(width / 2, height - 32, `#${this.currentDepth}F`, {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#b8860b',
      align: 'center',
    });
    this.depthText.setOrigin(0.5, 0);
    this.depthText.setScrollFactor(0);
    this.uiLayer.add(this.depthText);
  }

  private setupCallbacks(): void {
    this.player.setOnDigCallback((value, type) => {
      this.player.addOre(value, type);
      this.ladderSystem.addOres(value);
      this.updateOreUI();
      this.bounceOreText(type);
    });

    this.player.setOnDamageCallback(() => {
      this.updateHealthUI();
      this.cameras.main.shake(100, 0.01);
      if (this.player.getHealth() <= 0) {
        this.gameOver();
      }
    });

    this.monsterManager.setOnPlayerDamageCallback((damage, knockbackDir) => {
      this.player.takeDamage(damage);
      if (knockbackDir) {
        this.player.knockback(knockbackDir, 2);
      }
    });

    this.monsterManager.setOnPlayerSlowCallback((duration) => {
      this.player.applySlow(duration);
    });

    this.ladderSystem.setOnVictoryCallback(() => {
      this.victory();
    });

    this.ladderSystem.setOnLadderCountChangeCallback(() => {
      this.updateLadderUI();
      this.checkVictoryFlash();
    });
  }

  private updateHealthUI(): void {
    const health = this.player.getHealth();
    const maxHealth = this.player.getMaxHealth();

    this.heartGraphics.clear();

    for (let i = 0; i < maxHealth; i++) {
      const x = i * 28;
      const y = 0;

      if (i < health) {
        this.heartGraphics.fillStyle(0xff0000, 1);
      } else {
        this.heartGraphics.fillStyle(0x444444, 1);
      }

      this.heartGraphics.fillCircle(x + 6, y + 6, 5);
      this.heartGraphics.fillCircle(x + 14, y + 6, 5);
      this.heartGraphics.fillTriangle(x + 3, y + 8, x + 17, y + 8, x + 10, y + 20);
    }
  }

  private updateOreUI(): void {
    this.goldText.setText(`${this.player.getGold()}`);
    this.ironText.setText(`${this.player.getIron()}`);
    this.coalText.setText(`${this.player.getCoal()}`);
  }

  private updateLadderUI(): void {
    const count = this.ladderSystem.getAvailableLadders();
    this.ladderText.setText(`${count}`);
  }

  private bounceOreText(type: TileType): void {
    let text: Phaser.GameObjects.Text | null = null;
    switch (type) {
      case TileType.GOLD_ORE:
        text = this.goldText;
        break;
      case TileType.IRON_ORE:
        text = this.ironText;
        break;
      case TileType.COAL_ORE:
        text = this.coalText;
        break;
    }

    if (text) {
      this.tweens.add({
        targets: text,
        scale: { from: 1.2, to: 1 },
        duration: 200,
        ease: 'Bounce.Out',
      });
    }
  }

  private checkVictoryFlash(): void {
    if (this.ladderSystem.isVictoryAvailable()) {
      this.tweens.add({
        targets: this.depthPanel,
        alpha: { from: 1, to: 0.3 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      this.depthText.setColor('#ffd700');
      this.depthText.setText('逃生梯可用！');
    }
  }

  update(time: number, delta: number): void {
    if (this.isGameOver || this.isVictory) return;

    this.caveWorld.update(time, delta);
    this.player.update(time, delta);
    this.monsterManager.update(time, delta);
    this.ladderSystem.update(time, delta);

    this.handleLadderPlacement();
    this.handleVictoryActivation();

    this.updateDarkness();
  }

  private handleLadderPlacement(): void {
    if (this.player.isEKeyJustPressed()) {
      const pos = this.player.getGridPosition();
      if (this.caveWorld.isWalkable(pos.x, pos.y)) {
        this.ladderSystem.placeLadder(pos.x, pos.y);
      }
    }
  }

  private handleVictoryActivation(): void {
    if (this.player.isSpaceKeyJustPressed()) {
      const pos = this.player.getGridPosition();
      this.ladderSystem.tryActivateVictory(pos.x, pos.y);
    }
  }

  private updateDarkness(): void {
    const { width, height } = this.scale;
    const camera = this.cameras.main;

    const lightCenter = this.player.getLightCenter();
    const lightRadius = this.player.getLightRadius();
    const lightAngle = this.player.getLightAngle();
    const lightDir = this.player.getLightDirection();

    const screenX = lightCenter.x - camera.scrollX;
    const screenY = lightCenter.y - camera.scrollY;

    this.darknessGraphics.clear();
    this.darknessGraphics.fillStyle(0x000000, 1);
    this.darknessGraphics.fillRect(0, 0, width, height);

    const startAngle = lightDir - lightAngle / 2;
    const endAngle = lightDir + lightAngle / 2;

    const steps = 60;
    const points: { x: number; y: number }[] = [];
    points.push({ x: screenX, y: screenY });

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const x = screenX + Math.cos(angle) * lightRadius;
      const y = screenY + Math.sin(angle) * lightRadius;
      points.push({ x, y });
    }

    this.darknessGraphics.setBlendMode(Phaser.BlendModes.ERASE);

    const gradientSteps = 12;
    for (let i = gradientSteps; i >= 0; i--) {
      const t = i / gradientSteps;
      const radius = lightRadius * t;
      const alpha = 0.6 * (1 - t);

      const gradPoints: { x: number; y: number }[] = [];
      gradPoints.push({ x: screenX, y: screenY });

      for (let j = 0; j <= steps; j++) {
        const angle = startAngle + (endAngle - startAngle) * (j / steps);
        const x = screenX + Math.cos(angle) * radius;
        const y = screenY + Math.sin(angle) * radius;
        gradPoints.push({ x, y });
      }

      this.darknessGraphics.fillStyle(0xffffff, alpha);
      this.darknessGraphics.beginPath();
      this.darknessGraphics.moveTo(gradPoints[0].x, gradPoints[0].y);
      for (let j = 1; j < gradPoints.length; j++) {
        this.darknessGraphics.lineTo(gradPoints[j].x, gradPoints[j].y);
      }
      this.darknessGraphics.closePath();
      this.darknessGraphics.fillPath();
    }

    this.darknessGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private victory(): void {
    this.isVictory = true;
    this.createVictoryPanel();
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.createGameOverPanel();
  }

  private createVictoryPanel(): void {
    const { width, height } = this.scale;

    this.victoryPanel = this.add.container(width / 2, height / 2);
    this.victoryPanel.setDepth(100);
    this.victoryPanel.setScrollFactor(0);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.85);
    panelBg.fillRoundedRect(-180, -120, 360, 240, 10);
    panelBg.lineStyle(3, 0xffd700, 1);
    panelBg.strokeRoundedRect(-180, -120, 360, 240, 10);
    this.victoryPanel.add(panelBg);

    const title = this.add.text(0, -70, '胜 利 ！', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '28px',
      color: '#ffd700',
      align: 'center',
    });
    title.setOrigin(0.5);
    this.victoryPanel.add(title);

    const subtitle = this.add.text(0, -20, '你成功逃出了洞穴！', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '12px',
      color: '#b8860b',
      align: 'center',
    });
    subtitle.setOrigin(0.5);
    this.victoryPanel.add(subtitle);

    const stats = this.add.text(
      0,
      30,
      `金矿: ${this.player.getGold()}\n铁矿: ${this.player.getIron()}\n煤矿: ${this.player.getCoal()}`,
      {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '10px',
        color: '#aaaaaa',
        align: 'center',
        lineSpacing: 8,
      }
    );
    stats.setOrigin(0.5);
    this.victoryPanel.add(stats);

    const restartBtn = this.add.text(0, 80, '重新开始', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#ffd700',
      align: 'center',
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      this.restartGame();
    });
    restartBtn.on('pointerover', () => {
      restartBtn.setColor('#ffff00');
    });
    restartBtn.on('pointerout', () => {
      restartBtn.setColor('#ffd700');
    });
    this.victoryPanel.add(restartBtn);

    this.tweens.add({
      targets: this.victoryPanel,
      scale: { from: 0.5, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out',
    });
  }

  private createGameOverPanel(): void {
    const { width, height } = this.scale;

    this.gameOverPanel = this.add.container(width / 2, height / 2);
    this.gameOverPanel.setDepth(100);
    this.gameOverPanel.setScrollFactor(0);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.85);
    panelBg.fillRoundedRect(-180, -120, 360, 240, 10);
    panelBg.lineStyle(3, 0xff0000, 1);
    panelBg.strokeRoundedRect(-180, -120, 360, 240, 10);
    this.gameOverPanel.add(panelBg);

    const title = this.add.text(0, -70, '游戏结束', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '24px',
      color: '#ff0000',
      align: 'center',
    });
    title.setOrigin(0.5);
    this.gameOverPanel.add(title);

    const subtitle = this.add.text(0, -20, '你被洞穴怪物击败了...', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '10px',
      color: '#888888',
      align: 'center',
    });
    subtitle.setOrigin(0.5);
    this.gameOverPanel.add(subtitle);

    const stats = this.add.text(
      0,
      30,
      `金矿: ${this.player.getGold()}\n铁矿: ${this.player.getIron()}\n煤矿: ${this.player.getCoal()}`,
      {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '10px',
        color: '#666666',
        align: 'center',
        lineSpacing: 8,
      }
    );
    stats.setOrigin(0.5);
    this.gameOverPanel.add(stats);

    const restartBtn = this.add.text(0, 80, '重新开始', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: '14px',
      color: '#ff4444',
      align: 'center',
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      this.restartGame();
    });
    restartBtn.on('pointerover', () => {
      restartBtn.setColor('#ff6666');
    });
    restartBtn.on('pointerout', () => {
      restartBtn.setColor('#ff4444');
    });
    this.gameOverPanel.add(restartBtn);

    this.tweens.add({
      targets: this.gameOverPanel,
      scale: { from: 0.5, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out',
    });
  }

  private restartGame(): void {
    this.scene.restart();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  pixelArt: true,
  roundPixels: false,
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  if (game.scale) {
    game.scale.refresh();
  }
});
