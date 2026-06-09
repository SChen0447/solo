import { Particle, SandPile } from './Particle';

export type BrushType = 'sand' | 'spray' | 'scraper';
export type LightEffectType = 'none' | 'sunrise' | 'moonlight' | 'aurora';

export interface BrushSettings {
  type: BrushType;
  radius: number;
  color: string;
}

interface Position {
  x: number;
  y: number;
}

const MAX_PARTICLES = 2000;

export class CanvasRender {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sandCanvas: HTMLCanvasElement;
  private sandCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private sandPiles: SandPile[] = [];
  private lastTime: number = 0;
  private animationId: number = 0;
  private isDrawing: boolean = false;
  private lastPosition: Position | null = null;
  private currentPile: SandPile | null = null;
  private sprayAccumulator: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private fadeOutProgress: number = 0;
  private isFading: boolean = false;
  private currentLightEffect: LightEffectType = 'none';
  private targetLightEffect: LightEffectType = 'none';
  private lightEffectTransition: number = 1;
  private lightEffectTime: number = 0;

  public brushSettings: BrushSettings = {
    type: 'sand',
    radius: 30,
    color: '#FFD700'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.sandCanvas = document.createElement('canvas');
    const sandCtx = this.sandCanvas.getContext('2d');
    if (!sandCtx) throw new Error('Cannot get sand canvas 2D context');
    this.sandCtx = sandCtx;

    this.resize();
    this.bindEvents();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public setBrushType(type: BrushType): void {
    this.brushSettings.type = type;
  }

  public setBrushColor(color: string): void {
    this.brushSettings.color = color;
  }

  public setLightEffect(effect: LightEffectType): void {
    if (this.targetLightEffect === effect) return;
    this.targetLightEffect = effect;
    this.lightEffectTransition = 0;
  }

  public clearCanvas(): void {
    this.isFading = true;
    this.fadeOutProgress = 0;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;

    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    this.ctx.scale(dpr, dpr);

    this.sandCanvas.width = this.canvasWidth;
    this.sandCanvas.height = this.canvasHeight;

    this.fillSandBackground();
  }

  private fillSandBackground(): void {
    this.sandCtx.fillStyle = '#000000';
    this.sandCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onPointerUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    window.addEventListener('resize', this.resize.bind(this));
  }

  private onPointerDown(e: MouseEvent): void {
    this.isDrawing = true;
    const pos = { x: e.clientX, y: e.clientY };
    this.lastPosition = pos;
    this.createCurrentPile(pos);
    this.drawAtPosition(pos);
  }

  private onPointerMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const pos = { x: e.clientX, y: e.clientY };
    if (this.lastPosition) {
      this.drawLine(this.lastPosition, pos);
    }
    this.updateCurrentPile(pos);
    this.lastPosition = pos;
  }

  private onPointerUp(): void {
    this.isDrawing = false;
    this.lastPosition = null;
    this.deactivateCurrentPile();
  }

  private lastTapTime: number = 0;
  private touchStartCount: number = 0;

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 2) {
      const now = performance.now();
      if (now - this.lastTapTime < 300 && this.touchStartCount >= 1) {
        this.clearCanvas();
      } else {
        this.lastTapTime = now;
        this.touchStartCount = e.touches.length;
      }
      return;
    }
    if (e.touches.length === 1) {
      this.touchStartCount = 1;
      this.isDrawing = true;
      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      this.lastPosition = pos;
      this.createCurrentPile(pos);
      this.drawAtPosition(pos);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const pos = { x: touch.clientX, y: touch.clientY };
    if (this.lastPosition) {
      this.drawLine(this.lastPosition, pos);
    }
    this.updateCurrentPile(pos);
    this.lastPosition = pos;
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.isDrawing = false;
      this.lastPosition = null;
      this.deactivateCurrentPile();
    }
  }

  private createCurrentPile(pos: Position): void {
    this.currentPile = new SandPile(pos.x, pos.y, this.brushSettings.radius, this.brushSettings.color);
    this.sandPiles.push(this.currentPile);
  }

  private updateCurrentPile(pos: Position): void {
    if (this.currentPile) {
      this.currentPile.x = pos.x;
      this.currentPile.y = pos.y;
    }
  }

  private deactivateCurrentPile(): void {
    if (this.currentPile) {
      this.currentPile.deactivate(performance.now());
      this.currentPile = null;
    }
  }

  private drawLine(from: Position, to: Position): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(distance / 4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = {
        x: from.x + dx * t,
        y: from.y + dy * t
      };
      this.drawAtPosition(pos);
    }
  }

  private drawAtPosition(pos: Position): void {
    switch (this.brushSettings.type) {
      case 'sand':
        this.drawSandBrush(pos);
        break;
      case 'spray':
        this.drawSprayGun(pos);
        break;
      case 'scraper':
        this.drawScraper(pos);
        break;
    }
  }

  private drawSandBrush(pos: Position): void {
    this.sandCtx.save();
    this.sandCtx.fillStyle = this.brushSettings.color;
    this.sandCtx.globalAlpha = 0.15;
    this.sandCtx.beginPath();
    this.sandCtx.arc(pos.x, pos.y, this.brushSettings.radius, 0, Math.PI * 2);
    this.sandCtx.fill();
    this.sandCtx.restore();

    const particleCount = Math.floor(Math.random() * 11) + 5;
    for (let i = 0; i < particleCount; i++) {
      this.addParticle(pos, this.brushSettings.radius + 10);
    }
  }

  private drawSprayGun(pos: Position): void {
    this.sprayAccumulator += 100 / 60;
    while (this.sprayAccumulator >= 1) {
      this.sprayAccumulator -= 1;
      const angle = (Math.random() - 0.5) * (Math.PI / 3);
      const distance = Math.random() * 200;
      const px = pos.x + Math.cos(angle) * distance;
      const py = pos.y + Math.sin(angle) * distance;

      this.sandCtx.save();
      this.sandCtx.fillStyle = this.brushSettings.color;
      this.sandCtx.globalAlpha = 0.3 + Math.random() * 0.3;
      this.sandCtx.beginPath();
      this.sandCtx.arc(px, py, 1.5 + Math.random() * 1.5, 0, Math.PI * 2);
      this.sandCtx.fill();
      this.sandCtx.restore();

      this.addParticle({ x: px, y: py }, 30);
    }
  }

  private drawScraper(pos: Position): void {
    this.sandCtx.save();
    this.sandCtx.fillStyle = this.brushSettings.color;
    this.sandCtx.globalAlpha = 0.25;
    this.sandCtx.fillRect(pos.x - 5, pos.y - 50, 10, 100);
    this.sandCtx.restore();

    for (let i = -40; i <= 40; i += 8) {
      const particlePos = { x: pos.x, y: pos.y + i };
      for (let j = 0; j < 2; j++) {
        this.addParticle(particlePos, 15);
      }
    }
  }

  private addParticle(pos: Position, spreadRadius: number): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 60 + 10;
    const offset = Math.random() * spreadRadius;
    const life = 0.5 + Math.random() * 0.5;

    const particle = new Particle({
      x: pos.x + Math.cos(angle) * offset * 0.3,
      y: pos.y + Math.sin(angle) * offset * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: this.brushSettings.color,
      size: 1 + Math.random() * 2,
      life: life,
      maxLife: life
    });

    this.particles.push(particle);
  }

  private animate(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;
    this.lightEffectTime += deltaTime;

    this.update(deltaTime, currentTime);
    this.render();

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  private update(deltaTime: number, currentTime: number): void {
    this.particles = this.particles.filter(p => p.update(deltaTime));

    this.sandPiles = this.sandPiles.filter(pile => pile.update(currentTime));

    if (this.isFading) {
      this.fadeOutProgress += deltaTime / 0.3;
      if (this.fadeOutProgress >= 1) {
        this.fadeOutProgress = 0;
        this.isFading = false;
        this.fillSandBackground();
        this.particles = [];
        this.sandPiles = [];
      }
    }

    if (this.lightEffectTransition < 1) {
      this.lightEffectTransition = Math.min(1, this.lightEffectTransition + deltaTime);
      if (this.lightEffectTransition >= 1) {
        this.currentLightEffect = this.targetLightEffect;
      }
    }
  }

  private render(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    this.ctx.scale(dpr, dpr);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (this.isFading) {
      this.ctx.globalAlpha = 1 - this.fadeOutProgress;
    }

    this.ctx.drawImage(this.sandCanvas, 0, 0);

    for (const pile of this.sandPiles) {
      pile.draw(this.ctx);
    }

    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }

    this.ctx.globalAlpha = 1;

    this.renderLightEffect();

    this.ctx.restore();
  }

  private renderLightEffect(): void {
    const transitionAlpha = this.lightEffectTransition;

    if (transitionAlpha < 1 && this.currentLightEffect !== 'none') {
      this.ctx.globalAlpha = 1 - transitionAlpha;
      this.renderSpecificEffect(this.currentLightEffect);
    }

    if (this.targetLightEffect !== 'none') {
      this.ctx.globalAlpha = transitionAlpha;
      this.renderSpecificEffect(this.targetLightEffect);
    }

    this.ctx.globalAlpha = 1;
  }

  private renderSpecificEffect(effect: LightEffectType): void {
    switch (effect) {
      case 'sunrise':
        this.renderSunrise();
        break;
      case 'moonlight':
        this.renderMoonlight();
        break;
      case 'aurora':
        this.renderAurora();
        break;
    }
  }

  private renderSunrise(): void {
    const t = this.lightEffectTime;
    const progress = (Math.sin(t * 0.3) + 1) / 2;
    const gradient = this.ctx.createLinearGradient(0, this.canvasHeight, 0, this.canvasHeight * (1 - progress * 0.6));
    gradient.addColorStop(0, 'rgba(255, 120, 30, 0.35)');
    gradient.addColorStop(0.4, 'rgba(255, 180, 80, 0.2)');
    gradient.addColorStop(0.7, 'rgba(255, 220, 150, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderMoonlight(): void {
    const t = this.lightEffectTime;
    const x = ((t / 8) % 1) * (this.canvasWidth + 400) - 200;
    const gradient = this.ctx.createLinearGradient(x - 200, 0, x + 200, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(220, 230, 255, 0.18)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderAurora(): void {
    const t = this.lightEffectTime;
    const stripeWidth = 80;
    const amplitude = 30;
    const frequency = 2;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let x = -100; x < this.canvasWidth + 100; x += stripeWidth) {
      const phase = (x / stripeWidth) * Math.PI * 0.5 + t * frequency;
      const yOffset = Math.sin(phase) * amplitude;
      const gradient = this.ctx.createLinearGradient(x, 0, x + stripeWidth, 0);
      gradient.addColorStop(0, 'rgba(100, 50, 200, 0)');
      gradient.addColorStop(0.3, 'rgba(100, 50, 200, 0.15)');
      gradient.addColorStop(0.5, 'rgba(50, 200, 150, 0.2)');
      gradient.addColorStop(0.7, 'rgba(100, 50, 200, 0.15)');
      gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, yOffset, stripeWidth, this.canvasHeight);
    }

    this.ctx.restore();
  }
}
