export class Star {
  x: number;
  y: number;
  size: number;
  color: string;
  baseOpacity: number;
  isDragging: boolean;
  targetX?: number;
  targetY?: number;
  isPlaced: boolean;
  placedIndex: number;

  private breathTime: number;
  private breathSpeed: number;
  private originalX: number;
  private originalY: number;
  private offsetX: number;
  private offsetY: number;
  private colorR: number;
  private colorG: number;
  private colorB: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.size = 2 + Math.random() * 2;
    this.color = this.generateStarColor();
    this.baseOpacity = 0.6 + Math.random() * 0.4;
    this.isDragging = false;
    this.isPlaced = false;
    this.placedIndex = -1;
    this.breathTime = Math.random() * Math.PI * 2;
    this.breathSpeed = 2 + Math.random();
    this.offsetX = 0;
    this.offsetY = 0;
    this.parseColor();
  }

  private generateStarColor(): string {
    const t = Math.random();
    const r = 255;
    const g = Math.floor(255 - t * (255 - 250));
    const b = Math.floor(255 - t * (255 - 205));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseColor(): void {
    const match = this.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      this.colorR = parseInt(match[1]);
      this.colorG = parseInt(match[2]);
      this.colorB = parseInt(match[3]);
    } else {
      this.colorR = 255;
      this.colorG = 255;
      this.colorB = 255;
    }
  }

  update(deltaTime: number): void {
    if (!this.isDragging && !this.isPlaced) {
      this.breathTime += deltaTime * this.breathSpeed;
    }
  }

  startDrag(mouseX: number, mouseY: number): void {
    if (this.isPlaced) return;
    this.isDragging = true;
    this.offsetX = this.x - mouseX;
    this.offsetY = this.y - mouseY;
  }

  drag(mouseX: number, mouseY: number): void {
    if (!this.isDragging) return;
    this.x = mouseX + this.offsetX;
    this.y = mouseY + this.offsetY;
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  isHit(mouseX: number, mouseY: number): boolean {
    const hitRadius = Math.max(this.size * 3, 12);
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    return dx * dx + dy * dy < hitRadius * hitRadius;
  }

  snapToTarget(targetX: number, targetY: number, index: number): void {
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = targetX;
    this.y = targetY;
    this.isPlaced = true;
    this.placedIndex = index;
  }

  resetPosition(): void {
    this.x = this.originalX;
    this.y = this.originalY;
    this.isPlaced = false;
    this.placedIndex = -1;
    this.targetX = undefined;
    this.targetY = undefined;
  }

  getCurrentOpacity(): number {
    const breathOffset = Math.sin(this.breathTime) * 0.3;
    return Math.max(0.3, Math.min(1, this.baseOpacity + breathOffset));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const opacity = this.getCurrentOpacity();
    const currentSize = this.isDragging ? this.size * 1.5 : this.size;

    ctx.save();
    ctx.globalAlpha = opacity;

    const glowRadius = currentSize * 4;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius
    );
    gradient.addColorStop(0, `rgba(${this.colorR}, ${this.colorG}, ${this.colorB}, 0.5)`);
    gradient.addColorStop(1, `rgba(${this.colorR}, ${this.colorG}, ${this.colorB}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.isPlaced) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(240, 230, 140, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class TrailPoint {
  x: number;
  y: number;
  opacity: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.opacity = 0.4;
    this.life = 0.5;
    this.maxLife = 0.5;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    this.opacity = Math.max(0, (this.life / this.maxLife) * 0.4);
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D, nextPoint?: TrailPoint): void {
    if (this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = '#6a9cff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (nextPoint) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6a9cff';
      ctx.fill();
    }

    ctx.restore();
  }
}
