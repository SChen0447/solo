import Phaser from 'phaser';
import { Slingshot, LaunchData } from '../objects/Slingshot';

export class GameScene extends Phaser.Scene {
  private slingshot!: Slingshot;
  private ball!: Phaser.Physics.Matter.Image | null;
  private bricks: Phaser.Physics.Matter.Image[] = [];
  private score: number = 0;
  private level: number = 1;
  private ballsLeft: number = 10;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private ballsLeftText!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private isGameOver: boolean = false;
  private ballRespawnTimer: number = 0;
  private waitingForRespawn: boolean = false;
  private brickParticlePool: any = null;
  private borderColor: number = 0xff4444;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private domeGraphics!: Phaser.GameObjects.Graphics;
  private colorStart: Phaser.Display.Color = Phaser.Display.Color.HexStringToColor('#FF4444');
  private colorEnd: Phaser.Display.Color = Phaser.Display.Color.HexStringToColor('#4444FF');
  private cameraShakeTime: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.createBackground();
    this.createBorder();
    this.createDome();
    this.createHUD();

    this.slingshot = new Slingshot(this, 400, 560);
    this.slingshot.onLaunch((data: LaunchData) => this.handleLaunch(data));

    this.matter.world.setBounds(0, 0, 800, 700, 64, true, true, true, false);
    this.matter.world.engine.positionIterations = 8;
    this.matter.world.engine.velocityIterations = 6;
    (this.matter.world.engine as any).enableSleeping = false;

    this.generateBricks();
    this.createBall();

    this.brickParticlePool = this.add.particles(0, 0, '');
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1f, 1);
    bg.fillRect(0, 0, 800, 700);
    bg.setDepth(-10);

    const radialBg = this.add.graphics();
    radialBg.fillGradientStyle(
      0x1a1a3e, 0x0d0d2b, 0x0d0d2b, 0x050510,
      1, 1, 1, 1
    );
    radialBg.fillEllipse(400, 350, 800, 700);
    radialBg.setDepth(-9);
  }

  private createBorder(): void {
    this.borderGraphics = this.add.graphics();
    this.updateBorder();
  }

  private updateBorder(): void {
    this.borderGraphics.clear();
    this.borderGraphics.lineStyle(2, this.borderColor, 0.8);
    this.borderGraphics.strokeRoundedRect(4, 4, 792, 692, 4);

    this.borderGraphics.lineStyle(1, this.borderColor, 0.4);
    this.borderGraphics.strokeRoundedRect(2, 2, 796, 696, 4);
  }

  private createDome(): void {
    this.domeGraphics = this.add.graphics();
    this.domeGraphics.fillStyle(0x4466aa, 0.08);
    this.domeGraphics.beginPath();
    this.domeGraphics.arc(400, 120, 350, Math.PI, 0);
    this.domeGraphics.lineTo(750, 120);
    this.domeGraphics.lineTo(50, 120);
    this.domeGraphics.closePath();
    this.domeGraphics.fillPath();

    this.domeGraphics.lineStyle(1, 0x88aaff, 0.15);
    this.domeGraphics.beginPath();
    this.domeGraphics.arc(400, 120, 350, Math.PI, 0);
    this.domeGraphics.strokePath();
  }

  private createHUD(): void {
    this.scoreText = this.add.text(25, 25, '0', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 0.5
    });
    this.scoreText.setShadow(0, 0, '#6699ff', 3, false, true);
    this.scoreText.setDepth(100);

    this.levelText = this.add.text(775, 25, '第1关', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setShadow(0, 0, '#6699ff', 3, false, true);
    this.levelText.setDepth(100);

    this.ballsLeftText = this.add.text(400, 665, '', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.ballsLeftText.setOrigin(0.5, 0.5);
    this.ballsLeftText.setShadow(0, 0, '#ffffff', 3, false, true);
    this.ballsLeftText.setDepth(100);
    this.updateBallsLeftText();
  }

  private updateBallsLeftText(): void {
    const dots = Math.min(this.ballsLeft, 5);
    let str = '';
    for (let i = 0; i < dots; i++) {
      str += '●';
    }
    if (this.ballsLeft > 5) {
      str += ` ${this.ballsLeft}`;
    } else {
      str += ` ${this.ballsLeft}`;
    }
    this.ballsLeftText.setText(str);
  }

  private generateGradientColor(row: number, totalRows: number): number {
    const t = row / (totalRows - 1);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      this.colorStart,
      this.colorEnd,
      100,
      Math.floor(t * 100)
    );
    return Phaser.Display.Color.GetColor(color.r, color.g, color.b);
  }

  private randomizeGradientColors(): void {
    const warmColors = [
      '#FF4444', '#FF6B35', '#FFD23F', '#FF8C42', '#E63946',
      '#F77F00', '#FCBF49', '#EF476F', '#FF6B9D', '#FF5E5B'
    ];
    const coolColors = [
      '#4444FF', '#00B4D8', '#48CAE4', '#3A86FF', '#8338EC',
      '#3A0CA3', '#06D6A0', '#118AB2', '#073B4C', '#560BAD'
    ];

    const warmHex = Phaser.Utils.Array.GetRandom(warmColors);
    const coolHex = Phaser.Utils.Array.GetRandom(coolColors);

    this.colorStart = Phaser.Display.Color.HexStringToColor(warmHex);
    this.colorEnd = Phaser.Display.Color.HexStringToColor(coolHex);
    this.borderColor = Phaser.Display.Color.HexStringToColor(warmHex).color;
    this.updateBorder();
  }

  private generateBricks(): void {
    this.bricks.forEach(b => b.destroy());
    this.bricks = [];

    const brickWidth = 80;
    const brickHeight = 30;
    const rows = 5;
    const startX = 80;
    const startY = 80;
    const gapX = 5;
    const gapY = 5;

    for (let row = 0; row < rows; row++) {
      const cols = 8 - row;
      const offsetX = (row * (brickWidth + gapX)) / 2;

      for (let col = 0; col < cols; col++) {
        const x = startX + offsetX + col * (brickWidth + gapX);
        const y = startY + row * (brickHeight + gapY);
        const color = this.generateGradientColor(row, rows);

        const brick = this.createBrick(x, y, brickWidth, brickHeight, color);
        this.bricks.push(brick);
      }
    }
  }

  private createBrick(x: number, y: number, w: number, h: number, color: number): Phaser.Physics.Matter.Image {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 2);
    g.lineStyle(1, 0x111111, 1);
    g.strokeRoundedRect(0, 0, w, h, 2);

    const textureKey = `brick_${color}_${Phaser.Math.Between(0, 99999)}`;
    g.generateTexture(textureKey, w, h);
    g.destroy();

    const brick = this.matter.add.image(x + w / 2, y + h / 2, textureKey, undefined, {
      restitution: 0.2,
      friction: 0.3,
      frictionAir: 0.01,
      density: 0.002,
      chamfer: { radius: 2 }
    });

    brick.setData('color', color);
    brick.setData('isBrick', true);
    brick.setFixedRotation();

    brick.setOnCollide((pair: { bodyA: any; bodyB: any }) => {
      const otherBody = pair.bodyA === brick.body ? pair.bodyB : pair.bodyA;
      if (otherBody && otherBody.gameObject && otherBody.gameObject.getData && otherBody.gameObject.getData('isBall')) {
        this.onBrickHit(brick, otherBody.gameObject);
      }
    });

    return brick;
  }

  private onBrickHit(brick: Phaser.Physics.Matter.Image, ball: Phaser.Physics.Matter.Image): void {
    const color = brick.getData('color') as number;
    this.spawnBrickParticles(brick.x, brick.y, color);

    if (!brick.getData('scored')) {
      brick.setData('scored', true);
      this.score += 10;
      this.scoreText.setText(this.score.toString());
    }

    this.time.delayedCall(100, () => {
      this.checkLevelComplete();
    });
  }

  private spawnBrickParticles(x: number, y: number, color: number): void {
    const colorObj = Phaser.Display.Color.IntegerToColor(color);

    for (let i = 0; i < 6; i++) {
      const particle = this.add.rectangle(x, y, 6, 6, color);
      particle.setDepth(50);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(2, 6);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * 20,
        y: y + Math.sin(angle) * speed * 20 + 30,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        angle: Phaser.Math.Between(-180, 180),
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private createBall(): void {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }

    const g = this.add.graphics();
    const radius = 12;

    g.fillGradientStyle(
      0xff6666, 0xff3333, 0xcc0000, 0x990000,
      1, 1, 1, 1
    );
    g.fillCircle(radius, radius, radius);

    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(radius - 4, radius - 4, 3);

    const textureKey = `ball_${Phaser.Math.Between(0, 99999)}`;
    g.generateTexture(textureKey, radius * 2, radius * 2);
    g.destroy();

    const slingshotBallX = this.slingshot.baseX;
    const slingshotBallY = this.slingshot.baseY - 25;

    this.ball = this.matter.add.image(slingshotBallX, slingshotBallY, textureKey, undefined, {
      restitution: 0.4,
      friction: 0.01,
      frictionAir: 0.005,
      density: 0.001,
      circleRadius: radius
    });

    this.ball.setData('isBall', true);
    this.ball.setData('launched', false);
    this.ball.setStatic(true);
    this.ball.setDepth(10);
  }

  private handleLaunch(data: LaunchData): void {
    if (!this.ball || this.ballsLeft <= 0 || this.isGameOver || this.waitingForRespawn) return;

    this.cameras.main.shake(100, 0.007);

    this.ball.setStatic(false);
    this.ball.setPosition(data.x, data.y);
    this.ball.setVelocity(data.vx * 30, data.vy * 30);
    this.ball.setData('launched', true);

    this.ballsLeft--;
    this.updateBallsLeftText();
    this.slingshot.setCanDrag(false);
    this.waitingForRespawn = true;
    this.ballRespawnTimer = 0;

    this.time.delayedCall(800, () => {
      if (this.ball && this.ball.active) {
        if (this.ball.y > 620) {
          this.respawnBall();
        }
      }
    });
  }

  private respawnBall(): void {
    if (this.isGameOver) return;

    if (this.ballsLeft <= 0) {
      this.checkGameOver();
      return;
    }

    this.createBall();
    this.slingshot.setCanDrag(true);
    this.slingshot.showBallAtRest();
    this.waitingForRespawn = false;
  }

  private checkLevelComplete(): void {
    if (this.isGameOver) return;

    const activeBricks = this.bricks.filter(b => {
      if (!b.active) return false;
      if (b.y > 680) return false;
      return true;
    });

    if (activeBricks.length === 0) {
      this.level++;
      this.levelText.setText(`第${this.level}关`);
      this.randomizeGradientColors();
      this.generateBricks();
    }
  }

  private checkGameOver(): void {
    if (this.isGameOver) return;

    const activeBricks = this.bricks.filter(b => {
      if (!b.active) return false;
      if (b.y > 680) return false;
      return true;
    });

    if (activeBricks.length > 0) {
      this.showGameOver();
    }
  }

  private showGameOver(): void {
    this.isGameOver = true;
    this.slingshot.setCanDrag(false);

    this.gameOverPanel = this.add.container(400, 350);
    this.gameOverPanel.setDepth(200);

    const mask = this.add.rectangle(0, 0, 800, 700, 0x000000, 0.75);
    this.gameOverPanel.add(mask);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a3e, 0.95);
    panelBg.fillRoundedRect(-180, -120, 360, 240, 16);
    panelBg.lineStyle(2, 0x6699ff, 0.8);
    panelBg.strokeRoundedRect(-180, -120, 360, 240, 16);
    this.gameOverPanel.add(panelBg);

    const title = this.add.text(0, -60, '游戏结束！', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    title.setOrigin(0.5);
    title.setShadow(0, 0, '#ff6666', 4, false, true);
    this.gameOverPanel.add(title);

    const scoreLabel = this.add.text(0, 0, `得分：${this.score}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '28px',
      color: '#ffff88'
    });
    scoreLabel.setOrigin(0.5);
    scoreLabel.setShadow(0, 0, '#ffff00', 3, false, true);
    this.gameOverPanel.add(scoreLabel);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4466ff, 1);
    btnBg.fillRoundedRect(-90, 50, 180, 50, 8);
    btnBg.lineStyle(2, 0x88aaff, 1);
    btnBg.strokeRoundedRect(-90, 50, 180, 50, 8);
    this.gameOverPanel.add(btnBg);

    const btnText = this.add.text(0, 75, '重新开始', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    btnText.setOrigin(0.5);
    this.gameOverPanel.add(btnText);

    const btnHitArea = this.add.zone(0, 75, 180, 50);
    btnHitArea.setInteractive({ useHandCursor: true });
    this.gameOverPanel.add(btnHitArea);

    btnHitArea.on('pointerover', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: 'Cubic.easeOut'
      });
    });

    btnHitArea.on('pointerout', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Cubic.easeOut'
      });
    });

    btnHitArea.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.destroy();
      this.gameOverPanel = null as any;
    }

    this.isGameOver = false;
    this.score = 0;
    this.level = 1;
    this.ballsLeft = 10;
    this.waitingForRespawn = false;

    this.scoreText.setText('0');
    this.levelText.setText('第1关');
    this.updateBallsLeftText();

    this.colorStart = Phaser.Display.Color.HexStringToColor('#FF4444');
    this.colorEnd = Phaser.Display.Color.HexStringToColor('#4444FF');
    this.borderColor = 0xff4444;
    this.updateBorder();

    this.generateBricks();
    this.createBall();
    this.slingshot.setCanDrag(true);
  }

  public update(time: number, delta: number): void {
    if (this.waitingForRespawn && this.ball && this.ball.active) {
      this.ballRespawnTimer += delta;

      if (this.ball.y > 620 || this.ballRespawnTimer > 5000) {
        if (this.ball.active) {
          this.ball.destroy();
          this.ball = null;
        }
        this.time.delayedCall(800, () => {
          this.respawnBall();
        });
        this.waitingForRespawn = false;
      }
    }

    this.bricks.forEach((brick, index) => {
      if (brick.active && brick.y > 720) {
        brick.destroy();
        this.bricks.splice(index, 1);
      }
    });

    if (this.borderGraphics) {
      const pulse = Math.sin(time * 0.002) * 0.15 + 0.85;
      this.borderGraphics.clear();
      this.borderGraphics.lineStyle(2, this.borderColor, pulse);
      this.borderGraphics.strokeRoundedRect(4, 4, 792, 692, 4);
      this.borderGraphics.lineStyle(1, this.borderColor, pulse * 0.5);
      this.borderGraphics.strokeRoundedRect(2, 2, 796, 696, 4);
    }
  }
}
