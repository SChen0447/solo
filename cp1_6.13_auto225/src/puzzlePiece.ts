import gsap from 'gsap';

export interface Point {
  x: number;
  y: number;
}

const COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff', '#a29bfe'];

export class PuzzlePiece {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  targetRotation: number;
  color: string;
  baseColor: string;
  opacity: number;
  baseOpacity: number;
  scale: number;
  targetScale: number;
  isDragging: boolean;
  isLocked: boolean;
  vertices: Point[];
  area: number;
  glowIntensity: number;
  dragOffsetX: number;
  dragOffsetY: number;
  snapThreshold: number = 15;
  animation: gsap.core.Tween | null = null;

  constructor(id: number, targetX: number, targetY: number, targetRotation: number) {
    this.id = id;
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetRotation = targetRotation;
    this.baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.color = this.baseColor;
    this.baseOpacity = 0.7 + Math.random() * 0.3;
    this.opacity = this.baseOpacity;
    this.scale = 1;
    this.targetScale = 1;
    this.isDragging = false;
    this.isLocked = false;
    this.glowIntensity = 1 + Math.random();
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.area = 400 + Math.random() * 400;
    this.vertices = this.generateIrregularPolygon(this.area);

    this.x = 0;
    this.y = 0;
    this.rotation = (Math.random() - 0.5) * 60;
  }

  private generateIrregularPolygon(targetArea: number): Point[] {
    const vertexCount = 5 + Math.floor(Math.random() * 3);
    const baseRadius = Math.sqrt(targetArea / Math.PI) * 1.1;
    const vertices: Point[] = [];

    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const radiusVariation = 0.6 + Math.random() * 0.8;
      const r = baseRadius * radiusVariation;
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    const area = this.calculatePolygonArea(vertices);
    const scaleFactor = Math.sqrt(targetArea / area);
    return vertices.map(v => ({
      x: v.x * scaleFactor,
      y: v.y * scaleFactor
    }));
  }

  private calculatePolygonArea(vertices: Point[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  setInitialPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  containsPoint(px: number, py: number): boolean {
    const cos = Math.cos(-this.rotation * Math.PI / 180);
    const sin = Math.sin(-this.rotation * Math.PI / 180);
    const dx = px - this.x;
    const dy = py - this.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    let inside = false;
    const n = this.vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.vertices[i].x * this.scale;
      const yi = this.vertices[i].y * this.scale;
      const xj = this.vertices[j].x * this.scale;
      const yj = this.vertices[j].y * this.scale;

      const intersect = ((yi > localY) !== (yj > localY)) &&
        (localX < (xj - xi) * (localY - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  startDrag(mouseX: number, mouseY: number): void {
    if (this.isLocked) return;
    this.isDragging = true;
    this.dragOffsetX = mouseX - this.x;
    this.dragOffsetY = mouseY - this.y;
    this.opacity = 0.5;
    if (this.animation) {
      this.animation.kill();
      this.animation = null;
    }
  }

  onDrag(mouseX: number, mouseY: number): void {
    if (!this.isDragging || this.isLocked) return;
    this.x = mouseX - this.dragOffsetX;
    this.y = mouseY - this.dragOffsetY;
  }

  endDrag(): { snapped: boolean; x: number; y: number } | null {
    if (!this.isDragging || this.isLocked) return null;
    this.isDragging = false;
    this.opacity = this.baseOpacity;

    const dist = Math.sqrt(
      Math.pow(this.x - this.targetX, 2) +
      Math.pow(this.y - this.targetY, 2)
    );

    if (dist <= this.snapThreshold) {
      this.snapToTarget();
      return { snapped: true, x: this.targetX, y: this.targetY };
    }

    return { snapped: false, x: this.x, y: this.y };
  }

  snapToTarget(): void {
    this.isLocked = true;
    this.targetScale = 1.1;

    this.animation = gsap.to(this, {
      x: this.targetX,
      y: this.targetY,
      rotation: this.targetRotation,
      scale: 1.1,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        this.updateBrightness();
      },
      onComplete: () => {
        this.animation = null;
      }
    });

    this.updateBrightness();
  }

  private updateBrightness(): void {
    if (!this.isLocked) return;
    const progress = Math.min(1, Math.max(0, (this.scale - 1) / 0.1));
    this.color = this.mixColors(this.baseColor, '#ffff00', progress * 0.5);
    this.glowIntensity = 1 + progress * 2;
  }

  private mixColors(color1: string, color2: string, ratio: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  reset(x: number, y: number): void {
    if (this.animation) {
      this.animation.kill();
      this.animation = null;
    }
    this.isLocked = false;
    this.isDragging = false;
    this.x = x;
    this.y = y;
    this.rotation = (Math.random() - 0.5) * 60;
    this.scale = 1;
    this.targetScale = 1;
    this.opacity = this.baseOpacity;
    this.color = this.baseColor;
    this.glowIntensity = 1 + Math.random();
  }

  explodeFrom(centerX: number, centerY: number, maxDistance: number): void {
    const angle = Math.atan2(this.y - centerY, this.x - centerX);
    const distance = Math.random() * maxDistance;
    const targetX = this.x + Math.cos(angle) * distance;
    const targetY = this.y + Math.sin(angle) * distance;

    if (this.animation) {
      this.animation.kill();
    }

    this.animation = gsap.to(this, {
      x: targetX,
      y: targetY,
      rotation: this.rotation + (Math.random() - 0.5) * 180,
      scale: 0.5,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        this.animation = null;
      }
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.scale(this.scale, this.scale);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 * this.glowIntensity;

    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = this.opacity * 0.8;
    ctx.stroke();

    ctx.restore();
  }
}
