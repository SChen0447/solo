import { Player } from './Player';
import {
  Enemy,
  EnemyBullet,
  Particle,
  updateEnemyBullets,
  renderEnemyBullets,
  updateParticles,
  renderParticles,
  pickEnemyType
} from './Enemy';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

class GameMain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly width: number = 800;
  private readonly height: number = 600;

  private player: Player;
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];

  private waveTimer: number = 0;
  private waveInterval: number = 5;
  private waveNumber: number = 0;

  private gameOver: boolean = false;
  private lastTime: number = 0;
  private running: boolean = false;

  private restartButton: { x: number; y: number; width: number; height: number } | null = null;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;

    this.player = new Player(this.width, this.height);
    this.generateStars();
    this.setupRestartHandler();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() < 0.7 ? 1 : 2,
        brightness: 0.3 + Math.random() * 0.7
      });
    }
  }

  private setupRestartHandler(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.gameOver && e.key.toLowerCase() === 'r') {
        this.restart();
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.gameOver || !this.restartButton) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.width / rect.width);
      const y = (e.clientY - rect.top) * (this.height / rect.height);
      const b = this.restartButton;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        this.restart();
      }
    });
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.spawnWave();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    this.player.update(dt);

    this.waveTimer += dt;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    for (const enemy of this.enemies) {
      const newBullets = enemy.update(
        dt,
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );
      this.enemyBullets.push(...newBullets);
    }

    this.enemies = this.enemies.filter(e => e.active && !e.isOffScreen(this.height));

    updateEnemyBullets(
      this.enemyBullets,
      dt,
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      this.width,
      this.height
    );
    this.enemyBullets = this.enemyBullets.filter(b => b.active);

    updateParticles(this.particles, dt);
    this.particles = this.particles.filter(p => p.life > 0);

    this.checkCollisions();
    this.performPerformanceOptimization();

    if (this.player.lives <= 0) {
      this.gameOver = true;
    }
  }

  private spawnWave(): void {
    this.waveNumber++;
    const count = Math.min(3 + (this.waveNumber - 1) * 2, 15);

    for (let i = 0; i < count; i++) {
      const type = pickEnemyType();
      const x = 60 + Math.random() * (this.width - 120);
      const y = -30 - Math.random() * 80 - i * 20;
      this.enemies.push(new Enemy(x, y, type));
    }
  }

  private checkCollisions(): void {
    const playerBox = this.player.getCollisionBox();

    for (const bullet of this.player.bullets) {
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const eb = enemy.getCollisionBox();
        if (
          bullet.x < eb.x + eb.width &&
          bullet.x + bullet.width > eb.x &&
          bullet.y < eb.y + eb.height &&
          bullet.y + bullet.height > eb.y
        ) {
          bullet.active = false;
          enemy.hit();
          if (!enemy.active) {
            this.player.score += 10;
            this.particles.push(...enemy.createExplosionParticles());
          }
          break;
        }
      }
    }
    this.player.bullets = this.player.bullets.filter(b => b.active);

    if (!this.player.invincible) {
      for (const bullet of this.enemyBullets) {
        if (!bullet.active) continue;
        if (
          bullet.x < playerBox.x + playerBox.width &&
          bullet.x + bullet.width > playerBox.x &&
          bullet.y < playerBox.y + playerBox.height &&
          bullet.y + bullet.height > playerBox.y
        ) {
          bullet.active = false;
          this.player.hit();
          break;
        }
      }

      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const eb = enemy.getCollisionBox();
        if (
          playerBox.x < eb.x + eb.width &&
          playerBox.x + playerBox.width > eb.x &&
          playerBox.y < eb.y + eb.height &&
          playerBox.y + playerBox.height > eb.y
        ) {
          this.player.hit();
          enemy.hit();
          if (!enemy.active) {
            this.particles.push(...enemy.createExplosionParticles());
          }
          break;
        }
      }
    }
  }

  private performPerformanceOptimization(): void {
    const total = this.enemies.length + this.enemyBullets.length;
    if (total > 200 && this.enemyBullets.length > 0) {
      const playerCenterX = this.player.x + this.player.width / 2;
      const playerCenterY = this.player.y + this.player.height / 2;

      const bulletsWithDistance = this.enemyBullets.map(b => ({
        bullet: b,
        dist: Math.sqrt(
          Math.pow(b.x - playerCenterX, 2) + Math.pow(b.y - playerCenterY, 2)
        )
      }));

      bulletsWithDistance.sort((a, b) => b.dist - a.dist);

      const removeCount = Math.floor(bulletsWithDistance.length * 0.3);
      for (let i = 0; i < removeCount; i++) {
        bulletsWithDistance[i].bullet.active = false;
      }
      this.enemyBullets = this.enemyBullets.filter(b => b.active);
    }
  }

  private render(): void {
    this.renderBackground();
    this.renderStars();

    renderParticles(this.ctx, this.particles);

    for (const enemy of this.enemies) {
      enemy.render(this.ctx);
    }

    renderEnemyBullets(this.ctx, this.enemyBullets);
    this.player.renderBullets(this.ctx);
    this.player.render(this.ctx);

    this.renderUI();

    if (this.gameOver) {
      this.renderGameOver();
    }
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a001a');
    gradient.addColorStop(1, '#1a0030');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderStars(): void {
    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }
  }

  private renderUI(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(`得分: ${this.player.score}`, 16, 16);
    this.ctx.shadowBlur = 0;

    for (let i = 0; i < this.player.lives; i++) {
      this.drawHeart(this.width - 24 - i * 20, 20);
    }
  }

  private drawHeart(x: number, y: number): void {
    const s = 8;
    this.ctx.fillStyle = '#ff3355';
    this.ctx.fillRect(x, y + 2, s, s - 2);
    this.ctx.fillRect(x + 2, y, s - 4, s);
    this.ctx.fillRect(x - 1, y + 3, 2, 3);
    this.ctx.fillRect(x + s - 1, y + 3, 2, 3);
    this.ctx.fillStyle = '#ff8899';
    this.ctx.fillRect(x + 2, y + 2, 2, 2);
  }

  private renderGameOver(): void {
    this.ctx.fillStyle = 'rgba(10, 0, 26, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#ff3366';
    this.ctx.shadowBlur = 16;
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 80);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '28px "Courier New", monospace';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText(`最终得分: ${this.player.score}`, this.width / 2, this.height / 2 - 20);
    this.ctx.shadowBlur = 0;

    const btnWidth = 200;
    const btnHeight = 50;
    const btnX = this.width / 2 - btnWidth / 2;
    const btnY = this.height / 2 + 40;
    this.restartButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

    this.ctx.fillStyle = '#3a1a5e';
    this.ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    this.ctx.strokeStyle = '#00d4ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px "Courier New", monospace';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 6;
    this.ctx.fillText('重新开始', this.width / 2, btnY + btnHeight / 2);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#aaaacc';
    this.ctx.fillText('按 R 键或点击按钮重新开始', this.width / 2, btnY + btnHeight + 30);
  }

  private restart(): void {
    this.player.reset();
    this.enemies = [];
    this.enemyBullets = [];
    this.particles = [];
    this.waveTimer = 0;
    this.waveNumber = 0;
    this.gameOver = false;
    this.restartButton = null;
    this.spawnWave();
  }
}

const game = new GameMain();
game.start();
