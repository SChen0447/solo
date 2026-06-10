import type p5 from 'p5';

export interface Vertex {
  x: number;
  y: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

export class GlassPiece {
  vertices: Vertex[];
  position: Vertex;
  rotation: number;
  color: HSLColor;
  borderWidth: number;
  borderColor: string;
  selected: boolean;
  dragging: boolean;
  dragOffset: Vertex;
  _cachedWorldVertices: Vertex[] | null;
  _cacheKey: string;

  constructor(
    vertices: Vertex[],
    position: Vertex,
    color: HSLColor,
    rotation: number = 0
  ) {
    this.vertices = vertices;
    this.position = { ...position };
    this.rotation = rotation;
    this.color = { ...color };
    this.borderWidth = 1;
    this.borderColor = '#000000';
    this.selected = false;
    this.dragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this._cachedWorldVertices = null;
    this._cacheKey = '';
  }

  private _getCacheKey(): string {
    return `${this.position.x},${this.position.y},${this.rotation},${this.vertices.length}`;
  }

  getWorldVertices(): Vertex[] {
    const key = this._getCacheKey();
    if (this._cachedWorldVertices && this._cacheKey === key) {
      return this._cachedWorldVertices;
    }

    const cosR = Math.cos(this.rotation);
    const sinR = Math.sin(this.rotation);
    const result: Vertex[] = this.vertices.map((v) => ({
      x: this.position.x + v.x * cosR - v.y * sinR,
      y: this.position.y + v.x * sinR + v.y * cosR,
    }));

    this._cachedWorldVertices = result;
    this._cacheKey = key;
    return result;
  }

  containsPoint(px: number, py: number): boolean {
    const verts = this.getWorldVertices();
    let inside = false;
    const n = verts.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = verts[i].x;
      const yi = verts[i].y;
      const xj = verts[j].x;
      const yj = verts[j].y;

      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-10) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  getNormalAngle(): number {
    const verts = this.vertices;
    let angleSum = 0;
    const n = verts.length;

    for (let i = 0; i < n; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % n];
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      angleSum += Math.atan2(-dx, dy);
    }

    return (angleSum / n) + this.rotation;
  }

  getCenter(): Vertex {
    return { ...this.position };
  }

  clone(offsetX: number = 20, offsetY: number = 20): GlassPiece {
    const newPiece = new GlassPiece(
      this.vertices.map((v) => ({ ...v })),
      { x: this.position.x + offsetX, y: this.position.y + offsetY },
      { ...this.color },
      this.rotation
    );
    return newPiece;
  }

  draw(p: p5, brightness: number = 1): void {
    const verts = this.getWorldVertices();
    if (verts.length < 3) return;

    const color = this.color;
    const adjustedL = Math.min(100, color.l * brightness);

    p.push();
    p.noStroke();
    p.fill(color.h, color.s, adjustedL, color.a * 255);

    p.beginShape();
    for (const v of verts) {
      p.vertex(v.x, v.y);
    }
    p.endShape(p.CLOSE);

    if (this.borderWidth > 0) {
      p.stroke(this.borderColor);
      p.strokeWeight(this.borderWidth);
      p.noFill();
      p.beginShape();
      for (const v of verts) {
        p.vertex(v.x, v.y);
      }
      p.endShape(p.CLOSE);
    }

    if (this.selected) {
      p.stroke(255, 255, 100, 200);
      p.strokeWeight(2);
      p.noFill();
      p.beginShape();
      for (const v of verts) {
        p.vertex(v.x, v.y);
      }
      p.endShape(p.CLOSE);
    }

    p.pop();
  }

  static generateRandom(
    boundsX: number,
    boundsY: number,
    boundsW: number,
    boundsH: number
  ): GlassPiece {
    const sideCount = 3 + Math.floor(Math.random() * 3);
    const vertexCount = sideCount + Math.floor(Math.random() * Math.max(1, sideCount - 2));
    const actualVertices = Math.max(4, Math.min(8, vertexCount));

    const avgRadius = 20 + Math.random() * 35;
    const centerX = 0;
    const centerY = 0;
    const vertices: Vertex[] = [];

    for (let i = 0; i < actualVertices; i++) {
      const angle = (i / actualVertices) * Math.PI * 2 + Math.random() * 0.3;
      const radius = avgRadius * (0.6 + Math.random() * 0.6);
      vertices.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }

    const margin = avgRadius + 10;
    const position: Vertex = {
      x: boundsX + margin + Math.random() * (boundsW - margin * 2),
      y: boundsY + margin + 30 + Math.random() * (boundsH - margin * 2 - 30),
    };

    const archTopY = boundsY + boundsW / 2;
    const centerWinX = boundsX + boundsW / 2;
    const dx = position.x - centerWinX;
    const dy = position.y - archTopY;
    const distFromArchCenter = Math.sqrt(dx * dx + dy * dy);
    if (position.y < archTopY && distFromArchCenter > boundsW / 2 - margin) {
      position.x = centerWinX + (Math.random() - 0.5) * (boundsW / 2 - margin) * 0.5;
      position.y = archTopY + Math.random() * (boundsH - margin - archTopY + boundsY);
    }

    const color: HSLColor = {
      h: Math.floor(Math.random() * 360),
      s: 70 + Math.random() * 20,
      l: 50 + Math.random() * 20,
      a: 0.6 + Math.random() * 0.3,
    };

    const rotation = Math.random() * Math.PI * 2;

    return new GlassPiece(vertices, position, color, rotation);
  }
}
