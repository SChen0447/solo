import { CollageManager, FilterType, CollageImage } from './collage';

const FILTERS: { type: FilterType; name: string }[] = [
  { type: 'warm', name: '橘色暖阳' },
  { type: 'cool', name: '蓝调冷色' },
  { type: 'bw', name: '黑白剧场' },
  { type: 'retro', name: '复古胶片' },
  { type: 'watercolor', name: '水彩渲染' },
  { type: 'noise', name: '数码噪点' }
];

type InteractionMode = 'none' | 'drag' | 'rotate' | 'scale';

export class UIController {
  private collage: CollageManager;
  private canvas: HTMLCanvasElement;

  private uploadBtn: HTMLElement;
  private fileInput: HTMLInputElement;
  private thumbnailList: HTMLElement;
  private imgCount: HTMLElement;
  private filterToolbar: HTMLElement;
  private exportBtn: HTMLElement;
  private exportSuccess: HTMLElement;
  private hamburgerBtn: HTMLElement;
  private thumbnailSidebar: HTMLElement;
  private sidebarOverlay: HTMLElement;

  private interactionMode: InteractionMode = 'none';
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartLayerX: number = 0;
  private dragStartLayerY: number = 0;
  private dragStartScale: number = 1;
  private dragStartRotation: number = 0;
  private dragStartMouseAngle: number = 0;
  private zoomCenterX: number = 0;
  private zoomCenterY: number = 0;

  private dragSrcId: string | null = null;
  private placeholder: HTMLElement | null = null;

  private activeFilter: FilterType = 'none';

  constructor(collage: CollageManager, canvas: HTMLCanvasElement) {
    this.collage = collage;
    this.canvas = canvas;

    this.uploadBtn = document.getElementById('uploadBtn')!;
    this.fileInput = document.getElementById('fileInput')! as HTMLInputElement;
    this.thumbnailList = document.getElementById('thumbnailList')!;
    this.imgCount = document.getElementById('imgCount')!;
    this.filterToolbar = document.getElementById('filterToolbar')!;
    this.exportBtn = document.getElementById('exportBtn')!;
    this.exportSuccess = document.getElementById('exportSuccess')!;
    this.hamburgerBtn = document.getElementById('hamburgerBtn')!;
    this.thumbnailSidebar = document.getElementById('thumbnailSidebar')!;
    this.sidebarOverlay = document.getElementById('sidebarOverlay')!;

    this.bindEvents();
    this.renderFilterToolbar();
    this.updateImageCount();
    this.renderThumbnails();
  }

  private bindEvents(): void {
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    window.addEventListener('mouseup', () => this.handleCanvasMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e), { passive: false });

    this.exportBtn.addEventListener('click', (e) => this.handleExport(e));

    this.hamburgerBtn.addEventListener('click', () => this.toggleSidebar());
    this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

    this.collage['events'].onLayersChange = () => {
      this.renderThumbnails();
      this.updateImageCount();
      this.updateResetFilterBtn();
    };
    this.collage['events'].onSelectionChange = (id) => {
      this.renderThumbnails();
      this.updateActiveFilterUI();
      this.updateResetFilterBtn();
    };
  }

  private toggleSidebar(): void {
    this.thumbnailSidebar.classList.toggle('open');
    this.sidebarOverlay.classList.toggle('show');
  }

  private closeSidebar(): void {
    this.thumbnailSidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('show');
  }

  private async handleFileUpload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    const currentCount = this.collage.getLayers().length;
    const remaining = 8 - currentCount;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const img = await this.loadImage(file);
        this.collage.addImage(img);
      } catch (err) {
        console.error('Failed to load image:', err);
      }
    }
    input.value = '';
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleCanvasMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);

    const rotateHit = this.collage.hitRotateHandle(x, y);
    if (rotateHit) {
      this.interactionMode = 'rotate';
      const layer = this.collage.getSelectedLayer();
      if (layer) {
        this.dragStartLayerX = layer.x;
        this.dragStartLayerY = layer.y;
        this.dragStartRotation = layer.rotation;
        this.dragStartMouseAngle = Math.atan2(y - layer.y, x - layer.x) * (180 / Math.PI);
      }
      e.preventDefault();
      return;
    }

    const hit = this.collage.hitTest(x, y);
    if (hit) {
      this.collage.selectLayer(hit);
      const layer = this.collage.getSelectedLayer();
      if (layer) {
        this.interactionMode = 'drag';
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragStartLayerX = layer.x;
        this.dragStartLayerY = layer.y;
        layer.isDragging = true;
        this.collage.requestRedraw();
      }
    } else {
      this.collage.selectLayer(null);
    }
    e.preventDefault();
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);

    if (this.interactionMode === 'drag') {
      const id = this.collage.getSelectedId();
      if (!id) return;
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      this.collage.updateLayer(id, {
        x: this.dragStartLayerX + dx,
        y: this.dragStartLayerY + dy
      });
    } else if (this.interactionMode === 'rotate') {
      const id = this.collage.getSelectedId();
      if (!id) return;
      const currentAngle = Math.atan2(y - this.dragStartLayerY, x - this.dragStartLayerX) * (180 / Math.PI);
      let angle = this.dragStartRotation + (currentAngle - this.dragStartMouseAngle);
      angle = Math.round(angle / 15) * 15;
      this.collage.updateLayer(id, { rotation: angle });
    }
  }

  private handleCanvasMouseUp(): void {
    if (this.interactionMode === 'drag') {
      const layer = this.collage.getSelectedLayer();
      if (layer) {
        layer.isDragging = false;
        this.collage.requestRedraw();
      }
    }
    this.interactionMode = 'none';
  }

  private handleCanvasWheel(e: WheelEvent): void {
    e.preventDefault();
    const id = this.collage.getSelectedId();
    if (!id) return;
    const layer = this.collage.getSelectedLayer();
    if (!layer) return;

    const { x, y } = this.getCanvasCoords(e);
    const delta = -e.deltaY * 0.001;
    const oldScale = layer.scale;
    const newScale = Math.max(0.5, Math.min(3, oldScale * (1 + delta)));
    const scaleRatio = newScale / oldScale;

    const cos = Math.cos((-layer.rotation * Math.PI) / 180);
    const sin = Math.sin((-layer.rotation * Math.PI) / 180);
    const localX = (x - layer.x) * cos - (y - layer.y) * sin;
    const localY = (x - layer.x) * sin + (y - layer.y) * cos;
    const scaledLocalX = localX * scaleRatio;
    const scaledLocalY = localY * scaleRatio;
    const cosBack = Math.cos((layer.rotation * Math.PI) / 180);
    const sinBack = Math.sin((layer.rotation * Math.PI) / 180);
    const newX = x - (scaledLocalX * cosBack - scaledLocalY * sinBack);
    const newY = y - (scaledLocalX * sinBack + scaledLocalY * cosBack);

    this.collage.updateLayer(id, { scale: newScale, x: newX, y: newY });
  }

  private renderThumbnails(): void {
    const layers = this.collage.getLayers();
    const selectedId = this.collage.getSelectedId();
    this.thumbnailList.innerHTML = '';
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach((layer) => {
      const item = document.createElement('div');
      item.className = 'thumbnail-item';
      item.draggable = true;
      item.dataset.id = layer.id;
      if (layer.id === selectedId) {
        item.classList.add('selected');
      }
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 150;
      thumbCanvas.height = 150;
      const tctx = thumbCanvas.getContext('2d')!;
      tctx.fillStyle = '#222';
      tctx.fillRect(0, 0, 150, 150);
      const ratio = layer.image.naturalWidth / layer.image.naturalHeight;
      let dw = 150, dh = 150;
      let dx = 0, dy = 0;
      if (ratio > 1) {
        dh = 150 / ratio;
        dy = (150 - dh) / 2;
      } else {
        dw = 150 * ratio;
        dx = (150 - dw) / 2;
      }
      tctx.drawImage(layer.image, dx, dy, dw, dh);
      if (layer.filteredImage && layer.filterProgress > 0.5) {
        tctx.globalAlpha = layer.filterProgress;
        tctx.drawImage(layer.filteredImage, dx, dy, dw, dh);
      }
      item.appendChild(thumbCanvas);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'thumbnail-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.collage.removeLayer(layer.id);
      });
      item.appendChild(deleteBtn);

      item.addEventListener('click', () => {
        this.collage.selectLayer(layer.id);
      });

      item.addEventListener('dragstart', (e) => this.handleThumbDragStart(e, layer.id, item));
      item.addEventListener('dragover', (e) => this.handleThumbDragOver(e, item));
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => this.handleThumbDrop(e, layer.id, item));
      item.addEventListener('dragend', () => this.handleThumbDragEnd(item));

      this.thumbnailList.appendChild(item);
    });
  }

  private handleThumbDragStart(e: DragEvent, id: string, item: HTMLElement): void {
    this.dragSrcId = id;
    item.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      const rect = item.getBoundingClientRect();
      e.dataTransfer.setDragImage(item, rect.width / 2, rect.height / 2);
    }
  }

  private handleThumbDragOver(e: DragEvent, item: HTMLElement): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (this.dragSrcId && this.dragSrcId !== item.dataset.id) {
      item.classList.add('drag-over');
    }
  }

  private handleThumbDrop(e: DragEvent, targetId: string, item: HTMLElement): void {
    e.preventDefault();
    item.classList.remove('drag-over');
    if (!this.dragSrcId || this.dragSrcId === targetId) return;
    const layers = [...this.collage.getLayers()].sort((a, b) => a.zIndex - b.zIndex);
    const targetIdx = layers.findIndex(l => l.id === targetId);
    this.collage.moveLayerOrder(this.dragSrcId, targetIdx);
  }

  private handleThumbDragEnd(item: HTMLElement): void {
    item.classList.remove('dragging');
    this.dragSrcId = null;
    document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('drag-over'));
  }

  private renderFilterToolbar(): void {
    const title = this.filterToolbar.querySelector('.filter-title');
    this.filterToolbar.innerHTML = '';
    if (title) this.filterToolbar.appendChild(title);

    FILTERS.forEach((filter) => {
      const item = document.createElement('div');
      item.className = 'filter-item';
      item.dataset.type = filter.type;
      const preview = this.createFilterPreview(filter.type);
      item.appendChild(preview);
      const label = document.createElement('div');
      label.className = 'filter-label';
      label.textContent = filter.name;
      item.appendChild(label);
      item.addEventListener('click', () => this.applyFilter(filter.type));
      this.filterToolbar.appendChild(item);
    });
  }

  private createFilterPreview(type: FilterType): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 80, 80);
    switch (type) {
      case 'warm':
        grad.addColorStop(0, '#ff9a56');
        grad.addColorStop(0.5, '#ffd86b');
        grad.addColorStop(1, '#ff6b6b');
        break;
      case 'cool':
        grad.addColorStop(0, '#4facfe');
        grad.addColorStop(0.5, '#7dd3fc');
        grad.addColorStop(1, '#00f2fe');
        break;
      case 'bw':
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.5, '#999');
        grad.addColorStop(1, '#ccc');
        break;
      case 'retro':
        grad.addColorStop(0, '#c39e66');
        grad.addColorStop(0.5, '#8b7355');
        grad.addColorStop(1, '#5d4e37');
        break;
      case 'watercolor':
        grad.addColorStop(0, '#a8e6cf');
        grad.addColorStop(0.5, '#dcedc1');
        grad.addColorStop(1, '#ffd3b6');
        break;
      case 'noise':
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#764ba2');
        break;
      default:
        grad.addColorStop(0, '#ccc');
        grad.addColorStop(1, '#999');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 80, 80);
    if (type === 'noise') {
      const data = ctx.getImageData(0, 0, 80, 80);
      for (let i = 0; i < data.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 50;
        data.data[i] = Math.max(0, Math.min(255, data.data[i] + n));
        data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + n));
        data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + n));
      }
      ctx.putImageData(data, 0, 0);
    }
    return canvas;
  }

  private applyFilter(type: FilterType): void {
    const id = this.collage.getSelectedId();
    if (!id) return;
    this.activeFilter = type;
    this.collage.setFilter(id, type);
    this.updateActiveFilterUI();
    this.updateResetFilterBtn();
    setTimeout(() => this.renderThumbnails(), 400);
  }

  private updateActiveFilterUI(): void {
    const selected = this.collage.getSelectedLayer();
    const currentFilter = selected?.filterType || 'none';
    this.filterToolbar.querySelectorAll('.filter-item').forEach(el => {
      if ((el as HTMLElement).dataset.type === currentFilter) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  private updateResetFilterBtn(): void {
    const selected = this.collage.getSelectedLayer();
    const hasFilter = selected && selected.filterType !== 'none';
    let resetBtn = this.filterToolbar.querySelector('.reset-filter-btn') as HTMLElement | null;
    if (hasFilter) {
      if (!resetBtn) {
        resetBtn = document.createElement('button');
        resetBtn.className = 'reset-filter-btn';
        resetBtn.textContent = '重置滤镜';
        resetBtn.addEventListener('click', () => {
          const id = this.collage.getSelectedId();
          if (id) {
            this.collage.resetFilter(id);
            this.updateActiveFilterUI();
            this.updateResetFilterBtn();
            setTimeout(() => this.renderThumbnails(), 400);
          }
        });
        this.filterToolbar.appendChild(resetBtn);
      }
    } else {
      if (resetBtn) {
        resetBtn.remove();
      }
    }
  }

  private updateImageCount(): void {
    const count = this.collage.getLayers().length;
    this.imgCount.textContent = String(count);
  }

  private handleExport(e: MouseEvent): void {
    const btn = e.currentTarget as HTMLElement;
    this.createRipple(e);
    const layers = this.collage.getLayers();
    if (layers.length === 0) {
      alert('请先添加至少一张图片');
      return;
    }
    const blob = this.collage.exportImage(1920, 1080, 0.9);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `pixel-collage-${ts}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.showExportSuccess();
  }

  private createRipple(e: MouseEvent): void {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  private showExportSuccess(): void {
    this.exportSuccess.classList.add('show');
    setTimeout(() => {
      this.exportSuccess.classList.remove('show');
    }, 2000);
  }

  resizeCanvas(): void {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    const maxWidth = wrapper.clientWidth - 40;
    const maxHeight = wrapper.clientHeight - 40;
    const aspect = 16 / 9;
    let w = maxWidth;
    let h = w / aspect;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
  }
}
