interface LavaBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  scaleX: number;
  scaleY: number;
  targetScaleX: number;
  targetScaleY: number;
  inHeatingZone: boolean;
  heatingFrames: number;
  animating: boolean;
  animFrame: number;
  animDuration: number;
  animType: 'none' | 'merge' | 'split';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class LavaLamp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private balls: LavaBall[] = [];
  private particles: Particle[] = [];
  private nextBallId = 0;
  private frameCount = 0;

  private currentColor: RGB = { r: 255, g: 107, b: 53 };
  private targetColor: RGB = { r: 255, g: 107, b: 53 };
  private colorTransitionStart = 0;
  private colorTransitionDuration = 90;
  private isColorTransitioning = false;

  private heatIntensity = 5;

  private readonly CONTAINER_WIDTH = 400;
  private readonly CONTAINER_HEIGHT = 600;
  private readonly HEATING_ZONE_HEIGHT = 100;
  private readonly GRAVITY = 0.2;
  private readonly BASE_BUOYANCY = 0.5;
  private readonly BALL_COUNT = 12;
  private readonly MIN_RADIUS = 12;
  private readonly MAX_RADIUS = 18;
  private readonly MAX_BALL_RADIUS = 40;
  private readonly LIQUID_COLOR = 'rgba(212, 230, 241, 0.3)';
  private readonly BG_TOP = '#0d1b2a';
  private readonly BG_BOTTOM = '#1b2838';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.CONTAINER_WIDTH;
    this.canvas.height = this.CONTAINER_HEIGHT;
    this.initBalls();
  }

  private initBalls(): void {
    for (let i = 0; i < this.BALL_COUNT; i++) {
      this.balls.push(this.createBall());
    }
  }

  private createBall(x?: number, y?: number, radius?: number): LavaBall {
    const r = radius ?? (this.MIN_RADIUS + Math.random() * (this.MAX_RADIUS - this.MIN_RADIUS));
    return {
      id: this.nextBallId++,
      x: x ?? (r + 20 + Math.random() * (this.CONTAINER_WIDTH - 2 * r - 40)),
      y: y ?? (r + 20 + Math.random() * (this.CONTAINER_HEIGHT - 2 * r - 40)),
      vx: (Math.random() - 0.5) * 0.2,
      vy: this.GRAVITY,
      radius: r,
      targetRadius: r,
      scaleX: 1,
      scaleY: 1,
      targetScaleX: 1,
      targetScaleY: 1,
      inHeatingZone: false,
      heatingFrames: 0,
      animating: false,
      animFrame: 0,
      animDuration: 0,
      animType: 'none'
    };
  }

  public setColor(color: RGB): void {
    this.targetColor = { ...color };
    this.colorTransitionStart = this.frameCount;
    this.isColorTransitioning = true;
  }

  public setHeatIntensity(intensity: number): void {
    this.heatIntensity = Math.max(1, Math.min(10, intensity));
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private interpolateColor(): RGB {
    if (!this.isColorTransitioning) {
      return { ...this.currentColor };
    }
    const progress = Math.min(1, (this.frameCount - this.colorTransitionStart) / this.colorTransitionDuration);
    const eased = this.easeInOut(progress);
    if (progress >= 1) {
      this.currentColor = { ...this.targetColor };
      this.isColorTransitioning = false;
    }
    return {
      r: Math.round(this.currentColor.r + (this.targetColor.r - this.currentColor.r) * eased),
      g: Math.round(this.currentColor.g + (this.targetColor.g - this.currentColor.g) * eased),
      b: Math.round(this.currentColor.b + (this.targetColor.b - this.currentColor.b) * eased)
    };
  }

  private getBuoyancyMultiplier(): number {
    return 0.1 + (this.heatIntensity - 1) * 0.1;
  }

  private updateBall(ball: LavaBall): void {
    ball.y += ball.vy;
    ball.x += ball.vx;

    const bottomOfBall = ball.y + ball.radius;
    const topOfBall = ball.y - ball.radius;

    if (bottomOfBall >= this.CONTAINER_HEIGHT - this.HEATING_ZONE_HEIGHT) {
      ball.inHeatingZone = true;
      ball.heatingFrames++;
      const distFromBottom = this.CONTAINER_HEIGHT - bottomOfBall;
      const heatFactor = 1 - Math.min(1, distFromBottom / this.HEATING_ZONE_HEIGHT);
      const buoyancy = -this.BASE_BUOYANCY * this.getBuoyancyMultiplier() * heatFactor;
      ball.vy += buoyancy * 0.1;
      ball.vy = Math.max(ball.vy, -this.BASE_BUOYANCY * this.getBuoyancyMultiplier());

      ball.targetScaleX = 0.7;
      ball.targetScaleY = 1.5;
    } else {
      ball.inHeatingZone = false;
      ball.heatingFrames = 0;
      ball.vy += this.GRAVITY * 0.05;
      ball.vy = Math.min(ball.vy, this.GRAVITY);

      ball.targetScaleX = 1;
      ball.targetScaleY = 1;
    }

    if (topOfBall <= 50 && ball.vy < 0) {
      ball.vy += this.GRAVITY * 0.15;
      ball.targetScaleX = 1;
      ball.targetScaleY = 1;
    }

    ball.scaleX += (ball.targetScaleX - ball.scaleX) * 0.05;
    ball.scaleY += (ball.targetScaleY - ball.scaleY) * 0.05;

    if (ball.animating) {
      ball.animFrame++;
      if (ball.animFrame >= ball.animDuration) {
        ball.animating = false;
        ball.animFrame = 0;
        ball.animType = 'none';
      }
    }

    ball.radius += (ball.targetRadius - ball.radius) * 0.1;

    const effectiveRadiusX = ball.radius * ball.scaleX;
    const effectiveRadiusY = ball.radius * ball.scaleY;
    if (ball.x - effectiveRadiusX < 20) {
      ball.x = 20 + effectiveRadiusX;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + effectiveRadiusX > this.CONTAINER_WIDTH - 20) {
      ball.x = this.CONTAINER_WIDTH - 20 - effectiveRadiusX;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - effectiveRadiusY < 30) {
      ball.y = 30 + effectiveRadiusY;
      ball.vy = Math.abs(ball.vy) * 0.5;
    }
    if (ball.y + effectiveRadiusY > this.CONTAINER_HEIGHT - 30) {
      ball.y = this.CONTAINER_HEIGHT - 30 - effectiveRadiusY;
      ball.vy = -Math.abs(ball.vy) * 0.3;
    }

    ball.vx *= 0.995;
    if (Math.abs(ball.vx) < 0.01) {
      ball.vx += (Math.random() - 0.5) * 0.1;
    }
  }

  private checkCollision(b1: LavaBall, b2: LavaBall): boolean {
    const dx = b1.x - b2.x;
    const dy = b1.y - b2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = b1.radius + b2.radius;
    return dist < minDist;
  }

  private mergeBalls(b1: LavaBall, b2: LavaBall): LavaBall {
    const newRadius = Math.min(this.MAX_BALL_RADIUS, (b1.radius + b2.radius) * 0.6);
    const totalMass = b1.radius * b1.radius + b2.radius * b2.radius;
    const newX = (b1.x * b1.radius * b1.radius + b2.x * b2.radius * b2.radius) / totalMass;
    const newY = (b1.y * b1.radius * b1.radius + b2.y * b2.radius * b2.radius) / totalMass;
    const newVx = (b1.vx * b1.radius + b2.vx * b2.radius) / (b1.radius + b2.radius);
    const newVy = (b1.vy * b1.radius + b2.vy * b2.radius) / (b1.radius + b2.radius);

    const merged: LavaBall = {
      id: this.nextBallId++,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      radius: newRadius * 0.77,
      targetRadius: newRadius,
      scaleX: 1,
      scaleY: 1,
      targetScaleX: 1,
      targetScaleY: 1,
      inHeatingZone: b1.inHeatingZone || b2.inHeatingZone,
      heatingFrames: Math.max(b1.heatingFrames, b2.heatingFrames),
      animating: true,
      animFrame: 0,
      animDuration: 15,
      animType: 'merge'
    };
    return merged;
  }

  private splitBall(ball: LavaBall, color: RGB): LavaBall[] {
    const result: LavaBall[] = [];
    const splitCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: ball.x,
        y: ball.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        radius: 2 + Math.random() * 2,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, `
      });
    }

    for (let i = 0; i < splitCount; i++) {
      const angle = (Math.PI * 2 * i) / splitCount;
      const offset = ball.radius * 0.5;
      const newRadius = 8 + Math.random() * 7;
      result.push({
        id: this.nextBallId++,
        x: ball.x + Math.cos(angle) * offset,
        y: ball.y + Math.sin(angle) * offset,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.3 - 0.2,
        radius: newRadius,
        targetRadius: newRadius,
        scaleX: 1,
        scaleY: 1,
        targetScaleX: 1,
        targetScaleY: 1,
        inHeatingZone: ball.inHeatingZone,
        heatingFrames: 0,
        animating: true,
        animFrame: 0,
        animDuration: 10,
        animType: 'split'
      });
    }
    return result;
  }

  private handleCollisions(color: RGB): void {
    const toRemove = new Set<number>();
    const toAdd: LavaBall[] = [];
    const EDGE_THRESHOLD = 15;

    const edgeBalls = this.balls.filter(b => {
      const effectiveR = b.radius * Math.max(b.scaleX, b.scaleY);
      return (
        b.x - effectiveR < EDGE_THRESHOLD ||
        b.x + effectiveR > this.CONTAINER_WIDTH - EDGE_THRESHOLD ||
        b.y - effectiveR < EDGE_THRESHOLD ||
        b.y + effectiveR > this.CONTAINER_HEIGHT - EDGE_THRESHOLD
      );
    });

    const ballsToCheck = edgeBalls.length > 0 ? this.balls : edgeBalls;

    for (let i = 0; i < ballsToCheck.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const b1 = ballsToCheck[i];
        const b2 = this.balls[j];
        if (toRemove.has(b1.id) || toRemove.has(b2.id)) continue;
        if (b1.id === b2.id) continue;

        if (this.checkCollision(b1, b2)) {
          if (Math.random() < 0.4) {
            toRemove.add(b1.id);
            toRemove.add(b2.id);
            toAdd.push(this.mergeBalls(b1, b2));
          } else {
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const overlap = (b1.radius + b2.radius - dist) / 2;
            b1.x -= (dx / dist) * overlap;
            b1.y -= (dy / dist) * overlap;
            b2.x += (dx / dist) * overlap;
            b2.y += (dy / dist) * overlap;

            const tempVx = b1.vx;
            const tempVy = b1.vy;
            b1.vx = b2.vx * 0.5;
            b1.vy = b2.vy * 0.5;
            b2.vx = tempVx * 0.5;
            b2.vy = tempVy * 0.5;
          }
        }
      }
    }

    const largeBalls = this.balls.filter(b => b.radius > 25 && b.inHeatingZone && b.heatingFrames > 30 && !toRemove.has(b.id));
    for (const ball of largeBalls) {
      if (Math.random() < 0.02) {
        toRemove.add(ball.id);
        toAdd.push(...this.splitBall(ball, color));
      }
    }

    if (this.balls.length + toAdd.length - toRemove.size > 30) {
      const sorted = [...this.balls, ...toAdd].filter(b => !toRemove.has(b.id));
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const b1 = sorted[i];
          const b2 = sorted[j];
          if (toRemove.has(b1.id) || toRemove.has(b2.id)) continue;
          const dx = b1.x - b2.x;
          const dy = b1.y - b2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            toRemove.add(b1.id);
            toRemove.add(b2.id);
            toAdd.push(this.mergeBalls(b1, b2));
          }
        }
      }
    }

    this.balls = this.balls.filter(b => !toRemove.has(b.id));
    this.balls.push(...toAdd);
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawContainer(): void {
    const ctx = this.ctx;
    const w = this.CONTAINER_WIDTH;
    const h = this.CONTAINER_HEIGHT;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, this.BG_TOP);
    bgGradient.addColorStop(1, this.BG_BOTTOM);

    ctx.save();
    ctx.beginPath();
    const cornerRadius = 50;
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(w - cornerRadius, 0);
    ctx.quadraticCurveTo(w, 0, w, cornerRadius);
    ctx.lineTo(w, h - cornerRadius);
    ctx.quadraticCurveTo(w, h, w - cornerRadius, h);
    ctx.lineTo(cornerRadius, h);
    ctx.quadraticCurveTo(0, h, 0, h - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = this.LIQUID_COLOR;
    ctx.fillRect(0, 0, w, h);

    this.drawHeatingGlow();

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(w - cornerRadius, 0);
    ctx.quadraticCurveTo(w, 0, w, cornerRadius);
    ctx.lineTo(w, h - cornerRadius);
    ctx.quadraticCurveTo(w, h, w - cornerRadius, h);
    ctx.lineTo(cornerRadius, h);
    ctx.quadraticCurveTo(0, h, 0, h - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawHeatingGlow(): void {
    const ctx = this.ctx;
    const h = this.CONTAINER_HEIGHT;
    const w = this.CONTAINER_WIDTH;

    const breathCycle = (Math.sin(this.frameCount * Math.PI / 60) + 1) / 2;
    const intensity = 0.4 + breathCycle * 0.4;

    const glowGradient = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, this.HEATING_ZONE_HEIGHT * 1.5);
    glowGradient.addColorStop(0, `rgba(255, 80, 30, ${intensity})`);
    glowGradient.addColorStop(0.5, `rgba(255, 140, 50, ${intensity * 0.6})`);
    glowGradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, h - this.HEATING_ZONE_HEIGHT * 1.5, w, this.HEATING_ZONE_HEIGHT * 1.5);
  }

  private drawBall(ball: LavaBall, color: RGB): void {
    const ctx = this.ctx;

    let scaleMultiplier = 1;
    let alpha = 0.8;
    if (ball.animating) {
      const t = ball.animFrame / ball.animDuration;
      if (ball.animType === 'merge') {
        scaleMultiplier = 1 + 0.3 * Math.sin(t * Math.PI);
        alpha = 0.6 + 0.2 * Math.sin(t * Math.PI);
      } else if (ball.animType === 'split') {
        scaleMultiplier = 1 - 0.2 * Math.sin(t * Math.PI);
        alpha = 0.5 + 0.3 * (1 - t);
      }
    }

    const sx = ball.scaleX * scaleMultiplier;
    const sy = ball.scaleY * scaleMultiplier;
    const r = ball.radius;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.scale(sx, sy);

    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    gradient.addColorStop(0, `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 40)}, ${Math.min(255, color.b + 20)}, ${alpha})`);
    gradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${Math.max(0, color.r - 40)}, ${Math.max(0, color.g - 30)}, ${Math.max(0, color.b - 20)}, ${alpha * 0.9})`);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color + alpha + ')';
      ctx.fill();
    }
  }

  public update(): void {
    this.frameCount++;
    const color = this.interpolateColor();

    for (const ball of this.balls) {
      this.updateBall(ball);
    }

    this.handleCollisions(color);
    this.updateParticles();
  }

  public render(): void {
    const ctx = this.ctx;
    const color = this.interpolateColor();

    ctx.clearRect(0, 0, this.CONTAINER_WIDTH, this.CONTAINER_HEIGHT);

    this.drawContainer();

    this.balls.sort((a, b) => a.y - b.y);
    for (const ball of this.balls) {
      this.drawBall(ball, color);
    }

    this.drawParticles();
  }

  public getFPS(): number {
    return 60;
  }
}
