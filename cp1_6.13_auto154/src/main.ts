import gsap from 'gsap';
import { PatternManager, type Point, type ShapeType, type WeaveMode } from './pattern';
import { WeaverEngine, parseHex } from './weaver';
import { Renderer, ParticleSystem, buildShapePoints } from './renderer';

const $ = <T extends Element = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error('找不到元素: ' + sel);
  return el;
};

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

class Application {
  private pattern = new PatternManager();
  private weaver = new WeaverEngine();
  private renderer: Renderer;
  private particles = new ParticleSystem();

  private mainCanvas = $<HTMLCanvasElement>('#mainCanvas');
  private overlayCanvas = $<HTMLCanvasElement>('#overlayCanvas');
  private canvasWrapper = $<HTMLDivElement>('.canvas-wrapper');
  private colorWheelCanvas = $<HTMLCanvasElement>('#colorWheel');
  private lightnessSlider = $<HTMLInputElement>('#lightnessSlider');
  private colorPreview = $<HTMLDivElement>('#colorPreview');
  private colorValue = $<HTMLInputElement>('#colorValue');
  private lineWidthSlider = $<HTMLInputElement>('#lineWidthSlider');
  private lineWidthValue = $<HTMLSpanElement>('#lineWidthValue');
  private symmetrySlider = $<HTMLInputElement>('#symmetrySlider');
  private symmetryValue = $<HTMLSpanElement>('#symmetryValue');
  private weaveModeSelect = $<HTMLSelectElement>('#weaveMode');
  private undoBtn = $<HTMLButtonElement>('#undoBtn');
  private redoBtn = $<HTMLButtonElement>('#redoBtn');
  private playBtn = $<HTMLButtonElement>('#playBtn');
  private playIcon = $<SVGSVGElement>('#playIcon');
  private playText = $<HTMLSpanElement>('#playText');
  private clearBtn = $<HTMLButtonElement>('#clearBtn');
  private paletteSlots = document.querySelectorAll<HTMLDivElement>('.palette-slot');

  private tool: ShapeType = 'free';
  private currentColor: string = '#6366f1';
  private lineWidth: number = 2;
  private drawing: boolean = false;
  private drawingStart: Point | null = null;
  private drawingPoints: Point[] = [];
  private hue: number = 0.68;
  private saturation: number = 0.8;
  private lightness: number = 0.6;
  private activePaletteSlot: 0 | 1 | 2 = 0;
  private playing: boolean = false;
  private lastFrame: number = performance.now();
  private rafId: number = 0;
  private lastContinuousTime: number = 0;
  private gsapContext: gsap.Context | null = null;

  constructor() {
    this.renderer = new Renderer(this.mainCanvas, this.overlayCanvas);
    this.init();
  }

  private init(): void {
    this.resizeCanvases();
    this.setupCenter();
    this.drawColorWheel();
    this.updateUIState();
    this.bindEvents();
    this.startLoop();
  }

  private resizeCanvases(): void {
    const r = this.canvasWrapper.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(500, Math.floor(r.height));
    this.renderer.resize(w, h);
    this.setupCenter();
  }

  private setupCenter(): void {
    const cx = this.renderer.getWidth() / 2;
    const cy = this.renderer.getHeight() / 2;
    this.weaver.setCenter(cx, cy);
  }

  private drawColorWheel(): void {
    const canvas = this.colorWheelCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, w, h);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 0.5) * Math.PI) / 180;
      const hue = angle / 360;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const c1 = hslToRgb(hue, 0, this.lightness);
      const c2 = hslToRgb(hue, 0.85, this.lightness);
      grad.addColorStop(0, `rgb(${c1.r},${c1.g},${c1.b})`);
      grad.addColorStop(1, `rgb(${c2.r},${c2.g},${c2.b})`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const markerR = radius * (this.saturation / 0.85);
    const mx = cx + Math.cos(this.hue * Math.PI * 2) * markerR;
    const my = cy + Math.sin(this.hue * Math.PI * 2) * markerR;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fillStyle = this.currentColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private updateCurrentColor(): void {
    const rgb = hslToRgb(this.hue, this.saturation, this.lightness);
    this.currentColor = rgbToHex(rgb.r, rgb.g, rgb.b);
    this.colorPreview.style.background = this.currentColor;
    this.colorValue.value = this.currentColor;
    this.pattern.setPaletteSlot(this.activePaletteSlot, this.currentColor);
    const slot = document.querySelector<HTMLDivElement>(
      `.palette-slot[data-slot="${this.activePaletteSlot}"] .slot-color`
    );
    if (slot) slot.style.background = this.currentColor;
    this.canvasWrapper.style.setProperty('--pulse-color', this.currentColor);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvases());

    document.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = (btn.dataset.tool as ShapeType) || 'free';
      });
    });

    this.paletteSlots.forEach((slot) => {
      slot.addEventListener('click', () => {
        this.paletteSlots.forEach((s) => s.classList.remove('active'));
        slot.classList.add('active');
        const idx = Number(slot.dataset.slot) as 0 | 1 | 2;
        this.activePaletteSlot = idx;
        const pal = this.pattern.getPalette();
        this.currentColor = pal[idx];
        this.colorFromHex(this.currentColor);
      });
    });

    this.bindColorWheelEvents();

    this.lightnessSlider.addEventListener('input', () => {
      this.lightness = Number(this.lightnessSlider.value) / 100;
      this.drawColorWheel();
      this.updateCurrentColor();
    });

    this.lineWidthSlider.addEventListener('input', () => {
      this.lineWidth = Number(this.lineWidthSlider.value);
      this.lineWidthValue.textContent = this.lineWidth + 'px';
    });

    this.symmetrySlider.addEventListener('input', () => {
      const val = Number(this.symmetrySlider.value);
      this.symmetryValue.textContent = String(val);
      if (this.gsapContext) this.gsapContext.revert();
      this.gsapContext = gsap.context(() => {
        gsap.to(
          { t: 0 },
          {
            t: 1,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: function (this: gsap.TweenVars, self: Application) {
              self.weaver.setSymmetryTransition((this as any).targets()[0].t);
            },
            onUpdateParams: [this],
            onStart: (self: Application) => {
              self.pattern.setSymmetry(val);
            },
            onStartParams: [this]
          }
        );
      });
    });

    this.weaveModeSelect.addEventListener('change', () => {
      const mode = this.weaveModeSelect.value as WeaveMode;
      if (this.gsapContext) this.gsapContext.revert();
      this.gsapContext = gsap.context(() => {
        gsap.to(
          { t: 0 },
          {
            t: 1,
            duration: 1.0,
            ease: 'power2.inOut',
            onUpdate: function (this: gsap.TweenVars, self: Application) {
              const v = (this as any).targets()[0].t;
              self.weaver.setModeTransition(v);
            },
            onUpdateParams: [this],
            onStart: (self: Application, m: WeaveMode) => {
              self.pattern.setWeaveMode(m);
            },
            onStartParams: [this, mode]
          }
        );
      });
    });

    this.undoBtn.addEventListener('click', () => this.doUndo());
    this.redoBtn.addEventListener('click', () => this.doRedo());

    this.playBtn.addEventListener('click', () => this.togglePlay());

    this.clearBtn.addEventListener('click', () => {
      if (this.pattern.getShapes().length === 0) return;
      this.fadeTransition(() => {
        this.pattern.clear();
      });
      this.particles.clear();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.doRedo();
        } else {
          this.doUndo();
        }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      }
    });

    this.bindCanvasDrawingEvents();
  }

  private bindColorWheelEvents(): void {
    let dragging = false;

    const pick = (e: MouseEvent | TouchEvent): void => {
      const rect = this.colorWheelCanvas.getBoundingClientRect();
      let cx: number, cy: number;
      if ('touches' in e && e.touches.length > 0) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else if ('clientX' in e) {
        cx = (e as MouseEvent).clientX - rect.left;
        cy = (e as MouseEvent).clientY - rect.top;
      } else {
        return;
      }
      const w = this.colorWheelCanvas.width;
      const h = this.colorWheelCanvas.height;
      const cxx = w / 2;
      const cyy = h / 2;
      const dx = cx - cxx;
      const dy = cy - cyy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.min(cxx, cyy) - 2;
      if (dist > radius) return;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;
      this.hue = angle / (Math.PI * 2);
      this.saturation = Math.min(0.85, dist / radius * 0.85);
      this.drawColorWheel();
      this.updateCurrentColor();
    };

    this.colorWheelCanvas.addEventListener('mousedown', (e) => {
      dragging = true;
      pick(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (dragging) pick(e);
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
    });

    this.colorWheelCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      dragging = true;
      pick(e);
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (dragging) pick(e);
    });
    document.addEventListener('touchend', () => {
      dragging = false;
    });
  }

  private colorFromHex(hex: string): void {
    const rgb = parseHex(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
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
    this.hue = h;
    this.saturation = Math.min(0.85, s);
    this.lightness = l;
    this.lightnessSlider.value = String(Math.round(l * 100));
    this.drawColorWheel();
    this.colorPreview.style.background = hex;
    this.colorValue.value = hex;
    this.canvasWrapper.style.setProperty('--pulse-color', hex);
  }

  private bindCanvasDrawingEvents(): void {
    const canvas = this.mainCanvas;

    const getPt = (e: MouseEvent | TouchEvent): Point | null => {
      const rect = canvas.getBoundingClientRect();
      let cx: number, cy: number;
      if ('touches' in e && e.touches.length > 0) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else if ('clientX' in e) {
        cx = (e as MouseEvent).clientX - rect.left;
        cy = (e as MouseEvent).clientY - rect.top;
      } else {
        return null;
      }
      return { x: cx, y: cy };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      const p = getPt(e);
      if (!p) return;
      this.drawing = true;
      this.drawingStart = p;
      this.drawingPoints = [p];
      this.canvasWrapper.classList.add('drawing');
    };

    const moveDraw = (e: MouseEvent | TouchEvent) => {
      if (!this.drawing) return;
      const p = getPt(e);
      if (!p) return;
      const last = this.drawingPoints[this.drawingPoints.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 1) return;
      this.drawingPoints.push(p);
    };

    const endDraw = () => {
      if (!this.drawing) return;
      this.drawing = false;
      this.canvasWrapper.classList.remove('drawing');

      let pts: Point[];
      if (this.tool === 'free') {
        pts = this.drawingPoints.slice();
      } else if (this.drawingStart && this.drawingPoints.length > 0) {
        const end = this.drawingPoints[this.drawingPoints.length - 1];
        pts = buildShapePoints(this.tool, this.drawingStart, end);
      } else {
        pts = [];
      }

      const shape = this.pattern.addShape(
        this.tool,
        pts,
        this.currentColor,
        this.lineWidth
      );

      if (shape) {
        const count = 20 + Math.floor(Math.random() * 11);
        this.particles.spawnBurst(shape.points, shape.color, count, 140, 1.5);
        this.updateUIState();
      }

      this.drawingStart = null;
      this.drawingPoints = [];
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    document.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', (e) => {
      if (this.drawing) {
        const related = e.relatedTarget as Node | null;
        if (related && canvas.contains(related)) return;
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDraw(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      moveDraw(e);
    }, { passive: false });
    document.addEventListener('touchend', endDraw);
  }

  private doUndo(): void {
    if (!this.pattern.canUndo()) return;
    this.fadeTransition(() => {
      this.pattern.undo();
    });
    this.updateUIState();
  }

  private doRedo(): void {
    if (!this.pattern.canRedo()) return;
    this.fadeTransition(() => {
      this.pattern.redo();
    });
    this.updateUIState();
  }

  private fadeTransition(action: () => void): void {
    if (this.gsapContext) this.gsapContext.revert();
    this.gsapContext = gsap.context(() => {
      gsap.to(
        { o: 1 },
        {
          o: 0.3,
          duration: 0.15,
          ease: 'power1.in',
          onUpdate: function (this: gsap.TweenVars, self: Application) {
            self.weaver.setFadeOpacity((this as any).targets()[0].o);
          },
          onUpdateParams: [this],
          onComplete: function (self: Application, act: () => void) {
            act();
            gsap.to(
              { o: 0.3 },
              {
                o: 1,
                duration: 0.15,
                ease: 'power1.out',
                onUpdate: function (this: gsap.TweenVars, s: Application) {
                  s.weaver.setFadeOpacity((this as any).targets()[0].o);
                },
                onUpdateParams: [self]
              }
            );
          },
          onCompleteParams: [this, action]
        }
      );
    });
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    if (this.playing) {
      this.playIcon.innerHTML =
        '<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/>';
      this.playText.textContent = '暂停';
    } else {
      this.playIcon.innerHTML = '<path d="M8 5v14l11-7z" fill="currentColor"/>';
      this.playText.textContent = '播放';
    }
  }

  private updateUIState(): void {
    this.undoBtn.disabled = !this.pattern.canUndo();
    this.redoBtn.disabled = !this.pattern.canRedo();

    const pal = this.pattern.getPalette();
    this.paletteSlots.forEach((slot, idx) => {
      const colorDiv = slot.querySelector<HTMLDivElement>('.slot-color');
      if (colorDiv) colorDiv.style.background = pal[idx];
    });

    const sym = this.pattern.getSymmetry();
    this.symmetrySlider.value = String(sym);
    this.symmetryValue.textContent = String(sym);

    const mode = this.pattern.getWeaveMode();
    this.weaveModeSelect.value = mode;
  }

  private startLoop(): void {
    this.lastFrame = performance.now();
    const loop = () => {
      const now = performance.now();
      let dt = (now - this.lastFrame) / 1000;
      if (dt > 0.1) dt = 0.1;
      this.lastFrame = now;

      this.update(dt, now);
      this.render(now);

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number, now: number): void {
    this.weaver.updateAnimationTime(dt * 1000, this.playing);
    this.particles.update(dt);

    if (this.playing) {
      this.lastContinuousTime += dt;
      if (this.lastContinuousTime > 0) {
        const shapes = this.pattern.getShapes();
        const sym = this.pattern.getSymmetry();
        const mode = this.pattern.getWeaveMode();
        const pal = this.pattern.getPalette();
        const anim = this.weaver.getAnimationState();

        for (const shape of shapes) {
          const copies = this.weaver.generateSymmetricCopies(shape, sym, mode);
          for (const mapped of copies) {
            const col = cycleTriColorShallow(
              pal,
              (anim.colorCycle + hashOffsetShallow(shape.id, mapped.rotation)) % 1
            );
            this.particles.spawnContinuous(
              shape.points,
              this.weaver,
              mapped,
              col,
              dt,
              50 / copies.length / Math.max(1, shapes.length * 0.3)
            );
          }
        }
        if (this.lastContinuousTime > 5) this.lastContinuousTime = 0;
      }
    }
  }

  private render(time: number): void {
    const state = this.pattern.getState();
    const fade = this.weaver.getAnimationState().fadeOpacity;

    this.renderer.clearBackground(
      this.weaver.getCenter().x,
      this.weaver.getCenter().y,
      this.currentColor,
      this.drawing,
      time
    );

    this.renderer.drawSymmetricShapes(
      state.shapes,
      this.weaver,
      state.symmetry,
      state.weaveMode,
      state.palette,
      this.playing,
      fade
    );

    this.renderer.drawParticles(this.particles);

    this.renderer.clearOverlay();
    if (this.drawing && this.drawingPoints.length > 0) {
      let previewPoints: Point[];
      if (this.tool === 'free') {
        previewPoints = this.drawingPoints;
      } else if (this.drawingStart) {
        const end = this.drawingPoints[this.drawingPoints.length - 1];
        previewPoints = buildShapePoints(this.tool, this.drawingStart, end);
      } else {
        previewPoints = [];
      }
      this.renderer.drawPreviewPath(previewPoints, this.currentColor, this.lineWidth);
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    if (this.gsapContext) this.gsapContext.revert();
  }
}

function cycleTriColorShallow(
  palette: [string, string, string],
  t: number
): string {
  const idx0 = Math.floor(t * 3) % 3;
  const idx1 = (idx0 + 1) % 3;
  const localT = (t * 3) % 1;
  const ca = parseHex(palette[idx0]);
  const cb = parseHex(palette[idx1]);
  const r = Math.round(ca.r + (cb.r - ca.r) * localT);
  const g = Math.round(ca.g + (cb.g - ca.g) * localT);
  const b = Math.round(ca.b + (cb.b - ca.b) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

function hashOffsetShallow(id: string, rot: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000 + (rot % (Math.PI * 2)) / 100;
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
