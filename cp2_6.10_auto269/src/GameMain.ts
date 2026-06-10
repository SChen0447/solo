import {
  BLUE_SWEEP_DURATION,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEATH_RESPAWN_TIME,
  GameState,
  GRAVITY_COOLDOWN,
  GravityDirection,
  GRID_COLS,
  GRID_ROWS,
  RED_FLASH_DURATION,
  TILE_SIZE
} from './types';
import { Player } from './Player';
import { Level } from './Level';
import { Physics } from './Physics';
import { clamp, easeInOutQuad, lerp, randomRange } from './utils';

interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

class GameMain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private player!: Player;
  private level!: Level;
  private state!: GameState;
  private input: InputState;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_DT: number = 1000 / 60;
  private running: boolean = false;
  private animationId: number = 0;
  private time: number = 0;

  private bgStars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.container = document.getElementById('game-container')!;

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpPressed: false
    };

    this.initCanvas();
    this.generateBgStars();
    this.initGame(0);
    this.setupEventListeners();
    this.setupResizeHandler();

    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) loading.classList.add('hidden');
      this.start();
    }, 500);
  }

  private initCanvas(): void {
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
    this.resizeCanvas();
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const containerW = this.container.clientWidth;
    const containerH = this.container.clientHeight;
    const scale = Math.min(containerW / CANVAS_WIDTH, containerH / CANVAS_HEIGHT);
    const cssW = Math.floor(CANVAS_WIDTH * scale);
    const cssH = Math.floor(CANVAS_HEIGHT * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  private generateBgStars(): void {
    this.bgStars = [];
    for (let i = 0; i < 60; i++) {
      this.bgStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() < 0.8 ? 1 : 2,
        speed: 0.1 + Math.random() * 0.3,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
  }

  private initGame(levelIndex: number): void {
    this.level = new Level(levelIndex);
    this.player = new Player(this.level.startPos.x, this.level.startPos.y);
    this.player.setSpawn(this.level.startPos.x, this.level.startPos.y);

    this.state = {
      currentLevel: levelIndex,
      deaths: this.state?.deaths ?? 0,
      gravityDir: GravityDirection.DOWN,
      gravityCooldown: 0,
      isDead: false,
      deathTimer: 0,
      levelComplete: false,
      levelCompleteTimer: 0,
      transitioning: false,
      transitionTimer: 0,
      shakeIntensity: 0,
      flashRed: 0,
      blueSweep: 0
    };
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = true;
        this.input.jump = true;
        if (!e.repeat) this.input.jumpPressed = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = true;
        break;
      case 'Space':
        e.preventDefault();
        this.tryFlipGravity();
        break;
      case 'KeyR':
        this.restartLevel();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = false;
        this.input.jump = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = false;
        break;
    }
  }

  private tryFlipGravity(): void {
    if (this.state.gravityCooldown > 0 || this.state.isDead || this.state.levelComplete) return;
    this.state.gravityDir = ((this.state.gravityDir + 1) % 4) as GravityDirection;
    this.state.gravityCooldown = GRAVITY_COOLDOWN;
    this.state.blueSweep = BLUE_SWEEP_DURATION;
  }

  private flipGravityFromStone(): void {
    this.state.gravityDir = ((this.state.gravityDir + 1) % 4) as GravityDirection;
    this.state.blueSweep = BLUE_SWEEP_DURATION;
  }

  private restartLevel(): void {
    this.initGame(this.state.currentLevel);
  }

  private nextLevel(): void {
    const next = this.state.currentLevel + 1;
    if (next >= this.level.totalLevels) {
      this.initGame(0);
      this.state.deaths = 0;
    } else {
      this.initGame(next);
    }
    this.state.transitioning = true;
    this.state.transitionTimer = 1000;
  }

  private start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    let frameTime = now - this.lastTime;
    this.lastTime = now;

    if (frameTime > 250) frameTime = 250;

    this.accumulator += frameTime;

    while (this.accumulator >= this.FIXED_DT) {
      this.update(this.FIXED_DT / 16.67);
      this.time += this.FIXED_DT;
      this.accumulator -= this.FIXED_DT;
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    if (this.state.transitioning) {
      this.state.transitionTimer -= dt * 16.67;
      if (this.state.transitionTimer <= 0) {
        this.state.transitioning = false;
      }
      return;
    }

    if (this.state.levelComplete) {
      this.state.levelCompleteTimer -= dt * 16.67;
      if (this.state.levelCompleteTimer <= 0) {
        this.nextLevel();
      }
      return;
    }

    if (this.state.isDead) {
      this.state.deathTimer -= dt * 16.67;
      if (this.state.deathTimer <= 0) {
        this.player.respawn();
        this.state.gravityDir = GravityDirection.DOWN;
        this.state.isDead = false;
      }
      return;
    }

    if (this.state.gravityCooldown > 0) {
      this.state.gravityCooldown -= dt * 16.67;
      if (this.state.gravityCooldown < 0) this.state.gravityCooldown = 0;
    }
    if (this.state.flashRed > 0) {
      this.state.flashRed -= dt * 16.67;
      if (this.state.flashRed < 0) this.state.flashRed = 0;
    }
    if (this.state.blueSweep > 0) {
      this.state.blueSweep -= dt * 16.67;
      if (this.state.blueSweep < 0) this.state.blueSweep = 0;
    }
    if (this.state.shakeIntensity > 0) {
      this.state.shakeIntensity *= 0.9;
      if (this.state.shakeIntensity < 0.1) this.state.shakeIntensity = 0;
    }

    this.level.update(dt);

    const horizInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const wantJump = this.input.jumpPressed;
    this.input.jumpPressed = false;

    this.player.update(horizInput, this.state.gravityDir, wantJump, dt);

    const vel = { vx: this.player.vx, vy: this.player.vy };

    const tileResult = this.level.resolveTileCollisions(
      this.player.getRect(),
      vel,
      this.state.gravityDir
    );

    if (tileResult.onGround) {
      const grav = Physics.getGravityVector(this.state.gravityDir);
      if (grav.x !== 0) {
        this.player.vx = 0;
        this.player.targetVx = 0;
      }
      if (grav.y !== 0) {
        this.player.vy = 0;
        this.player.targetVy = 0;
      }
    }

    this.player.x = tileResult.x;
    this.player.y = tileResult.y;

    const platResult = this.level.resolvePlatformCollisions(
      this.player.getRect(),
      { vx: this.player.vx, vy: this.player.vy },
      this.state.gravityDir
    );

    if (platResult.onGround) {
      const grav = Physics.getGravityVector(this.state.gravityDir);
      if (grav.x !== 0) {
        this.player.vx = 0;
        this.player.targetVx = 0;
      }
      if (grav.y !== 0) {
        this.player.vy = 0;
        this.player.targetVy = 0;
      }
    }

    this.player.x = platResult.x;
    this.player.y = platResult.y;

    this.player.onGround = tileResult.onGround || platResult.onGround;

    const collision = this.level.checkCollision(this.player.getRect(), this.state.gravityDir);
    this.player.onGround = collision.onGround || this.player.onGround;

    if (collision.hitGravityStone) {
      this.level.triggerGravityStone(collision.hitGravityStone);
      this.flipGravityFromStone();
    }

    if (collision.hitSpike || this.level.isOutOfBounds(this.player.getRect())) {
      this.triggerDeath();
      return;
    }

    if (collision.hitGoal) {
      this.state.levelComplete = true;
      this.state.levelCompleteTimer = 1500;
      return;
    }

    for (const star of this.bgStars) {
      const grav = Physics.getGravityVector(this.state.gravityDir);
      star.x += grav.x * star.speed * dt * 0.5;
      star.y += grav.y * star.speed * dt * 0.5;
      if (star.x < 0) star.x = CANVAS_WIDTH;
      if (star.x > CANVAS_WIDTH) star.x = 0;
      if (star.y < 0) star.y = CANVAS_HEIGHT;
      if (star.y > CANVAS_HEIGHT) star.y = 0;
    }
  }

  private triggerDeath(): void {
    this.state.isDead = true;
    this.state.deathTimer = DEATH_RESPAWN_TIME;
    this.state.deaths++;
    this.state.flashRed = RED_FLASH_DURATION;
    this.state.shakeIntensity = 8;
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.save();

    if (this.state.shakeIntensity > 0) {
      ctx.translate(
        randomRange(-this.state.shakeIntensity, this.state.shakeIntensity),
        randomRange(-this.state.shakeIntensity, this.state.shakeIntensity)
      );
    }

    this.renderBackground(ctx);

    const offsetX = (CANVAS_WIDTH - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (CANVAS_HEIGHT - GRID_ROWS * TILE_SIZE) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.level.render(ctx, this.time);
    this.player.render(ctx);

    ctx.restore();

    this.renderVignette(ctx);

    if (this.state.flashRed > 0) {
      const alpha = this.state.flashRed / RED_FLASH_DURATION;
      ctx.fillStyle = `rgba(255, 30, 30, ${alpha * 0.4})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (this.state.blueSweep > 0) {
      this.renderBlueSweep(ctx);
    }

    if (this.state.isDead) {
      this.renderDeathOverlay(ctx);
    }

    this.renderHUD(ctx);

    if (this.state.levelComplete) {
      this.renderLevelComplete(ctx);
    }

    if (this.state.transitioning) {
      this.renderTransition(ctx);
    }

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#16082a');
    gradient.addColorStop(1, '#0d0d2b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const star of this.bgStars) {
      ctx.fillStyle = `rgba(180, 140, 255, ${star.alpha})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }
  }

  private renderVignette(ctx: CanvasRenderingContext2D): void {
    const edgeW = 5;
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, edgeW, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - edgeW, 0, edgeW, CANVAS_HEIGHT);

    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(10,0,21,0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private renderBlueSweep(ctx: CanvasRenderingContext2D): void {
    const t = 1 - this.state.blueSweep / BLUE_SWEEP_DURATION;
    const sweepWidth = 80;
    const progress = easeInOutQuad(t);

    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    const start = Math.max(0, progress * (CANVAS_WIDTH + sweepWidth) - sweepWidth);
    const end = Math.min(CANVAS_WIDTH, progress * (CANVAS_WIDTH + sweepWidth));

    grad.addColorStop(0, 'rgba(0, 150, 255, 0)');
    grad.addColorStop(0.5, `rgba(0, 200, 255, ${(1 - t) * 0.5})`);
    grad.addColorStop(1, 'rgba(0, 150, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(start, 0, end - start, CANVAS_HEIGHT);

    ctx.strokeStyle = `rgba(100, 220, 255, ${(1 - t) * 0.8})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);

    ctx.restore();
  }

  private renderDeathOverlay(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(this.time * 0.02) * 0.1 + 0.3;
    ctx.fillStyle = `rgba(100, 0, 0, ${pulse})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = "10px 'Press Start 2P', monospace";

    this.renderGravityIndicator(ctx, 12, 12);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`LV ${this.state.currentLevel + 1}/${this.level.totalLevels}`, CANVAS_WIDTH - 12, 22);
    ctx.fillStyle = '#ff6666';
    ctx.fillText(`DEATHS ${this.state.deaths}`, CANVAS_WIDTH - 12, 42);

    ctx.restore();
  }

  private renderGravityIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const size = 36;
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    ctx.strokeStyle = '#6644aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);

    ctx.save();
    ctx.translate(cx, cy);

    switch (this.state.gravityDir) {
      case GravityDirection.DOWN:
        ctx.rotate(Math.PI / 2);
        break;
      case GravityDirection.LEFT:
        ctx.rotate(Math.PI);
        break;
      case GravityDirection.UP:
        ctx.rotate(-Math.PI / 2);
        break;
      case GravityDirection.RIGHT:
        break;
    }

    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -8);
    ctx.lineTo(-4, -2);
    ctx.lineTo(-10, -2);
    ctx.lineTo(-10, 2);
    ctx.lineTo(-4, 2);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const cdProgress = this.state.gravityCooldown / GRAVITY_COOLDOWN;
    if (cdProgress > 0) {
      ctx.fillStyle = 'rgba(50, 50, 80, 0.8)';
      ctx.fillRect(x, y + size + 4, size, 5);
      ctx.fillStyle = '#00aaff';
      ctx.fillRect(x, y + size + 4, size * (1 - cdProgress), 5);
    } else {
      ctx.fillStyle = '#00ffaa';
      ctx.fillRect(x, y + size + 4, size, 5);
    }

    ctx.fillStyle = '#aaaaff';
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('SPACE', x - 2, y + size + 20);
  }

  private renderLevelComplete(ctx: CanvasRenderingContext2D): void {
    const t = 1 - this.state.levelCompleteTimer / 1500;
    const alpha = Math.min(1, t * 2);
    const scale = lerp(0.8, 1, Math.min(1, t * 3));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0, 40, 20, 0.8)';
    ctx.fillRect(-140, -40, 280, 80);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.strokeRect(-140, -40, 280, 80);

    ctx.fillStyle = '#00ffaa';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('关卡通过', 0, 0);

    ctx.restore();
  }

  private renderTransition(ctx: CanvasRenderingContext2D): void {
    const totalT = 1 - this.state.transitionTimer / 1000;
    let alpha: number;
    let rotation: number;

    if (totalT < 0.5) {
      const t = totalT * 2;
      alpha = easeInOutQuad(t);
      rotation = t * Math.PI;
    } else {
      const t = (totalT - 0.5) * 2;
      alpha = 1 - easeInOutQuad(t);
      rotation = Math.PI + t * Math.PI;
    }

    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rotation);

    const maxR = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT) / 2;
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
      gradient.addColorStop(0, `rgba(138, 43, 226, ${alpha * 0.6})`);
      gradient.addColorStop(0.5, `rgba(75, 0, 130, ${alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(13, 13, 43, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR, angle, angle + Math.PI / 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    ctx.fillStyle = `rgba(10, 0, 30, ${alpha * 0.7})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameMain();
});
