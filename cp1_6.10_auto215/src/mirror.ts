export type MirrorShape = 'triangle' | 'square';

export interface MirrorConfig {
  shape: MirrorShape;
  x: number;
  y: number;
  rotation: number;
  size: number;
  rotationSensitivity: number;
}

export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nx: number;
  ny: number;
}

const COLORS: Record<MirrorShape, string> = {
  triangle: '#ff6b8a',
  square: '#4fc3f7',
};

export class Mirror {
  public shape: MirrorShape;
  public x: number;
  public y: number;
  public rotation: number;
  public targetRotation: number;
  public size: number;
  public rotationSensitivity: number;
  public color: string;

  public targetX: number;
  public targetY: number;
  public isDragging: boolean;
  public dragSpring: number;
  public flashAlpha: number;
  public initialX: number;
  public initialY: number;
  public initialRotation: number;

  constructor(config: MirrorConfig) {
    this.shape = config.shape;
    this.x = config.x;
    this.y = config.y;
    this.rotation = config.rotation;
    this.targetRotation = config.rotation;
    this.size = config.size;
    this.rotationSensitivity = config.rotationSensitivity;
    this.color = COLORS[config.shape];

    this.targetX = config.x;
    this.targetY = config.y;
    this.isDragging = false;
    this.dragSpring = 0;
    this.flashAlpha = 0;
    this.initialX = config.x;
    this.initialY = config.y;
    this.initialRotation = config.rotation;
  }

  private getLocalVertices(): { x: number; y: number }[] {
    const s = this.size;
    if (this.shape === 'triangle') {
      const h = (s * Math.sqrt(3)) / 2;
      return [
        { x: 0, y: -h * 0.67 },
        { x: -s / 2, y: h * 0.33 },
        { x: s / 2, y: h * 0.33 },
      ];
    } else {
      const half = s / 2;
      return [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half },
      ];
    }
  }

  public getWorldVertices(): { x: number; y: number }[] {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return this.getLocalVertices().map((v) => ({
      x: this.x + v.x * cos - v.y * sin,
      y: this.y + v.x * sin + v.y * cos,
    }));
  }

  public getEdges(): Edge[] {
    const verts = this.getWorldVertices();
    const edges: Edge[] = [];
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      edges.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        nx: -dy / len,
        ny: dx / len,
      });
    }
    return edges;
  }

  public containsPoint(px: number, py: number): boolean {
    const verts = this.getWorldVertices();
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public startDrag(mx: number, my: number): void {
    this.isDragging = true;
    this.targetX = mx;
    this.targetY = my;
  }

  public updateDrag(mx: number, my: number): void {
    if (this.isDragging) {
      this.targetX = mx;
      this.targetY = my;
      this.dragSpring = 1;
    }
  }

  public endDrag(): void {
    this.isDragging = false;
  }

  public rotateRight(): void {
    this.targetRotation += (this.rotationSensitivity * Math.PI) / 180;
    this.flashAlpha = 1;
  }

  public reset(): void {
    this.targetX = this.initialX;
    this.targetY = this.initialY;
    this.targetRotation = this.initialRotation;
    this.dragSpring = 1;
  }

  public update(dt: number): void {
    const springSpeed = 8;
    this.x += (this.targetX - this.x) * Math.min(1, springSpeed * dt);
    this.y += (this.targetY - this.y) * Math.min(1, springSpeed * dt);

    while (this.targetRotation - this.rotation > Math.PI) this.rotation += Math.PI * 2;
    while (this.targetRotation - this.rotation < -Math.PI) this.rotation -= Math.PI * 2;
    this.rotation += (this.targetRotation - this.rotation) * Math.min(1, springSpeed * dt);

    this.dragSpring = Math.max(0, this.dragSpring - dt * 3);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const verts = this.getWorldVertices();

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = this.color + '33';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha * 0.6;
      ctx.shadowBlur = 40;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

export class MirrorManager {
  public mirrors: Mirror[];
  private canvasWidth: number;
  private canvasHeight: number;
  public rotationSensitivity: number;
  public draggingMirror: Mirror | null;

  constructor(canvasWidth: number, canvasHeight: number, rotationSensitivity: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.rotationSensitivity = rotationSensitivity;
    this.mirrors = [];
    this.draggingMirror = null;
    this.generateMirrors();
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private generateMirrors(): void {
    this.mirrors = [];
    const count = 4 + Math.floor(Math.random() * 3);
    const controlPanelW = 200;
    const minX = controlPanelW + 100;
    const maxX = this.canvasWidth - 150;
    const minY = 100;
    const maxY = this.canvasHeight - 150;

    for (let i = 0; i < count; i++) {
      const shape: MirrorShape = Math.random() < 0.5 ? 'triangle' : 'square';
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      const rotation = Math.random() * Math.PI * 2;
      const size = 70 + Math.random() * 30;
      this.mirrors.push(
        new Mirror({
          shape,
          x,
          y,
          rotation,
          size,
          rotationSensitivity: this.rotationSensitivity,
        })
      );
    }
  }

  public setRotationSensitivity(sens: number): void {
    this.rotationSensitivity = sens;
    this.mirrors.forEach((m) => (m.rotationSensitivity = sens));
  }

  public getMirrorAt(x: number, y: number): Mirror | null {
    for (let i = this.mirrors.length - 1; i >= 0; i--) {
      if (this.mirrors[i].containsPoint(x, y)) {
        return this.mirrors[i];
      }
    }
    return null;
  }

  public handleMouseDown(x: number, y: number, button: number): boolean {
    const mirror = this.getMirrorAt(x, y);
    if (!mirror) return false;

    if (button === 0) {
      this.draggingMirror = mirror;
      mirror.startDrag(x, y);
      const idx = this.mirrors.indexOf(mirror);
      if (idx >= 0) {
        this.mirrors.splice(idx, 1);
        this.mirrors.push(mirror);
      }
      return true;
    } else if (button === 2) {
      mirror.rotateRight();
      return true;
    }
    return false;
  }

  public handleMouseMove(x: number, y: number): void {
    if (this.draggingMirror) {
      this.draggingMirror.updateDrag(x, y);
    }
  }

  public handleMouseUp(): void {
    if (this.draggingMirror) {
      this.draggingMirror.endDrag();
      this.draggingMirror = null;
    }
  }

  public reset(): void {
    this.mirrors.forEach((m) => m.reset());
  }

  public update(dt: number): void {
    this.mirrors.forEach((m) => m.update(dt));
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.mirrors.forEach((m) => m.render(ctx));
  }
}
