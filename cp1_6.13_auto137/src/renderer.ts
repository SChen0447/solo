import { gsap } from 'gsap';

export interface AnchorPoint {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export interface OreBlock {
  id: number;
  anchorId: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color1: string;
  color2: string;
  texture: HTMLCanvasElement | null;
  isDragging: boolean;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  warningFlash: number;
  isCorrect: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startSize: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  type: 'stardust' | 'gold' | 'shock' | 'orange';
}

export interface ConstellationLine {
  from: number;
  to: number;
  progress: number;
  isGlowing: boolean;
  glowTime: number;
}

export interface ShockWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface StarCore {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  brightness: number;
  color: string;
  isIgnited: boolean;
  isBurning: boolean;
  pulsePhase: number;
}

export interface RenderState {
  anchors: AnchorPoint[];
  oreBlocks: OreBlock[];
  particles: Particle[];
  constellationLines: ConstellationLine[];
  shockWaves: ShockWave[];
  starCore: StarCore;
  orbitRotation: number;
  orbitA: number;
  orbitB: number;
  hoverAnchorId: number | null;
  scale: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private baseWidth: number = 1400;
  private baseHeight: number = 900;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private stardustParticles: Particle[] = [];
  private particleIdCounter: number = 0;
  private maxParticles: number = 500;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.initStardust();
    this.resize();
  }

  private initStardust() {
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const r = Math.random() * 600 + 200;
      const angle = Math.random() * Math.PI * 2;
      this.stardustParticles.push({
        id: this.particleIdCounter++,
        x: this.baseWidth / 2 + Math.cos(angle) * r,
        y: this.baseHeight / 2 + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        startSize: Math.random() * 2 + 1,
        color: this.lerpColor('#ffffff', '#e6e6fa', t),
        life: 1,
        maxLife: 1,
        alpha: Math.random() * 0.8 + 0.2,
        type: 'stardust'
      });
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;

    const scaleX = rect.width / this.baseWidth;
    const scaleY = rect.height / this.baseHeight;
    this.scale = Math.min(scaleX, scaleY);

    if (rect.width < 800) {
      this.scale *= 0.6;
    }

    this.offsetX = (rect.width * this.dpr - this.baseWidth * this.scale * this.dpr) / 2;
    this.offsetY = (rect.height * this.dpr - this.baseHeight * this.scale * this.dpr) / 2;
  }

  getTransform(): { offsetX: number; offsetY: number; scale: number; dpr: number } {
    return {
      offsetX: this.offsetX / this.dpr,
      offsetY: this.offsetY / this.dpr,
      scale: this.scale,
      dpr: this.dpr
    };
  }

  generateOreTexture(size: number, seed: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size * 0.3, size * 0.3, 0,
      size * 0.5, size * 0.5, size * 0.6
    );
    gradient.addColorStop(0, '#ff8c42');
    gradient.addColorStop(0.5, '#cc5500');
    gradient.addColorStop(1, '#8b4513');

    ctx.fillStyle = gradient;
    this.drawHexagon(ctx, size / 2, size / 2, size * 0.45, seed * 0.1);

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#3d2314';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const startX = size * (0.2 + Math.sin(seed + i) * 0.3);
      const startY = size * (0.2 + Math.cos(seed + i * 1.5) * 0.3);
      ctx.moveTo(startX, startY);
      let x = startX, y = startY;
      for (let j = 0; j < 3; j++) {
        x += size * (0.15 + Math.sin(seed + i + j) * 0.1);
        y += size * (0.1 + Math.cos(seed + i + j * 2) * 0.1);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,200,100,0.2)';
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.35, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    return canvas;
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + rotation;
      const variance = 0.85 + Math.sin(i * 2.5 + rotation) * 0.15;
      const x = cx + Math.cos(angle) * r * variance;
      const y = cy + Math.sin(angle) * r * variance;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  createParticle(x: number, y: number, type: Particle['type'], count: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'orange' ? Math.random() * 3 + 1 : Math.random() * 4 + 2;
      const size = type === 'orange' ? Math.random() * 4 + 4 : Math.random() * 3 + 2;
      const life = type === 'orange' ? 2 : 1.2;

      let color = '#ffd700';
      if (type === 'orange') color = '#ff6b35';
      else if (type === 'shock') color = '#87ceeb';

      particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        startSize: size,
        color,
        life,
        maxLife: life,
        alpha: 1,
        type
      });
    }
    return particles;
  }

  createShockWave(x: number, y: number, color: string = '#87ceeb'): ShockWave {
    return {
      x,
      y,
      radius: 0,
      maxRadius: 100,
      alpha: 0.6,
      color
    };
  }

  render(state: RenderState, deltaTime: number) {
    const ctx = this.ctx;
    const dt = deltaTime / 16.67;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    ctx.translate(this.offsetX / this.dpr, this.offsetY / this.dpr);
    ctx.scale(this.scale, this.scale);

    this.drawBackground(ctx);
    this.updateAndDrawStardust(ctx, dt);
    this.drawOrbit(ctx, state);
    this.drawAnchors(ctx, state);
    this.drawConstellationLines(ctx, state, dt);
    this.drawOreBlocks(ctx, state, dt);
    this.drawShockWaves(ctx, state.shockWaves, dt);
    this.drawParticles(ctx, state.particles, dt);
    this.drawStarCore(ctx, state.starCore, state.particles, dt);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(
      this.baseWidth / 2, this.baseHeight / 2, 0,
      this.baseWidth / 2, this.baseHeight / 2, 700
    );
    gradient.addColorStop(0, 'rgba(30, 30, 60, 0.3)');
    gradient.addColorStop(0.5, 'rgba(15, 15, 35, 0.2)');
    gradient.addColorStop(1, 'rgba(10, 10, 18, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    const nebulaGradient = ctx.createRadialGradient(
      this.baseWidth * 0.3, this.baseHeight * 0.4, 0,
      this.baseWidth * 0.3, this.baseHeight * 0.4, 400
    );
    nebulaGradient.addColorStop(0, 'rgba(100, 50, 150, 0.08)');
    nebulaGradient.addColorStop(1, 'rgba(50, 25, 75, 0)');
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    const nebulaGradient2 = ctx.createRadialGradient(
      this.baseWidth * 0.7, this.baseHeight * 0.6, 0,
      this.baseWidth * 0.7, this.baseHeight * 0.6, 350
    );
    nebulaGradient2.addColorStop(0, 'rgba(50, 100, 150, 0.06)');
    nebulaGradient2.addColorStop(1, 'rgba(25, 50, 75, 0)');
    ctx.fillStyle = nebulaGradient2;
    ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
  }

  private updateAndDrawStardust(ctx: CanvasRenderingContext2D, dt: number) {
    for (const p of this.stardustParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -50) p.x = this.baseWidth + 50;
      if (p.x > this.baseWidth + 50) p.x = -50;
      if (p.y < -50) p.y = this.baseHeight + 50;
      if (p.y > this.baseHeight + 50) p.y = -50;

      ctx.globalAlpha = p.alpha * (0.7 + Math.sin(p.id + Date.now() * 0.002) * 0.3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawOrbit(ctx: CanvasRenderingContext2D, state: RenderState) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((state.orbitRotation * Math.PI) / 180);

    ctx.shadowColor = 'rgba(192, 192, 192, 0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(192, 192, 192, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, state.orbitA, state.orbitB, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(192, 192, 192, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, state.orbitA, state.orbitB, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawAnchors(ctx: CanvasRenderingContext2D, state: RenderState) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    for (const anchor of state.anchors) {
      const isHover = state.hoverAnchorId === anchor.id;
      const size = isHover ? 11 : 8;
      const color = isHover ? '#ffd700' : '#87ceeb';
      const glowSize = isHover ? 20 : 10;

      ctx.shadowColor = color;
      ctx.shadowBlur = glowSize;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + anchor.x, cy + anchor.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(cx + anchor.x - size * 0.3, cy + anchor.y - size * 0.3, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawConstellationLines(ctx: CanvasRenderingContext2D, state: RenderState, dt: number) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    for (const line of state.constellationLines) {
      const fromAnchor = state.anchors.find((a) => a.id === line.from);
      const toAnchor = state.anchors.find((a) => a.id === line.to);
      if (!fromAnchor || !toAnchor) continue;

      const x1 = cx + fromAnchor.x;
      const y1 = cy + fromAnchor.y;
      const x2 = cx + toAnchor.x;
      const y2 = cy + toAnchor.y;

      const currentX = x1 + (x2 - x1) * line.progress;
      const currentY = y1 + (y2 - y1) * line.progress;

      if (line.isGlowing) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      } else {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawOreBlocks(ctx: CanvasRenderingContext2D, state: RenderState, dt: number) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    for (const ore of state.oreBlocks) {
      const x = cx + ore.x;
      const y = cy + ore.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ore.rotation);

      if (ore.warningFlash > 0) {
        ctx.globalAlpha = ore.warningFlash > 0.5 ? 1 : 0.3;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
      } else if (ore.isCorrect) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
      } else if (ore.isDragging) {
        ctx.shadowColor = '#87ceeb';
        ctx.shadowBlur = 25;
      } else {
        ctx.shadowColor = '#ff8c42';
        ctx.shadowBlur = 10;
      }

      if (ore.texture) {
        ctx.drawImage(
          ore.texture,
          -ore.size / 2,
          -ore.size / 2,
          ore.size,
          ore.size
        );
      } else {
        const gradient = ctx.createRadialGradient(
          -ore.size * 0.1, -ore.size * 0.1, 0,
          0, 0, ore.size * 0.5
        );
        gradient.addColorStop(0, '#ff8c42');
        gradient.addColorStop(0.5, '#cc5500');
        gradient.addColorStop(1, '#8b4513');
        ctx.fillStyle = gradient;
        this.drawHexagon(ctx, 0, 0, ore.size * 0.45, ore.rotation);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawShockWaves(ctx: CanvasRenderingContext2D, waves: ShockWave[], dt: number) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    for (const wave of waves) {
      ctx.globalAlpha = wave.alpha;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = wave.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx + wave.x, cy + wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dt: number) {
    const cx = this.baseWidth / 2;
    const cy = this.baseHeight / 2;

    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'gold') {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
      } else if (p.type === 'orange') {
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawStarCore(ctx: CanvasRenderingContext2D, core: StarCore, particles: Particle[], dt: number) {
    const cx = this.baseWidth / 2 + core.x;
    const cy = this.baseHeight / 2 + core.y;

    if (core.brightness <= 0) return;

    const glowRadius = core.radius * (1 + core.brightness * 2);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${core.brightness * 0.8})`);
    gradient.addColorStop(0.2, `rgba(255, 200, 100, ${core.brightness * 0.6})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 50, ${core.brightness * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = core.color;
    ctx.shadowBlur = 30 * core.brightness;
    ctx.fillStyle = core.color;
    ctx.beginPath();
    ctx.arc(cx, cy, core.radius * core.brightness, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
