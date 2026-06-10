function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t))
  ];
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [255, 255, 255];
}

function rgbToStr(rgb: [number, number, number], alpha = 1): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export interface GrowthParams {
  light: number;
  water: number;
  fertility: number;
}

interface PollenParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  life: number;
  maxLife: number;
}

interface TweenState {
  current: number;
  target: number;
  start: number;
  startTime: number;
  duration: number;
  active: boolean;
}

export class FlowerManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private birthTime: number;
  private ageSeconds: number = 0;

  private light: TweenState;
  private water: TweenState;
  private fertility: TweenState;

  private bloomProgress: number = 0;
  private bloomStartTime: number;
  private bloomDuration: number = 8000;

  private leafSwayPhase: number = 0;
  private pollenParticles: PollenParticle[] = [];
  private maxPollen: number = 20;

  private idealPollenTimer: number = 0;

  private basePetalCount: number = 10;
  private effectivePetalCount: number = 10;
  private displayPetalCount: number = 10;
  private petalCountTransitionStart: number = 0;
  private petalCountTransitioning: boolean = false;

  private flowerScale: number = 1;
  private flowerScaleTarget: number = 1;
  private flowerScaleStart: number = 1;
  private flowerScaleStartTime: number = 0;
  private flowerScaleDuration: number = 3000;

  private breathingHaloPhase: number = 0;

  private colorStart: [number, number, number] = hexToRgb('#ff69b4');
  private colorBloom: [number, number, number] = hexToRgb('#ff1493');
  private colorWither: [number, number, number] = hexToRgb('#c0a080');
  private leafGreen: [number, number, number] = hexToRgb('#32CD32');
  private leafBurn: [number, number, number] = hexToRgb('#DAA520');

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.birthTime = performance.now();
    this.bloomStartTime = this.birthTime;

    this.light = { current: 8, target: 8, start: 8, startTime: 0, duration: 3000, active: false };
    this.water = { current: 50, target: 50, start: 50, startTime: 0, duration: 3000, active: false };
    this.fertility = { current: 5, target: 5, start: 5, startTime: 0, duration: 3000, active: false };
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setParams(params: GrowthParams): void {
    const now = performance.now();
    this.startTween(this.light, params.light, now);
    this.startTween(this.water, params.water, now);
    this.startTween(this.fertility, params.fertility, now);
  }

  private startTween(state: TweenState, target: number, now: number): void {
    state.start = state.current;
    state.target = target;
    state.startTime = now;
    state.active = true;
  }

  private updateTween(state: TweenState, now: number): void {
    if (!state.active) return;
    const elapsed = now - state.startTime;
    if (elapsed >= state.duration) {
      state.current = state.target;
      state.active = false;
    } else {
      const t = easeInOutCubic(elapsed / state.duration);
      state.current = lerp(state.start, state.target, t);
    }
  }

  update(now: number): void {
    this.updateTween(this.light, now);
    this.updateTween(this.water, now);
    this.updateTween(this.fertility, now);

    this.ageSeconds = Math.floor((now - this.birthTime) / 1000);

    const bloomElapsed = now - this.bloomStartTime;
    this.bloomProgress = Math.min(1, bloomElapsed / this.bloomDuration);

    this.leafSwayPhase = (now / 1000) * 1.5;
    this.breathingHaloPhase = (now / 1000) * 0.5;

    this.updateEffectivePetalCount(now);
    this.updateFlowerScale(now);
    this.updatePollenParticles(now);
  }

  private updateEffectivePetalCount(now: number): void {
    const lightVal = this.light.current;
    let newCount = this.basePetalCount;
    if (lightVal < 4) {
      newCount = Math.max(4, Math.floor(this.basePetalCount * 0.8));
    }

    if (newCount !== this.effectivePetalCount && !this.petalCountTransitioning) {
      this.effectivePetalCount = newCount;
      this.displayPetalCount = newCount;
    }
    this.displayPetalCount = this.effectivePetalCount;
  }

  private updateFlowerScale(now: number): void {
    const target = this.fertility.current > 8 ? 1.15 : 1.0;
    if (target !== this.flowerScaleTarget) {
      this.flowerScaleStart = this.flowerScale;
      this.flowerScaleTarget = target;
      this.flowerScaleStartTime = now;
    }
    const elapsed = now - this.flowerScaleStartTime;
    const t = Math.min(1, elapsed / this.flowerScaleDuration);
    const eased = easeInOutCubic(t);
    this.flowerScale = lerp(this.flowerScaleStart, this.flowerScaleTarget, eased);
  }

  private updatePollenParticles(now: number): void {
    const isIdeal = this.isIdealEnvironment();

    for (let i = this.pollenParticles.length - 1; i >= 0; i--) {
      const p = this.pollenParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.phase += 0.05;
      p.life = (now - (p as any).birthTime) / p.maxLife;
      if (p.life >= 1) {
        this.pollenParticles.splice(i, 1);
      }
    }

    if (isIdeal) {
      this.idealPollenTimer += 16;
      if (this.idealPollenTimer > 400 && this.pollenParticles.length < this.maxPollen) {
        this.idealPollenTimer = 0;
        this.spawnPollen(now);
      }
    } else {
      this.idealPollenTimer = 0;
    }
  }

  private spawnPollen(now: number): void {
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      if (this.pollenParticles.length >= this.maxPollen) {
        this.pollenParticles.shift();
      }
      const cx = this.canvasWidth / 2;
      const cy = this.canvasHeight * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 80;
      const particle: PollenParticle & { birthTime: number } = {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.3 - Math.random() * 0.5,
        radius: 2 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 1500,
        birthTime: now
      };
      this.pollenParticles.push(particle);
    }
  }

  isIdealEnvironment(): boolean {
    const l = this.light.current;
    const w = this.water.current;
    const f = this.fertility.current;
    return l >= 8 && l <= 12 && w >= 40 && w <= 70 && f >= 4 && f <= 7;
  }

  getHealthScore(): number {
    const lScore = this.scoreLight(this.light.current);
    const wScore = this.scoreWater(this.water.current);
    const fScore = this.scoreFertility(this.fertility.current);
    return Math.round(lScore * 0.4 + wScore * 0.35 + fScore * 0.25);
  }

  private scoreLight(v: number): number {
    if (v >= 8 && v <= 12) return 100;
    if (v < 8) return Math.max(0, 100 - (8 - v) * 12);
    return Math.max(0, 100 - (v - 12) * 10);
  }

  private scoreWater(v: number): number {
    if (v >= 40 && v <= 70) return 100;
    if (v < 40) return Math.max(0, 100 - (40 - v) * 2);
    return Math.max(0, 100 - (v - 70) * 1.5);
  }

  private scoreFertility(v: number): number {
    if (v >= 4 && v <= 7) return 100;
    if (v < 4) return Math.max(0, 100 - (4 - v) * 15);
    return Math.max(0, 100 - (v - 7) * 8);
  }

  getAgeSeconds(): number {
    return this.ageSeconds;
  }

  getHealthPercent(): number {
    return this.getHealthScore();
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const cx = this.canvasWidth / 2;
    const baseY = this.canvasHeight * 0.82;

    this.drawBackground(ctx);
    this.drawStemAndLeaves(ctx, cx, baseY, now);
    this.drawFlower(ctx, cx, baseY, now);
    this.drawPollen(ctx, now);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.5, '#f0e68c');
    grad.addColorStop(1, '#228B22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawStemAndLeaves(ctx: CanvasRenderingContext2D, cx: number, baseY: number, now: number): void {
    const topY = baseY - 220 * this.flowerScale;
    const sway = Math.sin(this.leafSwayPhase) * 6;

    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx + sway * 0.3, baseY - 110, cx + sway, topY);
    ctx.lineWidth = 6 * this.flowerScale;
    ctx.strokeStyle = '#2E8B57';
    ctx.stroke();

    this.drawLeaf(ctx, cx - 15 + sway * 0.5, baseY - 100, -30 + Math.sin(this.leafSwayPhase + 1) * 10, 60, 30, false, now);
    this.drawLeaf(ctx, cx + 15 + sway * 0.7, baseY - 160, 30 + Math.sin(this.leafSwayPhase + 2) * 10, 55, 28, true, now);
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, w: number, h: number, flip: boolean, now: number): void {
    const lightVal = this.light.current;
    let leafColor = this.leafGreen;
    if (lightVal > 12) {
      const t = Math.min(1, (lightVal - 12) / 4);
      leafColor = lerpColor(this.leafGreen, this.leafBurn, t);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w * 0.5, -h, w, 0);
    ctx.quadraticCurveTo(w * 0.5, h * 0.6, 0, 0);
    ctx.fillStyle = rgbToStr(leafColor);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.9, 0);
    ctx.strokeStyle = rgba(46, 139, 87, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawFlower(ctx: CanvasRenderingContext2D, cx: number, baseY: number, now: number): void {
    const flowerY = baseY - 230 * this.flowerScale;
    const sway = Math.sin(this.leafSwayPhase) * 6;
    const fx = cx + sway;

    if (this.fertility.current > 8) {
      this.drawBreathingHalo(ctx, fx, flowerY, now);
    }

    const petalCount = this.displayPetalCount;
    const bloomT = easeInOutCubic(this.bloomProgress);

    const petalColor = this.getPetalColor();
    const waterLow = this.water.current < 20;

    for (let i = 0; i < petalCount; i++) {
      const baseAngle = (i / petalCount) * Math.PI * 2;
      this.drawPetal(ctx, fx, flowerY, baseAngle, bloomT, petalColor, waterLow, now);
    }

    ctx.beginPath();
    ctx.arc(fx, flowerY, 15 * this.flowerScale, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE4B5';
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = 8 * this.flowerScale;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(ang) * r, flowerY + Math.sin(ang) * r, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#DAA520';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBreathingHalo(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
    const breath = 0.7 + Math.sin(this.breathingHaloPhase * Math.PI * 2) * 0.3;
    const radius = 90 * this.flowerScale;

    const grad = ctx.createRadialGradient(x, y, 20 * this.flowerScale, x, y, radius);
    grad.addColorStop(0, `rgba(255, 255, 200, ${0.25 * breath})`);
    grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private getPetalColor(): [number, number, number] {
    const lightVal = this.light.current;
    const lightT = Math.max(0, Math.min(1, (lightVal - 1) / 15));
    const bloomT = easeInOutCubic(this.bloomProgress);

    if (lightT < 0.5) {
      const t = lightT * 2;
      return lerpColor(this.colorStart, this.colorBloom, t * bloomT);
    } else {
      const t = (lightT - 0.5) * 2;
      const bloomColor = lerpColor(this.colorStart, this.colorBloom, bloomT);
      return lerpColor(bloomColor, this.colorWither, t);
    }
  }

  private drawPetal(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    baseAngle: number,
    bloomT: number,
    color: [number, number, number],
    waterLow: boolean,
    now: number
  ): void {
    const maxAngle = Math.PI / 2.5;
    const petalAngle = lerp(0, maxAngle, bloomT);
    const length = 65 * this.flowerScale;
    const width = 28 * this.flowerScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle);
    ctx.rotate(-Math.PI / 2 + petalAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(width * 0.5, length * 0.3, width * 0.8, length * 0.7, 0, length);
    ctx.bezierCurveTo(-width * 0.8, length * 0.7, -width * 0.5, length * 0.3, 0, 0);
    ctx.closePath();
    ctx.fillStyle = rgbToStr(color);
    ctx.fill();

    if (waterLow && bloomT > 0.3) {
      const pulse = 0.6 + Math.sin(now / 500) * 0.4;
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.arc(0, length - 3 * this.flowerScale, 8 * this.flowerScale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139, 69, 19, ${0.6 * pulse})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.6);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  private drawPollen(ctx: CanvasRenderingContext2D, now: number): void {
    for (const p of this.pollenParticles) {
      const flicker = 0.3 + (Math.sin(now / 1000 * Math.PI * 2 * 1.2 + p.phase) + 1) / 2 * 0.5;
      const alpha = flicker * (1 - p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 205, ${alpha})`;
      ctx.fill();
    }
  }

  isFlowerClicked(mx: number, my: number): boolean {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight * 0.82 - 230 * this.flowerScale;
    const r = 90 * this.flowerScale;
    const dx = mx - cx;
    const dy = my - cy;
    return dx * dx + dy * dy <= r * r;
  }
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}
