import gsap from 'gsap';
import { Renderer } from './renderer';

export const COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff', '#a29bfe'];

export type KitePhase = 'appearing' | 'dragging' | 'floating' | 'fading';

export class Kite {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number = 0;
  vy: number = 0;
  baseWidth: number;
  baseHeight: number;
  scale: number = 0;
  color: string;
  lightColor: string;
  renderer: Renderer;
  phase: KitePhase = 'appearing';
  createdAt: number;
  id: number;

  wingPhase: number = 0;
  wingSpeed: number = Math.PI * 2 / 0.4;
  wingAngle: number = 0;
  moveSpeed: number = 0;

  foldProgress: number = 0;
  rotation: number = 0;
  targetRotation: number = 0;

  isHovered: boolean = false;
  pulsePhase: number = 0;
  fadeAlpha: number = 1;

  floatTimer: number = 0;
  dragTimer: number = 0;
  trailTimer: number = 0;

  isDragging: boolean = false;
  windX: number = 0;
  windY: number = 0;

  private offscreen: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  private cachedWingAngle: number = -999;

  constructor(x: number, y: number, color: string, renderer: Renderer, id: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.color = color;
    this.lightColor = renderer.lightenColor(color, 0.4);
    this.renderer = renderer;
    this.id = id;
    this.createdAt = performance.now();
    this.baseWidth = 40;
    this.baseHeight = 50;
    this.initOffscreen();
    this.animateAppear();
  }

  initOffscreen(): void {
    this.offscreen = new OffscreenCanvas(200, 200);
    this.offscreenCtx = this.offscreen.getContext('2d')!;
  }

  renderOffscreen(wingAngle: number): void {
    if (!this.offscreen || !this.offscreenCtx) return;
    const ctx = this.offscreenCtx;
    const cx = 100;
    const cy = 100;
    const w = this.baseWidth;
    const h = this.baseHeight;

    ctx.clearRect(0, 0, 200, 200);

    const fold = this.foldProgress;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.rotate(-wingAngle * 0.6);
    ctx.scale(fold * 0.5 + 0.5, 1);
    this.drawTriangle(ctx, 0, -h * 0.1, -w * 0.7, -h * 0.4, -w * 0.5, h * 0.3, this.color, 0.75);
    this.drawTriangle(ctx, -w * 0.5, h * 0.3, -w * 0.7, -h * 0.4, -w * 0.3, h * 0.5, this.color, 0.55);
    ctx.restore();

    ctx.save();
    ctx.rotate(wingAngle * 0.6);
    ctx.scale(fold * 0.5 + 0.5, 1);
    this.drawTriangle(ctx, 0, -h * 0.1, w * 0.7, -h * 0.4, w * 0.5, h * 0.3, this.color, 0.75);
    this.drawTriangle(ctx, w * 0.5, h * 0.3, w * 0.7, -h * 0.4, w * 0.3, h * 0.5, this.color, 0.55);
    ctx.restore();

    this.drawTriangle(ctx, 0, -h * 0.6, -w * 0.25, h * 0.1, w * 0.25, h * 0.1, this.color, 0.85);
    this.drawTriangle(ctx, -w * 0.15, h * 0.1, w * 0.15, h * 0.1, 0, h * 0.45, this.color, 0.7);

    ctx.restore();
    this.cachedWingAngle = wingAngle;
  }

  drawTriangle(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
    color: string, alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = this.lightColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  animateAppear(): void {
    gsap.to(this, {
      scale: 1,
      foldProgress: 1,
      duration: 0.5,
      ease: 'back.out(1.7)',
      onComplete: () => {
        if (this.phase === 'appearing') {
        }
      }
    });
    gsap.delayedCall(0.05, () => {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        this.renderer.spawnParticle(this.x, this.y, this.color, angle, 2 + Math.random(), 700);
      }
    });
  }

  animatePress(): void {
    gsap.to(this, {
      scale: 0.9,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this, { scale: 1, duration: 0.15, ease: 'elastic.out(1, 0.5)' });
      }
    });
  }

  startDrag(targetX: number, targetY: number): void {
    this.phase = 'dragging';
    this.isDragging = true;
    this.targetX = targetX;
    this.targetY = targetY;
    this.dragTimer = 0;
  }

  updateDrag(targetX: number, targetY: number): void {
    this.targetX = targetX;
    this.targetY = targetY;
    this.dragTimer++;
  }

  endDrag(): void {
    if (this.phase !== 'dragging') return;
    this.isDragging = false;
    this.phase = 'floating';
    this.floatTimer = 2000;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < 0.5) {
      const a = Math.random() * Math.PI * 2;
      this.vx = Math.cos(a) * 1.5;
      this.vy = Math.sin(a) * 0.8;
    }
  }

  setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  setWind(wx: number, wy: number): void {
    this.windX = wx;
    this.windY = wy;
  }

  update(dt: number): void {
    const lerpFactor = 0.12;
    const prevX = this.x;
    const prevY = this.y;

    if (this.phase === 'dragging') {
      this.x += (this.targetX - this.x) * lerpFactor;
      this.y += (this.targetY - this.y) * lerpFactor;
      this.vx = this.x - prevX;
      this.vy = this.y - prevY;
    } else if (this.phase === 'floating') {
      this.vx += this.windX * dt / 16;
      this.vy += this.windY * dt / 16;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.x += this.vx * dt / 16;
      this.y += this.vy * dt / 16;
      this.floatTimer -= dt;
      if (this.floatTimer <= 0) {
        this.phase = 'fading';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + Math.random();
          this.renderer.spawnParticle(this.x, this.y, this.color, angle, 2.5 + Math.random(), 900);
        }
        gsap.to(this, {
          fadeAlpha: 0,
          y: this.y + 60,
          duration: 1,
          ease: 'power2.in'
        });
      }
    } else if (this.phase === 'fading') {
      this.x += this.vx * dt / 16;
      this.vy += 0.02 * dt / 16;
      this.y += this.vy * dt / 16;
      this.vx *= 0.98;
    }

    if (this.x < 20) { this.x = 20; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > this.renderer.width - 20) { this.x = this.renderer.width - 20; this.vx = -Math.abs(this.vx) * 0.5; }
    if (this.y < 20) { this.y = 20; this.vy = Math.abs(this.vy) * 0.5; }
    if (this.y > this.renderer.height - 20) { this.y = this.renderer.height - 20; this.vy = -Math.abs(this.vy) * 0.5; }

    this.moveSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const minSpeed = 0.5;
    const maxSpeed = 8;
    const speedRatio = Math.min(1, Math.max(0, (this.moveSpeed - minSpeed) / (maxSpeed - minSpeed)));
    const period = 0.6 - speedRatio * 0.4;
    this.wingSpeed = Math.PI * 2 / period;
    this.wingPhase += this.wingSpeed * dt / 1000;
    this.wingAngle = Math.sin(this.wingPhase) * (15 * Math.PI / 180);

    if (this.moveSpeed > 0.2) {
      this.targetRotation = Math.atan2(this.vy, this.vx) - Math.PI / 2;
    }
    this.rotation += (this.targetRotation - this.rotation) * 0.08;

    this.trailTimer += dt;
    const trailInterval = 40;
    if (this.trailTimer >= trailInterval && this.phase !== 'fading' && this.fadeAlpha > 0.1) {
      this.trailTimer = 0;
      const tailX = this.x - Math.sin(this.rotation) * 10;
      const tailY = this.y + Math.cos(this.rotation) * 10;
      this.renderer.spawnTrailParticle(tailX, tailY, this.lightColor);
    }

    if (this.isHovered) {
      this.pulsePhase += dt / 500 * Math.PI * 2;
    }
  }

  isDead(): boolean {
    return this.phase === 'fading' && this.fadeAlpha <= 0.01;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.scale <= 0) return;

    if (Math.abs(this.cachedWingAngle - this.wingAngle) > 0.01) {
      this.renderOffscreen(this.wingAngle);
    }

    const haloAlpha = this.isHovered ? 0.4 : 0.15;
    const pulse = this.isHovered ? Math.sin(this.pulsePhase) * 10 + 10 : 0;
    this.renderer.drawHalo(this.x, this.y, this.color, haloAlpha * this.fadeAlpha, pulse);

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    if (this.offscreen) {
      ctx.drawImage(this.offscreen, -100, -100);
    }

    ctx.restore();
  }

  hitTest(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy < 40 * 40;
  }
}
