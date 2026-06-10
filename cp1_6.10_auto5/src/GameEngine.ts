import { InputState } from './types';
import { SpaceShip } from './SpaceShip';
import { AsteroidManager } from './AsteroidManager';
import { CrystalManager } from './Crystal';
import { StarField } from './StarField';
import { ParticleSystem } from './utils/ParticleSystem';
import { AudioManager } from './AudioManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  private starField: StarField;
  private particleSystem: ParticleSystem;
  private ship: SpaceShip;
  private asteroidManager: AsteroidManager;
  private crystalManager: CrystalManager;
  private audioManager: AudioManager;

  private input: InputState;
  private prevSpace: boolean = false;

  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private crystalsCollected: number = 0;
  private gameTime: number = 0;

  private isPlaying: boolean = false;
  private isGameOver: boolean = false;
  private gameOverTimer: number = 0;
  private gameOverDuration: number = 1.5;

  private shakeTimer: number = 0;
  private shakeDuration: number = 0.3;
  private shakeIntensity: number = 8;

  private comboAnimTimer: number = 0;
  private comboAnimDuration: number = 0.5;
  private lastComboLevel: number = 0;

  private readonly TARGET_FPS = 60;
  private readonly FRAME_TIME = 1 / this.TARGET_FPS;
  private lastTime: number = 0;
  private accumulator: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shift: false,
      space: false
    };

    this.particleSystem = new ParticleSystem(200);
    this.starField = new StarField(this.width, this.height, 150);
    this.ship = new SpaceShip(this.width, this.height, this.particleSystem);
    this.asteroidManager = new AsteroidManager(this.width, this.height, this.particleSystem, 30);
    this.crystalManager = new CrystalManager(this.width, this.height, 15);
    this.audioManager = new AudioManager();

    window.addEventListener('resize', this.resize.bind(this));
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  setInput(input: InputState): void {
    this.input = { ...input };
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.starField) this.starField.resize(this.width, this.height);
    if (this.ship) this.ship.resize(this.width, this.height);
    if (this.asteroidManager) this.asteroidManager.resize(this.width, this.height);
    if (this.crystalManager) this.crystalManager.resize(this.width, this.height);
  }

  startGame(): void {
    this.audioManager.init();
    this.isPlaying = true;
    this.isGameOver = false;
    this.gameOverTimer = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.crystalsCollected = 0;
    this.gameTime = 0;
    this.shakeTimer = 0;
    this.comboAnimTimer = 0;
    this.lastComboLevel = 0;
    this.accumulator = 0;
    this.lastTime = performance.now();

    this.ship.reset();
    this.asteroidManager.clear();
    this.crystalManager.clear();
    this.particleSystem.clear();
  }

  getGameState() {
    return {
      score: this.score,
      lives: this.ship.lives,
      energy: this.ship.energy,
      maxEnergy: this.ship.maxEnergy,
      combo: this.combo,
      crystalsCollected: this.crystalsCollected,
      isPlaying: this.isPlaying,
      isGameOver: this.isGameOver,
      isShielded: this.ship.isShielded,
      isBoosting: this.ship.isBoosting,
      boostCooldown: Math.max(0, this.ship.cooldownTimer),
      boostCooldownDuration: this.ship.cooldownDuration
    };
  }

  loop(currentTime: number): void {
    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.isPlaying) {
      this.accumulator += deltaTime;
      while (this.accumulator >= this.FRAME_TIME) {
        this.update(this.FRAME_TIME);
        this.accumulator -= this.FRAME_TIME;
      }
    } else if (this.isGameOver) {
      if (this.gameOverTimer < this.gameOverDuration) {
        this.gameOverTimer += deltaTime;
      }
      this.starField.update(deltaTime);
      this.particleSystem.update(deltaTime);
    }

    this.render();
  }

  private update(dt: number): void {
    this.gameTime += dt;

    const difficulty = 1 + Math.floor(this.gameTime / 20) * 0.3;
    this.asteroidManager.setDifficulty(difficulty);

    const spacePressed = this.input.space && !this.prevSpace;
    this.prevSpace = this.input.space;

    if (spacePressed && this.ship.tryActivateShield()) {
      this.audioManager.playShield();
    }

    this.starField.update(dt);
    this.ship.update(dt, this.input);
    this.particleSystem.update(dt);

    const collisionResult = this.asteroidManager.update(dt, this.ship.getPosition(), this.ship.getRadius());

    if (collisionResult.hit) {
      if (this.ship.takeDamage()) {
        this.audioManager.playHit();
        this.shakeTimer = this.shakeDuration;
        this.combo = 0;
        if (this.ship.lives <= 0) {
          this.endGame();
        }
      }
    }

    for (const dodged of collisionResult.dodged) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      let points = 10;
      if (this.combo > 5) {
        points += (this.combo - 5) * 5;
      }
      this.score += points;

      const comboLevel = Math.floor(this.combo / 5);
      if (comboLevel > this.lastComboLevel) {
        this.lastComboLevel = comboLevel;
        this.comboAnimTimer = this.comboAnimDuration;
        this.audioManager.playCombo(comboLevel);
      }
    }

    if (this.comboAnimTimer > 0) {
      this.comboAnimTimer -= dt;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    }

    const collected = this.crystalManager.update(dt, this.ship.getPosition(), this.ship.getRadius());
    if (collected) {
      this.ship.collectEnergy(25);
      this.crystalsCollected++;
      this.score += 50;
      this.audioManager.playCollect();

      for (let i = 0; i < 8; i++) {
        this.particleSystem.emit(this.ship.x, this.ship.y, 1, {
          speed: 2 + Math.random() * 2,
          spread: Math.PI * 2,
          life: 0.4,
          size: 3,
          color: '#00ff96'
        });
      }
    }
  }

  private endGame(): void {
    this.isPlaying = false;
    this.isGameOver = true;
    this.gameOverTimer = 0;
    this.audioManager.playGameOver();

    for (let i = 0; i < 30; i++) {
      this.particleSystem.emit(this.ship.x, this.ship.y, 1, {
        speed: 3 + Math.random() * 5,
        spread: Math.PI * 2,
        life: 0.8 + Math.random() * 0.5,
        size: 3 + Math.random() * 4,
        color: i % 2 === 0 ? '#ff6b35' : '#ffcc00'
      });
    }
  }

  private render(): void {
    const ctx = this.ctx;
    let shakeX = 0;
    let shakeY = 0;

    if (this.shakeTimer > 0) {
      const shakeFactor = this.shakeTimer / this.shakeDuration;
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.starField.drawBackground(ctx);
    this.starField.drawStars(ctx);

    if (this.isPlaying || this.isGameOver) {
      this.crystalManager.draw(ctx);
      this.asteroidManager.draw(ctx);
      this.particleSystem.draw(ctx);

      if (!this.isGameOver || this.gameOverTimer < this.gameOverDuration * 0.5) {
        this.ship.draw(ctx);
      }

      this.drawHUD(ctx);
    }

    if (this.isGameOver) {
      this.drawGameOver(ctx);
    }

    ctx.restore();
  }

  private getSafeAreaScale(): { scale: number; offsetX: number; offsetY: number } {
    const aspect = this.width / this.height;
    const targetAspect = 16 / 9;
    if (aspect >= targetAspect) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }
    const scale = aspect / targetAspect;
    const offsetX = (this.width - this.width * scale) / 2;
    const offsetY = 0;
    return { scale, offsetX, offsetY };
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const safe = this.getSafeAreaScale();
    ctx.save();
    ctx.translate(safe.offsetX, safe.offsetY);
    ctx.scale(safe.scale, safe.scale);

    const padding = 24;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, this.width - padding - 220, padding, 220, 100, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('得分 SCORE', this.width - padding - 16, padding + 28);

    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff9f43';
    ctx.fillText(this.score.toString(), this.width - padding - 16, padding + 60);

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#a29bfe';
    ctx.fillText(`水晶: ${this.crystalsCollected}`, this.width - padding - 16, padding + 84);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(238, 82, 83, 0.5)';
    this.roundRect(ctx, this.width - padding - 220, padding + 115, 220, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    for (let i = 0; i < this.ship.maxLives; i++) {
      const heartX = this.width - padding - 200 + i * 36;
      const heartY = padding + 135;
      this.drawHeart(ctx, heartX, heartY, 14, i < this.ship.lives);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    this.roundRect(ctx, this.width - padding - 220, padding + 165, 220, 36, 10);
    ctx.fill();
    ctx.stroke();

    const barX = this.width - padding - 210;
    const barY = padding + 175;
    const barW = 200;
    const barH = 16;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const energyPct = this.ship.energy / this.ship.maxEnergy;
    const energyGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (energyPct >= 1) {
      energyGrad.addColorStop(0, '#64c8ff');
      energyGrad.addColorStop(1, '#00ffcc');
    } else {
      energyGrad.addColorStop(0, '#4a9eff');
      energyGrad.addColorStop(1, '#00bfff');
    }
    ctx.fillStyle = energyGrad;
    this.roundRect(ctx, barX, barY, barW * energyPct, barH, 4);
    ctx.fill();

    if (energyPct >= 1) {
      ctx.strokeStyle = `rgba(0, 255, 204, ${0.5 + Math.sin(this.gameTime * 8) * 0.5})`;
      ctx.lineWidth = 2;
      this.roundRect(ctx, barX - 1, barY - 1, barW + 2, barH + 2, 5);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(energyPct >= 1 ? '能量满 - 按空格释放护盾!' : `能量 ${Math.floor(energyPct * 100)}%`, barX + barW / 2, barY + 12);

    if (this.combo >= 2) {
      let comboScale = 1;
      let comboAlpha = 1;
      if (this.comboAnimTimer > 0) {
        const t = this.comboAnimTimer / this.comboAnimDuration;
        comboScale = 1 + (1 - t) * 0.5;
        comboAlpha = 0.8 + (1 - t) * 0.2;
      }

      ctx.save();
      ctx.translate(padding + 60, padding + 30);
      ctx.scale(comboScale, comboScale);
      ctx.globalAlpha = comboAlpha;

      ctx.fillStyle = this.combo >= 10 ? '#ff6b35' : this.combo >= 5 ? '#ffd93d' : '#a29bfe';
      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = this.combo >= 10 ? '#ff6b35' : this.combo >= 5 ? '#ffd93d' : '#a29bfe';
      ctx.shadowBlur = 15;
      ctx.fillText(`${this.combo}x`, 0, 0);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('COMBO', 0, 18);
      ctx.restore();
    }

    const boostX = padding;
    const boostY = this.height - padding - 40;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(255, 159, 67, 0.5)';
    this.roundRect(ctx, boostX, boostY, 180, 30, 8);
    ctx.fill();
    ctx.stroke();

    const boostBarX = boostX + 8;
    const boostBarY = boostY + 8;
    const boostBarW = 164;
    const boostBarH = 14;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.roundRect(ctx, boostBarX, boostBarY, boostBarW, boostBarH, 3);
    ctx.fill();

    let boostPct: number;
    let boostColor: string;
    if (this.ship.isBoosting) {
      boostPct = this.ship.boostTimer / this.ship.boostDuration;
      boostColor = '#ffcc00';
    } else if (this.ship.cooldownTimer > 0) {
      boostPct = 1 - this.ship.cooldownTimer / this.ship.cooldownDuration;
      boostColor = '#666666';
    } else {
      boostPct = 1;
      boostColor = '#ff9f43';
    }

    ctx.fillStyle = boostColor;
    this.roundRect(ctx, boostBarX, boostBarY, boostBarW * boostPct, boostBarH, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const boostText = this.ship.isBoosting ? '加速中!' : this.ship.cooldownTimer > 0 ? '冷却中...' : 'Shift 加速';
    ctx.fillText(boostText, boostX + 90, boostY + 21);

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const s = size;
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(0, -s * 0.1, -s * 0.5, -s * 0.1, -s * 0.5, s * 0.25);
    ctx.bezierCurveTo(-s * 0.5, s * 0.5, 0, s * 0.75, 0, s);
    ctx.bezierCurveTo(0, s * 0.75, s * 0.5, s * 0.5, s * 0.5, s * 0.25);
    ctx.bezierCurveTo(s * 0.5, -s * 0.1, 0, -s * 0.1, 0, s * 0.3);
    ctx.closePath();

    if (filled) {
      const grad = ctx.createLinearGradient(0, -s * 0.2, 0, s);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(1, '#ee5253');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(1, this.gameOverTimer / this.gameOverDuration);

    ctx.fillStyle = `rgba(0, 0, 0, ${t * 0.75})`;
    ctx.fillRect(0, 0, this.width, this.height);

    if (t >= 0.9) {
      const panelT = Math.min(1, (this.gameOverTimer - this.gameOverDuration * 0.8) / 0.5);
      const panelScale = 0.8 + panelT * 0.2;
      const panelAlpha = panelT;

      ctx.save();
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(panelScale, panelScale);
      ctx.globalAlpha = panelAlpha;

      const panelW = 400;
      const panelH = 420;

      ctx.shadowColor = 'rgba(108, 92, 231, 0.8)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(15, 5, 40, 0.95)';
      ctx.strokeStyle = '#a29bfe';
      ctx.lineWidth = 3;
      this.roundRect(ctx, -panelW / 2, -panelH / 2, panelW, panelH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 42px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', 0, -panelH / 2 + 60);

      ctx.fillStyle = '#a29bfe';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText('GAME OVER', 0, -panelH / 2 + 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('最终得分', 0, -panelH / 2 + 140);

      ctx.fillStyle = '#ffd93d';
      ctx.font = 'bold 56px "Segoe UI", sans-serif';
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 20;
      ctx.fillText(this.score.toString(), 0, -panelH / 2 + 200);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.roundRect(ctx, -panelW / 2 + 30, -40, panelW - 60, 80, 10);
      ctx.fill();

      ctx.fillStyle = '#00ff96';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`💎 收集水晶`, -panelW / 2 + 50, -10);
      ctx.textAlign = 'right';
      ctx.fillText(`${this.crystalsCollected} 个`, panelW / 2 - 50, -10);

      ctx.fillStyle = '#ff9f43';
      ctx.textAlign = 'left';
      ctx.fillText(`🔥 最高连击`, -panelW / 2 + 50, 20);
      ctx.textAlign = 'right';
      ctx.fillText(`${this.maxCombo}x`, panelW / 2 - 50, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击「开始游戏」按钮再来一局', 0, panelH / 2 - 50);

      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
