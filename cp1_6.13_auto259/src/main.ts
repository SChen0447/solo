import { Meteor, Paddle, Particle, Star, createStars, rectsOverlap } from './entity';
import { Renderer, type GameUIState } from './renderer';
import { soundManager } from './sound';

const MAX_METEORS = 20;
const BASE_SPEED = 2;
const SPEED_INCREMENT = 0.2;
const SPEED_INCREMENT_INTERVAL = 5000;
const COMBO_TIMEOUT = 5000;
const COMBO_THRESHOLD = 3;
const METEOR_SPAWN_INTERVAL = 1200;
const GOLD_METEOR_EVERY = 10;
const BACKGROUND_TINTS = ['#0f0c29', '#1a0b2e', '#2d1b3a'];
const TRANSITION_DURATION = 800;

interface GameState {
  running: boolean;
  score: number;
  combo: number;
  lastHitTime: number;
  comboActive: boolean;
  meteorsDestroyed: number;
  currentSpeed: number;
  lastSpeedIncrease: number;
  lastMeteorSpawn: number;
  currentTintIndex: number;
  targetTintIndex: number;
  transitionStartTime: number;
  transitionActive: boolean;
  edgeFlashActive: boolean;
  edgeFlashStartTime: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private paddle: Paddle;
  private meteors: Meteor[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];

  private state: GameState;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  private isDragging: boolean = false;
  private gameOverOverlay: HTMLElement;
  private finalScoreEl: HTMLElement;
  private restartBtn: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.gameOverOverlay = document.getElementById('gameOverOverlay') as HTMLElement;
    this.finalScoreEl = document.getElementById('finalScore') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLElement;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.renderer = new Renderer(this.ctx, this.width, this.height);
    this.paddle = new Paddle(this.width, this.height);
    this.stars = createStars(60, this.width, this.height);

    this.state = this.createInitialState();

    this.bindEvents();
  }

  private createInitialState(): GameState {
    return {
      running: false,
      score: 0,
      combo: 0,
      lastHitTime: 0,
      comboActive: false,
      meteorsDestroyed: 0,
      currentSpeed: BASE_SPEED,
      lastSpeedIncrease: performance.now(),
      lastMeteorSpawn: 0,
      currentTintIndex: 0,
      targetTintIndex: 0,
      transitionStartTime: 0,
      transitionActive: false,
      edgeFlashActive: false,
      edgeFlashStartTime: 0
    };
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.renderer) {
      this.renderer.resize(this.width, this.height);
    }
    if (this.paddle) {
      this.paddle.y = this.height - 40 - this.paddle.height;
    }
    this.stars = createStars(60, this.width, this.height);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onMouseUp());

    this.restartBtn.addEventListener('click', (e) => this.onRestart(e));
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.state.running) return;
    this.isDragging = true;
    this.updatePaddlePosition(e.clientX);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.state.running) return;
    if (this.isDragging || e.buttons === 1) {
      this.isDragging = true;
      this.updatePaddlePosition(e.clientX);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (!this.state.running) return;
    this.isDragging = true;
    if (e.touches.length > 0) {
      this.updatePaddlePosition(e.touches[0].clientX);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.state.running) return;
    if (this.isDragging && e.touches.length > 0) {
      this.updatePaddlePosition(e.touches[0].clientX);
    }
  }

  private updatePaddlePosition(clientX: number): void {
    this.paddle.targetX = clientX - this.paddle.width / 2;
  }

  private onRestart(e: MouseEvent): void {
    this.createRestartBurst(e);
    this.reset();
    this.start();
  }

  private createRestartBurst(e: MouseEvent): void {
    const btn = this.restartBtn;
    const rect = btn.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const colors = ['#667eea', '#764ba2', '#feca57', '#48dbfb', '#ff6b6b'];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('span');
      particle.className = 'burst-particle';
      const angle = (i / 20) * Math.PI * 2;
      const distance = 40 + Math.random() * 40;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const size = 4 + Math.random() * 6;

      particle.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --dx: ${dx}px;
        --dy: ${dy}px;
      `;
      btn.appendChild(particle);

      setTimeout(() => particle.remove(), 600);
    }
  }

  private reset(): void {
    this.state = this.createInitialState();
    this.meteors = [];
    this.particles = [];
    this.paddle = new Paddle(this.width, this.height);
    this.gameOverOverlay.classList.remove('active');
  }

  start(): void {
    this.state.running = true;
    this.state.lastSpeedIncrease = performance.now();
    this.state.lastMeteorSpawn = performance.now();
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.state.running) return;

    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    this.update(deltaTime, timestamp);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, now: number): void {
    if (now - this.state.lastSpeedIncrease >= SPEED_INCREMENT_INTERVAL) {
      this.state.currentSpeed += SPEED_INCREMENT;
      this.state.lastSpeedIncrease = now;
    }

    if (this.state.comboActive && now - this.state.lastHitTime > COMBO_TIMEOUT) {
      this.state.comboActive = false;
      this.state.combo = 0;
    }

    if (now - this.state.lastMeteorSpawn >= METEOR_SPAWN_INTERVAL && this.meteors.length < MAX_METEORS) {
      this.spawnMeteor(false);
      this.state.lastMeteorSpawn = now;
    }

    if (this.state.edgeFlashActive && now - this.state.edgeFlashStartTime >= 16) {
      this.state.edgeFlashActive = false;
    }

    if (this.state.transitionActive) {
      const elapsed = now - this.state.transitionStartTime;
      if (elapsed >= TRANSITION_DURATION) {
        this.state.transitionActive = false;
        this.state.currentTintIndex = this.state.targetTintIndex;
      }
    }

    this.paddle.update(this.width);

    this.meteors = this.meteors.filter((meteor) => {
      const alive = meteor.update(this.width, this.height);
      if (!alive && meteor.bounceCount === 0) {
        this.gameOver();
        return false;
      }
      return alive;
    });

    this.checkCollisions();

    this.particles = this.particles.filter((p) => p.update(deltaTime));
  }

  private spawnMeteor(isGold: boolean): void {
    const meteor = new Meteor(this.width, this.state.currentSpeed, isGold);
    this.meteors.push(meteor);
  }

  private checkCollisions(): void {
    const paddleRect = {
      x: this.paddle.x,
      y: this.paddle.y,
      w: this.paddle.width,
      h: this.paddle.height
    };

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];
      const meteorRect = meteor.getRect();

      if (meteor.bounceCount === 0 && meteor.vy > 0 && rectsOverlap(meteorRect, paddleRect)) {
        const hitX = meteorRect.x + meteorRect.w / 2;
        const angle = this.paddle.getReflectionAngle(hitX);
        meteor.reflect(angle);
        this.onMeteorHit(meteor, hitX, meteorRect.y + meteorRect.h / 2);
      } else if (meteor.bounceCount > 0 && meteor.vy < 0 && meteor.y + meteor.height < -10) {
        this.destroyMeteor(meteor, i);
      }
    }
  }

  private onMeteorHit(meteor: Meteor, hitX: number, hitY: number): void {
    this.spawnParticles(hitX, hitY, meteor.borderColor, meteor.isGold);

    if (meteor.isGold) {
      soundManager.playGoldSound();
    } else {
      soundManager.playHitSound();
    }
  }

  private destroyMeteor(meteor: Meteor, index: number): void {
    const points = meteor.isGold ? 50 : 10;
    this.state.score += points * (this.state.comboActive ? Math.min(this.state.combo, 10) : 1);

    this.state.combo++;
    this.state.comboActive = this.state.combo >= COMBO_THRESHOLD;
    this.state.lastHitTime = performance.now();

    this.state.meteorsDestroyed++;

    this.updateBackgroundTint();

    if (this.state.meteorsDestroyed % GOLD_METEOR_EVERY === 0 && !meteor.isGold) {
      this.state.edgeFlashActive = true;
      this.state.edgeFlashStartTime = performance.now();
      setTimeout(() => this.spawnMeteor(true), 200);
    }

    this.meteors.splice(index, 1);
  }

  private updateBackgroundTint(): void {
    let targetIndex = 0;
    if (this.state.combo >= 15) {
      targetIndex = 2;
    } else if (this.state.combo >= 10) {
      targetIndex = 2;
    } else if (this.state.combo >= 5) {
      targetIndex = 1;
    }

    if (targetIndex !== this.state.currentTintIndex && targetIndex !== this.state.targetTintIndex) {
      this.state.targetTintIndex = targetIndex;
      this.state.transitionActive = true;
      this.state.transitionStartTime = performance.now();
    }
  }

  private spawnParticles(x: number, y: number, baseColor: string, isGold: boolean): void {
    const count = isGold ? 32 : 16 + Math.floor(Math.random() * 9);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, baseColor));
    }
  }

  private gameOver(): void {
    this.state.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.finalScoreEl.textContent = `最终积分: ${this.state.score}`;
    this.gameOverOverlay.classList.add('active');
  }

  private getUIState(): GameUIState {
    let transitionProgress = 1;
    if (this.state.transitionActive) {
      const elapsed = performance.now() - this.state.transitionStartTime;
      transitionProgress = Math.min(1, elapsed / TRANSITION_DURATION);
    }

    const currentTint = BACKGROUND_TINTS[this.state.currentTintIndex];
    const targetTint = BACKGROUND_TINTS[this.state.targetTintIndex];

    return {
      score: this.state.score,
      combo: this.state.combo,
      comboActive: this.state.comboActive,
      backgroundTint: this.state.transitionActive
        ? this.lerpColorForUI(currentTint, targetTint, transitionProgress)
        : targetTint,
      backgroundTransitionProgress: this.state.transitionActive ? transitionProgress : 1,
      edgeFlash: this.state.edgeFlashActive
    };
  }

  private lerpColorForUI(color1: string, color2: string, t: number): string {
    const parseHex = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const c1 = parseHex(color1);
    const c2 = parseHex(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private render(): void {
    const uiState = this.getUIState();
    this.renderer.render(this.stars, this.meteors, this.particles, this.paddle, uiState);
  }
}

const game = new Game();
game.start();
