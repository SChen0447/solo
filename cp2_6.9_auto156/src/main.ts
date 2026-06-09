import { Player, Bullet } from './player';
import { EnemyManager, Enemy } from './enemy';
import { PowerupManager } from './powerups';

const LOGICAL_WIDTH = 1280;
const LOGICAL_HEIGHT = 720;

interface Star {
  x: number;
  y: number;
  speed: number;
  radius: number;
  alpha: number;
}

type GameState = 'playing' | 'gameover';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemyManager: EnemyManager;
  private powerupManager: PowerupManager;
  private bullets: Bullet[];
  private stars: Star[];
  private starTimer: number;
  private score: number;
  private gameState: GameState;
  private lastTime: number;
  private startTime: number;
  private startTipVisible: boolean;
  private hudHearts: HTMLElement;
  private hudScore: HTMLElement;
  private hudWeapon: HTMLElement;
  private hudShieldRow: HTMLElement;
  private hudShield: HTMLElement;
  private hudSpeedRow: HTMLElement;
  private hudSpeed: HTMLElement;
  private hudWeaponUpRow: HTMLElement;
  private hudWeaponUp: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private restartBtn: HTMLElement;
  private startTipEl: HTMLElement;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.player = new Player(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.enemyManager = new EnemyManager(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.powerupManager = new PowerupManager(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.bullets = [];
    this.stars = [];
    this.starTimer = 0;
    this.score = 0;
    this.gameState = 'playing';
    this.lastTime = 0;
    this.startTime = performance.now();
    this.startTipVisible = true;

    this.hudHearts = document.getElementById('hud-hearts')!;
    this.hudScore = document.getElementById('hud-score')!;
    this.hudWeapon = document.getElementById('hud-weapon')!;
    this.hudShieldRow = document.getElementById('hud-shield-row')!;
    this.hudShield = document.getElementById('hud-shield')!;
    this.hudSpeedRow = document.getElementById('hud-speed-row')!;
    this.hudSpeed = document.getElementById('hud-speed')!;
    this.hudWeaponUpRow = document.getElementById('hud-weapon-up-row')!;
    this.hudWeaponUp = document.getElementById('hud-weapon-up')!;
    this.gameOverEl = document.getElementById('game-over')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.startTipEl = document.getElementById('start-tip')!;

    this.restartBtn.addEventListener('click', () => this.restart());

    this.startTipEl.classList.add('visible');
    setTimeout(() => {
      this.startTipEl.classList.remove('visible');
      this.startTipVisible = false;
    }, 2000);
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / LOGICAL_WIDTH, ch / LOGICAL_HEIGHT);
    this.canvas.style.width = `${LOGICAL_WIDTH * scale}px`;
    this.canvas.style.height = `${LOGICAL_HEIGHT * scale}px`;
    this.canvas.width = LOGICAL_WIDTH;
    this.canvas.height = LOGICAL_HEIGHT;
  }

  private spawnStar(): void {
    this.stars.push({
      x: -5,
      y: Math.random() * LOGICAL_HEIGHT,
      speed: 0.5 + Math.random() * 1,
      radius: 1 + Math.random(),
      alpha: 0.2 + Math.random() * 0.2
    });
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.gameState !== 'playing') return;

    this.starTimer -= deltaTime;
    if (this.starTimer <= 0) {
      this.spawnStar();
      this.starTimer = 2500 + Math.random() * 1500;
    }
    this.stars = this.stars.filter(s => {
      s.x += s.speed * (deltaTime / 16.67);
      return s.x < LOGICAL_WIDTH + 10;
    });

    this.player.update(deltaTime, currentTime, this.bullets);
    this.enemyManager.update(deltaTime, currentTime, this.bullets, this.player.state.x, this.player.state.y);
    this.powerupManager.update(deltaTime, this.player);

    this.bullets = this.bullets.filter(b => {
      b.x += b.vx * (deltaTime / 16.67);
      b.y += b.vy * (deltaTime / 16.67);
      return b.x > -20 && b.x < LOGICAL_WIDTH + 20 && b.y > -20 && b.y < LOGICAL_HEIGHT + 20;
    });

    this.checkCollisions();
    this.updateHUD();

    if (this.player.state.lives <= 0) {
      this.endGame();
    }
  }

  private checkCollisions(): void {
    const playerBounds = this.player.getBounds();
    const hasShield = this.player.hasShield();

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.fromPlayer) continue;

      for (const enemy of this.enemyManager.state.enemies) {
        const ex = enemy.x;
        const ey = enemy.y;
        const ehw = enemy.width / 2;
        const ehh = enemy.height / 2;
        if (
          b.x + b.radius > ex - ehw &&
          b.x - b.radius < ex + ehw &&
          b.y + b.radius > ey - ehh &&
          b.y - b.radius < ey + ehh
        ) {
          enemy.lives -= b.damage;
          this.bullets.splice(i, 1);
          if (enemy.lives <= 0) {
            this.enemyManager.createExplosion(enemy.x, enemy.y, enemy.color);
            this.score += enemy.score;
            this.enemyManager.registerKill(enemy.type);
            if (enemy.canDropPowerup) {
              this.powerupManager.spawn(enemy.x, enemy.y);
            }
            this.enemyManager.removeEnemy(enemy);
          }
          break;
        }
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.fromPlayer) continue;

      if (
        b.x + b.radius > playerBounds.x &&
        b.x - b.radius < playerBounds.x + playerBounds.width &&
        b.y + b.radius > playerBounds.y &&
        b.y - b.radius < playerBounds.y + playerBounds.height
      ) {
        this.bullets.splice(i, 1);
        if (!hasShield) {
          this.player.takeDamage();
        }
      }
    }

    for (let i = this.enemyManager.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemyManager.state.enemies[i];
      const ex = enemy.x;
      const ey = enemy.y;
      const ehw = enemy.width / 2;
      const ehh = enemy.height / 2;
      if (
        ex + ehw > playerBounds.x &&
        ex - ehw < playerBounds.x + playerBounds.width &&
        ey + ehh > playerBounds.y &&
        ey - ehh < playerBounds.y + playerBounds.height
      ) {
        if (hasShield) {
          this.enemyManager.createExplosion(enemy.x, enemy.y, enemy.color);
          this.score += enemy.score;
          this.enemyManager.registerKill(enemy.type);
          this.enemyManager.state.enemies.splice(i, 1);
        } else {
          this.enemyManager.createExplosion(enemy.x, enemy.y, enemy.color);
          this.enemyManager.state.enemies.splice(i, 1);
          this.player.takeDamage();
        }
      }
    }
  }

  private updateHUD(): void {
    const hearts = '♥'.repeat(Math.max(0, this.player.state.lives));
    this.hudHearts.textContent = hearts || '—';
    this.hudScore.textContent = String(this.score);
    this.hudWeapon.textContent = this.player.state.weaponLevel === 'dual' ? '双发' : '普通';

    if (this.player.state.shieldTimer > 0) {
      this.hudShieldRow.style.display = 'flex';
      this.hudShield.textContent = (this.player.state.shieldTimer / 1000).toFixed(1) + 's';
    } else {
      this.hudShieldRow.style.display = 'none';
    }

    if (this.player.state.speedBoostTimer > 0) {
      this.hudSpeedRow.style.display = 'flex';
      this.hudSpeed.textContent = (this.player.state.speedBoostTimer / 1000).toFixed(1) + 's';
    } else {
      this.hudSpeedRow.style.display = 'none';
    }

    if (this.player.state.weaponUpgradeTimer > 0) {
      this.hudWeaponUpRow.style.display = 'flex';
      this.hudWeaponUp.textContent = (this.player.state.weaponUpgradeTimer / 1000).toFixed(1) + 's';
    } else {
      this.hudWeaponUpRow.style.display = 'none';
    }
  }

  private render(currentTime: number): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    gradient.addColorStop(0, '#0B0B2B');
    gradient.addColorStop(1, '#1A1A4A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    for (const star of this.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#87CEEB';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.powerupManager.render(ctx, currentTime);

    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    this.enemyManager.render(ctx);
    this.player.render(ctx);
  }

  private loop = (timestamp: number): void => {
    if (!this.lastTime) this.lastTime = timestamp;
    const deltaTime = Math.min(33, timestamp - this.lastTime);
    this.lastTime = timestamp;

    this.update(deltaTime, timestamp);
    this.render(timestamp);

    requestAnimationFrame(this.loop);
  };

  private endGame(): void {
    this.gameState = 'gameover';
    this.finalScoreEl.textContent = String(this.score);
    this.gameOverEl.classList.add('visible');
  }

  private restart(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.bullets = [];
    this.player.reset();
    this.enemyManager.reset();
    this.powerupManager.reset();
    this.gameOverEl.classList.remove('visible');
    this.lastTime = 0;
  }

  start(): void {
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
