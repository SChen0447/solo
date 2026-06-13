export interface Vector2 {
  x: number;
  y: number;
}

export const SPOT_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3'];
export const RING_COLORS = ['#ff6b6b', '#48dbfb', '#feca57'];

export class SpaceShip {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  speed: number;
  glowIntensity: number;
  boostActive: boolean;
  boostTime: number;
  boostCooldown: number;
  shieldActive: boolean;
  shieldTime: number;
  flashTime: number;
  trailPositions: { x: number; y: number; time: number }[];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.angle = 0;
    this.speed = 0;
    this.glowIntensity = 1;
    this.boostActive = false;
    this.boostTime = 0;
    this.boostCooldown = 0;
    this.shieldActive = false;
    this.shieldTime = 0;
    this.flashTime = 0;
    this.trailPositions = [];
  }

  update(deltaTime: number, mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number) {
    const clampedMouseX = Math.max(10, Math.min(canvasWidth - 10, mouseX));
    const clampedMouseY = Math.max(10, Math.min(canvasHeight - 10, mouseY));
    this.targetX = clampedMouseX;
    this.targetY = clampedMouseY;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let speedFactor = this.boostActive ? 3.5 : 2.5;
    this.speed = distance * speedFactor * deltaTime;

    if (distance > 1) {
      this.x += dx * speedFactor * deltaTime * 0.9;
      this.y += dy * speedFactor * deltaTime * 0.9;
      this.angle = Math.atan2(dy, dx);
    }

    this.glowIntensity = 0.6 + Math.min(1.4, this.speed * 0.02);

    if (this.boostActive) {
      this.boostTime -= deltaTime;
      if (this.boostTime <= 0) {
        this.boostActive = false;
      }
    }
    if (this.boostCooldown > 0) {
      this.boostCooldown -= deltaTime;
    }

    if (this.shieldActive) {
      this.shieldTime -= deltaTime;
      if (this.shieldTime <= 0) {
        this.shieldActive = false;
      }
    }

    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
    }

    this.trailPositions.unshift({ x: this.x, y: this.y, time: 1.5 });
    if (this.trailPositions.length > 60) {
      this.trailPositions.pop();
    }

    for (const pos of this.trailPositions) {
      pos.time -= deltaTime;
    }
    this.trailPositions = this.trailPositions.filter(p => p.time > 0);
  }

  boost() {
    if (this.boostCooldown <= 0) {
      this.boostActive = true;
      this.boostTime = 0.3;
      this.boostCooldown = 2;
    }
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldTime = 2;
  }

  flash() {
    this.flashTime = 0.1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flashMultiplier = this.flashTime > 0 ? 1.3 : 1;
    const glowSize = 8 + this.glowIntensity * 4;

    ctx.shadowBlur = glowSize * flashMultiplier;
    ctx.shadowColor = this.boostActive ? '#ffffff' : '#48dbfb';

    ctx.fillStyle = this.boostActive ? '#ffffff' : '#8be9fd';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 6 * flashMultiplier;
    ctx.shadowColor = '#48dbfb';
    ctx.fillStyle = '#48dbfb';
    ctx.beginPath();
    ctx.arc(-2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (this.shieldActive) {
      this.drawShield(ctx);
    }
  }

  drawShield(ctx: CanvasRenderingContext2D) {
    const shieldRadius = 25;
    const numDots = 6;
    const time = performance.now() / 1000;
    const rotationSpeed = 2 * Math.PI * 2;

    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * Math.PI * 2 + time * rotationSpeed * 0.1;
      const dotX = this.x + Math.cos(angle) * shieldRadius;
      const dotY = this.y + Math.sin(angle) * shieldRadius;

      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getRadius(): number {
    return 12;
  }
}

export class LightSpot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
  alive: boolean;
  spawnTime: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.radius = 8 + Math.random() * 4;
    this.baseRadius = this.radius;
    this.color = SPOT_COLORS[Math.floor(Math.random() * SPOT_COLORS.length)];
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = (2 * Math.PI) / 1.5;
    this.alive = true;
    this.spawnTime = performance.now();

    const side = Math.floor(Math.random() * 4);
    const margin = 50;
    switch (side) {
      case 0:
        this.x = Math.random() * canvasWidth;
        this.y = -margin;
        break;
      case 1:
        this.x = canvasWidth + margin;
        this.y = Math.random() * canvasHeight;
        break;
      case 2:
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + margin;
        break;
      default:
        this.x = -margin;
        this.y = Math.random() * canvasHeight;
        break;
    }

    const targetX = canvasWidth * 0.2 + Math.random() * canvasWidth * 0.6;
    const targetY = canvasHeight * 0.2 + Math.random() * canvasHeight * 0.6;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = 20 + Math.random() * 30;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.pulsePhase += this.pulseSpeed * deltaTime;
    const pulseScale = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(this.pulsePhase));
    this.radius = this.baseRadius * pulseScale;

    const margin = 100;
    if (this.x < margin || this.x > canvasWidth - margin) {
      this.vx *= -1;
    }
    if (this.y < margin || this.y > canvasHeight - margin) {
      this.vy *= -1;
    }
    this.x = Math.max(margin, Math.min(canvasWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(canvasHeight - margin, this.y));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(1, this.color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getRadius(): number {
    return this.radius;
  }
}

export class Star {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.radius = 0.5 + Math.random() * 1.5;
    this.baseOpacity = 0.2 + Math.random() * 0.3;
    this.opacity = this.baseOpacity;
    this.pulsePhase = Math.random() * Math.PI * 2;
    const period = 2 + Math.random() * 3;
    this.pulseSpeed = (2 * Math.PI) / period;
  }

  update(deltaTime: number) {
    this.pulsePhase += this.pulseSpeed * deltaTime;
    const pulseFactor = 0.5 + 0.5 * Math.sin(this.pulsePhase);
    this.opacity = this.baseOpacity * (0.6 + 0.4 * pulseFactor);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Ring {
  x: number;
  y: number;
  radius: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  lineWidth: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.radius = 45 + Math.random() * 75;
    this.x = this.radius + Math.random() * (canvasWidth - this.radius * 2);
    this.y = this.radius + Math.random() * (canvasHeight - this.radius * 2);
    this.color = RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (0.2 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1);
    this.lineWidth = 3;
  }

  update(deltaTime: number) {
    this.rotation += this.rotationSpeed * deltaTime * 2 * Math.PI;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color + '60';
    ctx.lineWidth = this.lineWidth;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const startAngle = (i / 6) * Math.PI * 2;
      const endAngle = startAngle + (1 / 12) * Math.PI * 2;
      ctx.moveTo(this.radius * Math.cos(startAngle), this.radius * Math.sin(startAngle));
      ctx.arc(0, 0, this.radius, startAngle, endAngle);
    }
    ctx.stroke();

    ctx.restore();
  }

  getRadius(): number {
    return this.radius;
  }
}
