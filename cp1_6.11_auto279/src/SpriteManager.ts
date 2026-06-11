import { v4 as uuidv4 } from 'uuid';

export interface EnvParams {
  temperature: number;
  ph: number;
  sulfide: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

interface BacteriaPoint {
  id: string;
  x: number;
  y: number;
  opacity: number;
  life: number;
}

interface BezierPath {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
  t: number;
  speed: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

class BlindShrimp {
  id: string;
  x: number;
  y: number;
  angle: number;
  baseSpeed: number;
  bodyLength: number;
  bodySegments: number;
  glowIntensity: number;
  trail: TrailPoint[];
  maxTrailLength: number;
  bacteriaCarpet: {
    size: number;
    maxSize: number;
    health: number;
    color: string;
  };
  isCollecting: boolean;
  collectingBacteria: BacteriaPoint[];
  bezierPath: BezierPath | null;
  targetX: number;
  targetY: number;
  wanderTimer: number;
  directionChangeTimer: number;

  constructor(x: number, y: number) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.baseSpeed = 1.5;
    this.bodyLength = 25 + Math.random() * 10;
    this.bodySegments = 5;
    this.glowIntensity = 1;
    this.trail = [];
    this.maxTrailLength = 20;
    this.bacteriaCarpet = {
      size: 0,
      maxSize: 30,
      health: 0,
      color: '#a5d6a7'
    };
    this.isCollecting = false;
    this.collectingBacteria = [];
    this.bezierPath = null;
    this.targetX = x;
    this.targetY = y;
    this.wanderTimer = 0;
    this.directionChangeTimer = 0;
  }

  calculateFitnessScore(env: EnvParams): number {
    const tempScore = this.calculateGaussian(env.temperature, 37.5, 5);
    const phScore = this.calculateGaussian(env.ph, 6.75, 0.5);
    const sulfideScore = this.calculateGaussian(env.sulfide, 0.2, 0.1);
    return (tempScore + phScore + sulfideScore) / 3;
  }

  private calculateGaussian(x: number, mean: number, std: number): number {
    return Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(std, 2)));
  }

  getEffectiveSpeed(): number {
    const health = this.bacteriaCarpet.health;
    if (health > 80) return this.baseSpeed * 1.3;
    if (health < 20) return this.baseSpeed * 0.5;
    return this.baseSpeed;
  }

  updateTarget(ventX: number, ventY: number, canvasWidth: number, canvasHeight: number, env: EnvParams) {
    this.directionChangeTimer--;
    if (this.directionChangeTimer <= 0) {
      this.directionChangeTimer = 120 + Math.random() * 180;

      const fitness = this.calculateFitnessScore(env);

      if (fitness < 0.6) {
        this.targetX = ventX + (Math.random() - 0.5) * 200;
        this.targetY = ventY + (Math.random() - 0.5) * 200;
      } else {
        const margin = 100;
        this.targetX = margin + Math.random() * (canvasWidth - margin * 2);
        this.targetY = margin + Math.random() * (canvasHeight - margin * 2);
      }

      this.targetX = Math.max(50, Math.min(canvasWidth - 50, this.targetX));
      this.targetY = Math.max(50, Math.min(canvasHeight - 50, this.targetY));

      this.generateBezierPath();
    }
  }

  generateBezierPath() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    const midX = this.x + dx * 0.5 + (Math.random() - 0.5) * 150;
    const midY = this.y + dy * 0.5 + (Math.random() - 0.5) * 150;

    this.bezierPath = {
      p0: { x: this.x, y: this.y },
      p1: { x: midX, y: midY },
      p2: { x: this.targetX - (Math.random() - 0.5) * 100, y: this.targetY - (Math.random() - 0.5) * 100 },
      p3: { x: this.targetX, y: this.targetY },
      t: 0,
      speed: 0.005 + Math.random() * 0.005
    };
  }

  update(ventX: number, ventY: number, env: EnvParams, canvasWidth: number, canvasHeight: number) {
    this.updateTarget(ventX, ventY, canvasWidth, canvasHeight, env);

    const speed = this.getEffectiveSpeed();

    if (this.bezierPath && this.bezierPath.t < 1) {
      const { p0, p1, p2, p3 } = this.bezierPath;
      const t = this.bezierPath.t;

      const newX = Math.pow(1 - t, 3) * p0.x +
        3 * Math.pow(1 - t, 2) * t * p1.x +
        3 * (1 - t) * Math.pow(t, 2) * p2.x +
        Math.pow(t, 3) * p3.x;

      const newY = Math.pow(1 - t, 3) * p0.y +
        3 * Math.pow(1 - t, 2) * t * p1.y +
        3 * (1 - t) * Math.pow(t, 2) * p2.y +
        Math.pow(t, 3) * p3.y;

      const moveDx = newX - this.x;
      const moveDy = newY - this.y;
      const dist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);

      if (dist > 0) {
        this.angle = Math.atan2(moveDy, moveDx);
        this.x += (moveDx / dist) * speed;
        this.y += (moveDy / dist) * speed;
      }

      this.bezierPath.t += this.bezierPath.speed * (speed / this.baseSpeed);
    } else {
      this.x += Math.cos(this.angle) * speed;
      this.y += Math.sin(this.angle) * speed;
    }

    this.x = Math.max(30, Math.min(canvasWidth - 30, this.x));
    this.y = Math.max(30, Math.min(canvasHeight - 30, this.y));

    this.trail.unshift({ x: this.x, y: this.y, opacity: 0.2 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    this.trail.forEach((point, i) => {
      point.opacity = 0.2 * (1 - i / this.maxTrailLength);
    });

    const distToVent = Math.sqrt(Math.pow(this.x - ventX, 2) + Math.pow(this.y - ventY, 2));
    this.isCollecting = distToVent < 50;

    if (this.isCollecting && this.bacteriaCarpet.health < 100) {
      if (Math.random() < 0.3) {
        const angle = this.angle;
        const clawX = this.x + Math.cos(angle) * (this.bodyLength * 0.6);
        const clawY = this.y + Math.sin(angle) * (this.bodyLength * 0.6);
        this.collectingBacteria.push({
          id: uuidv4(),
          x: clawX + (Math.random() - 0.5) * 5,
          y: clawY + (Math.random() - 0.5) * 5,
          opacity: 1,
          life: 30
        });
      }
    }

    this.collectingBacteria = this.collectingBacteria.filter(b => {
      b.life--;
      b.opacity = b.life / 30;

      const targetCarpetX = this.x;
      const targetCarpetY = this.y + 8;
      const dx = targetCarpetX - b.x;
      const dy = targetCarpetY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        b.x += (dx / dist) * 3;
        b.y += (dy / dist) * 3;
      } else if (this.bacteriaCarpet.size < this.bacteriaCarpet.maxSize) {
        this.bacteriaCarpet.size = Math.min(this.bacteriaCarpet.maxSize, this.bacteriaCarpet.size + 0.5);
        this.bacteriaCarpet.health = Math.min(100, this.bacteriaCarpet.health + 0.5);
        return false;
      }

      return b.life > 0;
    });

    const tempOk = env.temperature >= 30 && env.temperature <= 45;
    const phOk = env.ph >= 6.0 && env.ph <= 8.0;

    if (!tempOk || !phOk) {
      this.bacteriaCarpet.health = Math.max(0, this.bacteriaCarpet.health - 0.5);
      const areaRatio = this.bacteriaCarpet.health / 100;
      this.bacteriaCarpet.size = this.bacteriaCarpet.maxSize * areaRatio;
      this.bacteriaCarpet.color = '#bdbdbd';
    } else {
      if (this.bacteriaCarpet.health < 100 && this.bacteriaCarpet.size > 0) {
        this.bacteriaCarpet.health = Math.min(100, this.bacteriaCarpet.health + 0.2);
        const areaRatio = this.bacteriaCarpet.health / 100;
        this.bacteriaCarpet.size = Math.max(this.bacteriaCarpet.size, this.bacteriaCarpet.maxSize * areaRatio * 0.5);
      }

      if (this.bacteriaCarpet.health > 60) {
        const healthRatio = this.bacteriaCarpet.health / 100;
        const r = Math.floor(165 * (1 - healthRatio));
        const g = Math.floor(214 + (230 - 214) * healthRatio);
        const b = Math.floor(167 * (1 - healthRatio) + 118 * healthRatio);
        this.bacteriaCarpet.color = rgbToHex(r, g, b);
      } else if (this.bacteriaCarpet.health > 0) {
        this.bacteriaCarpet.color = '#a5d6a7';
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, symbiosisSuccess: boolean, successTime: number) {
    const glowMultiplier = symbiosisSuccess ? 3 : 1;

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 200, 255, ${point.opacity * 0.15})`;
      ctx.fill();
    }

    if (this.bacteriaCarpet.size > 0) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y + 8, 0,
        this.x, this.y + 8, this.bacteriaCarpet.size
      );
      gradient.addColorStop(0, this.bacteriaCarpet.color + '80');
      gradient.addColorStop(0.7, this.bacteriaCarpet.color + '40');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(this.x, this.y + 8, this.bacteriaCarpet.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (this.bacteriaCarpet.health > 50) {
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 15 * (this.bacteriaCarpet.health / 100) * glowMultiplier;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 8, this.bacteriaCarpet.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 230, 118, ${0.3 * (this.bacteriaCarpet.health / 100)})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    this.collectingBacteria.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 8 * b.opacity;
      ctx.fillStyle = `rgba(0, 230, 118, ${b.opacity})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const segmentLength = this.bodyLength / this.bodySegments;

    for (let i = this.bodySegments - 1; i >= 0; i--) {
      const segX = -i * segmentLength * 0.8;
      const segY = Math.sin(Date.now() / 200 + i * 0.5) * 2;
      const segSize = 4 - i * 0.5;

      ctx.beginPath();
      ctx.ellipse(segX, segY, segmentLength * 0.5, segSize, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${0.4 - i * 0.03})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(180, 220, 240, ${0.3 - i * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(segmentLength * 0.2, 0, segmentLength * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230, 245, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 220, 240, 0.4)';
    ctx.stroke();

    if (this.isCollecting) {
      const clawAngle = Math.sin(Date.now() / 100) * 0.3;

      ctx.save();
      ctx.translate(segmentLength * 0.5, -3);
      ctx.rotate(clawAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, -2);
      ctx.lineTo(10, 0);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(segmentLength * 0.5, 3);
      ctx.rotate(-clawAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, -2);
      ctx.lineTo(10, 0);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
      ctx.fill();
      ctx.restore();
    }

    const tailGlow = 0.6 + Math.sin(Date.now() / 300) * 0.4;

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10 * this.glowIntensity * glowMultiplier * tailGlow;

    ctx.beginPath();
    ctx.arc(-this.bodyLength * 0.4, -2, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 255, ${0.8 * tailGlow})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-this.bodyLength * 0.4, 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 255, ${0.8 * tailGlow})`;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

class HydrothermalVent {
  x: number;
  y: number;
  radius: number;
  pulsePhase: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 50;
    this.pulsePhase = 0;
  }

  update() {
    this.pulsePhase += 0.05;
  }

  getGlowRadius(env: EnvParams): number {
    const tempFactor = (env.temperature - 20) / 60;
    return this.radius * (1.2 + tempFactor * 0.5 + Math.sin(this.pulsePhase) * 0.2);
  }

  getInnerColor(env: EnvParams): string {
    const tempFactor = Math.min(1, (env.temperature - 20) / 60);
    const r = Math.floor(255);
    const g = Math.floor(69 + (140 - 69) * tempFactor);
    const b = Math.floor(0 + tempFactor * 50);
    return `rgb(${r}, ${g}, ${b})`;
  }

  getOuterColor(env: EnvParams): string {
    const tempFactor = Math.min(1, (env.temperature - 20) / 60);
    const r = Math.floor(255);
    const g = Math.floor(140 + (200 - 140) * tempFactor);
    const b = Math.floor(0 + tempFactor * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }

  draw(ctx: CanvasRenderingContext2D, env: EnvParams, symbiosisSuccess: boolean, successTime: number) {
    const glowRadius = this.getGlowRadius(env);
    const innerColor = this.getInnerColor(env);
    const outerColor = this.getOuterColor(env);

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius * 1.5
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(0.4, outerColor);
    gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.3)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const coreGradient = ctx.createRadialGradient(
      this.x - 10, this.y - 10, 0,
      this.x, this.y, this.radius
    );
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.2, innerColor);
    coreGradient.addColorStop(1, outerColor);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 60, 30, 0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.pulsePhase * 0.5;
      const r = this.radius + 5 + Math.sin(this.pulsePhase + i) * 3;
      const cx = this.x + Math.cos(angle) * r;
      const cy = this.y + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 230, 118, ${0.6 + Math.sin(this.pulsePhase * 2 + i) * 0.3})`;
      ctx.fill();
    }

    if (symbiosisSuccess && successTime > 0) {
      const haloAlpha = Math.min(1, successTime / 60) * Math.min(1, (300 - successTime) / 60);
      const haloRadius = 150 + (300 - 150) * (1 - successTime / 300);

      ctx.beginPath();
      ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 230, 118, ${haloAlpha * 0.6})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 30 * haloAlpha;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(this.x, this.y, haloRadius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 150, ${haloAlpha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

export class SpriteManager {
  private shrimps: BlindShrimp[] = [];
  private particles: Particle[] = [];
  private vent: HydrothermalVent;
  private canvasWidth: number;
  private canvasHeight: number;
  private particleTimer: number = 0;
  onSymbiosisSuccess?: () => void;
  private symbiosisSuccess: boolean = false;
  private successTime: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.vent = new HydrothermalVent(canvasWidth / 2, canvasHeight / 2);
    this.initializeShrimps();
  }

  private initializeShrimps() {
    const shrimpCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < shrimpCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 150 + Math.random() * 200;
      const x = this.vent.x + Math.cos(angle) * dist;
      const y = this.vent.y + Math.sin(angle) * dist;
      this.shrimps.push(new BlindShrimp(x, y));
    }
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.vent.x = width / 2;
    this.vent.y = height / 2;
  }

  getShrimpHealths(): number[] {
    return this.shrimps.map(s => s.bacteriaCarpet.health);
  }

  getAverageHealth(): number {
    const healths = this.getShrimpHealths();
    return healths.length > 0 ? healths.reduce((a, b) => a + b, 0) / healths.length : 0;
  }

  getSymbiosisStatus(): { success: boolean; time: number } {
    return { success: this.symbiosisSuccess, time: this.successTime };
  }

  private spawnParticle(env: EnvParams) {
    const angle = Math.random() * Math.PI * 2;
    const startRadius = this.vent.radius * 0.8;
    const x = this.vent.x + Math.cos(angle) * startRadius;
    const y = this.vent.y + Math.sin(angle) * startRadius;

    const speed = 0.5 + Math.random() * 1.5;
    const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5;
    const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5;

    const tempFactor = (env.temperature - 20) / 60;
    const size = 3 + tempFactor * 3 + Math.random() * 3;

    this.particles.push({
      id: uuidv4(),
      x,
      y,
      vx,
      vy,
      size,
      opacity: 0.3 + Math.random() * 0.4,
      life: 0,
      maxLife: 120 + Math.random() * 60
    });
  }

  update(env: EnvParams) {
    this.vent.update();

    const particlesPerFrame = 0.3;
    this.particleTimer += particlesPerFrame;
    while (this.particleTimer >= 1) {
      this.spawnParticle(env);
      this.particleTimer--;
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.life++;
      p.opacity = (1 - p.life / p.maxLife) * (0.3 + Math.random() * 0.4);
      return p.life < p.maxLife;
    });

    this.shrimps.forEach(shrimp => {
      shrimp.update(this.vent.x, this.vent.y, env, this.canvasWidth, this.canvasHeight);
    });

    const healthyCount = this.shrimps.filter(s => s.bacteriaCarpet.health >= 100).length;
    if (healthyCount >= 3 && !this.symbiosisSuccess) {
      this.symbiosisSuccess = true;
      this.successTime = 300;
      this.onSymbiosisSuccess?.();
    }

    if (this.symbiosisSuccess && this.successTime > 0) {
      this.successTime--;
      if (this.successTime <= 0) {
        this.symbiosisSuccess = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, env: EnvParams) {
    this.particles.forEach(p => {
      const lifeRatio = p.life / p.maxLife;

      let r: number, g: number, b: number;
      if (lifeRatio < 0.3) {
        r = 255;
        g = Math.floor(255 * (1 - lifeRatio / 0.3));
        b = Math.floor(200 * (1 - lifeRatio / 0.3));
      } else {
        const grayFactor = (lifeRatio - 0.3) / 0.7;
        r = Math.floor(200 - 100 * grayFactor);
        g = Math.floor(180 - 80 * grayFactor);
        b = Math.floor(180 - 40 * grayFactor);
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - lifeRatio * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
      ctx.fill();
    });

    this.vent.draw(ctx, env, this.symbiosisSuccess, this.successTime);

    this.shrimps.forEach(shrimp => {
      shrimp.draw(ctx, this.symbiosisSuccess, this.successTime);
    });
  }
}
