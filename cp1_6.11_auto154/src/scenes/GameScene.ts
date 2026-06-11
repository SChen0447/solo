import Phaser from 'phaser';
import { StatsManager } from '../utils/StatsManager';
import { PuzzleGenerator, PuzzleConfig, Direction, StatueType } from '../utils/PuzzleGenerator';
import { Statue } from '../objects/Statue';
import { Scarab } from '../objects/Scarab';
import { StoneDoor } from '../objects/StoneDoor';
import { LaserBeam } from '../objects/LaserBeam';
import { EventBus } from '../main';

export class GameScene extends Phaser.Scene {
  private statsManager!: StatsManager;
  private puzzleConfig!: PuzzleConfig;
  private currentLevel: number = 1;

  private background!: Phaser.GameObjects.Graphics;
  private sunSymbol!: Phaser.GameObjects.Graphics;
  private stoneDoor!: StoneDoor;
  private laserBeam!: LaserBeam;
  private statues: Statue[] = [];
  private scarabs: Scarab[] = [];

  private stepText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private resetButton!: Phaser.GameObjects.Container;
  private hintButton!: Phaser.GameObjects.Container;
  private hintPanel!: Phaser.GameObjects.Container;
  private hintUsed: boolean = false;

  private victoryPanel!: Phaser.GameObjects.Container;
  private gameOver: boolean = false;

  constructor() {
    super('GameScene');
  }

  public init(): void {
    this.currentLevel = 1;
  }

  public create(): void {
    EventBus.emit('stats:get', (stats: { rotations: number; time: number; sequence: string[] }) => {
    });

    this.statsManager = new StatsManager();

    this.createBackground();
    this.loadLevel(this.currentLevel);
    this.createUI();
    this.setupEventListeners();

    this.statsManager.startTimer();
  }

  private createBackground(): void {
    this.background = this.add.graphics();

    const width = this.scale.width;
    const height = this.scale.height;

    this.background.fillGradientStyle(0xd4b68a, 0xd4b68a, 0x8b5a2b, 0x8b5a2b, 1);
    this.background.fillRect(0, 0, width, height);

    this.background.fillStyle(0x8b5a2b, 0.05);
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 8);
      this.background.fillCircle(x, y, size);
    }

    this.createPapyrusTexture();
  }

  private createPapyrusTexture(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.background.lineStyle(1, 0x8b5a2b, 0.03);

    for (let x = 0; x < width; x += 20) {
      this.background.beginPath();
      this.background.moveTo(x, 0);
      this.background.lineTo(x + 10, height);
      this.background.strokePath();
    }

    for (let y = 0; y < height; y += 25) {
      this.background.beginPath();
      this.background.moveTo(0, y);
      this.background.lineTo(width, y + 5);
      this.background.strokePath();
    }
  }

  private loadLevel(level: number): void {
    this.gameOver = false;
    this.hintUsed = false;

    this.clearLevelObjects();

    this.puzzleConfig = PuzzleGenerator.generate(level);

    this.stoneDoor = new StoneDoor(
      this,
      this.puzzleConfig.doorPosition.x,
      this.puzzleConfig.doorPosition.y
    );
    this.stoneDoor.setDepth(10);

    this.createSunSymbol();

    this.statues = [];
    for (const statueConfig of this.puzzleConfig.statues) {
      const statue = new Statue(
        this,
        statueConfig.x,
        statueConfig.y,
        statueConfig.type,
        statueConfig.rotation
      );
      statue.setDepth(20);
      statue.setOnClickCallback(() => this.onStatueClicked(statue));
      this.statues.push(statue);
    }

    this.scarabs = [];
    for (const scarabConfig of this.puzzleConfig.scarabs) {
      const scarab = new Scarab(
        this,
        scarabConfig.x,
        scarabConfig.y,
        scarabConfig.rotation
      );
      scarab.setDepth(20);
      scarab.setOnClickCallback(() => this.onScarabClicked(scarab));
      this.scarabs.push(scarab);
    }

    this.laserBeam = new LaserBeam(this);
    this.laserBeam.setDepth(15);

    this.recalculateLaser();
    this.updateStepDisplay();
    this.updateLevelDisplay();
  }

  private clearLevelObjects(): void {
    if (this.stoneDoor) {
      this.stoneDoor.destroy();
    }

    for (const statue of this.statues) {
      statue.destroy();
    }
    this.statues = [];

    for (const scarab of this.scarabs) {
      scarab.destroy();
    }
    this.scarabs = [];

    if (this.laserBeam) {
      this.laserBeam.destroy();
    }

    if (this.sunSymbol) {
      this.sunSymbol.destroy();
    }
  }

  private createSunSymbol(): void {
    this.sunSymbol = this.add.graphics();
    const x = this.puzzleConfig.sourcePosition.x;
    const y = this.puzzleConfig.sourcePosition.y;

    this.sunSymbol.fillStyle(0xffd700, 1);
    this.sunSymbol.beginPath();
    this.sunSymbol.arc(x, y, 25, 0, Math.PI * 2);
    this.sunSymbol.fillPath();

    this.sunSymbol.fillStyle(0xff8c00, 1);
    this.sunSymbol.beginPath();
    this.sunSymbol.arc(x, y, 18, 0, Math.PI * 2);
    this.sunSymbol.fillPath();

    this.sunSymbol.lineStyle(4, 0xffd700, 1);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerRadius = 28;
      const outerRadius = 38;

      const x1 = x + Math.cos(angle) * innerRadius;
      const y1 = y + Math.sin(angle) * innerRadius;
      const x2 = x + Math.cos(angle) * outerRadius;
      const y2 = y + Math.sin(angle) * outerRadius;

      this.sunSymbol.beginPath();
      this.sunSymbol.moveTo(x1, y1);
      this.sunSymbol.lineTo(x2, y2);
      this.sunSymbol.strokePath();
    }

    this.sunSymbol.lineStyle(2, 0x8b5a2b, 0.8);
    this.sunSymbol.beginPath();
    this.sunSymbol.arc(x, y, 12, 0, Math.PI * 2);
    this.sunSymbol.strokePath();

    this.tweens.add({
      targets: { scale: 1 },
      scale: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const scale = tween.getValue() as number;
        this.sunSymbol.setScale(scale);
      }
    });
  }

  private createUI(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.stepText = this.add.text(30, 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    this.stepText.setDepth(100);

    this.levelText = this.add.text(width / 2, 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    this.levelText.setOrigin(0.5, 0);
    this.levelText.setDepth(100);

    this.createResetButton();
    this.createHintButton();
    this.createHintPanel();
    this.createVictoryPanel();
  }

  private createResetButton(): void {
    const width = this.scale.width;

    this.resetButton = this.add.container(width - 120, 45);
    this.resetButton.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0xe8d5a3, 0.8);
    bg.fillRoundedRect(-40, -15, 80, 30, 5);

    bg.lineStyle(2, 0x2d1810, 0.6);
    bg.strokeRoundedRect(-40, -15, 80, 30, 5);

    const text = this.add.text(0, 0, '重置', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);

    this.resetButton.add([bg, text]);
    this.resetButton.setSize(80, 30);
    this.resetButton.setInteractive();

    this.resetButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xd4b68a, 0.9);
      bg.fillRoundedRect(-40, -15, 80, 30, 5);
      bg.lineStyle(2, 0x2d1810, 0.6);
      bg.strokeRoundedRect(-40, -15, 80, 30, 5);

      this.resetButton.setScale(1.05);
    });

    this.resetButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xe8d5a3, 0.8);
      bg.fillRoundedRect(-40, -15, 80, 30, 5);
      bg.lineStyle(2, 0x2d1810, 0.6);
      bg.strokeRoundedRect(-40, -15, 80, 30, 5);

      this.resetButton.setScale(1);
    });

    this.resetButton.on('pointerdown', () => {
      this.resetPuzzle();
    });
  }

  private createHintButton(): void {
    const width = this.scale.width;

    this.hintButton = this.add.container(width - 120, 85);
    this.hintButton.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0xe8d5a3, 0.8);
    bg.fillRoundedRect(-40, -15, 80, 30, 5);

    bg.lineStyle(2, 0x2d1810, 0.6);
    bg.strokeRoundedRect(-40, -15, 80, 30, 5);

    const text = this.add.text(0, 0, '提示', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);

    this.hintButton.add([bg, text]);
    this.hintButton.setSize(80, 30);
    this.hintButton.setInteractive();

    this.hintButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xd4b68a, 0.9);
      bg.fillRoundedRect(-40, -15, 80, 30, 5);
      bg.lineStyle(2, 0x2d1810, 0.6);
      bg.strokeRoundedRect(-40, -15, 80, 30, 5);

      this.hintButton.setScale(1.05);
    });

    this.hintButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xe8d5a3, 0.8);
      bg.fillRoundedRect(-40, -15, 80, 30, 5);
      bg.lineStyle(2, 0x2d1810, 0.6);
      bg.strokeRoundedRect(-40, -15, 80, 30, 5);

      this.hintButton.setScale(1);
    });

    this.hintButton.on('pointerdown', () => {
      this.showHint();
    });
  }

  private createHintPanel(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.hintPanel = this.add.container(width / 2, height / 2);
    this.hintPanel.setDepth(200);
    this.hintPanel.setVisible(false);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0xf4e4bc, 0.95);
    panelBg.fillRoundedRect(-180, -120, 360, 240, 15);

    panelBg.lineStyle(3, 0x8b5a2b, 0.8);
    panelBg.strokeRoundedRect(-180, -120, 360, 240, 15);

    const titleText = this.add.text(0, -80, '📜 古老卷轴', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#5c3d1e',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);

    const hintText = this.add.text(0, -20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#2d1810',
      wordWrap: { width: 300 },
      align: 'center'
    });
    hintText.setOrigin(0.5);
    hintText.setName('hintText');

    const costText = this.add.text(0, 40, '（使用提示将额外扣除1步）', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#8b5a2b'
    });
    costText.setOrigin(0.5);

    const closeBtn = this.add.text(0, 80, '关闭', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b5a2b',
      fontStyle: 'bold'
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive();
    closeBtn.on('pointerdown', () => {
      this.hintPanel.setVisible(false);
    });

    this.hintPanel.add([panelBg, titleText, hintText, costText, closeBtn]);
  }

  private createVictoryPanel(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.victoryPanel = this.add.container(width / 2, height / 2);
    this.victoryPanel.setDepth(300);
    this.victoryPanel.setVisible(false);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0xf4e4bc, 0.95);
    panelBg.fillRoundedRect(-200, -160, 400, 320, 20);

    panelBg.lineStyle(4, 0xffd700, 0.9);
    panelBg.strokeRoundedRect(-200, -160, 400, 320, 20);

    const victoryText = this.add.text(0, -110, '𓂀 胜 利 𓂀', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#b8860b',
      fontStyle: 'bold'
    });
    victoryText.setOrigin(0.5);
    victoryText.setName('victoryText');

    const subtitleText = this.add.text(0, -60, '石门已开启！', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#5c3d1e'
    });
    subtitleText.setOrigin(0.5);

    const stepsLabel = this.add.text(0, 0, '步数', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b5a2b'
    });
    stepsLabel.setOrigin(0.5);

    const stepsValue = this.add.text(0, 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    stepsValue.setOrigin(0.5);
    stepsValue.setName('stepsValue');

    const timeLabel = this.add.text(0, 70, '用时', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#8b5a2b'
    });
    timeLabel.setOrigin(0.5);

    const timeValue = this.add.text(0, 100, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#2d1810',
      fontStyle: 'bold'
    });
    timeValue.setOrigin(0.5);
    timeValue.setName('timeValue');

    const nextBtn = this.add.text(0, 145, '下一关 ▶', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#006400',
      fontStyle: 'bold'
    });
    nextBtn.setOrigin(0.5);
    nextBtn.setInteractive();
    nextBtn.setName('nextBtn');
    nextBtn.on('pointerover', () => {
      nextBtn.setScale(1.1);
    });
    nextBtn.on('pointerout', () => {
      nextBtn.setScale(1);
    });
    nextBtn.on('pointerdown', () => {
      this.nextLevel();
    });

    this.victoryPanel.add([
      panelBg, victoryText, subtitleText,
      stepsLabel, stepsValue,
      timeLabel, timeValue,
      nextBtn
    ]);
  }

  private setupEventListeners(): void {
    this.scale.on('resize', this.onResize, this);
  }

  private onResize(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.createBackground();

    if (this.stepText) {
      this.stepText.setPosition(30, 30);
    }

    if (this.levelText) {
      this.levelText.setPosition(width / 2, 30);
    }

    if (this.resetButton) {
      this.resetButton.setPosition(width - 120, 45);
    }

    if (this.hintButton) {
      this.hintButton.setPosition(width - 120, 85);
    }

    if (this.hintPanel) {
      this.hintPanel.setPosition(width / 2, height / 2);
    }

    if (this.victoryPanel) {
      this.victoryPanel.setPosition(width / 2, height / 2);
    }
  }

  private onStatueClicked(statue: Statue): void {
    if (this.gameOver) return;

    const rotations = this.statsManager.getRotations();
    if (rotations >= this.puzzleConfig.maxSteps) {
      this.showFailure();
      return;
    }

    this.statsManager.incrementRotations();
    EventBus.emit('stats:rotate');

    this.recalculateLaser();
    this.updateStepDisplay();
    this.checkWinCondition();
  }

  private onScarabClicked(scarab: Scarab): void {
    if (this.gameOver) return;

    const rotations = this.statsManager.getRotations();
    if (rotations >= this.puzzleConfig.maxSteps) {
      this.showFailure();
      return;
    }

    this.statsManager.incrementRotations();
    EventBus.emit('stats:rotate');

    this.recalculateLaser();
    this.updateStepDisplay();
    this.checkWinCondition();
  }

  private recalculateLaser(): void {
    const reflectors: { id: string; x: number; y: number; width: number; height: number; rotation: number; type: 'statue' | 'scarab' }[] = [];

    for (const statue of this.statues) {
      reflectors.push({
        id: statue.getType(),
        x: statue.x,
        y: statue.y,
        width: statue.getSize(),
        height: statue.getSize(),
        rotation: statue.getRotation(),
        type: 'statue'
      });
    }

    for (const scarab of this.scarabs) {
      reflectors.push({
        id: 'scarab',
        x: scarab.x,
        y: scarab.y,
        width: scarab.getSize(),
        height: scarab.getSize(),
        rotation: scarab.getRotation(),
        type: 'scarab'
      });
    }

    const doorBounds = this.stoneDoor.getDoorBounds();
    const gemPos = this.stoneDoor.getGemPosition();
    const gemRadius = this.stoneDoor.getGemRadius();

    this.laserBeam.calculatePath(
      this.puzzleConfig.sourcePosition.x,
      this.puzzleConfig.sourcePosition.y,
      this.puzzleConfig.sourceDirection,
      reflectors,
      gemPos.x,
      gemPos.y,
      gemRadius,
      { x: doorBounds.x, y: doorBounds.y, width: doorBounds.width, height: doorBounds.height },
      { width: this.scale.width, height: this.scale.height }
    );

    this.laserBeam.animateDraw(400);
  }

  private checkWinCondition(): void {
    if (this.laserBeam.getSuccess()) {
      this.onVictory();
    } else if (this.statsManager.getRotations() >= this.puzzleConfig.maxSteps) {
      this.showFailure();
    }
  }

  private onVictory(): void {
    if (this.gameOver) return;

    this.gameOver = true;
    this.statsManager.stopTimer();
    EventBus.emit('stats:stop');

    this.stoneDoor.activateGem();

    this.time.delayedCall(500, () => {
      this.stoneDoor.open(2000);
    });

    this.time.delayedCall(1500, () => {
      this.showVictoryPanel();
    });
  }

  private showVictoryPanel(): void {
    const stats = this.statsManager.getStats();

    const stepsValue = this.victoryPanel.getByName('stepsValue') as Phaser.GameObjects.Text;
    const timeValue = this.victoryPanel.getByName('timeValue') as Phaser.GameObjects.Text;
    const nextBtn = this.victoryPanel.getByName('nextBtn') as Phaser.GameObjects.Text;

    if (stepsValue) {
      stepsValue.setText(`${stats.rotations} / ${this.puzzleConfig.maxSteps}`);
    }

    if (timeValue) {
      timeValue.setText(`${stats.formattedTime} 秒`);
    }

    if (nextBtn) {
      if (this.currentLevel >= 3) {
        nextBtn.setText('🎉 全部通关！');
      } else {
        nextBtn.setText('下一关 ▶');
      }
    }

    this.victoryPanel.setVisible(true);
    this.victoryPanel.setScale(0.5);
    this.victoryPanel.setAlpha(0);

    this.tweens.add({
      targets: this.victoryPanel,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: Phaser.Math.Easing.Back.Out
    });
  }

  private showFailure(): void {
    if (this.gameOver) return;

    this.gameOver = true;
    this.laserBeam.showFailureFlash();

    this.cameras.main.shake(500, 0.005);

    const width = this.scale.width;
    const height = this.scale.height;

    const failText = this.add.text(width / 2, height / 2, '步数已用尽！\n点击重置再试一次', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#ff4444',
      fontStyle: 'bold',
      align: 'center'
    });
    failText.setOrigin(0.5);
    failText.setDepth(250);

    this.tweens.add({
      targets: failText,
      alpha: 0,
      duration: 2000,
      delay: 1500,
      onComplete: () => {
        failText.destroy();
        this.gameOver = false;
      }
    });
  }

  private resetPuzzle(): void {
    this.statsManager.reset();
    EventBus.emit('stats:reset');
    this.statsManager.startTimer();

    this.gameOver = false;
    this.hintUsed = false;

    this.victoryPanel.setVisible(false);

    this.loadLevel(this.currentLevel);
  }

  private showHint(): void {
    if (this.hintUsed) {
      const hintText = this.hintPanel.getByName('hintText') as Phaser.GameObjects.Text;
      if (hintText) {
        hintText.setText('你已经使用过提示了。\n相信你自己，一定能解开！');
      }
      this.hintPanel.setVisible(true);
      return;
    }

    this.hintUsed = true;
    this.statsManager.useHint();
    EventBus.emit('stats:trigger', 'hint-used');

    const hint = this.puzzleConfig.solutionHint;
    const statueName = this.getStatueNameById(hint.statueId);

    const hintText = this.hintPanel.getByName('hintText') as Phaser.GameObjects.Text;
    if (hintText) {
      const directionName = this.getDirectionName(hint.correctRotation);
      hintText.setText(`${statueName}应该朝向\n${directionName}方向\n\n已额外扣除1步`);
    }

    this.hintPanel.setVisible(true);
    this.updateStepDisplay();

    this.highlightStatue(hint.statueId);
  }

  private getStatueNameById(id: string): string {
    const statue = this.statues.find(s => {
      const config = this.puzzleConfig.statues.find(c => c.id === id);
      return config && s.getType() === config.type;
    });

    if (!statue) return '神秘雕像';

    switch (statue.getType()) {
      case StatueType.HORUS: return '荷鲁斯雕像';
      case StatueType.ANUBIS: return '阿努比斯雕像';
      case StatueType.SET: return '赛特雕像';
      default: return '神秘雕像';
    }
  }

  private getDirectionName(rotation: number): string {
    const dirs = ['左上→右下 ( / )', '右上→左下 ( \\ )', '左上→右下 ( / )', '右上→左下 ( \\ )'];
    return dirs[rotation % 4];
  }

  private highlightStatue(statueId: string): void {
    const config = this.puzzleConfig.statues.find(s => s.id === statueId);
    if (!config) return;

    const statue = this.statues.find(s => s.x === config.x && s.y === config.y);
    if (!statue) return;

    const highlight = this.add.graphics();
    highlight.lineStyle(4, 0x00ff00, 0.8);
    const size = statue.getSize() + 15;
    const half = size / 2;
    highlight.strokeRoundedRect(statue.x - half, statue.y - half, size, size, 12);
    highlight.setDepth(50);

    this.tweens.add({
      targets: highlight,
      alpha: 0,
      duration: 3000,
      onComplete: () => {
        highlight.destroy();
      }
    });
  }

  private updateStepDisplay(): void {
    const rotations = this.statsManager.getRotations();
    this.stepText.setText(`步数: ${rotations} / ${this.puzzleConfig.maxSteps}`);
  }

  private updateLevelDisplay(): void {
    this.levelText.setText(`第 ${this.currentLevel} 关`);
  }

  private nextLevel(): void {
    if (this.currentLevel >= 3) {
      this.showAllCleared();
      return;
    }

    this.currentLevel++;
    this.statsManager.reset();
    EventBus.emit('stats:reset');
    this.statsManager.startTimer();

    this.gameOver = false;
    this.hintUsed = false;
    this.victoryPanel.setVisible(false);

    this.loadLevel(this.currentLevel);
  }

  private showAllCleared(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.victoryPanel.setVisible(false);

    const finalPanel = this.add.container(width / 2, height / 2);
    finalPanel.setDepth(400);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a2e, 0.9);
    bg.fillRoundedRect(-250, -180, 500, 360, 25);

    bg.lineStyle(4, 0xffd700, 1);
    bg.strokeRoundedRect(-250, -180, 500, 360, 25);

    const title = this.add.text(0, -120, '🏆 全部通关！🏆', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(0, -60, '你已成为神殿守护者', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#f4e4bc'
    });
    subtitle.setOrigin(0.5);

    const stats = this.statsManager.getStats();
    const totalText = this.add.text(0, 10, '恭喜你解开了所有谜题！', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d4b68a',
      align: 'center',
      wordWrap: { width: 400 }
    });
    totalText.setOrigin(0.5);

    const restartBtn = this.add.text(0, 80, '重新开始游戏', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive();
    restartBtn.on('pointerover', () => restartBtn.setScale(1.1));
    restartBtn.on('pointerout', () => restartBtn.setScale(1));
    restartBtn.on('pointerdown', () => {
      finalPanel.destroy();
      this.currentLevel = 1;
      this.statsManager.reset();
      this.statsManager.startTimer();
      this.gameOver = false;
      this.loadLevel(1);
    });

    finalPanel.add([bg, title, subtitle, totalText, restartBtn]);

    finalPanel.setScale(0.5);
    finalPanel.setAlpha(0);

    this.tweens.add({
      targets: finalPanel,
      scale: 1,
      alpha: 1,
      duration: 600,
      ease: Phaser.Math.Easing.Back.Out
    });
  }

  public update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
