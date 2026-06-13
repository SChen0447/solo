export interface RendererState {
  pointerAngle: number;
  pointerAngularVelocity: number;
  isDragging: boolean;
  isHovering: boolean;
  coreRotation: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface FloatingSymbol {
  x: number;
  y: number;
  char: string;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  floatOffset: number;
  quadrant: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX: number = 0;
  private centerY: number = 0;
  private dialRadius: number = 0;
  private dpr: number = 1;
  private particles: Particle[] = [];
  private maxParticles: number = 300;
  private symbols: FloatingSymbol[] = [];
  private symbolSpawnTimer: number = 0;
  private readonly symbolChars = ['★', '☽', '✦', '❀', '✧', '❋', '✺', '❈'];
  private state: RendererState = {
    pointerAngle: -Math.PI / 2,
    pointerAngularVelocity: 0,
    isDragging: false,
    isHovering: false,
    coreRotation: 0
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 2D 渲染上下文');
    this.ctx = ctx;
    this.resize();
    this.initSymbols();
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.dialRadius = Math.min(h * 0.25, w * 0.22);
    this.maxParticles = 300;
  }

  public setState(partial: Partial<RendererState>): void {
    Object.assign(this.state, partial);
  }

  public getState(): RendererState {
    return { ...this.state };
  }

  public getPointerTip(): { x: number; y: number } {
    const len = this.dialRadius * 0.85;
    return {
      x: this.centerX + Math.cos(this.state.pointerAngle) * len,
      y: this.centerY + Math.sin(this.state.pointerAngle) * len
    };
  }

  public getDialRadius(): number {
    return this.dialRadius;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  private initSymbols(): void {
    for (let i = 0; i < 16; i++) {
      this.symbols.push(this.createSymbol());
    }
  }

  private createSymbol(): FloatingSymbol {
    const quadrant = Math.floor(Math.random() * 4);
    const r = this.dialRadius + 40 + Math.random() * 60;
    let baseAngle: number;
    switch (quadrant) {
      case 0: baseAngle = -Math.PI / 2 + Math.random() * Math.PI / 2; break;
      case 1: baseAngle = Math.random() * Math.PI / 2; break;
      case 2: baseAngle = Math.PI / 2 + Math.random() * Math.PI / 2; break;
      default: baseAngle = Math.PI + Math.random() * Math.PI / 2; break;
    }
    return {
      x: this.centerX + Math.cos(baseAngle) * r,
      y: this.centerY + Math.sin(baseAngle) * r,
      char: this.symbolChars[Math.floor(Math.random() * this.symbolChars.length)],
      size: 10 + Math.random() * 8,
      baseAlpha: 0.2 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      floatOffset: 4 + Math.random() * 6,
      quadrant
    };
  }

  private getArcColor(progress: number): string {
    const stops = [
      { t: 0.00, r: 0xff, g: 0x6b, b: 0x6b },
      { t: 0.33, r: 0xfe, g: 0xca, b: 0x57 },
      { t: 0.66, r: 0xff, g: 0xa5, b: 0x02 },
      { t: 1.00, r: 0x48, g: 0xdb, b: 0xfb }
    ];
    progress = Math.max(0, Math.min(1, progress));
    let i = 0;
    while (i < stops.length - 1 && progress > stops[i + 1].t) i++;
    const s0 = stops[i];
    const s1 = stops[Math.min(i + 1, stops.length - 1)];
    const span = s1.t - s0.t || 1;
    const t = (progress - s0.t) / span;
    const r = Math.round(s0.r + (s1.r - s0.r) * t);
    const g = Math.round(s0.g + (s1.g - s0.g) * t);
    const b = Math.round(s0.b + (s1.b - s0.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  public spawnParticles(angularVelocity: number): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const tip = this.getPointerTip();
    const speedFactor = Math.min(Math.abs(angularVelocity) * 3, 4) + 1;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      const angle = this.state.pointerAngle + (Math.random() - 0.5) * 0.3;
      const speed = (1.5 + Math.random() * 2) * speedFactor;
      const progress = ((this.state.pointerAngle + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2);
      this.particles.push({
        x: tip.x + (Math.random() - 0.5) * 4,
        y: tip.y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 3,
        color: this.getArcColor(progress),
        alpha: 0.5 + Math.random() * 0.4
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;
    }
  }

  private updateSymbols(dt: number, angularVelocity: number): void {
    const absV = Math.abs(angularVelocity);
    const highSpeed = absV > (60 * Math.PI / 180);
    const brightBoost = highSpeed ? 1.2 : 1.0;

    for (const s of this.symbols) {
      s.phase += dt * s.speed * Math.PI;
    }

    this.symbolSpawnTimer += dt;
    const spawnInterval = highSpeed ? 0.4 : 0.8;
    if (this.symbolSpawnTimer >= spawnInterval) {
      this.symbolSpawnTimer = 0;
      if (this.symbols.length < (highSpeed ? 32 : 16)) {
        this.symbols.push(this.createSymbol());
      }
    }
    if (this.symbols.length > 16 && !highSpeed) {
      const removeCount = Math.min(2, this.symbols.length - 16);
      this.symbols.splice(0, removeCount);
    }
    (this as unknown as { _brightBoost: number })._brightBoost = brightBoost;
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0b16');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f0c29');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawDial(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.dialRadius;

    const rings = [
      { radius: r, color: '#667eea', alpha: 0.3, width: 3 },
      { radius: r * 0.85, color: '#764ba2', alpha: 0.45, width: 2 },
      { radius: r * 0.68, color: '#f093fb', alpha: 0.4, width: 2 },
      { radius: r * 0.5, color: '#764ba2', alpha: 0.35, width: 1.5 },
      { radius: r * 0.32, color: '#667eea', alpha: 0.3, width: 1.5 },
      { radius: r * 0.18, color: '#f093fb', alpha: 0.35, width: 1 }
    ];

    for (const ring of rings) {
      ctx.save();
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = ring.alpha;
      ctx.lineWidth = ring.width;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#a29bfe';
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const inner = r * 0.78;
      const outer = r * 0.78 + 15;
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    if (this.state.isDragging) {
      ctx.save();
      const haloAlpha = 0.3 + Math.sin(performance.now() / 300) * 0.1;
      ctx.strokeStyle = '#c4b5fd';
      ctx.globalAlpha = haloAlpha;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPointer(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const len = this.dialRadius * 0.85;
    const angle = this.state.pointerAngle;
    const tipX = cx + Math.cos(angle) * len;
    const tipY = cy + Math.sin(angle) * len;
    const dotSize = (this.state.isHovering ? 10 : 7) * (this.state.isHovering ? 1.5 : 1);
    const glowBlur = this.state.isHovering ? 16 : 8;

    ctx.save();
    ctx.strokeStyle = '#48dbfb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = glowBlur;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#48dbfb';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = glowBlur + 8;
    ctx.beginPath();
    ctx.arc(tipX, tipY, dotSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#e0f7fa';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(tipX, tipY, dotSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawArc(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.dialRadius * 0.92;
    const angle = this.state.pointerAngle;
    const normalized = ((angle + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2));
    const arcLength = Math.min(normalized / (Math.PI * 2), 0.5) * Math.PI * 2;

    if (arcLength < 0.01) return;

    const startAngle = -Math.PI / 2;

    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 16;

    const steps = Math.max(20, Math.floor(arcLength * 40));
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const a0 = startAngle + arcLength * t0;
      const a1 = startAngle + arcLength * t1;
      const midT = (t0 + t1) / 2;
      ctx.strokeStyle = this.getArcColor(midT);
      ctx.globalAlpha = 0.7 + midT * 0.3;
      ctx.shadowColor = this.getArcColor(midT);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const lifeT = p.life / p.maxLife;
      const alpha = p.alpha * (1 - lifeT);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - lifeT * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCore(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const rot = this.state.coreRotation;
    const half = 10;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const grad = ctx.createLinearGradient(-half, -half, half, half);
    grad.addColorStop(0, '#f093fb');
    grad.addColorStop(1, '#667eea');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSymbols(): void {
    const ctx = this.ctx;
    const brightBoost = (this as unknown as { _brightBoost?: number })._brightBoost ?? 1.0;
    for (const s of this.symbols) {
      const floatY = Math.sin(s.phase) * s.floatOffset;
      const floatX = Math.cos(s.phase * 0.7) * 2;
      ctx.save();
      ctx.font = `${s.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d4a574';
      ctx.globalAlpha = Math.min(1.0, s.baseAlpha * brightBoost);
      ctx.shadowColor = '#d4a574';
      ctx.shadowBlur = 6;
      ctx.fillText(s.char, s.x + floatX, s.y + floatY);
      ctx.restore();
    }
  }

  public render(dt: number): void {
    this.updateParticles(dt);
    this.updateSymbols(dt, this.state.pointerAngularVelocity);

    this.drawBackground();
    this.drawDial();
    this.drawArc();
    this.drawCore();
    this.drawPointer();
    this.drawParticles();
    this.drawSymbols();
  }
}
