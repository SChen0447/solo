import { Player } from './player';
import { AIController } from './ai';
import { Scene } from './scene';

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player!: Player;
  ai!: AIController;
  scene!: Scene;
  gameState: 'playing' | 'gameover' = 'playing';
  lastTime: number = 0;
  gameTime: number = 0;
  mouseX: number = 0;
  mouseY: number = 0;
  fps: number = 0;
  fpsTimer: number = 0;
  frameCount: number = 0;
  animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
    
    this.resize();
    this.initGame();
    this.setupEventListeners();
    this.start();
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
    
    if (this.scene) {
      this.scene.resize(w, h);
    }
  }

  initGame(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.player = new Player(w / 2, h / 2);
    this.ai = new AIController(w * 0.2, h * 0.2);
    this.scene = new Scene(w, h);
    this.gameState = 'playing';
    this.gameTime = 0;
    
    this.mouseX = w / 2;
    this.mouseY = h / 2;
    this.player.setTarget(w / 2, h / 2);
  }

  setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.gameState === 'playing') {
        this.player.setTarget(this.mouseX, this.mouseY);
      }
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (this.gameState === 'gameover') {
        if (this.scene.isRestartButtonClicked(e.clientX, e.clientY)) {
          this.restart();
        }
      }
    });
    
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameState === 'playing' && this.player.canReleasePulse()) {
          this.releasePulse();
        }
      }
    });
  }

  releasePulse(): void {
    this.player.releasePulse();
    this.scene.triggerPulse(this.player.x, this.player.y);
    
    const dist = this.ai.getDistanceToPlayer(this.player);
    if (dist <= 120 && !this.ai.isStunned()) {
      this.ai.pushBack(this.player.x, this.player.y, 120);
      this.ai.stun();
    }
    
    this.ai.increaseDifficulty();
  }

  restart(): void {
    this.initGame();
    this.scene.reset();
    this.gameState = 'playing';
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  loop(): void {
    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    if (deltaTime > 0.1) deltaTime = 0.1;
    
    this.gameTime += deltaTime;
    
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update(deltaTime: number): void {
    if (this.gameState !== 'playing') return;
    
    this.player.update(deltaTime);
    this.ai.update(deltaTime, this.player, window.innerWidth, window.innerHeight);
    this.scene.update(deltaTime, this.player);
    
    const dist = this.ai.getDistanceToPlayer(this.player);
    this.player.setWarning(dist < 50 && !this.ai.isStunned());
    
    if (this.ai.checkCollision(this.player) && !this.ai.isStunned()) {
      this.gameOver();
    }
  }

  gameOver(): void {
    this.gameState = 'gameover';
    this.scene.gameOver = true;
  }

  render(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    ctx.clearRect(0, 0, w, h);
    
    this.scene.drawBackground(ctx);
    this.scene.drawStars(ctx, this.gameTime);
    this.scene.drawHexGrid(ctx);
    this.scene.drawFragments(ctx);
    this.scene.drawPulseWave(ctx);
    this.scene.drawPulseParticles(ctx);
    
    this.ai.draw(ctx);
    this.player.draw(ctx);
    
    this.scene.drawEnergyBar(ctx, this.player.energy, this.player.maxEnergy);
    this.scene.drawScoreboard(ctx);
    this.scene.drawGameOver(ctx);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
