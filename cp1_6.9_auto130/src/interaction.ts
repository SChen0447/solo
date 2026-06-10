import p5 from 'p5';
import { Geometry, randomShape, randomColor, ShapeType } from './geometry';
import { shiftHue } from './colorBlend';

export const MAX_GEOMETRIES = 30;

export class InteractionManager {
  geometries: Geometry[] = [];
  selectedGeometry: Geometry | null = null;
  private draggingGeometry: Geometry | null = null;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private onSelectionChange: ((geo: Geometry | null) => void) | null = null;

  constructor() {}

  setSelectionCallback(cb: (geo: Geometry | null) => void): void {
    this.onSelectionChange = cb;
  }

  initialize(count: number, canvasWidth: number, canvasHeight: number): void {
    for (let i = 0; i < count; i++) {
      const geo = new Geometry({
        x: Math.random() * (canvasWidth - 200) + 100,
        y: Math.random() * (canvasHeight - 200) + 100,
        size: 30 + Math.random() * 30,
        rotation: Math.random() * Math.PI * 2,
        color: randomColor(),
        alpha: 0.6 + Math.random() * 0.3,
        shape: randomShape()
      });
      this.geometries.push(geo);
    }
  }

  handleMousePressed(p: p5, shiftPressed: boolean): void {
    this.prevMouseX = p.mouseX;
    this.prevMouseY = p.mouseY;

    const clickedGeo = this.findGeometryAt(p.mouseX, p.mouseY);

    if (shiftPressed && clickedGeo) {
      this.selectGeometry(clickedGeo);
    } else if (clickedGeo) {
      this.draggingGeometry = clickedGeo;
      clickedGeo.startDrag();
      this.selectGeometry(clickedGeo);
    } else {
      this.createGeometry(p.mouseX, p.mouseY);
      if (!shiftPressed) {
        this.deselectAll();
      }
    }
  }

  handleMouseDragged(p: p5): void {
    if (this.draggingGeometry) {
      this.draggingGeometry.updateDragPosition(
        p.mouseX,
        p.mouseY,
        this.prevMouseX,
        this.prevMouseY
      );
    }
    this.prevMouseX = p.mouseX;
    this.prevMouseY = p.mouseY;
  }

  handleMouseReleased(p: p5): void {
    if (this.draggingGeometry) {
      const velocityX = p.mouseX - this.prevMouseX;
      const velocityY = p.mouseY - this.prevMouseY;
      this.draggingGeometry.endDrag(velocityX, velocityY);
      this.draggingGeometry = null;
    }
  }

  handleWheel(delta: number): void {
    if (this.selectedGeometry) {
      const rotationDelta = delta > 0 ? 5 : -5;
      this.selectedGeometry.rotateBy(rotationDelta);
      this.selectedGeometry.color = shiftHue(this.selectedGeometry.color, 15 * Math.sign(delta));
      if (this.onSelectionChange) {
        this.onSelectionChange(this.selectedGeometry);
      }
    }
  }

  private createGeometry(x: number, y: number): void {
    const shapes: ShapeType[] = ['square', 'triangle', 'pentagon'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    const geo = new Geometry({
      x,
      y,
      size: 40 + Math.random() * 40,
      rotation: Math.random() * Math.PI * 2,
      color: randomColor(),
      alpha: 0.7,
      shape
    });
    geo.playSpawnAnimation();

    if (this.geometries.length >= MAX_GEOMETRIES) {
      this.geometries.shift();
    }
    this.geometries.push(geo);
  }

  private findGeometryAt(x: number, y: number): Geometry | null {
    for (let i = this.geometries.length - 1; i >= 0; i--) {
      if (this.geometries[i].containsPoint(x, y)) {
        return this.geometries[i];
      }
    }
    return null;
  }

  private selectGeometry(geo: Geometry): void {
    this.geometries.forEach(g => (g.isSelected = false));
    geo.isSelected = true;
    this.selectedGeometry = geo;
    if (this.onSelectionChange) {
      this.onSelectionChange(geo);
    }
  }

  private deselectAll(): void {
    this.geometries.forEach(g => (g.isSelected = false));
    this.selectedGeometry = null;
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }

  findOverlapping(geo: Geometry): Geometry[] {
    const overlapping: Geometry[] = [];
    for (const other of this.geometries) {
      if (other.id === geo.id) continue;
      const dx = geo.x - other.x;
      const dy = geo.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (geo.size + other.size) * 0.6;
      if (dist < minDist) {
        overlapping.push(other);
      }
    }
    return overlapping;
  }

  updateAll(): void {
    this.geometries.forEach(g => g.update());
  }

  drawAll(p: p5): void {
    this.geometries.forEach(geo => {
      const overlapping = this.findOverlapping(geo);
      geo.draw(p, overlapping);
    });
  }

  getCount(): number {
    return this.geometries.length;
  }
}
