import { AudioEngine } from './audioEngine';
import { Player } from './player';
import { Renderer, Platform, Obstacle, Star } from './renderer';

type JudgementType = 'perfect' | 'good' | 'ok' | 'miss';

interface JudgementDisplay {
  type: JudgementType;
  x: number;
  y: number;
  timer: number;
}

const CONFIG = {
  INITIAL_LIVES: 3,
  GRAVITY: 0.7,
  JUMP_FORCE: -13,
  SCROLL_SPEED: 5,
  JUDGE_PERFECT: 50,
  JUDGE_GOOD: 100,
  JUDGE_OK: 150,
  SCORE_PERFECT: 300,
  SCORE_GOOD: 150,
  SCORE_OK: 50,
  SCORE_STAR: 100,
  OBSTACLE_MIN_BEATS: 4,
  OBSTACLE_MAX_BEATS: 8,
  STAR_SPAWN_CHANCE: 0.3,
  PERFECT_FLASH_DURATION: 9
};

export class GameScene {
  private audioEngine: AudioEngine;
  private player: Player;
  private renderer: Renderer;
  private platforms: Platform[] = [];
  private obstacles: Obstacle[] = [];
  private stars: Star[] = [];
  private judgements: JudgementDisplay[] = [];

  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private scrollX: number = 0;
  private lastProcessedBeat: number = -1;
  private nextObstacleBeat: number = 0;
  private isRunning: boolean = false;
  private perfectFlashTimer: number = 0;
  private onGameOverCallback: ((score: number, maxCombo: number) => void) | null = null;

  private playerX: number = 0;
  private playerBaseY: number = 0;
  private centerX: number = 0;

  constructor(audioEngine: AudioEngine, player: Player, renderer: Renderer) {
    this.audioEngine = audioEngine;
    this.player = player;
    this.renderer = renderer;
  }

  setGameOverCallback(callback: (score: number, maxCombo: number) => void): void {
    this.onGameOverCallback = callback;
  }

  init(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.scrollX = 0;
    this.lastProcessedBeat = -1;
    this.nextObstacleBeat = CONFIG.OBSTACLE_MIN_BEATS;
    this.perfectFlashTimer = 0;
    this.platforms = [];
    this.obstacles = [];
    this.stars = [];
    this.judgements = [];
    this.isRunning = false;

    this.playerX = this.renderer.width / 3;
    this.centerX = this.renderer.width / 2;
    this.playerBaseY = this.renderer.height * 0.7;

    this.player.gravity = CONFIG.GRAVITY;
    this.player.jumpForce = CONFIG.JUMP_FORCE;
    this.player.setPosition(this.playerX, this.playerBaseY);
    this.player.reset();
  }

  start(): void {
    this.init();
    this.isRunning = true;
    this.audioEngine.play();
  }

  stop(): void {
    this.isRunning = false;
    this.audioEngine.pause();
  }

  handleBeatInput(): void {
    if (!this.isRunning) return;

    const currentTime = this.audioEngine.getCurrentTime();
    const beatTimestamps = this.audioEngine.getBeatTimestamps();
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = Math.max(0, this.lastProcessedBeat); i < beatTimestamps.length; i++) {
      const diff = Math.abs(currentTime - beatTimestamps[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
      if (beatTimestamps[i] > currentTime + CONFIG.JUDGE_OK / 1000) break;
    }

    if (closestIndex >= 0 && minDiff * 1000 <= CONFIG.JUDGE_OK) {
      const platform = this.platforms.find(p => p.beatIndex === closestIndex);
      if (platform && !platform.hit) {
        platform.hit = true;
        const diffMs = minDiff * 1000;
        this.applyJudgement(diffMs, platform);
      }
    }
  }

  handleJumpInput(): void {
    if (!this.isRunning) return;
    this.player.jump();
  }

  private applyJudgement(diffMs: number, platform: Platform): void {
    let type: JudgementType;
    let scoreAdd: number;

    if (diffMs <= CONFIG.JUDGE_PERFECT) {
      type = 'perfect';
      scoreAdd = CONFIG.SCORE_PERFECT;
      this.player.triggerPerfectFlash();
      this.perfectFlashTimer = CONFIG.PERFECT_FLASH_DURATION;
    } else if (diffMs <= CONFIG.JUDGE_GOOD) {
      type = 'good';
      scoreAdd = CONFIG.SCORE_GOOD;
    } else {
      type = 'ok';
      scoreAdd = CONFIG.SCORE_OK;
    }

    this.score += scoreAdd * (1 + Math.floor(this.combo / 10) * 0.1);
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    this.judgements.push({
      type,
      x: platform.x,
      y: platform.y - 60,
      timer: 30
    });

    if ((type === 'perfect' || type === 'good') && !platform.spawnedStar && Math.random() < CONFIG.STAR_SPAWN_CHANCE) {
      platform.spawnedStar = true;
      this.stars.push({
        x: platform.x,
        y: platform.y - 10,
        vy: -2,
        alpha: 1,
        collected: false
      });
    }
  }

  private handleMiss(beatIndex: number): void {
    const platform = this.platforms.find(p => p.beatIndex === beatIndex);
    if (platform && !platform.hit) {
      platform.hit = true;
      this.combo = 0;

      this.judgements.push({
        type: 'miss',
        x: this.playerX,
        y: this.playerBaseY - 80,
        timer: 30
      });

      const isDead = this.player.loseLife();
      if (isDead) {
        this.gameOver();
      }
    }
  }

  private gameOver(): void {
    this.stop();
    if (this.onGameOverCallback) {
      this.onGameOverCallback(Math.floor(this.score), this.maxCombo);
    }
  }

  update(_deltaTime: number): void {
    if (!this.isRunning) return;

    const currentTime = this.audioEngine.getCurrentTime();
    const beatTimestamps = this.audioEngine.getBeatTimestamps();

    if (currentTime >= this.audioEngine.getDuration()) {
      this.gameOver();
      return;
    }

    this.scrollX += CONFIG.SCROLL_SPEED;

    this.player.update(_deltaTime);

    const beatStatus = this.audioEngine.getBeatStatus();
    for (let i = this.lastProcessedBeat + 1; i <= beatStatus.currentBeatIndex; i++) {
      if (i >= 0 && i < beatTimestamps.length) {
        this.handleMiss(i);
        this.lastProcessedBeat = i;
      }
    }

    const beatsToProcess: number[] = [];
    for (let i = 0; i < beatTimestamps.length; i++) {
      const beatScreenX = this.timeToScreenX(beatTimestamps[i]);
      if (beatScreenX > -100 && beatScreenX < this.renderer.width + 200) {
        beatsToProcess.push(i);
      }
      if (beatScreenX > this.renderer.width + 200) break;
    }

    for (const beatIndex of beatsToProcess) {
      if (!this.platforms.find(p => p.beatIndex === beatIndex)) {
        this.platforms.push({
          x: this.timeToScreenX(beatTimestamps[beatIndex]),
          y: this.playerBaseY,
          beatIndex,
          hit: false,
          spawnedStar: false
        });
      }
    }

    for (const p of this.platforms) {
      p.x = this.timeToScreenX(beatTimestamps[p.beatIndex]);
    }
    this.platforms = this.platforms.filter(p => p.x > -200);

    if (beatStatus.currentBeatIndex >= this.nextObstacleBeat) {
      this.obstacles.push({
        x: this.renderer.width + 50,
        y: this.playerBaseY - 5,
        rotation: -10,
        rotationDir: 1,
        passed: false
      });
      const range = CONFIG.OBSTACLE_MAX_BEATS - CONFIG.OBSTACLE_MIN_BEATS + 1;
      this.nextObstacleBeat = beatStatus.currentBeatIndex + CONFIG.OBSTACLE_MIN_BEATS + Math.floor(Math.random() * range);
    }

    for (const o of this.obstacles) {
      o.x -= CONFIG.SCROLL_SPEED;
      o.rotation += o.rotationDir * 0.8;
      if (o.rotation > 10 || o.rotation < -10) {
        o.rotationDir *= -1;
      }

      if (!o.passed && Math.abs(o.x - this.playerX) < 18) {
        if (!this.player.isJumping || this.player.y > this.playerBaseY - 40) {
          o.passed = true;
          this.combo = 0;
          const isDead = this.player.loseLife();
          if (isDead) {
            this.gameOver();
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x > -50);

    for (const s of this.stars) {
      if (s.collected) continue;
      s.x -= CONFIG.SCROLL_SPEED;
      s.y += s.vy;
      s.vy += 0.05;
      s.alpha -= 0.008;

      if (Math.abs(s.x - this.playerX) < 20 && Math.abs(s.y - this.player.y) < 25) {
        s.collected = true;
        this.score += CONFIG.SCORE_STAR;
      }
    }
    this.stars = this.stars.filter(s => s.x > -50 && s.alpha > 0 && !s.collected);

    for (const j of this.judgements) {
      j.timer--;
      j.y -= 1;
    }
    this.judgements = this.judgements.filter(j => j.timer > 0);

    if (this.perfectFlashTimer > 0) {
      this.perfectFlashTimer--;
    }
  }

  private timeToScreenX(time: number): number {
    const currentTime = this.audioEngine.getCurrentTime();
    const centerTime = this.screenXToTime(this.centerX);
    const timeDiff = time - centerTime;
    const pixelsPerSecond = CONFIG.SCROLL_SPEED * 60;
    return this.centerX + timeDiff * pixelsPerSecond;
  }

  private screenXToTime(screenX: number): number {
    const currentTime = this.audioEngine.getCurrentTime();
    const pixelsPerSecond = CONFIG.SCROLL_SPEED * 60;
    const timeDiff = (screenX - this.playerX) / pixelsPerSecond;
    return currentTime + timeDiff;
  }

  render(): void {
    const beatStatus = this.audioEngine.getBeatStatus();
    const energy = this.audioEngine.getEnergyAt(beatStatus.currentBeatIndex);

    this.renderer.clear();
    this.renderer.drawTrack(energy, this.scrollX);
    this.renderer.drawBeatPlatforms(this.platforms, this.playerX);
    this.renderer.drawObstacles(this.obstacles);
    this.renderer.drawStars(this.stars);
    this.renderer.drawPlayer(this.player);

    for (const j of this.judgements) {
      this.renderer.drawJudgementText(j.type, j.x, j.y);
    }

    this.renderer.drawHUD(Math.floor(this.score), this.combo, this.player.lives, CONFIG.INITIAL_LIVES);

    if (this.perfectFlashTimer > 0) {
      this.renderer.drawPerfectFlash(this.perfectFlashTimer / CONFIG.PERFECT_FLASH_DURATION);
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}
