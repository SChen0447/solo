import { Renderer } from './Renderer';
import { ImageManager } from './ImageManager';
import type {
  Panel,
  LayoutConfig,
  DragState,
  CropState,
  ResizeHandle,
  Point,
  Rect,
  ExportTemplate
} from './types';
import { EXPORT_TEMPLATES } from './types';

export class PanelWorkspace {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private imageManager: ImageManager;

  private panels: Panel[] = [];
  private selectedPanelId: string | null = null;
  private layoutConfig: LayoutConfig = {
    gap: 10,
    padding: 20,
    direction: 'vertical',
    autoHeight: true
  };

  private dragState: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    panelId: null,
    resizeHandle: null,
    originalX: 0,
    originalY: 0,
    originalWidth: 0,
    originalHeight: 0,
    aspectRatio: 1
  };

  private cropState: CropState = {
    isActive: false,
    panelId: null,
    startPoint: null,
    currentRect: null
  };

  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panOffsetStartX: number = 0;
  private panOffsetStartY: number = 0;

  private canvasBaseWidth: number = 1200;
  private canvasBaseHeight: number = 800;
  private animationFrameId: number | null = null;

  public onPanelsChange: (() => void) | null = null;
  public onSelectionChange: ((id: string | null) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.imageManager = new ImageManager();

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'workspace-canvas';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    this.renderer = new Renderer(this.canvas);

    this.bindEvents();
    this.resize();
    this.render();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    const ctx = this.canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    this.renderer.resize(rect.width, rect.height);
    this.render();
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.cropState.isActive && this.cropState.panelId) {
      this.startCropDrag(x, y);
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStartX = x;
      this.panStartY = y;
      const offset = this.renderer.getOffset();
      this.panOffsetStartX = offset.x;
      this.panOffsetStartY = offset.y;
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 2) {
      this.isPanning = true;
      this.panStartX = x;
      this.panStartY = y;
      const offset = this.renderer.getOffset();
      this.panOffsetStartX = offset.x;
      this.panOffsetStartY = offset.y;
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    const hitPanel = this.renderer.hitTestPanel(x, y, this.panels);

    if (hitPanel) {
      const handle = this.selectedPanelId === hitPanel.id
        ? this.renderer.hitTestResizeHandle(x, y, hitPanel)
        : null;

      if (handle) {
        this.startResize(x, y, hitPanel, handle);
      } else {
        this.startDrag(x, y, hitPanel, e.shiftKey);
      }
    } else {
      this.selectedPanelId = null;
      if (this.onSelectionChange) this.onSelectionChange(null);
      this.render();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPanning) {
      const dx = x - this.panStartX;
      const dy = y - this.panStartY;
      this.renderer.setOffset(this.panOffsetStartX + dx, this.panOffsetStartY + dy);
      this.scheduleRender();
      return;
    }

    if (this.cropState.isActive && this.cropState.startPoint) {
      this.updateCropDrag(x, y);
      return;
    }

    if (this.dragState.isDragging && this.dragState.panelId) {
      if (this.dragState.resizeHandle) {
        this.updateResize(x, y, e.shiftKey);
      } else {
        this.updateDrag(x, y);
      }
      return;
    }

    this.updateCursor(x, y);
  }

  private onMouseUp(_e?: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (this.cropState.isActive && this.cropState.startPoint) {
      this.finishCrop();
      return;
    }

    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      this.dragState.panelId = null;
      this.dragState.resizeHandle = null;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentScale = this.renderer.getScale();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(3, currentScale * delta));

    const canvasPoint = this.renderer.screenToCanvas(x, y);
    const scaleRatio = newScale / currentScale;

    const newOffsetX = x - canvasPoint.x * newScale;
    const newOffsetY = y - canvasPoint.y * newScale;

    this.renderer.setScale(newScale);
    this.renderer.setOffset(newOffsetX, newOffsetY);
    this.scheduleRender();
  }

  private onDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.cropState.isActive) {
      this.exitCropMode();
      return;
    }

    const hitPanel = this.renderer.hitTestPanel(x, y, this.panels);
    if (hitPanel && hitPanel.imageData) {
      this.enterCropMode(hitPanel.id);
    }
  }

  private startDrag(x: number, y: number, panel: Panel, _addToSelection: boolean): void {
    this.selectedPanelId = panel.id;
    if (this.onSelectionChange) this.onSelectionChange(panel.id);

    const canvasPt = this.renderer.screenToCanvas(x, y);
    this.dragState = {
      isDragging: true,
      startX: canvasPt.x,
      startY: canvasPt.y,
      panelId: panel.id,
      resizeHandle: null,
      originalX: panel.x,
      originalY: panel.y,
      originalWidth: panel.width,
      originalHeight: panel.height,
      aspectRatio: panel.width / panel.height
    };
    this.canvas.style.cursor = 'move';
    this.render();
  }

  private updateDrag(x: number, y: number): void {
    const canvasPt = this.renderer.screenToCanvas(x, y);
    const panel = this.panels.find((p) => p.id === this.dragState.panelId);
    if (!panel) return;

    const dx = canvasPt.x - this.dragState.startX;
    const dy = canvasPt.y - this.dragState.startY;

    panel.x = Math.round(this.dragState.originalX + dx);
    panel.y = Math.round(this.dragState.originalY + dy);

    this.scheduleRender();
  }

  private startResize(x: number, y: number, panel: Panel, handle: ResizeHandle): void {
    const canvasPt = this.renderer.screenToCanvas(x, y);
    this.dragState = {
      isDragging: true,
      startX: canvasPt.x,
      startY: canvasPt.y,
      panelId: panel.id,
      resizeHandle: handle,
      originalX: panel.x,
      originalY: panel.y,
      originalWidth: panel.width,
      originalHeight: panel.height,
      aspectRatio: panel.width / panel.height
    };
    this.canvas.style.cursor = this.getCursorForHandle(handle);
  }

  private updateResize(x: number, y: number, shiftPressed: boolean): void {
    const panel = this.panels.find((p) => p.id === this.dragState.panelId);
    if (!panel || !this.dragState.resizeHandle) return;

    const canvasPt = this.renderer.screenToCanvas(x, y);
    const dx = canvasPt.x - this.dragState.startX;
    const dy = canvasPt.y - this.dragState.startY;

    const handle = this.dragState.resizeHandle;
    let newX = this.dragState.originalX;
    let newY = this.dragState.originalY;
    let newW = this.dragState.originalWidth;
    let newH = this.dragState.originalHeight;

    if (handle.includes('e')) {
      newW = Math.max(50, this.dragState.originalWidth + dx);
    }
    if (handle.includes('w')) {
      newW = Math.max(50, this.dragState.originalWidth - dx);
      newX = this.dragState.originalX + this.dragState.originalWidth - newW;
    }
    if (handle.includes('s')) {
      newH = Math.max(50, this.dragState.originalHeight + dy);
    }
    if (handle.includes('n')) {
      newH = Math.max(50, this.dragState.originalHeight - dy);
      newY = this.dragState.originalY + this.dragState.originalHeight - newH;
    }

    if (shiftPressed) {
      const ratio = this.dragState.aspectRatio;
      if (handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se') {
        if (newW / newH > ratio) {
          newW = newH * ratio;
          if (handle.includes('w')) newX = this.dragState.originalX + this.dragState.originalWidth - newW;
        } else {
          newH = newW / ratio;
          if (handle.includes('n')) newY = this.dragState.originalY + this.dragState.originalHeight - newH;
        }
      } else if (handle === 'e' || handle === 'w') {
        newH = newW / ratio;
      } else if (handle === 'n' || handle === 's') {
        newW = newH * ratio;
      }
    }

    panel.x = Math.round(newX);
    panel.y = Math.round(newY);
    panel.width = Math.round(newW);
    panel.height = Math.round(newH);

    this.scheduleRender();
  }

  private updateCursor(x: number, y: number): void {
    if (this.cropState.isActive) {
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    const hitPanel = this.renderer.hitTestPanel(x, y, this.panels);
    if (hitPanel && this.selectedPanelId === hitPanel.id) {
      const handle = this.renderer.hitTestResizeHandle(x, y, hitPanel);
      this.canvas.style.cursor = handle ? this.getCursorForHandle(handle) : 'move';
    } else if (hitPanel) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private getCursorForHandle(handle: ResizeHandle): string {
    const cursorMap: Record<string, string> = {
      'nw': 'nwse-resize',
      'n': 'ns-resize',
      'ne': 'nesw-resize',
      'e': 'ew-resize',
      'se': 'nwse-resize',
      's': 'ns-resize',
      'sw': 'nesw-resize',
      'w': 'ew-resize'
    };
    return cursorMap[handle || ''] || 'default';
  }

  private enterCropMode(panelId: string): void {
    this.cropState = {
      isActive: true,
      panelId,
      startPoint: null,
      currentRect: null
    };
    this.canvas.style.cursor = 'crosshair';
    this.render();
  }

  private exitCropMode(): void {
    this.cropState = {
      isActive: false,
      panelId: null,
      startPoint: null,
      currentRect: null
    };
    this.canvas.style.cursor = 'default';
    this.render();
  }

  private startCropDrag(x: number, y: number): void {
    const panel = this.panels.find((p) => p.id === this.cropState.panelId);
    if (!panel) return;

    const canvasX = panel.x;
    const canvasY = panel.y;
    const pt = this.renderer.screenToCanvas(x, y);
    const localX = Math.max(0, Math.min(panel.width, pt.x - canvasX));
    const localY = Math.max(0, Math.min(panel.height, pt.y - canvasY));

    this.cropState.startPoint = { x: localX, y: localY };
    this.cropState.currentRect = { x: localX, y: localY, width: 0, height: 0 };
  }

  private updateCropDrag(x: number, y: number): void {
    if (!this.cropState.startPoint || !this.cropState.panelId) return;

    const panel = this.panels.find((p) => p.id === this.cropState.panelId);
    if (!panel) return;

    const pt = this.renderer.screenToCanvas(x, y);
    let localX = Math.max(0, Math.min(panel.width, pt.x - panel.x));
    let localY = Math.max(0, Math.min(panel.height, pt.y - panel.y));

    const startX = this.cropState.startPoint.x;
    const startY = this.cropState.startPoint.y;

    this.cropState.currentRect = {
      x: Math.min(startX, localX),
      y: Math.min(startY, localY),
      width: Math.abs(localX - startX),
      height: Math.abs(localY - startY)
    };

    this.scheduleRender();
  }

  private finishCrop(): void {
    if (!this.cropState.panelId || !this.cropState.currentRect) {
      this.exitCropMode();
      return;
    }

    const panel = this.panels.find((p) => p.id === this.cropState.panelId);
    if (!panel || !panel.imageData) {
      this.exitCropMode();
      return;
    }

    const rect = this.cropState.currentRect;
    if (rect.width < 10 || rect.height < 10) {
      this.exitCropMode();
      return;
    }

    const scaleX = panel.imageData.width / panel.width;
    const scaleY = panel.imageData.height / panel.height;

    panel.cropRect = {
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY)
    };

    this.exitCropMode();
  }

  private scheduleRender(): void {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.render();
      });
    }
  }

  public render(): void {
    this.renderer.clear();
    this.renderer.drawGrid(this.canvasBaseWidth, this.canvasBaseHeight);

    this.panels.forEach((panel) => {
      const isSelected = panel.id === this.selectedPanelId;
      const showHandles = !this.cropState.isActive;

      if (this.cropState.isActive && panel.id === this.cropState.panelId) {
        this.renderer.drawCropOverlay(panel, this.cropState.currentRect);
      } else {
        this.renderer.drawPanel(panel, isSelected, showHandles);
      }
    });
  }

  public async addImage(file: File): Promise<void> {
    if (this.panels.length >= 20) {
      alert('最多支持 20 个格子');
      return;
    }

    try {
      const img = await this.imageManager.loadImage(file);
      const id = this.imageManager.generateId();
      const dataUrl = await this.imageManager.fileToDataURL(file);

      this.imageManager.createThumbnail(img, id);

      const defaultSize = 200;
      let x = this.layoutConfig.padding + 50;
      let y = this.layoutConfig.padding + 50;

      if (this.panels.length > 0) {
        const lastPanel = this.panels[this.panels.length - 1];
        x = lastPanel.x + 30;
        y = lastPanel.y + 30;
      }

      const panel: Panel = {
        id,
        x,
        y,
        width: defaultSize,
        height: defaultSize,
        imageData: img,
        imageSrc: dataUrl,
        cropRect: null,
        originalWidth: img.width,
        originalHeight: img.height
      };

      this.panels.push(panel);
      this.selectedPanelId = id;
      if (this.onSelectionChange) this.onSelectionChange(id);
      if (this.onPanelsChange) this.onPanelsChange();
      this.render();
    } catch (err) {
      console.error('Failed to load image:', err);
    }
  }

  public getPanels(): Panel[] {
    return this.panels;
  }

  public getThumbnail(id: string): HTMLCanvasElement | null {
    return this.imageManager.getThumbnail(id);
  }

  public getLayoutConfig(): LayoutConfig {
    return { ...this.layoutConfig };
  }

  public setLayoutConfig(config: Partial<LayoutConfig>): void {
    this.layoutConfig = { ...this.layoutConfig, ...config };
    if (this.layoutConfig.autoHeight) {
      this.autoLayout();
    }
  }

  public autoLayout(): void {
    this.renderer.autoLayoutPanels(this.panels, this.layoutConfig, this.canvasBaseWidth);
    this.scheduleRender();
    if (this.onPanelsChange) this.onPanelsChange();
  }

  public selectPanel(id: string | null): void {
    this.selectedPanelId = id;
    if (this.onSelectionChange) this.onSelectionChange(id);

    if (id) {
      const panel = this.panels.find((p) => p.id === id);
      if (panel) {
        this.scrollToPanel(panel);
      }
    }
    this.render();
  }

  public scrollToPanel(panel: Panel): void {
    const scale = this.renderer.getScale();
    const containerRect = this.container.getBoundingClientRect();

    const targetX = containerRect.width / 2 - (panel.x + panel.width / 2) * scale;
    const targetY = containerRect.height / 2 - (panel.y + panel.height / 2) * scale;

    this.renderer.setOffset(targetX, targetY);
    this.scheduleRender();
  }

  public reorderPanels(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.panels.length) return;
    if (toIndex < 0 || toIndex >= this.panels.length) return;

    const [removed] = this.panels.splice(fromIndex, 1);
    this.panels.splice(toIndex, 0, removed);

    if (this.onPanelsChange) this.onPanelsChange();
    this.render();
  }

  public deletePanel(id: string): void {
    const idx = this.panels.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.imageManager.removeThumbnail(id);
      this.panels.splice(idx, 1);
      if (this.selectedPanelId === id) {
        this.selectedPanelId = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
      }
      if (this.onPanelsChange) this.onPanelsChange();
      this.render();
    }
  }

  public resetView(): void {
    this.renderer.setScale(1);
    this.renderer.setOffset(50, 50);
    this.render();
  }

  public export(template: ExportTemplate): void {
    const exportCanvas = this.renderer.exportFrame(this.panels, this.layoutConfig, template);
    this.imageManager.exportAsPNG(exportCanvas, `panel-workshop-${template.id}-${Date.now()}.png`);
  }

  public getExportTemplates(): ExportTemplate[] {
    return EXPORT_TEMPLATES;
  }

  public getSelectedPanelId(): string | null {
    return this.selectedPanelId;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
