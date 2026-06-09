import Phaser from 'phaser';
import { eventBus, UIUpdatePayload } from '../core/EventBus';
import { Elemental, ElementType, Skill } from '../entities/Elemental';

interface CharacterSprite {
  id: string;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  aura: Phaser.GameObjects.Arc;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  elemental: Elemental;
  targetable: boolean;
}

export class BattleScene extends Phaser.Scene {
  private characterSprites: Map<string, CharacterSprite> = new Map();
  private comboText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitterManager[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(): void {
    this.physics.world.setFPS(60);
    this.physics.world.setFixedDelta(16.67);
  }

  create(): void {
    this.createBackground();
    this.createComboDisplay();
    this.createMessageDisplay();
    this.setupEventListeners();
    eventBus.emit('battle:start');
  }

  private createBackground(): void {
    const { width, height } = this.scale;

    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bgGradient.fillRect(0, 0, width, height);

    const decorGraphics = this.add.graphics();
    decorGraphics.lineStyle(2, 0x6b3fa0, 0.3);
    for (let i = 0; i < 5; i++) {
      const y = (height / 6) * (i + 1);
      decorGraphics.beginPath();
      decorGraphics.moveTo(50, y);
      decorGraphics.lineTo(width - 50, y);
      decorGraphics.strokePath();
    }

    const centerLine = this.add.graphics();
    centerLine.lineStyle(3, 0x8b5cf6, 0.5);
    centerLine.beginPath();
    centerLine.moveTo(width / 2, 80);
    centerLine.lineTo(width / 2, height - 250);
    centerLine.strokePath();

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      this.add.circle(x, y, size, 0x8b5cf6, 0.3);
    }
  }

  private createComboDisplay(): void {
    const { width } = this.scale;
    this.comboText = this.add.text(width / 2, 50, '', {
      fontSize: '36px',
      fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
      fontStyle: 'bold'
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setVisible(false);
  }

  private createMessageDisplay(): void {
    const { width } = this.scale;
    this.messageText = this.add.text(width / 2, 100, '', {
      fontSize: '20px',
      fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
      color: '#e0d4f7'
    });
    this.messageText.setOrigin(0.5);
  }

  private setupEventListeners(): void {
    eventBus.on('ui:update', this.handleUIUpdate, this);
    eventBus.on('effect:play', this.playSkillEffect, this);
    eventBus.on('shake:screen', this.shakeScreen, this);
    eventBus.on('element:advantage', this.showElementAdvantage, this);
    eventBus.on('combo:trigger', this.updateComboDisplay, this);
  }

  public setupCharacters(playerTeam: Elemental[], enemyTeam: Elemental[]): void {
    const { width, height } = this.scale;
    const battleAreaY = height / 2 - 20;

    playerTeam.forEach((elemental, index) => {
      const x = width * 0.18 + index * (width * 0.1);
      const y = battleAreaY + (index === 1 ? -40 : 40);
      this.createCharacterSprite(elemental, x, y);
    });

    enemyTeam.forEach((elemental, index) => {
      const x = width * 0.82 - index * (width * 0.1);
      const y = battleAreaY + (index === 1 ? -40 : 40);
      this.createCharacterSprite(elemental, x, y);
    });
  }

  private createCharacterSprite(elemental: Elemental, x: number, y: number): void {
    const color = Phaser.Display.Color.HexStringToColor(Elemental.getElementColor(elemental.element)).color;

    const container = this.add.container(x, y);

    const aura = this.add.circle(0, 0, 60, color, 0.15);
    aura.setStrokeStyle(2, color, 0.5);
    container.add(aura);

    const body = this.add.circle(0, 0, 40, color, 0.9);
    body.setStrokeStyle(4, 0xffffff, 0.8);
    container.add(body);

    const elementIcon = this.add.text(0, 0, Elemental.getElementName(elemental.element), {
      fontSize: '24px',
      fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    elementIcon.setOrigin(0.5);
    container.add(elementIcon);

    const hpBarBg = this.add.rectangle(0, 55, 90, 10, 0x2a1a4a, 0.8);
    hpBarBg.setStrokeStyle(1, 0x8b5cf6, 0.5);
    container.add(hpBarBg);

    const hpBarFill = this.add.rectangle(-45, 55, 90, 10, 0x4ade80, 1);
    hpBarFill.setOrigin(0, 0.5);
    container.add(hpBarFill);

    const nameText = this.add.text(0, -60, elemental.name, {
      fontSize: '14px',
      fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
      color: '#e0d4f7',
      fontStyle: 'bold'
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    container.setSize(100, 120);
    container.setInteractive();

    container.on('pointerover', () => {
      if (this.characterSprites.get(elemental.id)?.targetable) {
        body.setScale(1.1);
        aura.setScale(1.2);
      }
    });

    container.on('pointerout', () => {
      body.setScale(1);
      aura.setScale(1);
    });

    container.on('pointerdown', () => {
      const sprite = this.characterSprites.get(elemental.id);
      if (sprite?.targetable && elemental.isAlive) {
        eventBus.emit('target:selected', elemental.id);
      }
    });

    this.characterSprites.set(elemental.id, {
      id: elemental.id,
      container,
      body,
      aura,
      hpBarBg,
      hpBarFill,
      nameText,
      elemental,
      targetable: false
    });
  }

  private handleUIUpdate(payload: UIUpdatePayload): void {
    this.updateHealthBars(payload.playerTeam, payload.enemyTeam);
    this.updateTargetable(payload.turnPhase, payload.currentActorId);
    this.updateMessage(payload.battleMessage);
  }

  private updateHealthBars(playerTeam: any[], enemyTeam: any[]): void {
    [...playerTeam, ...enemyTeam].forEach(char => {
      const sprite = this.characterSprites.get(char.id);
      if (!sprite) return;

      const targetWidth = 90 * char.hpPercentage;
      this.tweens.add({
        targets: sprite.hpBarFill,
        width: targetWidth,
        duration: 500,
        ease: 'Sine.easeInOut'
      });

      if (char.hpPercentage > 0.6) {
        sprite.hpBarFill.setFillStyle(0x4ade80);
      } else if (char.hpPercentage > 0.3) {
        sprite.hpBarFill.setFillStyle(0xfbbf24);
      } else {
        sprite.hpBarFill.setFillStyle(0xf87171);
      }

      if (!char.isAlive) {
        sprite.container.setAlpha(0.3);
        sprite.body.setTint(0x333333);
      }
    });
  }

  private updateTargetable(turnPhase: string, currentActorId: string | null): void {
    this.characterSprites.forEach((sprite, id) => {
      if (turnPhase === 'selecting' && currentActorId) {
        const actor = this.characterSprites.get(currentActorId);
        sprite.targetable = actor?.elemental.team !== sprite.elemental.team && sprite.elemental.isAlive;

        if (sprite.targetable) {
          sprite.aura.setStrokeStyle(3, 0xffd700, 1);
          sprite.body.setStrokeStyle(4, 0xffd700, 1);
        } else {
          const color = Phaser.Display.Color.HexStringToColor(
            Elemental.getElementColor(sprite.elemental.element)
          ).color;
          sprite.aura.setStrokeStyle(2, color, 0.5);
          sprite.body.setStrokeStyle(4, 0xffffff, 0.8);
        }
      } else {
        sprite.targetable = false;
        const color = Phaser.Display.Color.HexStringToColor(
          Elemental.getElementColor(sprite.elemental.element)
        ).color;
        sprite.aura.setStrokeStyle(2, color, 0.5);
        sprite.body.setStrokeStyle(4, 0xffffff, 0.8);
      }
    });
  }

  private updateMessage(message: string): void {
    if (this.messageText) {
      this.messageText.setText(message);
    }
  }

  private playSkillEffect(data: {
    attackerId: string;
    targetIds: string[];
    skill: Skill;
    attackerElement: ElementType;
  }): void {
    const attacker = this.characterSprites.get(data.attackerId);
    if (!attacker) return;

    this.tweens.add({
      targets: attacker.container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    data.targetIds.forEach(targetId => {
      const target = this.characterSprites.get(targetId);
      if (!target) return;

      this.time.delayedCall(200, () => {
        this.createElementEffect(
          target.container.x,
          target.container.y,
          data.skill.element || data.attackerElement
        );

        this.tweens.add({
          targets: target.container,
          x: target.container.x + 10,
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut'
        });
      });
    });
  }

  private createElementEffect(x: number, y: number, element: ElementType): void {
    const color = Phaser.Display.Color.HexStringToColor(Elemental.getElementColor(element)).color;
    let particleConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

    switch (element) {
      case 'fire':
        particleConfig = {
          x: 0,
          y: 0,
          speed: { min: 50, max: 150 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.6, end: 0 },
          lifespan: 600,
          quantity: 20,
          frequency: -1,
          tint: [0xff6b35, 0xffb347, 0xfff176],
          blendMode: 'ADD' as Phaser.BlendModes
        };
        break;
      case 'water':
        particleConfig = {
          x: 0,
          y: 0,
          speed: { min: 30, max: 100 },
          angle: { min: 180, max: 360 },
          scale: { start: 0.5, end: 0 },
          lifespan: 700,
          quantity: 20,
          frequency: -1,
          tint: [0x4fc3f7, 0x81d4fa, 0xb3e5fc],
          blendMode: 'ADD' as Phaser.BlendModes
        };
        break;
      case 'wind':
        particleConfig = {
          x: 0,
          y: 0,
          speed: { min: 80, max: 180 },
          angle: { min: -30, max: 30 },
          scale: { start: 0.4, end: 0 },
          lifespan: 500,
          quantity: 25,
          frequency: -1,
          tint: [0x81c784, 0xa5d6a7, 0xc8e6c9],
          blendMode: 'ADD' as Phaser.BlendModes
        };
        break;
    }

    const emitter = this.add.particles(x, y, null!, particleConfig);
    this.particles.push(emitter);
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  private shakeScreen(): void {
    this.cameras.main.shake(300, 0.01, false);
  }

  private showElementAdvantage(data: { targetId: string; attackerElement: ElementType; multiplier: number }): void {
    const target = this.characterSprites.get(data.targetId);
    if (!target || data.multiplier <= 1) return;

    const color = Phaser.Display.Color.HexStringToColor(Elemental.getElementColor(data.attackerElement)).color;

    const effectCircle = this.add.circle(
      target.container.x,
      target.container.y,
      70,
      color,
      0
    );
    effectCircle.setStrokeStyle(4, color, 0.8);

    this.tweens.add({
      targets: effectCircle,
      scale: { start: 0.5, to: 1.5 },
      alpha: { start: 0.8, to: 0 },
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => effectCircle.destroy()
    });
  }

  private updateComboDisplay(data: { comboCount: number }): void {
    if (!this.comboText) return;

    if (data.comboCount >= 2) {
      this.comboText.setVisible(true);
      this.comboText.setText(`${data.comboCount} 连击!`);
      this.comboText.setTint(0xffd700, 0xffa500, 0xffd700, 0xffa500);

      this.tweens.add({
        targets: this.comboText,
        scale: { start: 1, to: 1.3 },
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    } else {
      this.comboText.setVisible(false);
    }
  }

  public highlightActiveActor(actorId: string | null): void {
    this.characterSprites.forEach((sprite, id) => {
      if (id === actorId) {
        sprite.aura.setStrokeStyle(3, 0x00ff00, 1);
        sprite.aura.setAlpha(0.5);
        this.tweens.add({
          targets: sprite.aura,
          scale: { start: 1, to: 1.1 },
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        this.tweens.killTweensOf(sprite.aura);
        sprite.aura.setScale(1);
        sprite.aura.setAlpha(0.15);
        const color = Phaser.Display.Color.HexStringToColor(
          Elemental.getElementColor(sprite.elemental.element)
        ).color;
        sprite.aura.setStrokeStyle(2, color, 0.5);
      }
    });
  }

  public setAoeTargetable(isAoe: boolean): void {
    this.characterSprites.forEach(sprite => {
      if (isAoe && sprite.targetable) {
        sprite.body.setStrokeStyle(4, 0xff6b6b, 1);
      }
    });
  }
}
