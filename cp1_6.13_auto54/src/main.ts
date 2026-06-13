import { Renderer } from './Renderer';
import { Platform } from './Platform';
import { Ball } from './Ball';
import { ParticleSystem } from './ParticleSystem';

const TOTAL_BALLS = 30;
const COLLECT_GOAL = 10;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private platform: Platform;
  private ball: Ball;
  private particles: ParticleSystem;
  private score = 0;
  private ballsRemaining = TOTAL_BALLS;
  private collectCount = 0;
  private scoreScale = 1;
  private scoreScaleTarget = 1;
  private gameOver = false;
  private gameOverAlpha = 0;
  private gameOverPulse = 0;
  private starBlastAlpha = 0;
  private lastTime = 0;
  private running = false;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.canvas = canvas;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.renderer = new Renderer(canvas);
    this.platform = new Platform(canvas.width / 2, canvas.height * 0.4);
    this.ball = new Ball(canvas.width / 2, canvas.height * 0.78);
    this.particles = new ParticleSystem();

    this.setupInput();
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    if (this.renderer) {
      this.renderer.resize(this.canvas.width, this.canvas.height);
    }
    if (this.platform) {
      this.platform.reposition(this.canvas.width / 2, this.canvas.height * 0.4);
    }
    if (this.ball) {
      this.ball.updateLaunchPos(this.canvas.width / 2, this.canvas.height * 0.78);
    }
  }

  private setupInput() {
    const getPos = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.gameOver) return;
      const pos = getPos(e);
      this.ball.onPointerDown(pos.x, pos.y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.gameOver) return;
      const pos = getPos(e);
      this.ball.onPointerMove(pos.x, pos.y);
    });

    this.canvas.addEventListener('pointerup', () => {
      if (this.gameOver) return;
      const launched = this.ball.onPointerUp();
      if (launched) {
        this.ballsRemaining--;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  start() {
    this.running = true;
    this.lastTime = performance.now() / 1000;

    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 600);
    }

    this.loop();
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now() / 1000;
    let dt = now - this.lastTime;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.renderer.updateFps(dt);

    if (this.gameOver) {
      this.gameOverAlpha = Math.min(1, this.gameOverAlpha + dt * 0.8);
      this.gameOverPulse = 0.5 + 0.5 * Math.sin(now() * 3);
      return;
    }

    this.platform.update(dt);

    const collisions = this.ball.update(dt, this.platform, this.particles);

    for (const col of collisions) {
      if (col.body.type === 'planet' && col.body.hits >= col.body.maxHits) {
        this.score++;
        this.scoreScaleTarget = 1.3;
      }
      if (col.body.type === 'meteorite') {
        this.collectCount++;
        if (this.collectCount >= COLLECT_GOAL) {
          this.collectCount = 0;
          this.score++;
          this.starBlastAlpha = 1;
          this.scoreScaleTarget = 1.3;
        }
      }
    }

    const destroyed = this.platform.getDestroyed();
    for (const d of destroyed) {
      this.particles.emitExplosion(d.x, d.y, d.color.r, d.color.g, d.color.b, 50);
    }
    this.platform.regeneratePlanets();

    if (this.ball.active && this.ball.isOutOfBounds(this.canvas.width, this.canvas.height)) {
      this.ball.reset();
    }

    this.particles.update(dt);

    this.scoreScale += (this.scoreScaleTarget - this.scoreScale) * dt * 10;
    if (Math.abs(this.scoreScale - this.scoreScaleTarget) < 0.01) {
      this.scoreScaleTarget = 1;
    }

    if (this.starBlastAlpha > 0) {
      this.starBlastAlpha -= dt / 0.3;
      if (this.starBlastAlpha < 0) this.starBlastAlpha = 0;
    }

    if (this.ballsRemaining <= 0 && !this.ball.active) {
      this.gameOver = true;
    }
  }

  private draw() {
    const ctx = this.renderer.ctx;
    ctx.save();

    this.renderer.clear();
    this.renderer.drawBackground();

    this.drawStars(ctx);

    this.platform.draw(this.renderer);

    this.particles.draw(this.renderer);

    if (!this.gameOver) {
      this.ball.draw(this.renderer, this.particles);
    }

    this.renderer.drawScore(this.score, this.scoreScale);
    this.renderer.drawBallsRemaining(this.ballsRemaining);

    if (this.starBlastAlpha > 0) {
      this.renderer.drawStarBlast(this.starBlastAlpha);
    }

    if (this.gameOver) {
      this.renderer.drawGameOver(this.gameOverAlpha, this.gameOverPulse);
    }

    this.renderer.drawFps();

    ctx.restore();
  }

  private drawStars(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.renderer.setAdditiveBlend();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const hash = Math.sin(i * seed) * 43758.5453;
      const rx = (hash - Math.floor(hash)) * this.canvas.width;
      const hash2 = Math.sin(i * seed + 1) * 43758.5453;
      const ry = (hash2 - Math.floor(hash2)) * this.canvas.height;
      const sz = 0.5 + ((Math.sin(i * 7.3) * 0.5 + 0.5) * 1.5);
      ctx.beginPath();
      ctx.arc(rx, ry, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function now(): number {
  return performance.now() / 1000;
}

const game = new Game();
game.start();
