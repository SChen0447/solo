import gsap from 'gsap';
import type { ShapeType } from './types';
import { LayerManager } from './layerManager';
import { Renderer } from './renderer';

export class UIController {
  private layerManager: LayerManager;
  private renderer: Renderer;
  private activeTool: ShapeType = 'rectangle';
  private isDrawing: boolean = false;
  private drawStartX: number = 0;
  private drawStartY: number = 0;
  private draggingLayerIndex: number = -1;
  private dragGhost: HTMLElement | null = null;

  constructor(layerManager: LayerManager, renderer: Renderer) {
    this.layerManager = layerManager;
    this.renderer = renderer;
    this.init();
  }

  private init(): void {
    this.initColorWheel();
    this.initLayerList();
    this.initShapeTools();
    this.initToolbar();
    this.initAddLayerBtn();
    this.initExportBtn();
    this.initBgColorPicker();
    this.initOpacitySlider();
    this.initBlendMode();
    this.initHalftoneSlider();
    this.initColorHexInput();
    this.initSvgUpload();
    this.initCanvasEvents();
    this.initDragAndDrop();
  }

  private initColorWheel(): void {
    const canvas = document.getElementById('colorWheel') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const size = 160;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;

    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = (angle - 0.5) * Math.PI / 180;
      const endAngle = (angle + 0.5) * Math.PI / 180;

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `hsl(${angle}, 100%, 100%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.7);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    let isSelecting = false;
    const glow = document.getElementById('colorGlow')!;

    const getColorAtPosition = (x: number, y: number): string => {
      const rect = canvas.getBoundingClientRect();
      const px = (x - rect.left) * (canvas.width / rect.width);
      const py = (y - rect.top) * (canvas.height / rect.height);

      const dx = px - centerX;
      const dy = py - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) return '#e74c3c';

      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const saturation = Math.min(dist / radius, 1) * 100;
      const lightness = 50 + (1 - dist / radius) * 25;

      return this.hslToHex(angle < 0 ? angle + 360 : angle, saturation, lightness);
    };

    const updateColor = (x: number, y: number) => {
      const color = getColorAtPosition(x, y);
      const activeLayer = this.layerManager.getActiveLayer();
      if (activeLayer) {
        this.layerManager.updateLayer(activeLayer.id, { color });
      }
      (document.getElementById('colorHex') as HTMLInputElement).value = color;
      this.updateOpacitySliderColor(color);

      const rect = canvas.getBoundingClientRect();
      const glowX = x - rect.left;
      const glowY = y - rect.top;
      glow.style.left = glowX + 'px';
      glow.style.top = glowY + 'px';
      glow.style.color = color;
      glow.classList.add('active');
    };

    canvas.addEventListener('mousedown', (e) => {
      isSelecting = true;
      updateColor(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;
      updateColor(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
      if (isSelecting) {
        isSelecting = false;
        setTimeout(() => glow.classList.remove('active'), 300);
      }
    });
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  private initLayerList(): void {
    this.renderLayerList();

    this.layerManager.subscribe(() => {
      this.renderLayerList();
      this.updatePropertyPanel();
    });
  }

  private renderLayerList(): void {
    const container = document.getElementById('layerList');
    if (!container) return;

    const layers = this.layerManager.getLayers();
    const activeId = this.layerManager.getActiveLayerId();

    container.innerHTML = '';

    layers.slice().reverse().forEach((layer, displayIndex) => {
      const actualIndex = layers.length - 1 - displayIndex;
      const card = document.createElement('div');
      card.className = `layer-card ${layer.id === activeId ? 'active' : ''}`;
      card.dataset.layerId = layer.id;
      card.dataset.index = String(actualIndex);
      card.draggable = true;

      const thumbnail = this.renderer.generateLayerThumbnail(layer, 36, 36);

      card.innerHTML = `
        <div class="layer-thumbnail" style="background-image: url(${thumbnail}); background-size: cover;"></div>
        <div class="layer-info">
          <div class="layer-name">${layer.name}</div>
          <div class="layer-detail">${Math.round(layer.opacity * 100)}% · ${this.getBlendModeLabel(layer.blendMode)}</div>
        </div>
        <div class="layer-actions">
          <button class="layer-action-btn visibility-btn" title="${layer.visible ? '隐藏' : '显示'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${layer.visible 
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
              }
            </svg>
          </button>
          <button class="layer-action-btn delete" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.layer-action-btn')) return;
        this.layerManager.setActiveLayer(layer.id);
      });

      const visBtn = card.querySelector('.visibility-btn');
      visBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.layerManager.toggleLayerVisibility(layer.id);
      });

      const delBtn = card.querySelector('.delete');
      delBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.layerManager.removeLayer(layer.id);
      });

      container.appendChild(card);
    });
  }

  private getBlendModeLabel(mode: string): string {
    switch (mode) {
      case 'multiply': return '正片叠底';
      case 'screen': return '滤色';
      default: return '正常';
    }
  }

  private updatePropertyPanel(): void {
    const layer = this.layerManager.getActiveLayer();
    if (!layer) return;

    (document.getElementById('colorHex') as HTMLInputElement).value = layer.color;
    (document.getElementById('opacitySlider') as HTMLInputElement).value = String(layer.opacity);
    (document.getElementById('opacityValue') as HTMLElement).textContent = Math.round(layer.opacity * 100) + '%';
    (document.getElementById('blendModeSelect') as HTMLSelectElement).value = layer.blendMode;
    (document.getElementById('halftoneSlider') as HTMLInputElement).value = String(layer.halftoneDensity);
    (document.getElementById('halftoneValue') as HTMLElement).textContent = layer.halftoneDensity + ' lpi';

    this.updateOpacitySliderColor(layer.color);
  }

  private updateOpacitySliderColor(color: string): void {
    const slider = document.getElementById('opacitySlider') as HTMLInputElement;
    slider.style.color = color;
  }

  private initShapeTools(): void {
    const buttons = document.querySelectorAll('.shape-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.getAttribute('data-shape') as ShapeType;
      });
    });
  }

  private initToolbar(): void {
    const zoomSlider = document.getElementById('zoomSlider') as HTMLInputElement;
    const zoomValue = document.getElementById('zoomValue') as HTMLElement;
    const resetBtn = document.getElementById('resetViewBtn') as HTMLButtonElement;

    zoomSlider?.addEventListener('input', () => {
      const zoom = parseFloat(zoomSlider.value);
      this.renderer.setZoom(zoom);
      zoomValue.textContent = Math.round(zoom * 100) + '%';
      this.requestRender();
    });

    resetBtn?.addEventListener('click', () => {
      this.renderer.resetView();
      zoomSlider.value = '1';
      zoomValue.textContent = '100%';
      this.requestRender();

      gsap.fromTo(resetBtn, 
        { scale: 1 },
        { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 }
      );
    });
  }

  private initAddLayerBtn(): void {
    const btn = document.getElementById('addLayerBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      this.layerManager.addLayer(randomColor);

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 400);

      gsap.fromTo(btn, 
        { scale: 0.9 },
        { scale: 1, duration: 0.3, ease: 'back.out' }
      );
    });
  }

  private initExportBtn(): void {
    const btn = document.getElementById('exportBtn') as HTMLButtonElement;
    if (!btn) return;

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    btn.appendChild(spinner);

    btn.addEventListener('click', () => {
      if (btn.classList.contains('loading')) return;

      btn.classList.add('loading');

      gsap.delayedCall(0.6, () => {
        const layers = this.layerManager.getLayers();
        const dataUrl = this.renderer.exportPNG(layers, 300);

        const link = document.createElement('a');
        link.download = `丝印作品_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        btn.classList.remove('loading');
      });
    });
  }

  private initBgColorPicker(): void {
    const picker = document.getElementById('bgColorPicker') as HTMLInputElement;
    if (!picker) return;

    picker.addEventListener('input', () => {
      this.renderer.setBackgroundColor(picker.value);
      this.requestRender();
    });
  }

  private initOpacitySlider(): void {
    const slider = document.getElementById('opacitySlider') as HTMLInputElement;
    const valueText = document.getElementById('opacityValue') as HTMLElement;

    slider?.addEventListener('input', () => {
      const opacity = parseFloat(slider.value);
      valueText.textContent = Math.round(opacity * 100) + '%';

      const layer = this.layerManager.getActiveLayer();
      if (layer) {
        this.layerManager.updateLayer(layer.id, { opacity });
      }
    });
  }

  private initBlendMode(): void {
    const select = document.getElementById('blendModeSelect') as HTMLSelectElement;
    select?.addEventListener('change', () => {
      const layer = this.layerManager.getActiveLayer();
      if (layer) {
        this.layerManager.updateLayer(layer.id, { blendMode: select.value as any });
      }
    });
  }

  private initHalftoneSlider(): void {
    const slider = document.getElementById('halftoneSlider') as HTMLInputElement;
    const valueText = document.getElementById('halftoneValue') as HTMLElement;

    slider?.addEventListener('input', () => {
      const density = parseInt(slider.value);
      valueText.textContent = density + ' lpi';

      const layer = this.layerManager.getActiveLayer();
      if (layer) {
        this.layerManager.updateLayer(layer.id, { halftoneDensity: density });
      }
    });
  }

  private initColorHexInput(): void {
    const input = document.getElementById('colorHex') as HTMLInputElement;

    input?.addEventListener('change', () => {
      let color = input.value.trim();
      if (!color.startsWith('#')) {
        color = '#' + color;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        const layer = this.layerManager.getActiveLayer();
        if (layer) {
          this.layerManager.updateLayer(layer.id, { color });
        }
        this.updateOpacitySliderColor(color);
      } else {
        const layer = this.layerManager.getActiveLayer();
        if (layer) {
          input.value = layer.color;
        }
      }
    });
  }

  private initSvgUpload(): void {
    const input = document.getElementById('svgUpload') as HTMLInputElement;
    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const svgContent = evt.target?.result as string;
        const pathMatch = svgContent.match(/<path[^>]*d="([^"]+)"[^>]*>/i);
        
        if (pathMatch) {
          const svgPath = pathMatch[1];
          const activeLayer = this.layerManager.getActiveLayer();
          if (activeLayer) {
            this.layerManager.addSvgShape(activeLayer.id, svgPath, 100, 100, 200, 200);
          }
        }
      };
      reader.readAsText(file);
      input.value = '';
    });
  }

  private initCanvasEvents(): void {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasPos = this.renderer.screenToCanvas(x, y);

      this.isDrawing = true;
      this.drawStartX = canvasPos.x;
      this.drawStartY = canvasPos.y;
    });

    canvas.addEventListener('mousemove', (_e) => {
      if (!this.isDrawing) return;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasPos = this.renderer.screenToCanvas(x, y);

      const width = Math.abs(canvasPos.x - this.drawStartX);
      const height = Math.abs(canvasPos.y - this.drawStartY);

      if (width > 10 && height > 10) {
        const activeLayer = this.layerManager.getActiveLayer();
        if (activeLayer) {
          const minX = Math.min(this.drawStartX, canvasPos.x);
          const minY = Math.min(this.drawStartY, canvasPos.y);
          this.layerManager.addShape(activeLayer.id, this.activeTool, minX, minY, width, height);
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDrawing = false;
    });
  }

  private initDragAndDrop(): void {
    const container = document.getElementById('layerList')!;

    container.addEventListener('dragstart', (e) => {
      const card = (e.target as HTMLElement).closest('.layer-card') as HTMLElement;
      if (!card) return;

      this.draggingLayerIndex = parseInt(card.dataset.index || '-1');
      card.classList.add('dragging');

      this.dragGhost = card.cloneNode(true) as HTMLElement;
      this.dragGhost.classList.add('drag-ghost');
      this.dragGhost.style.width = card.offsetWidth + 'px';
      document.body.appendChild(this.dragGhost);

      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', card.dataset.layerId || '');
    });

    document.addEventListener('dragover', (e) => {
      if (this.dragGhost) {
        this.dragGhost.style.left = e.clientX + 10 + 'px';
        this.dragGhost.style.top = e.clientY + 10 + 'px';
      }

      const card = (e.target as HTMLElement).closest('.layer-card');
      if (card && card.parentElement === container) {
        e.preventDefault();
        container.querySelectorAll('.layer-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetCard = (e.target as HTMLElement).closest('.layer-card') as HTMLElement;
      if (!targetCard || this.draggingLayerIndex === -1) return;

      const toIndex = parseInt(targetCard.dataset.index || '-1');
      if (toIndex !== -1 && toIndex !== this.draggingLayerIndex) {
        this.layerManager.moveLayer(this.draggingLayerIndex, toIndex);
      }

      this.cleanupDrag();
    });

    document.addEventListener('dragend', () => {
      this.cleanupDrag();
    });
  }

  private cleanupDrag(): void {
    this.draggingLayerIndex = -1;
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
    document.querySelectorAll('.layer-card.dragging, .layer-card.drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
  }

  private requestRender(): void {
    const layers = this.layerManager.getLayers();
    this.renderer.render(layers);
  }
}

export default UIController;
