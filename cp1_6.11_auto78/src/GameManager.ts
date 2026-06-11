import { TemperatureController } from './TemperatureController.js';
import { ParticleSystem } from './ParticleSystem.js';

export interface Stats {
  hardness: number;
  toughness: number;
  aesthetics: number;
}

export interface RatingResult {
  stars: number;
  stats: Stats;
  comment: string;
}

interface Vertex {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
}

interface ForgeLine {
  points: Array<{ x: number; y: number }>;
  alpha: number;
}

interface MartensiteDot {
  x: number;
  y: number;
  size: number;
  gray: number;
}

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private productCanvas: HTMLCanvasElement;
  private productCtx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private tempCtrl: TemperatureController;
  private particles: ParticleSystem;

  private vertices: Vertex[] = [];
  private baseArea: number = 0;
  private initialVertices: Vertex[] = [];

  private hammerCount: number = 0;
  private deformationAmount: number = 0;
  private readonly MAX_DEFORMATION_RATIO: number = 0.15;

  private stats: Stats = { hardness: 30, toughness: 70, aesthetics: 50 };
  private forgeLines: ForgeLine[] = [];
  private martensiteDots: MartensiteDot[] = [];
  private isQuenched: boolean = false;
  private isFinished: boolean = false;

  private centerX: number = 300;
  private centerY: number = 250;
  private readonly IRON_WIDTH: number = 140;
  private readonly IRON_HEIGHT: number = 90;
  private readonly VERTEX_COUNT: number = 14;

  private hammerAnimTime: number = 0;
  private readonly HAMMER_ANIM_DURATION: number = 0.3;
  private hammerImpactPos: { x: number; y: number } = { x: 0, y: 0 };

  private quenchAnimTime: number = 0;
  private readonly QUENCH_ANIM_DURATION: number = 1.2;
  private isQuenching: boolean = false;
  private quenchTubY: number = 0;

  private dragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private ironDisplayPos: { x: number; y: number } = { x: 0, y: 0 };

  private lastTime: number = 0;
  private running: boolean = false;
  private sparkTimer: number = 0;

  private onStateChange?: () => void;

  constructor(
    forgeCanvas: HTMLCanvasElement,
    productCanvas: HTMLCanvasElement,
    onStateChange?: () => void
  ) {
    this.canvas = forgeCanvas;
    this.ctx = forgeCanvas.getContext('2d')!;
    this.productCanvas = productCanvas;
    this.productCtx = productCanvas.getContext('2d')!;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = forgeCanvas.width;
    this.offscreen.height = forgeCanvas.height;
    this.offCtx = this.offscreen.getContext('2d')!;

    this.tempCtrl = new TemperatureController();
    this.particles = new ParticleSystem();
    this.onStateChange = onStateChange;

    this.initIronShape();
  }

  private initIronShape(): void {
    this.vertices = [];
    for (let i = 0; i < this.VERTEX_COUNT; i++) {
      const angle = (i / this.VERTEX_COUNT) * Math.PI * 2;
      const jagged = (Math.random() - 0.5) * 4;
      const rx = (this.IRON_WIDTH / 2) + jagged;
      const ry = (this.IRON_HEIGHT / 2) + jagged * 0.6;
      const x = this.centerX + Math.cos(angle) * rx;
      const y = this.centerY + Math.sin(angle) * ry;
      this.vertices.push({
        x, y, baseX: x, baseY: y,
        offsetX: 0, offsetY: 0,
      });
    }
    this.initialVertices = this.vertices.map(v => ({ ...v }));
    this.baseArea = this.calculateArea(this.vertices);
    this.ironDisplayPos = { x: 0, y: 0 };
  }

  private calculateArea(verts: Vertex[]): number {
    let area = 0;
    for (let i = 0; i < verts.length; i++) {
      const j = (i + 1) % verts.length;
      area += verts[i].x * verts[j].y;
      area -= verts[j].x * verts[i].y;
    }
    return Math.abs(area / 2);
  }

  get temperature(): number {
    return this.tempCtrl.temperature;
  }

  get hammerStrokes(): number {
    return this.hammerCount;
  }

  get canForge(): boolean {
    return this.tempCtrl.canForge() && !this.isFinished && !this.isQuenching;
  }

  get canQuench(): boolean {
    return this.tempCtrl.canQuench() && !this.isFinished && !this.isQuenching;
  }

  get finished(): boolean {
    return this.isFinished;
  }

  getStats(): Stats {
    return { ...this.stats };
  }

  onBlowAir(): void {
    if (this.isFinished || this.isQuenching) return;
    this.tempCtrl.blowAir();
    this.notifyState();
  }

  onHammer(clickX?: number, clickY?: number): boolean {
    if (!this.canForge) return false;

    const impactX = clickX ?? this.centerX + (Math.random() - 0.5) * this.IRON_WIDTH * 0.5;
    const impactY = clickY ?? this.centerY + (Math.random() - 0.5) * this.IRON_HEIGHT * 0.5;

    this.hammerImpactPos = { x: impactX, y: impactY };
    this.hammerAnimTime = this.HAMMER_ANIM_DURATION;
    this.hammerCount++;

    this.applyDeformation(impactX, impactY);
    this.updateForgeLines();
    this.updateStatsAfterHammer();
    this.particles.emitSpark(impactX, impactY, 8 + Math.floor(Math.random() * 5));
    this.notifyState();
    return true;
  }

  private applyDeformation(ix: number, iy: number): void {
    const tempVerts = this.vertices.map(v => ({ ...v }));

    for (let i = 0; i < tempVerts.length; i++) {
      const v = tempVerts[i];
      const dx = v.x - ix;
      const dy = v.y - iy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 120;

      if (dist < maxDist) {
        const influence = 1 - dist / maxDist;
        const amount = (5 + Math.random() * 5) * influence;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;

        const newX = v.baseX + v.offsetX + Math.cos(angle) * amount;
        const newY = v.baseY + v.offsetY + Math.sin(angle) * amount;

        v.x = newX;
        v.y = newY;
        v.offsetX = newX - v.baseX;
        v.offsetY = newY - v.baseY;
      }
    }

    const newArea = this.calculateArea(tempVerts);
    const areaChange = Math.abs(newArea - this.baseArea) / this.baseArea;

    if (areaChange <= this.MAX_DEFORMATION_RATIO) {
      this.vertices = tempVerts;
      this.deformationAmount = areaChange;
    } else {
      const scale = (this.MAX_DEFORMATION_RATIO / areaChange) * 0.9;
      for (let i = 0; i < this.vertices.length; i++) {
        const v = this.vertices[i];
        const tv = tempVerts[i];
        v.offsetX += (tv.offsetX - v.offsetX) * scale;
        v.offsetY += (tv.offsetY - v.offsetY) * scale;
        v.x = v.baseX + v.offsetX;
        v.y = v.baseY + v.offsetY;
      }
      this.deformationAmount = Math.min(this.MAX_DEFORMATION_RATIO, this.deformationAmount + 0.02);
    }
  }

  private updateForgeLines(): void {
    if (this.hammerCount === 5) {
      this.addForgeLayer(0.4);
    } else if (this.hammerCount === 15) {
      this.addForgeLayer(0.55);
      this.addForgeLayer(0.45);
    } else if (this.hammerCount > 5 && this.hammerCount % 4 === 0) {
      if (this.forgeLines.length < 8) {
        this.addForgeLayer(0.35);
      }
    }
  }

  private addForgeLayer(alpha: number): void {
    const points: Array<{ x: number; y: number }> = [];
    const count = 6 + Math.floor(Math.random() * 4);
    const startY = this.centerY - this.IRON_HEIGHT * 0.4 + Math.random() * this.IRON_HEIGHT * 0.8;
    const curvature = (Math.random() - 0.5) * 0.02;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = this.centerX - this.IRON_WIDTH * 0.45 + t * this.IRON_WIDTH * 0.9;
      const yOffset = Math.sin(t * Math.PI * 2) * 8 + (t - 0.5) * (t - 0.5) * curvature * 1000;
      points.push({
        x: x + (Math.random() - 0.5) * 4,
        y: startY + yOffset + (Math.random() - 0.5) * 3,
      });
    }
    this.forgeLines.push({ points, alpha });
  }

  private updateStatsAfterHammer(): void {
    this.stats.hardness = Math.min(100, this.stats.hardness + 3);
    if (this.hammerCount > 20) {
      const extra = this.hammerCount - 20;
      this.stats.toughness = Math.max(0, this.stats.toughness - extra * 1.5);
    }
    this.stats.aesthetics = 50 + Math.min(30, this.hammerCount * 2) + (this.forgeLines.length * 3);
    this.stats.aesthetics = Math.min(100, this.stats.aesthetics);
    if (this.hammerCount > 20) {
      this.stats.aesthetics = Math.max(20, this.stats.aesthetics - (this.hammerCount - 20) * 2);
    }
  }

  onStartDrag(clientX: number, clientY: number): boolean {
    if (this.isFinished || this.isQuenching) return false;
    if (!this.isPointInsideIron(clientX, clientY)) return false;
    this.dragging = true;
    this.dragOffset = {
      x: clientX - (this.centerX + this.ironDisplayPos.x),
      y: clientY - (this.centerY + this.ironDisplayPos.y),
    };
    return true;
  }

  onDrag(clientX: number, clientY: number): void {
    if (!this.dragging) return;
    this.ironDisplayPos = {
      x: clientX - this.dragOffset.x - this.centerX,
      y: clientY - this.dragOffset.y - this.centerY,
    };
  }

  onEndDrag(): { shouldQuench: boolean } {
    if (!this.dragging) return { shouldQuench: false };
    this.dragging = false;
    const ironX = this.centerX + this.ironDisplayPos.x;
    const ironY = this.centerY + this.ironDisplayPos.y;
    const canvasRect = this.canvas.getBoundingClientRect();
    const tubLeft = canvasRect.width + 100;
    if (ironX > 500 && ironY > 200 && ironY < 450) {
      this.ironDisplayPos = { x: 0, y: 0 };
      return { shouldQuench: true };
    }
    this.ironDisplayPos = { x: 0, y: 0 };
    return { shouldQuench: false };
  }

  isPointInsideIron(px: number, py: number): boolean {
    const cx = px - this.ironDisplayPos.x;
    const cy = py - this.ironDisplayPos.y;
    let inside = false;
    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      const xi = this.vertices[i].x, yi = this.vertices[i].y;
      const xj = this.vertices[j].x, yj = this.vertices[j].y;
      const intersect = ((yi > cy) !== (yj > cy)) &&
        (cx < (xj - xi) * (cy - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  triggerQuench(tubClientX: number, tubClientY: number): void {
    if (this.isFinished || this.isQuenching) return;
    this.isQuenching = true;
    this.quenchAnimTime = this.QUENCH_ANIM_DURATION;
    this.quenchTubY = this.canvas.height * 0.7;

    const result = this.tempCtrl.quench();
    this.stats.hardness = Math.min(100, this.stats.hardness + result.hardnessBonus);
    this.stats.toughness = Math.max(0, this.stats.toughness - result.toughnessPenalty);

    this.generateMartensiteDots();
    this.particles.emitBubble(this.centerX, this.centerY + 30, 50);

    this.notifyState();
  }

  private generateMartensiteDots(): void {
    this.martensiteDots = [];
    const density = 120;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.9;
      const rx = (this.IRON_WIDTH / 2) * r * 0.9;
      const ry = (this.IRON_HEIGHT / 2) * r * 0.9;
      this.martensiteDots.push({
        x: this.centerX + Math.cos(angle) * rx,
        y: this.centerY + Math.sin(angle) * ry,
        size: 1 + Math.random() * 2.5,
        gray: 140 + Math.floor(Math.random() * 100),
      });
    }
  }

  private finishQuench(): void {
    this.isQuenched = true;
    this.isFinished = true;
    this.isQuenching = false;
    this.renderProduct();
    this.notifyState();
  }

  calculateRating(): RatingResult {
    const weights = { hardness: 0.35, toughness: 0.3, aesthetics: 0.35 };
    const score =
      this.stats.hardness * weights.hardness +
      this.stats.toughness * weights.toughness +
      this.stats.aesthetics * weights.aesthetics;

    const stars = Math.max(0.5, Math.round(score / 10) / 2);

    const comments: { min: number; text: string }[] = [
      { min: 90, text: '出神入化！此剑乃百年难遇之良品，刚柔并济，纹理如行云流水，实乃大师之作！' },
      { min: 75, text: '技艺精湛！火候恰到好处，锻打层次分明，淬火得当，实乃可用之良器。' },
      { min: 60, text: '中规中矩。尚能一用，然火候与锻打尚有提升空间，继续磨练技艺吧。' },
      { min: 45, text: '尚欠火候。或温度不足，或锻打过少，虽成形却难当重任，还需多加练习。' },
      { min: 0, text: '初出茅庐。此器瑕疵颇多，锻打不足且淬火失当，回去从基础练起吧！' },
    ];
    let comment = comments[comments.length - 1].text;
    for (const c of comments) {
      if (score >= c.min) { comment = c.text; break; }
    }

    return { stars, stats: { ...this.stats }, comment };
  }

  run(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (!this.isFinished && !this.isQuenching) {
      this.tempCtrl.update(dt);
    }

    if (this.hammerAnimTime > 0) {
      this.hammerAnimTime = Math.max(0, this.hammerAnimTime - dt);
    }

    if (this.isQuenching) {
      this.quenchAnimTime = Math.max(0, this.quenchAnimTime - dt);
      const phase = 1 - this.quenchAnimTime / this.QUENCH_ANIM_DURATION;
      if (phase > 0.3 && phase < 0.85 && Math.random() < 0.4) {
        this.particles.emitBubble(
          this.centerX + (Math.random() - 0.5) * this.IRON_WIDTH,
          this.quenchTubY + 20,
          2
        );
      }
      if (this.quenchAnimTime <= 0) {
        this.finishQuench();
      }
    }

    if (!this.isFinished && !this.isQuenching) {
      const density = this.tempCtrl.getSparkDensity();
      if (density > 0) {
        this.sparkTimer += dt;
        if (this.sparkTimer >= 1 / 60) {
          this.sparkTimer = 0;
          const baseCount = 5 + Math.floor(Math.random() * 4);
          this.particles.emitSpark(this.centerX, this.centerY, baseCount * density);
        }
      }
    }

    this.particles.update(dt);
    this.notifyState();
  }

  private render(): void {
    const ctx = this.offCtx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    this.drawAnvilBackground(ctx, w, h);

    const ironOffsetX = this.ironDisplayPos.x;
    const ironOffsetY = this.isQuenching
      ? this.quenchTubY - this.centerY + Math.sin((1 - this.quenchAnimTime / this.QUENCH_ANIM_DURATION) * Math.PI) * 30
      : this.ironDisplayPos.y;

    this.drawIron(ctx, ironOffsetX, ironOffsetY);

    if (this.hammerAnimTime > 0) {
      this.drawHammerEffect(ctx);
    }

    if (this.isQuenching) {
      this.drawQuenchOverlay(ctx, w, h);
    }

    this.particles.render(ctx);

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.offscreen, 0, 0);
  }

  private drawAnvilBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const anvilGrad = ctx.createLinearGradient(0, 0, 0, h);
    anvilGrad.addColorStop(0, '#1a1a1a');
    anvilGrad.addColorStop(1, '#2a2520');
    ctx.fillStyle = anvilGrad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${50 + Math.random() * 30}, ${40 + Math.random() * 20}, 0.08)`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const anvilY = h - 80;
    const anvilGrad2 = ctx.createLinearGradient(0, anvilY - 30, 0, h);
    anvilGrad2.addColorStop(0, '#4a4a4a');
    anvilGrad2.addColorStop(0.4, '#3a3a3a');
    anvilGrad2.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = anvilGrad2;

    ctx.beginPath();
    ctx.moveTo(80, anvilY + 20);
    ctx.lineTo(w - 80, anvilY + 20);
    ctx.lineTo(w - 60, h);
    ctx.lineTo(60, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(w / 2, anvilY + 20, (w - 160) / 2, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(30, 30, 30, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, anvilY + 20);
    ctx.lineTo(w - 80, anvilY + 20);
    ctx.stroke();
  }

  private drawIron(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    if (this.vertices.length > 0) {
      const glowAlpha = this.isQuenched ? 0 : this.tempCtrl.getGlowAlpha();
      if (glowAlpha > 0) {
        const glowColor = this.tempCtrl.getHexColor();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25 + glowAlpha * 30;
      }

      ctx.beginPath();
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
      for (let i = 1; i < this.vertices.length; i++) {
        const xc = (this.vertices[i].x + this.vertices[(i + 1) % this.vertices.length].x) / 2;
        const yc = (this.vertices[i].y + this.vertices[(i + 1) % this.vertices.length].y) / 2;
        ctx.quadraticCurveTo(this.vertices[i].x, this.vertices[i].y, xc, yc);
      }
      ctx.closePath();

      const ironColor = this.isQuenched ? this.getQuenchedColor() : this.tempCtrl.getHexColor();
      const grad = ctx.createRadialGradient(
        this.centerX, this.centerY, 5,
        this.centerX, this.centerY, this.IRON_WIDTH * 0.8
      );
      grad.addColorStop(0, this.lightenColor(ironColor, 0.2));
      grad.addColorStop(0.7, ironColor);
      grad.addColorStop(1, this.darkenColor(ironColor, 0.2));
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.darkenColor(ironColor, 0.35);
      ctx.stroke();

      this.drawForgeLines(ctx);
      this.drawMartensite(ctx);
      this.drawSurfaceShading(ctx);
    }

    ctx.restore();
  }

  private drawForgeLines(ctx: CanvasRenderingContext2D): void {
    if (this.forgeLines.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const line of this.forgeLines) {
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        const xc = (line.points[i].x + line.points[Math.min(i + 1, line.points.length - 1)].x) / 2;
        const yc = (line.points[i].y + line.points[Math.min(i + 1, line.points.length - 1)].y) / 2;
        ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
      }
      const baseDark = this.isQuenched ? 0.35 : 0.5;
      ctx.strokeStyle = `rgba(20, 10, 5, ${line.alpha * baseDark})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMartensite(ctx: CanvasRenderingContext2D): void {
    if (this.martensiteDots.length === 0) return;
    ctx.save();
    for (const dot of this.martensiteDots) {
      ctx.fillStyle = `rgba(${dot.gray}, ${dot.gray}, ${dot.gray + 10}, 0.55)`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSurfaceShading(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      const xc = (this.vertices[i].x + this.vertices[(i + 1) % this.vertices.length].x) / 2;
      const yc = (this.vertices[i].y + this.vertices[(i + 1) % this.vertices.length].y) / 2;
      ctx.quadraticCurveTo(this.vertices[i].x, this.vertices[i].y, xc, yc);
    }
    ctx.closePath();
    const highlight = ctx.createLinearGradient(
      this.centerX - this.IRON_WIDTH / 2, this.centerY - this.IRON_HEIGHT / 2,
      this.centerX + this.IRON_WIDTH / 2, this.centerY + this.IRON_HEIGHT / 2
    );
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    highlight.addColorStop(0.5, 'rgba(0, 0, 0, 0.03)');
    highlight.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = highlight;
    ctx.fill();
    ctx.restore();
  }

  private drawHammerEffect(ctx: CanvasRenderingContext2D): void {
    const progress = 1 - this.hammerAnimTime / this.HAMMER_ANIM_DURATION;
    const alpha = 1 - progress;
    const scale = 1 + (1 - progress) * 0.5;

    ctx.save();
    ctx.translate(this.hammerImpactPos.x, this.hammerImpactPos.y);

    ctx.beginPath();
    ctx.arc(0, 0, 30 * scale * progress, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    const hammerY = -60 - progress * -90;
    ctx.translate(0, hammerY);
    ctx.rotate(-0.3 + progress * 0.6);
    ctx.fillText('🔨', 0, 0);

    ctx.restore();
  }

  private drawQuenchOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const waterTop = this.quenchTubY - 40;
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, h);
    waterGrad.addColorStop(0, 'rgba(65, 105, 225, 0.0)');
    waterGrad.addColorStop(0.15, 'rgba(65, 105, 225, 0.45)');
    waterGrad.addColorStop(1, 'rgba(30, 60, 150, 0.7)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterTop, w, h - waterTop);

    ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    const waveTime = (performance.now() / 1000) * 2;
    ctx.beginPath();
    ctx.moveTo(0, waterTop);
    for (let x = 0; x <= w; x += 10) {
      const y = waterTop + Math.sin(x * 0.03 + waveTime) * 4 + Math.sin(x * 0.07 + waveTime * 1.5) * 2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private getQuenchedColor(): string {
    const baseGray = 75 + Math.round(this.stats.hardness * 0.2);
    return `rgb(${baseGray}, ${baseGray - 5}, ${baseGray + 5})`;
  }

  private lightenColor(rgb: string, amount: number): string {
    const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return rgb;
    const r = Math.min(255, Math.round(Number(m[1]) + (255 - Number(m[1])) * amount));
    const g = Math.min(255, Math.round(Number(m[2]) + (255 - Number(m[2])) * amount));
    const b = Math.min(255, Math.round(Number(m[3]) + (255 - Number(m[3])) * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(rgb: string, amount: number): string {
    const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return rgb;
    const r = Math.max(0, Math.round(Number(m[1]) * (1 - amount)));
    const g = Math.max(0, Math.round(Number(m[2]) * (1 - amount)));
    const b = Math.max(0, Math.round(Number(m[3]) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private renderProduct(): void {
    const ctx = this.productCtx;
    const w = this.productCanvas.width;
    const h = this.productCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, 'rgba(245, 230, 204, 0.9)');
    bgGrad.addColorStop(1, 'rgba(200, 180, 150, 0.6)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const scale = 0.6;
    const offsetX = (w - this.canvas.width * scale) / 2;
    const offsetY = (h - this.canvas.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX + this.canvas.width / 2 * scale, offsetY + this.canvas.height / 2 * scale);
    ctx.scale(scale, scale);
    ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      const xc = (this.vertices[i].x + this.vertices[(i + 1) % this.vertices.length].x) / 2;
      const yc = (this.vertices[i].y + this.vertices[(i + 1) % this.vertices.length].y) / 2;
      ctx.quadraticCurveTo(this.vertices[i].x, this.vertices[i].y, xc, yc);
    }
    ctx.closePath();

    const ironColor = this.getQuenchedColor();
    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 5,
      this.centerX, this.centerY, this.IRON_WIDTH * 0.8
    );
    grad.addColorStop(0, this.lightenColor(ironColor, 0.15));
    grad.addColorStop(0.7, ironColor);
    grad.addColorStop(1, this.darkenColor(ironColor, 0.2));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.darkenColor(ironColor, 0.35);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const line of this.forgeLines) {
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        const xc = (line.points[i].x + line.points[Math.min(i + 1, line.points.length - 1)].x) / 2;
        const yc = (line.points[i].y + line.points[Math.min(i + 1, line.points.length - 1)].y) / 2;
        ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
      }
      ctx.strokeStyle = `rgba(20, 10, 5, ${line.alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const dot of this.martensiteDots) {
      ctx.fillStyle = `rgba(${dot.gray}, ${dot.gray}, ${dot.gray + 10}, 0.55)`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  }

  reset(): void {
    this.tempCtrl.reset();
    this.particles.reset();
    this.vertices = [];
    this.forgeLines = [];
    this.martensiteDots = [];
    this.hammerCount = 0;
    this.deformationAmount = 0;
    this.stats = { hardness: 30, toughness: 70, aesthetics: 50 };
    this.isQuenched = false;
    this.isFinished = false;
    this.isQuenching = false;
    this.hammerAnimTime = 0;
    this.quenchAnimTime = 0;
    this.dragging = false;
    this.ironDisplayPos = { x: 0, y: 0 };
    this.initIronShape();

    this.productCtx.clearRect(0, 0, this.productCanvas.width, this.productCanvas.height);
    this.notifyState();
  }

  private notifyState(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
}
