import { Vec2, vec2, ToolType, LightSource, Mirror, Lens, LensType, OpticsElement } from './optics';
import { RenderParams } from './raytracer';

export interface UIState {
  currentTool: ToolType;
  params: RenderParams;
}

export class UIController {
  private canvas: HTMLCanvasElement;
  private toolbar: HTMLElement;
  private panel: HTMLElement;
  private tooltip: HTMLElement;
  private onStateChange: (state: UIState) => void;
  private onRenderRequest: () => void;

  private state: UIState = {
    currentTool: 'select',
    params: {
      rayCount: 36,
      lightIntensity: 0.8,
      showLabels: false
    }
  };

  private debounceTimer: number | null = null;
  private isDrawing: boolean = false;
  private drawStart: Vec2 | null = null;
  private currentVertices: Vec2[] = [];
  private lastPreviewPos: Vec2 | null = null;

  public onPlaceElement: ((el: OpticsElement) => void) | null = null;
  public onCanvasMouseMove: ((p: Vec2) => void) | null = null;
  public onDrawingUpdate: ((vertices: Vec2[]) => void) | null = null;
  public onDrawingEnd: (() => void) | null = null;
  public getElementsAtPoint: ((p: Vec2) => OpticsElement | null) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: UIState) => void,
    onRenderRequest: () => void
  ) {
    this.canvas = canvas;
    this.toolbar = document.getElementById('toolbar')!;
    this.panel = document.getElementById('panel')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.onStateChange = onStateChange;
    this.onRenderRequest = onRenderRequest;

    this.bindToolbar();
    this.bindPanel();
    this.bindCanvas();
  }

  getState(): UIState {
    return { ...this.state, params: { ...this.state.params } };
  }

  private bindToolbar(): void {
    const buttons = this.toolbar.querySelectorAll('.tool-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = (btn as HTMLElement).dataset.tool as ToolType;
        this.setTool(tool);
      });
    });
  }

  private setTool(tool: ToolType): void {
    this.state.currentTool = tool;
    const buttons = this.toolbar.querySelectorAll('.tool-btn');
    buttons.forEach(btn => {
      const btnTool = (btn as HTMLElement).dataset.tool;
      btn.classList.toggle('active', btnTool === tool);
    });

    switch (tool) {
      case 'select':
        this.canvas.style.cursor = 'default';
        break;
      case 'light':
        this.canvas.style.cursor = 'crosshair';
        break;
      case 'mirror':
      case 'lens':
        this.canvas.style.cursor = 'crosshair';
        break;
    }

    this.onStateChange(this.state);
  }

  private bindPanel(): void {
    const toggle = document.getElementById('panel-toggle')!;
    toggle.addEventListener('click', () => {
      this.panel.classList.toggle('collapsed');
    });

    const rayCountSlider = document.getElementById('ray-count') as HTMLInputElement;
    const rayCountValue = document.getElementById('ray-count-value')!;
    rayCountSlider.addEventListener('input', () => {
      const v = parseInt(rayCountSlider.value, 10);
      rayCountValue.textContent = String(v);
      this.state.params.rayCount = v;
      this.debouncedRender();
    });

    const intensitySlider = document.getElementById('light-intensity') as HTMLInputElement;
    const intensityValue = document.getElementById('light-intensity-value')!;
    intensitySlider.addEventListener('input', () => {
      const v = parseFloat(intensitySlider.value);
      intensityValue.textContent = v.toFixed(1);
      this.state.params.lightIntensity = v;
      this.debouncedRender();
    });

    const labelsCheckbox = document.getElementById('show-labels') as HTMLInputElement;
    labelsCheckbox.addEventListener('change', () => {
      this.state.params.showLabels = labelsCheckbox.checked;
      this.debouncedRender();
    });
  }

  private debouncedRender(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.onStateChange(this.state);
      this.onRenderRequest();
    }, 300);
  }

  private bindCanvas(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private getCanvasPos(e: MouseEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return vec2(e.clientX - rect.left, e.clientY - rect.top);
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.state.currentTool === 'light') {
      if (e.button === 0) {
        const light = new LightSource(pos.x, pos.y, '#00BFFF');
        this.onPlaceElement?.(light);
      }
      return;
    }

    if (this.state.currentTool === 'mirror') {
      if (e.button === 0) {
        if (!this.isDrawing) {
          this.isDrawing = true;
          this.currentVertices = [pos];
        } else {
          this.currentVertices.push(pos);
        }
        this.onDrawingUpdate?.(this.currentVertices);
      } else if (e.button === 2) {
        if (this.isDrawing && this.currentVertices.length >= 3) {
          const mirror = new Mirror([...this.currentVertices]);
          this.onPlaceElement?.(mirror);
        }
        this.isDrawing = false;
        this.currentVertices = [];
        this.onDrawingEnd?.();
      }
      return;
    }

    if (this.state.currentTool === 'lens') {
      if (e.button === 0) {
        this.isDrawing = true;
        this.drawStart = pos;
      }
      return;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.lastPreviewPos = pos;
    this.onCanvasMouseMove?.(pos);

    if (this.state.currentTool === 'select') {
      const el = this.getElementsAtPoint?.(pos);
      if (el) {
        this.showTooltip(e.clientX, e.clientY, el.getTooltip());
      } else {
        this.hideTooltip();
      }
      return;
    }

    if (this.state.currentTool === 'mirror' && this.isDrawing) {
      this.onDrawingUpdate?.([...this.currentVertices, pos]);
    }

    if (this.state.currentTool === 'lens' && this.isDrawing && this.drawStart) {
      this.onDrawingUpdate?.([this.drawStart, pos]);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.state.currentTool === 'lens' && this.isDrawing && this.drawStart) {
      const dx = pos.x - this.drawStart.x;
      const dy = pos.y - this.drawStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 20) {
        const lensType: LensType = (dx + dy) >= 0 ? 'convex' : 'concave';
        const midX = (this.drawStart.x + pos.x) / 2;
        const midY = (this.drawStart.y + pos.y) / 2;
        const angle = Math.atan2(dy, dx);
        const halfLen = Math.min(dist / 2, 30);
        const start = vec2(midX - Math.cos(angle) * halfLen, midY - Math.sin(angle) * halfLen);
        const end = vec2(midX + Math.cos(angle) * halfLen, midY + Math.sin(angle) * halfLen);
        const lens = new Lens(start, end, lensType);
        this.onPlaceElement?.(lens);
      }
      this.isDrawing = false;
      this.drawStart = null;
      this.onDrawingEnd?.();
    }
  }

  private handleMouseLeave(): void {
    this.hideTooltip();
    if (this.isDrawing && this.state.currentTool === 'lens') {
      this.isDrawing = false;
      this.drawStart = null;
      this.onDrawingEnd?.();
    }
  }

  private showTooltip(clientX: number, clientY: number, text: string): void {
    this.tooltip.innerHTML = text.replace(/\n/g, '<br>');
    this.tooltip.classList.add('visible');
    const rect = this.tooltip.getBoundingClientRect();
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + rect.width > window.innerWidth) x = clientX - rect.width - 8;
    if (y + rect.height > window.innerHeight) y = clientY - rect.height - 8;
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  drawPreview(ctx: CanvasRenderingContext2D, vertices: Vec2[]): void {
    if (this.state.currentTool === 'mirror' && vertices.length >= 1) {
      ctx.strokeStyle = '#ADD8E680';
      ctx.fillStyle = '#ADD8E630';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.state.currentTool === 'lens' && vertices.length === 2) {
      const [s, e] = vertices;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const lensType: LensType = (dx + dy) >= 0 ? 'convex' : 'concave';
      const previewLens = new Lens(s, e, lensType);
      previewLens.draw(ctx);
    }
  }

  isDrawingActive(): boolean {
    return this.isDrawing;
  }
}
