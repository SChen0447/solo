export type BrushMode = 'standard' | 'spiral' | 'spike' | 'sparkle';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface Point {
  x: number;
  y: number;
  time: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  thickness: number;
  opacity: number;
  hueOffset: number;
}

export interface Sparkle {
  x: number;
  y: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
  twinkleSpeed: number;
}

export interface LightTrail {
  id: number;
  points: TrailPoint[];
  brush: BrushMode;
  baseHue: number;
  createdAt: number;
  state: 'active' | 'fading' | 'shrinking';
  stateProgress: number;
  shrinkCenterX: number;
  shrinkCenterY: number;
  sparkles: Sparkle[];
  spiralAngle: number;
}

export interface BrushConfig {
  mode: BrushMode;
  baseHue: number;
  thickness: number;
}

const MAX_TRAILS = 100;
const SHRINK_DURATION = 300;
const FADE_DURATION = 600;

export class BrushManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trails: LightTrail[] = [];
  private currentTrail: LightTrail | null = null;
  private nextId = 1;
  private animationFrameId: number = 0;
  private lastTime = 0;
  private isDrawing = false;
  private lastPoint: Point | null = null;
  private accumulatedDistance = 0;
  private config: BrushConfig;
  private onTrailCountChange?: (count: number) => void;

  constructor(canvas: HTMLCanvasElement, config: BrushConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.config = { ...config };
    this.resize();
    this.startAnimationLoop();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.clear();
  }

  setBrushMode(mode: BrushMode): void {
    this.config.mode = mode;
  }

  setBaseHue(hue: number): void {
    this.config.baseHue = hue;
  }

  getConfig(): BrushConfig {
    return { ...this.config };
  }

  getTrailCount(): number {
    return this.trails.length;
  }

  setOnTrailCountChange(callback: (count: number) => void): void {
    this.onTrailCountChange = callback;
  }

  startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.lastPoint = { x, y, time: performance.now() };
    this.accumulatedDistance = 0;
    this.currentTrail = this.createTrail(x, y);
  }

  continueDrawing(x: number, y: number): void {
    if (!this.isDrawing || !this.currentTrail || !this.lastPoint) return;

    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.accumulatedDistance += dist;

    if (dist < 1) return;

    const stepSize = 2;
    const steps = Math.max(1, Math.floor(dist / stepSize));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = this.lastPoint.x + dx * t;
      const py = this.lastPoint.y + dy * t;
      this.addPointToTrail(this.currentTrail, px, py);
    }

    this.lastPoint = { x, y, time: performance.now() };
  }

  endDrawing(): void {
    this.isDrawing = false;
    this.lastPoint = null;
    if (this.currentTrail && this.currentTrail.points.length > 0) {
      this.trails.push(this.currentTrail);
      this.enforceTrailLimit();
      this.notifyTrailCountChange();
    }
    this.currentTrail = null;
  }

  undo(): void {
    if (this.trails.length === 0) return;
    const trail = this.trails[this.trails.length - 1];
    if (trail.state !== 'active') return;

    const lastIdx = trail.points.length - 1;
    trail.shrinkCenterX = trail.points[lastIdx].x;
    trail.shrinkCenterY = trail.points[lastIdx].y;
    trail.state = 'shrinking';
    trail.stateProgress = 0;

    setTimeout(() => {
      const idx = this.trails.indexOf(trail);
      if (idx !== -1) {
        this.trails.splice(idx, 1);
        this.notifyTrailCountChange();
      }
    }, SHRINK_DURATION);
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  private createTrail(x: number, y: number): LightTrail {
    return {
      id: this.nextId++,
      points: [],
      brush: this.config.mode,
      baseHue: this.config.baseHue,
      createdAt: performance.now(),
      state: 'active',
      stateProgress: 0,
      shrinkCenterX: x,
      shrinkCenterY: y,
      sparkles: [],
      spiralAngle: Math.random() * Math.PI * 2
    };
  }

  private addPointToTrail(trail: LightTrail, x: number, y: number): void {
    const baseThickness = this.config.thickness;
    const pulse = 0.85 + Math.sin(performance.now() / 120) * 0.15;

    switch (trail.brush) {
      case 'standard':
        this.addStandardPoint(trail, x, y, baseThickness * pulse);
        break;
      case 'spiral':
        this.addSpiralPoint(trail, x, y, baseThickness * pulse);
        break;
      case 'spike':
        this.addSpikePoint(trail, x, y, baseThickness * pulse);
        break;
      case 'sparkle':
        this.addSparklePoint(trail, x, y, baseThickness * pulse);
        break;
    }
  }

  private addStandardPoint(trail: LightTrail, x: number, y: number, thickness: number): void {
    const hueOffset = (trail.points.length * 0.8) % 60;
    trail.points.push({
      x, y,
      thickness,
      opacity: 1,
      hueOffset
    });
  }

  private addSpiralPoint(trail: LightTrail, x: number, y: number, thickness: number): void {
    trail.spiralAngle += 0.35;
    const radius = 6 + Math.sin(trail.points.length * 0.05) * 3;
    const offsetX = Math.cos(trail.spiralAngle) * radius;
    const offsetY = Math.sin(trail.spiralAngle) * radius;
    const hueOffset = (trail.points.length * 1.2) % 60;

    trail.points.push({
      x: x + offsetX,
      y: y + offsetY,
      thickness: thickness * 0.9,
      opacity: 1,
      hueOffset
    });

    trail.points.push({
      x: x - offsetX * 0.5,
      y: y - offsetY * 0.5,
      thickness: thickness * 0.5,
      opacity: 0.6,
      hueOffset: hueOffset + 30
    });
  }

  private addSpikePoint(trail: LightTrail, x: number, y: number, thickness: number): void {
    const hueOffset = (trail.points.length * 0.5) % 60;
    trail.points.push({
      x, y,
      thickness,
      opacity: 1,
      hueOffset
    });

    const spikeCount = 3;
    for (let i = 0; i < spikeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 8 + Math.random() * 14;
      const spikeX = x + Math.cos(angle) * len;
      const spikeY = y + Math.sin(angle) * len;
      trail.points.push({
        x: spikeX,
        y: spikeY,
        thickness: thickness * 0.25,
        opacity: 0.45,
        hueOffset: hueOffset + 15
      });
    }
  }

  private addSparklePoint(trail: LightTrail, x: number, y: number, thickness: number): void {
    const hueOffset = (trail.points.length * 0.6) % 60;
    trail.points.push({
      x, y,
      thickness: thickness * 0.7,
      opacity: 0.9,
      hueOffset
    });

    if (Math.random() < 0.55) {
      const sparkleCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 18;
        trail.sparkles.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          size: 1 + Math.random() * 3.5,
          hue: trail.baseHue + (Math.random() - 0.5) * 80,
          life: 0,
          maxLife: 700 + Math.random() * 1300,
          twinkleSpeed: 3 + Math.random() * 6
        });
      }
    }
  }

  private enforceTrailLimit(): void {
    while (this.trails.length > MAX_TRAILS) {
      const trail = this.trails[0];
      if (trail.state === 'active') {
        trail.state = 'fading';
        trail.stateProgress = 0;
        setTimeout(() => {
          const idx = this.trails.indexOf(trail);
          if (idx !== -1) {
            this.trails.splice(idx, 1);
            this.notifyTrailCountChange();
          }
        }, FADE_DURATION);
      } else {
        this.trails.shift();
        this.notifyTrailCountChange();
      }
    }
  }

  private notifyTrailCountChange(): void {
    if (this.onTrailCountChange) {
      this.onTrailCountChange(this.trails.length);
    }
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = time - this.lastTime;
      this.lastTime = time;
      this.render(deltaTime);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(deltaTime: number): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    this.ctx.globalCompositeOperation = 'lighter';

    for (const trail of this.trails) {
      this.updateAndRenderTrail(trail, deltaTime);
    }

    if (this.currentTrail) {
      this.updateAndRenderTrail(this.currentTrail, deltaTime);
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  private updateAndRenderTrail(trail: LightTrail, deltaTime: number): void {
    let scale = 1;
    let opacityMult = 1;

    if (trail.state === 'shrinking') {
      trail.stateProgress += deltaTime;
      const t = Math.min(1, trail.stateProgress / SHRINK_DURATION);
      scale = 1 - t;
      opacityMult = 1 - t;
    } else if (trail.state === 'fading') {
      trail.stateProgress += deltaTime;
      const t = Math.min(1, trail.stateProgress / FADE_DURATION);
      opacityMult = 1 - t * t;
    }

    for (let i = trail.sparkles.length - 1; i >= 0; i--) {
      const s = trail.sparkles[i];
      s.life += deltaTime;
      if (s.life >= s.maxLife) {
        trail.sparkles.splice(i, 1);
        continue;
      }
      this.renderSparkle(s, opacityMult);
    }

    if (trail.points.length < 2) {
      if (trail.points.length === 1) {
        const p = trail.points[0];
        let px = p.x, py = p.y;
        if (trail.state === 'shrinking') {
          const t = Math.min(1, trail.stateProgress / SHRINK_DURATION);
          px = trail.shrinkCenterX + (p.x - trail.shrinkCenterX) * scale;
          py = trail.shrinkCenterY + (p.y - trail.shrinkCenterY) * scale;
        }
        this.renderGlowDot(px, py, p.thickness * scale, trail.baseHue + p.hueOffset, p.opacity * opacityMult);
      }
      return;
    }

    for (let i = 1; i < trail.points.length; i++) {
      const p1 = trail.points[i - 1];
      const p2 = trail.points[i];

      let x1 = p1.x, y1 = p1.y;
      let x2 = p2.x, y2 = p2.y;

      if (trail.state === 'shrinking') {
        const t = Math.min(1, trail.stateProgress / SHRINK_DURATION);
        const s = 1 - t;
        x1 = trail.shrinkCenterX + (p1.x - trail.shrinkCenterX) * s;
        y1 = trail.shrinkCenterY + (p1.y - trail.shrinkCenterY) * s;
        x2 = trail.shrinkCenterX + (p2.x - trail.shrinkCenterX) * s;
        y2 = trail.shrinkCenterY + (p2.y - trail.shrinkCenterY) * s;
      }

      const avgHue = trail.baseHue + (p1.hueOffset + p2.hueOffset) / 2;
      const avgOpacity = (p1.opacity + p2.opacity) / 2 * opacityMult;
      const avgThickness = (p1.thickness + p2.thickness) / 2 * scale;

      this.renderGlowSegment(x1, y1, x2, y2, avgThickness, avgHue, avgOpacity);
    }
  }

  private renderGlowSegment(
    x1: number, y1: number, x2: number, y2: number,
    thickness: number, hue: number, opacity: number
  ): void {
    if (opacity <= 0 || thickness <= 0) return;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) {
      this.renderGlowDot(x2, y2, thickness, hue, opacity);
      return;
    }

    const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, this.hslToRgba(hue - 10, 85, 60, opacity * 0.9));
    grad.addColorStop(0.5, this.hslToRgba(hue + 20, 95, 65, opacity));
    grad.addColorStop(1, this.hslToRgba(hue + 50, 85, 60, opacity * 0.9));

    for (let layer = 3; layer >= 0; layer--) {
      const layerThickness = thickness * (1 + layer * 0.9);
      const layerAlpha = opacity * (0.12 + (3 - layer) * 0.08);
      const layerGrad = this.ctx.createLinearGradient(x1, y1, x2, y2);
      layerGrad.addColorStop(0, this.hslToRgba(hue - 10, 85, 60, layerAlpha));
      layerGrad.addColorStop(0.5, this.hslToRgba(hue + 20, 95, 65, layerAlpha * 1.2));
      layerGrad.addColorStop(1, this.hslToRgba(hue + 50, 85, 60, layerAlpha));

      this.ctx.strokeStyle = layerGrad;
      this.ctx.lineWidth = layerThickness;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = thickness * 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  private renderGlowDot(x: number, y: number, radius: number, hue: number, opacity: number): void {
    if (opacity <= 0 || radius <= 0) return;

    for (let layer = 3; layer >= 0; layer--) {
      const r = radius * (1 + layer * 1.1);
      const alpha = opacity * (0.08 + (3 - layer) * 0.06);
      const grad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, this.hslToRgba(hue + 20, 95, 70, alpha * 1.5));
      grad.addColorStop(0.4, this.hslToRgba(hue, 90, 60, alpha));
      grad.addColorStop(1, this.hslToRgba(hue - 20, 80, 50, 0));

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderSparkle(s: Sparkle, opacityMult: number): void {
    const lifeT = s.life / s.maxLife;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(s.life / 1000 * s.twinkleSpeed));
    const fade = lifeT < 0.2 ? lifeT / 0.2 : lifeT > 0.75 ? (1 - lifeT) / 0.25 : 1;
    const opacity = twinkle * fade * opacityMult;

    if (opacity <= 0) return;

    const hue = s.hue;
    for (let layer = 2; layer >= 0; layer--) {
      const r = s.size * (1 + layer * 1.4);
      const a = opacity * (0.15 + (2 - layer) * 0.2);
      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, this.hslToRgba(hue + 30, 100, 80, a * 1.8));
      grad.addColorStop(0.5, this.hslToRgba(hue, 95, 65, a));
      grad.addColorStop(1, this.hslToRgba(hue - 20, 80, 50, 0));

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = this.hslToRgba(hue + 40, 100, 90, opacity);
    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, s.size * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private hslToRgba(h: number, s: number, l: number, a: number): string {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    return `rgba(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}, ${Math.max(0, Math.min(1, a))})`;
  }
}

export function hueToGradient(hue: number): string {
  const h1 = hue;
  const h2 = (hue + 60) % 360;
  return `linear-gradient(90deg, hsl(${h1}, 90%, 62%), hsl(${h2}, 90%, 65%))`;
}
