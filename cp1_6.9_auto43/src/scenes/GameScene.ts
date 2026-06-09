import Phaser from 'phaser';

interface Card {
  id: number;
  drinkKey: string;
  sprite: Phaser.GameObjects.Image;
  iconSprite: Phaser.GameObjects.Image;
  container: Phaser.GameObjects.Container;
  isFlipped: boolean;
  isMatched: boolean;
}

export default class GameScene extends Phaser.Scene {
  private static readonly CARD_WIDTH = 120;
  private static readonly CARD_HEIGHT = 160;
  private static readonly CARD_SPACING = 12;
  private static readonly GRID_COLS = 4;
  private static readonly INITIAL_LIVES = 5;
  private static readonly INITIAL_TIME = 90;
  private static readonly DRINKS = ['martini', 'beer', 'wine', 'cocktail', 'whiskey', 'juice', 'coffee', 'soda'];

  private cards: Card[] = [];
  private flippedCards: Card[] = [];
  private isProcessing: boolean = false;

  private score: number = 0;
  private lives: number = GameScene.INITIAL_LIVES;
  private timeRemaining: number = GameScene.INITIAL_TIME;
  private combo: number = 0;
  private matchedPairs: number = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private edgeFlash!: Phaser.GameObjects.Graphics;
  private timerEvent!: Phaser.Time.TimerEvent;
  private startTime!: number;

  private ambientLights!: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000);
    this.createBackground();
    this.createUI();
    this.createAmbientLights();
    this.createCards();
    this.startTimer();
    this.startTime = this.time.now;
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();

    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.floor(0x2c + (0x4a - 0x2c) * t);
      const g = Math.floor(0x18 + (0x1a - 0x18) * t);
      const b = Math.floor(0x10 + (0x1a - 0x10) * t);
      const color = Phaser.Display.Color.GetColor(r, g, b);
      const radius = Math.max(width, height) * (1 - t * 0.5);
      bg.fillStyle(color, 0.08);
      bg.fillCircle(width / 2, height / 2, radius);
    }

    bg.setDepth(-10);
  }

  private createUI(): void {
    const { width } = this.cameras.main;

    this.timeText = this.add.text(width / 2, 50, this.formatTime(this.timeRemaining), {
      fontFamily: 'Georgia',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width - 40, 50, `得分: ${this.score}`, {
      fontFamily: 'Georgia',
      fontSize: '24px',
      color: '#d4a85a'
    }).setOrigin(1, 0.5);

    for (let i = 0; i < GameScene.INITIAL_LIVES; i++) {
      const heart = this.add.image(30 + i * 38, 50, 'heart').setScale(0.9);
      this.hearts.push(heart);
    }

    this.edgeFlash = this.add.graphics();
    this.edgeFlash.setDepth(100);
  }

  private createAmbientLights(): void {
    const { width, height } = this.cameras.main;
    this.ambientLights = this.add.container(0, height - 20);
    this.ambientLights.setDepth(50);

    const colors = [0xffbf5f, 0xff8c42, 0xff5c8a, 0xff3e7f, 0xc2185b, 0x880e4f, 0xff5c8a, 0xff8c42];
    const dotCount = Math.ceil(width / 50);

    for (let i = 0; i < dotCount; i++) {
      const color = colors[i % colors.length];
      const dot = this.add.circle(25 + i * 50, 0, 8, color, 0.8);
      this.ambientLights.add(dot);

      const offset = i % 2 === 0 ? 0 : 400;
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.2, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        delay: offset,
        ease: 'Quad.easeInOut'
      });
    }
  }

  private createCards(): void {
    const { width } = this.cameras.main;
    const drinkPairs = this.shuffleDrinks();

    const totalWidth = GameScene.GRID_COLS * GameScene.CARD_WIDTH + (GameScene.GRID_COLS - 1) * GameScene.CARD_SPACING;
    const startX = (width - totalWidth) / 2 + GameScene.CARD_WIDTH / 2;
    const startY = 140 + GameScene.CARD_HEIGHT / 2;

    for (let i = 0; i < 16; i++) {
      const col = i % GameScene.GRID_COLS;
      const row = Math.floor(i / GameScene.GRID_COLS);
      const x = startX + col * (GameScene.CARD_WIDTH + GameScene.CARD_SPACING);
      const y = startY + row * (GameScene.CARD_HEIGHT + GameScene.CARD_SPACING);

      const backSprite = this.add.image(0, 0, 'cardBack');
      const frontSprite = this.add.image(0, 0, 'cardFront');
      const iconSprite = this.add.image(0, 0, drinkPairs[i]).setScale(1.1);

      frontSprite.setVisible(false);
      iconSprite.setVisible(false);

      const container = this.add.container(x, y, [backSprite, frontSprite, iconSprite]);
      container.setSize(GameScene.CARD_WIDTH, GameScene.CARD_HEIGHT);
      container.setInteractive({ useHandCursor: true });

      const card: Card = {
        id: i,
        drinkKey: drinkPairs[i],
        sprite: backSprite,
        iconSprite: iconSprite,
        container: container,
        isFlipped: false,
        isMatched: false
      };

      container.on('pointerdown', () => this.onCardClick(card));
      this.cards.push(card);
    }
  }

  private shuffleDrinks(): string[] {
    const pairs: string[] = [];
    GameScene.DRINKS.forEach(drink => {
      pairs.push(drink, drink);
    });

    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    return pairs;
  }

  private onCardClick(card: Card): void {
    if (this.isProcessing || card.isFlipped || card.isMatched) {
      return;
    }

    this.flipCard(card);

    if (this.flippedCards.length === 2) {
      this.checkMatch();
    }
  }

  private flipCard(card: Card): void {
    card.isFlipped = true;
    this.flippedCards.push(card);

    const children = card.container.list as Phaser.GameObjects.Image[];
    const backSprite = children[0];
    const frontSprite = children[1];
    const iconSprite = children[2];

    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        backSprite.setVisible(false);
        frontSprite.setVisible(true);
        iconSprite.setVisible(true);

        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          duration: 150,
          ease: 'Quad.easeOut'
        });
      }
    });
  }

  private unflipCard(card: Card, delay: number = 0): void {
    this.time.delayedCall(delay, () => {
      const children = card.container.list as Phaser.GameObjects.Image[];
      const backSprite = children[0];
      const frontSprite = children[1];
      const iconSprite = children[2];

      this.tweens.add({
        targets: card.container,
        scaleX: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          frontSprite.setVisible(false);
          iconSprite.setVisible(false);
          backSprite.setVisible(true);
          card.isFlipped = false;

          this.tweens.add({
            targets: card.container,
            scaleX: 1,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.flippedCards.includes(card)) {
                this.flippedCards = this.flippedCards.filter(c => c.id !== card.id);
              }
            }
          });
        }
      });
    });
  }

  private checkMatch(): void {
    this.isProcessing = true;
    const [card1, card2] = this.flippedCards;

    if (card1.drinkKey === card2.drinkKey) {
      this.handleMatch(card1, card2);
    } else {
      this.handleMismatch(card1, card2);
    }
  }

  private handleMatch(card1: Card, card2: Card): void {
    this.combo++;
    const comboBonus = Math.min(this.combo * 5, 50);
    const points = 10 + comboBonus;
    this.score += points;
    this.matchedPairs++;
    this.updateScore();

    this.spawnGlowParticles(card1.container.x, card1.container.y);
    this.spawnGlowParticles(card2.container.x, card2.container.y);

    [card1, card2].forEach(card => {
      const children = card.container.list as Phaser.GameObjects.Image[];
      children[1].setTint(0x00ff00);
      card.iconSprite.setTint(0x00ff00);

      this.tweens.add({
        targets: card.container,
        alpha: 0,
        y: card.container.y - 40,
        scale: 0.3,
        duration: 600,
        delay: 500,
        ease: 'Quad.easeIn',
        onComplete: () => {
          card.container.destroy();
          card.isMatched = true;
        }
      });
    });

    this.time.delayedCall(600, () => {
      this.flippedCards = [];
      this.isProcessing = false;

      if (this.matchedPairs === 8) {
        this.endGame(true);
      }
    });
  }

  private handleMismatch(card1: Card, card2: Card): void {
    this.combo = 0;
    this.lives--;
    this.updateHearts();
    this.flashEdgeRed();

    [card1, card2].forEach(card => {
      const origX = card.container.x;
      this.tweens.add({
        targets: card.container,
        x: [origX, origX - 5, origX + 5, origX - 5, origX + 5, origX],
        duration: 200,
        ease: 'Linear'
      });
    });

    this.unflipCard(card1, 300);
    this.unflipCard(card2, 300);

    this.time.delayedCall(800, () => {
      this.isProcessing = false;

      if (this.lives <= 0) {
        this.endGame(false);
      }
    });
  }

  private spawnGlowParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const distance = Phaser.Math.Between(30, 80);
      const tx = x + Math.cos(angle) * distance;
      const ty = y + Math.sin(angle) * distance;

      const particle = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0x00ff66, 0.9);
      particle.setDepth(60);

      this.tweens.add({
        targets: particle,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private flashEdgeRed(): void {
    const { width, height } = this.cameras.main;
    this.edgeFlash.clear();
    this.edgeFlash.fillStyle(0xff0000, 0.5);
    this.edgeFlash.fillRect(0, 0, width, 15);
    this.edgeFlash.fillRect(0, height - 15, width, 15);
    this.edgeFlash.fillRect(0, 0, 15, height);
    this.edgeFlash.fillRect(width - 15, 0, 15, height);

    this.tweens.add({
      targets: this.edgeFlash,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => this.edgeFlash.clear()
    });
  }

  private updateScore(): void {
    this.scoreText.setText(`得分: ${this.score}`);
  }

  private updateHearts(): void {
    this.hearts.forEach((heart, i) => {
      if (i < this.lives) {
        heart.setAlpha(1);
      } else {
        heart.setAlpha(0.2);
      }
    });
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeRemaining--;
        this.updateTimeDisplay();

        if (this.timeRemaining <= 0) {
          this.endGame(false);
        }
      }
    });
  }

  private updateTimeDisplay(): void {
    this.timeText.setText(this.formatTime(this.timeRemaining));

    if (this.timeRemaining <= 20 && this.timeRemaining > 10) {
      this.timeText.setColor('#ff3333');
      if (!this.timeText.getData('shakeActive')) {
        this.timeText.setData('shakeActive', true);
        const origX = this.timeText.x;
        this.tweens.add({
          targets: this.timeText,
          x: [origX, origX - 3, origX + 3, origX],
          duration: 1000,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else if (this.timeRemaining <= 10) {
      this.timeText.setColor('#ff3333');
      if (!this.timeText.getData('pulseActive')) {
        this.timeText.setData('pulseActive', true);
        this.tweens.add({
          targets: this.timeText,
          scale: { from: 1, to: 1.2 },
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Quad.easeInOut'
        });
      }
    }
  }

  private formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  private endGame(victory: boolean): void {
    this.timerEvent?.remove(false);
    const usedTime = GameScene.INITIAL_TIME - this.timeRemaining;

    this.time.delayedCall(500, () => {
      this.scene.start('ResultScene', {
        score: this.score,
        time: usedTime,
        victory: victory
      });
    });
  }
}
