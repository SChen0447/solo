import { Terrain, Coin, HSLColor } from './Terrain';
import { AudioManager } from './AudioManager';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: HSLColor;
}

export class Player {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public vy: number;
  public isGrounded: boolean = true;
  public jumpCount: number = 0;
  public maxJumps: number = 2;
  public totalJumps: number = 0;
  public score: number = 0;

  private gravity: number = 0.6;
  private baseJumpPower: number = -14;
  private crouchTime: number = 0;
  private crouchDuration: number = 200;
  private isCrouching: boolean = false;

  private particles: Particle[] = [];
  private maxParticles: number = 200;
  private lastParticleTime: number = 0;
  private particleInterval: number = 30;

  private terrain: Terrain;
  private audioManager: AudioManager;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(terrain: Terrain, audioManager: AudioManager, canvasWidth: number, canvasHeight: number) {
    this.terrain = terrain;
    this.audioManager = audioManager;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.width = Math.max(36, canvasWidth / 28);
    this.height = this.width;
    this.x = canvasWidth * 0.2;
    this.y = terrain.groundY - this.height;
    this.vy = 0;
    this.gravity = Math.max(0.4, canvasHeight / 1200);
    this.baseJumpPower = -Math.max(10, canvasHeight / 50);
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const scaleX = canvasWidth / this.canvasWidth;
    const scaleY = canvasHeight / this.canvasHeight;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.width = Math.max(36, canvasWidth / 28);
    this.height = this.width;
    this.x = canvasWidth * 0.2;
    this.y = this.y * scaleY;
    this.gravity = Math.max(0.4, canvasHeight / 1200);
    this.baseJumpPower = -Math.max(10, canvasHeight / 50);

    this.particles.forEach(p => {
      p.x *= scaleX;
      p.y *= scaleY;
      p.size = Math.max(3, canvasWidth / 320);
    });
  }

  jump(): boolean {
    if (this.jumpCount >= this.maxJumps) return false;

    const jumpMultiplier = Math.pow(0.8, this.jumpCount);
    this.vy = this.baseJumpPower * jumpMultiplier;
    this.jumpCount++;
    this.isGrounded = false;
    this.totalJumps++;

    this.audioManager.playJumpSound();
    this.terrain.onPlayerJump();

    return true;
  }

  update(deltaTime: number, currentTime: number): void {
    const dt = deltaTime / 16.67;

    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      if (currentTime - this.lastParticleTime > this.particleInterval) {
        this.spawnParticle(currentTime);
        this.lastParticleTime = currentTime;
      }
    }

    const groundY = this.terrain.getGroundYAtX(this.x + this.width / 2);
    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      if (!this.isGrounded && this.vy > 2) {
        this.isCrouching = true;
        this.crouchTime = currentTime;
      }
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    }

    if (this.isCrouching && currentTime - this.crouchTime > this.crouchDuration) {
      this.isCrouching = false;
    }

    this.updateParticles(deltaTime);
    this.checkCoinCollisions();
  }

  private spawnParticle(currentTime: number): void {
    const color = this.terrain.getColorAtX(this.x + this.width / 2);
    if (!color) return;

    const size = Math.max(3, this.canvasWidth / 320) + Math.random() * 4;
    const particle: Particle = {
      x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5,
      y: this.y + this.height / 2 + (Math.random() - 0.5) * this.height * 0.5,
      vx: -1 - Math.random() * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 2000,
      maxLife: 2000,
      size,
      color: { ...color }
    };

    this.particles.push(particle);

    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkCoinCollisions(): void {
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;

    for (const coin of this.terrain.coins) {
      if (coin.collected) continue;

      const dx = playerCenterX - coin.x;
      const dy = playerCenterY - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < coin.radius + this.width * 0.4) {
        this.terrain.collectCoin(coin);
        this.score++;
        this.audioManager.playCoinSound();
      }
    }
  }

  getCollectedCoins(): Coin[] {
    return this.terrain.coins.filter(c => c.collected);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const c = p.color;
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
      ctx.shadowColor = `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    let drawHeight = this.height;
    let drawWidth = this.width;
    let drawY = this.y;

    if (this.isCrouching) {
      const crouchProgress = Math.min(1, (performance.now() - this.crouchTime) / this.crouchDuration);
      const crouchFactor = Math.sin(crouchProgress * Math.PI);
      drawHeight = this.height * (1 - crouchFactor * 0.25);
      drawWidth = this.width * (1 + crouchFactor * 0.2);
      drawY = this.y + (this.height - drawHeight);
    }

    const radius = Math.max(6, drawWidth * 0.18);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;

    const gradient = ctx.createLinearGradient(this.x, drawY, this.x, drawY + drawHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(1, 'rgba(220, 240, 255, 0.85)');

    ctx.fillStyle = gradient;
    this.roundRect(ctx, this.x - (drawWidth - this.width) / 2, drawY, drawWidth, drawHeight, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, this.x - (drawWidth - this.width) / 2, drawY, drawWidth, drawHeight, radius);
    ctx.stroke();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  reset(): void {
    this.y = this.terrain.groundY - this.height;
    this.vy = 0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.totalJumps = 0;
    this.score = 0;
    this.particles = [];
    this.isCrouching = false;
  }
}
