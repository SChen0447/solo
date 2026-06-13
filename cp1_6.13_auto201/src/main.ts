import gsap from 'gsap';
import { LightController } from './lightController';
import { ScaleRenderer, PALETTES, Scale } from './scaleRenderer';

interface AppState {
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  viewRotationY: number;
  targetViewRotationY: number;
  hoveredScaleId: string | null;
  pendingClickScale: Scale | null;
  dragStartX: number;
  dragStartY: number;
  hasDragged: boolean;
}

class ScaleApp {
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private lightController: LightController;
  private renderer: ScaleRenderer;
  private state: AppState;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private needsRender: boolean = true;

  private lightHeightSlider: HTMLInputElement;
  private scaleRotationSlider: HTMLInputElement;
  private paletteSelect: HTMLSelectElement;
  private resetBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private lightHeightValue: HTMLElement;
  private scaleRotationValue: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('scaleCanvas') as HTMLCanvasElement;
    this.canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement;

    this.lightHeightSlider = document.getElementById('lightHeight') as HTMLInputElement;
    this.scaleRotationSlider = document.getElementById('scaleRotation') as HTMLInputElement;
    this.paletteSelect = document.getElementById('paletteSelect') as HTMLSelectElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    this.lightHeightValue = document.getElementById('lightHeightValue') as HTMLElement;
    this.scaleRotationValue = document.getElementById('scaleRotationValue') as HTMLElement;

    this.lightController = new LightController();
    this.renderer = new ScaleRenderer(this.canvas, this.lightController);

    this.state = {
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      viewRotationY: 0,
      targetViewRotationY: 0,
      hoveredScaleId: null,
      pendingClickScale: null,
      dragStartX: 0,
      dragStartY: 0,
      hasDragged: false
    };

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.bindEvents();
    this.updateControlColors(0);
    this.startRenderLoop();
  }

  private resizeCanvas(): void {
    const rect = this.canvasWrapper.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
    this.needsRender = true;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => this.onPointerUp(e.clientX, e.clientY));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.onPointerUp(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.state.hoveredScaleId) {
        this.clearHover();
      }
    });

    this.lightHeightSlider.addEventListener('input', () => {
      const value = parseInt(this.lightHeightSlider.value, 10);
      this.lightHeightValue.textContent = String(value);
      this.renderer.setParams({ lightHeight: value });
      this.needsRender = true;
    });

    this.scaleRotationSlider.addEventListener('input', () => {
      const value = parseInt(this.scaleRotationSlider.value, 10);
      this.scaleRotationValue.textContent = value + '°';
      this.renderer.setParams({ scaleRotation: value });
      this.needsRender = true;
    });

    this.paletteSelect.addEventListener('change', () => {
      const value = parseInt(this.paletteSelect.value, 10);
      this.renderer.setParams({ activePaletteIndex: value });
      this.updateControlColors(value);
      this.needsRender = true;
    });

    this.resetBtn.addEventListener('click', () => {
      this.renderer.resetAll();
      this.state.viewRotationY = 0;
      this.state.targetViewRotationY = 0;
      this.lightHeightSlider.value = '50';
      this.scaleRotationSlider.value = '0';
      this.paletteSelect.value = '0';
      this.lightHeightValue.textContent = '50';
      this.scaleRotationValue.textContent = '0°';
      this.renderer.setParams({
        viewRotationY: 0,
        lightHeight: 50,
        scaleRotation: 0,
        activePaletteIndex: 0
      });
      this.updateControlColors(0);
      this.needsRender = true;
    });

    this.exportBtn.addEventListener('click', () => this.exportImage());
  }

  private updateControlColors(paletteIndex: number): void {
    const palette = PALETTES[paletteIndex];
    const primary = palette.primary;

    this.exportBtn.style.background = primary;
    this.exportBtn.style.setProperty('box-shadow', `0 0 12px ${primary}55`);

    const sliders = [this.lightHeightSlider, this.scaleRotationSlider];
    const rgb = hexToRgb(primary);
    const cssColor = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    sliders.forEach(slider => {
      slider.style.setProperty('--thumb-color', primary);
    });

    const styleSheets = document.styleSheets;
    let styleEl: HTMLStyleElement | null = document.getElementById('dynamic-slider-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-slider-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        background: ${primary} !important;
        box-shadow: 0 0 8px rgba(${cssColor}, 0.6) !important;
      }
      input[type="range"]::-moz-range-thumb {
        background: ${primary} !important;
        box-shadow: 0 0 8px rgba(${cssColor}, 0.6) !important;
      }
    `;
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top) * (this.canvas.height / rect.height / (window.devicePixelRatio || 1))
    };
  }

  private onPointerDown(clientX: number, clientY: number): void {
    this.state.isDragging = true;
    this.state.lastMouseX = clientX;
    this.state.lastMouseY = clientY;
    this.state.dragStartX = clientX;
    this.state.dragStartY = clientY;
    this.state.hasDragged = false;

    const pos = this.getCanvasPos(clientX, clientY);
    const scale = this.renderer.findScaleAt(pos.x, pos.y);
    this.state.pendingClickScale = scale || null;
  }

  private onPointerMove(clientX: number, clientY: number): void {
    const pos = this.getCanvasPos(clientX, clientY);

    if (this.state.isDragging) {
      const dx = clientX - this.state.lastMouseX;
      const dy = clientY - this.state.lastMouseY;

      if (Math.abs(clientX - this.state.dragStartX) > 5 || Math.abs(clientY - this.state.dragStartY) > 5) {
        this.state.hasDragged = true;
        this.state.pendingClickScale = null;
      }

      if (this.state.hasDragged) {
        this.state.targetViewRotationY += dx * 0.005;
        this.lightController.setMousePosition(
          pos.x / this.renderer.getCanvasLogicalSize().width,
          pos.y / this.renderer.getCanvasLogicalSize().height
        );
      }

      this.state.lastMouseX = clientX;
      this.state.lastMouseY = clientY;
      this.needsRender = true;
    } else {
      const scale = this.renderer.findScaleAt(pos.x, pos.y);
      const newHoverId = scale ? scale.id : null;
      if (newHoverId !== this.state.hoveredScaleId) {
        this.clearHover();
        if (scale) {
          scale.isHovered = true;
          this.state.hoveredScaleId = scale.id;
        }
        this.needsRender = true;
      }
    }
  }

  private onPointerUp(clientX: number, clientY: number): void {
    const wasDragging = this.state.isDragging;
    this.state.isDragging = false;

    if (!wasDragging) return;

    if (!this.state.hasDragged && this.state.pendingClickScale) {
      this.handleScaleClick(this.state.pendingClickScale);
    }

    this.state.pendingClickScale = null;
  }

  private clearHover(): void {
    if (this.state.hoveredScaleId) {
      const scales = this.renderer.getScales();
      const s = scales.find(sc => sc.id === this.state.hoveredScaleId);
      if (s) s.isHovered = false;
      this.state.hoveredScaleId = null;
    }
  }

  private handleScaleClick(scale: Scale): void {
    const params = this.renderer.getParams();
    const newPaletteIndex = scale.isSelected ? -1 : params.activePaletteIndex;

    scale.isSelected = !scale.isSelected;
    scale.paletteIndex = newPaletteIndex;
    scale.targetScale = scale.isSelected ? 1.5 : 1;

    if (scale.isSelected) {
      gsap.to(scale, {
        duration: 0.3,
        ease: 'power2.out',
        targetScale: 1.5,
        onUpdate: () => { this.needsRender = true; }
      });

      const neighbors = this.renderer.getNeighborScales(scale, 1);
      neighbors.forEach((n, i) => {
        n.rippleActive = true;
        n.rippleProgress = 0;
        gsap.delayedCall(i * 0.05, () => {
          gsap.to(n, {
            duration: 0,
            rippleActive: true,
            rippleProgress: 0
          });
        });
      });
    } else {
      gsap.to(scale, {
        duration: 0.3,
        ease: 'power2.out',
        targetScale: 1,
        onUpdate: () => { this.needsRender = true; }
      });
    }

    this.needsRender = true;
  }

  private async exportImage(): Promise<void> {
    const exportSize = 1024;
    const wrapper = this.canvasWrapper;

    const originalDpr = window.devicePixelRatio || 1;
    this.renderer.setDpr(2);

    const originalSize = this.renderer.getCanvasLogicalSize();
    this.renderer.resize(exportSize, exportSize);

    this.renderer.render();

    const dataUrl = this.canvas.toDataURL('image/png');

    this.renderer.setDpr(originalDpr);
    this.renderer.resize(originalSize.width, originalSize.height);
    this.needsRender = true;

    const link = document.createElement('a');
    link.download = `鳞变光幻集_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private startRenderLoop(): void {
    const loop = (time: number): void => {
      if (!this.lastTime) this.lastTime = time;
      const deltaTime = Math.min(0.1, (time - this.lastTime) / 1000);
      this.lastTime = time;

      const rotDiff = this.state.targetViewRotationY - this.state.viewRotationY;
      if (Math.abs(rotDiff) > 0.001) {
        this.state.viewRotationY += rotDiff * Math.min(1, deltaTime * 10);
        this.renderer.setParams({ viewRotationY: this.state.viewRotationY });
        this.needsRender = true;
      } else if (this.state.viewRotationY !== this.state.targetViewRotationY) {
        this.state.viewRotationY = this.state.targetViewRotationY;
        this.renderer.setParams({ viewRotationY: this.state.viewRotationY });
        this.needsRender = true;
      }

      this.renderer.updateAnimations(deltaTime);
      if (this.renderer.getScales().some(s => s.rippleActive || Math.abs(s.scale - s.targetScale) > 0.001 || Math.abs(s.glowIntensity - (s.isSelected ? 1 : 0)) > 0.001)) {
        this.needsRender = true;
      }

      if (this.needsRender) {
        this.renderer.render();
        this.needsRender = false;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new ScaleApp();
});
