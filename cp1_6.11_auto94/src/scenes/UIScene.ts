import Phaser from 'phaser';
import { PlayScene } from './PlayScene';

const CREATURE_DISPLAY = [
  { type: 'clownfish', textureKey: 'clownfish', silhouetteKey: 'clownfish_silhouette', name: '小丑鱼' },
  { type: 'jellyfish', textureKey: 'jellyfish', silhouetteKey: 'jellyfish_silhouette', name: '水母' },
  { type: 'glowing_squid', textureKey: 'glowing_squid', silhouetteKey: 'glowing_squid_silhouette', name: '发光鱿鱼' },
  { type: 'anglerfish', textureKey: 'anglerfish', silhouetteKey: 'anglerfish_silhouette', name: '深海鮟鱇' },
  { type: 'sea_turtle', textureKey: 'sea_turtle', silhouetteKey: 'sea_turtle_silhouette', name: '海龟' },
];

export class UIScene extends Phaser.Scene {
  private oxygen: number = 100;
  private depthMeters: number = 0;
  private collected: string[] = [];
  private playScene!: PlayScene;

  private depthText!: Phaser.GameObjects.Text;
  private oxygenBarBg!: Phaser.GameObjects.Graphics;
  private oxygenBar!: Phaser.GameObjects.Graphics;
  private oxygenText!: Phaser.GameObjects.Text;
  private collectedIcons: Phaser.GameObjects.Image[] = [];
  private logIcon!: Phaser.GameObjects.Image;
  private logPanel!: Phaser.GameObjects.Container;
  private logDimmer!: Phaser.GameObjects.Rectangle;
  private isLogOpen: boolean = false;
  private logPanelY: number = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.depthText = this.add.text(20, 20, '深度: 0m', {
      fontSize: '18px',
      fontFamily: 'sans-serif',
      color: '#00d4ff',
      stroke: '#001122',
      strokeThickness: 3,
    }).setDepth(50).setScrollFactor(0);

    this.oxygenBarBg = this.add.graphics().setDepth(50).setScrollFactor(0);
    this.oxygenBar = this.add.graphics().setDepth(51).setScrollFactor(0);

    this.oxygenText = this.add.text(20, 48, '氧气: 100%', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#ffe4b5',
      stroke: '#001122',
      strokeThickness: 2,
    }).setDepth(50).setScrollFactor(0);

    this.logIcon = this.add.image(width - 40, height - 40, 'log_icon')
      .setDepth(55)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.logIcon.on('pointerover', () => {
      this.tweens.add({ targets: this.logIcon, scaleX: 1.1, scaleY: 1.1, duration: 200 });
    });
    this.logIcon.on('pointerout', () => {
      this.tweens.add({ targets: this.logIcon, scaleX: 1, scaleY: 1, duration: 200 });
    });
    this.logIcon.on('pointerdown', () => this.toggleLog());

    this.input.keyboard!.on('keydown-SPACE', () => this.toggleLog());

    this.logDimmer = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(90)
      .setScrollFactor(0)
      .setInteractive();

    this.logPanel = this.add.container(width / 2, height + height * 0.35 + 50)
      .setDepth(91)
      .setScrollFactor(0);

    this.buildLogPanel();

    this.playScene = this.scene.get('PlayScene') as PlayScene;
    this.playScene.events.on('oxygen-update', (oxygen: number) => {
      this.oxygen = oxygen;
    });
    this.playScene.events.on('depth-update', (depth: number) => {
      this.depthMeters = depth;
    });
    this.playScene.events.on('collected-update', (collected: string[]) => {
      this.collected = collected;
      this.updateCollectedIcons();
      this.updateLogPanel();
    });
  }

  update(): void {
    this.depthText.setText(`深度: ${this.depthMeters}m`);
    this.oxygenText.setText(`氧气: ${Math.ceil(this.oxygen)}%`);
    this.drawOxygenBar();
  }

  private drawOxygenBar(): void {
    const x = 20;
    const y = 66;
    const barWidth = 150;
    const barHeight = 10;

    this.oxygenBarBg.clear();
    this.oxygenBarBg.fillStyle(0x001122, 0.8);
    this.oxygenBarBg.fillRoundedRect(x, y, barWidth, barHeight, 3);
    this.oxygenBarBg.lineStyle(1, 0x00d4ff, 0.5);
    this.oxygenBarBg.strokeRoundedRect(x, y, barWidth, barHeight, 3);

    this.oxygenBar.clear();
    const fillWidth = Math.max(0, (this.oxygen / 100) * barWidth);
    let color = 0x00d4ff;
    if (this.oxygen < 30) color = 0xff4444;
    else if (this.oxygen < 60) color = 0xffaa44;
    this.oxygenBar.fillStyle(color, 0.9);
    this.oxygenBar.fillRoundedRect(x, y, fillWidth, barHeight, 3);
  }

  private updateCollectedIcons(): void {
    this.collectedIcons.forEach(ic => ic.destroy());
    this.collectedIcons = [];

    const startX = 20;
    const startY = 90;

    this.collected.forEach((type, i) => {
      const display = CREATURE_DISPLAY.find(c => c.type === type);
      if (!display) return;
      const icon = this.add.image(startX + i * 36, startY, display.textureKey)
        .setScale(0.8)
        .setDepth(50)
        .setScrollFactor(0);
      this.collectedIcons.push(icon);
    });
  }

  private toggleLog(): void {
    if (this.playScene.gameOver) return;
    this.isLogOpen = !this.isLogOpen;

    if (this.isLogOpen) {
      this.tweens.add({
        targets: this.logDimmer,
        alpha: 0.6,
        duration: 200,
      });
      this.tweens.add({
        targets: this.logPanel,
        y: this.scale.height * 0.5,
        duration: 250,
        ease: 'Sine.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.logDimmer,
        alpha: 0,
        duration: 200,
      });
      this.tweens.add({
        targets: this.logPanel,
        y: this.scale.height + this.scale.height * 0.35 + 50,
        duration: 250,
        ease: 'Sine.easeIn',
      });
    }
  }

  private buildLogPanel(): void {
    const { width, height } = this.scale;
    const panelW = width * 0.8;
    const panelH = height * 0.7;

    const bg = this.add.graphics();
    bg.fillStyle(0x001428, 0.85);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);
    bg.lineStyle(2, 0x00d4ff, 0.4);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);

    const title = this.add.text(0, -panelH / 2 + 30, '🔬 生物收集日志', {
      fontSize: '22px',
      fontFamily: 'sans-serif',
      color: '#00d4ff',
    }).setOrigin(0.5);

    const hint = this.add.text(0, -panelH / 2 + 55, '按空格键或点击图标关闭', {
      fontSize: '13px',
      fontFamily: 'sans-serif',
      color: '#4488aa',
    }).setOrigin(0.5);

    this.logPanel.add([bg, title, hint]);

    const cols = 4;
    const cellW = panelW / cols;
    const cellH = 100;
    const startY = -panelH / 2 + 80;

    CREATURE_DISPLAY.forEach((creature, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = -panelW / 2 + col * cellW + cellW / 2;
      const cy = startY + row * cellH + cellH / 2;

      const isCollected = this.collected.includes(creature.type);
      const texKey = isCollected ? creature.textureKey : creature.silhouetteKey;

      const icon = this.add.image(cx, cy - 12, texKey)
        .setScale(isCollected ? 1.2 : 1)
        .setAlpha(isCollected ? 1 : 0.5)
        .setName(`log_icon_${creature.type}`);

      const nameText = this.add.text(cx, cy + 22, creature.name, {
        fontSize: '13px',
        fontFamily: 'sans-serif',
        color: isCollected ? '#00d4ff' : '#446677',
      }).setOrigin(0.5).setName(`log_name_${creature.type}`);

      const desc = this.playScene ? (this.playScene.creatureDescs[creature.type] || '') : '';
      const descText = this.add.text(cx, cy + 40, isCollected ? desc : '???', {
        fontSize: '10px',
        fontFamily: 'sans-serif',
        color: isCollected ? '#88bbcc' : '#334455',
        wordWrap: { width: cellW - 10 },
        align: 'center',
      }).setOrigin(0.5).setName(`log_desc_${creature.type}`);

      this.logPanel.add([icon, nameText, descText]);
    });
  }

  private updateLogPanel(): void {
    CREATURE_DISPLAY.forEach(creature => {
      const isCollected = this.collected.includes(creature.type);
      const icon = this.logPanel.getByName(`log_icon_${creature.type}`) as Phaser.GameObjects.Image;
      const nameText = this.logPanel.getByName(`log_name_${creature.type}`) as Phaser.GameObjects.Text;
      const descText = this.logPanel.getByName(`log_desc_${creature.type}`) as Phaser.GameObjects.Text;

      if (icon) {
        icon.setTexture(isCollected ? creature.textureKey : creature.silhouetteKey);
        icon.setAlpha(isCollected ? 1 : 0.5);
        icon.setScale(isCollected ? 1.2 : 1);
      }
      if (nameText) {
        nameText.setColor(isCollected ? '#00d4ff' : '#446677');
      }
      if (descText) {
        const desc = this.playScene ? (this.playScene.creatureDescs[creature.type] || '') : '';
        descText.setText(isCollected ? desc : '???');
        descText.setColor(isCollected ? '#88bbcc' : '#334455');
      }
    });
  }
}
