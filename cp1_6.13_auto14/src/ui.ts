import type { BrushMode } from './brush';
import { hueToGradient } from './brush';

export interface UIEvents {
  onBrushChange?: (mode: BrushMode) => void;
  onHueChange?: (hue: number) => void;
  onUndo?: () => void;
}

const TABLET_BREAKPOINT = 768;
const HUE_RING_SIZE = 120;
const MAX_UNDO = 20;

export class UIManager {
  private toolbar: HTMLElement;
  private brushButtons: NodeListOf<HTMLElement>;
  private undoButton: HTMLButtonElement;
  private hueCanvas: HTMLCanvasElement;
  private hueCtx: CanvasRenderingContext2D;
  private hueIndicator: HTMLElement;
  private previewStrip: HTMLElement;
  private hueRing: HTMLElement;
  private currentBrush: BrushMode = 'standard';
  private currentHue: number = 220;
  private isSelectingHue = false;
  private undoStack: number = 0;
  private events: UIEvents;
  private isTablet: boolean = false;

  constructor(events: UIEvents = {}) {
    this.events = events;

    const toolbar = document.getElementById('toolbar');
    const brushBtns = document.querySelectorAll<HTMLElement>('.brush-btn');
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
    const hueCanvas = document.getElementById('hue-canvas') as HTMLCanvasElement | null;
    const hueIndicator = document.getElementById('hue-indicator');
    const previewStrip = document.getElementById('preview-strip');
    const hueRing = document.getElementById('hue-ring');

    if (!toolbar || !undoBtn || !hueCanvas || !hueIndicator || !previewStrip || !hueRing) {
      throw new Error('UI 元素初始化失败，某些 DOM 元素不存在');
    }

    this.toolbar = toolbar;
    this.brushButtons = brushBtns;
    this.undoButton = undoBtn;
    this.hueCanvas = hueCanvas;
    this.hueIndicator = hueIndicator;
    this.previewStrip = previewStrip;
    this.hueRing = hueRing;

    const ctx = this.hueCanvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Hue Canvas 上下文');
    this.hueCtx = ctx;

    this.init();
  }

  private init(): void {
    this.drawHueRing();
    this.setHue(this.currentHue);
    this.setBrush(this.currentBrush);
    this.bindEvents();
    this.checkResponsive();
  }

  private bindEvents(): void {
    this.brushButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.brush as BrushMode;
        if (mode) this.setBrush(mode);
      });
    });

    this.undoButton.addEventListener('click', () => {
      this.performUndo();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.performUndo();
      }
    });

    this.hueRing.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isSelectingHue = true;
      this.handleHueSelection(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isSelectingHue) {
        this.handleHueSelection(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isSelectingHue = false;
    });

    this.hueRing.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isSelectingHue = true;
      const touch = e.touches[0];
      this.handleHueSelection(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isSelectingHue) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleHueSelection(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.isSelectingHue = false;
    });

    window.addEventListener('resize', () => {
      this.checkResponsive();
    });
  }

  private performUndo(): void {
    if (this.undoStack > 0) {
      this.undoStack--;
      this.updateUndoButton();
      if (this.events.onUndo) {
        this.events.onUndo();
      }
    }
  }

  registerAction(): void {
    if (this.undoStack < MAX_UNDO) {
      this.undoStack++;
      this.updateUndoButton();
    }
  }

  resetUndoStack(): void {
    this.undoStack = 0;
    this.updateUndoButton();
  }

  private updateUndoButton(): void {
    this.undoButton.disabled = this.undoStack === 0;
    if (this.undoStack > 0) {
      this.undoButton.title = `撤销 (Ctrl+Z)  剩余 ${this.undoStack}/${MAX_UNDO}`;
    } else {
      this.undoButton.title = '撤销 (Ctrl+Z)';
    }
  }

  setBrush(mode: BrushMode): void {
    this.currentBrush = mode;
    this.brushButtons.forEach(btn => {
      const btnMode = btn.dataset.brush as BrushMode;
      if (btnMode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    if (this.events.onBrushChange) {
      this.events.onBrushChange(mode);
    }
  }

  setHue(hue: number): void {
    this.currentHue = hue;
    const center = HUE_RING_SIZE / 2;
    const radius = center - 8;
    const rad = (hue - 90) * Math.PI / 180;
    const x = center + Math.cos(rad) * radius;
    const y = center + Math.sin(rad) * radius;
    this.hueIndicator.style.left = `${x}px`;
    this.hueIndicator.style.top = `${y}px`;
    this.hueIndicator.style.background = `hsl(${hue}, 90%, 58%)`;
    this.previewStrip.style.background = hueToGradient(hue);
    if (this.events.onHueChange) {
      this.events.onHueChange(hue);
    }
  }

  getCurrentHue(): number {
    return this.currentHue;
  }

  getCurrentBrush(): BrushMode {
    return this.currentBrush;
  }

  private drawHueRing(): void {
    const ctx = this.hueCtx;
    const size = HUE_RING_SIZE;
    const center = size / 2;
    const outerRadius = center - 2;
    const innerRadius = outerRadius - 18;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 90.5) * Math.PI / 180;
      const endAngle = (angle + 0.5 - 90) * Math.PI / 180;

      ctx.beginPath();
      ctx.arc(center, center, outerRadius, startAngle, endAngle);
      ctx.arc(center, center, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 95%, 60%)`;
      ctx.fill();
    }

    const innerGrad = ctx.createRadialGradient(center, center, 0, center, center, innerRadius);
    innerGrad.addColorStop(0, 'rgba(30, 30, 40, 0.95)');
    innerGrad.addColorStop(1, 'rgba(20, 20, 30, 0.98)');
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, outerRadius + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  private handleHueSelection(clientX: number, clientY: number): void {
    const rect = this.hueRing.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const size = rect.width;
    const center = size / 2;
    const dx = localX - center;
    const dy = localY - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minR = size / 2 - 28;
    const maxR = size / 2 - 4;

    if (dist < minR || dist > maxR) return;

    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;

    this.setHue(Math.round(angle));
  }

  private checkResponsive(): void {
    const isTabletNow = window.innerWidth <= TABLET_BREAKPOINT;
    if (isTabletNow !== this.isTablet) {
      this.isTablet = isTabletNow;
      if (this.isTablet) {
        this.toolbar.classList.add('bottom');
      } else {
        this.toolbar.classList.remove('bottom');
      }
    }
  }
}
