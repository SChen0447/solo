import { AudioAnalyzer, AudioData } from './AudioAnalyzer';
import { Bird } from './Bird';
import { TrackManager, NoteFragment, Obstacle } from './TrackManager';

export type GameState = 'menu' | 'playing' | 'gameover';

export interface GameStats {
  score: number;
  lives: number;
  fps: number;
  state: GameState;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioAnalyzer: AudioAnalyzer;
  private bird: Bird;
  private trackManager: TrackManager;
  private state: GameState = 'menu';
  private score: number = 0;
  private lives: number = 3;
  private maxLives: number = 3;
  private lastTime: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;
  private fps: number = 60;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;
  private scoreBounceTime: number = 0;
  private onStatsChange?: (stats: GameStats) => void;
  private centerX: number;
  private centerY: number;
  private invincibleTime: number = 0;
  private collectAnimationTime: number = 0;
  private collectedFragment: NoteFragment | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;

    this.audioAnalyzer = new AudioAnalyzer();
    const baseRadii = [150, 250, 350];
    this.bird = new Bird(this.centerX, this.centerY, baseRadii);
    this.trackManager = new TrackManager(this.centerX, this.centerY, canvas.width, canvas.height);
  }

  public setStatsCallback(callback: (stats: GameStats) => void): void {
    this.onStatsChange = callback;
  }

  public async init(): Promise<void> {
    await this.audioAnalyzer.init();
  }

  public start(): void {
    this.state = 'playing';
    this.score = 0;
    this.lives = this.maxLives;
    this.invincibleTime = 0;
    this.scoreBounceTime = 0;
    this.bird.reset(this.centerX, this.centerY);
    this.trackManager.reset(this.centerX, this.centerY);
    this.audioAnalyzer.start();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsTimer = this.lastTime;
    this.fpsCounter = 0;
    this.gameLoop();
    this.notifyStats();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.audioAnalyzer.stop();
  }

  public handleInput(): void {
    if (this.state === 'playing') {
      this.bird.switchTrack();
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getScore(): number {
    return this.score;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.05) dt = 0.05;

    this.fpsCounter++;
    if (now - this.fpsTimer >= 1000) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = now;
      this.notifyStats();
    }

    if (this.state === 'playing') {
      this.update(dt, now);
    }

    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number, now: number): void {
    const audioData: AudioData = this.audioAnalyzer.analyze();

    const radiusOffset = this.trackManager.getRadiusOffset(this.bird.trackIndex);

    this.bird.update(dt, audioData.beatDetected ? 1 : audioData.overallEnergy, radiusOffset);

    this.trackManager.update(
      dt,
      audioData.overallEnergy,
      audioData.highEnergy,
      audioData.beatDetected,
      audioData.bassEnergy,
      now
    );

    this.checkFragmentCollisions();

    if (this.invincibleTime > 0) {
      this.invincibleTime -= dt;
    } else {
      this.checkObstacleCollisions();
    }

    if (this.scoreBounceTime > 0) {
      this.scoreBounceTime -= dt;
    }

    if (this.collectAnimationTime > 0) {
      this.collectAnimationTime -= dt;
    }
  }

  private checkFragmentCollisions(): void {
    const birdX = this.bird.x;
    const birdY = this.bird.y;
    const hitRadius = this.bird.getHitboxRadius();

    for (let i = this.trackManager.noteFragments.length - 1; i >= 0; i--) {
      const frag = this.trackManager.noteFragments[i];
      if (frag.collected) {
        this.trackManager.noteFragments.splice(i, 1);
        continue;
      }

      const pos = this.trackManager.getFragmentPosition(frag);
      const dx = birdX - pos.x;
      const dy = birdY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius + frag.size * 0.6) {
        this.trackManager.collectFragment(frag);
        this.score += 1;
        this.scoreBounceTime = 0.2;
        this.collectAnimationTime = 0.3;
        this.collectedFragment = frag;
        this.trackManager.noteFragments.splice(i, 1);
        this.notifyStats();
      }
    }
  }

  private checkObstacleCollisions(): void {
    const hit = this.trackManager.checkObstacleCollision(
      this.bird.x,
      this.bird.y,
      this.bird.getHitboxRadius()
    );

    if (hit) {
      this.lives--;
      this.bird.triggerHitFlash();
      this.invincibleTime = 1.5;
      this.notifyStats();

      if (this.lives <= 0) {
        this.gameOver();
      }
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.audioAnalyzer.stop();
    this.notifyStats();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const bgGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 50,
      this.centerX, this.centerY, Math.max(w, h) * 0.7
    );
    bgGradient.addColorStop(0, '#2a1050');
    bgGradient.addColorStop(0.5, '#1a0a2e');
    bgGradient.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    this.trackManager.render(ctx);
    this.bird.render(ctx);
    this.renderUI(ctx);
  }

  private renderUI(ctx: CanvasRenderingContext2D): void {
    this.renderLives(ctx);
    this.renderScore(ctx);
  }

  private renderLives(ctx: CanvasRenderingContext2D): void {
    const padding = 25;
    const heartSize = 28;
    const heartSpacing = 42;

    for (let i = 0; i < this.maxLives; i++) {
      const x = padding + i * heartSpacing + heartSize / 2;
      const y = padding + heartSize / 2;
      const pulse = Math.sin(performance.now() / 250 + i * 0.8) * 0.1 + 1;
      const active = i < this.lives;
      this.drawHeart(ctx, x, y, heartSize * pulse, active);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, active: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 30, size / 30);

    ctx.shadowColor = active ? '#FF0066' : '#444444';
    ctx.shadowBlur = active ? 20 : 5;

    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(0, -4, -14, -4, -14, 6);
    ctx.bezierCurveTo(-14, 14, 0, 20, 0, 26);
    ctx.bezierCurveTo(0, 20, 14, 14, 14, 6);
    ctx.bezierCurveTo(14, -4, 0, -4, 0, 6);
    ctx.closePath();

    if (active) {
      const grad = ctx.createRadialGradient(0, 8, 2, 0, 8, 15);
      grad.addColorStop(0, '#FF99BB');
      grad.addColorStop(0.5, '#FF3366');
      grad.addColorStop(1, '#CC0044');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = 'rgba(60, 30, 50, 0.5)';
    }
    ctx.fill();

    ctx.strokeStyle = active ? '#FFCCDD' : 'rgba(100, 60, 90, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private renderScore(ctx: CanvasRenderingContext2D): void {
    const padding = 25;
    const scoreText = this.score.toString();
    let fontSize = 36;

    if (this.scoreBounceTime > 0) {
      const t = 1 - this.scoreBounceTime / 0.2;
      fontSize = 36 + Math.sin(t * Math.PI) * 18;
    }

    ctx.save();
    ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';

    ctx.fillText(scoreText, this.canvas.width - padding, padding);

    ctx.font = `14px 'Segoe UI', Arial, sans-serif`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(200, 180, 255, 0.8)';
    ctx.fillText('得分', this.canvas.width - padding, padding + fontSize + 8);

    ctx.restore();
  }

  private notifyStats(): void {
    if (this.onStatsChange) {
      this.onStatsChange({
        score: this.score,
        lives: this.lives,
        fps: this.fps,
        state: this.state
      });
    }
  }

  public renderIdle(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const bgGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 50,
      this.centerX, this.centerY, Math.max(w, h) * 0.7
    );
    bgGradient.addColorStop(0, '#2a1050');
    bgGradient.addColorStop(0.5, '#1a0a2e');
    bgGradient.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    const time = performance.now() * 0.001;
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + time * 0.1;
      const radius = 80 + (i % 5) * 70 + Math.sin(time + i) * 20;
      const sx = this.centerX + Math.cos(angle) * radius;
      const sy = this.centerY + Math.sin(angle) * radius;
      const twinkle = (Math.sin(time * 3 + i) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = 0.3 + twinkle * 0.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 8 * twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const previewRadii = [150, 250, 350];
    for (let i = 0; i < previewRadii.length; i++) {
      const hue = (time * 30 + i * 120) % 360;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, previewRadii[i], 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.25)`;
      ctx.lineWidth = 8;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 25;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, previewRadii[i], 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.6)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    const birdAngle = time * 0.8;
    const birdRadius = previewRadii[1];
    const bx = this.centerX + Math.cos(birdAngle) * birdRadius;
    const by = this.centerY + Math.sin(birdAngle) * birdRadius;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(birdAngle + Math.PI / 2);

    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
    glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(138, 43, 226, 0.2)');
    glowGrad.addColorStop(1, 'rgba(138, 43, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    const wingFlap = Math.sin(time * 10) * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(-14, -5 + wingFlap * 10, -22, 4 + wingFlap * 8);
    ctx.quadraticCurveTo(-9, 2, 0, 11);
    ctx.quadraticCurveTo(9, 2, 22, 4 + wingFlap * 8);
    ctx.quadraticCurveTo(14, -5 + wingFlap * 10, 0, -18);
    ctx.closePath();

    const birdGrad = ctx.createLinearGradient(0, -18, 0, 11);
    birdGrad.addColorStop(0, '#00ffff');
    birdGrad.addColorStop(0.5, '#8a2be2');
    birdGrad.addColorStop(1, '#ff69b4');
    ctx.fillStyle = birdGrad;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  }
}
