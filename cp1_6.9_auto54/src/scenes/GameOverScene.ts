import Phaser from 'phaser';
import { ScoreEntry } from './StartScene';

export class GameOverScene extends Phaser.Scene {
  private resultData: { delivered: boolean; score: number; coins: number; timeLeft: number } | null = null;
  private scores: ScoreEntry[] = [];
  private readonly SCORE_KEY: string = 'space_delivery_scores';
  private playerName: string = '';
  private nameInput: HTMLInputElement | null = null;
  private nameDisplay: Phaser.GameObjects.Text | null = null;
  private nameSaved: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: any): void {
    this.resultData = {
      delivered: data.delivered || false,
      score: data.score || 0,
      coins: data.coins || 0,
      timeLeft: data.timeLeft || 0
    };
    this.playerName = '';
    this.nameSaved = false;
    this.loadScores();
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.addStarBackground();

    const titleText = this.resultData?.delivered ? 'DELIVERY COMPLETE!' : 'MISSION FAILED';
    const titleColor = this.resultData?.delivered ? '#00ff88' : '#ff4444';
    const titleStroke = this.resultData?.delivered ? '#004422' : '#440000';

    const title = this.add.text(width / 2, height * 0.12, titleText, {
      fontFamily: 'monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: titleColor,
      stroke: titleStroke,
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 0.8, to: 1.1 },
      scaleY: { from: 0.8, to: 1.1 },
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true
    });

    this.createScorePanel(width / 2, height * 0.35);
    this.createNameInput(width / 2, height * 0.58);
    this.createLeaderboard(width / 2, height * 0.78);
    this.createButtons(width / 2, height * 0.93);

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private addStarBackground(): void {
    const graphics = this.add.graphics();

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(1, 2);
      const brightness = Phaser.Math.Between(60, 200);

      graphics.fillStyle(Phaser.Display.Color.GetColor(brightness, brightness, brightness), 0.7);
      graphics.fillRect(x, y, size, size);
    }
  }

  private createScorePanel(x: number, y: number): void {
    const panelW = 320;
    const panelH = 140;
    const px = x - panelW / 2;
    const py = y - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.7);
    panel.lineStyle(3, 0x00ff88, 0.8);
    panel.fillRect(px, py, panelW, panelH);
    panel.strokeRect(px, py, panelW, panelH);

    const coinsScore = (this.resultData?.coins || 0) * 10;
    const timeBonus = this.resultData?.delivered ? (this.resultData?.timeLeft || 0) * 5 : 0;
    const totalScore = this.resultData?.score || 0;

    this.add.text(px + 20, py + 20, `COINS: ${this.resultData?.coins || 0} x 10`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd700',
      stroke: '#443300',
      strokeThickness: 2
    });

    this.add.text(px + panelW - 20, py + 20, `= ${coinsScore}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd700',
      stroke: '#443300',
      strokeThickness: 2
    }).setOrigin(1, 0);

    const timeColor = this.resultData?.delivered ? '#88ffaa' : '#888888';
    this.add.text(px + 20, py + 50, `TIME BONUS: ${this.resultData?.timeLeft || 0} x 5`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: timeColor,
      stroke: '#002211',
      strokeThickness: 2
    });

    this.add.text(px + panelW - 20, py + 50, `= ${timeBonus}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: timeColor,
      stroke: '#002211',
      strokeThickness: 2
    }).setOrigin(1, 0);

    const divider = this.add.graphics();
    divider.lineStyle(2, 0x00ff88, 0.6);
    divider.lineBetween(px + 20, py + 82, px + panelW - 20, py + 82);

    this.add.text(px + 20, py + 95, 'TOTAL SCORE', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    });

    this.add.text(px + panelW - 20, py + 95, totalScore.toString(), {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffff00',
      stroke: '#444400',
      strokeThickness: 3
    }).setOrigin(1, 0);
  }

  private createNameInput(x: number, y: number): void {
    const label = this.add.text(x - 120, y, 'ENTER NAME:', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 2
    }).setOrigin(0, 0.5);

    this.nameDisplay = this.add.text(x + 20, y, '___', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffff00',
      stroke: '#444400',
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    const saveBtn = this.add.text(x + 160, y, 'SAVE', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 2
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    saveBtn.on('pointerover', () => {
      saveBtn.setColor('#ffff00');
      this.tweens.add({ targets: saveBtn, scaleX: 1.1, scaleY: 1.1, duration: 100 });
    });
    saveBtn.on('pointerout', () => {
      saveBtn.setColor('#00ff88');
      this.tweens.add({ targets: saveBtn, scaleX: 1, scaleY: 1, duration: 100 });
    });
    saveBtn.on('pointerdown', () => {
      this.saveScore();
    });

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.nameSaved) return;

      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        this.updateNameDisplay();
      } else if (event.key === 'Enter') {
        this.saveScore();
      } else if (/^[A-Za-z]$/.test(event.key) && this.playerName.length < 3) {
        this.playerName += event.key.toUpperCase();
        this.updateNameDisplay();
      }
    });
  }

  private updateNameDisplay(): void {
    if (!this.nameDisplay) return;
    const display = this.playerName.padEnd(3, '_');
    this.nameDisplay.setText(display);
  }

  private saveScore(): void {
    if (this.nameSaved) return;
    if (this.playerName.length === 0) {
      this.playerName = 'AAA';
      this.updateNameDisplay();
    }

    this.nameSaved = true;

    const newEntry: ScoreEntry = {
      name: this.playerName,
      score: this.resultData?.score || 0
    };

    this.scores.push(newEntry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);

    try {
      localStorage.setItem(this.SCORE_KEY, JSON.stringify(this.scores));
    } catch (e) {}

    if (this.nameDisplay) {
      this.tweens.add({
        targets: this.nameDisplay,
        scaleX: { from: 1, to: 1.3 },
        scaleY: { from: 1, to: 1.3 },
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut'
      });
      this.nameDisplay.setColor('#00ff88');
    }

    this.refreshLeaderboard();
  }

  private refreshLeaderboard(): void {
    this.children.each((child) => {
      if ((child as Phaser.GameObjects.GameObject).name?.startsWith('lb_')) {
        child.destroy();
      }
    });
    this.createLeaderboard(this.scale.width / 2, this.scale.height * 0.78);
  }

  private createLeaderboard(x: number, y: number): void {
    const panelW = 360;
    const panelH = 120;
    const px = x - panelW / 2;
    const py = y - panelH / 2;

    const panel = this.add.graphics();
    panel.name = 'lb_panel';
    panel.fillStyle(0x000000, 0.7);
    panel.lineStyle(3, 0x00ff88, 0.8);
    panel.fillRect(px, py, panelW, panelH);
    panel.strokeRect(px, py, panelW, panelH);

    const title = this.add.text(x, py + 18, 'TOP 10', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 2
    }).setOrigin(0.5);
    title.name = 'lb_title';

    if (this.scores.length === 0) {
      const empty = this.add.text(x, py + panelH / 2, 'NO RECORDS', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#666666'
      }).setOrigin(0.5);
      empty.name = 'lb_empty';
      return;
    }

    const perRow = 5;
    for (let i = 0; i < Math.min(this.scores.length, 10); i++) {
      const entry = this.scores[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const itemX = px + 20 + col * (panelW / 2);
      const itemY = py + 40 + row * 16;

      let color = '#ffffff';
      if (i === 0) color = '#ffd700';
      else if (i === 1) color = '#c0c0c0';
      else if (i === 2) color = '#cd7f32';

      const t = this.add.text(itemX, itemY, `${i + 1}. ${entry.name}  ${entry.score}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: color,
        stroke: '#000000',
        strokeThickness: 1
      });
      t.name = `lb_row_${i}`;
    }
  }

  private createButtons(x: number, y: number): void {
    const retryBtn = this.add.text(x - 80, y, 'RETRY', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => {
      retryBtn.setColor('#ffff00');
      this.tweens.add({ targets: retryBtn, scaleX: 1.2, scaleY: 1.2, duration: 150, ease: 'Back.easeOut' });
    });
    retryBtn.on('pointerout', () => {
      retryBtn.setColor('#00ff88');
      this.tweens.add({ targets: retryBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });
    retryBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    const menuBtn = this.add.text(x + 80, y, 'MENU', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => {
      menuBtn.setColor('#ffff00');
      this.tweens.add({ targets: menuBtn, scaleX: 1.2, scaleY: 1.2, duration: 150, ease: 'Back.easeOut' });
    });
    menuBtn.on('pointerout', () => {
      menuBtn.setColor('#00ff88');
      this.tweens.add({ targets: menuBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('StartScene');
      });
    });
  }

  private loadScores(): void {
    try {
      const stored = localStorage.getItem(this.SCORE_KEY);
      if (stored) {
        this.scores = JSON.parse(stored);
      }
    } catch (e) {
      this.scores = [];
    }
  }
}
