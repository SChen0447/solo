import { AlchemySystem, ELEMENTS, SUBSTANCES, ElementType, SubstanceType } from './AlchemySystem';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'splash' | 'steam' | 'lava' | 'frost' | 'obsidian' | 'explosion' | 'clear' | 'star' | 'magic' | 'bubble';
}

interface DragState {
  isDragging: boolean;
  element: ElementType | null;
  x: number;
  y: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private alchemy: AlchemySystem;
  private particles: Particle[] = [];
  private maxParticles = 150;
  private stars: Particle[] = [];
  private magicLights: Particle[] = [];
  private dragState: DragState = { isDragging: false, element: null, x: 0, y: 0 };
  private containerCenter = { x: 0, y: 0 };
  private containerRadius = 120;
  private scale = 1;
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private flashAlpha = 0;
  private shockwaveRadius = 0;
  private isExploding = false;
  private animationId: number | null = null;
  private lastTime = 0;
  private time = 0;
  private onContainerClick?: () => void;

  constructor(canvas: HTMLCanvasElement, alchemy: AlchemySystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.alchemy = alchemy;
    this.resize();
    this.initBackground();
    window.addEventListener('resize', () => this.resize());
  }

  setOnContainerClick(callback: () => void): void {
    this.onContainerClick = callback;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    if (window.innerWidth < 768) {
      this.scale = 0.8;
    } else {
      this.scale = 1;
    }

    this.containerRadius = 120 * this.scale;
    this.containerCenter = { x: width / 2, y: height / 2 };
  }

  private initBackground(): void {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: 0,
        vy: 0,
        life: Infinity,
        maxLife: Infinity,
        color: '#FFFFFF',
        size: 1 + Math.random() * 2,
        type: 'star'
      });
    }

    for (let i = 0; i < 10; i++) {
      const colors = ['#FF6347', '#4682B4', '#FFD700', '#98FB98', '#DA70D6'];
      this.magicLights.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: Infinity,
        maxLife: Infinity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 20 + Math.random() * 30,
        type: 'magic'
      });
    }
  }

  startDrag(element: ElementType, x: number, y: number): void {
    this.dragState = { isDragging: true, element, x, y };
  }

  updateDrag(x: number, y: number): void {
    if (this.dragState.isDragging) {
      this.dragState.x = x;
      this.dragState.y = y;
    }
  }

  endDrag(x: number, y: number): boolean {
    if (!this.dragState.isDragging || !this.dragState.element) {
      return false;
    }

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    const inContainer = this.isPointInContainer(canvasX, canvasY);
    const element = this.dragState.element;

    this.dragState = { isDragging: false, element: null, x: 0, y: 0 };

    if (inContainer && this.alchemy.canAddElement()) {
      this.alchemy.addElement(element);
      this.createSplashParticles(canvasX, canvasY, ELEMENTS[element].color);
      return true;
    }

    return false;
  }

  private isPointInContainer(x: number, y: number): boolean {
    const dx = x - this.containerCenter.x;
    const dy = y - this.containerCenter.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.containerRadius;
  }

  private createSplashParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 3 + Math.random() * 3,
        type: 'splash'
      });
    }
  }

  triggerExplosion(): void {
    this.isExploding = true;
    this.shakeIntensity = 3;
    this.shakeDuration = 0.3;
    this.flashAlpha = 1;
    this.shockwaveRadius = 0;

    const colors = ['#FF4500', '#FFD700', '#FF6347', '#FFFF00', '#FFFFFF'];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.addParticle({
        x: this.containerCenter.x,
        y: this.containerCenter.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random(),
        maxLife: 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        type: 'explosion'
      });
    }

    setTimeout(() => {
      this.isExploding = false;
      this.alchemy.clearContainer();
    }, 2000);
  }

  triggerClear(): void {
    const color = this.alchemy.getMixedColor();
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1 + Math.random() * 2;
      this.addParticle({
        x: this.containerCenter.x + (Math.random() - 0.5) * this.containerRadius,
        y: this.containerCenter.y + (Math.random() - 0.5) * this.containerRadius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 6 + Math.random() * 8,
        type: 'clear'
      });
    }

    setTimeout(() => {
      this.alchemy.clearContainer();
    }, 1000);
  }

  private addParticle(particle: Particle): void {
    this.particles.push(particle);
    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'clear') {
        p.vy -= 5 * dt;
      } else if (p.type === 'explosion') {
        p.vy += 3 * dt;
      } else if (p.type === 'lava') {
        p.vy -= 2 * dt;
      } else if (p.type === 'bubble') {
        p.vy -= 1 * dt;
      }

      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (const star of this.stars) {
      const angle = this.time * 0.02 * (0.5 + Math.random() * 0.1);
      star.x += Math.cos(angle) * 0.1;
      star.y += Math.sin(angle) * 0.1;
    }

    for (const light of this.magicLights) {
      light.x += light.vx;
      light.y += light.vy;

      if (light.x < 0 || light.x > 2000) light.vx *= -1;
      if (light.y < 0 || light.y > 2000) light.vy *= -1;
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 3;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    if (this.shockwaveRadius < this.containerRadius * 5) {
      this.shockwaveRadius += 400 * dt;
    }

    this.updateSubstanceEffects(dt);
  }

  private updateSubstanceEffects(dt: number): void {
    const substance = this.alchemy.getCurrentSubstance();

    if (substance === 'steam' && Math.random() < 0.3) {
      this.addParticle({
        x: this.containerCenter.x + (Math.random() - 0.5) * this.containerRadius * 0.8,
        y: this.containerCenter.y - this.containerRadius * 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random(),
        life: 2,
        maxLife: 2,
        color: 'rgba(255, 255, 255, 0.5)',
        size: 8 + Math.random() * 8,
        type: 'steam'
      });
    }

    if (substance === 'lava' && Math.random() < 0.4) {
      this.addParticle({
        x: this.containerCenter.x + (Math.random() - 0.5) * this.containerRadius * 0.6,
        y: this.containerCenter.y + this.containerRadius * 0.3,
        vx: (Math.random() - 0.5) * 1,
        vy: -2 - Math.random() * 2,
        life: 1,
        maxLife: 1,
        color: Math.random() > 0.5 ? '#FF4500' : '#FFD700',
        size: 3 + Math.random() * 4,
        type: 'lava'
      });

      if (Math.random() < 0.2) {
        this.addParticle({
          x: this.containerCenter.x + (Math.random() - 0.5) * this.containerRadius * 0.5,
          y: this.containerCenter.y + this.containerRadius * 0.4,
          vx: 0,
          vy: -0.5,
          life: 0.8,
          maxLife: 0.8,
          color: 'rgba(255, 100, 0, 0.6)',
          size: 5 + Math.random() * 5,
          type: 'bubble'
        });
      }
    }

    if (substance === 'frost' && Math.random() < 0.15) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.containerRadius * (0.8 + Math.random() * 0.2);
      this.addParticle({
        x: this.containerCenter.x + Math.cos(angle) * radius,
        y: this.containerCenter.y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: 1.5,
        maxLife: 1.5,
        color: '#ADD8E6',
        size: 2 + Math.random() * 3,
        type: 'frost'
      });
    }

    if (substance === 'obsidian' && Math.random() < 0.25) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.containerRadius * (0.3 + Math.random() * 0.5);
      this.addParticle({
        x: this.containerCenter.x + Math.cos(angle) * radius,
        y: this.containerCenter.y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        life: 1,
        maxLife: 1,
        color: `rgba(138, 43, 226, ${0.3 + Math.random() * 0.5})`,
        size: 2 + Math.random() * 4,
        type: 'obsidian'
      });
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.save();

    if (this.shakeIntensity > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeIntensity * 2,
        (Math.random() - 0.5) * this.shakeIntensity * 2
      );
    }

    this.renderBackground(ctx, width, height);
    this.renderContainer(ctx);
    this.renderSubstance(ctx);
    this.renderParticles(ctx);
    this.renderSubstanceLabel(ctx);
    this.renderShockwave(ctx);
    this.renderDragElement(ctx);
    this.renderFlash(ctx);

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2B0F3C');
    gradient.addColorStop(1, '#1A0526');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (const star of this.stars) {
      const sx = ((star.x % width) + width) % width;
      const sy = ((star.y % height) + height) % height;
      const alpha = 0.3 + 0.5 * Math.sin(this.time * 2 + star.x * 0.01);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (const light of this.magicLights) {
      const lx = ((light.x % width) + width) % width;
      const ly = ((light.y % height) + height) % height;
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, light.size);
      glow.addColorStop(0, light.color + '60');
      glow.addColorStop(1, light.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, light.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderContainer(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.containerCenter;
    const r = this.containerRadius;

    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;

    const borderGradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    borderGradient.addColorStop(0, '#FFD700');
    borderGradient.addColorStop(1, '#B8860B');

    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    innerGradient.addColorStop(0, 'rgba(50, 20, 70, 0.9)');
    innerGradient.addColorStop(1, 'rgba(20, 5, 35, 0.95)');

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSubstance(ctx: CanvasRenderingContext2D): void {
    if (this.isExploding) return;

    const { x, y } = this.containerCenter;
    const r = this.containerRadius - 10;
    const substance = this.alchemy.getCurrentSubstance();
    const color = this.alchemy.getMixedColor();
    const container = this.alchemy.getContainer();

    if (container.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    if (substance === 'mud') {
      const waveOffset = this.time * 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - r, y + r);
      for (let i = 0; i <= 40; i++) {
        const px = x - r + (r * 2 * i) / 40;
        const py = y + Math.sin(i * 0.5 + waveOffset) * 5 - r * 0.2;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(x + r, y + r);
      ctx.closePath();
      ctx.fill();
    } else if (substance === 'obsidian') {
      const pulse = 0.7 + 0.3 * Math.sin(this.time * 3);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(138, 43, 226, ${pulse * 0.5})`);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 + this.time;
        const cx = x + Math.cos(angle) * r * 0.5;
        const cy = y + Math.sin(angle) * r * 0.5;
        const crystalGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
        crystalGradient.addColorStop(0, `rgba(255, 255, 255, ${pulse * 0.8})`);
        crystalGradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
        ctx.fillStyle = crystalGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (substance === 'steam') {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (substance === 'frost') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const ix = x + Math.cos(angle) * r * 0.85;
        const iy = y + Math.sin(angle) * r * 0.85;
        this.drawIceCrystal(ctx, ix, iy, 10 + Math.sin(this.time + i) * 3);
      }
    } else if (substance === 'lava') {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, '#8B0000');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawIceCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(-size * 0.3, -size * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(size * 0.3, -size * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'star' || p.type === 'magic') {
        ctx.fillStyle = p.color;
      } else if (p.type === 'steam' || p.type === 'clear') {
        ctx.fillStyle = p.color;
      } else {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderSubstanceLabel(ctx: CanvasRenderingContext2D): void {
    const substance = this.alchemy.getCurrentSubstance();
    if (substance === 'none' || this.isExploding) return;

    const { x, y } = this.containerCenter;
    const label = SUBSTANCES[substance].name;

    ctx.save();
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(label, x, y - this.containerRadius - 15);
    ctx.restore();
  }

  private renderShockwave(ctx: CanvasRenderingContext2D): void {
    if (this.shockwaveRadius <= 0 || this.shockwaveRadius > this.containerRadius * 5) return;

    const { x, y } = this.containerCenter;
    const alpha = 1 - this.shockwaveRadius / (this.containerRadius * 5);

    ctx.save();
    ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, this.shockwaveRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderDragElement(ctx: CanvasRenderingContext2D): void {
    if (!this.dragState.isDragging || !this.dragState.element) return;

    const element = ELEMENTS[this.dragState.element];
    const size = 50 * this.scale;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = element.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.arc(this.dragState.x, this.dragState.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderFlash(ctx: CanvasRenderingContext2D): void {
    if (this.flashAlpha <= 0) return;

    const rect = this.canvas.getBoundingClientRect();
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();
  }

  handleCanvasClick(canvasX: number, canvasY: number): void {
    if (this.isPointInContainer(canvasX, canvasY) && this.onContainerClick) {
      this.onContainerClick();
    }
  }

  getContainerInfo(): { center: { x: number; y: number }; radius: number } {
    return {
      center: { ...this.containerCenter },
      radius: this.containerRadius
    };
  }
}
