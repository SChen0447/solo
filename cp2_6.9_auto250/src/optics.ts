export interface Vec2 {
  x: number;
  y: number;
}

export type OpticsType = 'light' | 'mirror' | 'lens';

export type ToolType = 'select' | 'light' | 'mirror' | 'lens';

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const vecSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const vecAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const vecMul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });

export const vecDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const vecLen = (a: Vec2): number => Math.sqrt(a.x * a.x + a.y * a.y);

export const vecNorm = (a: Vec2): Vec2 => {
  const l = vecLen(a);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};

export const vecDist = (a: Vec2, b: Vec2): number => vecLen(vecSub(a, b));

export class LightSource {
  type: 'light' = 'light';
  position: Vec2;
  color: string;
  intensity: number = 0.8;

  constructor(x: number, y: number, color: string = '#FFD700') {
    this.position = vec2(x, y);
    this.color = color;
  }

  contains(p: Vec2, threshold: number = 12): boolean {
    return vecDist(p, this.position) < threshold;
  }

  getTooltip(): string {
    return `光源\n位置: (${Math.round(this.position.x)}, ${Math.round(this.position.y)})\n强度: ${this.intensity.toFixed(1)}`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, this.color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Mirror {
  type: 'mirror' = 'mirror';
  vertices: Vec2[];

  constructor(vertices: Vec2[]) {
    this.vertices = vertices;
  }

  static createRightTriangle(cx: number, cy: number, size: number = 60): Mirror {
    const half = size / 2;
    return new Mirror([
      vec2(cx - half, cy + half),
      vec2(cx + half, cy + half),
      vec2(cx - half, cy - half)
    ]);
  }

  getEdges(): Array<{ start: Vec2; end: Vec2; normal: Vec2 }> {
    const edges: Array<{ start: Vec2; end: Vec2; normal: Vec2 }> = [];
    for (let i = 0; i < this.vertices.length; i++) {
      const start = this.vertices[i];
      const end = this.vertices[(i + 1) % this.vertices.length];
      const dir = vecNorm(vecSub(end, start));
      const normal = vec2(-dir.y, dir.x);
      edges.push({ start, end, normal });
    }
    return edges;
  }

  contains(p: Vec2): boolean {
    let inside = false;
    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      const xi = this.vertices[i].x, yi = this.vertices[i].y;
      const xj = this.vertices[j].x, yj = this.vertices[j].y;
      if (((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  getCenter(): Vec2 {
    let cx = 0, cy = 0;
    for (const v of this.vertices) {
      cx += v.x;
      cy += v.y;
    }
    return vec2(cx / this.vertices.length, cy / this.vertices.length);
  }

  getTooltip(): string {
    const c = this.getCenter();
    return `反射镜\n位置: (${Math.round(c.x)}, ${Math.round(c.y)})\n边数: ${this.vertices.length}`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.vertices.length < 2) return;

    ctx.fillStyle = '#ADD8E680';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const edges = this.getEdges();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2;
    for (const e of edges) {
      ctx.beginPath();
      ctx.moveTo(e.start.x, e.start.y);
      ctx.lineTo(e.end.x, e.end.y);
      ctx.stroke();
    }
  }
}

export type LensType = 'convex' | 'concave';

export class Lens {
  type: 'lens' = 'lens';
  start: Vec2;
  end: Vec2;
  lensType: LensType;

  constructor(start: Vec2, end: Vec2, lensType: LensType = 'convex') {
    this.start = start;
    this.end = end;
    this.lensType = lensType;
  }

  getCenter(): Vec2 {
    return vec2((this.start.x + this.end.x) / 2, (this.start.y + this.end.y) / 2);
  }

  getDirection(): Vec2 {
    return vecNorm(vecSub(this.end, this.start));
  }

  getNormal(): Vec2 {
    const d = this.getDirection();
    return vec2(-d.y, d.x);
  }

  getLength(): number {
    return vecDist(this.start, this.end);
  }

  contains(p: Vec2, threshold: number = 10): boolean {
    const lineVec = vecSub(this.end, this.start);
    const pointVec = vecSub(p, this.start);
    const lineLen = vecLen(lineVec);
    const t = Math.max(0, Math.min(1, vecDot(pointVec, lineVec) / (lineLen * lineLen)));
    const proj = vecAdd(this.start, vecMul(lineVec, t));
    return vecDist(p, proj) < threshold;
  }

  getFocalLength(): number {
    return 80;
  }

  getTooltip(): string {
    const c = this.getCenter();
    return `透镜 (${this.lensType === 'convex' ? '凸透镜' : '凹透镜'})\n位置: (${Math.round(c.x)}, ${Math.round(c.y)})\n长度: ${Math.round(this.getLength())}px`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const center = this.getCenter();
    const dir = this.getDirection();
    const normal = this.getNormal();
    const halfLen = this.getLength() / 2;
    const bulge = this.lensType === 'convex' ? 15 : -15;

    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.quadraticCurveTo(
      center.x + normal.x * bulge,
      center.y + normal.y * bulge,
      this.end.x,
      this.end.y
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.quadraticCurveTo(
      center.x - normal.x * bulge,
      center.y - normal.y * bulge,
      this.end.x,
      this.end.y
    );
    ctx.stroke();

    ctx.strokeStyle = '#ADD8E640';
    ctx.fillStyle = '#ADD8E630';
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.quadraticCurveTo(
      center.x + normal.x * bulge,
      center.y + normal.y * bulge,
      this.end.x,
      this.end.y
    );
    ctx.quadraticCurveTo(
      center.x - normal.x * bulge,
      center.y - normal.y * bulge,
      this.start.x,
      this.start.y
    );
    ctx.fill();

    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();

    ctx.setLineDash([4, 4]);
    const perp = this.getNormal();
    ctx.beginPath();
    ctx.moveTo(center.x - perp.x * 8, center.y - perp.y * 8);
    ctx.lineTo(center.x + perp.x * 8, center.y + perp.y * 8);
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowSign = this.lensType === 'convex' ? 1 : -1;
    const tip = vecAdd(center, vecMul(perp, 20 * arrowSign));
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tip.x - dir.x * 5, tip.y - dir.y * 5);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x + dir.y * 5, tip.y - dir.x * 5);
    ctx.stroke();
  }
}

export type OpticsElement = LightSource | Mirror | Lens;
