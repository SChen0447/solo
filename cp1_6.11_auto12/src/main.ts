import { PhysicsEngine } from './physics';
import { Renderer, RenderState } from './renderer';
import { KnotManager, KnotType } from './knot';
import { UIManager } from './ui';

const NUM_POINTS = 25;
const SEGMENT_LENGTH = 25;
const RESET_FADE_DURATION = 400;

class App {
  private canvas: HTMLCanvasElement;
  private physics: PhysicsEngine;
  private renderer: Renderer;
  private knotManager: KnotManager;
  private ui: UIManager;
  private renderState: RenderState;

  private rafId: number = 0;
  private isMouseDown: boolean = false;
  private hasDragged: boolean = false;
  private clickPointIndex: number = -1;

  private resetFadeStartTime: number = 0;
  private resetPhase: 'idle' | 'fadeOut' | 'reset' | 'fadeIn' = 'idle';

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(this.canvas);
    this.knotManager = new KnotManager();
    this.ui = new UIManager({
      onKnotSelect: (type) => this.handleKnotSelect(type),
      onReset: () => this.startResetAnimation()
    });

    this.renderState = {
      hoveredPoint: -1,
      resetFade: 1,
      resetFading: false
    };

    this.init();
  }

  private init(): void {
    this.resize();
    this.initRope();
    this.bindEvents();
    this.loop();
  }

  private initRope(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const totalWidth = (NUM_POINTS - 1) * SEGMENT_LENGTH;
    const startX = w / 2 - totalWidth / 2;
    const startY = h / 2;

    this.physics.initRope(NUM_POINTS, startX, startY, SEGMENT_LENGTH);
    this.physics.bounds = { width: w, height: h };
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private resize(): void {
    this.renderer.resize();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.physics.bounds = { width: w, height: h };
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const idx = this.physics.findNearestPoint(x, y, 25);

    if (idx !== -1) {
      this.isMouseDown = true;
      this.hasDragged = false;
      this.clickPointIndex = idx;

      if (this.physics.isEndpoint(idx)) {
        return;
      }

      this.physics.startDrag(idx, x, y);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);

    if (this.isMouseDown && this.clickPointIndex !== -1 && !this.physics.isEndpoint(this.clickPointIndex)) {
      const idx = this.clickPointIndex;
      const p = this.physics.points[idx];
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (dist > 3) {
        this.hasDragged = true;
      }
      this.physics.updateDrag(x, y);
    }

    this.renderState.hoveredPoint = this.physics.findNearestPoint(x, y, 20);
    this.canvas.style.cursor = this.renderState.hoveredPoint !== -1 ? 'grab' : 'default';
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isMouseDown && this.clickPointIndex !== -1) {
      if (this.physics.isEndpoint(this.clickPointIndex) && !this.hasDragged) {
        this.physics.togglePinned(this.clickPointIndex);
      }
    }

    this.physics.endDrag();
    this.isMouseDown = false;
    this.hasDragged = false;
    this.clickPointIndex = -1;
  }

  private onMouseLeave(): void {
    this.physics.endDrag();
    this.isMouseDown = false;
    this.hasDragged = false;
    this.clickPointIndex = -1;
    this.renderState.hoveredPoint = -1;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoords(touch);
      const idx = this.physics.findNearestPoint(x, y, 35);

      if (idx !== -1) {
        this.isMouseDown = true;
        this.hasDragged = false;
        this.clickPointIndex = idx;

        if (!this.physics.isEndpoint(idx)) {
          this.physics.startDrag(idx, x, y);
        }
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0 && this.isMouseDown && this.clickPointIndex !== -1) {
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoords(touch);

      if (!this.physics.isEndpoint(this.clickPointIndex)) {
        this.hasDragged = true;
        this.physics.updateDrag(x, y);
      }
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (this.isMouseDown && this.clickPointIndex !== -1) {
      if (this.physics.isEndpoint(this.clickPointIndex) && !this.hasDragged) {
        this.physics.togglePinned(this.clickPointIndex);
      }
    }

    this.physics.endDrag();
    this.isMouseDown = false;
    this.hasDragged = false;
    this.clickPointIndex = -1;
    this.renderState.hoveredPoint = -1;
  }

  private handleKnotSelect(type: KnotType): void {
    if (this.knotManager.isAnimating()) return;

    if (type === KnotType.NONE) {
      this.knotManager.untieKnot(this.physics.points);
    } else {
      if (this.knotManager.state.type !== KnotType.NONE) {
        this.knotManager.untieKnot(this.physics.points);
        setTimeout(() => {
          this.knotManager.tieKnot(type, this.physics.points);
          this.ui.setActiveKnot(type);
        }, 850);
      } else {
        this.knotManager.tieKnot(type, this.physics.points);
      }
    }
  }

  private startResetAnimation(): void {
    if (this.resetPhase !== 'idle') return;
    this.resetPhase = 'fadeOut';
    this.renderState.resetFading = true;
    this.resetFadeStartTime = performance.now();
  }

  private updateResetAnimation(): void {
    if (this.resetPhase === 'idle') return;

    const now = performance.now();
    const elapsed = now - this.resetFadeStartTime;
    const t = Math.min(elapsed / RESET_FADE_DURATION, 1);

    if (this.resetPhase === 'fadeOut') {
      this.renderState.resetFade = 1 - t;
      if (t >= 1) {
        this.doReset();
        this.resetPhase = 'fadeIn';
        this.resetFadeStartTime = performance.now();
      }
    } else if (this.resetPhase === 'fadeIn') {
      this.renderState.resetFade = t;
      if (t >= 1) {
        this.renderState.resetFade = 1;
        this.renderState.resetFading = false;
        this.resetPhase = 'idle';
      }
    }
  }

  private doReset(): void {
    this.initRope();
    this.knotManager.reset();
    this.ui.clearActiveKnot();
  }

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());

    this.updateResetAnimation();

    if (!this.knotManager.isAnimating() && this.resetPhase === 'idle') {
      this.physics.update();
    }

    this.knotManager.update(this.physics.points);

    this.ui.updateData(
      this.physics.points.length,
      this.knotManager.getKnotCount(),
      this.physics.getTotalLength()
    );

    this.renderer.render(this.physics, this.knotManager, this.renderState);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
