export interface Point {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

export interface Constraint {
  p1: number;
  p2: number;
  length: number;
  stiffness: number;
}

export class PhysicsEngine {
  public points: Point[] = [];
  public constraints: Constraint[] = [];
  public gravity: number = 0.5;
  public friction: number = 0.99;
  public iterationCount: number = 8;
  public bounds: { width: number; height: number } = { width: 0, height: 0 };

  private draggedPoint: number | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  public initRope(numPoints: number, startX: number, startY: number, segmentLength: number): void {
    this.points = [];
    this.constraints = [];

    for (let i = 0; i < numPoints; i++) {
      this.points.push({
        x: startX + i * segmentLength,
        y: startY,
        oldX: startX + i * segmentLength,
        oldY: startY,
        pinned: false
      });
    }

    for (let i = 0; i < numPoints - 1; i++) {
      this.constraints.push({
        p1: i,
        p2: i + 1,
        length: segmentLength,
        stiffness: 1.0
      });
    }
  }

  public getTotalLength(): number {
    let total = 0;
    for (const c of this.constraints) {
      const dx = this.points[c.p2].x - this.points[c.p1].x;
      const dy = this.points[c.p2].y - this.points[c.p1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  public setPinned(index: number, pinned: boolean): void {
    if (index >= 0 && index < this.points.length) {
      this.points[index].pinned = pinned;
    }
  }

  public togglePinned(index: number): boolean {
    if (index >= 0 && index < this.points.length) {
      this.points[index].pinned = !this.points[index].pinned;
      return this.points[index].pinned;
    }
    return false;
  }

  public isPinned(index: number): boolean {
    return this.points[index]?.pinned ?? false;
  }

  public startDrag(index: number, x: number, y: number): void {
    this.draggedPoint = index;
    this.mouseX = x;
    this.mouseY = y;
  }

  public updateDrag(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public endDrag(): void {
    this.draggedPoint = null;
  }

  public isDragging(): boolean {
    return this.draggedPoint !== null;
  }

  public findNearestPoint(x: number, y: number, maxDist: number = 20): number {
    let nearest = -1;
    let minDist = maxDist;

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i].x - x;
      const dy = this.points[i].y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  public isEndpoint(index: number): boolean {
    return index === 0 || index === this.points.length - 1;
  }

  public update(): void {
    if (this.draggedPoint !== null) {
      const p = this.points[this.draggedPoint];
      p.x = this.mouseX;
      p.y = this.mouseY;
      p.oldX = this.mouseX;
      p.oldY = this.mouseY;
    }

    for (const p of this.points) {
      if (p.pinned) continue;

      const vx = (p.x - p.oldX) * this.friction;
      const vy = (p.y - p.oldY) * this.friction;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx;
      p.y += vy + this.gravity;
    }

    for (let iter = 0; iter < this.iterationCount; iter++) {
      this.satisfyConstraints();
      this.enforceBounds();
    }
  }

  private satisfyConstraints(): void {
    for (const c of this.constraints) {
      const p1 = this.points[c.p1];
      const p2 = this.points[c.p2];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) continue;

      const diff = (c.length - dist) / dist * c.stiffness;
      const offsetX = dx * 0.5 * diff;
      const offsetY = dy * 0.5 * diff;

      if (!p1.pinned && this.draggedPoint !== c.p1) {
        p1.x -= offsetX;
        p1.y -= offsetY;
      }
      if (!p2.pinned && this.draggedPoint !== c.p2) {
        p2.x += offsetX;
        p2.y += offsetY;
      }
    }
  }

  private enforceBounds(): void {
    for (const p of this.points) {
      if (p.pinned) continue;

      if (p.x < 5) { p.x = 5; p.oldX = p.x; }
      if (p.x > this.bounds.width - 5) { p.x = this.bounds.width - 5; p.oldX = p.x; }
      if (p.y < 5) { p.y = 5; p.oldY = p.y; }
      if (p.y > this.bounds.height - 5) { p.y = this.bounds.height - 5; p.oldY = p.y; }
    }
  }

  public reset(numPoints: number, startX: number, startY: number, segmentLength: number): void {
    this.draggedPoint = null;
    this.initRope(numPoints, startX, startY, segmentLength);
  }
}
