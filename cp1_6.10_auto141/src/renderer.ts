import type { Card, ShapeType, Game } from './game';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private width: number = 0;
  private height: number = 0;
  private cardWidth: number = 0;
  private cardHeight: number = 0;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private gap: number = 8;
  private noisePattern: CanvasPattern | null = null;
  private particles: Particle[] = [];
  private isCelebrating: boolean = false;
  private celebrationStartTime: number = 0;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.game = game;
    this.generateNoisePattern();
  }

  private generateNoisePattern(): void {
    const size = 64;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const imgData = tempCtx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      imgData.data[i] = Math.max(0, Math.min(255, 44 + noise));
      imgData.data[i + 1] = Math.max(0, Math.min(255, 62 + noise));
      imgData.data[i + 2] = Math.max(0, Math.min(255, 80 + noise));
      imgData.data[i + 3] = 255;
    }
    tempCtx.putImageData(imgData, 0, 0);
    const fullCtx = this.canvas.getContext('2d');
    if (fullCtx) {
      this.noisePattern = fullCtx.createPattern(tempCanvas, 'repeat');
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.calculateCardDimensions();
  }

  private calculateCardDimensions(): void {
    const gridSize = this.game.getGridSize();
    const availableWidth = this.width * 0.85;
    const availableHeight = this.height * 0.75;

    let cardWidthByWidth = (availableWidth - this.gap * (gridSize - 1)) / gridSize;
    let cardWidthByHeight = (availableHeight - this.gap * (gridSize - 1)) / gridSize / 1.2;
    this.cardWidth = Math.min(cardWidthByWidth, cardWidthByHeight);
    this.cardHeight = this.cardWidth * 1.2;

    const totalGridWidth = gridSize * this.cardWidth + (gridSize - 1) * this.gap;
    const totalGridHeight = gridSize * this.cardHeight + (gridSize - 1) * this.gap;

    this.gridOffsetX = (this.width - totalGridWidth) / 2;
    this.gridOffsetY = (this.height - totalGridHeight) / 2 + this.height * 0.05;
  }

  public getCardWidth(): number {
    return this.cardWidth;
  }

  public getCardHeight(): number {
    return this.cardHeight;
  }

  public getGridOffsetX(): number {
    return this.gridOffsetX;
  }

  public getGridOffsetY(): number {
    return this.gridOffsetY;
  }

  public getGap(): number {
    return this.gap;
  }

  public startCelebration(): void {
    this.isCelebrating = true;
    this.celebrationStartTime = performance.now();
    this.generateParticles();
  }

  private generateParticles(): void {
    this.particles = [];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
    const cards = this.game.getCards();
    for (const card of cards) {
      const cx = this.gridOffsetX + card.col * (this.cardWidth + this.gap) + this.cardWidth / 2;
      const cy = this.gridOffsetY + card.row * (this.cardHeight + this.gap) + this.cardHeight / 2;
      const particleCount = 20 + Math.floor(Math.random() * 15);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 250;
        this.particles.push({
          x: cx + (Math.random() - 0.5) * this.cardWidth * 0.6,
          y: cy + (Math.random() - 0.5) * this.cardHeight * 0.6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 150,
          size: 4 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          maxLife: 2,
        });
      }
    }
  }

  public render(deltaTime: number): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawCards();
    if (this.isCelebrating) {
      this.updateAndDrawParticles(deltaTime);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCards(): void {
    const cards = this.game.getCards();
    for (const card of cards) {
      const baseX = this.gridOffsetX + card.col * (this.cardWidth + this.gap);
      const baseY = this.gridOffsetY + card.row * (this.cardHeight + this.gap);

      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (card.shakeProgress > 0) {
        const shakeAmount = 5 * card.shakeProgress;
        shakeOffsetX = (Math.random() - 0.5) * shakeAmount * 2;
        shakeOffsetY = (Math.random() - 0.5) * shakeAmount * 2;
      }

      const x = baseX + shakeOffsetX;
      const y = baseY + shakeOffsetY;

      this.drawCard(card, x, y);
    }
  }

  private drawCard(card: Card, x: number, y: number): void {
    const radius = 6;
    let scaleY = 1;
    let showFront = false;

    if (card.state === 'flipping') {
      const progress = card.flipProgress;
      if (progress < 0.5) {
        scaleY = 1 - progress * 2;
        showFront = card.flipDirection === 'toBack';
      } else {
        scaleY = (progress - 0.5) * 2;
        showFront = card.flipDirection === 'toFront';
      }
    } else {
      showFront = card.state === 'shown' || card.state === 'matching' || card.state === 'matched';
    }

    const drawHeight = this.cardHeight * Math.max(0.01, Math.abs(scaleY));
    const drawY = y + (this.cardHeight - drawHeight) / 2;

    this.ctx.save();

    this.ctx.beginPath();
    this.roundRect(x, drawY, this.cardWidth, drawHeight, radius);
    this.ctx.clip();

    if (showFront) {
      this.drawCardFront(x, drawY, this.cardWidth, drawHeight);
      this.drawPattern(card.pattern.shape, card.pattern.color, x + this.cardWidth / 2, drawY + drawHeight / 2, Math.min(this.cardWidth, drawHeight) * 0.6);
    } else {
      this.drawCardBack(x, drawY, this.cardWidth, drawHeight);
    }

    this.ctx.restore();

    if (card.matchGlowProgress > 0 && (card.state === 'matching' || card.state === 'matched')) {
      this.drawMatchGlow(x, y, card.matchGlowProgress);
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.roundRect(x, drawY, this.cardWidth, drawHeight, radius);
    this.ctx.strokeStyle = showFront ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawCardBack(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(x, y, w, h);

    if (this.noisePattern) {
      this.ctx.globalAlpha = 0.08;
      this.ctx.fillStyle = this.noisePattern;
      this.ctx.fillRect(x, y, w, h);
      this.ctx.globalAlpha = 1;
    }

    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 2;
    const padding = Math.min(w, h) * 0.12;
    this.ctx.beginPath();
    this.roundRect(x + padding, y + padding, w - padding * 2, h - padding * 2, 4);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.ctx.font = `bold ${Math.min(w, h) * 0.25}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('?', x + w / 2, y + h / 2);
  }

  private drawCardFront(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(x, y, w, h);

    const gradient = this.ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f0f4f8');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, w, h);
  }

  private drawMatchGlow(x: number, y: number, progress: number): void {
    this.ctx.save();
    const alpha = progress * 0.3;
    const padding = 8 * progress;
    this.ctx.shadowColor = '#f1c40f';
    this.ctx.shadowBlur = 30 * progress;
    this.ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
    this.ctx.beginPath();
    this.roundRect(x - padding, y - padding, this.cardWidth + padding * 2, this.cardHeight + padding * 2, 10);
    this.ctx.fill();
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawPattern(shape: ShapeType, color: string, cx: number, cy: number, size: number): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(2, size * 0.06);
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    switch (shape) {
      case 'triangle':
        this.drawTriangle(cx, cy, size);
        break;
      case 'star':
        this.drawStar(cx, cy, size);
        break;
      case 'diamond':
        this.drawDiamond(cx, cy, size);
        break;
      case 'hexagon':
        this.drawHexagon(cx, cy, size);
        break;
      case 'circle':
        this.drawCircle(cx, cy, size);
        break;
      case 'square':
        this.drawSquare(cx, cy, size);
        break;
      case 'pentagon':
        this.drawPolygon(cx, cy, size, 5);
        break;
      case 'octagon':
        this.drawPolygon(cx, cy, size, 8);
        break;
      case 'heart':
        this.drawHeart(cx, cy, size);
        break;
      case 'cross':
        this.drawCross(cx, cy, size);
        break;
      case 'arrow':
        this.drawArrow(cx, cy, size);
        break;
      case 'moon':
        this.drawMoon(cx, cy, size);
        break;
      case 'crescent':
        this.drawCrescent(cx, cy, size);
        break;
      case 'trapezoid':
        this.drawTrapezoid(cx, cy, size);
        break;
      case 'parallelogram':
        this.drawParallelogram(cx, cy, size);
        break;
      case 'ellipse':
        this.drawEllipse(cx, cy, size);
        break;
      case 'ring':
        this.drawRing(cx, cy, size);
        break;
      case 'flower':
        this.drawFlower(cx, cy, size);
        break;
    }

    this.ctx.restore();
  }

  private drawTriangle(cx: number, cy: number, size: number): void {
    const h = size * 0.9;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - h / 2);
    this.ctx.lineTo(cx - size / 2, cy + h / 2);
    this.ctx.lineTo(cx + size / 2, cy + h / 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawStar(cx: number, cy: number, size: number): void {
    const outerR = size / 2;
    const innerR = size / 4.5;
    const points = 5;
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawDiamond(cx: number, cy: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size / 2);
    this.ctx.lineTo(cx + size / 2.5, cy);
    this.ctx.lineTo(cx, cy + size / 2);
    this.ctx.lineTo(cx - size / 2.5, cy);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawHexagon(cx: number, cy: number, size: number): void {
    this.drawPolygon(cx, cy, size, 6);
  }

  private drawPolygon(cx: number, cy: number, size: number, sides: number): void {
    const r = size / 2;
    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawCircle(cx: number, cy: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSquare(cx: number, cy: number, size: number): void {
    const s = size * 0.8;
    this.ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  private drawHeart(cx: number, cy: number, size: number): void {
    const s = size / 35;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + 15 * s);
    this.ctx.bezierCurveTo(cx + 20 * s, cy + 5 * s, cx + 18 * s, cy - 15 * s, cx, cy - 8 * s);
    this.ctx.bezierCurveTo(cx - 18 * s, cy - 15 * s, cx - 20 * s, cy + 5 * s, cx, cy + 15 * s);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawCross(cx: number, cy: number, size: number): void {
    const t = size * 0.22;
    const h = size * 0.5;
    this.ctx.fillRect(cx - t / 2, cy - h, t, h * 2);
    this.ctx.fillRect(cx - h, cy - t / 2, h * 2, t);
  }

  private drawArrow(cx: number, cy: number, size: number): void {
    const h = size * 0.5;
    const w = size * 0.3;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - h);
    this.ctx.lineTo(cx + w, cy - h * 0.3);
    this.ctx.lineTo(cx + w / 3, cy - h * 0.3);
    this.ctx.lineTo(cx + w / 3, cy + h);
    this.ctx.lineTo(cx - w / 3, cy + h);
    this.ctx.lineTo(cx - w / 3, cy - h * 0.3);
    this.ctx.lineTo(cx - w, cy - h * 0.3);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawMoon(cx: number, cy: number, size: number): void {
    const r = size / 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(cx + r * 0.35, cy - r * 0.15, r * 0.75, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawCrescent(cx: number, cy: number, size: number): void {
    const r = size / 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, Math.PI * 0.4, Math.PI * 1.6);
    this.ctx.arc(cx + r * 0.4, cy, r * 0.75, Math.PI * 1.5, Math.PI * 0.5, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawTrapezoid(cx: number, cy: number, size: number): void {
    const topW = size * 0.4;
    const botW = size * 0.8;
    const h = size * 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - topW / 2, cy - h / 2);
    this.ctx.lineTo(cx + topW / 2, cy - h / 2);
    this.ctx.lineTo(cx + botW / 2, cy + h / 2);
    this.ctx.lineTo(cx - botW / 2, cy + h / 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawParallelogram(cx: number, cy: number, size: number): void {
    const w = size * 0.8;
    const h = size * 0.55;
    const skew = size * 0.2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - w / 2 + skew, cy - h / 2);
    this.ctx.lineTo(cx + w / 2 + skew, cy - h / 2);
    this.ctx.lineTo(cx + w / 2 - skew, cy + h / 2);
    this.ctx.lineTo(cx - w / 2 - skew, cy + h / 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawEllipse(cx: number, cy: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, size / 2, size / 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawRing(cx: number, cy: number, size: number): void {
    const outerR = size / 2;
    const innerR = size / 3.5;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawFlower(cx: number, cy: number, size: number): void {
    const petalR = size / 3.5;
    const centerR = size / 5;
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const angle = (i * 2 * Math.PI) / petals;
      const px = cx + Math.cos(angle) * (size / 4);
      const py = cy + Math.sin(angle) * (size / 4);
      this.ctx.beginPath();
      this.ctx.arc(px, py, petalR, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private updateAndDrawParticles(deltaTime: number): void {
    const gravity = 600;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += gravity * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      this.ctx.restore();
    }
  }

  public isCelebrationComplete(): boolean {
    if (!this.isCelebrating) return false;
    const elapsed = (performance.now() - this.celebrationStartTime) / 1000;
    return elapsed >= 2;
  }

  public resetCelebration(): void {
    this.isCelebrating = false;
    this.particles = [];
  }
}
