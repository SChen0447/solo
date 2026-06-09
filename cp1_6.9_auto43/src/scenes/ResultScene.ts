import Phaser from 'phaser';

interface GameResult {
  score: number;
  time: number;
  victory: boolean;
}

export default class ResultScene extends Phaser.Scene {
  private resultData!: GameResult;

  constructor() {
    super('ResultScene');
  }

  init(data: GameResult): void {
    this.resultData = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(0);

    const panel = this.add.graphics();
    panel.fillStyle(0x2a1a10, 0.95);
    panel.fillRoundedRect(width / 2 - 250, height / 2 - 220, 500, 440, 20);
    panel.lineStyle(3, 0xd4a85a, 0.8);
    panel.strokeRoundedRect(width / 2 - 250, height / 2 - 220, 500, 440, 20);

    const titleText = this.resultData.victory ? '🎉 游戏完成！' : '⏱ 游戏结束';
    this.add.text(width / 2, height / 2 - 170, titleText, {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#d4a85a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 100, `最终得分: ${this.resultData.score}`, {
      fontFamily: 'Georgia',
      fontSize: '28px',
      color: '#d4a85a'
    }).setOrigin(0.5);

    const minutes = Math.floor(this.resultData.time / 60);
    const seconds = this.resultData.time % 60;
    this.add.text(width / 2, height / 2 - 55, `用时: ${minutes}分${seconds}秒`, {
      fontFamily: 'Georgia',
      fontSize: '22px',
      color: '#c9a050'
    }).setOrigin(0.5);

    const { rating, gradient } = this.getRating(this.resultData.score);
    this.createRatingText(width / 2, height / 2 + 10, rating, gradient);

    this.add.text(width / 2, height / 2 + 80, this.getRatingDescription(rating), {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#c9a050'
    }).setOrigin(0.5);

    this.createRestartButton(width / 2, height / 2 + 155);
  }

  private getRating(score: number): { rating: string; gradient: [number, number] } {
    if (score > 120) {
      return { rating: '金牌', gradient: [0xffd700, 0xffffff] };
    } else if (score >= 80) {
      return { rating: '银牌', gradient: [0xc0c0c0, 0xffffff] };
    } else if (score >= 40) {
      return { rating: '铜牌', gradient: [0xcd7f32, 0xffffff] };
    } else {
      return { rating: '不及格', gradient: [0x888888, 0xaaaaaa] };
    }
  }

  private createRatingText(x: number, y: number, text: string, gradient: [number, number]): void {
    const canvas = this.textures.createCanvas('ratingCanvas', 200, 80);
    const ctx = canvas.getContext();

    ctx.clearRect(0, 0, 200, 80);
    ctx.font = 'bold 52px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const grad = ctx.createLinearGradient(0, 0, 0, 80);
    grad.addColorStop(0, '#' + gradient[0].toString(16).padStart(6, '0'));
    grad.addColorStop(1, '#' + gradient[1].toString(16).padStart(6, '0'));
    ctx.fillStyle = grad;
    ctx.fillText(text, 100, 40);

    canvas.refresh();

    this.add.image(x, y, 'ratingCanvas').setScale(1.2);
  }

  private getRatingDescription(rating: string): string {
    switch (rating) {
      case '金牌':
        return '太棒了！你是酒吧记忆大师！';
      case '银牌':
        return '做得不错！继续努力！';
      case '铜牌':
        return '还可以，再练练会更好！';
      default:
        return '别灰心，再试一次吧！';
    }
  }

  private createRestartButton(x: number, y: number): void {
    const btnWidth = 180;
    const btnHeight = 56;

    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(0xdaa520, 0xdaa520, 0xb8860b, 0xb8860b, 1);
    btnBg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 12);
    btnBg.lineStyle(2, 0xd4a85a, 0.6);
    btnBg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 12);

    const btnText = this.add.text(x, y, '重玩游戏', {
      fontFamily: 'Georgia',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const btnContainer = this.add.container(x, y, [btnBg, btnText]);
    btnContainer.setSize(btnWidth, btnHeight);
    btnContainer.setInteractive({ useHandCursor: true });

    const glow = this.add.graphics();
    glow.lineStyle(3, 0xffd700, 0.8);
    glow.strokeRoundedRect(-btnWidth / 2 - 2, -btnHeight / 2 - 2, btnWidth + 4, btnHeight + 4, 14);
    glow.setAlpha(0);
    btnContainer.add(glow);

    btnContainer.on('pointerover', () => {
      this.tweens.add({
        targets: btnContainer,
        scale: 1.1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: 1,
        duration: 150
      });
    });

    btnContainer.on('pointerout', () => {
      this.tweens.add({
        targets: btnContainer,
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 150
      });
    });

    btnContainer.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('GameScene');
      });
    });
  }
}
