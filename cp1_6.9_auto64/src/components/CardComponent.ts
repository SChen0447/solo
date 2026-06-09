import * as Phaser from 'phaser';
import { CardInstance, ElementColors, ElementNames } from '../managers/CardDataManager';

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 120;

export class CardComponent extends Phaser.GameObjects.Container {
  private cardData: CardInstance;
  private background: Phaser.GameObjects.Graphics;
  private elementCircle: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private elementText: Phaser.GameObjects.Text;
  private attackText: Phaser.GameObjects.Text;
  private healthText: Phaser.GameObjects.Text;
  private glowEffect: Phaser.GameObjects.Graphics;
  private isBack: boolean;
  private backPattern: Phaser.GameObjects.Graphics | null = null;
  private originalScale: number = 1;
  private originalAngle: number = 0;
  public isDragging: boolean = false;
  public originalX: number = 0;
  public originalY: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardData: CardInstance,
    isBack: boolean = false
  ) {
    super(scene, x, y);
    this.cardData = cardData;
    this.isBack = isBack;
    this.setSize(CARD_WIDTH, CARD_HEIGHT);

    this.background = scene.add.graphics();
    this.elementCircle = scene.add.graphics();
    this.glowEffect = scene.add.graphics();
    this.nameText = scene.add.text(0, -30, '', {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '10px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.elementText = scene.add.text(0, 5, '', {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.attackText = scene.add.text(-25, 45, '', {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '14px',
      color: '#ff6644',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.healthText = scene.add.text(25, 45, '', {
      fontFamily: "'Cinzel Decorative', cursive",
      fontSize: '14px',
      color: '#44ff44',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add([this.glowEffect, this.background, this.elementCircle, this.nameText, this.elementText, this.attackText, this.healthText]);

    this.drawCard();
    this.setInteractive(new Phaser.Geom.Rectangle(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT), Phaser.Geom.Rectangle.Contains);

    scene.add.existing(this);
  }

  private drawCard(): void {
    this.glowEffect.clear();
    this.background.clear();
    this.elementCircle.clear();

    if (this.isBack) {
      this.drawCardBack();
    } else {
      this.drawCardFront();
    }
  }

  private drawCardBack(): void {
    this.background.fillStyle(0x1a0a2e, 1);
    this.background.lineStyle(3, 0x8b4513, 1);
    this.background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    this.background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);

    if (!this.backPattern) {
      this.backPattern = this.scene.add.graphics();
      this.addAt(this.backPattern, 2);
    }
    this.backPattern.clear();

    const cx = 0;
    const cy = 0;
    const outerR = 45;
    const innerR = 25;

    this.backPattern.lineStyle(2, 0x9933cc, 0.8);
    this.backPattern.strokeCircle(cx, cy, outerR);
    this.backPattern.strokeCircle(cx, cy, innerR);

    this.backPattern.lineStyle(1, 0xffcc00, 0.6);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;
      this.backPattern.lineBetween(x1, y1, x2, y2);
    }

    this.backPattern.fillStyle(0xffcc00, 0.8);
    this.backPattern.fillCircle(cx, cy, 8);

    this.nameText.setText('');
    this.elementText.setText('');
    this.attackText.setText('');
    this.healthText.setText('');
  }

  private drawCardFront(): void {
    if (this.backPattern) {
      this.backPattern.clear();
    }

    this.background.fillStyle(0x2a1a4a, 1);
    this.background.lineStyle(3, ElementColors[this.cardData.element], 1);
    this.background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    this.background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);

    this.background.lineStyle(1, 0xffffff, 0.2);
    this.background.strokeRoundedRect(-CARD_WIDTH / 2 + 4, -CARD_HEIGHT / 2 + 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 6);

    this.elementCircle.fillStyle(ElementColors[this.cardData.element], 1);
    this.elementCircle.fillCircle(0, 5, 20);
    this.elementCircle.lineStyle(2, 0xffffff, 0.8);
    this.elementCircle.strokeCircle(0, 5, 20);

    this.elementText.setText(ElementNames[this.cardData.element]);

    this.nameText.setText(this.cardData.name);
    this.nameText.setColor('#ffffff');

    this.attackText.setText(`⚔${this.cardData.attack}`);
    this.healthText.setText(`❤${this.cardData.currentHealth}`);
  }

  public setSelected(selected: boolean): void {
    this.glowEffect.clear();
    if (selected) {
      this.glowEffect.lineStyle(4, 0x66aaff, 0.8);
      this.glowEffect.strokeRoundedRect(-CARD_WIDTH / 2 - 4, -CARD_HEIGHT / 2 - 4, CARD_WIDTH + 8, CARD_HEIGHT + 8, 10);

      this.glowEffect.lineStyle(2, 0xaaddff, 0.5);
      this.glowEffect.strokeRoundedRect(-CARD_WIDTH / 2 - 8, -CARD_HEIGHT / 2 - 8, CARD_WIDTH + 16, CARD_HEIGHT + 16, 12);
    }
  }

  public updateHealthDisplay(): void {
    if (!this.isBack) {
      this.healthText.setText(`❤${this.cardData.currentHealth}`);
    }
  }

  public setOriginalPosition(x: number, y: number): void {
    this.originalX = x;
    this.originalY = y;
  }

  public returnToOriginal(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: this.originalX,
        y: this.originalY,
        scale: this.originalScale,
        angle: this.originalAngle,
        duration: duration,
        ease: 'Elastic.Out',
        easeParams: [1.2, 0.5],
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  public getCardData(): CardInstance {
    return this.cardData;
  }

  public setCardScale(scale: number): void {
    this.originalScale = scale;
    this.setScale(scale);
  }

  public setCardAngle(angle: number): void {
    this.originalAngle = angle;
    this.setAngle(angle);
  }

  public destroyCardWithAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scale: 0,
        alpha: 0,
        angle: 180,
        duration: 300,
        ease: 'Cubic.In',
        onComplete: () => {
          this.destroy();
          resolve();
        }
      });
    });
  }
}
