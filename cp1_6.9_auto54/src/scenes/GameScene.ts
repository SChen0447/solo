import Phaser from 'phaser';
import { Player } from '../Player';
import { AsteroidManager } from '../AsteroidManager';

interface Coin {
  sprite: Phaser.Physics.Arcade.Sprite;
}

export class GameScene extends Phaser.Scene {
  private player: Player | null = null;
  private asteroidManager: AsteroidManager | null = null;
  private coins: Coin[] = [];
  private coinSpawnTimer: Phaser.Time.TimerEvent | null = null;

  private score: number = 0;
  private coinCount: number = 0;
  private timeLeft: number = 60;
  private readonly GAME_DURATION: number = 60;

  private scoreText: Phaser.GameObjects.Text | null = null;
  private timeText: Phaser.GameObjects.Text | null = null;
  private boostBarBg: Phaser.GameObjects.Graphics | null = null;
  private boostBar: Phaser.GameObjects.Graphics | null = null;

  private finishBeacon: Phaser.GameObjects.Graphics | null = null;
  private collectSound: Phaser.Sound.BaseSound | null = null;
  private explosionSound: Phaser.Sound.BaseSound | null = null;
  private deliveredSound: Phaser.Sound.BaseSound | null = null;

  private isGameOver: boolean = false;
  private isDelivered: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.score = 0;
    this.coinCount = 0;
    this.timeLeft = this.GAME_DURATION;
    this.isGameOver = false;
    this.isDelivered = false;

    this.addStarBackground();
    this.createCoinTexture();
    this.createSounds();

    this.player = new Player(this, 120, this.scale.height / 2);
    this.asteroidManager = new AsteroidManager(this);
    this.asteroidManager.startSpawning();

    this.createFinishBeacon();
    this.createUI();
    this.startCoinSpawner();
    this.startTimer();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createSounds(): void {
    this.collectSound = this.sound.add('collect', { loop: false, volume: 0.3 });
    if (!this.cache.audio.has('collect')) {
      this.collectSound = this.createBeepSound(880, 0.1, 'sine');
    }

    this.explosionSound = this.sound.add('explosion', { loop: false, volume: 0.4 });
    if (!this.cache.audio.has('explosion')) {
      this.explosionSound = this.createNoiseSound(0.3);
    }

    this.deliveredSound = this.sound.add('delivered', { loop: false, volume: 0.4 });
    if (!this.cache.audio.has('delivered')) {
      this.deliveredSound = this.createChimeSound();
    }
  }

  private createBeepSound(freq: number, duration: number, type: OscillatorType): Phaser.Sound.BaseSound {
    return this.sound.add('dummy_beep');
  }

  private createNoiseSound(duration: number): Phaser.Sound.BaseSound {
    return this.sound.add('dummy_noise');
  }

  private createChimeSound(): Phaser.Sound.BaseSound {
    return this.sound.add('dummy_chime');
  }

  private playCollectSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  private playExplosionSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      source.start();
    } catch (e) {}
  }

  private playDeliveredSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } catch (e) {}
  }

  private addStarBackground(): void {
    const graphics = this.add.graphics();

    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(1, 2);
      const brightness = Phaser.Math.Between(80, 255);

      graphics.fillStyle(Phaser.Display.Color.GetColor(brightness, brightness, brightness), 0.9);
      graphics.fillRect(x, y, size, size);
    }
  }

  private createCoinTexture(): void {
    if (this.textures.exists('coin')) return;

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0xffd700);
    graphics.fillRect(2, 0, 4, 8);
    graphics.fillRect(0, 2, 8, 4);

    graphics.fillStyle(0xffaa00);
    graphics.fillRect(3, 1, 2, 6);
    graphics.fillRect(1, 3, 6, 2);

    graphics.fillStyle(0xffff00);
    graphics.fillRect(3, 3, 2, 2);

    graphics.fillStyle(0xffffff);
    graphics.fillRect(3, 3, 1, 1);

    graphics.generateTexture('coin', 8, 8);
    graphics.destroy();
  }

  private createFinishBeacon(): void {
    this.finishBeacon = this.add.graphics();
    const beaconX = 30;

    this.drawBeacon(beaconX);

    this.tweens.add({
      targets: this.finishBeacon,
      alpha: { from: 0.6, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const beaconGlow = this.add.graphics();
    beaconGlow.fillStyle(0x00ff00, 0.15);
    beaconGlow.fillRect(0, 0, 60, this.scale.height);

    this.tweens.add({
      targets: beaconGlow,
      alpha: { from: 0.1, to: 0.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawBeacon(x: number): void {
    if (!this.finishBeacon) return;
    this.finishBeacon.clear();

    const h = this.scale.height;
    const beaconWidth = 8;

    this.finishBeacon.fillStyle(0x00ff00, 1);
    this.finishBeacon.fillRect(x, h * 0.2, beaconWidth, h * 0.6);

    this.finishBeacon.fillStyle(0x00ff88, 1);
    this.finishBeacon.fillTriangle(
      x, h * 0.2,
      x + beaconWidth / 2, h * 0.1,
      x + beaconWidth, h * 0.2
    );

    this.finishBeacon.fillStyle(0x00ff88, 1);
    this.finishBeacon.fillTriangle(
      x, h * 0.8,
      x + beaconWidth / 2, h * 0.9,
      x + beaconWidth, h * 0.8
    );

    this.finishBeacon.fillStyle(0x88ffaa, 1);
    this.finishBeacon.fillRect(x - 2, h * 0.45, beaconWidth + 4, 4);
    this.finishBeacon.fillRect(x - 2, h * 0.55, beaconWidth + 4, 4);
  }

  private createUI(): void {
    this.scoreText = this.add.text(20, 16, 'SCORE: 0', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    });

    this.timeText = this.add.text(this.scale.width - 20, 16, 'TIME: 60', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#00ff88',
      stroke: '#002211',
      strokeThickness: 3
    }).setOrigin(1, 0);

    this.boostBarBg = this.add.graphics();
    this.boostBar = this.add.graphics();

    this.drawBoostBar();
  }

  private drawBoostBar(): void {
    if (!this.boostBarBg || !this.boostBar || !this.player) return;

    const barX = 20;
    const barY = 50;
    const barW = 100;
    const barH = 8;

    this.boostBarBg.clear();
    this.boostBarBg.fillStyle(0x002211, 1);
    this.boostBarBg.lineStyle(2, 0x00ff88, 1);
    this.boostBarBg.fillRect(barX, barY, barW, barH);
    this.boostBarBg.strokeRect(barX, barY, barW, barH);

    const pct = this.player.getBoostCooldownPercent();
    this.boostBar.clear();
    if (pct >= 1) {
      this.boostBar.fillStyle(0x00ffff, 1);
    } else {
      this.boostBar.fillStyle(0x0088aa, 1);
    }
    this.boostBar.fillRect(barX, barY, barW * pct, barH);

    const label = this.add.text(barX + barW + 8, barY + barH / 2, 'BOOST', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00ff88'
    }).setOrigin(0, 0.5);
  }

  private startCoinSpawner(): void {
    this.scheduleNextCoin();
  }

  private scheduleNextCoin(): void {
    if (this.isGameOver) return;

    const delay = Phaser.Math.Between(2000, 4000);
    this.coinSpawnTimer = this.time.delayedCall(delay, () => {
      this.spawnCoin();
      this.scheduleNextCoin();
    });
  }

  private spawnCoin(): void {
    if (this.isGameOver) return;

    const x = Phaser.Math.Between(100, this.scale.width - 50);
    const sprite = this.physics.add.sprite(x, -20, 'coin');
    sprite.setVelocityY(Phaser.Math.Between(40, 80));
    sprite.setSize(6, 6);
    sprite.setOffset(1, 1);

    this.tweens.add({
      targets: sprite,
      angle: { from: 0, to: 360 },
      duration: 800,
      repeat: -1,
      ease: 'Linear'
    });

    this.tweens.add({
      targets: sprite,
      scaleX: { from: 0.8, to: 1.2 },
      scaleY: { from: 0.8, to: 1.2 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.coins.push({ sprite });
  }

  private startTimer(): void {
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isGameOver) return;
        this.timeLeft--;
        this.updateTimeUI();

        if (this.timeLeft <= 0) {
          this.endGame(false);
        }
      },
      loop: true
    });
  }

  private updateTimeUI(): void {
    if (!this.timeText) return;

    this.timeText.setText(`TIME: ${this.timeLeft}`);

    if (this.timeLeft <= 10) {
      this.tweens.add({
        targets: this.timeText,
        alpha: { from: 0.3, to: 1 },
        duration: 300,
        yoyo: true,
        repeat: 0,
        ease: 'Linear'
      });
      this.timeText.setColor('#ff4444');
      this.timeText.setStroke('#440000', 3);
    }
  }

  private updateScoreUI(): void {
    if (!this.scoreText) return;
    this.scoreText.setText(`SCORE: ${this.score}`);
  }

  private showScorePopup(x: number, y: number, value: number): void {
    const popup = this.add.text(x, y, `+${value}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffff00',
      stroke: '#444400',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 30,
      scaleX: { from: 1, to: 2 },
      scaleY: { from: 1, to: 2 },
      alpha: { from: 1, to: 0 },
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        popup.destroy();
      }
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    if (this.player) {
      this.player.update(delta);
    }

    if (this.asteroidManager) {
      this.asteroidManager.update(delta);
    }

    this.updateCoins(delta);
    this.drawBoostBar();

    if (this.player && this.asteroidManager) {
      if (this.asteroidManager.checkCollision(this.player.sprite)) {
        this.playExplosionSound();
        this.endGame(false);
        return;
      }
    }

    this.checkCoinCollection();
    this.checkFinishReached();
  }

  private updateCoins(delta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i];
      if (coin.sprite.y > this.scale.height + 20) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.coins[idx].sprite.destroy();
      this.coins.splice(idx, 1);
    }
  }

  private checkCoinCollection(): void {
    if (!this.player) return;

    const playerBounds = this.player.sprite.getBounds();
    const toRemove: number[] = [];

    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i];
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, coin.sprite.getBounds())) {
        this.coinCount++;
        this.score += 10;
        this.updateScoreUI();
        this.showScorePopup(coin.sprite.x, coin.sprite.y, 10);
        this.playCollectSound();
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.tweens.killTweensOf(this.coins[idx].sprite);
      this.coins[idx].sprite.destroy();
      this.coins.splice(idx, 1);
    }
  }

  private checkFinishReached(): void {
    if (!this.player) return;
    if (this.player.sprite.x <= 45) {
      this.endGame(true);
    }
  }

  private endGame(delivered: boolean): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isDelivered = delivered;

    if (this.asteroidManager) {
      this.asteroidManager.stopSpawning();
    }
    if (this.coinSpawnTimer) {
      this.coinSpawnTimer.remove(false);
    }

    const finalScore = this.calculateFinalScore(delivered);

    if (delivered) {
      this.playDeliveredSound();
      this.showDeliveredAnimation(() => {
        this.goToGameOver(true, finalScore);
      });
    } else {
      this.time.delayedCall(800, () => {
        this.goToGameOver(false, finalScore);
      });
    }
  }

  private calculateFinalScore(delivered: boolean): number {
    let final = this.coinCount * 10;
    if (delivered) {
      final += this.timeLeft * 5;
    }
    return final;
  }

  private showDeliveredAnimation(onComplete: () => void): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const text = this.add.text(cx, cy, 'DELIVERED!', {
      fontFamily: 'monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#886600',
      strokeThickness: 6
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: text,
      scaleX: { from: 0, to: 1.3 },
      scaleY: { from: 0, to: 1.3 },
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 1200,
      onComplete: () => {
        text.destroy();
      }
    });

    const coinRain = this.add.particles(0, 0, 'coin', {
      x: { min: 0, max: this.scale.width },
      y: -20,
      speedY: { min: 100, max: 250 },
      scaleX: { start: 1, end: 0.5 },
      scaleY: { start: 1, end: 0.5 },
      lifespan: 2000,
      quantity: 3,
      frequency: 50,
      angle: { min: 80, max: 100 },
      rotate: { min: 0, max: 360 },
      duration: 1500
    });

    this.time.delayedCall(2200, onComplete);
  }

  private goToGameOver(delivered: boolean, finalScore: number): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', {
        delivered: delivered,
        score: finalScore,
        coins: this.coinCount,
        timeLeft: this.timeLeft
      });
    });
  }
}
