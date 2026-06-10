import { ShapeType } from './shapes';

export interface ToolbarEvents {
  onShapeChange?: (shape: ShapeType) => void;
  onColorChange?: (color: string) => void;
  onRotationChange?: (axis: 'x' | 'y' | 'z', degrees: number) => void;
  onScaleChange?: (scale: number) => void;
  onModeToggle?: (isNight: boolean) => void;
  onDeleteSelected?: () => void;
  onClearScene?: () => void;
  onBlockSelect?: (shape: ShapeType, color: string) => void;
}

export class Toolbar {
  private selectedShape: ShapeType = 'cube';
  private selectedColor: string = '#e74c3c';
  private isNightMode: boolean = false;
  private isMobile: boolean = false;
  private events: ToolbarEvents = {};

  private shapeButtons!: NodeListOf<HTMLElement>;
  private colorButtons!: NodeListOf<HTMLElement>;
  private transformSection!: HTMLElement;
  private deleteBtn!: HTMLElement;
  private mobilePanel!: HTMLElement;

  private rotXSlider!: HTMLInputElement;
  private rotYSlider!: HTMLInputElement;
  private rotZSlider!: HTMLInputElement;
  private scaleSlider!: HTMLInputElement;

  private mRotXSlider!: HTMLInputElement;
  private mRotYSlider!: HTMLInputElement;
  private mRotZSlider!: HTMLInputElement;
  private mScaleSlider!: HTMLInputElement;

  constructor() {
    this.checkMobile();
    this.bindElements();
    this.bindEvents();
    window.addEventListener('resize', () => this.checkMobile());
  }

  public on(events: ToolbarEvents): void {
    this.events = { ...this.events, ...events };
  }

  public getSelectedShape(): ShapeType {
    return this.selectedShape;
  }

  public getSelectedColor(): string {
    return this.selectedColor;
  }

  public getIsNightMode(): boolean {
    return this.isNightMode;
  }

  public getIsMobile(): boolean {
    return this.isMobile;
  }

  public showTransformControls(show: boolean): void {
    if (this.transformSection) {
      this.transformSection.style.display = show ? 'block' : 'none';
    }
    if (this.deleteBtn) {
      this.deleteBtn.style.display = show ? 'flex' : 'none';
    }
  }

  public showMobilePanel(show: boolean): void {
    if (this.mobilePanel) {
      this.mobilePanel.style.display = show ? 'block' : 'none';
    }
  }

  public setRotationValues(x: number, y: number, z: number): void {
    const radToDeg = (r: number) => Math.round(((r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 180 / Math.PI);
    const dx = radToDeg(x);
    const dy = radToDeg(y);
    const dz = radToDeg(z);

    if (this.rotXSlider) { this.rotXSlider.value = String(dx); this.setText('rot-x-val', dx); }
    if (this.rotYSlider) { this.rotYSlider.value = String(dy); this.setText('rot-y-val', dy); }
    if (this.rotZSlider) { this.rotZSlider.value = String(dz); this.setText('rot-z-val', dz); }
    if (this.mRotXSlider) { this.mRotXSlider.value = String(dx); this.setText('m-rot-x-val', dx); }
    if (this.mRotYSlider) { this.mRotYSlider.value = String(dy); this.setText('m-rot-y-val', dy); }
    if (this.mRotZSlider) { this.mRotZSlider.value = String(dz); this.setText('m-rot-z-val', dz); }
  }

  public setScaleValue(scale: number): void {
    const s = Math.round(scale * 100) / 100;
    if (this.scaleSlider) { this.scaleSlider.value = String(s); this.setText('scale-val', s.toFixed(1)); }
    if (this.mScaleSlider) { this.mScaleSlider.value = String(s); this.setText('m-scale-val', s.toFixed(1)); }
  }

  public updateInfoPanel(
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number },
    scale: number
  ): void {
    this.setText('info-pos-x', pos.x.toFixed(2));
    this.setText('info-pos-y', pos.y.toFixed(2));
    this.setText('info-pos-z', pos.z.toFixed(2));
    const radToDeg = (r: number) => Math.round(((r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 180 / Math.PI);
    this.setText('info-rot-x', String(radToDeg(rot.x)));
    this.setText('info-rot-y', String(radToDeg(rot.y)));
    this.setText('info-rot-z', String(radToDeg(rot.z)));
    this.setText('info-scale', scale.toFixed(2));
    const panel = document.getElementById('info-panel');
    if (panel) panel.style.display = 'block';
  }

  public hideInfoPanel(): void {
    const panel = document.getElementById('info-panel');
    if (panel) panel.style.display = 'none';
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      if (this.isMobile) {
        toolbar.classList.remove('toolbar-left');
        toolbar.classList.add('toolbar-bottom');
      } else {
        toolbar.classList.remove('toolbar-bottom');
        toolbar.classList.add('toolbar-left');
      }
    }
  }

  private bindElements(): void {
    this.shapeButtons = document.querySelectorAll('[data-shape]');
    this.colorButtons = document.querySelectorAll('[data-color]');
    this.transformSection = document.getElementById('transform-section') as HTMLElement;
    this.deleteBtn = document.getElementById('delete-btn') as HTMLElement;
    this.mobilePanel = document.getElementById('mobile-panel') as HTMLElement;

    this.rotXSlider = document.getElementById('rot-x') as HTMLInputElement;
    this.rotYSlider = document.getElementById('rot-y') as HTMLInputElement;
    this.rotZSlider = document.getElementById('rot-z') as HTMLInputElement;
    this.scaleSlider = document.getElementById('scale-slider') as HTMLInputElement;

    this.mRotXSlider = document.getElementById('m-rot-x') as HTMLInputElement;
    this.mRotYSlider = document.getElementById('m-rot-y') as HTMLInputElement;
    this.mRotZSlider = document.getElementById('m-rot-z') as HTMLInputElement;
    this.mScaleSlider = document.getElementById('m-scale') as HTMLInputElement;
  }

  private bindEvents(): void {
    this.shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape as ShapeType;
        if (!shape) return;
        this.selectShape(shape, btn);
      });
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const shape = btn.dataset.shape as ShapeType;
        if (!shape) return;
        this.selectShape(shape, btn);
        if (this.isMobile) {
          this.events.onBlockSelect?.(this.selectedShape, this.selectedColor);
        }
      }, { passive: false });
    });

    this.colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        if (!color) return;
        this.selectColor(color, btn);
      });
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const color = btn.dataset.color;
        if (!color) return;
        this.selectColor(color, btn);
        if (this.isMobile) {
          this.events.onBlockSelect?.(this.selectedShape, this.selectedColor);
        }
      }, { passive: false });
    });

    this.bindSlider(this.rotXSlider, 'x');
    this.bindSlider(this.rotYSlider, 'y');
    this.bindSlider(this.rotZSlider, 'z');
    this.bindSlider(this.mRotXSlider, 'x');
    this.bindSlider(this.mRotYSlider, 'y');
    this.bindSlider(this.mRotZSlider, 'z');

    if (this.scaleSlider) {
      this.scaleSlider.addEventListener('input', () => {
        const v = parseFloat(this.scaleSlider.value);
        this.setText('scale-val', v.toFixed(1));
        this.events.onScaleChange?.(v);
      });
    }
    if (this.mScaleSlider) {
      this.mScaleSlider.addEventListener('input', () => {
        const v = parseFloat(this.mScaleSlider.value);
        this.setText('m-scale-val', v.toFixed(1));
        this.events.onScaleChange?.(v);
      });
    }

    const modeBtn = document.getElementById('mode-toggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        this.isNightMode = !this.isNightMode;
        const icon = modeBtn.querySelector('.mode-icon');
        const text = modeBtn.querySelector('.mode-text');
        if (icon) icon.textContent = this.isNightMode ? '☀️' : '🌙';
        if (text) text.textContent = this.isNightMode ? '日间模式' : '夜景模式';
        modeBtn.classList.toggle('night-active', this.isNightMode);
        this.events.onModeToggle?.(this.isNightMode);
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => this.events.onDeleteSelected?.());
    }
    const mDeleteBtn = document.getElementById('m-delete-btn');
    if (mDeleteBtn) {
      mDeleteBtn.addEventListener('click', () => {
        this.events.onDeleteSelected?.();
        this.showMobilePanel(false);
      });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有积木吗？')) {
          this.events.onClearScene?.();
        }
      });
    }

    const closePanelBtn = document.getElementById('mobile-panel-close');
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => this.showMobilePanel(false));
    }
  }

  private bindSlider(slider: HTMLInputElement, axis: 'x' | 'y' | 'z'): void {
    if (!slider) return;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      const valId = slider.id === 'rot-x' ? 'rot-x-val'
        : slider.id === 'rot-y' ? 'rot-y-val'
        : slider.id === 'rot-z' ? 'rot-z-val'
        : slider.id === 'm-rot-x' ? 'm-rot-x-val'
        : slider.id === 'm-rot-y' ? 'm-rot-y-val'
        : 'm-rot-z-val';
      this.setText(valId, String(Math.round(v)));
      this.events.onRotationChange?.(axis, v * Math.PI / 180);
    });
  }

  private selectShape(shape: ShapeType, btn: Element): void {
    this.selectedShape = shape;
    this.shapeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.events.onShapeChange?.(shape);
  }

  private selectColor(color: string, btn: Element): void {
    this.selectedColor = color;
    this.colorButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.events.onColorChange?.(color);
  }

  private setText(id: string, value: string | number): void {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }
}
