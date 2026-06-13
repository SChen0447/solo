import gsap from 'gsap';
import { Player } from './player';
import { Level } from './level';
import { audioManager } from './audio';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private player!: Player;
  private level!: Level;

  private score: number = 0;
  private breakCountForBurst: number = 0;
  private running: boolean = false;
  private gameOver: boolean = false;
  private lastTime: number = 0;

  private scoreDisplay!: HTMLElement;
  private scoreValue!: HTMLElement;
  private livesDisplay!: HTMLElement;
  private burstIndicator!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private finalScoreEl!: HTMLElement;
  private restartBtn!: HTMLElement;

  private heartSVG: string = `<svg class="heart" viewBox="0 0 24 24" fill="url(#heartGradient)">
    <defs>
      <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff6b6b" />
        <stop offset="100%" stop-color="#a29bfe" />
      </linearGradient>
    </defs>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>`;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.initUI();
    this.resize();
    this.initGameObjects();
    this.bindEvents();
  }

  private initUI(): void {
    this.scoreDisplay = document.getElementById('score-display') as HTMLElement;
    this.scoreValue = document.getElementById('score-value') as HTMLElement;
    this.livesDisplay = document.getElementById('lives-display') as HTMLElement;
    this.burstIndicator = document.getElementById('burst-indicator') as HTMLElement;
    this.gameOverEl = document.getElementById('game-over') as HTMLElement;
    this.finalScoreEl = document.getElementById('final-score') as HTMLElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLElement;

    this.updateLivesUI();
    this.updateScoreUI(false);
  }

  private initGameObjects(): void {
    this.player = new Player(this.width / 2, this.height * 0.35);
    this.level = new Level(this.width, this.height);
  }

  private resize = (): void => {
    const container = document.getElementById('game-container') as HTMLElement;
    this.width = Math.max(800, container.clientWidth);
    this.height = Math.max(600, container.clientHeight);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(dpr, dpr);

    if (this.level) {
      this.level.resize(this.width, this.height);
    }
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.running) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.player.setTargetX(mouseX, this.width);
    });

    this.canvas.addEventListener('mousedown', async (e: MouseEvent) => {
      if (!this.running) return;
      e.preventDefault();
      await audioManager.init();
      this.player.boost();
    });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.running || e.touches.length === 0) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      this.player.setTargetX(touchX, this.width);
    }, { passive: false });

    this.canvas.addEventListener('touchstart', async (e: TouchEvent) => {
      if (!this.running) return;
      e.preventDefault();
      await audioManager.init();
      this.player.boost();
    }, { passive: false });

    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });
  }

  start(): void {
    this.running = true;
    this.gameOver = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (time: number): void => {
    const deltaTime = Math.min((time - this.lastTime) / 1000, 1 / 30);
    this.lastTime = time;

    if (this.running && !this.gameOver) {
      this.update(deltaTime);
    }
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    this.level.update(deltaTime);

    this.player.update(deltaTime, this.level.getSinkSpeed());

    const collision = this.level.checkPlayerCollision(this.player);
    if (collision.broken && collision.brokenBlocks) {
      for (const _block of collision.brokenBlocks) {
        this.score++;
        this.breakCountForBurst++;
        if (this.breakCountForBurst >= 10) {
          this.breakCountForBurst = 0;
          const burstBlocks = this.level.triggerResonanceBurst(this.player);
          this.score += burstBlocks.length;
          this.showBurstIndicator();
        }
      }
      this.updateScoreUI(true);
    }

    if (collision.bounced) {
      this.updateLivesUI();
      if (this.player.lives <= 0) {
        this.triggerGameOver();
      }
    }

    if (this.level.checkPlayerOutOfBounds(this.player)) {
      this.triggerGameOver();
    }
  }

  private render(): void {
    const ctx = this.ctx;

    const bgGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    bgGradient.addColorStop(0, '#0a0e27');
    bgGradient.addColorStop(0.5, '#05081a');
    bgGradient.addColorStop(1, '#000000');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    const centerGlow = ctx.createRadialGradient(
      this.width / 2, this.height * 0.4, 0,
      this.width / 2, this.height * 0.4, Math.min(this.width, this.height) * 0.5
    );
    centerGlow.addColorStop(0, 'rgba(72, 219, 251, 0.08)');
    centerGlow.addColorStop(1, 'rgba(72, 219, 251, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    this.level.render(ctx);
    this.player.render(ctx);
  }

  private updateScoreUI(animate: boolean): void {
    this.scoreValue.textContent = this.score.toString();
    if (animate) {
      this.scoreDisplay.classList.remove('pulse');
      void this.scoreDisplay.offsetWidth;
      this.scoreDisplay.classList.add('pulse');
      gsap.delayedCall(0.2, () => {
        this.scoreDisplay.classList.remove('pulse');
      });
    }
  }

  private updateLivesUI(): void {
    this.livesDisplay.innerHTML = '';
    for (let i = 0; i < this.player.maxLives; i++) {
      const heart = document.createElement('span');
      heart.innerHTML = this.heartSVG;
      if (i >= this.player.lives) {
        const svg = heart.querySelector('svg') as SVGElement;
        if (svg) svg.classList.add('lost');
      }
      this.livesDisplay.appendChild(heart);
    }
  }

  private showBurstIndicator(): void {
    gsap.killTweensOf(this.burstIndicator);
    this.burstIndicator.style.opacity = '0';
    this.burstIndicator.style.transform = 'translate(-50%, -50%) scale(0.5)';

    gsap.to(this.burstIndicator, {
      opacity: 1,
      scale: 1.2,
      duration: 0.2,
      ease: 'back.out(2)'
    });

    gsap.to(this.burstIndicator, {
      opacity: 0,
      scale: 1,
      duration: 0.3,
      delay: 0.4,
      ease: 'power2.in'
    });
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.running = false;
    this.finalScoreEl.textContent = `共击碎 ${this.score} 个方块`;
    this.gameOverEl.classList.add('visible');
  }

  private restart(): void {
    this.gameOverEl.classList.remove('visible');
    this.score = 0;
    this.breakCountForBurst = 0;
    this.updateScoreUI(false);
    this.player = new Player(this.width / 2, this.height * 0.35);
    this.player.resetLives();
    this.level.reset();
    this.updateLivesUI();
    this.running = true;
    this.gameOver = false;
    this.lastTime = performance.now();
  }
}

const game = new Game();
game.start();
