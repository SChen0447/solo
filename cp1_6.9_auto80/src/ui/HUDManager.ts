export interface HUDData {
  depth: number;
  score: number;
  steamPressure: number;
  health: number;
}

export class HUDManager {
  private scene: Phaser.Scene;
  private hudContainer: Phaser.GameObjects.Container;
  private panelWidth: number = 200;
  private panelHeight: number = 280;

  private depthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private steamBar!: Phaser.GameObjects.Rectangle;
  private steamBarBg!: Phaser.GameObjects.Rectangle;
  private steamText!: Phaser.GameObjects.Text;
  private heartIcons: Phaser.GameObjects.Graphics[] = [];
  private pressureGauge!: Phaser.GameObjects.Graphics;
  private pressurePointer!: Phaser.GameObjects.Graphics;
  private gaugeLabel!: Phaser.GameObjects.Text;

  private maxHealth: number = 100;
  private currentHealth: number = 100;
  private currentPressure: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.hudContainer = this.scene.add.container(x, y);
    this.createHUD();
    this.handleResponsive();
  }

  private handleResponsive(): void {
    if (window.innerWidth < 800) {
      this.hudContainer.setScale(0.9);
    }

    this.scene.scale.on('resize', () => {
      if (window.innerWidth < 800) {
        this.hudContainer.setScale(0.9);
      } else {
        this.hudContainer.setScale(1);
      }
    });
  }

  private createHUD(): void {
    this.createPanel();
    this.createRivets();
    this.createDepthDisplay();
    this.createScoreDisplay();
    this.createSteamPressureBar();
    this.createGauge();
    this.createHealthDisplay();
    this.createTitle();
  }

  private createTitle(): void {
    const title = this.scene.add.text(0, -this.panelHeight / 2 + 15, '⚙ STATUS ⚙', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.hudContainer.add(title);
  }

  private createPanel(): void {
    const panel = this.scene.add.rectangle(
      0, 0,
      this.panelWidth, this.panelHeight,
      0x2C1810
    );
    panel.setStrokeStyle(4, 0xB87333);
    this.hudContainer.add(panel);

    const innerPanel = this.scene.add.rectangle(
      0, 0,
      this.panelWidth - 16, this.panelHeight - 16,
      0x3E2723
    );
    innerPanel.setStrokeStyle(2, 0x5D4037);
    this.hudContainer.add(innerPanel);
  }

  private createRivets(): void {
    const rivetPositions = [
      [-this.panelWidth / 2 + 12, -this.panelHeight / 2 + 12],
      [this.panelWidth / 2 - 12, -this.panelHeight / 2 + 12],
      [-this.panelWidth / 2 + 12, this.panelHeight / 2 - 12],
      [this.panelWidth / 2 - 12, this.panelHeight / 2 - 12]
    ];

    for (const [rx, ry] of rivetPositions) {
      const outer = this.scene.add.circle(rx, ry, 7, 0x5D4037);
      const inner = this.scene.add.circle(rx, ry, 4, 0xB87333);
      const center = this.scene.add.circle(rx + 1, ry + 1, 1, 0xD7CCC8);
      this.hudContainer.add([outer, inner, center]);
    }
  }

  private createDepthDisplay(): void {
    const y = -this.panelHeight / 2 + 50;

    const label = this.scene.add.text(-this.panelWidth / 2 + 20, y, '深度 DEPTH', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#B87333'
    });
    label.setOrigin(0, 0.5);

    this.depthText = this.scene.add.text(this.panelWidth / 2 - 20, y, '0 m', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    this.depthText.setOrigin(1, 0.5);

    this.hudContainer.add([label, this.depthText]);
  }

  private createScoreDisplay(): void {
    const y = -this.panelHeight / 2 + 80;

    const label = this.scene.add.text(-this.panelWidth / 2 + 20, y, '得分 SCORE', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#B87333'
    });
    label.setOrigin(0, 0.5);

    this.scoreText = this.scene.add.text(this.panelWidth / 2 - 20, y, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    this.scoreText.setOrigin(1, 0.5);

    this.hudContainer.add([label, this.scoreText]);
  }

  private createSteamPressureBar(): void {
    const y = -this.panelHeight / 2 + 115;

    const label = this.scene.add.text(0, y, '蒸汽压力 STEAM', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#B87333'
    });
    label.setOrigin(0.5);

    const barWidth = this.panelWidth - 40;
    const barHeight = 18;
    const barX = -barWidth / 2;
    const barY = y + 12;

    this.steamBarBg = this.scene.add.rectangle(
      barX + barWidth / 2, barY + barHeight / 2,
      barWidth, barHeight,
      0x1A0F0A
    );
    this.steamBarBg.setStrokeStyle(2, 0x5D4037);

    this.steamBar = this.scene.add.rectangle(
      barX + barWidth / 2, barY + barHeight / 2,
      barWidth, barHeight,
      0x4CAF50
    );
    this.steamBar.setOrigin(0, 0.5);
    this.steamBar.x = barX;

    this.steamText = this.scene.add.text(0, barY + barHeight / 2, '100%', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.steamText.setOrigin(0.5);

    this.hudContainer.add([label, this.steamBarBg, this.steamBar, this.steamText]);
  }

  private createGauge(): void {
    const cx = -40;
    const cy = 60;
    const radius = 35;

    const outerRing = this.scene.add.circle(cx, cy, radius, 0x1A0F0A);
    outerRing.setStrokeStyle(3, 0xB87333);

    const innerFace = this.scene.add.circle(cx, cy, radius - 5, 0x2C1810);
    innerFace.setStrokeStyle(1, 0x5D4037);

    this.pressureGauge = this.scene.add.graphics();
    this.drawGaugeTicks(cx, cy, radius - 8);

    this.pressurePointer = this.scene.add.graphics();
    this.drawPressurePointer(cx, cy, radius - 15, 0.5);

    this.gaugeLabel = this.scene.add.text(cx, cy + radius + 8, 'PRESSURE', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#8D6E63'
    });
    this.gaugeLabel.setOrigin(0.5);

    this.hudContainer.add([outerRing, innerFace, this.pressureGauge, this.pressurePointer, this.gaugeLabel]);
  }

  private drawGaugeTicks(cx: number, cy: number, radius: number): void {
    this.pressureGauge.clear();
    this.pressureGauge.lineStyle(1, 0xB87333);

    for (let i = 0; i <= 10; i++) {
      const angle = -Math.PI * 0.75 + (Math.PI * 1.5 * i) / 10;
      const innerR = i % 5 === 0 ? radius - 8 : radius - 4;

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;

      this.pressureGauge.lineBetween(x1, y1, x2, y2);
    }
  }

  private drawPressurePointer(cx: number, cy: number, length: number, value: number): void {
    this.pressurePointer.clear();
    this.pressurePointer.lineStyle(3, 0xFFD700);

    const angle = -Math.PI * 0.75 + (Math.PI * 1.5 * value);
    const endX = cx + Math.cos(angle) * length;
    const endY = cy + Math.sin(angle) * length;

    this.pressurePointer.lineBetween(cx, cy, endX, endY);

    const center = this.scene.add.circle(0, 0, 5, 0xB87333);
    center.setPosition(cx, cy);
    this.pressurePointer.fillStyle(0xB87333);
    this.pressurePointer.fillCircle(cx, cy, 5);
    this.pressurePointer.fillStyle(0xFFD700);
    this.pressurePointer.fillCircle(cx, cy, 2);
  }

  private createHealthDisplay(): void {
    const baseX = 30;
    const baseY = 45;

    const label = this.scene.add.text(baseX, baseY - 20, '生命 HP', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#B87333'
    });
    label.setOrigin(0, 0.5);

    for (let i = 0; i < 5; i++) {
      const heart = this.scene.add.graphics();
      this.drawHeart(heart, baseX + i * 28, baseY + 5, 10, true);
      this.heartIcons.push(heart);
      this.hudContainer.add(heart);
    }
  }

  private drawHeart(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    graphics.clear();

    const color = filled ? 0xE53935 : 0x5D4037;
    const stroke = filled ? 0xFF5252 : 0x3E2723;

    graphics.fillStyle(color);
    graphics.lineStyle(2, stroke);

    graphics.beginPath();
    graphics.moveTo(x, y + size * 0.3);
    graphics.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    graphics.bezierCurveTo(x - size, y + size * 0.6, x, y + size * 0.9, x, y + size);
    graphics.bezierCurveTo(x, y + size * 0.9, x + size, y + size * 0.6, x + size, y + size * 0.3);
    graphics.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  updateDepth(depth: number): void {
    if (this.depthText) {
      this.depthText.setText(`${Math.floor(depth)} m`);
    }
  }

  updateScore(score: number): void {
    if (this.scoreText) {
      this.scoreText.setText(`${score}`);
    }
  }

  updateSteamPressure(pressure: number): void {
    this.currentPressure = pressure;

    if (this.steamBar) {
      const maxWidth = this.panelWidth - 40;
      const width = (pressure / 100) * maxWidth;
      this.steamBar.width = Math.max(0, width);

      let color = 0x4CAF50;
      if (pressure < 30) {
        color = 0xF44336;
      } else if (pressure < 60) {
        color = 0xFFC107;
      }
      this.steamBar.setFillStyle(color);
    }

    if (this.steamText) {
      this.steamText.setText(`${Math.floor(pressure)}%`);
      if (pressure < 10) {
        this.steamText.setColor('#FF5252');
      } else {
        this.steamText.setColor('#FFFFFF');
      }
    }

    this.updateGaugePointer(pressure / 100);
  }

  private updateGaugePointer(value: number): void {
    if (this.pressurePointer) {
      const cx = -40;
      const cy = 60;
      const radius = 20;
      this.drawPressurePointer(cx, cy, radius, Phaser.Math.Clamp(value, 0, 1));
    }
  }

  updateHealth(health: number): void {
    this.currentHealth = health;
    const healthPerHeart = this.maxHealth / 5;
    const activeHearts = Math.ceil(health / healthPerHeart);

    for (let i = 0; i < 5; i++) {
      if (this.heartIcons[i]) {
        const baseX = 30 + i * 28;
        const baseY = 50;
        this.drawHeart(this.heartIcons[i], baseX, baseY, 10, i < activeHearts);
      }
    }
  }

  updateAll(data: HUDData): void {
    this.updateDepth(data.depth);
    this.updateScore(data.score);
    this.updateSteamPressure(data.steamPressure);
    this.updateHealth(data.health);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.hudContainer;
  }
}
