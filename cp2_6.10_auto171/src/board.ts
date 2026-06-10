import {
  BaseElement,
  GRID_SIZE,
  CANVAS_SIZE,
  GRID_COLS,
  GRID_ROWS,
  snapToGrid,
  updateGridPosition,
  renderElement,
  renderLaserBeam,
  computeLaserBeams,
  LaserConnection,
  LaserBeam,
  ElementType,
  createElement,
} from './elements';

export interface DragState {
  isDragging: boolean;
  elementId: string | null;
  offsetX: number;
  offsetY: number;
}

export class Board {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  elements: BaseElement[] = [];
  laserConnections: LaserConnection[] = [];
  selectedElementId: string | null = null;
  dragState: DragState = { isDragging: false, elementId: null, offsetX: 0, offsetY: 0 };
  isSimulating: boolean = false;
  time: number = 0;
  laserBeams: LaserBeam[] = [];
  onElementSelect?: (el: BaseElement | null) => void;
  onElementsChange?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    this.bindEvents();
  }

  bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
  }

  getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  getElementAt(x: number, y: number): BaseElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (x >= el.x && x <= el.x + GRID_SIZE && y >= el.y && y <= el.y + GRID_SIZE) {
        return el;
      }
    }
    return null;
  }

  handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);
    const el = this.getElementAt(pos.x, pos.y);

    if (el) {
      this.selectedElementId = el.id;
      this.onElementSelect?.(el);
      const canDrag = this.isSimulating ? el.type === 'box' : true;
      if (canDrag) {
        this.dragState = {
          isDragging: true,
          elementId: el.id,
          offsetX: pos.x - el.x,
          offsetY: pos.y - el.y,
        };
      }
    } else {
      this.selectedElementId = null;
      this.onElementSelect?.(null);
    }
    this.render();
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (!this.dragState.isDragging || !this.dragState.elementId) return;
    const pos = this.getMousePos(e);
    const el = this.elements.find((x) => x.id === this.dragState.elementId);
    if (!el) return;

    let newX = snapToGrid(pos.x - this.dragState.offsetX);
    let newY = snapToGrid(pos.y - this.dragState.offsetY);
    newX = Math.max(0, Math.min(CANVAS_SIZE - GRID_SIZE, newX));
    newY = Math.max(0, Math.min(CANVAS_SIZE - GRID_SIZE, newY));

    if (!this.checkCollision(el.id, newX, newY)) {
      el.x = newX;
      el.y = newY;
      updateGridPosition(el);
      this.onElementsChange?.();
    }
    this.render();
  };

  handleMouseUp = (): void => {
    this.dragState.isDragging = false;
    this.dragState.elementId = null;
  };

  checkCollision(excludeId: string, x: number, y: number): boolean {
    for (const el of this.elements) {
      if (el.id === excludeId) continue;
      if (el.type === 'pressurePlate') continue;
      if (el.type === 'door' && el.isOpen) continue;
      if (x < el.x + GRID_SIZE && x + GRID_SIZE > el.x && y < el.y + GRID_SIZE && y + GRID_SIZE > el.y) {
        return true;
      }
    }
    return false;
  }

  addElement(type: ElementType, gridX?: number, gridY?: number): BaseElement {
    const gx = gridX ?? Math.floor(GRID_COLS / 2);
    const gy = gridY ?? Math.floor(GRID_ROWS / 2);
    let finalGx = gx;
    let finalGy = gy;
    let attempts = 0;
    while (this.checkCollision('', finalGx * GRID_SIZE, finalGy * GRID_SIZE) && attempts < 100) {
      finalGx = (finalGx + 1) % GRID_COLS;
      if (finalGx === gx) finalGy = (finalGy + 1) % GRID_ROWS;
      attempts++;
    }
    const el = createElement(type, finalGx, finalGy);
    this.elements.push(el);
    this.selectedElementId = el.id;
    this.onElementSelect?.(el);
    this.onElementsChange?.();
    this.render();
    return el;
  }

  removeElement(id: string): void {
    this.elements = this.elements.filter((e) => e.id !== id);
    this.laserConnections = this.laserConnections.filter((c) => c.emitterId !== id && c.receiverId !== id);
    if (this.selectedElementId === id) {
      this.selectedElementId = null;
      this.onElementSelect?.(null);
    }
    this.onElementsChange?.();
    this.render();
  }

  updateSimulation(): void {
    this.laserBeams = computeLaserBeams(this.elements, this.laserConnections);
    const hitReceiverIds = new Set(this.laserBeams.filter((b) => b.hitReceiverId).map((b) => b.hitReceiverId!));

    for (const el of this.elements) {
      if (el.type === 'laserReceiver') {
        el.isActive = hitReceiverIds.has(el.id);
      }
      if (el.type === 'pressurePlate') {
        el.isActive = this.elements.some(
          (o) =>
            (o.type === 'box') &&
            o.gridX === el.gridX &&
            o.gridY === el.gridY,
        );
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1b2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_SIZE; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_SIZE; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    const plates = this.elements.filter((e) => e.type === 'pressurePlate');
    const others = this.elements.filter((e) => e.type !== 'pressurePlate');
    for (const el of plates) {
      renderElement(ctx, el, el.id === this.selectedElementId, this.time);
    }
    for (const el of others) {
      renderElement(ctx, el, el.id === this.selectedElementId, this.time);
    }

    for (const beam of this.laserBeams) {
      renderLaserBeam(ctx, beam, this.time);
    }

    if (this.selectedElementId) {
      const el = this.elements.find((e) => e.id === this.selectedElementId);
      if (el) {
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 12;
        ctx.strokeRect(el.x - 1, el.y - 1, GRID_SIZE + 2, GRID_SIZE + 2);
        ctx.shadowBlur = 0;
      }
    }
  }

  tick(delta: number): void {
    this.time += delta;
    if (this.isSimulating) {
      this.updateSimulation();
    } else {
      this.laserBeams = [];
    }
    this.render();
  }

  startSimulation(): void {
    this.isSimulating = true;
    for (const el of this.elements) {
      el.initialState = {
        x: el.x,
        y: el.y,
        isActive: el.isActive,
        direction: el.direction,
        isOpen: el.isOpen,
      };
    }
  }

  stopSimulation(): void {
    this.isSimulating = false;
    for (const el of this.elements) {
      el.isActive = el.initialState.isActive;
      if (el.type === 'door') el.isOpen = el.initialState.isOpen ?? false;
    }
  }

  reset(): void {
    this.isSimulating = false;
    for (const el of this.elements) {
      el.x = el.initialState.x;
      el.y = el.initialState.y;
      el.isActive = el.initialState.isActive;
      el.direction = el.initialState.direction;
      el.isOpen = el.initialState.isOpen;
      updateGridPosition(el);
    }
    this.laserBeams = [];
    this.onElementsChange?.();
    this.render();
  }
}
