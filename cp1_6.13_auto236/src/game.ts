import * as Tone from 'tone';
import { TrailManager } from './trail';
import { ObstacleManager, Obstacle } from './obstacle';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  color: string;
  size: number;
  active: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
}

const PARTICLE_POOL_SIZE = 500;
const STAR_COUNT = 50;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trail: TrailManager;
  private obstacleManager: ObstacleManager;

  private particles: Particle[] = [];
  private particlePool: Particle[] = [];

  private stars: Star[] = [];

  private playerX: number = 0;
  private playerY: number = 0;
  private prevX: number = 0;
  private prevY: number = 0;
  private isDragging: boolean = false;
  private playerSpeed: number = 0;

  private controlPoints: { x: number; y: number }[] = [];
  private readonly CONTROL_POINT_COUNT = 20;

  private score: number = 0;
  private consecutiveHits: number = 0;
  private gameOver: boolean = false;
  private gameStartTime: number = 0;
  private elapsedTime: number = 0;

  private spawnInterval: number = 2000;
  private speedMultiplier: number = 1;

  private synth: Tone.Synth | null = null;
  private audioInitialized: boolean = false;

  private scoreCallback: ((score: number) => void) | null = null;
  private comboCallback: ((combo: number) => void) | null = null;
  private gameOverCallback: ((score: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.trail = new TrailManager();
    this.obstacleManager = new ObstacleManager();

    this.initParticlePool();
    this.initStars();
    this.initControlPoints();
    this.resize();
  }

  private initParticlePool(): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        age: 0, maxAge: 0.6,
        color: '', size: 3,
        active: false
      });
    }
  }

  private initStars(): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private initControlPoints(): void {
    this.controlPoints = [];
    for (let i = 0; i < this.CONTROL_POINT_COUNT; i++) {
      this.controlPoints.push({ x: 0, y: 0 });
    }
  }

  private initAudio(): void {
    if (this.audioInitialized) return;
    this.synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    this.audioInitialized = true;
  }

  private playCollisionSound(): void {
    if (!this.synth || !this.audioInitialized) return;
    const notes = ['C5', 'C#5', 'D5', 'D#5', 'E5'];
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.synth.triggerAttackRelease(note, 0.1);
  }

  setCallbacks(
    onScore: (score: number) => void,
    onCombo: (combo: number) => void,
    onGameOver: (score: number) => void
  ): void {
    this.scoreCallback = onScore;
    this.comboCallback = onCombo;
    this.gameOverCallback = onGameOver;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this.obstacleManager.setCanvasSize(w, h);

    for (const star of this.stars) {
      star.x = Math.random() * w;
      star.y = Math.random() * h;
    }

    if (this.playerX === 0 && this.playerY === 0) {
      this.playerX = w / 2;
      this.playerY = h / 2;
      this.prevX = this.playerX;
      this.prevY = this.playerY;
      for (const p of this.controlPoints) {
        p.x = this.playerX;
        p.y = this.playerY;
      }
    }
  }

  setPlayerPosition(x: number, y: number): void {
    this.prevX = this.playerX;
    this.prevY = this.playerY;
    this.playerX = x;
    this.playerY = y;
    const dx = x - this.prevX;
    const dy = y - this.prevY;
    this.playerSpeed = Math.sqrt(dx * dx + dy * dy);

    for (let i = this.controlPoints.length - 1; i > 0; i--) {
      this.controlPoints[i].x = this.controlPoints[i - 1].x;
      this.controlPoints[i].y = this.controlPoints[i - 1].y;
    }
    this.controlPoints[0].x = x;
    this.controlPoints[0].y = y;
  }

  startDrag(x: number, y: number): void {
    this.initAudio();
    this.isDragging = true;
    this.setPlayerPosition(x, y);
  }

  updateDrag(x: number, y: number): void {
    if (!this.isDragging) return;
    this.setPlayerPosition(x, y);
    if (this.trail) {
      this.trail.addPoint(x, y);
    }
  }

  endDrag(): void {
    this.isDragging = false;
  }

  private acquireParticle(): Particle | null {
    for (let i = 0; i < this.particlePool.length; i++) {
      if (!this.particlePool[i].active) {
        return this.particlePool[i];
      }
    }
    return null;
  }

  private releaseParticle(p: Particle): void {
    p.active = false;
  }

  spawnParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 100;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.age = 0;
      p.maxAge = 0.6;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.active = true;

      this.particles.push(p);
    }
  }

  private updateDifficulty(): void {
    const levels = Math.floor(this.elapsedTime / 10);
    this.spawnInterval = Math.max(800, 2000 - levels * 200);
    this.speedMultiplier = Math.min(1.5, 1 + levels * 0.1);
    this.obstacleManager.setDifficulty(this.spawnInterval, this.speedMultiplier);
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.gameOver) return;

    if (this.gameStartTime === 0) {
      this.gameStartTime = currentTime;
    }
    this.elapsedTime = (currentTime - this.gameStartTime) / 1000;
    this.updateDifficulty();

    this.trail.update(deltaTime);
    this.obstacleManager.update(deltaTime, currentTime);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;
      if (p.age >= p.maxAge) {
        this.releaseParticle(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }

    for (const star of this.stars) {
      star.phase += deltaTime * 2;
    }

    if (this.isDragging) {
      const hit = this.obstacleManager.checkCollision(this.playerX, this.playerY, 8);
      if (hit) {
        this.handleCollision(hit);
      }
    }
  }

  private handleCollision(obstacle: Obstacle): void {
    this.spawnParticles(obstacle.x, obstacle.y, obstacle.color);
    this.playCollisionSound();

    (obstacle as any).active = false;

    this.score += 1;
    this.consecutiveHits += 1;

    if (this.scoreCallback) this.scoreCallback(this.score);
    if (this.comboCallback) this.comboCallback(this.consecutiveHits);

    if (this.consecutiveHits >= 3) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.gameOver = true;
    if (this.gameOverCallback) {
      this.gameOverCallback(this.score);
    }
  }

  reset(): void {
    this.score = 0;
    this.consecutiveHits = 0;
    this.gameOver = false;
    this.gameStartTime = 0;
    this.elapsedTime = 0;
    this.spawnInterval = 2000;
    this.speedMultiplier = 1;

    this.trail.clear();
    this.obstacleManager.reset();

    for (const p of this.particles) {
      this.releaseParticle(p);
    }
    this.particles.length = 0;

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.playerX = w / 2;
    this.playerY = h / 2;
    this.prevX = this.playerX;
    this.prevY = this.playerY;
    this.playerSpeed = 0;

    for (const p of this.controlPoints) {
      p.x = this.playerX;
      p.y = this.playerY;
    }

    if (this.scoreCallback) this.scoreCallback(0);
    if (this.comboCallback) this.comboCallback(0);
  }

  draw(currentTime: number): void {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0b0c2a');
    gradient.addColorStop(0.5, '#1a1b4e');
    gradient.addColorStop(1, '#0e0f2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.drawStars(ctx);
    this.trail.draw(ctx);
    this.obstacleManager.draw(ctx);
    this.drawParticles(ctx);
    this.drawPlayer(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const alpha = star.baseAlpha + Math.sin(star.phase) * 0.15;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = star.size * 3;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = 1 - p.age / p.maxAge;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    if (this.controlPoints.length < 2) return;

    const speedFactor = Math.min(1, this.playerSpeed / 8);
    const r1 = parseInt('48', 16), g1 = parseInt('db', 16), b1 = parseInt('fb', 16);
    const r2 = parseInt('fe', 16), g2 = parseInt('ca', 16), b2 = parseInt('57', 16);
    const r = Math.round(r1 + (r2 - r1) * speedFactor);
    const g = Math.round(g1 + (g2 - g1) * speedFactor);
    const b = Math.round(b1 + (b2 - b1) * speedFactor);
    const color = `rgb(${r}, ${g}, ${b})`;

    const lineWidth = 4 + speedFactor * 4;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 + speedFactor * 10;

    ctx.beginPath();
    ctx.moveTo(this.controlPoints[0].x, this.controlPoints[0].y);

    for (let i = 1; i < this.controlPoints.length - 1; i++) {
      const xc = (this.controlPoints[i].x + this.controlPoints[i + 1].x) / 2;
      const yc = (this.controlPoints[i].y + this.controlPoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(this.controlPoints[i].x, this.controlPoints[i].y, xc, yc);
    }

    const last = this.controlPoints[this.controlPoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.shadowBlur = 30;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.controlPoints[0].x, this.controlPoints[0].y, 3 + speedFactor * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
