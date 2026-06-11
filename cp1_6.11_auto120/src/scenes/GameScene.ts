import Phaser from 'phaser';
import { BattleManager } from '../utils/BattleManager';
import {
  getConstellationById,
  checkCombo,
  getElementColor
} from '../utils/ConstellationData';
import type { IStarlight, IHandCard, IComboGroup } from '../types/game';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const STAR_DISK_RADIUS = 250;
const CARD_WIDTH = 75;
const CARD_HEIGHT = 105;
const STARLIGHT_RADIUS = 25;
const NEBULA_ROTATION_SPEED = 0.3;

interface Star {
  graphic: Phaser.GameObjects.Arc;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface CardSprite {
  container: Phaser.GameObjects.Container;
  cardData: IHandCard;
  isDragging: boolean;
  originalX: number;
  originalY: number;
}

interface StarlightSprite {
  container: Phaser.GameObjects.Container;
  starlightData: IStarlight;
  glowRing: Phaser.GameObjects.Arc;
  energyBar: Phaser.GameObjects.Graphics;
}

interface ConstellationLine {
  line: Phaser.GameObjects.Graphics;
  glowDot: Phaser.GameObjects.Arc;
  dotProgress: number;
  points: { x: number; y: number }[];
}

export class GameScene extends Phaser.Scene {
  private battleManager!: BattleManager;
  private stars: Star[] = [];
  private playerDiskCenter = { x: 320, y: 360 };
  private opponentDiskCenter = { x: 960, y: 360 };
  private cardSprites: Map<string, CardSprite> = new Map();
  private playerStarlightSprites: Map<string, StarlightSprite> = new Map();
  private opponentStarlightSprites: Map<string, StarlightSprite> = new Map();
  private constellationLines: ConstellationLine[] = [];
  private nebulaRotation = 0;
  private playerDiskBg!: Phaser.GameObjects.Graphics;
  private opponentDiskBg!: Phaser.GameObjects.Graphics;
  private playerNebula!: Phaser.GameObjects.Graphics;
  private opponentNebula!: Phaser.GameObjects.Graphics;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private opponentHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealthText!: Phaser.GameObjects.Text;
  private opponentHealthText!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private isAnimating = false;
  private gameOverModal!: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  init(): void {
    this.battleManager = new BattleManager();
    this.stars = [];
    this.cardSprites.clear();
    this.playerStarlightSprites.clear();
    this.opponentStarlightSprites.clear();
    this.constellationLines = [];
    this.nebulaRotation = 0;
    this.isAnimating = false;
  }

  preload(): void {
    // No external assets needed - all graphics are procedurally generated
  }

  create(): void {
    this.createStarfield();
    this.createStarDisks();
    this.createHealthBars();
    this.createTurnIndicator();
    this.createEndTurnButton();
    this.renderHand();
    this.setupEventListeners();
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.updateStars(deltaSeconds);
    this.updateNebula(deltaSeconds);
    this.updateConstellationLines(deltaSeconds);
  }

  private createStarfield(): void {
    const starCount = Phaser.Math.Between(600, 800);
    const graphics = this.add.graphics();

    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, CANVAS_WIDTH);
      const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      const color = Phaser.Utils.Array.GetRandom([
        0xffffff, 0xf0f8ff, 0xe6f2ff, 0xd4e8ff, 0xc0dcff, 0xa0c4ff
      ]);

      const star = this.add.circle(x, y, size, color, alpha);
      star.setScrollFactor(0);

      this.stars.push({
        graphic: star,
        baseAlpha: alpha,
        twinkleSpeed: Phaser.Math.FloatBetween(0.5, 1.5),
        twinkleOffset: Phaser.Math.FloatBetween(0, Math.PI * 2)
      });
    }

    graphics.destroy();
  }

  private updateStars(deltaSeconds: number): void {
    const time = this.time.now / 1000;
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.baseAlpha * (0.4 + twinkle * 0.6);
      star.graphic.setAlpha(alpha);
    }
  }

  private createStarDisks(): void {
    this.createSingleDisk(this.playerDiskCenter, '#d4af37', '#7b68ee', false);
    this.createSingleDisk(this.opponentDiskCenter, '#8b008b', '#9370db', true);
  }

  private createSingleDisk(
    center: { x: number; y: number },
    ringColor: string,
    nebulaColor: string,
    isOpponent: boolean
  ): void {
    const bg = this.add.graphics();
    const nebula = this.add.graphics();

    bg.fillStyle(0x0a0e27, 0.8);
    bg.beginPath();
    bg.arc(center.x, center.y, STAR_DISK_RADIUS, 0, Math.PI * 2);
    bg.fill();
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(ringColor).color, 0.6);
    bg.strokePath();

    const gradient = nebula.createLinearGradient(
      center.x - STAR_DISK_RADIUS,
      center.y - STAR_DISK_RADIUS,
      center.x + STAR_DISK_RADIUS,
      center.y + STAR_DISK_RADIUS
    );
    gradient.addColorStop(0, nebulaColor + '40');
    gradient.addColorStop(0.5, nebulaColor + '20');
    gradient.addColorStop(1, nebulaColor + '40');

    nebula.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(nebulaColor).color,
      Phaser.Display.Color.HexStringToColor(nebulaColor).color,
      Phaser.Display.Color.HexStringToColor(nebulaColor).color,
      Phaser.Display.Color.HexStringToColor(nebulaColor).color,
      0.3, 0.1, 0.3, 0.1
    );
    nebula.beginPath();
    nebula.arc(center.x, center.y, STAR_DISK_RADIUS - 20, 0, Math.PI * 2);
    nebula.fill();

    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const x = center.x + Math.cos(angle) * (STAR_DISK_RADIUS - 50);
      const y = center.y + Math.sin(angle) * (STAR_DISK_RADIUS - 50);
      bg.fillStyle(0xd4af37, 0.3);
      bg.beginPath();
      bg.arc(x, y, 4, 0, Math.PI * 2);
      bg.fill();
    }

    const outerRing = this.add.graphics();
    outerRing.lineStyle(3, Phaser.Display.Color.HexStringToColor(ringColor).color, 0.4);
    outerRing.beginPath();
    outerRing.arc(center.x, center.y, STAR_DISK_RADIUS + 10, 0, Math.PI * 2);
    outerRing.strokePath();

    if (isOpponent) {
      this.opponentDiskBg = bg;
      this.opponentNebula = nebula;
    } else {
      this.playerDiskBg = bg;
      this.playerNebula = nebula;
    }
  }

  private updateNebula(deltaSeconds: number): void {
    this.nebulaRotation += NEBULA_ROTATION_SPEED * deltaSeconds;
    this.playerNebula.setRotation(this.nebulaRotation * Math.PI / 180);
    this.opponentNebula.setRotation(-this.nebulaRotation * Math.PI / 180);
  }

  private createHealthBars(): void {
    const barWidth = 400;
    const barHeight = 20;
    const barY = 40;

    this.playerHealthBar = this.add.graphics();
    this.opponentHealthBar = this.add.graphics();

    this.playerHealthText = this.add.text(60, barY, '', {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    this.opponentHealthText = this.add.text(CANVAS_WIDTH - 60, barY, '', {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(1, 0.5);

    this.updateHealthBars();
  }

  private updateHealthBars(): void {
    const barWidth = 400;
    const barHeight = 20;
    const barY = 40;
    const radius = 10;

    this.playerHealthBar.clear();
    this.opponentHealthBar.clear();

    const playerHealth = this.battleManager.getHealth(true);
    const opponentHealth = this.battleManager.getHealth(false);
    const maxHealth = this.battleManager.getMaxHealth();

    const playerPercent = playerHealth / maxHealth;
    const opponentPercent = opponentHealth / maxHealth;

    this.playerHealthBar.fillStyle(0x333333, 0.8);
    this.playerHealthBar.beginPath();
    this.playerHealthBar.roundRect(20, barY - barHeight / 2, barWidth, barHeight, radius);
    this.playerHealthBar.fill();

    this.playerHealthBar.fillGradientStyle(0xe74c3c, 0xc0392b, 0xc0392b, 0xe74c3c, 1, 1, 1, 1);
    this.playerHealthBar.beginPath();
    this.playerHealthBar.roundRect(20, barY - barHeight / 2, barWidth * playerPercent, barHeight, radius);
    this.playerHealthBar.fill();

    this.playerHealthBar.lineStyle(1, 0xd4af37, 0.6);
    this.playerHealthBar.beginPath();
    this.playerHealthBar.roundRect(20, barY - barHeight / 2, barWidth, barHeight, radius);
    this.playerHealthBar.strokePath();

    this.opponentHealthBar.fillStyle(0x333333, 0.8);
    this.opponentHealthBar.beginPath();
    this.opponentHealthBar.roundRect(CANVAS_WIDTH - 420, barY - barHeight / 2, barWidth, barHeight, radius);
    this.opponentHealthBar.fill();

    this.opponentHealthBar.fillGradientStyle(0xe74c3c, 0xc0392b, 0xc0392b, 0xe74c3c, 1, 1, 1, 1);
    this.opponentHealthBar.beginPath();
    this.opponentHealthBar.roundRect(
      CANVAS_WIDTH - 420,
      barY - barHeight / 2,
      barWidth * opponentPercent,
      barHeight,
      radius
    );
    this.opponentHealthBar.fill();

    this.opponentHealthBar.lineStyle(1, 0xd4af37, 0.6);
    this.opponentHealthBar.beginPath();
    this.opponentHealthBar.roundRect(CANVAS_WIDTH - 420, barY - barHeight / 2, barWidth, barHeight, radius);
    this.opponentHealthBar.strokePath();

    this.playerHealthText.setText(`玩家: ${playerHealth}/${maxHealth}`);
    this.opponentHealthText.setText(`对手: ${opponentHealth}/${maxHealth}`);
  }

  private createTurnIndicator(): void {
    this.turnIndicator = this.add.text(CANVAS_WIDTH / 2, 40, '', {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: '18px',
      color: '#d4af37'
    }).setOrigin(0.5, 0.5);

    this.updateTurnIndicator();
  }

  private updateTurnIndicator(): void {
    const turn = this.battleManager.getCurrentTurn();
    const turnCount = this.battleManager.getTurnCount();
    const text = turn === 'player' ? `第 ${turnCount} 回合 - 你的回合` : `第 ${turnCount} 回合 - 对手回合`;
    this.turnIndicator.setText(text);
    this.turnIndicator.setColor(turn === 'player' ? '#d4af37' : '#ff6b6b');
  }

  private createEndTurnButton(): void {
    const buttonX = CANVAS_WIDTH / 2;
    const buttonY = CANVAS_HEIGHT - 40;

    this.endTurnButton = this.add.container(buttonX, buttonY);

    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.9);
    bg.beginPath();
    bg.roundRect(-60, -20, 120, 40, 8);
    bg.fill();
    bg.lineStyle(1, 0x87ceeb, 0.8);
    bg.strokePath();

    const text = this.add.text(0, 0, '结束回合', {
      fontFamily: 'Noto Serif SC, serif',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.endTurnButton.add([bg, text]);
    this.endTurnButton.setSize(120, 40);
    this.endTurnButton.setInteractive({ useHandCursor: true });

    this.endTurnButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x1a3a5c, 0.9);
      bg.beginPath();
      bg.roundRect(-60, -20, 120, 40, 8);
      bg.fill();
      bg.lineStyle(2, 0xd4af37, 1);
      bg.strokePath();
    });

    this.endTurnButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x16213e, 0.9);
      bg.beginPath();
      bg.roundRect(-60, -20, 120, 40, 8);
      bg.fill();
      bg.lineStyle(1, 0x87ceeb, 0.8);
      bg.strokePath();
    });

    this.endTurnButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.endTurnButton,
        scale: 1.15,
        duration: 100,
        yoyo: true,
        ease: 'Cubic.InOut'
      });
      this.endTurn();
    });
  }

  private renderHand(): void {
    for (const [, cardSprite] of this.cardSprites) {
      cardSprite.container.destroy();
    }
    this.cardSprites.clear();

    const hand = this.battleManager.getHand();
    const startX = 80;
    const spacing = CARD_WIDTH + 20;
    const y = CANVAS_HEIGHT - 80;

    hand.forEach((card, index) => {
      const x = startX + index * spacing;
      this.createCardSprite(card, x, y);
    });
  }

  private createCardSprite(card: IHandCard, x: number, y: number): void {
    const constellation = getConstellationById(card.constellationId);
    if (!constellation) return;

    const container = this.add.container(x, y);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);

    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.9);
    bg.beginPath();
    bg.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    bg.fill();
    bg.lineStyle(1, 0x87ceeb, 0.8);
    bg.strokePath();

    const symbol = this.add.text(0, -15, constellation.symbol, {
      fontFamily: 'serif',
      fontSize: '28px',
      color: constellation.iconColor
    }).setOrigin(0.5, 0.5);

    const name = this.add.text(0, 15, constellation.name, {
      fontFamily: 'Noto Serif SC, serif',
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    const energyStars = this.add.text(0, 35, '★'.repeat(constellation.energy), {
      fontFamily: 'serif',
      fontSize: '10px',
      color: '#ffd700'
    }).setOrigin(0.5, 0.5);

    const elementColor = getElementColor(constellation.element);
    const elementIndicator = this.add.graphics();
    elementIndicator.fillStyle(
      Phaser.Display.Color.HexStringToColor(elementColor).color,
      0.8
    );
    elementIndicator.beginPath();
    elementIndicator.arc(-CARD_WIDTH / 2 + 10, -CARD_HEIGHT / 2 + 10, 5, 0, Math.PI * 2);
    elementIndicator.fill();

    container.add([bg, elementIndicator, symbol, name, energyStars]);
    container.setInteractive({ useHandCursor: true });

    let originalX = x;
    let originalY = y;
    let isDragging = false;

    container.on('pointerover', () => {
      if (!isDragging && !this.isAnimating) {
        this.tweens.add({
          targets: container,
          y: y - 15,
          scale: 1.1,
          duration: 300,
          ease: 'Cubic.Out'
        });
      }
    });

    container.on('pointerout', () => {
      if (!isDragging) {
        this.tweens.add({
          targets: container,
          y: y,
          scale: 1,
          duration: 300,
          ease: 'Cubic.Out'
        });
      }
    });

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.battleManager.getCurrentTurn() !== 'player' || this.isAnimating) return;

      isDragging = true;
      originalX = container.x;
      originalY = container.y;
      container.setDepth(100);
      container.setScale(1.1);

      this.input.setDraggable(container);
      container.emit('dragstart', pointer, container);
    });

    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on('dragend', (_pointer: Phaser.Input.Pointer) => {
      isDragging = false;
      container.setDepth(1);
      this.input.setDraggable(container, false);

      const distToDisk = Phaser.Math.Distance.Between(
        container.x, container.y,
        this.playerDiskCenter.x, this.playerDiskCenter.y
      );

      if (distToDisk < STAR_DISK_RADIUS) {
        this.playStarBurst(this.playerDiskCenter.x, this.playerDiskCenter.y);
        this.placeCard(card.id, container);
      } else {
        this.tweens.add({
          targets: container,
          x: originalX,
          y: originalY,
          scale: 1,
          duration: 300,
          ease: 'Cubic.Out'
        });
      }
    });

    this.cardSprites.set(card.id, {
      container,
      cardData: card,
      isDragging,
      originalX,
      originalY
    });
  }

  private playStarBurst(x: number, y: number): void {
    const particles = this.add.particles(x, y, 'particle', {
      color: [0xffd700, 0xffa500, 0xffff00],
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 50,
      blendMode: 'ADD'
    });

    this.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  private placeCard(cardId: string, cardContainer: Phaser.GameObjects.Container): void {
    this.isAnimating = true;
    const starlight = this.battleManager.placeStarlight(cardId, true);

    if (starlight) {
      this.tweens.add({
        targets: cardContainer,
        alpha: 0,
        scale: 0,
        duration: 200,
        ease: 'Cubic.In',
        onComplete: () => {
          this.createStarlightSprite(starlight);
          this.renderHand();
          this.checkConstellationCombo();
          this.isAnimating = false;
        }
      });
    } else {
      const cardSprite = this.cardSprites.get(cardId);
      if (cardSprite) {
        this.tweens.add({
          targets: cardContainer,
          x: cardSprite.originalX,
          y: cardSprite.originalY,
          scale: 1,
          duration: 300,
          ease: 'Cubic.Out'
        });
      }
      this.isAnimating = false;
    }
  }

  private getSlotPosition(center: { x: number; y: number }, slotIndex: number): { x: number; y: number } {
    const angle = (slotIndex * 30 - 90) * Math.PI / 180;
    const radius = STAR_DISK_RADIUS - 50;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    };
  }

  private createStarlightSprite(starlight: IStarlight): void {
    const constellation = getConstellationById(starlight.constellationId);
    if (!constellation) return;

    const center = starlight.isPlayer ? this.playerDiskCenter : this.opponentDiskCenter;
    const pos = this.getSlotPosition(center, starlight.slotIndex);

    const container = this.add.container(pos.x, pos.y);
    container.setSize(STARLIGHT_RADIUS * 2, STARLIGHT_RADIUS * 2);

    const glowRing = this.add.circle(0, 0, STARLIGHT_RADIUS + 5, 0x7b68ee, 0);
    const bg = this.add.circle(0, 0, STARLIGHT_RADIUS, 0x16213e, 0.9);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(constellation.iconColor).color, 0.8);

    const symbol = this.add.text(0, 0, constellation.symbol, {
      fontFamily: 'serif',
      fontSize: '20px',
      color: constellation.iconColor
    }).setOrigin(0.5, 0.5);

    const energyBar = this.add.graphics();
    this.updateEnergyBar(energyBar, starlight.energy);

    container.add([glowRing, bg, symbol, energyBar]);
    container.setDepth(10);

    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: 'Back.Out'
    });

    if (starlight.isPlayer) {
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (this.battleManager.getCurrentTurn() === 'player' && !this.isAnimating) {
          this.tweens.add({
            targets: container,
            scale: 1.15,
            duration: 100,
            yoyo: true,
            ease: 'Cubic.InOut'
          });
          this.chargeStarlight(starlight.id);
        }
      });
    }

    const spriteMap = starlight.isPlayer ? this.playerStarlightSprites : this.opponentStarlightSprites;
    spriteMap.set(starlight.id, {
      container,
      starlightData: starlight,
      glowRing,
      energyBar
    });
  }

  private updateEnergyBar(graphics: Phaser.GameObjects.Graphics, energy: number): void {
    graphics.clear();
    const barWidth = 40;
    const barHeight = 4;
    const percent = energy / 100;

    graphics.fillStyle(0x333333, 0.8);
    graphics.beginPath();
    graphics.roundRect(-barWidth / 2, STARLIGHT_RADIUS - 8, barWidth, barHeight, 2);
    graphics.fill();

    graphics.fillStyle(0xd4af37, 1);
    graphics.beginPath();
    graphics.roundRect(-barWidth / 2, STARLIGHT_RADIUS - 8, barWidth * percent, barHeight, 2);
    graphics.fill();
  }

  private chargeStarlight(starlightId: string): void {
    const result = this.battleManager.chargeStarlight(starlightId, true);
    const sprite = this.playerStarlightSprites.get(starlightId);

    if (sprite && result.newEnergy > 0) {
      this.tweens.add({
        targets: sprite.glowRing,
        alpha: { from: 0, to: 0.8 },
        scale: { from: 1, to: 1.5 },
        duration: 500,
        ease: 'Cubic.Out',
        yoyo: true
      });

      this.updateEnergyBar(sprite.energyBar, result.newEnergy);
      this.updateHealthBars();

      if (result.canAttack) {
        this.time.delayedCall(600, () => {
          this.fireBeamAttack(starlightId, true);
        });
      }
    }
  }

  private fireBeamAttack(attackerId: string, isPlayerAttacker: boolean): void {
    this.isAnimating = true;

    const attackerSprites = isPlayerAttacker ? this.playerStarlightSprites : this.opponentStarlightSprites;
    const targetSprites = isPlayerAttacker ? this.opponentStarlightSprites : this.playerStarlightSprites;

    const attackerSprite = attackerSprites.get(attackerId);
    if (!attackerSprite) {
      this.isAnimating = false;
      return;
    }

    const targetArray = Array.from(targetSprites.values());
    if (targetArray.length === 0) {
      const result = this.battleManager.fireBeam(attackerId, isPlayerAttacker);
      this.playBeamAnimation(
        attackerSprite.container.x, attackerSprite.container.y,
        isPlayerAttacker ? this.opponentDiskCenter.x : this.playerDiskCenter.x,
        isPlayerAttacker ? this.opponentDiskCenter.y : this.playerDiskCenter.y
      );
      this.updateHealthBars();
      this.time.delayedCall(500, () => {
        this.checkGameOver();
        this.isAnimating = false;
      });
      return;
    }

    const targetIndex = Math.floor(Math.random() * targetArray.length);
    const targetSprite = targetArray[targetIndex];

    const result = this.battleManager.fireBeam(attackerId, isPlayerAttacker);

    this.playBeamAnimation(
      attackerSprite.container.x, attackerSprite.container.y,
      targetSprite.container.x, targetSprite.container.y
    );

    this.time.delayedCall(400, () => {
      this.playExplosion(targetSprite.container.x, targetSprite.container.y);
      this.updateEnergyBar(targetSprite.energyBar, result.targetEnergy);
      this.updateHealthBars();

      this.time.delayedCall(300, () => {
        this.checkGameOver();
        this.isAnimating = false;
      });
    });
  }

  private playBeamAnimation(x1: number, y1: number, x2: number, y2: number): void {
    const line = this.add.graphics();
    const gradient = line.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(1, '#ff6347');

    line.lineStyle(3, 0xffd700, 1);
    line.beginPath();
    line.moveTo(x1, y1);
    line.lineTo(x2, y2);
    line.strokePath();

    this.tweens.add({
      targets: line,
      alpha: { from: 1, to: 0 },
      duration: 400,
      ease: 'Cubic.Out',
      onComplete: () => {
        line.destroy();
      }
    });
  }

  private playExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const particle = this.add.circle(x, y, 3, 0xff6347, 1);
      const targetX = x + Math.cos(angle) * 30;
      const targetY = y + Math.sin(angle) * 30;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Cubic.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private checkConstellationCombo(): void {
    const starlights = this.battleManager.getStarlights(true);
    const combo = checkCombo(starlights);

    if (combo) {
      this.triggerConstellationEffect(combo, starlights);
    }
  }

  private triggerConstellationEffect(combo: IComboGroup, starlights: IStarlight[]): void {
    this.isAnimating = true;

    const comboStarlights = starlights.filter(s =>
      combo.constellations.includes(s.constellationId)
    );

    const points = comboStarlights.map(s => {
      const pos = this.getSlotPosition(this.playerDiskCenter, s.slotIndex);
      return pos;
    });

    this.createConstellationLine(points, combo);

    this.time.delayedCall(500, () => {
      const result = this.battleManager.triggerConstellation(combo.id);

      if (result.removeRandom) {
        const removed = this.battleManager.removeRandomStarlight(false);
        if (removed) {
          const targetSprite = this.opponentStarlightSprites.get(removed.id);
          if (targetSprite) {
            this.tweens.add({
              targets: targetSprite.container,
              alpha: 0,
              scale: 0,
              duration: 300,
              ease: 'Cubic.In',
              onComplete: () => {
                targetSprite.container.destroy();
                this.opponentStarlightSprites.delete(removed.id);
              }
            });
          }
        }
      }

      if (result.shockwave) {
        this.playShockwave(this.playerDiskCenter.x, this.playerDiskCenter.y);
      }

      this.showComboText(combo.name);
      this.updateHealthBars();

      this.time.delayedCall(800, () => {
        this.checkGameOver();
        this.isAnimating = false;
      });
    });
  }

  private createConstellationLine(points: { x: number; y: number }[], combo: IComboGroup): void {
    const line = this.add.graphics();
    const elementColor = getElementColor(combo.element);

    const glowDot = this.add.circle(points[0].x, points[0].y, 6, 0xffd700, 1);

    this.constellationLines.push({
      line,
      glowDot,
      dotProgress: 0,
      points
    });

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 400,
      ease: 'Linear',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.getValue();
        line.clear();
        line.lineStyle(2, Phaser.Display.Color.HexStringToColor(elementColor).color, progress);
        line.beginPath();
        line.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          line.lineTo(points[i].x, points[i].y);
        }
        line.lineTo(points[0].x, points[0].y);
        line.strokePath();
      },
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: line,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.Out',
            onComplete: () => {
              line.destroy();
              glowDot.destroy();
              this.constellationLines.shift();
            }
          });
        });
      }
    });
  }

  private updateConstellationLines(deltaSeconds: number): void {
    for (const cl of this.constellationLines) {
      cl.dotProgress += deltaSeconds * 40;

      const totalLength = this.calculatePathLength(cl.points);
      const currentDist = cl.dotProgress % totalLength;

      const pos = this.getPositionOnPath(cl.points, currentDist);
      if (pos) {
        cl.glowDot.setPosition(pos.x, pos.y);
      }
    }
  }

  private calculatePathLength(points: { x: number; y: number }[]): number {
    let length = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      length += Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    }
    return length;
  }

  private getPositionOnPath(
    points: { x: number; y: number }[],
    distance: number
  ): { x: number; y: number } | null {
    let accumulated = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const segmentLength = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

      if (distance <= accumulated + segmentLength) {
        const t = (distance - accumulated) / segmentLength;
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
      }
      accumulated += segmentLength;
    }
    return null;
  }

  private playShockwave(x: number, y: number): void {
    const shockwave = this.add.circle(x, y, 10, 0xff4500, 0.5);
    shockwave.setStrokeStyle(2, 0xff4500, 0.8);

    this.tweens.add({
      targets: shockwave,
      radius: 80,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out',
      onComplete: () => {
        shockwave.destroy();
      }
    });
  }

  private showComboText(comboName: string): void {
    const text = this.add.text(
      this.playerDiskCenter.x,
      this.playerDiskCenter.y,
      comboName + '!',
      {
        fontFamily: 'Cinzel Decorative, serif',
        fontSize: '32px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5, 0.5).setDepth(50);

    this.tweens.add({
      targets: text,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.Out',
      yoyo: true,
      hold: 300,
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private endTurn(): void {
    if (this.isAnimating || this.battleManager.getCurrentTurn() !== 'player') return;

    this.battleManager.switchTurn();
    this.updateTurnIndicator();

    this.time.delayedCall(500, () => {
      this.opponentTurn();
    });
  }

  private opponentTurn(): void {
    if (this.battleManager.isGameOver()) return;

    this.isAnimating = true;
    const opponentStarlights = this.battleManager.getStarlights(false);

    const action = Math.random();

    if (opponentStarlights.length < 3 && action < 0.6) {
      this.opponentPlaceCard();
    } else if (opponentStarlights.length > 0) {
      const randomStarlight = opponentStarlights[Math.floor(Math.random() * opponentStarlights.length)];
      this.opponentChargeStarlight(randomStarlight.id);
    } else {
      this.endOpponentTurn();
    }
  }

  private opponentPlaceCard(): void {
    const allConstellations = ['aries', 'leo', 'sagittarius', 'cancer', 'scorpio', 'pisces',
      'taurus', 'virgo', 'capricorn', 'gemini', 'libra', 'aquarius'];
    const randomId = allConstellations[Math.floor(Math.random() * allConstellations.length)];
    const fakeCardId = `opponent-card-${Date.now()}`;

    const hand = this.battleManager.getState().playerHand;
    (this.battleManager as any).state.opponentHand = [{
      id: fakeCardId,
      constellationId: randomId
    }];

    const starlight = this.battleManager.placeStarlight(fakeCardId, false);

    if (starlight) {
      this.playStarBurst(this.opponentDiskCenter.x, this.opponentDiskCenter.y);
      this.createStarlightSprite(starlight);

      this.time.delayedCall(500, () => {
        const opponentStarlights = this.battleManager.getStarlights(false);
        const combo = checkCombo(opponentStarlights);
        if (combo) {
          this.triggerOpponentCombo(combo, opponentStarlights);
        } else {
          this.endOpponentTurn();
        }
      });
    } else {
      this.endOpponentTurn();
    }
  }

  private triggerOpponentCombo(combo: IComboGroup, starlights: IStarlight[]): void {
    const comboStarlights = starlights.filter(s =>
      combo.constellations.includes(s.constellationId)
    );

    const points = comboStarlights.map(s => {
      const pos = this.getSlotPosition(this.opponentDiskCenter, s.slotIndex);
      return pos;
    });

    const line = this.add.graphics();
    const elementColor = getElementColor(combo.element);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 400,
      ease: 'Linear',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.getValue();
        line.clear();
        line.lineStyle(2, Phaser.Display.Color.HexStringToColor(elementColor).color, progress);
        line.beginPath();
        line.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          line.lineTo(points[i].x, points[i].y);
        }
        line.lineTo(points[0].x, points[0].y);
        line.strokePath();
      },
      onComplete: () => {
        this.battleManager.updateHealth(true, -5);
        const removed = this.battleManager.removeRandomStarlight(true);
        if (removed) {
          const targetSprite = this.playerStarlightSprites.get(removed.id);
          if (targetSprite) {
            this.tweens.add({
              targets: targetSprite.container,
              alpha: 0,
              scale: 0,
              duration: 300,
              ease: 'Cubic.In',
              onComplete: () => {
                targetSprite.container.destroy();
                this.playerStarlightSprites.delete(removed.id);
              }
            });
          }
        }
        this.playShockwave(this.opponentDiskCenter.x, this.opponentDiskCenter.y);
        this.showComboText('对手 ' + combo.name);
        this.updateHealthBars();

        this.time.delayedCall(1000, () => {
          line.destroy();
          this.checkGameOver();
          this.endOpponentTurn();
        });
      }
    });
  }

  private opponentChargeStarlight(starlightId: string): void {
    const result = this.battleManager.chargeStarlight(starlightId, false);
    const sprite = this.opponentStarlightSprites.get(starlightId);

    if (sprite && result.newEnergy > 0) {
      this.tweens.add({
        targets: sprite.glowRing,
        alpha: { from: 0, to: 0.8 },
        scale: { from: 1, to: 1.5 },
        duration: 500,
        ease: 'Cubic.Out',
        yoyo: true
      });

      this.updateEnergyBar(sprite.energyBar, result.newEnergy);

      this.time.delayedCall(600, () => {
        if (result.canAttack) {
          this.fireBeamAttack(starlightId, false);
          this.time.delayedCall(800, () => {
            this.endOpponentTurn();
          });
        } else {
          this.endOpponentTurn();
        }
      });
    } else {
      this.endOpponentTurn();
    }
  }

  private endOpponentTurn(): void {
    if (this.battleManager.isGameOver()) {
      this.isAnimating = false;
      this.checkGameOver();
      return;
    }

    this.battleManager.switchTurn();
    this.battleManager.drawCard();
    this.renderHand();
    this.updateTurnIndicator();
    this.isAnimating = false;
  }

  private checkGameOver(): void {
    const winner = this.battleManager.checkGameOver();
    if (winner) {
      this.showGameOverModal(winner);
    }
  }

  private showGameOverModal(winner: 'player' | 'opponent'): void {
    this.isAnimating = true;

    const overlay = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0x000000, 0.7
    ).setDepth(100);

    this.gameOverModal = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.gameOverModal.setDepth(101);

    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.beginPath();
    bg.roundRect(-200, -150, 400, 300, 16);
    bg.fill();
    bg.lineStyle(2, 0xd4af37, 0.8);
    bg.strokePath();

    const titleText = winner === 'player' ? '胜利!' : '失败...';
    const titleColor = winner === 'player' ? '#ffd700' : '#ff6b6b';

    const title = this.add.text(0, -60, titleText, {
      fontFamily: 'Cinzel Decorative, serif',
      fontSize: '48px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5);

    const subtitle = this.add.text(0, 0, winner === 'player' ? '你征服了星盘!' : '星盘已落入对手手中', {
      fontFamily: 'Noto Serif SC, serif',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0xd4af37, 0.9);
    buttonBg.beginPath();
    buttonBg.roundRect(-80, 60, 160, 50, 8);
    buttonBg.fill();
    buttonBg.lineStyle(2, 0xffffff, 0.5);
    buttonBg.strokePath();

    const buttonText = this.add.text(0, 85, '再来一局', {
      fontFamily: 'Noto Serif SC, serif',
      fontSize: '20px',
      color: '#16213e',
      fontWeight: 'bold'
    }).setOrigin(0.5, 0.5);

    const button = this.add.container(0, 60, [buttonBg, buttonText]);
    button.setSize(160, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xffd700, 1);
      buttonBg.beginPath();
      buttonBg.roundRect(-80, 0, 160, 50, 8);
      buttonBg.fill();
      buttonBg.lineStyle(2, 0xffffff, 0.8);
      buttonBg.strokePath();
    });

    button.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xd4af37, 0.9);
      buttonBg.beginPath();
      buttonBg.roundRect(-80, 0, 160, 50, 8);
      buttonBg.fill();
      buttonBg.lineStyle(2, 0xffffff, 0.5);
      buttonBg.strokePath();
    });

    button.on('pointerdown', () => {
      this.tweens.add({
        targets: button,
        scale: 1.15,
        duration: 100,
        yoyo: true,
        ease: 'Cubic.InOut',
        onComplete: () => {
          this.restartGame();
        }
      });
    });

    this.gameOverModal.add([bg, title, subtitle, button]);
    this.gameOverModal.setScale(0);

    this.tweens.add({
      targets: this.gameOverModal,
      scale: 1,
      duration: 600,
      ease: 'Back.Out'
    });
  }

  private restartGame(): void {
    this.tweens.add({
      targets: this.gameOverModal,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Cubic.In',
      onComplete: () => {
        this.scene.restart();
      }
    });
  }

  private setupEventListeners(): void {
    // Additional event listeners can be added here
  }
}
