import p5 from 'p5';
import { blendColors, hexToRgb } from './colorBlend';

export type ShapeType = 'square' | 'triangle' | 'pentagon';

export interface GeometryConfig {
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  alpha: number;
  shape: ShapeType;
}

export const SHAPE_NAMES: Record<ShapeType, string> = {
  square: '正方形',
  triangle: '三角形',
  pentagon: '五边形'
};

export const PALETTE = [
  '#ff4455',
  '#44ffaa',
  '#4488ff',
  '#ffaa44',
  '#aa44ff'
];

export function randomShape(): ShapeType {
  const shapes: ShapeType[] = ['square', 'triangle', 'pentagon'];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

export function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

export class Geometry {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  targetSize: number;
  rotation: number;
  color: string;
  alpha: number;
  shape: ShapeType;
  isSelected: boolean;
  angularVelocity: number;
  scaleProgress: number;
  isDragging: boolean;
  velocityX: number;
  velocityY: number;
  bounceProgress: number;
  bounceStartX: number;
  bounceStartY: number;
  bounceTargetX: number;
  bounceTargetY: number;
  id: number;
  createdAt: number;

  private static nextId = 0;

  constructor(config: GeometryConfig) {
    this.x = config.x;
    this.y = config.y;
    this.targetX = config.x;
    this.targetY = config.y;
    this.size = config.size;
    this.targetSize = config.size;
    this.rotation = config.rotation;
    this.color = config.color;
    this.alpha = config.alpha;
    this.shape = config.shape;
    this.isSelected = false;
    this.angularVelocity = 0.02 + Math.random() * 0.03;
    this.scaleProgress = 1;
    this.isDragging = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.bounceProgress = 1;
    this.bounceStartX = config.x;
    this.bounceStartY = config.y;
    this.bounceTargetX = config.x;
    this.bounceTargetY = config.y;
    this.id = Geometry.nextId++;
    this.createdAt = Date.now();
  }

  playSpawnAnimation(): void {
    this.scaleProgress = 0;
  }

  startDrag(): void {
    this.isDragging = true;
    this.bounceProgress = 1;
  }

  endDrag(velocityX: number, velocityY: number): void {
    this.isDragging = false;
    this.bounceStartX = this.x;
    this.bounceStartY = this.y;
    const angle = Math.atan2(velocityY, velocityX);
    this.bounceTargetX = this.x - Math.cos(angle) * 5;
    this.bounceTargetY = this.y - Math.sin(angle) * 5;
    this.bounceProgress = 0;
  }

  updateDragPosition(mouseX: number, mouseY: number, prevMouseX: number, prevMouseY: number): void {
    const dx = mouseX - prevMouseX;
    const dy = mouseY - prevMouseY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const maxSpeed = 3;
    let moveX = dx;
    let moveY = dy;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      moveX = dx * scale;
      moveY = dy * scale;
    }
    this.x += moveX;
    this.y += moveY;
    this.targetX = this.x;
    this.targetY = this.y;
    this.velocityX = moveX;
    this.velocityY = moveY;
  }

  rotateBy(degrees: number): void {
    this.rotation += (degrees * Math.PI) / 180;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= this.size * this.scaleProgress * 0.6;
  }

  getVertices(): { x: number; y: number }[] {
    const vertices: { x: number; y: number }[] = [];
    let sides = 4;
    let angleOffset = -Math.PI / 2;
    switch (this.shape) {
      case 'triangle':
        sides = 3;
        angleOffset = -Math.PI / 2;
        break;
      case 'square':
        sides = 4;
        angleOffset = -Math.PI / 4;
        break;
      case 'pentagon':
        sides = 5;
        angleOffset = -Math.PI / 2;
        break;
    }
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + this.rotation + angleOffset;
      const r = this.size * this.scaleProgress;
      vertices.push({
        x: this.x + Math.cos(angle) * r,
        y: this.y + Math.sin(angle) * r
      });
    }
    return vertices;
  }

  update(): void {
    if (!this.isDragging) {
      this.rotation += this.angularVelocity;
    }

    if (this.scaleProgress < 1) {
      this.scaleProgress = Math.min(1, this.scaleProgress + 0.04);
    }

    if (this.bounceProgress < 1) {
      this.bounceProgress = Math.min(1, this.bounceProgress + 1 / 18);
      const t = this.easeOutBack(this.bounceProgress);
      this.x = this.bounceStartX + (this.bounceTargetX - this.bounceStartX) * t;
      this.y = this.bounceStartY + (this.bounceTargetY - this.bounceStartY) * t;
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  draw(p: p5, overlappingGeometries: Geometry[] = []): void {
    p.push();

    let drawColor = this.color;
    let drawAlpha = this.alpha;

    if (overlappingGeometries.length > 0) {
      const allGeos = [this, ...overlappingGeometries];
      const colors = allGeos.map(g => g.color);
      const alphas = allGeos.map(g => g.alpha);
      const blended = blendColors(colors, alphas);
      drawColor = blended.hex;
      drawAlpha = Math.max(drawAlpha, blended.alpha);
    }

    const rgb = hexToRgb(drawColor);
    const glowColor = this.isSelected ? '#ffffff' : drawColor;
    const glowRgb = hexToRgb(glowColor);

    p.drawingContext.shadowColor = `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.8)`;
    p.drawingContext.shadowBlur = this.isSelected ? 20 : (10 + Math.sin(Date.now() / 500 + this.id) * 3);

    p.fill(rgb.r, rgb.g, rgb.b, drawAlpha * 255);
    p.noStroke();

    if (this.isSelected) {
      p.stroke(255, 255, 255);
      p.strokeWeight(2);
      p.drawingContext.setLineDash([6, 4]);
    }

    p.translate(this.x, this.y);
    p.rotate(this.rotation);

    const s = this.size * this.scaleProgress;

    switch (this.shape) {
      case 'triangle':
        this.drawTriangle(p, s);
        break;
      case 'square':
        this.drawSquare(p, s);
        break;
      case 'pentagon':
        this.drawPentagon(p, s);
        break;
    }

    p.pop();
  }

  private drawTriangle(p: p5, size: number): void {
    p.beginShape();
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      p.vertex(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    p.endShape(p.CLOSE);
  }

  private drawSquare(p: p5, size: number): void {
    p.beginShape();
    for (let i = 0; i < 4; i++) {
      const angle = (i * 2 * Math.PI) / 4 - Math.PI / 4;
      p.vertex(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    p.endShape(p.CLOSE);
  }

  private drawPentagon(p: p5, size: number): void {
    p.beginShape();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      p.vertex(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    p.endShape(p.CLOSE);
  }
}
