import { v4 as uuidv4 } from 'uuid';
import {
  Rune,
  RuneElement,
  DragState,
  ELEMENT_COLORS,
  CELL_SIZE,
  DRAWER_INVENTORY,
  SlotBreakParticle,
} from './types';
import { Grid } from './Grid';

export interface DrawerSlot {
  element: RuneElement;
  count: number;
}

export interface DragEndResult {
  success: boolean;
  rune?: Rune;
  gridX?: number;
  gridY?: number;
  element?: RuneElement;
}

export class DragSystem {
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  private dragState: DragState = {
    isDragging: false,
    rune: null,
    offsetX: 0,
    offsetY: 0,
    source: 'drawer',
    drawerIndex: -1,
  };
  private drawer: DrawerSlot[] = [];
  private drawerX: number = 0;
  private drawerY: number = 0;
  private drawerWidth: number = 0;
  private slotWidth: number = 60;
  private slotHeight: number = 60;
  private slotPadding: number = 8;
  private elasticProgress: number = 0;
  private isElasticAnimating: boolean = false;
  private elasticStartX: number = 0;
  private elasticStartY: number = 0;
  private elasticEndX: number = 0;
  private elasticEndY: number = 0;
  public breakParticles: SlotBreakParticle[] = [];
  public onDragEnd?: (result: DragEndResult) => void;
  public onDrawSlotEmpty?: (element: RuneElement) => void;
  private dormantElements: Set<RuneElement> = new Set();

  constructor(canvas: HTMLCanvasElement, grid: Grid, drawerX: number, drawerY: number, drawerWidth: number) {
    this.canvas = canvas;
    this.grid = grid;
    this.drawerX = drawerX;
    this.drawerY = drawerY;
    this.drawerWidth = drawerWidth;

    const elements: RuneElement[] = ['fire', 'water', 'thunder', 'earth'];
    this.drawer = elements.map(e => ({ element: e, count: DRAWER_INVENTORY }));

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  setDormantElement(element: RuneElement, dormant: boolean): void {
    if (dormant) {
      this.dormantElements.add(element);
    } else {
      this.dormantElements.delete(element);
    }
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private getDrawerSlotAt(mouseX: number, mouseY: number): number {
    for (let i = 0; i < this.drawer.length; i++) {
      const sx = this.drawerX + (i % 2) * (this.slotWidth + this.slotPadding);
      const sy = this.drawerY + Math.floor(i / 2) * (this.slotHeight + this.slotPadding);
      if (
        mouseX >= sx &&
        mouseX <= sx + this.slotWidth &&
        mouseY >= sy &&
        mouseY <= sy + this.slotHeight
      ) {
        return i;
      }
    }
    return -1;
  }

  getDrawerSlots(): DrawerSlot[] {
    return this.drawer;
  }

  getDrawerSlotPosition(index: number): { x: number; y: number; width: number; height: number } {
    const sx = this.drawerX + (index % 2) * (this.slotWidth + this.slotPadding);
    const sy = this.drawerY + Math.floor(index / 2) * (this.slotHeight + this.slotPadding);
    return { x: sx, y: sy, width: this.slotWidth, height: this.slotHeight };
  }

  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  getDragRune(): Rune | null {
    return this.dragState.rune;
  }

  addRuneToDrawer(element: RuneElement): void {
    const slot = this.drawer.find(s => s.element === element);
    if (slot) {
      slot.count++;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    if (this.grid.isInsideGrid(pos.x, pos.y)) {
      const { gridX, gridY } = this.grid.worldToGrid(pos.x, pos.y);
      const rune = this.grid.getRune(gridX, gridY);
      if (rune && !rune.isDormant && !this.dormantElements.has(rune.element)) {
        this.grid.removeRune(gridX, gridY);
        this.dragState = {
          isDragging: true,
          rune: { ...rune, x: pos.x, y: pos.y, placed: false },
          offsetX: pos.x - rune.x,
          offsetY: pos.y - rune.y,
          source: 'grid',
          drawerIndex: -1,
        };
      }
      return;
    }

    const slotIndex = this.getDrawerSlotAt(pos.x, pos.y);
    if (slotIndex >= 0) {
      const slot = this.drawer[slotIndex];
      if (slot.count > 0 && !this.dormantElements.has(slot.element)) {
        const slotPos = this.getDrawerSlotPosition(slotIndex);
        this.dragState = {
          isDragging: true,
          rune: {
            id: uuidv4(),
            element: slot.element,
            x: pos.x,
            y: pos.y,
            gridX: -1,
            gridY: -1,
            glowIntensity: 0.5,
            placed: false,
            isDormant: false,
            chargeCount: 0,
            scale: 1.2,
            animOffset: Math.random() * Math.PI * 2,
          },
          offsetX: pos.x - (slotPos.x + slotPos.width / 2),
          offsetY: pos.y - (slotPos.y + slotPos.height / 2),
          source: 'drawer',
          drawerIndex: slotIndex,
        };
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragState.isDragging || !this.dragState.rune) return;

    const pos = this.getMousePos(e);
    this.dragState.rune.x = pos.x - this.dragState.offsetX;
    this.dragState.rune.y = pos.y - this.dragState.offsetY;
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragState.isDragging || !this.dragState.rune) {
      this.dragState = {
        isDragging: false,
        rune: null,
        offsetX: 0,
        offsetY: 0,
        source: 'drawer',
        drawerIndex: -1,
      };
      return;
    }

    const pos = this.getMousePos(e);
    const rune = this.dragState.rune;

    if (this.grid.isInsideGrid(pos.x, pos.y)) {
      const snapped = this.grid.snapToGrid(pos.x, pos.y);

      if (!this.grid.isCellOccupied(snapped.gridX, snapped.gridY)) {
        this.elasticStartX = rune.x;
        this.elasticStartY = rune.y;
        this.elasticEndX = snapped.x;
        this.elasticEndY = snapped.y;
        this.elasticProgress = 0;
        this.isElasticAnimating = true;

        if (this.dragState.source === 'drawer') {
          const slot = this.drawer[this.dragState.drawerIndex];
          if (slot) {
            slot.count--;
            this.spawnBreakParticles(
              this.drawerX + (this.dragState.drawerIndex % 2) * (this.slotWidth + this.slotPadding) + this.slotWidth / 2,
              this.drawerY + Math.floor(this.dragState.drawerIndex / 2) * (this.slotHeight + this.slotPadding) + this.slotHeight / 2,
              slot.element
            );
          }
        }

        const result: DragEndResult = {
          success: true,
          rune: rune,
          gridX: snapped.gridX,
          gridY: snapped.gridY,
          element: rune.element,
        };

        this.dragState.rune = null;
        this.dragState.isDragging = false;

        if (this.onDragEnd) {
          this.onDragEnd(result);
        }
        return;
      }
    }

    if (this.dragState.source === 'grid') {
      const snapped = this.grid.snapToGrid(rune.x, rune.y);
      if (!this.grid.isCellOccupied(snapped.gridX, snapped.gridY)) {
        this.grid.placeRune(rune.element, snapped.gridX, snapped.gridY);
      }
    }

    this.dragState = {
      isDragging: false,
      rune: null,
      offsetX: 0,
      offsetY: 0,
      source: 'drawer',
      drawerIndex: -1,
    };
  }

  private spawnBreakParticles(x: number, y: number, element: RuneElement): void {
    const color = ELEMENT_COLORS[element];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.breakParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color,
        life: 1,
      });
    }
  }

  update(deltaTime: number): void {
    if (this.isElasticAnimating) {
      this.elasticProgress += deltaTime / 250;
      if (this.elasticProgress >= 1) {
        this.elasticProgress = 1;
        this.isElasticAnimating = false;
      }
    }

    for (let i = this.breakParticles.length - 1; i >= 0; i--) {
      const p = this.breakParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= deltaTime / 500;
      if (p.life <= 0) {
        this.breakParticles.splice(i, 1);
      }
    }
  }

  isElasticActive(): boolean {
    return this.isElasticAnimating;
  }

  getElasticProgress(): number {
    return this.elasticProgress;
  }

  getElasticPosition(): { x: number; y: number } {
    const t = this.elasticProgress;
    const bounce = 1 - Math.pow(1 - t, 3);
    const overshoot = Math.sin(t * Math.PI) * 0.15;
    const scale = 1 + overshoot;
    return {
      x: this.elasticStartX + (this.elasticEndX - this.elasticStartX) * bounce,
      y: this.elasticStartY + (this.elasticEndY - this.elasticStartY) * bounce,
    };
  }

  getElasticScale(): number {
    const t = this.elasticProgress;
    const overshoot = Math.sin(t * Math.PI) * 0.2;
    return 1 + overshoot;
  }

  resetDrawer(): void {
    const elements: RuneElement[] = ['fire', 'water', 'thunder', 'earth'];
    this.drawer = elements.map(e => ({ element: e, count: DRAWER_INVENTORY }));
  }
}
