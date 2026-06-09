import type p5 from 'p5';
import { SandParticle, PARTICLE_SIZE } from './sandParticle';
import { hexToRgb, mixColors } from './colorPalette';

const BASE_W = 800;
const BASE_H = 600;
const CENTER_X = BASE_W / 2;
const CENTER_Y = BASE_H / 2;

const NECK_WIDTH = 50;
const CHAMBER_HEIGHT = 150;
const CHANNEL_WIDTH = 10;
const CHANNEL_HEIGHT = 30;

const MIN_ANGLE = 45;
const MAX_ANGLE = 75;
const DEFAULT_ANGLE = Math.atan(CHAMBER_HEIGHT / 75) * 180 / Math.PI;

const TOTAL_PARTICLES = 400;
const MAX_BOTTOM_PARTICLES = 400;

const PULSE_DURATION = 30;
const PULSE_MAX_RADIUS = 40;
const SPARKLE_COUNT_MIN = 5;
const SPARKLE_COUNT_MAX = 8;
const SPARKLE_DURATION = 48;
const SPARKLE_SPEED = 1.5;

const BREATH_PERIOD = 120;

class LightPulse {
  x: number = 0;
  y: number = 0;
  color: string = '#ffffff';
  age: number = 0;
  active: boolean = false;

  reset(x: number, y: number, color: string): void {
    this.x = x;
    this.y = y;
    this.color = color;
    this.age = 0;
    this.active = true;
  }

  update(): void {
    if (!this.active) return;
    this.age++;
    if (this.age >= PULSE_DURATION) {
      this.active = false;
    }
  }

  draw(p: p5): void {
    if (!this.active) return;
    const t = this.age / PULSE_DURATION;
    const radius = t * PULSE_MAX_RADIUS;
    const alpha = (1 - t) * 200;
    const rgb = hexToRgb(this.color);
    p.noFill();
    p.stroke(rgb.r, rgb.g, rgb.b, alpha);
    p.strokeWeight(2);
    p.circle(this.x, this.y, radius * 2);
  }
}

class Sparkle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  color: string = '#ffffff';
  age: number = 0;
  size: number = 1;
  active: boolean = false;

  reset(x: number, y: number, color: string): void {
    this.x = x;
    this.y = y;
    this.color = color;
    this.age = 0;
    this.active = true;
    const angle = (Math.random() * 360 - 180) * (Math.PI / 180);
    this.vx = Math.cos(angle) * SPARKLE_SPEED;
    this.vy = Math.sin(angle) * SPARKLE_SPEED;
    this.size = 1 + Math.random();
  }

  update(): void {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.age >= SPARKLE_DURATION) {
      this.active = false;
    }
  }

  draw(p: p5): void {
    if (!this.active) return;
    const t = this.age / SPARKLE_DURATION;
    const alpha = (1 - t) * 255;
    const rgb = hexToRgb(this.color);
    p.noStroke();
    p.fill(rgb.r, rgb.g, rgb.b, alpha);
    p.circle(this.x, this.y, this.size * 2);
  }
}

export class CanvasManager {
  private p: p5;
  private particles: SandParticle[] = [];
  private bottomParticles: SandParticle[] = [];

  private pulsePool: LightPulse[] = [];
  private sparklePool: Sparkle[] = [];

  private topAngle: number = DEFAULT_ANGLE;
  private isDraggingLeft: boolean = false;
  private isDraggingRight: boolean = false;
  private dragHitbox: number = 10;

  private isRunning: boolean = false;
  private isFinished: boolean = false;
  private timesUpAlpha: number = 0;
  private timesUpTimer: number = 0;

  private channelOccupied: boolean = false;
  private channelParticleId: number = -1;
  private lastMixFrame: number = -1;
  private currentFrame: number = 0;

  private buttonX: number = CENTER_X;
  private buttonY: number = BASE_H - 60;
  private buttonRadius: number = 20;
  private buttonHovered: boolean = false;
  private buttonClicked: boolean = false;

  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private breathWeight: number = 2;

  constructor(p: p5) {
    this.p = p;
    this.initPools();
    this.initParticles();
  }

  private initPools(): void {
    for (let i = 0; i < 50; i++) {
      this.pulsePool.push(new LightPulse());
    }
    for (let i = 0; i < 200; i++) {
      this.sparklePool.push(new Sparkle());
    }
  }

  private getTopWidth(): number {
    const angleRad = (this.topAngle * Math.PI) / 180;
    const horizontalExt = CHAMBER_HEIGHT / Math.tan(angleRad);
    return NECK_WIDTH + 2 * horizontalExt;
  }

  private initParticles(): void {
    this.particles = [];
    this.bottomParticles = [];
    const topWidth = this.getTopWidth();
    const topY = CENTER_Y - CHAMBER_HEIGHT - CHANNEL_HEIGHT / 2;
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const x = CENTER_X + (Math.random() - 0.5) * (topWidth - PARTICLE_SIZE * 2);
      const y = topY + 10 + Math.floor(i / 20) * PARTICLE_SIZE;
      this.particles.push(new SandParticle(x, y));
    }
  }

  private getGeometry() {
    const topWidth = this.getTopWidth();
    const halfTop = topWidth / 2;
    const halfNeck = NECK_WIDTH / 2;
    const halfChannel = CHANNEL_WIDTH / 2;

    const topY = CENTER_Y - CHAMBER_HEIGHT - CHANNEL_HEIGHT / 2;
    const bottomY = CENTER_Y + CHAMBER_HEIGHT + CHANNEL_HEIGHT / 2;
    const channelTop = CENTER_Y - CHANNEL_HEIGHT / 2;
    const channelBottom = CENTER_Y + CHANNEL_HEIGHT / 2;

    return {
      topY, bottomY, channelTop, channelBottom,
      topLeft: { x: CENTER_X - halfTop, y: topY },
      topRight: { x: CENTER_X + halfTop, y: topY },
      neckTopLeft: { x: CENTER_X - halfNeck, y: channelTop },
      neckTopRight: { x: CENTER_X + halfNeck, y: channelTop },
      neckBottomLeft: { x: CENTER_X - halfNeck, y: channelBottom },
      neckBottomRight: { x: CENTER_X + halfNeck, y: channelBottom },
      bottomLeft: { x: CENTER_X - halfTop, y: bottomY },
      bottomRight: { x: CENTER_X + halfTop, y: bottomY },
      channelLeft: CENTER_X - halfChannel,
      channelRight: CENTER_X + halfChannel,
      topWidth
    };
  }

  private getLeftWallX(y: number): number {
    const g = this.getGeometry();
    if (y >= g.topY && y <= g.channelTop) {
      const t = (y - g.topY) / (g.channelTop - g.topY);
      return g.topLeft.x + (g.neckTopLeft.x - g.topLeft.x) * t;
    }
    if (y > g.channelBottom && y <= g.bottomY) {
      const t = (y - g.channelBottom) / (g.bottomY - g.channelBottom);
      return g.neckBottomLeft.x + (g.bottomLeft.x - g.neckBottomLeft.x) * t;
    }
    if (y > g.channelTop && y <= g.channelBottom) {
      return g.channelLeft;
    }
    return CENTER_X - CHANNEL_WIDTH / 2;
  }

  private getRightWallX(y: number): number {
    const g = this.getGeometry();
    if (y >= g.topY && y <= g.channelTop) {
      const t = (y - g.topY) / (g.channelTop - g.topY);
      return g.topRight.x + (g.neckTopRight.x - g.topRight.x) * t;
    }
    if (y > g.channelBottom && y <= g.bottomY) {
      const t = (y - g.channelBottom) / (g.bottomY - g.channelBottom);
      return g.neckBottomRight.x + (g.bottomRight.x - g.neckBottomRight.x) * t;
    }
    if (y > g.channelTop && y <= g.channelBottom) {
      return g.channelRight;
    }
    return CENTER_X + CHANNEL_WIDTH / 2;
  }

  private computeScale(): void {
    const w = this.p.windowWidth;
    const h = this.p.windowHeight;
    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    this.scale = Math.min(scaleX, scaleY) * 0.95;
    this.offsetX = (w - BASE_W * this.scale) / 2;
    this.offsetY = (h - BASE_H * this.scale) / 2;
  }

  setup(): void {
    const canvas = this.p.createCanvas(this.p.windowWidth, this.p.windowHeight);
    canvas.parent('app');
    this.p.pixelDensity(1);
    this.computeScale();
  }

  draw(): void {
    this.currentFrame++;
    this.p.clear();

    this.p.push();
    this.p.translate(this.offsetX, this.offsetY);
    this.p.scale(this.scale);

    this.drawBackground();
    this.handleBreath();

    if (this.isRunning && !this.isFinished) {
      this.updateParticles();
      this.checkFinish();
    }

    this.updateEffects();
    this.drawHourglass();
    this.drawParticles();
    this.drawEffects();
    this.drawButton();
    this.drawTimesUp();

    this.p.pop();
  }

  private drawBackground(): void {
    const inner = hexToRgb('#0a0a2a');
    const outer = hexToRgb('#1a0a1a');
    for (let y = 0; y < BASE_H; y++) {
      const t = Math.abs(y - BASE_H / 2) / (BASE_H / 2);
      const r = inner.r + (outer.r - inner.r) * t;
      const g = inner.g + (outer.g - inner.g) * t;
      const b = inner.b + (outer.b - inner.b) * t;
      this.p.stroke(r, g, b);
      this.p.line(0, y, BASE_W, y);
    }
  }

  private handleBreath(): void {
    const t = (this.currentFrame % BREATH_PERIOD) / BREATH_PERIOD;
    this.breathWeight = 2 + Math.sin(t * Math.PI * 2) * 0.5;
  }

  private drawHourglass(): void {
    const g = this.getGeometry();
    this.p.drawingContext.save();
    this.p.drawingContext.shadowBlur = 15;
    this.p.drawingContext.shadowColor = '#aaccff';

    const strokeRgb = hexToRgb('#aaccff');

    this.p.strokeWeight(this.breathWeight);
    this.p.stroke(strokeRgb.r, strokeRgb.g, strokeRgb.b, 200);
    this.p.fill(strokeRgb.r, strokeRgb.g, strokeRgb.b, 38);

    this.p.beginShape();
    this.p.vertex(g.topLeft.x, g.topLeft.y);
    this.p.vertex(g.topRight.x, g.topRight.y);
    this.p.vertex(g.neckTopRight.x, g.neckTopRight.y);
    this.p.vertex(g.neckBottomRight.x, g.neckBottomRight.y);
    this.p.vertex(g.bottomRight.x, g.bottomRight.y);
    this.p.vertex(g.bottomLeft.x, g.bottomLeft.y);
    this.p.vertex(g.neckBottomLeft.x, g.neckBottomLeft.y);
    this.p.vertex(g.neckTopLeft.x, g.neckTopLeft.y);
    this.p.endShape(this.p.CLOSE);

    this.p.drawingContext.restore();
  }

  private updateParticles(): void {
    const g = this.getGeometry();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.isFalling) continue;

      p.update();

      const leftWall = this.getLeftWallX(p.y);
      const rightWall = this.getRightWallX(p.y);

      if (p.x - PARTICLE_SIZE / 2 < leftWall) {
        p.x = leftWall + PARTICLE_SIZE / 2;
        p.bounceX();
      }
      if (p.x + PARTICLE_SIZE / 2 > rightWall) {
        p.x = rightWall - PARTICLE_SIZE / 2;
        p.bounceX();
      }

      if (p.y >= g.channelTop && p.y <= g.channelBottom) {
        if (this.channelOccupied && this.channelParticleId !== i) {
          p.y = g.channelTop - PARTICLE_SIZE / 2;
          p.vy = 0;
        } else {
          this.channelOccupied = true;
          this.channelParticleId = i;
          if (!p.passedThroughChannel) {
            p.passedThroughChannel = true;
            this.triggerPulse(CENTER_X, g.channelTop, p.color);
          }
        }
      }

      if (p.y > g.channelBottom && this.channelParticleId === i) {
        this.channelOccupied = false;
        this.channelParticleId = -1;
      }

      if (p.y > g.bottomY - PARTICLE_SIZE / 2) {
        p.y = g.bottomY - PARTICLE_SIZE / 2;
        p.stop();
        this.addBottomParticle(i, p);
        continue;
      }

      if (p.y > g.channelBottom) {
        let landed = false;
        for (let j = this.bottomParticles.length - 1; j >= 0; j--) {
          const bp = this.bottomParticles[j];
          const dx = p.x - bp.x;
          const dy = p.y - bp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PARTICLE_SIZE && dy > -PARTICLE_SIZE / 2) {
            p.y = bp.y - PARTICLE_SIZE;
            p.stop();
            this.addBottomParticle(i, p);
            landed = true;
            break;
          }
        }
        if (landed) continue;
      }
    }
  }

  private addBottomParticle(idx: number, p: SandParticle): void {
    if (this.bottomParticles.length < MAX_BOTTOM_PARTICLES) {
      this.particles.splice(idx, 1);
      this.bottomParticles.push(p);
      if (this.currentFrame !== this.lastMixFrame) {
        this.mixColorsAround(p);
        this.lastMixFrame = this.currentFrame;
      }
    }
  }

  private triggerPulse(x: number, y: number, color: string): void {
    let pulse = this.pulsePool.find(p => !p.active);
    if (!pulse) {
      pulse = new LightPulse();
      this.pulsePool.push(pulse);
    }
    pulse.reset(x, y, color);

    const count = SPARKLE_COUNT_MIN + Math.floor(Math.random() * (SPARKLE_COUNT_MAX - SPARKLE_COUNT_MIN + 1));
    for (let i = 0; i < count; i++) {
      let sparkle = this.sparklePool.find(s => !s.active);
      if (!sparkle) {
        sparkle = new Sparkle();
        this.sparklePool.push(sparkle);
      }
      sparkle.reset(x, y, color);
    }
  }

  private mixColorsAround(centerP: SandParticle): void {
    const radius = 15;
    for (const bp of this.bottomParticles) {
      const dx = bp.x - centerP.x;
      const dy = bp.y - centerP.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 0) {
        const weight = 1 - dist / radius;
        bp.color = mixColors([
          { color: bp.originalColor, weight: 1 - weight * 0.3 },
          { color: centerP.originalColor, weight: weight * 0.3 }
        ]);
      }
    }
  }

  private checkFinish(): void {
    const g = this.getGeometry();
    for (const bp of this.bottomParticles) {
      if (bp.y <= g.channelBottom + 5) {
        this.isFinished = true;
        this.timesUpTimer = 120;
        break;
      }
    }
  }

  private updateEffects(): void {
    for (const pulse of this.pulsePool) {
      pulse.update();
    }
    for (const sparkle of this.sparklePool) {
      sparkle.update();
    }
    if (this.isFinished) {
      if (this.timesUpTimer > 0) {
        this.timesUpTimer--;
        this.timesUpAlpha = Math.min(255, this.timesUpAlpha + 5);
      } else {
        this.timesUpAlpha = Math.max(0, this.timesUpAlpha - 5);
      }
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      p.draw(this.p);
    }
    for (const p of this.bottomParticles) {
      p.draw(this.p);
    }
  }

  private drawEffects(): void {
    for (const pulse of this.pulsePool) {
      pulse.draw(this.p);
    }
    for (const sparkle of this.sparklePool) {
      sparkle.draw(this.p);
    }
  }

  private drawButton(): void {
    const label = this.isRunning ? '点击重置' : '点击启动';
    const btnRgb = this.buttonClicked
      ? hexToRgb('#ffaa44')
      : this.buttonHovered
        ? hexToRgb('#66ccff')
        : hexToRgb('#44aaff');

    this.p.noStroke();
    this.p.fill(btnRgb.r, btnRgb.g, btnRgb.b, 255);
    this.p.circle(this.buttonX, this.buttonY, this.buttonRadius * 2);

    this.p.fill(255);
    this.p.textSize(14);
    this.p.textAlign(this.p.CENTER, this.p.BOTTOM);
    this.p.text(label, this.buttonX, this.buttonY - this.buttonRadius - 8);
  }

  private drawTimesUp(): void {
    if (this.timesUpAlpha <= 0) return;
    const g = this.getGeometry();
    this.p.fill(255, this.timesUpAlpha);
    this.p.textSize(24);
    this.p.textAlign(this.p.CENTER, this.p.BOTTOM);
    this.p.text("Time's Up", CENTER_X, g.topY - 20);
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  mousePressed(mx: number, my: number): void {
    const { x, y } = this.screenToWorld(mx, my);

    const dxBtn = x - this.buttonX;
    const dyBtn = y - this.buttonY;
    if (Math.sqrt(dxBtn * dxBtn + dyBtn * dyBtn) < this.buttonRadius) {
      this.buttonClicked = true;
      this.toggleRun();
      return;
    }

    const g = this.getGeometry();
    if (x >= g.topLeft.x - this.dragHitbox && x <= g.topLeft.x + this.dragHitbox &&
        y >= g.topLeft.y && y <= g.neckTopLeft.y) {
      this.isDraggingLeft = true;
    }
    if (x >= g.topRight.x - this.dragHitbox && x <= g.topRight.x + this.dragHitbox &&
        y >= g.topRight.y && y <= g.neckTopRight.y) {
      this.isDraggingRight = true;
    }
  }

  mouseDragged(mx: number, my: number): void {
    if (!this.isDraggingLeft && !this.isDraggingRight) return;

    const { x, y } = this.screenToWorld(mx, my);
    const g = this.getGeometry();
    let newAngle = this.topAngle;

    if (this.isDraggingLeft) {
      const dx = CENTER_X - x;
      const dy = y - g.topY;
      if (dy > 5) {
        newAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
    }
    if (this.isDraggingRight) {
      const dx = x - CENTER_X;
      const dy = y - g.topY;
      if (dy > 5) {
        newAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
    }

    this.topAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, newAngle));
  }

  mouseReleased(): void {
    if (this.isDraggingLeft || this.isDraggingRight) {
      this.isDraggingLeft = false;
      this.isDraggingRight = false;
      this.resetParticles();
    }
    this.buttonClicked = false;
  }

  mouseMoved(mx: number, my: number): void {
    const { x, y } = this.screenToWorld(mx, my);
    const dxBtn = x - this.buttonX;
    const dyBtn = y - this.buttonY;
    this.buttonHovered = Math.sqrt(dxBtn * dxBtn + dyBtn * dyBtn) < this.buttonRadius;
  }

  private toggleRun(): void {
    if (this.isRunning) {
      this.resetParticles();
    } else {
      this.isRunning = true;
      this.isFinished = false;
      this.timesUpAlpha = 0;
      this.timesUpTimer = 0;
    }
  }

  private resetParticles(): void {
    this.isRunning = false;
    this.isFinished = false;
    this.timesUpAlpha = 0;
    this.timesUpTimer = 0;
    this.channelOccupied = false;
    this.channelParticleId = -1;
    this.initParticles();
  }

  windowResized(): void {
    this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight);
    this.computeScale();
  }
}
