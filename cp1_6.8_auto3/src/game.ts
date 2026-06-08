import { Player } from './player';
import { Obstacle, ObstacleType } from './obstacle';
import { BPMAnalyzer } from './bpm';
import { Difficulty, GameState, JudgeResult, GameStats, FloatingText, BackgroundParticle } from './types';

interface DifficultyConfig {
  baseSpeed: number;
  perfectWindow: number;
  goodWindow: number;
  startLives: number;
  beatMultiplier: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    baseSpeed: 5,
    perfectWindow: 120,
    goodWindow: 200,
    startLives: 5,
    beatMultiplier: 1,
  },
  normal: {
    baseSpeed: 7,
    perfectWindow: 100,
    goodWindow: 150,
    startLives: 3,
    beatMultiplier: 1,
  },
  hard: {
    baseSpeed: 9,
    perfectWindow: 80,
    goodWindow: 120,
    startLives: 2,
    beatMultiplier: 0.5,
  },
};

interface BossZone {
  startTime: number;
  endTime: number;
  active: boolean;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private obstacles: Obstacle[] = [];
  private bpmAnalyzer: BPMAnalyzer;
  private state: GameState = 'menu';
  private difficulty: Difficulty = 'normal';
  private stats: GameStats;
  private lastTime: number = 0;
  private animationId: number = 0;
  private gameTime: number = 0;
  private currentSpeed: number = 0;
  private groundY: number = 0;
  private playerX: number = 0;
  private beats: number[] = [];
  private currentBeatIndex: number = 0;
  private bpm: number = 120;
  private audioDuration: number = 0;
  private nextObstacleBeat: number = 0;
  private difficultyLevel: number = 1;
  private lastDifficultyIncrease: number = 0;
  private perfectWindow: number = 100;
  private goodWindow: number = 150;
  private floatingTexts: FloatingText[] = [];
  private bgParticles: BackgroundParticle[] = [];
  private isPortrait: boolean = false;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private visualizerData: number[] = [];
  private visualizerBars: number = 64;
  private hueShift: number = 0;
  private bossZones: BossZone[] = [];
  private currentBossZone: number = -1;
  private onStateChange?: (state: GameState) => void;
  private onStatsUpdate?: (stats: GameStats) => void;
  private onBPMUpdate?: (bpm: number, progress: number) => void;
  private lastActionTime: number = -9999;
  private beatMultiplier: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.bpmAnalyzer = new BPMAnalyzer();
    this.stats = this.createInitialStats();

    this.resize();
    this.player = new Player(this.playerX, this.groundY);
    this.initBgParticles();
  }

  private createInitialStats(): GameStats {
    const config = DIFFICULTY_CONFIGS[this.difficulty];
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      lives: config.startLives,
    };
  }

  private initBgParticles(): void {
    this.bgParticles = [];
    for (let i = 0; i < 50; i++) {
      this.bgParticles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        alpha: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 360,
      });
    }
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    const config = DIFFICULTY_CONFIGS[difficulty];
    this.currentSpeed = config.baseSpeed;
    this.perfectWindow = config.perfectWindow;
    this.goodWindow = config.goodWindow;
    this.beatMultiplier = config.beatMultiplier;
    this.stats.lives = config.startLives;
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  setOnStatsUpdate(callback: (stats: GameStats) => void): void {
    this.onStatsUpdate = callback;
  }

  setOnBPMUpdate(callback: (bpm: number, progress: number) => void): void {
    this.onBPMUpdate = callback;
  }

  getBPMAnalyzer(): BPMAnalyzer {
    return this.bpmAnalyzer;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getState(): GameState {
    return this.state;
  }

  async loadAudioFile(file: File): Promise<{ bpm: number; duration: number }> {
    const result = await this.bpmAnalyzer.loadAudioFromFile(file);
    this.processBeats(result);
    return { bpm: result.bpm, duration: result.duration };
  }

  async loadAudioFromUrl(url: string): Promise<{ bpm: number; duration: number }> {
    const result = await this.bpmAnalyzer.loadAudioFromUrl(url);
    this.processBeats(result);
    return { bpm: result.bpm, duration: result.duration };
  }

  setupDemo(bpm: number = 120, duration: number = 60): void {
    this.bpm = bpm;
    this.audioDuration = duration;
    this.beats = this.bpmAnalyzer.generateEvenBeats(bpm, duration);
    this.generateBossZones(duration);
    (this.bpmAnalyzer as any).setupDemoBuffer(bpm, duration);
  }

  private processBeats(result: { beats: number[]; bpm: number; duration: number }): void {
    this.beats = result.beats;
    this.bpm = result.bpm;
    this.audioDuration = result.duration;

    if (this.beats.length < 10) {
      this.beats = this.bpmAnalyzer.generateEvenBeats(this.bpm, this.audioDuration);
    }

    this.generateBossZones(result.duration);
  }

  private generateBossZones(duration: number): void {
    this.bossZones = [];
    const zoneDuration = duration * 0.1;
    const starts = [duration * 0.25, duration * 0.5, duration * 0.75];

    for (const start of starts) {
      this.bossZones.push({
        startTime: start,
        endTime: start + zoneDuration,
        active: false,
      });
    }
  }

  start(): void {
    if (!this.bpmAnalyzer.isAudioLoaded()) {
      console.warn('No audio loaded');
      return;
    }

    this.resetGame();
    this.state = 'playing';
    this.bpmAnalyzer.play();
    this.lastTime = performance.now();
    this.gameLoop();

    if (this.onStateChange) {
      this.onStateChange('playing');
    }
  }

  private resetGame(): void {
    const config = DIFFICULTY_CONFIGS[this.difficulty];
    this.stats = this.createInitialStats();
    this.obstacles = [];
    this.floatingTexts = [];
    this.gameTime = 0;
    this.currentBeatIndex = 0;
    this.nextObstacleBeat = 0;
    this.difficultyLevel = 1;
    this.lastDifficultyIncrease = 0;
    this.currentSpeed = config.baseSpeed;
    this.perfectWindow = config.perfectWindow;
    this.goodWindow = config.goodWindow;
    this.currentBossZone = -1;
    this.player.reset(this.groundY);
    this.hueShift = 0;
    this.lastActionTime = -9999;
  }

  pause(): void {
    if (this.state !== 'playing') return;

    this.state = 'paused';
    this.bpmAnalyzer.pause();
    cancelAnimationFrame(this.animationId);

    if (this.onStateChange) {
      this.onStateChange('paused');
    }
  }

  resume(): void {
    if (this.state !== 'paused') return;

    this.state = 'playing';
    this.bpmAnalyzer.play();
    this.lastTime = performance.now();
    this.gameLoop();

    if (this.onStateChange) {
      this.onStateChange('playing');
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.bpmAnalyzer.stop();
    cancelAnimationFrame(this.animationId);
    this.saveScore();

    if (this.onStateChange) {
      this.onStateChange('gameover');
    }
  }

  private saveScore(): void {
    try {
      const scores: { score: number; date: string }[] = JSON.parse(
        localStorage.getItem('rhythmRunnerScores') || '[]'
      );

      scores.push({
        score: this.stats.score,
        date: new Date().toLocaleDateString(),
      });

      scores.sort((a, b) => b.score - a.score);
      const topScores = scores.slice(0, 10);

      localStorage.setItem('rhythmRunnerScores', JSON.stringify(topScores));
    } catch (e) {
      console.warn('Failed to save score:', e);
    }
  }

  static getHighScores(): { score: number; date: string }[] {
    try {
      return JSON.parse(localStorage.getItem('rhythmRunnerScores') || '[]');
    } catch (e) {
      return [];
    }
  }

  jump(): void {
    if (this.state !== 'playing') return;
    if (this.player.jump()) {
      this.judgeAction();
    }
  }

  slide(): void {
    if (this.state !== 'playing') return;
    if (this.player.slide()) {
      this.judgeAction();
    }
  }

  private judgeAction(): JudgeResult {
    const currentTime = this.bpmAnalyzer.getCurrentTime();
    this.lastActionTime = currentTime;

    let nearestBeat: number | null = null;
    let minDiff = Infinity;

    for (let i = Math.max(0, this.currentBeatIndex - 2); i < this.beats.length && i < this.currentBeatIndex + 5; i++) {
      const diff = Math.abs(this.beats[i] - currentTime) * 1000;
      if (diff < minDiff) {
        minDiff = diff;
        nearestBeat = this.beats[i];
      }
    }

    if (nearestBeat === null) return null;

    const diffMs = minDiff;
    let result: JudgeResult = null;

    if (diffMs <= this.perfectWindow) {
      result = 'perfect';
    } else if (diffMs <= this.goodWindow) {
      result = 'good';
    }

    return result;
  }

  private gameLoop = (): void => {
    if (this.state !== 'playing') return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    const audioTime = this.bpmAnalyzer.getCurrentTime();
    this.gameTime = audioTime;

    this.updateDifficulty();
    this.updateBossZones();
    this.spawnObstacles();

    const effectiveSpeed = this.currentSpeed * (this.isInBossZone() ? 1.5 : 1);

    this.player.update(deltaTime, effectiveSpeed);

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime, effectiveSpeed, this.groundY);
    }

    this.obstacles = this.obstacles.filter(o => !o.isOffScreen());

    this.checkCollisions();
    this.updateFloatingTexts(deltaTime);
    this.updateBgParticles(deltaTime, effectiveSpeed);
    this.updateVisualizer();
    this.hueShift = (this.hueShift + 0.5) % 360;

    const progress = this.audioDuration > 0 ? (this.gameTime / this.audioDuration) * 100 : 0;
    if (this.onBPMUpdate) {
      this.onBPMUpdate(this.bpm, progress);
    }

    if (this.gameTime >= this.audioDuration) {
      this.gameOver();
    }
  }

  private updateDifficulty(): void {
    const timeSinceIncrease = this.gameTime - this.lastDifficultyIncrease;
    if (timeSinceIncrease >= 30) {
      this.difficultyLevel++;
      this.lastDifficultyIncrease = this.gameTime;

      this.currentSpeed *= 1.1;
      this.perfectWindow *= 0.95;
      this.goodWindow *= 0.95;
    }
  }

  private updateBossZones(): void {
    for (let i = 0; i < this.bossZones.length; i++) {
      const zone = this.bossZones[i];
      if (this.gameTime >= zone.startTime && this.gameTime <= zone.endTime) {
        if (!zone.active) {
          zone.active = true;
          this.currentBossZone = i;
        }
      } else if (zone.active) {
        zone.active = false;
        if (this.currentBossZone === i) {
          this.currentBossZone = -1;
        }
      }
    }
  }

  private isInBossZone(): boolean {
    return this.currentBossZone >= 0;
  }

  private spawnObstacles(): void {
    const audioTime = this.bpmAnalyzer.getCurrentTime();
    const lookAhead = 2;

    while (
      this.currentBeatIndex < this.beats.length &&
      this.beats[this.currentBeatIndex] < audioTime - 0.5
    ) {
      this.currentBeatIndex++;
    }

    const beatInterval = this.beats.length > 1
      ? (this.beats[this.beats.length - 1] - this.beats[0]) / (this.beats.length - 1)
      : 0.5;

    const beatsPerObstacle = Math.max(1, Math.floor(1 / this.beatMultiplier));

    for (let i = this.currentBeatIndex; i < this.beats.length; i++) {
      const beatTime = this.beats[i];
      if (beatTime > audioTime + lookAhead) break;

      if (i % beatsPerObstacle !== 0) continue;

      const shouldSpawn = !this.obstacles.some(o => Math.abs(o.beatTime - beatTime) < beatInterval * 0.5);
      if (!shouldSpawn) continue;

      const spawnX = this.canvasWidth + 50;
      const isBoss = this.isInBossZone();
      const type = this.getRandomObstacleType(isBoss);

      const obstacle = new Obstacle(spawnX, this.groundY, type, beatTime, isBoss);
      this.obstacles.push(obstacle);
    }

    if (this.isInBossZone() && this.beats.length > 0) {
      const extraChance = 0.3;
      for (let i = this.currentBeatIndex; i < this.beats.length; i++) {
        const beatTime = this.beats[i];
        if (beatTime > audioTime + lookAhead) break;
        if (Math.random() > extraChance) continue;

        const hasObstacle = this.obstacles.some(o => Math.abs(o.beatTime - beatTime) < 0.1);
        if (hasObstacle) continue;

        const spawnX = this.canvasWidth + 50;
        const type = this.getRandomObstacleType(true);
        const obstacle = new Obstacle(spawnX, this.groundY, type, beatTime, true);
        this.obstacles.push(obstacle);
      }
    }
  }

  private getRandomObstacleType(isBoss: boolean): ObstacleType {
    const types: ObstacleType[] = ['low', 'high', 'wall'];
    if (isBoss) {
      types.push('double');
    }

    const weights = isBoss
      ? [0.35, 0.35, 0.2, 0.1]
      : [0.4, 0.35, 0.25, 0];

    let rand = Math.random();
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return types[i];
    }

    return 'low';
  }

  private checkCollisions(): void {
    const playerBounds = this.player.getBounds();

    for (const obstacle of this.obstacles) {
      if (obstacle.scored) continue;

      if (obstacle.checkNoteCollision(playerBounds)) {
        obstacle.collectNote();
        this.addScore(50);
        this.addFloatingText(this.player.x + 50, this.player.y, '+50', '#ff0088');
      }

      if (obstacle.checkCollision(playerBounds)) {
        this.handleMiss(obstacle);
        obstacle.scored = true;
        continue;
      }

      if (obstacle.x + obstacle.width < this.player.x && !obstacle.scored) {
        const judge = this.getPassJudgement(obstacle);
        this.handlePass(obstacle, judge);
        obstacle.scored = true;
      }
    }
  }

  private getPassJudgement(obstacle: Obstacle): JudgeResult {
    const audioTime = this.bpmAnalyzer.getCurrentTime();
    const timeSinceAction = audioTime - this.lastActionTime;

    if (timeSinceAction > 0.5 || timeSinceAction < -0.5) {
      return 'miss';
    }

    const diffMs = Math.abs(this.lastActionTime - obstacle.beatTime) * 1000;

    if (diffMs <= this.perfectWindow) {
      return 'perfect';
    } else if (diffMs <= this.goodWindow) {
      return 'good';
    }

    return 'miss';
  }

  private handlePass(obstacle: Obstacle, judge: JudgeResult): void {
    if (judge === 'perfect') {
      this.stats.perfect++;
      this.stats.combo++;
      this.addScore(100 + 50);
      this.addFloatingText(this.player.x + 60, this.player.y - 20, 'Perfect!', '#00ff88');
    } else if (judge === 'good') {
      this.stats.good++;
      this.stats.combo++;
      this.addScore(100);
      this.addFloatingText(this.player.x + 60, this.player.y - 20, 'Good', '#ffcc00');
    } else {
      this.stats.miss++;
      this.stats.combo = 0;
      this.addFloatingText(this.player.x + 60, this.player.y - 20, 'Miss', '#ff4444');
    }

    if (this.stats.combo > 0 && this.stats.combo % 5 === 0 && judge === 'perfect') {
      this.addScore(200);
      this.addFloatingText(this.player.x + 80, this.player.y - 40, `+200 Combo!`, '#ff0088');
    }

    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    this.notifyStatsUpdate();
  }

  private handleMiss(obstacle: Obstacle): void {
    this.stats.miss++;
    this.stats.combo = 0;
    this.stats.lives--;

    this.addFloatingText(this.player.x + 30, this.player.y, 'Miss!', '#ff4444');

    this.notifyStatsUpdate();

    if (this.stats.lives <= 0) {
      this.gameOver();
    }
  }

  private addScore(points: number): void {
    this.stats.score += points;
    this.notifyStatsUpdate();
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1,
      maxLife: 1,
      scale: 1.5,
      vy: -2,
    });
  }

  private updateFloatingTexts(deltaTime: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.vy += 0.05;
      ft.life -= deltaTime;
      ft.scale = 1 + (ft.life / ft.maxLife) * 0.5;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateBgParticles(deltaTime: number, speed: number): void {
    for (const p of this.bgParticles) {
      p.x -= speed * p.speed * 0.3;
      p.hue = (p.hue + 0.2) % 360;

      if (p.x < -10) {
        p.x = this.canvasWidth + 10;
        p.y = Math.random() * this.canvasHeight;
      }
    }
  }

  private updateVisualizer(): void {
    const freqData = this.bpmAnalyzer.getFrequencyData();
    if (!freqData) return;

    this.visualizerData = [];
    const step = Math.floor(freqData.length / this.visualizerBars);

    for (let i = 0; i < this.visualizerBars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += freqData[i * step + j] || 0;
      }
      this.visualizerData.push(sum / step / 255);
    }
  }

  private notifyStatsUpdate(): void {
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    this.isPortrait = containerWidth < 768;

    let targetWidth: number;
    let targetHeight: number;

    if (this.isPortrait) {
      const aspect = 9 / 16;
      targetWidth = containerWidth;
      targetHeight = containerWidth / aspect;
      if (targetHeight > containerHeight) {
        targetHeight = containerHeight;
        targetWidth = targetHeight * aspect;
      }
    } else {
      const aspect = 16 / 9;
      targetHeight = containerHeight;
      targetWidth = containerHeight * aspect;
      if (targetWidth > containerWidth) {
        targetWidth = containerWidth;
        targetHeight = targetWidth / aspect;
      }
    }

    const maxWidth = 1920;
    const maxHeight = 1080;
    if (targetWidth > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = targetWidth / (this.isPortrait ? 9 / 16 : 16 / 9);
    }
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = targetHeight * (this.isPortrait ? 9 / 16 : 16 / 9);
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = targetWidth * dpr;
    this.canvas.height = targetHeight * dpr;
    this.canvas.style.width = targetWidth + 'px';
    this.canvas.style.height = targetHeight + 'px';

    this.ctx.scale(dpr, dpr);

    this.canvasWidth = targetWidth;
    this.canvasHeight = targetHeight;

    this.groundY = this.canvasHeight * 0.8;
    this.playerX = this.canvasWidth * 0.15;

    if (this.player) {
      this.player.resize(this.playerX, this.groundY);
    }

    this.initBgParticles();
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawBackground();
    this.drawVisualizer();
    this.drawGround();

    for (const obstacle of this.obstacles) {
      obstacle.draw(this.ctx);
    }

    this.player.draw(this.ctx);
    this.drawFloatingTexts();

    if (this.isInBossZone()) {
      this.drawBossWarning();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1040');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (const p of this.bgParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawVisualizer(): void {
    if (this.visualizerData.length === 0) return;

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight * 0.35;
    const baseRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.1;
    const barCount = this.visualizerData.length;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const value = this.visualizerData[i];
      const barLength = baseRadius + value * baseRadius * 0.8;

      const hue = (i / barCount) * 360 + this.hueShift;
      this.ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      this.ctx.shadowBlur = 10;

      const x1 = centerX + Math.cos(angle) * baseRadius * 0.5;
      const y1 = centerY + Math.sin(angle) * baseRadius * 0.5;
      const x2 = centerX + Math.cos(angle) * barLength;
      const y2 = centerY + Math.sin(angle) * barLength;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawGround(): void {
    const gradient = this.ctx.createLinearGradient(0, this.groundY, 0, this.canvasHeight);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
    gradient.addColorStop(1, 'rgba(26, 16, 64, 0.5)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);

    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.canvasWidth, this.groundY);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
  }

  private drawFloatingTexts(): void {
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 10;
      this.ctx.font = `bold ${18 * ft.scale}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }

  private drawBossWarning(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;

    const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, 0);
    gradient.addColorStop(0, 'rgba(255, 0, 136, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 136, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 0, 136, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = '#ff0088';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#ff0088';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('⚡ BOSS ZONE ⚡', this.canvasWidth / 2, 80);

    this.ctx.restore();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.bpmAnalyzer.dispose();
  }
}
