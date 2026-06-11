export interface RunePoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export interface RuneSegment {
  start: RunePoint;
  end: RunePoint;
  graphics: Phaser.GameObjects.Graphics;
}

export enum CoreState {
  INACTIVE = 'inactive',
  ACTIVATING = 'activating',
  ACTIVE = 'active'
}

export class Rune {
  public points: RunePoint[] = [];
  public segments: RuneSegment[] = [];
  public isClosed: boolean = false;
  public isValid: boolean = false;

  private scene: Phaser.Scene;
  private gridOriginX: number;
  private gridOriginY: number;
  private gridSize: number;
  private cellSize: number;
  private snapDistance: number;

  constructor(
    scene: Phaser.Scene,
    gridOriginX: number,
    gridOriginY: number,
    gridSize: number,
    cellSize: number,
    snapDistance: number
  ) {
    this.scene = scene;
    this.gridOriginX = gridOriginX;
    this.gridOriginY = gridOriginY;
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.snapDistance = snapDistance;
  }

  public snapToGrid(x: number, y: number): RunePoint | null {
    const totalSize = this.gridSize * this.cellSize;
    const endX = this.gridOriginX + totalSize;
    const endY = this.gridOriginY + totalSize;

    if (x < this.gridOriginX || x > endX || y < this.gridOriginY || y > endY) {
      return null;
    }

    const relativeX = x - this.gridOriginX;
    const relativeY = y - this.gridOriginY;

    let gridX = Math.round(relativeX / this.cellSize);
    let gridY = Math.round(relativeY / this.cellSize);

    gridX = Phaser.Math.Clamp(gridX, 0, this.gridSize);
    gridY = Phaser.Math.Clamp(gridY, 0, this.gridSize);

    const snappedX = this.gridOriginX + gridX * this.cellSize;
    const snappedY = this.gridOriginY + gridY * this.cellSize;

    const distance = Phaser.Math.Distance.Between(x, y, snappedX, snappedY);

    if (distance <= this.snapDistance) {
      return { x: snappedX, y: snappedY, gridX, gridY };
    }

    return null;
  }

  public addPoint(point: RunePoint): void {
    const exists = this.points.some(
      p => p.gridX === point.gridX && p.gridY === point.gridY
    );

    if (!exists) {
      this.points.push(point);
    }
  }

  public addSegment(start: RunePoint, end: RunePoint): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xd4af37, 1);
    graphics.beginPath();
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(end.x, end.y);
    graphics.strokePath();

    this.segments.push({ start, end, graphics });
  }

  public createTempSegment(start: RunePoint, end: RunePoint): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    this.drawGlowingLine(graphics, start.x, start.y, end.x, end.y);
    return graphics;
  }

  public updateTempSegment(
    graphics: Phaser.GameObjects.Graphics,
    start: RunePoint,
    endX: number,
    endY: number
  ): void {
    graphics.clear();
    this.drawGlowingLine(graphics, start.x, start.y, endX, endY);
  }

  private drawGlowingLine(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    graphics.lineStyle(19, 0xa0c4ff, 0.15);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();

    graphics.lineStyle(11, 0xa0c4ff, 0.3);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();

    graphics.lineStyle(5, 0xa0c4ff, 0.6);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();

    graphics.lineStyle(3, 0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();
  }

  public checkClosed(): boolean {
    if (this.points.length < 2) return false;

    const first = this.points[0];
    const last = this.points[this.points.length - 1];

    this.isClosed = first.gridX === last.gridX && first.gridY === last.gridY;
    return this.isClosed;
  }

  public getUniquePointCount(): number {
    const unique = new Set<string>();
    this.points.forEach(p => unique.add(`${p.gridX},${p.gridY}`));
    return unique.size;
  }

  public validate(): boolean {
    this.isValid = this.checkClosed() && this.getUniquePointCount() >= 6;
    return this.isValid;
  }

  public flashInvalid(): void {
    this.segments.forEach((segment, index) => {
      const originalAlpha = segment.graphics.alpha;
      
      this.scene.tweens.add({
        targets: segment.graphics,
        alpha: 0,
        duration: 150,
        yoyo: true,
        repeat: 1,
        delay: index * 30,
        onStart: () => {
          segment.graphics.clear();
          segment.graphics.lineStyle(3, 0xff6b6b, 1);
          segment.graphics.beginPath();
          segment.graphics.moveTo(segment.start.x, segment.start.y);
          segment.graphics.lineTo(segment.end.x, segment.end.y);
          segment.graphics.strokePath();
        },
        onComplete: () => {
          segment.graphics.alpha = originalAlpha;
        }
      });
    });
  }

  public clear(): void {
    this.segments.forEach(s => s.graphics.destroy());
    this.points = [];
    this.segments = [];
    this.isClosed = false;
    this.isValid = false;
  }

  public destroy(): void {
    this.clear();
  }
}
