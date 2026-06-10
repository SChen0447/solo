import { Shield } from './Shield';
import { ProjectileManager } from './ProjectileManager';
import { Vector2, GameState } from './types';

const INITIAL_LIVES = 5;
const BASE_RADIUS = 20;
const RIPPLE_COUNT = 3;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shield: Shield;
  private projectileManager: ProjectileManager;
  private gameState: GameState;
  private mousePos: Vector2;
  private center: Vector2;
  private lastTime: number;
  private ripplePhase: number;
  private restartButtonRect: { x: number; y: number; width: number; height: number } | null;
  private animationId: number | null;
  private running: boolean;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.center = { x: 0, y: 0 };
    this.mousePos = { x: 0, y: 0 };
    this.lastTime = 0;
    this.ripplePhase = 0;
    this.restartButtonRect = null;
    this.animationId = null;
    this.running = false;

    this.shield = new Shield(this.center);
    this.projectileManager = new ProjectileManager(
      this.canvas.width,
      this.canvas.height,
      this.center,
      (points) => this.addScore(points)
    );

    this.gameState = {
      score: 0,
      lives: INITIAL_LIVES,
      isGameOver: false,
      isPaused: false,
    };

    this.resizeCanvas();
    this.bindEvents();
    this.projectileManager.reset();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);

    const logicalWidth = window.innerWidth;
    const logicalHeight = window.innerHeight;

    this.center = {
      x: logicalWidth / 2,
      y: logicalHeight / 2,
    };

    this.shield.setCenter(this.center);
    this.projectileManager.resize(logicalWidth, logicalHeight, this.center);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.mousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('click', (e: MouseEvent) => {
      if (this.gameState.isGameOver && this.restartButtonRect) {
        const rect = this.restartButtonRect;
        if (
          e.clientX >= rect.x &&
          e.clientX <= rect.x + rect.width &&
          e.clientY >= rect.y &&
          e.clientY <= rect.y + rect.height
        ) {
          this.restart();
        }
      }
    });
  }

  private addScore(points: number): void {
    this.gameState.score += points;
  }

  private loseLife(): void {
    this.gameState.lives--;
    if (this.gameState.lives <= 0) {
      this.gameState.lives = 0;
      this.gameState.isGameOver = true;
    }
  }

  public restart(): void {
    this.gameState = {
      score: 0,
      lives: INITIAL_LIVES,
      isGameOver: false,
      isPaused: false,
    };
    this.projectileManager.reset();
    this.restartButtonRect = null;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.gameState.isGameOver) return;

    this.ripplePhase += dt * 0.8;
    this.shield.update(this.mousePos.x, this.mousePos.y);
    this.projectileManager.update(dt);

    const projectiles = this.projectileManager.getProjectiles();
    for (const p of projectiles) {
      if (p.reflected) continue;

      const collision = this.shield.checkCollision(p.pos, p.radius);
      if (collision.collided && collision.normal) {
        this.projectileManager.reflectProjectile(p, collision.normal);
      }
    }

    if (this.projectileManager.checkBaseCollision(this.center, BASE_RADIUS)) {
      this.loseLife();
    }
  }

  private render(): void {
    const logicalWidth = window.innerWidth;
    const logicalHeight = window.innerHeight;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    this.drawBase();
    this.shield.draw(this.ctx);
    this.projectileManager.draw(this.ctx);
    this.drawHUD();

    if (this.gameState.isGameOver) {
      this.drawGameOver();
    }
  }

  private drawBase(): void {
    this.ctx.save();

    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const phase = (this.ripplePhase + i * 0.33) % 1;
      const radius = BASE_RADIUS + phase * 40;
      const alpha = (1 - phase) * 0.2;

      this.ctx.beginPath();
      this.ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(this.center.x, this.center.y, BASE_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 20;
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawHUD(): void {
    this.ctx.save();

    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`得分: ${this.gameState.score}`, 20, 20);

    const heartSize = 28;
    const heartSpacing = 8;
    const startX = window.innerWidth - 20 - (heartSize + heartSpacing) * INITIAL_LIVES + heartSpacing;

    for (let i = 0; i < INITIAL_LIVES; i++) {
      const x = startX + i * (heartSize + heartSpacing);
      const y = 20;

      if (i < this.gameState.lives) {
        this.drawHeart(x + heartSize / 2, y + heartSize / 2, heartSize * 0.5, '#ff3366');
      } else {
        this.drawHeart(x + heartSize / 2, y + heartSize / 2, heartSize * 0.5, 'rgba(255, 255, 255, 0.2)');
      }
    }

    this.ctx.restore();
  }

  private drawHeart(cx: number, cy: number, size: number, color: string): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = color === '#ff3366' ? 8 : 0;
    this.ctx.beginPath();

    this.ctx.moveTo(cx, cy + size * 0.3);
    this.ctx.bezierCurveTo(cx, cy, cx - size, cy, cx - size, cy + size * 0.3);
    this.ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size * 0.9, cx, cy + size);
    this.ctx.bezierCurveTo(cx, cy + size * 0.9, cx + size, cy + size * 0.6, cx + size, cy + size * 0.3);
    this.ctx.bezierCurveTo(cx + size, cy, cx, cy, cx, cy + size * 0.3);

    this.ctx.fill();
    this.ctx.restore();
  }

  private drawGameOver(): void {
    const logicalWidth = window.innerWidth;
    const logicalHeight = window.innerHeight;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('游戏结束', logicalWidth / 2, logicalHeight / 2 - 80);

    this.ctx.font = 'bold 32px sans-serif';
    this.ctx.fillStyle = '#00f5d4';
    this.ctx.fillText(`最终得分: ${this.gameState.score}`, logicalWidth / 2, logicalHeight / 2 - 20);

    const buttonWidth = 180;
    const buttonHeight = 56;
    const buttonX = logicalWidth / 2 - buttonWidth / 2;
    const buttonY = logicalHeight / 2 + 40;

    this.restartButtonRect = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    };

    this.ctx.fillStyle = '#00f5d4';
    this.ctx.shadowColor = '#00f5d4';
    this.ctx.shadowBlur = 15;
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.fillText('重新开始', logicalWidth / 2, buttonY + buttonHeight / 2);

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
