import type { IVisualElement, ElementType, ElementProps } from './elements';
import { createElement } from './elements';

export interface UIDragEvent {
  type: ElementType;
  x: number;
  y: number;
}

export type UIEvent =
  | 'elementCreated'
  | 'elementSelected'
  | 'elementMoved'
  | 'elementDeleted'
  | 'propertyChanged'
  | 'keyframeAdded'
  | 'canvasClick';

export interface UIEventListener {
  (data?: unknown): void;
}

const GRID_SIZE = 10;
const SNAP_DISTANCE = 8;

export class UIController {
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private dragPreviewCanvas: HTMLCanvasElement;
  private listeners: Map<UIEvent, Set<UIEventListener>> = new Map();
  private elements: IVisualElement[] = [];
  private isDragging: boolean = false;
  private draggingType: ElementType | null = null;
  private dragX: number = 0;
  private dragY: number = 0;
  private selectedElementId: string | null = null;
  private movingElementId: string | null = null;
  private moveOffsetX: number = 0;
  private moveOffsetY: number = 0;
  private editingElement: IVisualElement | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    canvasWrapper: HTMLElement,
    dragPreviewCanvas: HTMLCanvasElement
  ) {
    this.canvas = canvas;
    this.canvasWrapper = canvasWrapper;
    this.dragPreviewCanvas = dragPreviewCanvas;
    this.setupEventListeners();
    this.setupResponsiveLayout();
  }

  on(event: UIEvent, listener: UIEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: UIEvent, listener: UIEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: UIEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  setElements(elements: IVisualElement[]): void {
    this.elements = elements;
  }

  getSelectedElement(): IVisualElement | null {
    return this.elements.find(e => e.id === this.selectedElementId) || null;
  }

  setSelectedElement(id: string | null): void {
    this.selectedElementId = id;
    for (const el of this.elements) {
      el.selected = el.id === id;
    }
  }

  private setupEventListeners(): void {
    const materialItems = document.querySelectorAll('.material-item');
    materialItems.forEach(item => {
      item.addEventListener('dragstart', (e) => this.onMaterialDragStart(e));
      item.addEventListener('dragend', () => this.onMaterialDragEnd());
    });

    this.canvasWrapper.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
    this.canvasWrapper.addEventListener('drop', (e) => this.onCanvasDrop(e));
    this.canvasWrapper.addEventListener('dragleave', () => this.onCanvasDragLeave());

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());

    this.setupPropertyPanel();
    this.setupMobileControls();
  }

  private setupResponsiveLayout(): void {
    const checkLayout = () => {
      const isMobile = window.innerWidth < 900;
      const mobileHeader = document.getElementById('mobile-header');
      const mobileSliders = document.getElementById('mobile-sliders');
      const library = document.getElementById('library');
      const properties = document.getElementById('properties');

      if (mobileHeader && mobileSliders && library && properties) {
        if (isMobile) {
          mobileHeader.classList.remove('hidden');
          mobileSliders.classList.remove('hidden');
          library.classList.add('hidden');
          properties.classList.add('hidden');
        } else {
          mobileHeader.classList.add('hidden');
          mobileSliders.classList.add('hidden');
          library.classList.remove('hidden');
          properties.classList.remove('hidden');
        }
      }
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
  }

  private setupMobileControls(): void {
    const toggleLibrary = document.getElementById('toggle-library');
    const toggleProperties = document.getElementById('toggle-properties');
    const libraryPanel = document.getElementById('mobile-library-panel');
    const propertiesPanel = document.getElementById('mobile-properties-panel');
    const closeButtons = document.querySelectorAll('.close-panel');

    toggleLibrary?.addEventListener('click', () => {
      libraryPanel?.classList.toggle('open');
      propertiesPanel?.classList.remove('open');
      const mobileLibraryContent = document.getElementById('mobile-library-content');
      if (mobileLibraryContent) {
        const materialList = document.getElementById('material-list');
        if (materialList) {
          mobileLibraryContent.innerHTML = materialList.innerHTML;
          mobileLibraryContent.querySelectorAll('.material-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.onMaterialDragStart(e));
            item.addEventListener('dragend', () => this.onMaterialDragEnd());
          });
        }
      }
    });

    toggleProperties?.addEventListener('click', () => {
      propertiesPanel?.classList.toggle('open');
      libraryPanel?.classList.remove('open');
      this.updateMobilePropertiesPanel();
    });

    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        (btn.closest('.mobile-panel') as HTMLElement)?.classList.remove('open');
      });
    });
  }

  private updateMobilePropertiesPanel(): void {
    const content = document.getElementById('mobile-properties-content');
    const propertiesContent = document.getElementById('properties-content');
    if (content && propertiesContent) {
      content.innerHTML = propertiesContent.innerHTML;
    }
  }

  private onMaterialDragStart(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    const type = target.dataset.type as ElementType;
    this.draggingType = type;
    this.isDragging = true;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', type);

      const ghostCanvas = document.createElement('canvas');
      ghostCanvas.width = 60;
      ghostCanvas.height = 60;
      const gctx = ghostCanvas.getContext('2d');
      if (gctx) {
        gctx.save();
        gctx.translate(30, 30);
        gctx.globalAlpha = 0.7;
        this.renderMaterialPreview(gctx, type);
        gctx.restore();
      }
      e.dataTransfer.setDragImage(ghostCanvas, 30, 30);
    }
  }

  private onMaterialDragEnd(): void {
    this.isDragging = false;
    this.draggingType = null;
    this.clearDragPreview();
  }

  private onCanvasDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.draggingType) return;

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.dragX = this.snapToGrid(x);
    this.dragY = this.snapToGrid(y);
    this.renderDragPreview();
  }

  private onCanvasDrop(e: DragEvent): void {
    e.preventDefault();
    if (!this.draggingType) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = this.snapToGrid(e.clientX - rect.left);
    const y = this.snapToGrid(e.clientY - rect.top);

    const element = createElement(this.draggingType, x, y);
    this.emit('elementCreated', element);

    this.isDragging = false;
    this.draggingType = null;
    this.clearDragPreview();
  }

  private onCanvasDragLeave(): void {
    this.clearDragPreview();
  }

  private onCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedElement = this.findElementAt(x, y);
    if (clickedElement) {
      this.setSelectedElement(clickedElement.id);
      this.emit('elementSelected', clickedElement);
      this.updatePropertiesPanel(clickedElement);
      this.updateMobilePropertiesPanel();
    } else {
      this.setSelectedElement(null);
      this.emit('canvasClick');
      this.clearPropertiesPanel();
    }
  }

  private onCanvasDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedElement = this.findElementAt(x, y);
    if (clickedElement) {
      this.openPropertyPanel(clickedElement);
    }
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedElement = this.findElementAt(x, y);
    if (clickedElement) {
      this.movingElementId = clickedElement.id;
      this.moveOffsetX = x - clickedElement.x;
      this.moveOffsetY = y - clickedElement.y;
      this.setSelectedElement(clickedElement.id);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.movingElementId) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = this.snapToGrid(e.clientX - rect.left - this.moveOffsetX);
    const y = this.snapToGrid(e.clientY - rect.top - this.moveOffsetY);

    const element = this.elements.find(el => el.id === this.movingElementId);
    if (element) {
      element.x = x;
      element.y = y;
      this.emit('elementMoved', element);
    }
  }

  private onMouseUp(): void {
    if (this.movingElementId) {
      this.movingElementId = null;
    }
  }

  private findElementAt(x: number, y: number): IVisualElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.elements[i].hitTest(x, y)) {
        return this.elements[i];
      }
    }
    return null;
  }

  private snapToGrid(value: number): number {
    const gridPoint = Math.round(value / GRID_SIZE) * GRID_SIZE;
    if (Math.abs(value - gridPoint) <= SNAP_DISTANCE) {
      return gridPoint;
    }
    return value;
  }

  private renderMaterialPreview(ctx: CanvasRenderingContext2D, type: ElementType): void {
    const tempElement = createElement(type, 0, 0);
    tempElement.renderPreview(ctx);
  }

  private renderDragPreview(): void {
    if (!this.draggingType) return;

    const ctx = this.dragPreviewCanvas.getContext('2d');
    if (!ctx) return;

    this.dragPreviewCanvas.width = this.canvas.width;
    this.dragPreviewCanvas.height = this.canvas.height;

    ctx.clearRect(0, 0, this.dragPreviewCanvas.width, this.dragPreviewCanvas.height);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(this.dragX, this.dragY);
    const tempElement = createElement(this.draggingType, 0, 0);
    tempElement.renderPreview(ctx);
    ctx.restore();

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(this.dragX - 40, this.dragY - 40, 80, 80);
    ctx.setLineDash([]);
  }

  private clearDragPreview(): void {
    const ctx = this.dragPreviewCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.dragPreviewCanvas.width, this.dragPreviewCanvas.height);
    }
  }

  private setupPropertyPanel(): void {
    const panel = document.getElementById('property-panel');
    const closeBtn = document.getElementById('panel-close');
    const applyBtn = document.getElementById('panel-apply');
    const keyframeBtn = document.getElementById('panel-keyframe');

    closeBtn?.addEventListener('click', () => {
      panel?.classList.add('hidden');
      this.editingElement = null;
    });

    const rotationSlider = document.getElementById('prop-rotation') as HTMLInputElement;
    const rotationVal = document.getElementById('prop-rotation-val');
    rotationSlider?.addEventListener('input', () => {
      if (rotationVal) rotationVal.textContent = `${rotationSlider.value}°`;
    });

    const scaleSlider = document.getElementById('prop-scale') as HTMLInputElement;
    const scaleVal = document.getElementById('prop-scale-val');
    scaleSlider?.addEventListener('input', () => {
      if (scaleVal) scaleVal.textContent = `${parseFloat(scaleSlider.value).toFixed(1)}x`;
    });

    const opacitySlider = document.getElementById('prop-opacity') as HTMLInputElement;
    const opacityVal = document.getElementById('prop-opacity-val');
    opacitySlider?.addEventListener('input', () => {
      if (opacityVal) opacityVal.textContent = `${opacitySlider.value}%`;
    });

    applyBtn?.addEventListener('click', () => {
      this.applyPropertyChanges();
      panel?.classList.add('hidden');
      this.editingElement = null;
    });

    keyframeBtn?.addEventListener('click', () => {
      if (this.editingElement) {
        const props = this.collectPropertyValues();
        this.emit('keyframeAdded', { elementId: this.editingElement.id, props });
      }
    });
  }

  private openPropertyPanel(element: IVisualElement): void {
    const panel = document.getElementById('property-panel');
    const nameEl = document.getElementById('panel-element-name');
    if (!panel || !nameEl) return;

    this.editingElement = element;
    nameEl.textContent = element.name;

    (document.getElementById('prop-x') as HTMLInputElement).value = String(Math.round(element.x));
    (document.getElementById('prop-y') as HTMLInputElement).value = String(Math.round(element.y));

    const rotationSlider = document.getElementById('prop-rotation') as HTMLInputElement;
    rotationSlider.value = String(element.rotation);
    (document.getElementById('prop-rotation-val') as HTMLElement).textContent = `${element.rotation}°`;

    const scaleSlider = document.getElementById('prop-scale') as HTMLInputElement;
    scaleSlider.value = String(element.scale);
    (document.getElementById('prop-scale-val') as HTMLElement).textContent = `${element.scale.toFixed(1)}x`;

    const opacitySlider = document.getElementById('prop-opacity') as HTMLInputElement;
    opacitySlider.value = String(element.opacity);
    (document.getElementById('prop-opacity-val') as HTMLElement).textContent = `${element.opacity}%`;

    const canvasRect = this.canvas.getBoundingClientRect();
    const panelWidth = 280;
    const panelHeight = 380;
    let left = element.x + canvasRect.left + 60;
    let top = element.y + canvasRect.top + 60;

    if (left + panelWidth > window.innerWidth) {
      left = element.x + canvasRect.left - panelWidth - 20;
    }
    if (top + panelHeight > window.innerHeight) {
      top = window.innerHeight - panelHeight - 20;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.classList.remove('hidden');
  }

  private collectPropertyValues(): Partial<ElementProps> {
    return {
      x: parseFloat((document.getElementById('prop-x') as HTMLInputElement).value) || 0,
      y: parseFloat((document.getElementById('prop-y') as HTMLInputElement).value) || 0,
      rotation: parseFloat((document.getElementById('prop-rotation') as HTMLInputElement).value) || 0,
      scale: parseFloat((document.getElementById('prop-scale') as HTMLInputElement).value) || 1,
      opacity: parseFloat((document.getElementById('prop-opacity') as HTMLInputElement).value) || 100,
    };
  }

  private applyPropertyChanges(): void {
    if (!this.editingElement) return;

    const props = this.collectPropertyValues();
    this.editingElement.updateProps(props);
    this.emit('propertyChanged', { element: this.editingElement, props });
    this.updatePropertiesPanel(this.editingElement);
    this.updateMobilePropertiesPanel();
  }

  private updatePropertiesPanel(element: IVisualElement): void {
    const content = document.getElementById('properties-content');
    if (!content) return;

    content.innerHTML = `
      <div class="prop-item">
        <div class="prop-label" style="border-left-color: ${element.color}">
          <span class="prop-name">${element.name}</span>
          <button class="delete-btn" data-id="${element.id}">删除</button>
        </div>
        <div class="prop-details">
          <div class="prop-row">
            <span>位置:</span>
            <span>${Math.round(element.x)}, ${Math.round(element.y)}</span>
          </div>
          <div class="prop-row">
            <span>旋转:</span>
            <span>${element.rotation}°</span>
          </div>
          <div class="prop-row">
            <span>缩放:</span>
            <span>${element.scale.toFixed(1)}x</span>
          </div>
          <div class="prop-row">
            <span>透明度:</span>
            <span>${element.opacity}%</span>
          </div>
          <div class="prop-row">
            <span>时间范围:</span>
            <span>${element.startTime.toFixed(1)}s - ${element.endTime.toFixed(1)}s</span>
          </div>
          <div class="prop-row">
            <span>关键帧:</span>
            <span>${element.keyframes.length}</span>
          </div>
        </div>
      </div>
      <div class="prop-hint">双击元素可打开详细属性编辑</div>
    `;

    const deleteBtn = content.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', () => {
      this.emit('elementDeleted', element.id);
      this.clearPropertiesPanel();
      this.setSelectedElement(null);
      this.updateMobilePropertiesPanel();
    });
  }

  private clearPropertiesPanel(): void {
    const content = document.getElementById('properties-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-hint">
          <p>请选择或双击沙盘上的元素</p>
          <p>以编辑其属性</p>
        </div>
      `;
    }
  }

  resizeCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.dragPreviewCanvas.width = width;
    this.dragPreviewCanvas.height = height;
  }
}

export function renderGridBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#EAEAEA';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#D0D0D0';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function renderSelectionOutline(
  ctx: CanvasRenderingContext2D,
  element: IVisualElement
): void {
  const bounds = element.getBounds();
  ctx.save();
  ctx.strokeStyle = '#6C63FF';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  ctx.setLineDash([]);

  const handleSize = 8;
  ctx.fillStyle = '#6C63FF';
  const corners = [
    [bounds.x - 4, bounds.y - 4],
    [bounds.x + bounds.width + 4, bounds.y - 4],
    [bounds.x - 4, bounds.y + bounds.height + 4],
    [bounds.x + bounds.width + 4, bounds.y + bounds.height + 4],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
}
