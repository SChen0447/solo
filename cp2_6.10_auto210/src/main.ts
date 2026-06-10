import { Player, Enemy, Bullet, Explosion, Star, SpatialHash } from './entities';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private stars: Star[] = [];

  private keys: Set<string> = new Set();
  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;

  private score: number = 0;
  private combo: number = 0;
  private lastHitTime: number = 0;
  private comboTimeout: number = 1000;

  private gameStartTime: number = 0;
  private gameDuration: number = 120000;
  private isGameOver: boolean = false;

  private lastEnemySpawnTime: number = 0;
  private enemySpawnInterval: number = 1500;
  private maxEntities: number = 200;

  private spatialHash: SpatialHash;
  private enemyIdCounter: number = 0;

  private scoreEl: HTMLElement | null = null;
  private comboEl: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private comboDisplayEl: HTMLElement | null = null;
  private gameOverPanel: HTMLElement | null = null;
  private finalScoreEl: HTMLElement | null = null;
  private restartBtn: HTMLElement | null = null;

  private isMobile: boolean = false;
  private mobileSpeedMultiplier: number = 1.5;
  private mobileBulletRadiusMultiplier: number = 1.2;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.spatialHash = new SpatialHash(50);
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth < 768;

    this.initUI();
    this.resize();
    this.initEntities();
    this.bindEvents();
  }

  private initUI(): void {
    this.scoreEl = document.getElementById('score');
    this.comboEl = document.getElementById('combo');
    this.timerEl = document.getElementById('timer');
    this.comboDisplayEl = document.getElementById('comboDisplay');
    this.gameOverPanel = document.getElementById('gameOverPanel');
    this.finalScoreEl = document.getElementById('finalScore');
    this.restartBtn = document.getElementById('restartBtn');
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.stars.length === 0) {
      this.initStars();
    } else {
      this.stars.forEach(star => {
        star.x = Math.min(star.x, this.width);
        star.y = Math.min(star.y, this.height);
      });
    }

    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth < 768;
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push(new Star(this.width, this.height));
    }
  }

  private initEntities(): void {
    this.player = new Player(this.width / 2, this.height - 100);
    if (this.isMobile) {
      this.player.speed = 3 * this.mobileSpeedMultiplier;
    }
    this.enemies = [];
    this.bullets = [];
    this.explosions = [];
    this.score = 0;
    this.combo = 0;
    this.lastHitTime = 0;
    this.isGameOver = false;
    this.gameStartTime = performance.now();
    this.lastEnemySpawnTime = performance.now();
    this.enemyIdCounter = 0;
    this.updateUI();
    this.hideGameOver();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    window.addEventListener('resize', () => {
      this.resize();
    });

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        this.restart();
      });
    }
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = currentTime;

    if (!this.isGameOver) {
      this.update(deltaTime, currentTime);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(dt: number, currentTime: number): void {
    for (const star of this.stars) {
      star.update(currentTime);
    }

    this.handleInput(dt, currentTime);

    const totalEntities = this.enemies.length + this.bullets.length;
    if (currentTime - this.lastEnemySpawnTime >= this.enemySpawnInterval && totalEntities < this.maxEntities) {
      this.spawnEnemy();
      this.lastEnemySpawnTime = currentTime;
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.width, this.height);
    }
    this.enemies = this.enemies.filter(e => e.alive);

    for (const bullet of this.bullets) {
      bullet.update(dt, this.width, this.height);
    }
    this.bullets = this.bullets.filter(b => b.alive);

    for (const explosion of this.explosions) {
      explosion.update(dt);
    }
    this.explosions = this.explosions.filter(e => e.alive);

    this.player.update(dt, this.combo);

    this.checkCollisions(currentTime);
    this.checkComboTimeout(currentTime);
    this.updateTimer(currentTime);
  }

  private handleInput(dt: number, currentTime: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) dy += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.player.move(dx, dy, this.width, this.height, dt);

    if (this.keys.has(' ')) {
      const bullet = this.player.shoot(currentTime);
      if (bullet) {
        if (this.isMobile) {
          bullet.radius *= this.mobileBulletRadiusMultiplier;
        }
        this.bullets.push(bullet);
      }
    }
  }

  private spawnEnemy(): void {
    const x = Math.random() * (this.width - 60) + 30;
    const y = -30;
    const id = `enemy_${this.enemyIdCounter++}`;
    this.enemies.push(new Enemy(x, y, id));
  }

  private checkCollisions(currentTime: number): void {
    this.spatialHash.clear();
    for (const enemy of this.enemies) {
      this.spatialHash.insert(enemy);
    }

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      const candidates = this.spatialHash.query(bullet) as Enemy[];
      for (const enemy of candidates) {
        if (!enemy.alive) continue;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = bullet.getBoundingRadius() + enemy.getBoundingRadius();
        if (dist < minDist) {
          bullet.alive = false;
          enemy.alive = false;
          this.explosions.push(new Explosion(enemy.x, enemy.y));
          this.addScore(currentTime);
          break;
        }
      }
    }

    if (this.player.alive) {
      const playerCandidates = this.spatialHash.query(this.player) as Enemy[];
      for (const enemy of playerCandidates) {
        if (!enemy.alive) continue;
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.player.getBoundingRadius() + enemy.getBoundingRadius();
        if (dist < minDist) {
          this.gameOver();
          break;
        }
      }
    }
  }

  private addScore(currentTime: number): void {
    if (currentTime - this.lastHitTime <= this.comboTimeout && this.combo > 0) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastHitTime = currentTime;

    const baseScore = 10;
    const comboBonus = (this.combo - 1) * 5;
    this.score += baseScore + comboBonus;

    this.showComboDisplay();
    this.updateUI();
  }

  private checkComboTimeout(currentTime: number): void {
    if (this.combo > 0 && currentTime - this.lastHitTime > this.comboTimeout) {
      this.combo = 0;
      this.updateUI();
    }
  }

  private showComboDisplay(): void {
    if (this.comboDisplayEl && this.combo >= 2) {
      this.comboDisplayEl.textContent = `${this.combo} 连击!`;
      this.comboDisplayEl.style.opacity = '1';
      this.comboDisplayEl.style.animation = 'none';
      this.comboDisplayEl.offsetHeight;
      this.comboDisplayEl.style.animation = 'comboFlash 0.5s ease-in-out infinite alternate';

      if (!document.getElementById('combo-style')) {
        const style = document.createElement('style');
        style.id = 'combo-style';
        style.textContent = `
          @keyframes comboFlash {
            0% { opacity: 0.6; transform: translateX(-50%) scale(1); }
            100% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        if (this.comboDisplayEl) {
          this.comboDisplayEl.style.opacity = '0';
        }
      }, 800);
    }
  }

  private updateTimer(currentTime: number): void {
    const elapsed = currentTime - this.gameStartTime;
    const remaining = Math.max(0, this.gameDuration - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    if (this.timerEl) {
      this.timerEl.textContent = `倒计时: ${seconds}s`;
    }

    if (remaining <= 0) {
      this.gameOver();
    }
  }

  private updateUI(): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = `分数: ${this.score}`;
    }
    if (this.comboEl) {
      this.comboEl.textContent = `连击: ${this.combo}`;
    }
  }

  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.player.alive = false;
    this.showGameOver();
  }

  private showGameOver(): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.style.display = 'flex';
    }
    if (this.finalScoreEl) {
      this.finalScoreEl.textContent = `最终分数: ${this.score}`;
    }
  }

  private hideGameOver(): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.style.display = 'none';
    }
  }

  public restart(): void {
    this.initEntities();
  }

  private render(): void {
    this.ctx.fillStyle = 'rgba(13, 2, 33, 1)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawBackgroundGradient();

    for (const star of this.stars) {
      star.draw(this.ctx, this.lastFrameTime);
    }

    for (const explosion of this.explosions) {
      explosion.draw(this.ctx);
    }

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }

    this.player.draw(this.ctx);
  }

  private drawBackgroundGradient(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d0221');
    gradient.addColorStop(1, '#150734');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
