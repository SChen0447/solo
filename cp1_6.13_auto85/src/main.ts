import { Ship } from './ship';
import { Asteroid, Crystal, BlackHole } from './entities';
import { ParticleSystem } from './particles';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private ship!: Ship;
  private asteroids: Asteroid[] = [];
  private crystals: Crystal[] = [];
  private blackHole: BlackHole | null = null;
  private particleSystem!: ParticleSystem;
  private stars: Star[] = [];

  private gameState: 'playing' | 'gameover' = 'playing';
  private crystalsCollected: number = 0;
  private blackHoleTriggerCount: number = 0;
  private gameOverTimer: number = 0;
  private gameOverFlash: number = 0;

  private lastTime: number = 0;
  private animationId: number = 0;
  private audioContext: AudioContext | null = null;

  private spawnTimer: number = 0;
  private crystalSpawnTimer: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.init();
  }

  private init(): void {
    this.particleSystem = new ParticleSystem();
    this.ship = new Ship(this.width / 2, this.height / 2, this.particleSystem);

    this.generateStars();

    for (let i = 0; i < 8; i++) {
      this.spawnAsteroid();
    }

    for (let i = 0; i < 5; i++) {
      this.spawnCrystal();
    }

    this.setupAudio();
    this.lastTime = performance.now();
    this.loop();
  }

  private generateStars(): void {
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1
      });
    }
  }

  private setupAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  private playCollectSound(scoreMultiplier: number): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const baseFreq = 800 + Math.min(scoreMultiplier * 30, 800);
      oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        baseFreq * 1.5,
        this.audioContext.currentTime + 0.1
      );

      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (e) {
      // ignore
    }
  }

  private spawnAsteroid(): void {
    let x: number, y: number;
    const edge = Math.floor(Math.random() * 4);
    const margin = 50;

    switch (edge) {
      case 0: x = -margin; y = Math.random() * this.height; break;
      case 1: x = this.width + margin; y = Math.random() * this.height; break;
      case 2: x = Math.random() * this.width; y = -margin; break;
      default: x = Math.random() * this.width; y = this.height + margin; break;
    }

    const radius = 15 + Math.random() * 40;
    const asteroid = new Asteroid(x, y, radius);

    const dx = this.width / 2 - x;
    const dy = this.height / 2 - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    asteroid.vx = (dx / dist) * (20 + Math.random() * 30);
    asteroid.vy = (dy / dist) * (20 + Math.random() * 30);

    this.asteroids.push(asteroid);
  }

  private spawnCrystal(): void {
    const margin = 50;
    const x = margin + Math.random() * (this.width - margin * 2);
    const y = margin + Math.random() * (this.height - margin * 2);

    const dx = x - this.width / 2;
    const dy = y - this.height / 2;
    if (Math.sqrt(dx * dx + dy * dy) < 100) return;

    this.crystals.push(new Crystal(x, y));
  }

  private triggerBlackHole(): void {
    if (this.blackHole && this.blackHole.isActive()) return;
    this.blackHole = new BlackHole(this.width, this.height);
  }

  private checkCollisions(dt: number): void {
    const shipBounds = this.ship.getBounds();

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      const aBounds = asteroid.getBounds();
      const dx = shipBounds.x - aBounds.x;
      const dy = shipBounds.y - aBounds.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shipBounds.radius + aBounds.radius * 0.7) {
        if (!this.ship.isInvincible()) {
          this.particleSystem.emitExplosion(
            (shipBounds.x + aBounds.x) / 2,
            (shipBounds.y + aBounds.y) / 2,
            25
          );
          this.ship.takeDamage(10);

          const angle = Math.atan2(dy, dx);
          this.ship.vx += Math.cos(angle) * 100;
          this.ship.vy += Math.sin(angle) * 100;

          this.asteroids.splice(i, 1);
          this.spawnAsteroid();
        }
      }
    }

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];
      if (crystal.getIsCollecting()) continue;

      const dx = shipBounds.x - crystal.x;
      const dy = shipBounds.y - crystal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 50) {
        crystal.startCollecting(shipBounds.x, shipBounds.y);
      }
    }

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      if (this.crystals[i].isCollected()) {
        this.crystals.splice(i, 1);
        this.ship.addScore(10);
        this.crystalsCollected++;
        this.playCollectSound(this.ship.getScore() / 10);

        if (this.crystalsCollected % 10 === 0) {
          this.blackHoleTriggerCount++;
          this.triggerBlackHole();
        }
      }
    }

    if (this.blackHole && this.blackHole.isActive()) {
      for (const asteroid of this.asteroids) {
        const gravity = this.blackHole.getGravityForce(asteroid.x, asteroid.y);
        asteroid.vx += gravity.fx * dt;
        asteroid.vy += gravity.fy * dt;

        if (this.blackHole.isInside(asteroid.x, asteroid.y)) {
          const idx = this.asteroids.indexOf(asteroid);
          if (idx > -1) {
            this.asteroids.splice(idx, 1);
            this.spawnAsteroid();
          }
        }
      }

      for (const crystal of this.crystals) {
        if (crystal.getIsCollecting()) continue;
        const gravity = this.blackHole.getGravityForce(crystal.x, crystal.y);
        crystal.vx += gravity.fx * dt;
        crystal.vy += gravity.fy * dt;

        if (this.blackHole.isInside(crystal.x, crystal.y)) {
          const idx = this.crystals.indexOf(crystal);
          if (idx > -1) {
            this.crystals.splice(idx, 1);
          }
        }
      }

      const shipGravity = this.blackHole.getGravityForce(this.ship.x, this.ship.y);
      this.ship.applyGravity(shipGravity.fx, shipGravity.fy, dt);

      if (this.blackHole.isInside(this.ship.x, this.ship.y) && !this.ship.isInvincible()) {
        this.ship.takeDamage(5);
        const edge = Math.floor(Math.random() * 4);
        let targetX = this.width / 2;
        let targetY = this.height / 2;
        switch (edge) {
          case 0: targetX = 50; break;
          case 1: targetX = this.width - 50; break;
          case 2: targetY = 50; break;
          default: targetY = this.height - 50; break;
        }
        this.ship.knockback(this.blackHole.x, this.blackHole.y, 0.5);
        setTimeout(() => {
          this.ship.x = targetX;
          this.ship.y = targetY;
        }, 100);
      }
    }
  }

  private update(dt: number): void {
    if (this.gameState === 'gameover') {
      this.gameOverTimer += dt;
      this.gameOverFlash += dt;
      this.particleSystem.update(dt);
      return;
    }

    this.ship.update(dt, this.width, this.height);
    this.particleSystem.update(dt);

    for (const asteroid of this.asteroids) {
      asteroid.update(dt, this.width, this.height);
    }

    for (const crystal of this.crystals) {
      crystal.update(dt, this.width, this.height);
    }

    if (this.blackHole) {
      this.blackHole.update(dt);
    }

    this.checkCollisions(dt);

    this.spawnTimer += dt;
    if (this.spawnTimer > 3 && this.asteroids.length < 15) {
      this.spawnTimer = 0;
      this.spawnAsteroid();
    }

    this.crystalSpawnTimer += dt;
    if (this.crystalSpawnTimer > 4 && this.crystals.length < 8) {
      this.crystalSpawnTimer = 0;
      this.spawnCrystal();
    }

    for (const star of this.stars) {
      star.phase += star.speed * dt;
    }

    if (this.ship.isGameOver()) {
      this.gameState = 'gameover';
      this.gameOverTimer = 0;
      this.particleSystem.emitExplosion(this.ship.x, this.ship.y, 60);
    }
  }

  private render(): void {
    const ctx = this.ctx;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.gameState === 'gameover') {
      const flashIntensity = (Math.sin(this.gameOverFlash * 5) + 1) / 2;
      bgGradient.addColorStop(0, `rgb(${20 + flashIntensity * 30}, 0, 0)`);
      bgGradient.addColorStop(1, `rgb(${40 + flashIntensity * 30}, 5, 10)`);
    } else {
      bgGradient.addColorStop(0, '#05050a');
      bgGradient.addColorStop(1, '#150825');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      const alpha = star.baseAlpha * (0.5 + Math.sin(star.phase) * 0.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.blackHole) {
      this.blackHole.render(ctx);
    }

    for (const crystal of this.crystals) {
      crystal.render(ctx);
    }

    for (const asteroid of this.asteroids) {
      asteroid.render(ctx);
    }

    this.particleSystem.render(ctx);

    if (this.gameState !== 'gameover') {
      this.ship.render(ctx);
    }

    this.drawUI();

    if (this.gameState === 'gameover') {
      this.drawGameOver();
    }
  }

  private drawUI(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(`分数: ${this.ship.getScore()}`, this.width / 2 + 2, 35 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`分数: ${this.ship.getScore()}`, this.width / 2, 35);
    ctx.restore();

    const barWidth = 300;
    const barHeight = 20;
    const barX = (this.width - barWidth) / 2;
    const barY = this.height - 40;

    const healthRatio = this.ship.health / this.ship.maxHealth;

    ctx.save();
    ctx.shadowColor = healthRatio > 0.3 ? '#00ff88' : '#ff4444';
    ctx.shadowBlur = 10;

    ctx.strokeStyle = healthRatio > 0.3 ? '#00ffaa' : '#ff6666';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.shadowBlur = 0;

    const fillWidth = barWidth * healthRatio;
    let r: number, g: number, b: number;
    if (healthRatio > 0.5) {
      r = Math.floor((1 - healthRatio) * 2 * 255);
      g = 255;
      b = 0;
    } else {
      r = 255;
      g = Math.floor(healthRatio * 2 * 255);
      b = 0;
    }

    const barGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    barGradient.addColorStop(0, `rgb(${Math.min(r + 50, 255)}, ${Math.min(g + 50, 255)}, ${b})`);
    barGradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    barGradient.addColorStop(1, `rgb(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${b})`);

    ctx.fillStyle = barGradient;
    ctx.fillRect(barX + 2, barY + 2, fillWidth - 4, barHeight - 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX + fillWidth, barY + 2, barWidth - fillWidth - 2, barHeight - 4);

    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(`耐久度: ${Math.ceil(this.ship.health)}/${this.ship.maxHealth}`, this.width / 2, barY + 15);

    ctx.restore();
  }

  private drawGameOver(): void {
    const ctx = this.ctx;
    const flash = (Math.sin(this.gameOverFlash * 3) + 1) / 2;

    ctx.save();
    ctx.font = 'bold 56px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const glowIntensity = 10 + flash * 20;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = glowIntensity;

    const colorIntensity = Math.floor(150 + flash * 105);
    ctx.fillStyle = `rgb(${colorIntensity}, ${Math.floor(flash * 50)}, ${Math.floor(flash * 50)})`;

    ctx.fillText('任务失败', this.width / 2, this.height / 2 - 30);

    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`最终得分: ${this.ship.getScore()}`, this.width / 2, this.height / 2 + 30);

    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('按 空格键 重新开始', this.width / 2, this.height / 2 + 80);

    ctx.restore();

    if (this.gameOverTimer > 1) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          this.restart();
          window.removeEventListener('keydown', handleKey);
        }
      };
      window.addEventListener('keydown', handleKey);
    }
  }

  private restart(): void {
    this.ship.reset(this.width / 2, this.height / 2);
    this.asteroids = [];
    this.crystals = [];
    this.blackHole = null;
    this.particleSystem.clear();
    this.crystalsCollected = 0;
    this.blackHoleTriggerCount = 0;
    this.gameState = 'playing';
    this.gameOverTimer = 0;
    this.gameOverFlash = 0;
    this.spawnTimer = 0;
    this.crystalSpawnTimer = 0;

    for (let i = 0; i < 8; i++) {
      this.spawnAsteroid();
    }
    for (let i = 0; i < 5; i++) {
      this.spawnCrystal();
    }
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
