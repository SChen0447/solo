import type { ILayerConfig, BlendMode, ExportFormat, IColorStop } from './types';
import { renderLayersToCanvas, exportToPNG, exportToCSS, exportToSVG } from './gradientEngine';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function defaultLayers(): ILayerConfig[] {
  return [
    {
      id: generateId(),
      type: 'linear',
      startColor: { color: '#FF6B6B', opacity: 1 },
      endColor: { color: '#4ECDC4', opacity: 1 },
      angle: 45,
      radius: 100,
      blendMode: 'normal',
    },
    {
      id: generateId(),
      type: 'radial',
      startColor: { color: '#FFE66D', opacity: 0.6 },
      endColor: { color: '#FF6B6B', opacity: 0 },
      angle: 0,
      radius: 150,
      blendMode: 'screen',
    },
    {
      id: generateId(),
      type: 'linear',
      startColor: { color: '#556270', opacity: 0.8 },
      endColor: { color: '#C7F464', opacity: 0.3 },
      angle: 135,
      radius: 100,
      blendMode: 'overlay',
    },
  ];
}

function getHue(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return h;
}

export class UIController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layersList: HTMLElement;
  private paletteGrid: HTMLElement;
  private copyToast: HTMLElement;
  private exportModal: HTMLElement;
  private exportPreview: HTMLElement;
  private copyExportBtn: HTMLButtonElement;
  private layers: ILayerConfig[];
  private currentExportTab: ExportFormat = 'png';
  private draggedId: string | null = null;
  private rafPending = false;

  constructor() {
    this.canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.layersList = document.getElementById('layersList') as HTMLElement;
    this.paletteGrid = document.getElementById('paletteGrid') as HTMLElement;
    this.copyToast = document.getElementById('copyToast') as HTMLElement;
    this.exportModal = document.getElementById('exportModal') as HTMLElement;
    this.exportPreview = document.getElementById('exportPreview') as HTMLElement;
    this.copyExportBtn = document.getElementById('copyExportBtn') as HTMLButtonElement;

    this.layers = defaultLayers();

    this.bindExportEvents();
  }

  init(): void {
    this.renderLayers();
    this.renderPalette();
    this.requestRedraw();
  }

  private bindExportEvents(): void {
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const modalClose = document.getElementById('modalClose') as HTMLButtonElement;
    const tabs = document.querySelectorAll('.export-tab') as NodeListOf<HTMLButtonElement>;

    exportBtn.addEventListener('click', () => this.openExportModal());
    modalClose.addEventListener('click', () => this.closeExportModal());
    this.exportModal.addEventListener('click', (e) => {
      if (e.target === this.exportModal) this.closeExportModal();
    });

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentExportTab = tab.dataset.tab as ExportFormat;
        this.renderExportPreview();
      });
    });

    this.copyExportBtn.addEventListener('click', () => this.handleExportAction());
  }

  private openExportModal(): void {
    this.exportModal.classList.remove('hidden');
    this.renderExportPreview();
  }

  private closeExportModal(): void {
    this.exportModal.classList.add('hidden');
  }

  private renderExportPreview(): void {
    const { width, height } = this.canvas;

    switch (this.currentExportTab) {
      case 'png': {
        const dataUrl = exportToPNG(this.layers, width, height);
        this.exportPreview.innerHTML = `<img src="${dataUrl}" style="max-width:100%;border-radius:8px;display:block;margin:0 auto;" alt="preview" />`;
        this.copyExportBtn.textContent = '下载 PNG';
        break;
      }
      case 'css': {
        const code = exportToCSS(this.layers, width, height);
        this.exportPreview.innerHTML = `<pre class="code-block"></pre>`;
        (this.exportPreview.querySelector('.code-block') as HTMLElement).textContent = code;
        this.copyExportBtn.textContent = '复制代码';
        break;
      }
      case 'svg': {
        const code = exportToSVG(this.layers, width, height);
        this.exportPreview.innerHTML = `<pre class="code-block"></pre>`;
        (this.exportPreview.querySelector('.code-block') as HTMLElement).textContent = code;
        this.copyExportBtn.textContent = '复制代码';
        break;
      }
    }
  }

  private handleExportAction(): void {
    const { width, height } = this.canvas;

    switch (this.currentExportTab) {
      case 'png': {
        const dataUrl = exportToPNG(this.layers, width, height);
        const link = document.createElement('a');
        link.download = 'gradient.png';
        link.href = dataUrl;
        link.click();
        break;
      }
      case 'css': {
        const code = exportToCSS(this.layers, width, height);
        this.copyToClipboard(code);
        break;
      }
      case 'svg': {
        const code = exportToSVG(this.layers, width, height);
        this.copyToClipboard(code);
        break;
      }
    }
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制');
    });
  }

  private showToast(message: string): void {
    this.copyToast.textContent = message;
    this.copyToast.classList.add('show');
    setTimeout(() => {
      this.copyToast.classList.remove('show');
    }, 1500);
  }

  private requestRedraw(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      renderLayersToCanvas(this.ctx, this.layers, this.canvas.width, this.canvas.height);
    });
  }

  private renderLayers(): void {
    this.layersList.innerHTML = '';

    this.layers.forEach((layer) => {
      const card = this.createLayerCard(layer);
      this.layersList.appendChild(card);
    });
  }

  private createLayerCard(layer: ILayerConfig): HTMLElement {
    const card = document.createElement('div');
    card.className = 'layer-card';
    card.dataset.layerId = layer.id;
    card.draggable = true;

    card.innerHTML = `
      <div class="drag-handle">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="layer-controls">
        <div class="control-row">
          <label class="control-label">渐变类型</label>
          <select data-field="type">
            <option value="linear" ${layer.type === 'linear' ? 'selected' : ''}>线性渐变</option>
            <option value="radial" ${layer.type === 'radial' ? 'selected' : ''}>径向渐变</option>
          </select>
        </div>

        <div class="control-row">
          <label class="control-label">颜色起止点</label>
          <div class="colors-row">
            <div class="color-group">
              <input type="color" data-field="startColor" value="${layer.startColor.color}" />
              <input type="number" class="opacity-input" data-field="startOpacity" min="0" max="1" step="0.1" value="${layer.startColor.opacity}" />
            </div>
            <div class="color-group">
              <input type="color" data-field="endColor" value="${layer.endColor.color}" />
              <input type="number" class="opacity-input" data-field="endOpacity" min="0" max="1" step="0.1" value="${layer.endColor.opacity}" />
            </div>
          </div>
        </div>

        <div class="control-row" data-param="angle" style="${layer.type === 'radial' ? 'display:none;' : ''}">
          <label class="control-label">角度</label>
          <div class="control-row-inline">
            <input type="range" data-field="angle" min="0" max="360" value="${layer.angle}" />
            <span class="range-value">${layer.angle}°</span>
          </div>
        </div>

        <div class="control-row" data-param="radius" style="${layer.type === 'linear' ? 'display:none;' : ''}">
          <label class="control-label">半径</label>
          <div class="control-row-inline">
            <input type="range" data-field="radius" min="20" max="200" value="${layer.radius}" />
            <span class="range-value">${layer.radius}px</span>
          </div>
        </div>

        <div class="control-row">
          <label class="control-label">混合模式</label>
          <select data-field="blendMode">
            <option value="normal" ${layer.blendMode === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>Multiply</option>
            <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>Screen</option>
            <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>Overlay</option>
          </select>
        </div>
      </div>
    `;

    this.bindLayerEvents(card, layer);
    return card;
  }

  private bindLayerEvents(card: HTMLElement, layer: ILayerConfig): void {
    const typeSelect = card.querySelector('[data-field="type"]') as HTMLSelectElement;
    const startColorInput = card.querySelector('[data-field="startColor"]') as HTMLInputElement;
    const endColorInput = card.querySelector('[data-field="endColor"]') as HTMLInputElement;
    const startOpacityInput = card.querySelector('[data-field="startOpacity"]') as HTMLInputElement;
    const endOpacityInput = card.querySelector('[data-field="endOpacity"]') as HTMLInputElement;
    const angleInput = card.querySelector('[data-field="angle"]') as HTMLInputElement;
    const radiusInput = card.querySelector('[data-field="radius"]') as HTMLInputElement;
    const blendModeSelect = card.querySelector('[data-field="blendMode"]') as HTMLSelectElement;
    const angleRow = card.querySelector('[data-param="angle"]') as HTMLElement;
    const radiusRow = card.querySelector('[data-param="radius"]') as HTMLElement;

    const updateParamVisibility = () => {
      const type = (typeSelect.value as 'linear' | 'radial');
      angleRow.style.display = type === 'linear' ? '' : 'none';
      radiusRow.style.display = type === 'radial' ? '' : 'none';
    };

    typeSelect.addEventListener('change', () => {
      layer.type = typeSelect.value as 'linear' | 'radial';
      updateParamVisibility();
      this.requestRedraw();
    });

    startColorInput.addEventListener('input', () => {
      layer.startColor.color = startColorInput.value;
      this.requestRedraw();
      this.renderPalette();
    });

    endColorInput.addEventListener('input', () => {
      layer.endColor.color = endColorInput.value;
      this.requestRedraw();
      this.renderPalette();
    });

    startOpacityInput.addEventListener('input', () => {
      layer.startColor.opacity = Math.max(0, Math.min(1, parseFloat(startOpacityInput.value) || 0));
      this.requestRedraw();
    });

    endOpacityInput.addEventListener('input', () => {
      layer.endColor.opacity = Math.max(0, Math.min(1, parseFloat(endOpacityInput.value) || 0));
      this.requestRedraw();
    });

    angleInput.addEventListener('input', () => {
      layer.angle = parseInt(angleInput.value);
      (angleInput.nextElementSibling as HTMLElement).textContent = `${layer.angle}°`;
      this.requestRedraw();
    });

    radiusInput.addEventListener('input', () => {
      layer.radius = parseInt(radiusInput.value);
      (radiusInput.nextElementSibling as HTMLElement).textContent = `${layer.radius}px`;
      this.requestRedraw();
    });

    blendModeSelect.addEventListener('change', () => {
      layer.blendMode = blendModeSelect.value as BlendMode;
      this.requestRedraw();
    });

    card.addEventListener('dragstart', (e) => this.handleDragStart(e, layer.id));
    card.addEventListener('dragend', () => this.handleDragEnd());
    card.addEventListener('dragover', (e) => this.handleDragOver(e, card));
    card.addEventListener('dragleave', () => this.handleDragLeave(card));
    card.addEventListener('drop', (e) => this.handleDrop(e, layer.id));
  }

  private handleDragStart(e: DragEvent, id: string): void {
    this.draggedId = id;
    const card = e.currentTarget as HTMLElement;
    card.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  private handleDragEnd(): void {
    this.draggedId = null;
    document.querySelectorAll('.layer-card').forEach((card) => {
      card.classList.remove('dragging', 'drag-over');
    });
  }

  private handleDragOver(e: DragEvent, card: HTMLElement): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    card.classList.add('drag-over');
  }

  private handleDragLeave(card: HTMLElement): void {
    card.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, targetId: string): void {
    e.preventDefault();
    const card = e.currentTarget as HTMLElement;
    card.classList.remove('drag-over');

    if (!this.draggedId || this.draggedId === targetId) return;

    const fromIndex = this.layers.findIndex((l) => l.id === this.draggedId);
    const toIndex = this.layers.findIndex((l) => l.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, moved);

    this.renderLayers();
    this.requestRedraw();
  }

  private renderPalette(): void {
    const colorSet = new Map<string, IColorStop>();

    this.layers.forEach((layer) => {
      const sKey = `${layer.startColor.color}_${layer.startColor.opacity}`;
      if (!colorSet.has(sKey)) {
        colorSet.set(sKey, layer.startColor);
      }
      const eKey = `${layer.endColor.color}_${layer.endColor.opacity}`;
      if (!colorSet.has(eKey)) {
        colorSet.set(eKey, layer.endColor);
      }
    });

    const colors = Array.from(colorSet.values()).sort((a, b) => getHue(a.color) - getHue(b.color));

    this.paletteGrid.innerHTML = '';

    colors.forEach((stop) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = `rgba(${this.hexToRgbArr(stop.color).join(', ')}, ${stop.opacity})`;
      swatch.title = `${stop.color} (${Math.round(stop.opacity * 100)}%)`;

      swatch.addEventListener('click', () => {
        const detail = `${stop.color}  透明度: ${Math.round(stop.opacity * 100)}%`;
        this.copyToClipboard(detail);
      });

      this.paletteGrid.appendChild(swatch);
    });
  }

  private hexToRgbArr(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }
}
