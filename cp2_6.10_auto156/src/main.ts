import {
  LayoutManager,
  TowerType,
  TOWER_CONFIGS,
  pixelToGrid,
  gridToPixel,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_COLS,
  GRID_ROWS
} from './layoutManager';
import { findPath, PathPoint } from './pathSimulator';
import { Renderer, RenderState } from './renderer';

interface DragState {
  towerId: string;
  mouseX: number;
  mouseY: number;
  targetGridX: number | null;
  targetGridY: number | null;
  towerType: TowerType;
}

class App {
  private canvas: HTMLCanvasElement;
  private layoutManager: LayoutManager;
  private renderer: Renderer;
  private selectedTowerType: TowerType = 'machinegun';
  private hoverCell: { gridX: number; gridY: number } | null = null;
  private isMouseInCanvas = false;
  private mouseX = 0;
  private mouseY = 0;

  private dragState: DragState | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 5;

  private path: PathPoint[] | null = null;
  private pathStartCell: { gridX: number; gridY: number } | null = null;
  private pathEndCell: { gridX: number; gridY: number } | null = null;
  private isSelectingPathStart = false;
  private isSelectingPathEnd = false;

  private towerPanel: HTMLElement;
  private simulatePathBtn: HTMLElement;
  private clearPathBtn: HTMLElement;
  private infoPanel: HTMLElement;
  private hintText: HTMLElement;

  private animationFrameId: number | null = null;
  private dirty = true;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.layoutManager = new LayoutManager();
    this.renderer = new Renderer(this.canvas);

    this.towerPanel = document.getElementById('towerPanel') as HTMLElement;
    this.simulatePathBtn = document.getElementById('simulatePathBtn') as HTMLElement;
    this.clearPathBtn = document.getElementById('clearPathBtn') as HTMLElement;
    this.infoPanel = document.getElementById('infoPanel') as HTMLElement;
    this.hintText = document.getElementById('hintText') as HTMLElement;

    this.bindEvents();
    this.startRenderLoop();
  }

  private bindEvents(): void {
    this.towerPanel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.tower-btn') as HTMLElement;
      if (btn) {
        const type = btn.dataset.type as TowerType;
        if (type) {
          this.selectTowerType(type);
        }
      }
    });

    this.simulatePathBtn.addEventListener('click', () => {
      this.startPathSelection();
    });

    this.clearPathBtn.addEventListener('click', () => {
      this.clearPath();
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('mouseenter', () => this.onMouseEnter());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private selectTowerType(type: TowerType): void {
    this.selectedTowerType = type;
    document.querySelectorAll('.tower-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tower-btn[data-type="${type}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    this.markDirty();
  }

  private startPathSelection(): void {
    this.clearPath();
    this.isSelectingPathStart = true;
    this.isSelectingPathEnd = false;
    this.simulatePathBtn.classList.add('active');
    this.showHint('请点击选择路径起点格子');
    this.markDirty();
  }

  private clearPath(): void {
    this.path = null;
    this.pathStartCell = null;
    this.pathEndCell = null;
    this.isSelectingPathStart = false;
    this.isSelectingPathEnd = false;
    this.simulatePathBtn.classList.remove('active');
    this.hideHint();
    this.markDirty();
  }

  private showHint(text: string): void {
    this.hintText.textContent = text;
    this.hintText.classList.add('visible');
  }

  private hideHint(): void {
    this.hintText.classList.remove('visible');
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;

    const { gridX, gridY } = pixelToGrid(x, y);

    if (this.isSelectingPathStart) {
      this.pathStartCell = { gridX, gridY };
      this.isSelectingPathStart = false;
      this.isSelectingPathEnd = true;
      this.showHint('请点击选择路径终点格子');
      this.markDirty();
      return;
    }

    if (this.isSelectingPathEnd) {
      this.pathEndCell = { gridX, gridY };
      this.isSelectingPathEnd = false;
      this.simulatePathBtn.classList.remove('active');
      this.hideHint();
      this.computeAndSetPath();
      this.markDirty();
      return;
    }

    const existingTower = this.layoutManager.getTowerAt(gridX, gridY);
    if (existingTower) {
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragState = {
        towerId: existingTower.id,
        mouseX: x,
        mouseY: y,
        targetGridX: null,
        targetGridY: null,
        towerType: existingTower.type
      };
      this.isDragging = false;
      this.layoutManager.selectTower(existingTower.id);
      this.updateInfoPanel();
    } else {
      const newTower = this.layoutManager.addTower(this.selectedTowerType, gridX, gridY);
      if (newTower) {
        this.layoutManager.selectTower(newTower.id);
        this.updateInfoPanel();
      }
      this.layoutManager.selectTower(null);
    }
    this.markDirty();
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.mouseX = x;
    this.mouseY = y;

    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      this.hoverCell = null;
      this.isMouseInCanvas = false;
      this.markDirty();
      return;
    }

    this.isMouseInCanvas = true;
    const { gridX, gridY } = pixelToGrid(x, y);
    this.hoverCell = { gridX, gridY };

    if (this.dragState) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        this.dragState.mouseX = x;
        this.dragState.mouseY = y;

        if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
          const targetOccupied = this.layoutManager.isCellOccupied(gridX, gridY);
          const originalTower = this.layoutManager.getTower(this.dragState.towerId);
          const isOriginalPos = originalTower && originalTower.gridX === gridX && originalTower.gridY === gridY;

          if (!targetOccupied || isOriginalPos) {
            this.dragState.targetGridX = gridX;
            this.dragState.targetGridY = gridY;
          } else {
            this.dragState.targetGridX = null;
            this.dragState.targetGridY = null;
          }
        } else {
          this.dragState.targetGridX = null;
          this.dragState.targetGridY = null;
        }
      }
    }

    this.markDirty();
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.dragState) {
      if (this.isDragging) {
        if (this.dragState.targetGridX !== null && this.dragState.targetGridY !== null) {
          this.layoutManager.moveTower(this.dragState.towerId, this.dragState.targetGridX, this.dragState.targetGridY);
          if (this.pathStartCell || this.pathEndCell) {
            this.computeAndSetPath();
          }
        }
      }
      this.dragState = null;
      this.isDragging = false;
      this.markDirty();
    }
  }

  private onMouseLeave(): void {
    this.isMouseInCanvas = false;
    this.hoverCell = null;
    if (this.dragState && !this.isDragging) {
      this.dragState = null;
    }
    this.markDirty();
  }

  private onMouseEnter(): void {
    this.isMouseInCanvas = true;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'd' || e.key === 'D') {
      const selected = this.layoutManager.getSelectedTower();
      if (selected) {
        this.layoutManager.removeTower(selected.id);
        this.layoutManager.selectTower(null);
        this.updateInfoPanel();
        if (this.pathStartCell || this.pathEndCell) {
          this.computeAndSetPath();
        }
        this.markDirty();
      }
    }
    if (e.key === 'Escape') {
      if (this.isSelectingPathStart || this.isSelectingPathEnd) {
        this.clearPath();
      }
      this.layoutManager.selectTower(null);
      this.updateInfoPanel();
      this.markDirty();
    }
  }

  private computeAndSetPath(): void {
    if (!this.pathStartCell || !this.pathEndCell) {
      this.path = null;
      return;
    }
    const towers = this.layoutManager.getAllTowers();
    this.path = findPath(
      this.pathStartCell.gridX,
      this.pathStartCell.gridY,
      this.pathEndCell.gridX,
      this.pathEndCell.gridY,
      towers
    );
    if (!this.path) {
      this.showHint('无法找到可达路径');
      setTimeout(() => this.hideHint(), 2000);
    }
  }

  private updateInfoPanel(): void {
    const tower = this.layoutManager.getSelectedTower();
    if (!tower) {
      this.infoPanel.classList.remove('visible');
      return;
    }

    const config = TOWER_CONFIGS[tower.type];
    this.infoPanel.innerHTML = `
      <div class="title" style="color: ${config.color}">${config.name}</div>
      <div class="row"><span class="label">攻击力：</span><span class="value">${config.damage}</span></div>
      <div class="row"><span class="label">攻击范围：</span><span class="value">${config.range}px</span></div>
      <div class="row"><span class="label">射速：</span><span class="value">${config.fireRate}/s</span></div>
      <div class="row"><span class="label">减速效果：</span><span class="value">${Math.round(config.slowEffect * 100)}%</span></div>
      <div class="row"><span class="label">位置：</span><span class="value">(${tower.gridX}, ${tower.gridY})</span></div>
      <div class="row" style="margin-top: 8px; color: #b2bec3; font-size: 10px;">
        按 D 键删除 | 拖拽移动
      </div>
    `;
    this.infoPanel.classList.add('visible');
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.dirty) {
        this.render();
        this.dirty = false;
      } else {
        const towers = this.layoutManager.getAllTowers();
        const hasAnimatingTowers = towers.some(t => performance.now() - t.placedAt < 200);
        const hasSelected = this.layoutManager.getSelectedTower() !== undefined;
        if (hasAnimatingTowers || hasSelected) {
          this.render();
        }
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(): void {
    const state: RenderState = {
      towers: this.layoutManager.getAllTowers(),
      selectedTowerId: this.layoutManager.getSelectedTowerId(),
      currentTime: performance.now(),
      path: this.path,
      pathStartCell: this.pathStartCell,
      pathEndCell: this.pathEndCell,
      isSelectingPathStart: this.isSelectingPathStart,
      isSelectingPathEnd: this.isSelectingPathEnd,
      dragState: this.dragState,
      hoverCell: this.hoverCell,
      selectedTowerType: this.selectedTowerType
    };

    this.renderer.render(state);

    if (this.isMouseInCanvas && !this.dragState && !this.isSelectingPathStart && !this.isSelectingPathEnd) {
      const { gridX, gridY } = pixelToGrid(this.mouseX, this.mouseY);
      if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
        const occupied = this.layoutManager.isCellOccupied(gridX, gridY);
        const existingTower = this.layoutManager.getTowerAt(gridX, gridY);
        if (!occupied && !existingTower) {
          const { x, y } = gridToPixel(gridX, gridY);
          this.renderer.drawTowerPreviewAtMouse(x, y, this.selectedTowerType, true);
        }
      }
    }

    if (this.dragState && this.isDragging) {
      const validTarget = this.dragState.targetGridX !== null && this.dragState.targetGridY !== null;
      this.renderer.drawTowerPreviewAtMouse(
        this.dragState.mouseX,
        this.dragState.mouseY,
        this.dragState.towerType,
        validTarget
      );
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
