import { InputManager, InputState } from './input';
import {
  LevelManager, MAX_HP, SCORE_PER_ENEMY, SCORE_PER_BOSS,
  LEVEL_UP_SCORE, BOSS_TRIGGER_SCORE,
} from './levels';
import {
  Player, Enemy, SupplyBox, SupplyType, Boss, HomingBullet, Particle, ParticleShape,
} from './entities';
import { Renderer, Star, generateStars, MAX_PARTICLES } from './renderer';

type GameStatus = 'playing' | 'gameover';

interface GameState {
  status: GameStatus;
  score: number;
  hp: number;
  maxHp: number;
  nextLevelScore: number;
  nextBossScore: number;
  rapidFireTimer: number;
  shieldTimer: number;
  borderFlashTimer: number;
  borderFlashColor: string;
  hpFlashTimer: number;
  levelUpTimer: number;
  bossActive: boolean;
}

class Game {
  private canvas: HTMLCanvasElement;
  private input: InputManager;
  private levels: LevelManager;
  private renderer: Renderer;
  private player!: Player;
  private enemies: Enemy[];
  private supplies: SupplyBox[];
  private homingBullets: HomingBullet[];
  private particles: Particle[];
  private boss: Boss | null;
  private stars: Star[];
  private state!: GameState;
  private lastTime: number;
  private enemySpawnTimer: number;
  private supplySpawnTimer: number;
  private rafId: number | null;
  private running: boolean;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.input = new InputManager(this.canvas);
    this.levels = new LevelManager();
    this.renderer = new Renderer(this.canvas);

    this.enemies = [];
    this.supplies = [];
    this.homingBullets = [];
    this.particles = [];
    this.boss = null;
    this.stars = [];

    this.lastTime = 0;
    this.enemySpawnTimer = 0;
    this.supplySpawnTimer = 0;
    this.rafId = null;
    this.running = false;

    this.setupResize();
    this.setupRestart();
    this.reset();
  }

  private setupResize(): void {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.resize(w, h);
      this.stars = generateStars(w, h);
      if (this.player) {
        this.player.setTarget(w / 2, h / 2);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  private setupRestart(): void {
    this.canvas.addEventListener('mousedown', (_e) => {
      if (this.state.status === 'gameover') {
        this.reset();
      }
    });
  }

  private reset(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.player = new Player(w, h);
    this.enemies = [];
    this.supplies = [];
    this.homingBullets = [];
    this.particles = [];
    this.boss = null;
    this.levels.reset();
    this.stars = generateStars(w, h);
    this.state = {
      status: 'playing',
      score: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      nextLevelScore: LEVEL_UP_SCORE,
      nextBossScore: BOSS_TRIGGER_SCORE,
      rapidFireTimer: 0,
      shieldTimer: 0,
      borderFlashTimer: 0,
      borderFlashColor: '#ffffff',
      hpFlashTimer: 0,
      levelUpTimer: 0,
      bossActive: false,
    };
    this.enemySpawnTimer = 0;
    this.supplySpawnTimer = 0;
    this.lastTime = performance.now();
    if (!this.running) this.start();
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.lastTime) / 1000);
      this.lastTime = t;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private update(dt: number): void {
    if (this.state.status !== 'playing') {
      this.input.update();
      return;
    }

    const input: InputState = this.input.update();
    this.player.setTarget(input.mouseX, input.mouseY);
    this.player.rapidFire = this.state.rapidFireTimer > 0;
    this.player.update(dt);

    if (input.justClicked) {
      const fired = this.player.triggerShoot();
      if (fired) {
        this.handleShoot();
      }
    }

    if (this.state.rapidFireTimer > 0) this.state.rapidFireTimer -= dt;
    if (this.state.shieldTimer > 0) this.state.shieldTimer -= dt;
    if (this.state.borderFlashTimer > 0) this.state.borderFlashTimer -= dt;
    if (this.state.hpFlashTimer > 0) this.state.hpFlashTimer -= dt;
    if (this.state.levelUpTimer > 0) this.state.levelUpTimer -= dt;

    if (!this.state.bossActive) {
      this.spawnEnemies(dt);
    }
    this.spawnSupplies(dt);
    this.updateEnemies(dt);
    this.updateSupplies(dt);
    this.updateBoss(dt);
    this.updateHomingBullets(dt);
    this.updateParticles(dt);

    this.checkCollisions();
  }

  private spawnEnemies(dt: number): void {
    this.enemySpawnTimer -= dt * 1000;
    if (this.enemySpawnTimer <= 0) {
      const cfg = this.levels.getConfig();
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.enemies.push(new Enemy(w, h, cfg.enemySpeedMultiplier));
      this.enemySpawnTimer = cfg.enemySpawnMin + Math.random() * (cfg.enemySpawnMax - cfg.enemySpawnMin);
    }
  }

  private spawnSupplies(dt: number): void {
    this.supplySpawnTimer += dt * 1000;
    if (this.supplySpawnTimer >= 30000) {
      this.supplySpawnTimer = 0;
      const w = this.canvas.width;
      this.supplies.push(new SupplyBox(w));
    }
  }

  private updateEnemies(dt: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const e of this.enemies) e.update(dt, w, h);
    this.enemies = this.enemies.filter((e) => e.active);
  }

  private updateSupplies(dt: number): void {
    const h = this.canvas.height;
    for (const s of this.supplies) s.update(dt, h);
    this.supplies = this.supplies.filter((s) => s.active);
  }

  private updateBoss(dt: number): void {
    if (!this.boss) {
      if (this.state.bossActive && this.state.score >= this.state.nextBossScore - 1) {
        // trigger handled on score change
      }
      return;
    }
    this.boss.update(dt, this.canvas.width, this.canvas.height);
    if (this.boss.canFire()) {
      this.homingBullets.push(new HomingBullet(this.boss.x, this.boss.y));
    }
    if (!this.boss.active) {
      this.spawnBossExplosion();
      this.addScore(SCORE_PER_BOSS);
      this.boss = null;
      this.state.bossActive = false;
      this.state.nextBossScore += BOSS_TRIGGER_SCORE;
    }
  }

  private updateHomingBullets(dt: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const b of this.homingBullets) {
      b.update(dt, this.player.x, this.player.y, w, h);
    }
    this.homingBullets = this.homingBullets.filter((b) => b.active);
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.active);
  }

  private handleShoot(): void {
    const px = this.player.x;
    const py = this.player.y;

    for (let i = 0; i < 3; i++) {
      this.spawnParticle(px, py, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.2, '#ffffff', 3, 'spark');
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (this.pointInCircle(px, py, e.getBounds())) {
        this.explodeEnemy(e);
        this.enemies.splice(i, 1);
        this.addScore(SCORE_PER_ENEMY);
        return;
      }
    }

    for (let i = this.supplies.length - 1; i >= 0; i--) {
      const s = this.supplies[i];
      if (this.pointInCircle(px, py, s.getBounds())) {
        this.triggerSupplyEffect(s.type);
        this.supplies.splice(i, 1);
        return;
      }
    }

    for (let i = this.homingBullets.length - 1; i >= 0; i--) {
      const b = this.homingBullets[i];
      if (this.pointInCircle(px, py, b.getBounds())) {
        for (let j = 0; j < 4; j++) {
          this.spawnParticle(b.x, b.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.3, '#ff4500', 3, 'spark');
        }
        this.homingBullets.splice(i, 1);
        return;
      }
    }

    if (this.boss) {
      const wp = this.boss.getWeakpointBounds();
      if (this.pointInCircle(px, py, wp)) {
        const killed = this.boss.takeDamage();
        for (let j = 0; j < 5; j++) {
          this.spawnParticle(wp.x, wp.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 0.4, '#ffffff', 4, 'spark');
        }
        if (killed) {
          this.state.bossActive = false;
        }
        return;
      }
    }
  }

  private explodeEnemy(e: Enemy): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      this.spawnParticle(
        e.x, e.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.5, e.color, 6, 'triangle',
        (Math.random() - 0.5) * 6,
      );
    }
  }

  private spawnBossExplosion(): void {
    if (!this.boss) return;
    const bx = this.boss.x;
    const by = this.boss.y;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.spawnParticle(
        bx, by,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        1.5, i % 2 === 0 ? '#ff0000' : '#ffd700',
        6 + Math.random() * 4, 'star',
        (Math.random() - 0.5) * 8,
      );
    }
  }

  private spawnParticle(
    x: number, y: number,
    vx: number, vy: number,
    life: number, color: string,
    size: number, shape: ParticleShape,
    rotSpeed: number = 0,
  ): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES + 1);
    }
    this.particles.push(new Particle(x, y, vx, vy, life, color, size, shape, rotSpeed));
  }

  private triggerSupplyEffect(type: SupplyType): void {
    if (type === 'rapid') {
      this.state.rapidFireTimer = 3;
      this.state.borderFlashTimer = 0.3;
      this.state.borderFlashColor = '#00ff88';
    } else if (type === 'shield') {
      this.state.shieldTimer = 5;
      this.state.borderFlashTimer = 0.3;
      this.state.borderFlashColor = '#00c8ff';
    } else {
      this.state.score *= 2;
      this.state.nextLevelScore = Math.ceil(this.state.score / LEVEL_UP_SCORE) * LEVEL_UP_SCORE + LEVEL_UP_SCORE;
      this.state.nextBossScore = Math.max(this.state.nextBossScore, this.state.score + 1);
      this.state.borderFlashTimer = 0.3;
      this.state.borderFlashColor = '#ffd700';
    }
  }

  private addScore(points: number): void {
    this.state.score += points;
    while (this.state.score >= this.state.nextLevelScore) {
      this.state.nextLevelScore += LEVEL_UP_SCORE;
      this.levels.levelUp();
      this.state.levelUpTimer = 1.2;
    }
    if (this.state.score >= this.state.nextBossScore && !this.state.bossActive && !this.boss) {
      this.spawnBoss();
    }
  }

  private spawnBoss(): void {
    this.state.bossActive = true;
    const cfg = this.levels.getConfig();
    this.boss = new Boss(this.canvas.width, this.canvas.height, cfg.bossHp);
    this.enemies = [];
  }

  private checkCollisions(): void {
    if (this.state.shieldTimer > 0) return;
    const pb = this.player.getBounds();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.circleCircle(pb, this.enemies[i].getBounds())) {
        this.explodeEnemy(this.enemies[i]);
        this.enemies.splice(i, 1);
        this.damagePlayer();
        return;
      }
    }

    for (let i = this.homingBullets.length - 1; i >= 0; i--) {
      if (this.circleCircle(pb, this.homingBullets[i].getBounds())) {
        this.homingBullets.splice(i, 1);
        this.damagePlayer();
        return;
      }
    }
  }

  private damagePlayer(): void {
    this.state.hp--;
    this.state.hpFlashTimer = 0.2;
    this.state.borderFlashTimer = 0.2;
    this.state.borderFlashColor = '#ff0000';
    if (this.state.hp <= 0) {
      this.state.status = 'gameover';
    }
  }

  private pointInCircle(px: number, py: number, c: { x: number; y: number; r: number }): boolean {
    const dx = px - c.x;
    const dy = py - c.y;
    return dx * dx + dy * dy <= c.r * c.r;
  }

  private circleCircle(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = a.r + b.r;
    return dx * dx + dy * dy <= rr * rr;
  }

  private render(): void {
    const inputState = this.input.getState();
    this.renderer.clear();
    this.renderer.drawBackground(inputState.mouseX, inputState.mouseY, this.stars);

    for (const p of this.particles) this.renderer.drawParticle(p);
    for (const e of this.enemies) this.renderer.drawEnemy(e);
    for (const s of this.supplies) this.renderer.drawSupplyBox(s);
    for (const b of this.homingBullets) this.renderer.drawHomingBullet(b);
    if (this.boss) this.renderer.drawBoss(this.boss);

    this.renderer.drawHUD(
      this.state.score,
      this.levels.getLevel(),
      this.state.hp,
      this.state.maxHp,
      this.state.hpFlashTimer,
      this.state.shieldTimer > 0,
      this.player.x,
      this.player.y,
    );

    this.renderer.drawPlayer(this.player);

    if (this.state.borderFlashTimer > 0) {
      const alpha = Math.min(1, this.state.borderFlashTimer / 0.3);
      this.renderer.drawBorderFlash(this.state.borderFlashColor, alpha);
    }

    if (this.state.levelUpTimer > 0) {
      this.renderer.drawLevelUp(this.state.levelUpTimer);
    }

    if (this.state.status === 'gameover') {
      this.renderer.drawGameOver(this.state.score);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
