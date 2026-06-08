import {
  Shape,
  ShapeType,
  createRect,
  createCircle,
  createTriangle,
  createStar,
  createText,
  drawShape,
  drawSelectionHandles,
  getRotationHandlePosition,
  isPointInShape,
  isPointOnHandle,
  isPointOnRotationHandle,
  getHandlePositions,
  updateTextSize,
  TextShape,
} from './shape';

type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

interface AnimationState {
  shapes: Map<string, {
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
    startOpacity: number;
    targetX: number;
    targetY: number;
    targetWidth: number;
    targetHeight: number;
    targetRotation: number;
    targetOpacity: number;
    startTime: number;
    duration: number;
    onComplete?: () => void;
  }>;
}

export class CanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shapes: Shape[] = [];
  private selectedIds: string[] = [];
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private gridSize = 20;
  private showGrid = false;
  private isDragging = false;
  private isResizing = false;
  private isRotating = false;
  private isPanning = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private shapeStartX = 0;
  private shapeStartY = 0;
  private shapeStartWidth = 0;
  private shapeStartHeight = 0;
  private shapeStartRotation = 0;
  private resizeHandleIndex = -1;
  private spacePressed = false;
  private shiftPressed = false;
  private animationId: number | null = null;
  private animationState: AnimationState = { shapes: new Map() };
  private zIndexCounter = 0;
  private listeners: {
    onSelectionChange?: (shapes: Shape[]) => void;
    onShapesChange?: (shapes: Shape[]) => void;
  } = {};

  private lastFrameTime = 0;
  private fps = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
    this.bindEvents();
    this.startRenderLoop();
  }

  private resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(dpr, dpr);
    this.requestRender();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resize();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spacePressed = true;
      this.canvas.style.cursor = 'grab';
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.shiftPressed = true;
    }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (this.selectedIds.length > 0) {
        this.deleteSelectedShapes();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spacePressed = false;
      this.canvas.style.cursor = 'default';
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.shiftPressed = false;
    }
  };

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.offsetX) / this.scale,
      y: (sy - rect.top - this.offsetY) / this.scale,
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const { x, y } = this.screenToWorld(e.clientX, e.clientY);

    if (this.spacePressed) {
      this.isPanning = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.selectedIds.length === 1) {
      const selectedShape = this.getShapeById(this.selectedIds[0]);
      if (selectedShape) {
        if (isPointOnRotationHandle(selectedShape, x, y, this.scale)) {
          this.isRotating = true;
          this.shapeStartRotation = selectedShape.rotation;
          this.dragStartX = x;
          this.dragStartY = y;
          return;
        }

        const handleResult = isPointOnHandle(selectedShape, x, y, this.scale);
        if (handleResult.hit) {
          this.isResizing = true;
          this.resizeHandleIndex = handleResult.index;
          this.shapeStartX = selectedShape.x;
          this.shapeStartY = selectedShape.y;
          this.shapeStartWidth = selectedShape.width;
          this.shapeStartHeight = selectedShape.height;
          this.dragStartX = x;
          this.dragStartY = y;
          return;
        }
      }
    }

    const clickedShape = this.getShapeAtPoint(x, y);

    if (clickedShape) {
      if (this.shiftPressed) {
        if (this.selectedIds.includes(clickedShape.id)) {
          this.selectedIds = this.selectedIds.filter((id) => id !== clickedShape.id);
        } else {
          this.selectedIds.push(clickedShape.id);
        }
      } else {
        if (!this.selectedIds.includes(clickedShape.id)) {
          this.selectedIds = [clickedShape.id];
        }
        this.isDragging = true;
        this.shapeStartX = clickedShape.x;
        this.shapeStartY = clickedShape.y;
        this.dragStartX = x;
        this.dragStartY = y;
        this.showGrid = true;
      }
      this.bringToFront(clickedShape.id);
    } else {
      if (!this.shiftPressed) {
        this.selectedIds = [];
      }
    }

    this.notifySelectionChange();
    this.requestRender();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.screenToWorld(e.clientX, e.clientY);

    if (this.isPanning) {
      this.offsetX += e.clientX - this.dragStartX;
      this.offsetY += e.clientY - this.dragStartY;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.requestRender();
      return;
    }

    if (this.isRotating && this.selectedIds.length === 1) {
      const shape = this.getShapeById(this.selectedIds[0]);
      if (shape) {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const angleStart = Math.atan2(this.dragStartY - cy, this.dragStartX - cx);
        const angleEnd = Math.atan2(y - cy, x - cx);
        const angleDelta = ((angleEnd - angleStart) * 180) / Math.PI;
        shape.rotation = this.shapeStartRotation + angleDelta;
        if (this.shiftPressed) {
          shape.rotation = Math.round(shape.rotation / 15) * 15;
        }
        this.notifyShapesChange();
        this.requestRender();
      }
      return;
    }

    if (this.isResizing && this.selectedIds.length === 1) {
      const shape = this.getShapeById(this.selectedIds[0]);
      if (shape) {
        this.resizeShape(shape, x, y);
        this.notifyShapesChange();
        this.requestRender();
      }
      return;
    }

    if (this.isDragging && this.selectedIds.length > 0) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;

      for (const id of this.selectedIds) {
        const shape = this.getShapeById(id);
        if (shape) {
          shape.x = this.shapeStartX + dx;
          shape.y = this.shapeStartY + dy;
          if (this.shiftPressed) {
            if (Math.abs(dx) > Math.abs(dy)) {
              shape.y = this.shapeStartY;
            } else {
              shape.x = this.shapeStartX;
            }
          }
        }
      }
      this.notifyShapesChange();
      this.requestRender();
      return;
    }

    this.updateCursor(x, y);
  };

  private handleMouseUp = (): void => {
    if (this.isDragging) {
      this.snapSelectedToGrid();
      this.showGrid = false;
    }

    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.isPanning = false;
    this.resizeHandleIndex = -1;

    if (this.spacePressed) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }

    this.requestRender();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, this.scale * delta));

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.offsetX = mouseX - ((mouseX - this.offsetX) * newScale) / this.scale;
    this.offsetY = mouseY - ((mouseY - this.offsetY) * newScale) / this.scale;

    this.scale = newScale;
    this.requestRender();
  };

  private handleDoubleClick = (e: MouseEvent): void => {
    const { x, y } = this.screenToWorld(e.clientX, e.clientY);
    const clickedShape = this.getShapeAtPoint(x, y);

    if (clickedShape && clickedShape.type === 'text') {
      this.selectedIds = [clickedShape.id];
      this.notifySelectionChange();
      this.editText(clickedShape.id);
    }
  };

  private resizeShape(shape: Shape, mouseX: number, mouseY: number): void {
    const handles = getHandlePositions(shape);
    const handle = handles[this.resizeHandleIndex];

    const dx = mouseX - this.dragStartX;
    const dy = mouseY - this.dragStartY;

    let newX = this.shapeStartX;
    let newY = this.shapeStartY;
    let newWidth = this.shapeStartWidth;
    let newHeight = this.shapeStartHeight;

    const aspectRatio = this.shapeStartWidth / this.shapeStartHeight;

    switch (this.resizeHandleIndex) {
      case 0:
        newX = this.shapeStartX + dx;
        newY = this.shapeStartY + dy;
        newWidth = this.shapeStartWidth - dx;
        newHeight = this.shapeStartHeight - dy;
        break;
      case 1:
        newY = this.shapeStartY + dy;
        newHeight = this.shapeStartHeight - dy;
        break;
      case 2:
        newY = this.shapeStartY + dy;
        newWidth = this.shapeStartWidth + dx;
        newHeight = this.shapeStartHeight - dy;
        break;
      case 3:
        newWidth = this.shapeStartWidth + dx;
        break;
      case 4:
        newWidth = this.shapeStartWidth + dx;
        newHeight = this.shapeStartHeight + dy;
        break;
      case 5:
        newHeight = this.shapeStartHeight + dy;
        break;
      case 6:
        newX = this.shapeStartX + dx;
        newWidth = this.shapeStartWidth - dx;
        newHeight = this.shapeStartHeight + dy;
        break;
      case 7:
        newX = this.shapeStartX + dx;
        newWidth = this.shapeStartWidth - dx;
        break;
    }

    if (this.shiftPressed) {
      if (Math.abs(newWidth / newHeight - aspectRatio) > 0.01) {
        if (Math.abs(newWidth - this.shapeStartWidth) > Math.abs(newHeight - this.shapeStartHeight)) {
          newHeight = newWidth / aspectRatio;
          if (this.resizeHandleIndex === 0 || this.resizeHandleIndex === 1 || this.resizeHandleIndex === 2) {
            newY = this.shapeStartY + this.shapeStartHeight - newHeight;
          }
        } else {
          newWidth = newHeight * aspectRatio;
          if (this.resizeHandleIndex === 0 || this.resizeHandleIndex === 6 || this.resizeHandleIndex === 7) {
            newX = this.shapeStartX + this.shapeStartWidth - newWidth;
          }
        }
      }
    }

    if (newWidth < 10) {
      newX = this.shapeStartX + this.shapeStartWidth - 10;
      newWidth = 10;
    }
    if (newHeight < 10) {
      newY = this.shapeStartY + this.shapeStartHeight - 10;
      newHeight = 10;
    }

    shape.x = newX;
    shape.y = newY;
    shape.width = newWidth;
    shape.height = newHeight;
  }

  private snapSelectedToGrid(): void {
    for (const id of this.selectedIds) {
      const shape = this.getShapeById(id);
      if (shape) {
        shape.x = Math.round(shape.x / this.gridSize) * this.gridSize;
        shape.y = Math.round(shape.y / this.gridSize) * this.gridSize;
      }
    }
  }

  private getShapeAtPoint(x: number, y: number): Shape | null {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(this.shapes[i], x, y)) {
        return this.shapes[i];
      }
    }
    return null;
  }

  private getShapeById(id: string): Shape | undefined {
    return this.shapes.find((s) => s.id === id);
  }

  private updateCursor(x: number, y: number): void {
    if (this.spacePressed) {
      this.canvas.style.cursor = 'grab';
      return;
    }

    if (this.selectedIds.length === 1) {
      const shape = this.getShapeById(this.selectedIds[0]);
      if (shape) {
        if (isPointOnRotationHandle(shape, x, y, this.scale)) {
          this.canvas.style.cursor = 'grab';
          return;
        }
        const handleResult = isPointOnHandle(shape, x, y, this.scale);
        if (handleResult.hit) {
          const handles = getHandlePositions(shape);
          this.canvas.style.cursor = handles[handleResult.index].cursor;
          return;
        }
      }
    }

    const shape = this.getShapeAtPoint(x, y);
    this.canvas.style.cursor = shape ? 'move' : 'default';
  }

  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      this.fps = 1000 / (timestamp - this.lastFrameTime);
      this.lastFrameTime = timestamp;
      this.updateAnimations(timestamp);
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  private updateAnimations(timestamp: number): void {
    let needsRender = false;

    for (const [id, anim] of this.animationState.shapes) {
      const elapsed = timestamp - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);

      if (progress < 1) {
        const eased = this.easeOutCubic(progress);
        const shape = this.getShapeById(id);
        if (shape) {
          shape.x = anim.startX + (anim.targetX - anim.startX) * eased;
          shape.y = anim.startY + (anim.targetY - anim.startY) * eased;
          shape.width = anim.startWidth + (anim.targetWidth - anim.startWidth) * eased;
          shape.height = anim.startHeight + (anim.targetHeight - anim.startHeight) * eased;
          shape.rotation = anim.startRotation + (anim.targetRotation - anim.startRotation) * eased;
          shape.opacity = anim.startOpacity + (anim.targetOpacity - anim.startOpacity) * eased;
        }
        needsRender = true;
      } else {
        const shape = this.getShapeById(id);
        if (shape) {
          shape.x = anim.targetX;
          shape.y = anim.targetY;
          shape.width = anim.targetWidth;
          shape.height = anim.targetHeight;
          shape.rotation = anim.targetRotation;
          shape.opacity = anim.targetOpacity;
        }
        this.animationState.shapes.delete(id);
        if (anim.onComplete) {
          anim.onComplete();
        }
        needsRender = true;
      }
    }

    if (needsRender) {
      this.notifyShapesChange();
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    if (this.showGrid) {
      this.drawGrid(ctx);
    }

    const sortedShapes = [...this.shapes].sort((a, b) => a.zIndex - b.zIndex);
    for (const shape of sortedShapes) {
      drawShape(ctx, shape);
    }

    for (const id of this.selectedIds) {
      const shape = this.getShapeById(id);
      if (shape) {
        drawSelectionHandles(ctx, shape, this.scale);
        this.drawRotationHandle(ctx, shape);
        this.drawRotationLabel(ctx, shape);
      }
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;

    const canvasRect = this.canvas.getBoundingClientRect();
    const startX = -this.offsetX / this.scale;
    const startY = -this.offsetY / this.scale;
    const endX = startX + canvasRect.width / this.scale;
    const endY = startY + canvasRect.height / this.scale;

    const gridStartX = Math.floor(startX / this.gridSize) * this.gridSize;
    const gridStartY = Math.floor(startY / this.gridSize) * this.gridSize;

    ctx.beginPath();
    for (let x = gridStartX; x <= endX; x += this.gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = gridStartY; y <= endY; y += this.gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  private drawRotationHandle(ctx: CanvasRenderingContext2D, shape: Shape): void {
    const handle = getRotationHandlePosition(shape);
    const handleSize = 12 / this.scale;

    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5 / this.scale;
    ctx.beginPath();
    ctx.moveTo(cx, shape.y);
    ctx.lineTo(cx, handle.y);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5 / this.scale;
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 3 / this.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRotationLabel(ctx: CanvasRenderingContext2D, shape: Shape): void {
    const cx = shape.x + shape.width / 2;
    const bottomY = shape.y + shape.height + 25 / this.scale;
    const label = `${Math.round(shape.rotation)}°`;

    ctx.save();

    ctx.font = '12px Arial';
    const textWidth = ctx.measureText(label).width;
    const padding = 6 / this.scale;
    const labelWidth = textWidth + padding * 2;
    const labelHeight = 20 / this.scale;

    const labelX = cx - labelWidth / 2;
    const labelY = bottomY - labelHeight / 2;

    ctx.fillStyle = 'rgba(74, 144, 217, 0.9)';
    const radius = 4 / this.scale;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, radius);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, bottomY);

    ctx.restore();
  }

  private requestRender(): void {
  }

  private bringToFront(id: string): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.zIndex = ++this.zIndexCounter;
    }
  }

  private notifySelectionChange(): void {
    if (this.listeners.onSelectionChange) {
      const selectedShapes = this.selectedIds
        .map((id) => this.getShapeById(id))
        .filter((s): s is Shape => s !== undefined);
      this.listeners.onSelectionChange(selectedShapes);
    }
  }

  private notifyShapesChange(): void {
    if (this.listeners.onShapesChange) {
      this.listeners.onShapesChange(this.shapes);
    }
  }

  addShape(type: ShapeType, x: number, y: number): Shape | null {
    let shape: Shape | null = null;
    const size = 80;

    switch (type) {
      case 'rect':
        shape = createRect(x - size / 2, y - size / 2, size, size * 0.75);
        break;
      case 'circle':
        shape = createCircle(x, y, size / 2);
        break;
      case 'triangle':
        shape = createTriangle(x - size / 2, y - size / 2, size, size);
        break;
      case 'star':
        shape = createStar(x, y, size / 2);
        break;
      case 'text':
        shape = createText(x - 50, y - 30);
        if (shape.type === 'text') {
          updateTextSize(this.ctx, shape);
        }
        break;
    }

    if (shape) {
      shape.zIndex = ++this.zIndexCounter;
      this.shapes.push(shape);
      this.selectedIds = [shape.id];
      this.notifySelectionChange();
      this.notifyShapesChange();
      this.requestRender();
    }

    return shape;
  }

  deleteShape(id: string): void {
    const shape = this.getShapeById(id);
    if (!shape) return;

    const anim = {
      startX: shape.x,
      startY: shape.y,
      startWidth: shape.width,
      startHeight: shape.height,
      startRotation: shape.rotation,
      startOpacity: shape.opacity,
      targetX: shape.x + shape.width / 2,
      targetY: shape.y + shape.height / 2,
      targetWidth: 0,
      targetHeight: 0,
      targetRotation: shape.rotation,
      targetOpacity: 0,
      startTime: performance.now(),
      duration: 300,
      onComplete: () => {
        this.shapes = this.shapes.filter((s) => s.id !== id);
        this.selectedIds = this.selectedIds.filter((sid) => sid !== id);
        this.notifySelectionChange();
        this.notifyShapesChange();
      },
    };

    this.animationState.shapes.set(id, anim);
  }

  deleteSelectedShapes(): void {
    for (const id of [...this.selectedIds]) {
      this.deleteShape(id);
    }
  }

  moveLayerUp(id: string): void {
    const shape = this.getShapeById(id);
    if (!shape) return;

    const sorted = [...this.shapes].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((s) => s.id === id);
    if (index < sorted.length - 1) {
      const nextShape = sorted[index + 1];
      const tempZ = shape.zIndex;
      shape.zIndex = nextShape.zIndex;
      nextShape.zIndex = tempZ;
    }
    this.notifyShapesChange();
    this.requestRender();
  }

  moveLayerDown(id: string): void {
    const shape = this.getShapeById(id);
    if (!shape) return;

    const sorted = [...this.shapes].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((s) => s.id === id);
    if (index > 0) {
      const prevShape = sorted[index - 1];
      const tempZ = shape.zIndex;
      shape.zIndex = prevShape.zIndex;
      prevShape.zIndex = tempZ;
    }
    this.notifyShapesChange();
    this.requestRender();
  }

  bringToFrontLayer(id: string): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.zIndex = ++this.zIndexCounter;
    }
    this.notifyShapesChange();
    this.requestRender();
  }

  sendToBackLayer(id: string): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.zIndex = --this.zIndexCounter;
    }
    this.notifyShapesChange();
    this.requestRender();
  }

  alignShapes(alignType: AlignType): void {
    if (this.selectedIds.length < 2) return;

    const selectedShapes = this.selectedIds
      .map((id) => this.getShapeById(id))
      .filter((s): s is Shape => s !== undefined);

    if (selectedShapes.length < 2) return;

    const minX = Math.min(...selectedShapes.map((s) => s.x));
    const maxX = Math.max(...selectedShapes.map((s) => s.x + s.width));
    const minY = Math.min(...selectedShapes.map((s) => s.y));
    const maxY = Math.max(...selectedShapes.map((s) => s.y + s.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const now = performance.now();

    for (const shape of selectedShapes) {
      let targetX = shape.x;
      let targetY = shape.y;

      switch (alignType) {
        case 'left':
          targetX = minX;
          break;
        case 'center-h':
          targetX = centerX - shape.width / 2;
          break;
        case 'right':
          targetX = maxX - shape.width;
          break;
        case 'top':
          targetY = minY;
          break;
        case 'center-v':
          targetY = centerY - shape.height / 2;
          break;
        case 'bottom':
          targetY = maxY - shape.height;
          break;
      }

      this.animationState.shapes.set(shape.id, {
        startX: shape.x,
        startY: shape.y,
        startWidth: shape.width,
        startHeight: shape.height,
        startRotation: shape.rotation,
        startOpacity: shape.opacity,
        targetX,
        targetY,
        targetWidth: shape.width,
        targetHeight: shape.height,
        targetRotation: shape.rotation,
        targetOpacity: shape.opacity,
        startTime: now,
        duration: 400,
      });
    }

    this.notifyShapesChange();
    this.requestRender();
  }

  updateShapeColor(id: string, color: string): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.fill = color;
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateTextContent(id: string, text: string): void {
    const shape = this.getShapeById(id);
    if (shape && shape.type === 'text') {
      shape.text = text;
      updateTextSize(this.ctx, shape);
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateFontSize(id: string, fontSize: number): void {
    const shape = this.getShapeById(id);
    if (shape && shape.type === 'text') {
      shape.fontSize = Math.max(12, Math.min(120, fontSize));
      updateTextSize(this.ctx, shape);
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateFontFamily(id: string, fontFamily: string): void {
    const shape = this.getShapeById(id);
    if (shape && shape.type === 'text') {
      shape.fontFamily = fontFamily;
      updateTextSize(this.ctx, shape);
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateTextShadow(
    id: string,
    shadow: { enabled: boolean; offsetX: number; offsetY: number; blur: number; color: string }
  ): void {
    const shape = this.getShapeById(id);
    if (shape && shape.type === 'text') {
      shape.shadow = { ...shadow };
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateShapeSize(id: string, width: number, height: number): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.width = Math.max(10, width);
      shape.height = Math.max(10, height);
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  updateShapeRotation(id: string, rotation: number): void {
    const shape = this.getShapeById(id);
    if (shape) {
      shape.rotation = rotation;
      this.notifyShapesChange();
      this.requestRender();
    }
  }

  private editText(id: string): void {
    const shape = this.getShapeById(id);
    if (!shape || shape.type !== 'text') return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = shape.text;
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    document.body.appendChild(input);
    input.focus();
    input.select();

    const handleBlur = () => {
      shape.text = input.value || '文字';
      updateTextSize(this.ctx, shape);
      document.body.removeChild(input);
      this.notifyShapesChange();
      this.requestRender();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        input.blur();
      }
      if (e.key === 'Escape') {
        input.value = shape.text;
        input.blur();
      }
    };

    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);
  }

  exportSVG(): string {
    const minX = Math.min(...this.shapes.map((s) => s.x));
    const minY = Math.min(...this.shapes.map((s) => s.y));
    const maxX = Math.max(...this.shapes.map((s) => s.x + s.width));
    const maxY = Math.max(...this.shapes.map((s) => s.y + s.height));
    const padding = 20;

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;

    const sorted = [...this.shapes].sort((a, b) => a.zIndex - b.zIndex);
    for (const shape of sorted) {
      const sx = shape.x - minX + padding;
      const sy = shape.y - minY + padding;
      const cx = sx + shape.width / 2;
      const cy = sy + shape.height / 2;

      if (shape.type === 'rect') {
        svgContent += `  <rect x="${sx}" y="${sy}" width="${shape.width}" height="${shape.height}" rx="${shape.radius}" fill="${shape.fill}" opacity="${shape.opacity}" transform="rotate(${shape.rotation} ${cx} ${cy})"/>\n`;
      } else if (shape.type === 'circle') {
        svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${shape.fill}" opacity="${shape.opacity}" transform="rotate(${shape.rotation} ${cx} ${cy})"/>\n`;
      } else if (shape.type === 'triangle') {
        const points = `${cx},${sy} ${sx + shape.width},${sy + shape.height} ${sx},${sy + shape.height}`;
        svgContent += `  <polygon points="${points}" fill="${shape.fill}" opacity="${shape.opacity}" transform="rotate(${shape.rotation} ${cx} ${cy})"/>\n`;
      } else if (shape.type === 'star') {
        const outerRx = shape.width / 2;
        const outerRy = shape.height / 2;
        const innerRx = (shape.innerRadius / (shape.width / 2)) * outerRx;
        const innerRy = (shape.innerRadius / (shape.width / 2)) * outerRy;
        let points = '';
        for (let i = 0; i < shape.points * 2; i++) {
          const angle = (i * Math.PI) / shape.points - Math.PI / 2;
          const rx = i % 2 === 0 ? outerRx : innerRx;
          const ry = i % 2 === 0 ? outerRy : innerRy;
          const px = cx + Math.cos(angle) * rx;
          const py = cy + Math.sin(angle) * ry;
          points += `${px},${py} `;
        }
        svgContent += `  <polygon points="${points.trim()}" fill="${shape.fill}" opacity="${shape.opacity}" transform="rotate(${shape.rotation} ${cx} ${cy})"/>\n`;
      } else if (shape.type === 'text') {
        let shadowStyle = '';
        if (shape.shadow.enabled) {
          shadowStyle = `text-shadow: ${shape.shadow.offsetX}px ${shape.shadow.offsetY}px ${shape.shadow.blur}px ${shape.shadow.color};`;
        }
        svgContent += `  <text x="${sx}" y="${sy + shape.fontSize}" font-family="${shape.fontFamily}" font-size="${shape.fontSize}" font-weight="${shape.fontWeight}" fill="${shape.fill}" opacity="${shape.opacity}" style="${shadowStyle}" transform="rotate(${shape.rotation} ${cx} ${cy})">${shape.text}</text>\n`;
      }
    }

    svgContent += '</svg>';
    return svgContent;
  }

  exportPNG(): string {
    const minX = Math.min(...this.shapes.map((s) => s.x));
    const minY = Math.min(...this.shapes.map((s) => s.y));
    const maxX = Math.max(...this.shapes.map((s) => s.x + s.width));
    const maxY = Math.max(...this.shapes.map((s) => s.y + s.height));
    const padding = 20;

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * 2;
    tempCanvas.height = height * 2;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return '';

    tempCtx.scale(2, 2);
    tempCtx.translate(-minX + padding, -minY + padding);

    const sorted = [...this.shapes].sort((a, b) => a.zIndex - b.zIndex);
    for (const shape of sorted) {
      drawShape(tempCtx, shape);
    }

    return tempCanvas.toDataURL('image/png');
  }

  getShapes(): Shape[] {
    return [...this.shapes];
  }

  getSelectedShapes(): Shape[] {
    return this.selectedIds
      .map((id) => this.getShapeById(id))
      .filter((s): s is Shape => s !== undefined);
  }

  setOnSelectionChange(callback: (shapes: Shape[]) => void): void {
    this.listeners.onSelectionChange = callback;
  }

  setOnShapesChange(callback: (shapes: Shape[]) => void): void {
    this.listeners.onShapesChange = callback;
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
  }
}
