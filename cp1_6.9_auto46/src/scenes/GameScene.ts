import Phaser from 'phaser';
import { RhythmBar, Note } from '../objects/RhythmBar';
import { LEVELS, GAME_CONFIG, calculateGrade } from '../config/levels';

interface MatrixRow {
  text: Phaser.GameObjects.Text;
  createdAt: number;
  duration: number;
}

export class GameScene extends Phaser.Scene {
  private rhythmBar!: RhythmBar;
  private matrixRows: MatrixRow[] = [];
  private matrixTimer: number = 0;
  private lives: number = GAME_CONFIG.TOTAL_LIVES;
  private livesIcons: Phaser.GameObjects.Text[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private combo: number = 0;
  private maxCombo: number = 0;
  private comboText!: Phaser.GameObjects.Text;
  private levelNameText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBg!: Phaser.GameObjects.Rectangle;
  private hitCount: number = 0;
  private levelStartTime: number = 0;
  private totalHitsAllLevels: number = 0;
  private totalNotesAllLevels: number = 0;
  private totalMaxCombo: number = 0;
  private currentLevelIndex: number = 0;
  private gameState: 'start' | 'playing' | 'levelComplete' | 'gameOver' | 'transition' = 'start';
  private audioContext!: AudioContext | null;
  private startScreenContainer!: Phaser.GameObjects.Container;
  private levelCompleteContainer!: Phaser.GameObjects.Container;
  private gameOverContainer!: Phaser.GameObjects.Container;
  private levelClearText!: Phaser.GameObjects.Text;
  private centerX: number = 0;
  private centerY: number = 0;
  private gameWidth: number = 1920;
  private gameHeight: number = 1080;

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(): void {
    this.centerX = this.cameras.main.width / 2;
    this.centerY = this.cameras.main.height / 2;
    this.gameWidth = this.cameras.main.width;
    this.gameHeight = this.cameras.main.height;
  }

  public create(): void {
    this.initAudio();
    this.createBackground();
    this.createMatrixRows();
    this.createHUD();
    this.createRhythmBar();
    this.createStartScreen();
    this.setupInput();
    this.scale.on('resize', this.handleResize, this);
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playHitSound(): void {
    this.playTone(880, 0.08, 'square', 0.15);
  }

  private playMissSound(): void {
    this.playTone(150, 0.2, 'sawtooth', 0.2);
  }

  private playComboSound(combo: number): void {
    const freq = 440 + Math.min(combo, 50) * 10;
    this.playTone(freq, 0.15, 'sine', 0.2);
    this.time.delayedCall(50, () => this.playTone(freq * 1.5, 0.1, 'sine', 0.15));
  }

  private playLevelClearSound(): void {
    [440, 554, 659, 880].forEach((freq, i) => {
      this.time.delayedCall(i * 100, () => this.playTone(freq, 0.2, 'sine', 0.2));
    });
  }

  private playGradeSound(grade: string): void {
    const configs: Record<string, { freq: number; dur: number; type: OscillatorType }> = {
      'S': { freq: 1046, dur: 0.4, type: 'sine' },
      'A': { freq: 784, dur: 0.3, type: 'sine' },
      'B': { freq: 587, dur: 0.25, type: 'triangle' },
      'C': { freq: 392, dur: 0.3, type: 'sawtooth' }
    };
    const cfg = configs[grade] || configs['C'];
    this.playTone(cfg.freq, cfg.dur, cfg.type, 0.25);
  }

  private playGameOverSound(): void {
    [440, 349, 293, 220].forEach((freq, i) => {
      this.time.delayedCall(i * 150, () => this.playTone(freq, 0.3, 'sawtooth', 0.2));
    });
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor('#000000');
  }

  private createMatrixRows(): void {
  }

  private spawnMatrixRow(): void {
    const level = LEVELS[this.currentLevelIndex];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>/\\|{}[]';
    let text = '';
    const len = Math.floor(this.gameWidth / 10);
    for (let i = 0; i < len; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const y = Math.random() * (this.gameHeight * 0.4) + 20;
    const row = this.add.text(10, y, text, {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: level?.matrixColor || '#00ff00'
    }).setAlpha(0.8);

    this.tweens.add({
      targets: row,
      alpha: { from: 0.8, to: 0 },
      duration: GAME_CONFIG.MATRIX_ROW_DURATION,
      ease: 'Linear',
      onComplete: () => row.destroy()
    });

    this.matrixRows.push({
      text: row,
      createdAt: this.time.now,
      duration: GAME_CONFIG.MATRIX_ROW_DURATION
    });
  }

  private cleanupMatrixRows(): void {
    const now = this.time.now;
    for (let i = this.matrixRows.length - 1; i >= 0; i--) {
      if (now - this.matrixRows[i].createdAt > this.matrixRows[i].duration) {
        this.matrixRows.splice(i, 1);
      }
    }
  }

  private createHUD(): void {
    const level = LEVELS[this.currentLevelIndex];

    this.levelNameText = this.add.text(this.centerX, 80, level.name, {
      fontFamily: 'Consolas, monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: level.matrixColor
    }).setOrigin(0.5);

    this.progressBg = this.add.rectangle(
      this.centerX, 130, 400, 20, 0x000000, 0.8
    ).setStrokeStyle(2, 0x00ff00, 0.8);

    this.progressBar = this.add.graphics();
    this.updateProgressBar();

    this.scoreText = this.add.text(30, 30, 'SCORE: 0', {
      fontFamily: 'Consolas, monospace',
      fontSize: '20px',
      color: '#00ff00'
    });

    this.createLivesIcons();

    this.comboText = this.add.text(this.centerX, this.centerY, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffff00'
    }).setOrigin(0.5).setAlpha(0);
  }

  private createLivesIcons(): void {
    this.livesIcons.forEach(icon => icon.destroy());
    this.livesIcons = [];

    for (let i = 0; i < GAME_CONFIG.TOTAL_LIVES; i++) {
      const icon = this.add.text(
        this.gameWidth - 40 - i * 35,
        30,
        '🔒',
        { fontSize: '24px' }
      );
      this.livesIcons.push(icon);
    }
  }

  private updateLivesIcons(): void {
    this.livesIcons.forEach((icon, i) => {
      if (i < this.lives) {
        icon.setColor('#00ff00');
        icon.setAlpha(1);
      } else {
        icon.setColor('#ff0000');
        icon.setAlpha(0.6);
        this.tweens.add({
          targets: icon,
          angle: { from: -15, to: 15 },
          duration: 100,
          yoyo: true,
          repeat: 3
        });
      }
    });
  }

  private createRhythmBar(): void {
    const barWidth = this.gameWidth * 0.8;
    const y = this.gameHeight - GAME_CONFIG.BAR_BOTTOM_OFFSET;

    this.rhythmBar = new RhythmBar(this, this.centerX, y, barWidth);
    this.rhythmBar.setCallbacks(
      (note: Note) => this.handleNoteHit(note),
      () => this.handleNoteMiss()
    );
  }

  private updateProgressBar(): void {
    const level = LEVELS[this.currentLevelIndex];
    const progress = this.hitCount / level.totalNotes;
    const width = 400;
    const height = 20;
    const x = this.centerX - width / 2;
    const y = 130 - height / 2;

    this.progressBar.clear();

    const color1 = new Phaser.Display.Color(0, 100, 0);
    const color2 = new Phaser.Display.Color(0, 255, 0);
    this.progressBar.fillGradientStyle(
      color2.color, color2.color, color1.color, color1.color, 1
    );
    this.progressBar.fillRect(x, y, width * progress, height);
  }

  private createStartScreen(): void {
    this.startScreenContainer = this.add.container(this.centerX, this.centerY);

    const title = this.add.text(0, -80, 'HACKER TERMINAL', {
      fontFamily: 'Consolas, monospace',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#00ff00'
    }).setOrigin(0.5).setShadow(0, 0, 10, '#00ff00', true, true);

    const subtitle = this.add.text(0, 0, 'RHYTHM BREACH PROTOCOL', {
      fontFamily: 'Consolas, monospace',
      fontSize: '20px',
      color: '#00cc00'
    }).setOrigin(0.5);

    const hint = this.add.text(0, 80, 'PRESS SPACE TO INITIATE BREACH', {
      fontFamily: 'Consolas, monospace',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.startScreenContainer.add([title, subtitle, hint]);
  }

  private createLevelCompleteScreen(): void {
    if (this.levelCompleteContainer) {
      this.levelCompleteContainer.destroy();
    }

    const level = LEVELS[this.currentLevelIndex];
    const hitRate = this.hitCount / level.totalNotes;
    const grade = calculateGrade(hitRate, this.maxCombo);
    const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);

    this.levelCompleteContainer = this.add.container(this.centerX, this.centerY);
    this.levelCompleteContainer.setAlpha(0);

    const title = this.add.text(0, -180, `LEVEL ${level.id} CLEAR`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: level.matrixColor
    }).setOrigin(0.5).setScale(0.1);

    this.tweens.add({
      targets: title,
      scale: { from: 0.1, to: 1 },
      angle: { from: 360, to: 0 },
      alpha: { from: 0, to: 1 },
      duration: 1000,
      ease: 'Back.easeOut'
    });

    const hitsText = this.add.text(0, -80, `HITS: ${this.hitCount} / ${level.totalNotes}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '24px',
      color: '#00ff00'
    }).setOrigin(0.5);

    const comboText = this.add.text(0, -40, `MAX COMBO: ${this.maxCombo}x`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5);

    const timeText = this.add.text(0, 0, `TIME: ${elapsed}s`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '24px',
      color: '#00ffff'
    }).setOrigin(0.5);

    const gradeText = this.add.text(0, 80, grade, {
      fontFamily: 'Consolas, monospace',
      fontSize: '72px',
      fontStyle: 'bold',
      color: grade === 'S' ? '#ffff00' : grade === 'A' ? '#00ff00' : grade === 'B' ? '#00ffff' : '#ff6600'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: gradeText,
      alpha: { from: 1, to: 0.5 },
      scale: { from: 1, to: 1.1 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    const nextText = this.add.text(0, 170,
      this.currentLevelIndex < LEVELS.length - 1 ? 'PRESS SPACE TO CONTINUE' : 'PRESS SPACE FOR FINAL RESULT',
      {
        fontFamily: 'Consolas, monospace',
        fontSize: '20px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: nextText,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.levelCompleteContainer.add([title, hitsText, comboText, timeText, gradeText, nextText]);

    this.tweens.add({
      targets: this.levelCompleteContainer,
      alpha: { from: 0, to: 1 },
      duration: 500,
      delay: 1000
    });

    this.playLevelClearSound();
    this.time.delayedCall(1500, () => this.playGradeSound(grade));
  }

  private createGameOverScreen(): void {
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
    }

    const hitRate = this.totalNotesAllLevels > 0 ? this.totalHitsAllLevels / this.totalNotesAllLevels : 0;
    const grade = calculateGrade(hitRate, this.totalMaxCombo);

    this.gameOverContainer = this.add.container(this.centerX, this.centerY);

    const title = this.add.text(0, -150, 'GAME OVER', {
      fontFamily: 'Consolas, monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ff0000'
    }).setOrigin(0.5).setScale(1);

    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.3 },
      scale: { from: 1, to: 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const scoreText = this.add.text(0, -50, `TOTAL SCORE: ${this.score}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '28px',
      color: '#00ff00'
    }).setOrigin(0.5);

    const hitsText = this.add.text(0, -10, `TOTAL HITS: ${this.totalHitsAllLevels} / ${this.totalNotesAllLevels}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '22px',
      color: '#00ff00'
    }).setOrigin(0.5);

    const comboText = this.add.text(0, 30, `MAX COMBO: ${this.totalMaxCombo}x`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '22px',
      color: '#ffff00'
    }).setOrigin(0.5);

    const gradeText = this.add.text(0, 100, grade, {
      fontFamily: 'Consolas, monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: grade === 'S' ? '#ffff00' : grade === 'A' ? '#00ff00' : grade === 'B' ? '#00ffff' : '#ff6600'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: gradeText,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    const retryText = this.add.text(0, 200, 'PRESS SPACE TO RETRY', {
      fontFamily: 'Consolas, monospace',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryText,
      alpha: { from: 1, to: 0.2 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.gameOverContainer.add([title, scoreText, hitsText, comboText, gradeText, retryText]);
    this.playGameOverSound();
  }

  private showLevelClearTransition(): void {
    const level = LEVELS[this.currentLevelIndex];
    this.levelClearText = this.add.text(this.centerX, this.centerY, `LEVEL ${level.id} CLEAR`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: level.matrixColor
    }).setOrigin(0.5).setScale(0.1).setAlpha(0);

    this.tweens.add({
      targets: this.levelClearText,
      scale: { from: 0.1, to: 1.5 },
      angle: { from: -180, to: 0 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.levelClearText,
          scale: { from: 1.5, to: 0.5 },
          alpha: { from: 1, to: 0 },
          duration: 500,
          delay: 500,
          ease: 'Back.easeIn',
          onComplete: () => {
            this.levelClearText.destroy();
            this.startNextLevel();
          }
        });
      }
    });
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        this.handleSpacePress();
        return;
      }

      if (this.gameState === 'playing') {
        const key = event.key.length === 1 ? event.key : '';
        if (key) {
          const hit = this.rhythmBar.checkKeyPress(key);
          if (!hit) {
            this.handleWrongKey();
          }
        }
      }
    });
  }

  private handleSpacePress(): void {
    switch (this.gameState) {
      case 'start':
        this.startGame();
        break;
      case 'levelComplete':
        if (this.currentLevelIndex < LEVELS.length - 1) {
          this.levelCompleteContainer.destroy();
          this.showLevelClearTransition();
        } else {
          this.resetGame();
          this.createGameOverScreen();
          this.gameState = 'gameOver';
        }
        break;
      case 'gameOver':
        this.gameOverContainer.destroy();
        this.resetGame();
        this.startGame();
        break;
    }
  }

  private startGame(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.startScreenContainer.destroy();
    this.currentLevelIndex = 0;
    this.totalHitsAllLevels = 0;
    this.totalNotesAllLevels = 0;
    this.totalMaxCombo = 0;
    this.score = 0;
    this.startLevel();
  }

  private startLevel(): void {
    const level = LEVELS[this.currentLevelIndex];
    this.lives = GAME_CONFIG.TOTAL_LIVES;
    this.hitCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.levelStartTime = this.time.now;

    this.levelNameText.setText(level.name);
    this.levelNameText.setColor(level.matrixColor);

    this.scoreText.setText(`SCORE: ${this.score}`);
    this.updateLivesIcons();
    this.updateProgressBar();

    this.rhythmBar.setSpeed(level.speed);
    this.rhythmBar.setSpawnInterval(level.spawnInterval);
    this.rhythmBar.setColor(level.matrixColor);
    this.rhythmBar.setTotalNotes(level.totalNotes);
    this.rhythmBar.reset();

    this.gameState = 'playing';
  }

  private startNextLevel(): void {
    this.currentLevelIndex++;
    this.startLevel();
  }

  private completeLevel(): void {
    const level = LEVELS[this.currentLevelIndex];
    this.totalHitsAllLevels += this.hitCount;
    this.totalNotesAllLevels += level.totalNotes;
    this.totalMaxCombo = Math.max(this.totalMaxCombo, this.maxCombo);
    this.gameState = 'levelComplete';
    this.createLevelCompleteScreen();
  }

  private resetGame(): void {
    this.currentLevelIndex = 0;
    this.score = 0;
    this.lives = GAME_CONFIG.TOTAL_LIVES;
    this.combo = 0;
    this.maxCombo = 0;
    this.hitCount = 0;
    this.totalHitsAllLevels = 0;
    this.totalNotesAllLevels = 0;
    this.totalMaxCombo = 0;
    this.rhythmBar.reset();
    this.updateLivesIcons();
    this.updateProgressBar();
  }

  private handleNoteHit(_note: Note): void {
    this.hitCount++;
    this.score += 10 + this.combo;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    this.scoreText.setText(`SCORE: ${this.score}`);
    this.updateProgressBar();
    this.playHitSound();

    if (this.combo > 0 && this.combo % GAME_CONFIG.COMBO_MILESTONE === 0) {
      this.showCombo();
      this.playComboSound(this.combo);
    }

    const level = LEVELS[this.currentLevelIndex];
    if (this.hitCount >= level.totalNotes && this.rhythmBar.isAllNotesProcessed()) {
      this.time.delayedCall(500, () => this.completeLevel());
    }
  }

  private handleNoteMiss(): void {
    this.loseLife();
  }

  private handleWrongKey(): void {
    this.combo = 0;
    this.playMissSound();
  }

  private loseLife(): void {
    this.lives--;
    this.combo = 0;
    this.updateLivesIcons();
    this.playMissSound();

    if (this.lives <= 0) {
      this.totalHitsAllLevels += this.hitCount;
      const level = LEVELS[this.currentLevelIndex];
      const processed = this.rhythmBar.getNotesSpawned();
      this.totalNotesAllLevels += Math.max(processed, this.hitCount);
      this.totalMaxCombo = Math.max(this.totalMaxCombo, this.maxCombo);
      this.gameState = 'gameOver';
      this.createGameOverScreen();
    }
  }

  private showCombo(): void {
    const displayCombo = Math.min(this.combo, GAME_CONFIG.MAX_COMBO_DISPLAY);
    this.comboText.setText(`${displayCombo}x COMBO`);

    let color = '#00ff00';
    if (displayCombo >= 30) color = '#ff3333';
    else if (displayCombo >= 15) color = '#ffff00';

    this.comboText.setColor(color);
    this.comboText.setAlpha(1);
    this.comboText.setScale(0.5);

    this.tweens.add({
      targets: this.comboText,
      scale: { from: 0.5, to: 1.2 },
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: { from: 1, to: 0 },
          scale: { from: 1.2, to: 0.8 },
          duration: 1300,
          delay: 0,
          ease: 'Linear'
        });
      }
    });
  }

  public update(time: number, delta: number): void {
    if (this.gameState === 'playing') {
      this.matrixTimer += delta;
      if (this.matrixTimer >= GAME_CONFIG.MATRIX_ROW_INTERVAL) {
        this.spawnMatrixRow();
        this.matrixTimer = 0;
      }
      this.cleanupMatrixRows();

      this.rhythmBar.update(time, delta);

      const level = LEVELS[this.currentLevelIndex];
      if (this.rhythmBar.getNotesSpawned() >= level.totalNotes && this.rhythmBar.isAllNotesProcessed()) {
        this.completeLevel();
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.gameWidth = gameSize.width;
    this.gameHeight = gameSize.height;
    this.centerX = this.gameWidth / 2;
    this.centerY = this.gameHeight / 2;

    if (this.rhythmBar) {
      this.rhythmBar.x = this.centerX;
      this.rhythmBar.y = this.gameHeight - GAME_CONFIG.BAR_BOTTOM_OFFSET;
      this.rhythmBar.resize(this.gameWidth * 0.8);
    }

    if (this.levelNameText) {
      this.levelNameText.x = this.centerX;
    }

    if (this.progressBg) {
      this.progressBg.x = this.centerX;
    }

    if (this.progressBar) {
      this.updateProgressBar();
    }

    if (this.comboText) {
      this.comboText.x = this.centerX;
      this.comboText.y = this.centerY;
    }

    if (this.scoreText) {
      this.scoreText.x = 30;
      this.scoreText.y = 30;
    }

    this.createLivesIcons();
  }
}
