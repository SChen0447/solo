import { Player, PlayerInput } from './player';
import { Ball } from './ball';
import { Wall, checkRectRectCollision } from './collision';
import { Renderer, ShardParticle } from './renderer';

type GameState = 'menu' | 'playing' | 'gameover';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WALL_PADDING = 30;
const WIN_SCORE = 3;
const MAX_SHARDS = 150;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private wall: Wall;

  private state: GameState = 'menu';

  private player1: Player;
  private player2: Player;
  private balls: Ball[] = [];
  private shards: ShardParticle[] = [];

  private inputP1: PlayerInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    throw: false
  };

  private inputP2: PlayerInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    throw: false
  };

  private audioContext: AudioContext | null = null;

  private scoreP1El: HTMLElement;
  private scoreP2El: HTMLElement;
  private cooldownP1El: HTMLElement;
  private cooldownP2El: HTMLElement;
  private menuOverlay: HTMLElement;
  private victoryOverlay: HTMLElement;
  private victoryText: HTMLElement;
  private startBtn: HTMLElement;
  private restartBtn: HTMLElement;

  private lastTime = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.wall = {
      left: WALL_PADDING,
      right: CANVAS_WIDTH - WALL_PADDING,
      top: WALL_PADDING,
      bottom: CANVAS_HEIGHT - WALL_PADDING
    };

    this.renderer = new Renderer(this.canvas, this.wall);

    this.player1 = new Player(1, 100, CANVAS_HEIGHT / 2 - 15, '#ff4444');
    this.player2 = new Player(2, CANVAS_WIDTH - 130, CANVAS_HEIGHT / 2 - 15, '#4488ff');

    this.scoreP1El = document.getElementById('score-p1')!;
    this.scoreP2El = document.getElementById('score-p2')!;
    this.cooldownP1El = document.getElementById('cooldown-p1')!;
    this.cooldownP2El = document.getElementById('cooldown-p2')!;
    this.menuOverlay = document.getElementById('menu-overlay')!;
    this.victoryOverlay = document.getElementById('victory-overlay')!;
    this.victoryText = document.getElementById('victory-text')!;
    this.startBtn = document.getElementById('start-btn')!;
    this.restartBtn = document.getElementById('restart-btn')!;

    this.setupEventListeners();
    this.resizeCanvas();
    this.gameLoop(0);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('resize', () => this.resizeCanvas());

    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.restartGame());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.inputP1.up = true;
        break;
      case 's':
        this.inputP1.down = true;
        break;
      case 'a':
        this.inputP1.left = true;
        break;
      case 'd':
        this.inputP1.right = true;
        break;
      case 'q':
        this.inputP1.throw = true;
        break;
      case 'arrowup':
        e.preventDefault();
        this.inputP2.up = true;
        break;
      case 'arrowdown':
        e.preventDefault();
        this.inputP2.down = true;
        break;
      case 'arrowleft':
        e.preventDefault();
        this.inputP2.left = true;
        break;
      case 'arrowright':
        e.preventDefault();
        this.inputP2.right = true;
        break;
      case 'enter':
        e.preventDefault();
        this.inputP2.throw = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.inputP1.up = false;
        break;
      case 's':
        this.inputP1.down = false;
        break;
      case 'a':
        this.inputP1.left = false;
        break;
      case 'd':
        this.inputP1.right = false;
        break;
      case 'q':
        this.inputP1.throw = false;
        break;
      case 'arrowup':
        this.inputP2.up = false;
        break;
      case 'arrowdown':
        this.inputP2.down = false;
        break;
      case 'arrowleft':
        this.inputP2.left = false;
        break;
      case 'arrowright':
        this.inputP2.right = false;
        break;
      case 'enter':
        this.inputP2.throw = false;
        break;
    }
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scale = Math.min(
      containerWidth / CANVAS_WIDTH,
      containerHeight / CANVAS_HEIGHT
    );

    this.canvas.style.width = `${CANVAS_WIDTH * scale}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
  }

  private startGame(): void {
    this.state = 'playing';
    this.menuOverlay.style.display = 'none';
    this.victoryOverlay.classList.remove('visible');
    this.resetGame();
    this.initAudio();
  }

  private restartGame(): void {
    this.victoryOverlay.classList.remove('visible');
    setTimeout(() => {
      this.resetGame();
      this.state = 'playing';
    }, 300);
  }

  private resetGame(): void {
    this.player1.reset(100, CANVAS_HEIGHT / 2 - 15);
    this.player2.reset(CANVAS_WIDTH - 130, CANVAS_HEIGHT / 2 - 15);
    this.player1.resetScore();
    this.player2.resetScore();
    this.balls = [];
    this.shards = [];
    this.updateScoreUI();
  }

  private endGame(winnerId: number): void {
    this.state = 'gameover';
    this.victoryText.textContent = winnerId === 1 ? '玩家 1 获胜！' : '玩家 2 获胜！';
    this.victoryText.style.color = winnerId === 1 ? '#ff4444' : '#4488ff';
    setTimeout(() => {
      this.victoryOverlay.classList.add('visible');
    }, 500);
    this.playVictorySound();
  }

  private gameLoop = (timestamp: number): void => {
    this.animationId = requestAnimationFrame(this.gameLoop);

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (this.state === 'playing') {
      this.update();
    }

    this.render();
  };

  private update(): void {
    this.player1.update(this.inputP1, this.wall);
    this.player2.update(this.inputP2, this.wall);

    this.resolvePlayerCollision();

    if (this.inputP1.throw) {
      const ball = this.player1.tryThrowBall();
      if (ball) {
        this.balls.push(ball);
      }
    }
    if (this.inputP2.throw) {
      const ball = this.player2.tryThrowBall();
      if (ball) {
        this.balls.push(ball);
      }
    }

    for (const ball of this.balls) {
      ball.update(this.wall);
    }

    this.balls = this.balls.filter(b => b.active);

    for (const ball of this.balls) {
      if (this.player1.checkHit(ball)) {
        this.player2.addScore();
        this.spawnHitShards(this.player1);
        this.bounceScore(1);
        this.updateScoreUI();
        this.playHitSound();
        if (this.player2.score >= WIN_SCORE) {
          this.endGame(2);
        }
      }
      if (this.player2.checkHit(ball)) {
        this.player1.addScore();
        this.spawnHitShards(this.player2);
        this.bounceScore(2);
        this.updateScoreUI();
        this.playHitSound();
        if (this.player1.score >= WIN_SCORE) {
          this.endGame(1);
        }
      }
    }

    this.updateShards();

    this.updateCooldownUI();
  }

  private resolvePlayerCollision(): void {
    const p1Rect = {
      x: this.player1.x,
      y: this.player1.y,
      width: this.player1.width,
      height: this.player1.height
    };
    const p2Rect = {
      x: this.player2.x,
      y: this.player2.y,
      width: this.player2.width,
      height: this.player2.height
    };

    if (checkRectRectCollision(p1Rect, p2Rect)) {
      const overlapX = Math.min(
        p1Rect.x + p1Rect.width - p2Rect.x,
        p2Rect.x + p2Rect.width - p1Rect.x
      );
      const overlapY = Math.min(
        p1Rect.y + p1Rect.height - p2Rect.y,
        p2Rect.y + p2Rect.height - p1Rect.y
      );

      if (overlapX < overlapY) {
        const pushX = overlapX / 2;
        if (p1Rect.x < p2Rect.x) {
          this.player1.x -= pushX;
          this.player2.x += pushX;
        } else {
          this.player1.x += pushX;
          this.player2.x -= pushX;
        }
      } else {
        const pushY = overlapY / 2;
        if (p1Rect.y < p2Rect.y) {
          this.player1.y -= pushY;
          this.player2.y += pushY;
        } else {
          this.player1.y += pushY;
          this.player2.y -= pushY;
        }
      }

      const clamped1 = this.clampPlayerToWall(this.player1);
      this.player1.x = clamped1.x;
      this.player1.y = clamped1.y;

      const clamped2 = this.clampPlayerToWall(this.player2);
      this.player2.x = clamped2.x;
      this.player2.y = clamped2.y;
    }
  }

  private clampPlayerToWall(player: Player): { x: number; y: number } {
    let x = player.x;
    let y = player.y;

    if (x < this.wall.left) x = this.wall.left;
    if (x + player.width > this.wall.right) x = this.wall.right - player.width;
    if (y < this.wall.top) y = this.wall.top;
    if (y + player.height > this.wall.bottom) y = this.wall.bottom - player.height;

    return { x, y };
  }

  private spawnHitShards(player: Player): void {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    const shardCount = 20;
    for (let i = 0; i < shardCount; i++) {
      if (this.shards.length >= MAX_SHARDS) {
        this.shards.shift();
      }

      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;

      this.shards.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        alpha: 0.8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        maxLife: 1
      });
    }
  }

  private updateShards(): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vy += 0.1;
      shard.rotation += shard.rotationSpeed;
      shard.life -= 0.016;
      shard.alpha = Math.max(0, shard.life * 0.8);

      if (shard.life <= 0) {
        this.shards.splice(i, 1);
      }
    }

    if (this.shards.length > MAX_SHARDS) {
      this.shards = this.shards.slice(-MAX_SHARDS);
    }
  }

  private render(): void {
    this.renderer.render(
      [this.player1, this.player2],
      this.balls,
      this.shards
    );
  }

  private updateScoreUI(): void {
    this.scoreP1El.textContent = this.player1.score.toString();
    this.scoreP2El.textContent = this.player2.score.toString();
  }

  private bounceScore(playerId: number): void {
    const el = playerId === 1 ? this.scoreP1El : this.scoreP2El;
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
  }

  private updateCooldownUI(): void {
    const p1Percent = this.player1.getCooldownPercent() * 100;
    const p2Percent = this.player2.getCooldownPercent() * 100;
    this.cooldownP1El.style.width = `${p1Percent}%`;
    this.cooldownP2El.style.width = `${p2Percent}%`;
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playHitSound(): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  private playVictorySound(): void {
    if (!this.audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const startTime = this.audioContext.currentTime;

    for (let i = 0; i < notes.length; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[i], startTime + i * 0.15);

      gain.gain.setValueAtTime(0, startTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, startTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.15 + 0.3);

      osc.start(startTime + i * 0.15);
      osc.stop(startTime + i * 0.15 + 0.3);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
