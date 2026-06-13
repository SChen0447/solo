import gsap from 'gsap';

export type DragMode = 1 | 2 | 3;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  baseColor: string;
  size: number;
  opacity: number;
  life: number;
  type: 'water' | 'flow' | 'burst' | 'star';
  baseX: number;
  baseY: number;
  angle: number;
  radius: number;
  targetX?: number;
  targetY?: number;
  bounceOffset?: number;
  bounceVelocity?: number;
  colorPhase: number;
  swirlAngle?: number;
  swirlRadius?: number;
  swirlCenterX?: number;
  swirlCenterY?: number;
}

export interface FlowParticle extends Particle {
  bornTime: number;
  lifeDuration: number;
  dissipating: boolean;
  burstCreated: boolean;
}

export interface Jellyfish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  diameter: number;
  tentacleLength: number;
  breathPhase: number;
  breathPeriod: number;
  wavePhase: number;
  waveOffset: number;
  opacity: number;
  life: number;
  targetX: number;
  targetY: number;
  id: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
  duration: number;
  color: string;
  endColor: string;
}

export const Utils = {
  easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  },

  rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  },

  lerpColor(color1: string, color2: string, t: number): string {
    const c1 = Utils.hexToRgb(color1);
    const c2 = Utils.hexToRgb(color2);
    return Utils.rgbToHex(
      Utils.lerp(c1.r, c2.r, t),
      Utils.lerp(c1.g, c2.g, t),
      Utils.lerp(c1.b, c2.b, t)
    );
  },

  randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  },

  distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },
};

const COLORS = {
  waterStart: '#0fb5e5',
  waterEnd: '#a855f7',
  flowStart: '#ff6b6b',
  flowEnd: '#fbbf24',
  rippleStart: '#67e8f9',
  rippleEnd: '#f472b6',
  jellyfish: ['#38bdf8', '#a78bfa', '#f472b6'],
};

export class ParticleSystem {
  waterParticles: Particle[] = [];
  flowParticles: FlowParticle[] = [];
  burstParticles: Particle[] = [];
  starParticles: Particle[] = [];
  jellyfish: Jellyfish[] = [];
  ripples: Ripple[] = [];

  centerX: number = 0;
  centerY: number = 0;
  baseRadius: number = 400;
  rotationAngle: number = 0;
  breathPhase: number = 0;
  mode: DragMode = 1;
  modeTransitionProgress: number = 1;
  targetMode: DragMode = 1;

  canvasWidth: number = 0;
  canvasHeight: number = 0;

  private maxFlowParticles: number = 200;
  private maxJellyfish: number = 5;
  private waterParticleCount: number = 3000;
  private starCount: number = 100;
  private jellyfishIdCounter: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.init();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    this.starParticles.forEach((star) => {
      star.x = Utils.randomRange(0, width);
      star.y = Utils.randomRange(0, height);
    });
  }

  init(): void {
    this.initWaterParticles();
    this.initStarParticles();
  }

  private initWaterParticles(): void {
    for (let i = 0; i < this.waterParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.5) * this.baseRadius;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;

      const colorPhase = Math.random();
      const color = Utils.lerpColor(COLORS.waterStart, COLORS.waterEnd, colorPhase);

      this.waterParticles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        color,
        baseColor: color,
        size: Utils.randomRange(2, 5),
        opacity: Utils.randomRange(0.3, 0.6),
        life: 1,
        type: 'water',
        baseX: x - this.centerX,
        baseY: y - this.centerY,
        angle,
        radius,
        colorPhase,
        bounceOffset: 0,
        bounceVelocity: 0,
      });
    }
  }

  private initStarParticles(): void {
    for (let i = 0; i < this.starCount; i++) {
      const colorPhase = Math.random();
      this.starParticles.push({
        x: Utils.randomRange(0, this.canvasWidth),
        y: Utils.randomRange(0, this.canvasHeight),
        vx: 0,
        vy: 0,
        color: '#ffffff',
        baseColor: '#ffffff',
        size: Utils.randomRange(1, 2),
        opacity: Utils.randomRange(0.2, 0.5),
        life: 1,
        type: 'star',
        baseX: 0,
        baseY: 0,
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        colorPhase,
      });
    }
  }

  setMode(newMode: DragMode): void {
    if (newMode === this.mode) return;
    this.targetMode = newMode;
    this.modeTransitionProgress = 0;

    gsap.to(this, {
      modeTransitionProgress: 1,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.mode = this.modeTransitionProgress >= 0.5 ? this.targetMode : this.mode;
      },
      onComplete: () => {
        this.mode = this.targetMode;
      },
    });
  }

  createFlowParticle(x: number, y: number, vx: number, vy: number): void {
    if (this.flowParticles.length >= this.maxFlowParticles) {
      const oldest = this.flowParticles.shift();
      if (oldest && !oldest.burstCreated) {
        this.createBurst(oldest.x, oldest.y, oldest.color);
      }
    }

    const colorT = Math.random();
    const color = Utils.lerpColor(COLORS.flowStart, COLORS.flowEnd, colorT);

    const particle: FlowParticle = {
      x,
      y,
      vx,
      vy,
      color,
      baseColor: color,
      size: Utils.randomRange(5, 10),
      opacity: 0.9,
      life: 1,
      type: 'flow',
      baseX: x,
      baseY: y,
      angle: 0,
      radius: 0,
      colorPhase: colorT,
      bornTime: performance.now(),
      lifeDuration: 3000,
      dissipating: false,
      burstCreated: false,
    };

    this.flowParticles.push(particle);
  }

  createBurst(x: number, y: number, color: string): void {
    const burstCount = 8;
    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const speed = Utils.randomRange(1, 3);
      this.burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        baseColor: color,
        size: Utils.randomRange(2, 4),
        opacity: 0.8,
        life: 1,
        type: 'burst',
        baseX: x,
        baseY: y,
        angle,
        radius: 15,
        colorPhase: 0,
      });
    }
  }

  createRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 300,
      opacity: 0.8,
      startTime: performance.now(),
      duration: 1200,
      color: COLORS.rippleStart,
      endColor: COLORS.rippleEnd,
    });
  }

  createJellyfish(count: number): void {
    const availableSlots = this.maxJellyfish - this.jellyfish.length;
    const actualCount = Math.min(count, availableSlots);

    for (let i = 0; i < actualCount; i++) {
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnDist = Utils.randomRange(200, 400);
      const color = COLORS.jellyfish[Math.floor(Math.random() * COLORS.jellyfish.length)];

      const jelly: Jellyfish = {
        x: this.centerX + Math.cos(spawnAngle) * spawnDist,
        y: this.centerY + Math.sin(spawnAngle) * spawnDist,
        vx: 0,
        vy: 0,
        color,
        diameter: Utils.randomRange(40, 80),
        tentacleLength: Utils.randomRange(30, 60),
        breathPhase: 0,
        breathPeriod: Utils.randomRange(1.5, 3) * 1000,
        wavePhase: Math.random() * Math.PI * 2,
        waveOffset: Math.random() * Math.PI * 2,
        opacity: 0,
        life: 0,
        targetX: this.centerX,
        targetY: this.centerY,
        id: this.jellyfishIdCounter++,
      };

      this.jellyfish.push(jelly);

      gsap.to(jelly, {
        opacity: 0.7,
        life: 1,
        duration: 1,
        ease: 'power2.out',
      });
    }
  }

  absorbJellyfish(jelly: Jellyfish): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.createFlowParticle(jelly.x, jelly.y, Math.cos(angle) * 2, Math.sin(angle) * 2);
    }

    gsap.to(jelly, {
      opacity: 0,
      life: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        const idx = this.jellyfish.indexOf(jelly);
        if (idx > -1) {
          this.jellyfish.splice(idx, 1);
        }
      },
    });
  }

  isVisible(particle: Particle): boolean {
    const margin = 50;
    return (
      particle.x >= -margin &&
      particle.x <= this.canvasWidth + margin &&
      particle.y >= -margin &&
      particle.y <= this.canvasHeight + margin
    );
  }

  update(
    deltaTime: number,
    mouseX: number,
    mouseY: number,
    isDragging: boolean,
    dragPoints: { x: number; y: number }[]
  ): void {
    const dt = deltaTime / 16.67;

    this.rotationAngle += (deltaTime / 15000) * Math.PI * 2;
    this.breathPhase += (deltaTime / 4000) * Math.PI * 2;
    const breathScale = 1 + Math.sin(this.breathPhase) * 0.1;

    this.updateWaterParticles(dt, breathScale, deltaTime, mouseX, mouseY, isDragging, dragPoints);
    this.updateFlowParticles(dt);
    this.updateBurstParticles(dt);
    this.updateStarParticles(deltaTime);
    this.updateJellyfish(dt, deltaTime, mouseX, mouseY);
    this.updateRipples(deltaTime);
  }

  private updateWaterParticles(
    dt: number,
    breathScale: number,
    deltaTime: number,
    _mouseX: number,
    _mouseY: number,
    isDragging: boolean,
    dragPoints: { x: number; y: number }[]
  ): void {
    const transitionT = this.modeTransitionProgress;

    for (const p of this.waterParticles) {
      if (!this.isVisible(p)) {
        continue;
      }

      const rotatedAngle = p.angle + this.rotationAngle;
      const targetX = this.centerX + Math.cos(rotatedAngle) * p.radius * breathScale;
      const targetY = this.centerY + Math.sin(rotatedAngle) * p.radius * breathScale;

      let attractX = targetX;
      let attractY = targetY;
      let attractStrength = 0.05;

      if (isDragging && dragPoints.length > 0) {
        const latestDrag = dragPoints[dragPoints.length - 1];

        if (this.mode === 1) {
          const dist = Utils.distance(p.x, p.y, latestDrag.x, latestDrag.y);
          if (dist < 200) {
            const influence = Utils.clamp(1 - dist / 200, 0, 1);
            attractX = Utils.lerp(targetX, latestDrag.x, influence * 0.8);
            attractY = Utils.lerp(targetY, latestDrag.y, influence * 0.8);
            attractStrength = 0.15;
          }
        } else if (this.mode === 2) {
          for (const dp of dragPoints) {
            const dist = Utils.distance(p.x, p.y, dp.x, dp.y);
            if (dist < 30) {
              const angle = Math.atan2(p.y - dp.y, p.x - dp.x);
              p.vx += Math.cos(angle) * 1.5 * dt;
              p.vy += Math.sin(angle) * 1.5 * dt;
            }
          }
        } else if (this.mode === 3) {
          const dist = Utils.distance(p.x, p.y, latestDrag.x, latestDrag.y);
          if (dist < 100) {
            if (p.swirlCenterX === undefined) {
              p.swirlCenterX = latestDrag.x;
              p.swirlCenterY = latestDrag.y;
              p.swirlAngle = Math.atan2(p.y - latestDrag.y, p.x - latestDrag.x);
              p.swirlRadius = dist;
            }

            p.swirlAngle! += 0.8 * dt * 0.1;
            const targetSwirlX = latestDrag.x + Math.cos(p.swirlAngle!) * 30;
            const targetSwirlY = latestDrag.y + Math.sin(p.swirlAngle!) * 30;
            attractX = targetSwirlX;
            attractY = targetSwirlY;
            attractStrength = 0.2;
          } else {
            p.swirlCenterX = undefined;
            p.swirlCenterY = undefined;
          }
        }
      } else {
        p.swirlCenterX = undefined;
        p.swirlCenterY = undefined;
      }

      if (transitionT < 1) {
        const baseAttractX = targetX;
        const baseAttractY = targetY;
        attractX = Utils.lerp(attractX, baseAttractX, 1 - transitionT);
        attractY = Utils.lerp(attractY, baseAttractY, 1 - transitionT);
      }

      p.vx += (attractX - p.x) * attractStrength * dt;
      p.vy += (attractY - p.y) * attractStrength * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.bounceOffset && p.bounceVelocity) {
        p.bounceOffset += p.bounceVelocity * dt;
        p.bounceVelocity -= 0.3 * dt;
        if (p.bounceOffset <= 0) {
          p.bounceOffset = 0;
          p.bounceVelocity = 0;
        }
      }

      const newColorPhase = (p.colorPhase + deltaTime * 0.0001) % 1;
      p.colorPhase = newColorPhase;
      p.color = Utils.lerpColor(COLORS.waterStart, COLORS.waterEnd, newColorPhase);

      if (isDragging && this.mode === 1 && dragPoints.length > 0) {
        const latestDrag = dragPoints[dragPoints.length - 1];
        const dist = Utils.distance(p.x, p.y, latestDrag.x, latestDrag.y);
        if (dist < 50) {
          const flowColorT = (performance.now() / 1000) % 1;
          p.color = Utils.lerpColor(COLORS.flowStart, COLORS.flowEnd, flowColorT);
        }
      }
    }
  }

  private updateFlowParticles(dt: number): void {
    const now = performance.now();

    for (let i = this.flowParticles.length - 1; i >= 0; i--) {
      const p = this.flowParticles[i];
      const age = now - p.bornTime;
      const lifeProgress = age / p.lifeDuration;

      if (lifeProgress >= 0.7 && !p.dissipating) {
        p.dissipating = true;
      }

      if (lifeProgress >= 1) {
        if (!p.burstCreated) {
          this.createBurst(p.x, p.y, p.color);
          p.burstCreated = true;
        }
        this.flowParticles.splice(i, 1);
        continue;
      }

      if (p.dissipating) {
        p.opacity = Utils.lerp(0.9, 0, (lifeProgress - 0.7) / 0.3);
        p.size *= 0.99;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const returnStrength = 0.01;
      p.vx += (this.centerX - p.x) * returnStrength * dt;
      p.vy += (this.centerY - p.y) * returnStrength * dt;
    }
  }

  private updateBurstParticles(dt: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.03 * dt;
      p.opacity = p.life;

      if (p.life <= 0) {
        this.burstParticles.splice(i, 1);
      }
    }
  }

  private updateStarParticles(deltaTime: number): void {
    for (const star of this.starParticles) {
      star.colorPhase += deltaTime / Utils.randomRange(2000, 5000);
      const pulse = Math.sin(star.colorPhase * Math.PI * 2);
      star.opacity = Utils.lerp(0.2, 0.5, (pulse + 1) / 2);
    }
  }

  private updateJellyfish(dt: number, deltaTime: number, mouseX: number, mouseY: number): void {
    for (let i = this.jellyfish.length - 1; i >= 0; i--) {
      const jelly = this.jellyfish[i];

      jelly.breathPhase += (deltaTime / jelly.breathPeriod) * Math.PI * 2;
      jelly.wavePhase += deltaTime * 0.003;

      const dist = Utils.distance(jelly.x, jelly.y, mouseX, mouseY);

      if (dist < 5) {
        this.absorbJellyfish(jelly);
        continue;
      }

      const targetSpeed = 0.3;
      const angle = Math.atan2(mouseY - jelly.y, mouseX - jelly.x);
      const waveOffset = Math.sin(jelly.wavePhase + jelly.waveOffset) * 0.3;
      const moveAngle = angle + waveOffset;

      const easeT = Utils.easeInOutQuad(Utils.clamp(jelly.life, 0, 1));
      jelly.vx = Math.cos(moveAngle) * targetSpeed * easeT;
      jelly.vy = Math.sin(moveAngle) * targetSpeed * easeT;
      jelly.x += jelly.vx * dt;
      jelly.y += jelly.vy * dt;

      jelly.targetX = mouseX;
      jelly.targetY = mouseY;
    }
  }

  private updateRipples(deltaTime: number): void {
    const now = performance.now();

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      ripple.radius = Utils.lerp(0, ripple.maxRadius, progress);
      ripple.opacity = Utils.lerp(0.8, 0, progress);
      ripple.color = Utils.lerpColor(ripple.color, ripple.endColor, deltaTime / ripple.duration);

      for (const p of this.waterParticles) {
        const dist = Utils.distance(p.x, p.y, ripple.x, ripple.y);
        const ringWidth = 20;
        if (Math.abs(dist - ripple.radius) < ringWidth && p.bounceOffset === 0) {
          p.bounceOffset = 0.1;
          p.bounceVelocity = 2;
          const flowColorT = (performance.now() / 1000) % 1;
          p.color = Utils.lerpColor(COLORS.flowStart, COLORS.flowEnd, flowColorT);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawStars(ctx);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    this.drawWaterParticles(ctx);
    this.drawFlowParticles(ctx);
    this.drawBurstParticles(ctx);
    this.drawRipples(ctx);
    this.drawJellyfish(ctx);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0b0f19');
    gradient.addColorStop(1, '#15233b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.starParticles) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    }
  }

  private drawWaterParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.waterParticles) {
      if (!this.isVisible(p)) continue;

      const drawY = p.y - (p.bounceOffset || 0) * 5;
      const rgb = Utils.hexToRgb(p.color);

      ctx.beginPath();
      ctx.arc(p.x, drawY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`;
      ctx.fill();
    }
  }

  private drawFlowParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.flowParticles) {
      const rgb = Utils.hexToRgb(p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`;
      ctx.fill();
    }
  }

  private drawBurstParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.burstParticles) {
      const rgb = Utils.hexToRgb(p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`;
      ctx.fill();
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      const rgb = Utils.hexToRgb(ripple.color);

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.opacity})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.opacity * 0.3})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }

  private drawJellyfish(ctx: CanvasRenderingContext2D): void {
    for (const jelly of this.jellyfish) {
      const breathScale = 1 + Math.sin(jelly.breathPhase) * 0.15;
      const actualDiameter = jelly.diameter * breathScale;
      const rgb = Utils.hexToRgb(jelly.color);

      ctx.save();
      ctx.translate(jelly.x, jelly.y);

      const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, actualDiameter / 2);
      bodyGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${jelly.opacity * 0.6})`);
      bodyGradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${jelly.opacity * 0.3})`);
      bodyGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      ctx.beginPath();
      ctx.ellipse(0, 0, actualDiameter / 2, actualDiameter / 3, 0, Math.PI, 0);
      ctx.fillStyle = bodyGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, actualDiameter / 2, actualDiameter / 3, 0, Math.PI, 0);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${jelly.opacity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      const tentacleCount = 6;
      for (let t = 0; t < tentacleCount; t++) {
        const startX = ((t - (tentacleCount - 1) / 2) / ((tentacleCount - 1) / 2)) * (actualDiameter / 2) * 0.8;
        const startY = actualDiameter / 6;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        const segments = 5;
        for (let s = 1; s <= segments; s++) {
          const progress = s / segments;
          const yOffset = progress * jelly.tentacleLength * breathScale;
          const waveX = Math.sin(jelly.wavePhase * 2 + t + progress * Math.PI * 2) * 8 * progress;
          ctx.lineTo(startX + waveX, startY + yOffset);
        }

        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${jelly.opacity * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
