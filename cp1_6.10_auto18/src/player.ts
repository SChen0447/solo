import type { AudioManager } from './audio';

export interface BalloonState {
  x: number;
  y: number;
  velocityY: number;
  lives: number;
  isExploding: boolean;
  explosionTime: number;
  invincibleTime: number;
  ropeSwingPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  type: 'cloth' | 'fluff';
}

const BALLOON_RADIUS = 38;
const RISE_SPEED = 220;
const FALL_SPEED = 180;
const MAX_VERTICAL_SPEED = 320;
const GRAVITY_BASE = 40;
const INVINCIBLE_DURATION = 2000;
const EXPLOSION_DURATION = 1500;

export class Player {
  private state: BalloonState;
  private particles: Particle[] = [];
  private audioManager: AudioManager;
  private canvasHeight: number;
  private canvasWidth: number;
  private screenShake: number = 0;

  constructor(audioManager: AudioManager, canvasWidth: number, canvasHeight: number) {
    this.audioManager = audioManager;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      x: canvasWidth * 0.28,
      y: canvasHeight * 0.5,
      velocityY: 0,
      lives: 3,
      isExploding: false,
      explosionTime: 0,
      invincibleTime: 0,
      ropeSwingPhase: 0
    };
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const ratioX = canvasWidth / this.canvasWidth;
    const ratioY = canvasHeight / this.canvasHeight;
    this.state.x *= ratioX;
    this.state.y *= ratioY;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(deltaTime: number): void {
    if (this.state.isExploding) {
      this.state.explosionTime -= deltaTime * 1000;
      this.updateParticles(deltaTime);
      if (this.state.explosionTime <= 0) {
        this.state.isExploding = false;
        this.state.y = this.canvasHeight * 0.5;
        this.state.velocityY = 0;
        this.state.invincibleTime = INVINCIBLE_DURATION;
      }
      return;
    }

    if (this.state.invincibleTime > 0) {
      this.state.invincibleTime -= deltaTime * 1000;
    }

    const breathStrength = this.audioManager.getBreathStrength();
    const isPanicking = this.audioManager.isInPanic();

    if (isPanicking) {
      this.state.velocityY += breathStrength * MAX_VERTICAL_SPEED * deltaTime * 2;
      this.screenShake = Math.sin(performance.now() * 0.05) * 4;
    } else {
      if (breathStrength > 0.05) {
        this.state.velocityY -= breathStrength * RISE_SPEED * deltaTime;
      } else if (breathStrength < -0.02) {
        this.state.velocityY -= breathStrength * FALL_SPEED * deltaTime;
      } else {
        this.state.velocityY += GRAVITY_BASE * deltaTime;
      }
      this.screenShake *= 0.9;
    }

    this.state.velocityY = Math.max(-MAX_VERTICAL_SPEED, Math.min(MAX_VERTICAL_SPEED, this.state.velocityY));
    this.state.velocityY *= 0.985;
    this.state.y += this.state.velocityY * deltaTime;

    const minY = BALLOON_RADIUS + 10;
    const maxY = this.canvasHeight - BALLOON_RADIUS - 80;
    if (this.state.y < minY) {
      this.state.y = minY;
      this.state.velocityY = Math.max(0, this.state.velocityY * 0.3);
    }
    if (this.state.y > maxY) {
      this.state.y = maxY;
      this.state.velocityY = Math.min(0, this.state.velocityY * 0.3);
    }

    this.state.ropeSwingPhase += deltaTime * 1.5;
    this.updateParticles(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 200 * deltaTime;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed * deltaTime;
      p.life -= deltaTime * 1000;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getCollisionRadius(): number {
    return BALLOON_RADIUS * 0.75;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  getScreenShake(): number {
    return this.screenShake;
  }

  getLives(): number {
    return this.state.lives;
  }

  isInvincible(): boolean {
    return this.state.invincibleTime > 0 || this.state.isExploding;
  }

  isExploding(): boolean {
    return this.state.isExploding;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  hit(): boolean {
    if (this.isInvincible()) return false;
    this.state.lives--;
    this.triggerExplosion();
    return true;
  }

  reset(): void {
    this.state = {
      x: this.canvasWidth * 0.28,
      y: this.canvasHeight * 0.5,
      velocityY: 0,
      lives: 3,
      isExploding: false,
      explosionTime: 0,
      invincibleTime: 0,
      ropeSwingPhase: 0
    };
    this.particles = [];
    this.screenShake = 0;
  }

  private triggerExplosion(): void {
    this.state.isExploding = true;
    this.state.explosionTime = EXPLOSION_DURATION;
    this.screenShake = 12;
    
    const colors = ['#FFB6C1', '#FFD700', '#FFA07A', '#FF69B4', '#FFE4B5'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const speed = 100 + Math.random() * 200;
      const isCloth = i < 10;
      this.particles.push({
        x: this.state.x,
        y: this.state.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 800 + Math.random() * 700,
        maxLife: 1500,
        size: isCloth ? 10 + Math.random() * 14 : 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        type: isCloth ? 'cloth' : 'fluff'
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderParticles(ctx);

    if (this.state.isExploding) return;

    const { x, y } = this.state;
    const invincible = this.state.invincibleTime > 0;
    const blinkAlpha = invincible ? (Math.sin(performance.now() * 0.02) > 0 ? 1 : 0.35) : 1;

    ctx.save();
    ctx.globalAlpha = blinkAlpha;
    ctx.translate(this.screenShake, 0);

    const ropeSwing = Math.sin(this.state.ropeSwingPhase) * 4;
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + ropeSwing * 0.3, y + BALLOON_RADIUS);
    ctx.quadraticCurveTo(x + ropeSwing, y + BALLOON_RADIUS + 25, x + ropeSwing * 0.5, y + BALLOON_RADIUS + 50);
    ctx.stroke();

    ctx.fillStyle = '#C4A77D';
    ctx.beginPath();
    ctx.ellipse(x + ropeSwing * 0.5, y + BALLOON_RADIUS + 55, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(x - 12, y - 15, 5, x, y, BALLOON_RADIUS);
    gradient.addColorStop(0, '#FFE4B5');
    gradient.addColorStop(0.4, '#FFD4A3');
    gradient.addColorStop(0.7, '#FFB6C1');
    gradient.addColorStop(1, '#FF91A4');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, BALLOON_RADIUS * 0.92, BALLOON_RADIUS, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 16, 10, 16, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF7F7F';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + BALLOON_RADIUS - 4);
    ctx.lineTo(x + 6, y + BALLOON_RADIUS - 4);
    ctx.lineTo(x, y + BALLOON_RADIUS + 6);
    ctx.closePath();
    ctx.fill();

    if (this.audioManager.isInPanic()) {
      ctx.strokeStyle = `rgba(255, 60, 60, ${0.5 + Math.sin(performance.now() * 0.03) * 0.3})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(x, y, BALLOON_RADIUS + 8, BALLOON_RADIUS + 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      if (p.type === 'cloth') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.5, -p.size * 0.3);
        ctx.lineTo(p.size * 0.6, -p.size * 0.5);
        ctx.lineTo(p.size * 0.4, p.size * 0.6);
        ctx.lineTo(-p.size * 0.6, p.size * 0.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
