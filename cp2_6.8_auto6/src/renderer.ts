import { GameStatus, Player, Obstacle, VisualEffect } from './types';

const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const TRACK_WIDTH = LANE_COUNT * LANE_WIDTH;

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private trail: TrailPoint[] = [];
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private particleSystem: Particle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 30 + 10,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 3 + 1,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const scaleX = width / (TRACK_WIDTH + 200);
    const scaleY = height / 700;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = width / 2;
    this.offsetY = height * 0.1;
  }

  render(status: GameStatus, deltaTime: number, rhythmIntensity: number): void {
    const ctx = this.ctx;

    this.updateStars(deltaTime);
    this.updateParticles(deltaTime);
    this.updateTrail(status.player, deltaTime);

    ctx.save();
    this.drawBackground(rhythmIntensity);
    this.drawStars();

    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawTrack(status.scrollOffset, rhythmIntensity);
    this.drawObstacles(status.obstacles);
    this.drawTrail();
    this.drawPlayer(status.player);
    this.drawParticles();
    this.drawEffects(status.effects);

    if (status.player.screenShake > 0) {
      this.drawHitFlash(status.player.screenShake);
    }

    ctx.restore();

    this.drawSideBorders();
  }

  private drawBackground(intensity: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      this.width * 0.8
    );
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#0d1033');
    gradient.addColorStop(1, '#0a0a1a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (intensity > 0.5) {
      const pulseAlpha = (intensity - 0.5) * 0.1;
      ctx.fillStyle = `rgba(255, 0, 255, ${pulseAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      star.twinkle += star.twinkleSpeed * dt;
      if (star.y > this.height + 10) {
        star.y = -10;
        star.x = Math.random() * this.width;
      }
    }
  }

  private drawStars(): void {
    const ctx = this.ctx;
    for (const star of this.stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.twinkle));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTrack(scrollOffset: number, intensity: number): void {
    const ctx = this.ctx;
    const trackLeft = -TRACK_WIDTH / 2;
    const trackRight = TRACK_WIDTH / 2;
    const trackTop = 0;
    const trackBottom = 600;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.fillRect(trackLeft, trackTop, TRACK_WIDTH, trackBottom - trackTop);

    const glowIntensity = 0.3 + intensity * 0.4;
    ctx.strokeStyle = `rgba(255, 0, 255, ${glowIntensity})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(trackLeft, trackTop);
    ctx.lineTo(trackLeft, trackBottom);
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(trackRight, trackTop);
    ctx.lineTo(trackRight, trackBottom);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 1; i < LANE_COUNT; i++) {
      const x = -TRACK_WIDTH / 2 + i * LANE_WIDTH;
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 15]);
      ctx.lineDashOffset = -scrollOffset % 25;
      ctx.beginPath();
      ctx.moveTo(x, trackTop);
      ctx.lineTo(x, trackBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const neonSpacing = 60;
    const neonCount = Math.ceil((trackBottom - trackTop) / neonSpacing) + 2;
    const scrollMod = scrollOffset % neonSpacing;

    for (let i = 0; i < neonCount; i++) {
      const y = trackTop - neonSpacing + i * neonSpacing + scrollMod;
      const alpha = 0.2 + 0.3 * Math.sin((i + scrollOffset / neonSpacing) * 0.5);

      const gradient = ctx.createLinearGradient(trackLeft, y, trackRight, y);
      gradient.addColorStop(0, `rgba(255, 0, 255, 0)`);
      gradient.addColorStop(0.3, `rgba(255, 0, 255, ${alpha})`);
      gradient.addColorStop(0.7, `rgba(0, 255, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(0, 255, 255, 0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trackLeft + 5, y);
      ctx.lineTo(trackRight - 5, y);
      ctx.stroke();
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const ctx = this.ctx;

    for (const obs of obstacles) {
      const laneX = (obs.lane - 1) * LANE_WIDTH;
      const actualX = obs.type === 'moving' ? laneX + obs.movingOffset : laneX;
      const y = obs.y;

      ctx.save();
      ctx.translate(actualX, y);

      switch (obs.type) {
        case 'spike':
          this.drawSpike(ctx);
          break;
        case 'bar':
          this.drawBar(ctx);
          break;
        case 'moving':
          this.drawMovingTarget(ctx);
          break;
      }

      ctx.restore();
    }
  }

  private drawSpike(ctx: CanvasRenderingContext2D): void {
    const size = 40;
    const halfSize = size / 2;

    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 15;

    const gradient = ctx.createLinearGradient(0, -halfSize, 0, halfSize);
    gradient.addColorStop(0, '#ff00ff');
    gradient.addColorStop(1, '#8800aa');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -halfSize);
    ctx.lineTo(halfSize, halfSize);
    ctx.lineTo(-halfSize, halfSize);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ff88ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  private drawBar(ctx: CanvasRenderingContext2D): void {
    const width = LANE_WIDTH * 0.8;
    const height = 20;

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;

    const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    gradient.addColorStop(0, '#00ccff');
    gradient.addColorStop(0.5, '#00ffff');
    gradient.addColorStop(1, '#00ccff');

    ctx.fillStyle = gradient;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.strokeStyle = '#aaffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2, -height / 2, width, height);

    ctx.shadowBlur = 0;
  }

  private drawMovingTarget(ctx: CanvasRenderingContext2D): void {
    const size = 35;
    const halfSize = size / 2;

    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfSize);
    gradient.addColorStop(0, '#ffff88');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, '#ff6600');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, halfSize * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, halfSize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private updateTrail(player: Player, dt: number): void {
    const playerX = (player.lane - 1) * LANE_WIDTH;
    let playerY = 500;

    if (player.state === 'jumping') {
      const jumpProgress = 1 - player.stateTimer / 0.5;
      const jumpHeight = -80 * Math.sin(jumpProgress * Math.PI);
      playerY += jumpHeight;
    }

    this.trail.unshift({
      x: playerX,
      y: playerY,
      alpha: 0.8,
      size: player.state === 'sliding' ? 20 : 40,
    });

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 2;
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1);
      }
    }

    if (this.trail.length > 20) {
      this.trail = this.trail.slice(0, 20);
    }
  }

  private drawTrail(): void {
    const ctx = this.ctx;

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const alpha = point.alpha * 0.5;
      const size = point.size * (1 - i * 0.04);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20 * point.alpha;

      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }
    ctx.shadowBlur = 0;
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    let x = (player.lane - 1) * LANE_WIDTH;
    let y = 500;
    let size = 50;

    if (player.state === 'jumping') {
      const jumpProgress = 1 - player.stateTimer / 0.5;
      const jumpHeight = -80 * Math.sin(jumpProgress * Math.PI);
      y += jumpHeight;
    } else if (player.state === 'sliding') {
      size = 25;
      y += 12;
    }

    if (player.screenShake > 0) {
      const shakeAmount = 5 * (player.screenShake / 0.2);
      x += (Math.random() - 0.5) * shakeAmount * 2;
      y += (Math.random() - 0.5) * shakeAmount * 2;
    }

    ctx.save();
    ctx.translate(x, y);

    let glowColor = '#00ffff';
    if (player.hitFlash > 0 && player.state !== 'jumping') {
      const flashIntensity = player.hitFlash / 0.3;
      glowColor = flashIntensity > 0.5 ? '#ff0000' : '#00ff00';
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 25;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#ddddff');
    gradient.addColorStop(1, glowColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawEffects(effects: VisualEffect[]): void {
    const ctx = this.ctx;

    for (const effect of effects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.translate(effect.x, effect.y);

      switch (effect.type) {
        case 'combo15':
          this.drawComboText(ctx, 'x1.5', '#ffaa00', alpha, progress);
          break;
        case 'combo20':
          this.drawComboText(ctx, 'x2', '#ff00ff', alpha, progress);
          break;
        case 'heartBreak':
          this.drawHeartBreak(ctx, alpha);
          break;
        case 'dodge':
          break;
      }

      ctx.restore();
    }
  }

  private drawComboText(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    alpha: number,
    progress: number
  ): void {
    const scale = 1 + progress * 0.5;
    ctx.scale(scale, scale);

    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.globalAlpha = alpha * 0.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawHeartBreak(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.updateParticles(0.016);
    this.drawParticles();
  }

  private updateParticles(dt: number): void {
    for (let i = this.particleSystem.length - 1; i >= 0; i--) {
      const p = this.particleSystem[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particleSystem.splice(i, 1);
      }
    }
  }

  spawnHeartParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;
      this.particleSystem.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        color: '#ff66aa',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particleSystem) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawHitFlash(shakeTime: number): void {
    const ctx = this.ctx;
    const intensity = shakeTime / 0.2;
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
    ctx.fillRect(-TRACK_WIDTH / 2, 0, TRACK_WIDTH, 600);
  }

  private drawSideBorders(): void {
    const ctx = this.ctx;
    const aspect = this.width / this.height;

    if (aspect > 16 / 9) {
      const borderWidth = (this.width - (16 / 9) * this.height) / 2;

      const leftGradient = ctx.createLinearGradient(0, 0, borderWidth, 0);
      leftGradient.addColorStop(0, '#0a0a1a');
      leftGradient.addColorStop(1, 'rgba(10, 10, 26, 0)');
      ctx.fillStyle = leftGradient;
      ctx.fillRect(0, 0, borderWidth, this.height);

      const rightGradient = ctx.createLinearGradient(
        this.width - borderWidth,
        0,
        this.width,
        0
      );
      rightGradient.addColorStop(0, 'rgba(10, 10, 26, 0)');
      rightGradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = rightGradient;
      ctx.fillRect(this.width - borderWidth, 0, borderWidth, this.height);

      ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(borderWidth, 0);
      ctx.lineTo(borderWidth, this.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.width - borderWidth, 0);
      ctx.lineTo(this.width - borderWidth, this.height);
      ctx.stroke();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
