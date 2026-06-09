import * as Phaser from 'phaser';
import { BattleManager, DamageResult, PlayerId, MAX_HERO_HEALTH } from '../managers/BattleManager';
import { CardDataManager, CardInstance } from '../managers/CardDataManager';
import { AudioManager } from '../managers/AudioManager';
import { CardComponent, CARD_WIDTH, CARD_HEIGHT } from '../components/CardComponent';
import { MagicCircle } from '../components/MagicCircle';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const STAGE_RADIUS = 120;

export class BattleScene extends Phaser.Scene {
  private battleManager: BattleManager;
  private cardDataManager: CardDataManager;
  private audioManager: AudioManager;

  private playerHandCards: CardComponent[] = [];
  private enemyHandCards: CardComponent[] = [];
  private playedPlayerCard: CardComponent | null = null;
  private playedEnemyCard: CardComponent | null = null;

  private magicCircle: MagicCircle | null = null;
  private playerHealthBar: Phaser.GameObjects.Graphics | null = null;
  private enemyHealthBar: Phaser.GameObjects.Graphics | null = null;
  private playerHealthText: Phaser.GameObjects.Text | null = null;
  private enemyHealthText: Phaser.GameObjects.Text | null = null;
  private turnText: Phaser.GameObjects.Text | null = null;
  private flashOverlay: Phaser.GameObjects.Graphics | null = null;

  private draggingCard: CardComponent | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private gameScale: number = 1;
  private centerX: number = 0;
  private centerY: number = 0;

  private isResolving: boolean = false;

  private particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  public init(): void {
    this.battleManager = BattleManager.getInstance();
    this.cardDataManager = CardDataManager.getInstance();
    this.audioManager = AudioManager.getInstance();
    this.audioManager.setScene(this);
  }

  public create(): void {
    this.setupResponsiveCanvas();
    this.createBackground();
    this.createMagicCircle();
    this.createHealthBars();
    this.createTurnIndicator();
    this.createFlashOverlay();
    this.createHands();
    this.setupInputEvents();
    this.setupBattleEvents();
    this.scale.on('resize', this.handleResize, this);
  }

  private setupResponsiveCanvas(): void {
    const windowWidth = Math.max(window.innerWidth, 600);
    const windowHeight = window.innerHeight;
    const targetRatio = BASE_WIDTH / BASE_HEIGHT;
    const windowRatio = windowWidth / windowHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (windowRatio > targetRatio) {
      displayHeight = windowHeight * 0.95;
      displayWidth = displayHeight * targetRatio;
    } else {
      displayWidth = windowWidth * 0.95;
      displayHeight = displayWidth / targetRatio;
    }

    this.gameScale = displayWidth / BASE_WIDTH;
    this.scale.resize(BASE_WIDTH, BASE_HEIGHT);

    this.centerX = BASE_WIDTH / 2;
    this.centerY = BASE_HEIGHT / 2;
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    const colorTop = new Phaser.Display.Color(42, 10, 58);
    const colorBottom = new Phaser.Display.Color(10, 10, 30);

    for (let y = 0; y < BASE_HEIGHT; y++) {
      const t = y / BASE_HEIGHT;
      const r = Math.floor(colorTop.r + (colorBottom.r - colorTop.r) * t);
      const g = Math.floor(colorTop.g + (colorBottom.g - colorTop.g) * t);
      const b = Math.floor(colorTop.b + (colorBottom.b - colorTop.b) * t);
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gradient.fillRect(0, y, BASE_WIDTH, 1);
    }
  }

  private createMagicCircle(): void {
    this.magicCircle = new MagicCircle(this, this.centerX, this.centerY, 200);
  }

  private createHealthBars(): void {
    const state = this.battleManager.getState();

    this.playerHealthBar = this.add.graphics();
    this.drawHealthBar(this.playerHealthBar, this.centerX - 150, BASE_HEIGHT - 45, 300, 20, state.playerHealth);

    this.playerHealthText = this.add.text(this.centerX, BASE_HEIGHT - 35, `${state.playerHealth} / ${MAX_HERO_HEALTH}`, {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.enemyHealthBar = this.add.graphics();
    this.drawHealthBar(this.enemyHealthBar, this.centerX - 150, 25, 300, 20, state.enemyHealth);

    this.enemyHealthText = this.add.text(this.centerX, 35, `${state.enemyHealth} / ${MAX_HERO_HEALTH}`, {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private drawHealthBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, currentHealth: number): void {
    graphics.clear();

    graphics.fillStyle(0x000000, 0.5);
    graphics.fillRoundedRect(x, y, width, height, 4);

    graphics.lineStyle(2, 0x888888, 0.8);
    graphics.strokeRoundedRect(x, y, width, height, 4);

    const ratio = Math.max(0, currentHealth / MAX_HERO_HEALTH);
    const fillWidth = Math.max(0, (width - 4) * ratio);

    const healthGradient = this.add.graphics();
    const green = new Phaser.Display.Color(0, 255, 0);
    const red = new Phaser.Display.Color(255, 0, 0);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(green, red, 100, Math.floor(100 * (1 - ratio)));
    healthGradient.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
    healthGradient.fillRoundedRect(x + 2, y + 2, fillWidth, height - 4, 2);

    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillRoundedRect(x + 2, y + 2, fillWidth, (height - 4) / 2, 2);

    healthGradient.destroy();
  }

  private createTurnIndicator(): void {
    const state = this.battleManager.getState();
    this.turnText = this.add.text(this.centerX, 70, `第 ${state.turnCount} 回合`, {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '18px',
      color: '#ffdd88',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createFlashOverlay(): void {
    this.flashOverlay = this.add.graphics();
    this.flashOverlay.fillStyle(0xffffff, 0);
    this.flashOverlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    this.flashOverlay.setDepth(1000);
  }

  private createHands(): void {
    this.clearHandCards();
    this.createPlayerHand();
    this.createEnemyHand();
  }

  private clearHandCards(): void {
    this.playerHandCards.forEach((c) => c.destroy());
    this.enemyHandCards.forEach((c) => c.destroy());
    this.playerHandCards = [];
    this.enemyHandCards = [];
  }

  private createPlayerHand(): void {
    const state = this.battleManager.getState();
    const handY = BASE_HEIGHT - 130;
    const totalSpacing = CARD_WIDTH + 20;
    const startX = this.centerX - ((state.playerHand.length - 1) * totalSpacing) / 2;

    state.playerHand.forEach((cardData, index) => {
      const x = startX + index * totalSpacing;
      const angle = (index - (state.playerHand.length - 1) / 2) * 5;
      const card = new CardComponent(this, x, handY, cardData, false);
      card.setCardAngle(angle);
      card.setOriginalPosition(x, handY);
      card.setData('handIndex', index);
      this.playerHandCards.push(card);
    });
  }

  private createEnemyHand(): void {
    const state = this.battleManager.getState();
    const handY = 130;
    const totalSpacing = CARD_WIDTH + 20;
    const startX = this.centerX - ((state.enemyHand.length - 1) * totalSpacing) / 2;

    state.enemyHand.forEach((cardData, index) => {
      const x = startX + index * totalSpacing;
      const angle = -(index - (state.enemyHand.length - 1) / 2) * 5;
      const card = new CardComponent(this, x, handY, cardData, true);
      card.setCardAngle(angle);
      card.setOriginalPosition(x, handY);
      card.disableInteractive();
      this.enemyHandCards.push(card);
    });
  }

  private setupInputEvents(): void {
    this.playerHandCards.forEach((card) => {
      card.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onCardPointerDown(card, pointer));
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
  }

  private onCardPointerDown(card: CardComponent, pointer: Phaser.Input.Pointer): void {
    if (this.isResolving || this.draggingCard) return;

    const state = this.battleManager.getState();
    if (state.currentPhase !== 'playerTurn') return;

    this.draggingCard = card;
    card.isDragging = true;
    this.dragOffsetX = card.x - pointer.x;
    this.dragOffsetY = card.y - pointer.y;

    card.setSelected(true);
    this.tweens.add({
      targets: card,
      scale: 1.2,
      duration: 150,
      ease: 'Quad.Out'
    });

    card.setDepth(100);
    card.setCardAngle(Phaser.Math.Between(0, 15));
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingCard) return;

    this.draggingCard.x = pointer.x + this.dragOffsetX;
    this.draggingCard.y = pointer.y + this.dragOffsetY;
    this.draggingCard.setAngle(Phaser.Math.Between(-15, 15));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingCard) return;

    const card = this.draggingCard;
    card.isDragging = false;
    card.setSelected(false);

    const distToCenter = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.centerX, this.centerY);

    if (distToCenter <= STAGE_RADIUS) {
      this.snapCardToCenter(card);
    } else {
      card.returnToOriginal(500).then(() => {
        card.setScale(card.getData('originalScale') || 1);
      });
      this.tweens.add({
        targets: card,
        scale: 1,
        duration: 500,
        ease: 'Elastic.Out'
      });
    }

    this.draggingCard = null;
  }

  private snapCardToCenter(card: CardComponent): void {
    const targetY = this.centerY + 100;
    this.audioManager.playSound('playCard');

    this.tweens.add({
      targets: card,
      x: this.centerX,
      y: targetY,
      scale: 1.3,
      angle: 0,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        const cardData = card.getCardData();
        this.battleManager.playCard('player', cardData.instanceId);
        this.playedPlayerCard = card;

        const handIndex = this.playerHandCards.indexOf(card);
        if (handIndex !== -1) {
          this.playerHandCards.splice(handIndex, 1);
        }
      }
    });
  }

  private setupBattleEvents(): void {
    this.battleManager.on('cardPlayed', this.onCardPlayed.bind(this));
    this.battleManager.on('damageDealt', this.onDamageDealt.bind(this));
    this.battleManager.on('turnEnded', this.onTurnEnded.bind(this));
    this.battleManager.on('gameOver', this.onGameOver.bind(this));
  }

  private onCardPlayed(data: { playerId: PlayerId; card: CardInstance }): void {
    if (data.playerId === 'enemy') {
      this.time.delayedCall(500, () => {
        this.playEnemyCardAnimation(data.card);
      });
    }
  }

  private playEnemyCardAnimation(cardData: CardInstance): void {
    if (this.enemyHandCards.length === 0) {
      this.spawnEnemyCardDirect(cardData);
      return;
    }

    const sourceCard = this.enemyHandCards[0];
    const targetY = this.centerY - 100;

    this.audioManager.playSound('playCard');

    const newCard = new CardComponent(this, sourceCard.x, sourceCard.y, cardData, false);
    newCard.setScale(sourceCard.scale);
    newCard.setAngle(sourceCard.angle);
    newCard.setDepth(50);

    this.enemyHandCards.forEach((c) => c.destroy());
    this.enemyHandCards = [];

    this.playedEnemyCard = newCard;

    this.tweens.add({
      targets: newCard,
      x: this.centerX,
      y: targetY,
      scale: 1.3,
      angle: 0,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        this.startCollisionAnimation();
      }
    });
  }

  private spawnEnemyCardDirect(cardData: CardInstance): void {
    const targetY = this.centerY - 100;
    this.audioManager.playSound('playCard');

    const newCard = new CardComponent(this, this.centerX, 130, cardData, false);
    newCard.setScale(0.1);
    newCard.setAlpha(0);
    this.playedEnemyCard = newCard;

    this.tweens.add({
      targets: newCard,
      y: targetY,
      scale: 1.3,
      alpha: 1,
      duration: 400,
      ease: 'Back.Out',
      onComplete: () => {
        this.startCollisionAnimation();
      }
    });
  }

  private startCollisionAnimation(): void {
    if (!this.playedPlayerCard || !this.playedEnemyCard) return;
    this.isResolving = true;

    const playerStartX = this.playedPlayerCard.x;
    const playerStartY = this.playedPlayerCard.y;
    const enemyStartX = this.playedEnemyCard.x;
    const enemyStartY = this.playedEnemyCard.y;

    this.tweens.add({
      targets: this.playedPlayerCard,
      x: { from: playerStartX, to: this.centerX - 50 },
      y: { from: playerStartY, to: this.centerY },
      duration: 750,
      ease: 'Cubic.In'
    });

    this.tweens.add({
      targets: this.playedEnemyCard,
      x: { from: enemyStartX, to: this.centerX + 50 },
      y: { from: enemyStartY, to: this.centerY },
      duration: 750,
      ease: 'Cubic.In',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.audioManager.playSound('collision');
          this.triggerFlash();
          this.spawnCollisionParticles();
          this.time.delayedCall(200, () => {
            this.battleManager.resolveBattle();
          });
        });
      }
    });

    this.tweens.add({
      targets: this.playedPlayerCard,
      angle: { from: 0, to: -30 },
      duration: 750,
      ease: 'Cubic.In'
    });

    this.tweens.add({
      targets: this.playedEnemyCard,
      angle: { from: 0, to: 30 },
      duration: 750,
      ease: 'Cubic.In'
    });
  }

  private triggerFlash(): void {
    if (!this.flashOverlay) return;

    this.flashOverlay.clear();
    this.flashOverlay.fillStyle(0xffffff, 0.3);
    this.flashOverlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        if (this.flashOverlay) {
          this.flashOverlay.clear();
          this.flashOverlay.fillStyle(0xffffff, 0);
          this.flashOverlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
          this.flashOverlay.alpha = 1;
        }
      }
    });
  }

  private spawnCollisionParticles(): void {
    const colors = [0xff4422, 0x2288ff, 0x44dd66, 0xffdd33, 0x9933cc];

    for (let i = 0; i < 50; i++) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const particle = this.add.circle(
        this.centerX + Phaser.Math.Between(-30, 30),
        this.centerY + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(2, 6),
        color,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 300);

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(500, 1500),
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy()
      });
    }
  }

  private onDamageDealt(result: DamageResult): void {
    this.audioManager.playSound('damage');

    if (this.playedPlayerCard) {
      this.playedPlayerCard.updateHealthDisplay();
      this.showDamageNumber(
        this.playedPlayerCard.x,
        this.playedPlayerCard.y - 60,
        result.playerCardDamage,
        0xff4444
      );
      if (result.playerCardDestroyed) {
        this.audioManager.playSound('shatter');
        this.shatterCard(this.playedPlayerCard);
        this.playedPlayerCard = null;
      }
    }

    if (this.playedEnemyCard) {
      this.playedEnemyCard.updateHealthDisplay();
      this.showDamageNumber(
        this.playedEnemyCard.x,
        this.playedEnemyCard.y - 60,
        result.enemyCardDamage,
        0xff4444
      );
      if (result.enemyCardDestroyed) {
        this.audioManager.playSound('shatter');
        this.shatterCard(this.playedEnemyCard);
        this.playedEnemyCard = null;
      }
    }

    if (result.playerHeroDamage > 0) {
      this.showDamageNumber(this.centerX, BASE_HEIGHT - 60, result.playerHeroDamage, 0xff6644);
    }
    if (result.enemyHeroDamage > 0) {
      this.showDamageNumber(this.centerX, 60, result.enemyHeroDamage, 0xff6644);
    }

    this.updateHealthBars();

    this.time.delayedCall(1000, () => {
      this.cleanupPlayedCards();
    });
  }

  private showDamageNumber(x: number, y: number, damage: number, color: number): void {
    const text = this.add.text(x, y, `-${damage}`, {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '24px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    text.setScale(0.1);

    this.tweens.add({
      targets: text,
      scale: { from: 0.1, to: 1.5 },
      duration: 200,
      ease: 'Back.Out'
    });

    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.Out',
      delay: 300,
      onComplete: () => text.destroy()
    });

    this.tweens.add({
      targets: text,
      x: x + Phaser.Math.Between(-5, 5),
      duration: 50,
      yoyo: true,
      repeat: 5,
      ease: 'Linear'
    });
  }

  private shatterCard(card: CardComponent): void {
    const pieces: Phaser.GameObjects.Rectangle[] = [];
    const pieceColors = [0x2a1a4a, 0x9933cc, 0xffcc00];

    for (let i = 0; i < 20; i++) {
      const color = Phaser.Utils.Array.GetRandom(pieceColors);
      const piece = this.add.rectangle(
        card.x + Phaser.Math.Between(-30, 30),
        card.y + Phaser.Math.Between(-45, 45),
        Phaser.Math.Between(5, 15),
        Phaser.Math.Between(5, 15),
        color
      );
      piece.setAngle(Phaser.Math.Between(0, 360));
      pieces.push(piece);
    }

    card.destroy();

    pieces.forEach((piece) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 250);

      this.tweens.add({
        targets: piece,
        x: piece.x + Math.cos(angle) * speed,
        y: piece.y + Math.sin(angle) * speed,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Cubic.Out',
        onComplete: () => piece.destroy()
      });
    });
  }

  private cleanupPlayedCards(): void {
    if (this.playedPlayerCard) {
      this.playedPlayerCard.destroyCardWithAnimation();
      this.playedPlayerCard = null;
    }
    if (this.playedEnemyCard) {
      this.playedEnemyCard.destroyCardWithAnimation();
      this.playedEnemyCard = null;
    }
  }

  private updateHealthBars(): void {
    const state = this.battleManager.getState();

    if (this.playerHealthBar) {
      this.drawHealthBar(this.playerHealthBar, this.centerX - 150, BASE_HEIGHT - 45, 300, 20, state.playerHealth);
    }
    if (this.playerHealthText) {
      this.playerHealthText.setText(`${state.playerHealth} / ${MAX_HERO_HEALTH}`);
    }
    if (this.enemyHealthBar) {
      this.drawHealthBar(this.enemyHealthBar, this.centerX - 150, 25, 300, 20, state.enemyHealth);
    }
    if (this.enemyHealthText) {
      this.enemyHealthText.setText(`${state.enemyHealth} / ${MAX_HERO_HEALTH}`);
    }
  }

  private onTurnEnded(data: { turnCount: number }): void {
    this.isResolving = false;

    if (this.turnText) {
      this.turnText.setText(`第 ${data.turnCount} 回合`);
    }

    this.time.delayedCall(500, () => {
      this.refreshHands();
    });
  }

  private refreshHands(): void {
    this.clearHandCards();
    this.createPlayerHand();
    this.createEnemyHand();
    this.setupInputEvents();
  }

  private onGameOver(data: { winner: PlayerId }): void {
    this.isResolving = true;

    if (data.winner === 'player') {
      this.audioManager.playSound('victory');
    } else {
      this.audioManager.playSound('defeat');
    }

    this.time.delayedCall(1500, () => {
      this.showGameOverScreen(data.winner);
    });
  }

  private showGameOverScreen(winner: PlayerId): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    overlay.setDepth(2000);

    const resultText = winner === 'player' ? '胜利！' : '失败...';
    const textColor = winner === 'player' ? '#ffdd33' : '#ff4444';

    const title = this.add.text(this.centerX, this.centerY - 50, resultText, {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '48px',
      color: textColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    title.setDepth(2001);
    title.setScale(0);

    this.tweens.add({
      targets: title,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out'
    });

    this.spawnGoldParticles(this.centerX, this.centerY - 50);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x663399, 1);
    buttonBg.lineStyle(3, 0xffcc00, 1);
    buttonBg.fillRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
    buttonBg.strokeRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
    buttonBg.setDepth(2001);

    const buttonText = this.add.text(this.centerX, this.centerY + 55, '重新开始', {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    buttonText.setDepth(2002);

    const buttonHitArea = this.add.zone(this.centerX, this.centerY + 55, 160, 50);
    buttonHitArea.setInteractive({ useHandCursor: true });
    buttonHitArea.setDepth(2003);

    buttonHitArea.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x8844cc, 1);
      buttonBg.lineStyle(3, 0xffdd33, 1);
      buttonBg.fillRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
      buttonBg.strokeRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
    });

    buttonHitArea.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x663399, 1);
      buttonBg.lineStyle(3, 0xffcc00, 1);
      buttonBg.fillRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
      buttonBg.strokeRoundedRect(this.centerX - 80, this.centerY + 30, 160, 50, 8);
    });

    buttonHitArea.on('pointerdown', () => {
      this.battleManager.resetGame();
      this.scene.restart();
    });
  }

  private spawnGoldParticles(x: number, y: number): void {
    for (let i = 0; i < 60; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-50, 50),
        y + Phaser.Math.Between(0, 50),
        Phaser.Math.Between(2, 5),
        0xffdd33,
        1
      );
      particle.setDepth(2001);

      this.tweens.add({
        targets: particle,
        y: particle.y - Phaser.Math.Between(100, 250),
        x: particle.x + Phaser.Math.Between(-80, 80),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(1500, 2000),
        ease: 'Cubic.Out',
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => particle.destroy()
      });
    }
  }

  public update(time: number, delta: number): void {
    if (this.magicCircle) {
      this.magicCircle.update(time, delta);
    }

    const state = this.battleManager.getState();
    if (state.currentPhase === 'enemyTurn' && !this.isResolving && this.playedPlayerCard) {
      this.time.delayedCall(800, () => {
        if (state.currentPhase === 'enemyTurn' && !this.isResolving) {
          this.battleManager.enemyPlayRandomCard();
        }
      });
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.setupResponsiveCanvas();
  }
}
