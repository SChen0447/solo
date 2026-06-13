import { SimulationManager, type Star } from './simulation';
import { Renderer } from './renderer';
import { ControlsManager } from './controls';

class App {
  private canvas: HTMLCanvasElement;
  private sim: SimulationManager;
  private renderer: Renderer;
  private controls: ControlsManager;
  private lastTime: number = 0;
  private draggingStar: Star | null = null;
  private rightDragging: boolean = false;
  private lastRightX: number = 0;
  private lastRightY: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragMoved: boolean = false;
  private rafId: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.sim = new SimulationManager(width, height);
    this.renderer = new Renderer(this.canvas);
    this.renderer.resize(width, height);
    this.controls = new ControlsManager('controls', this.sim);

    this.registerEvents();
    this.hideLoading();
    this.startLoop();
  }

  private hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('fade');
        setTimeout(() => loading.remove(), 700);
      }, 2000);
    }
    const controlsContainer = document.getElementById('controls');
    if (controlsContainer) {
      setTimeout(() => controlsContainer.classList.add('active'), 2000);
    }
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;
    const z = this.renderer.zoom;
    const ox = this.renderer.offsetX;
    const oy = this.renderer.offsetY;
    return {
      x: (sx - cx) / z + cx - ox,
      y: (sy - cy) / z + cy - oy
    };
  }

  private registerEvents() {
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      if (e.button === 2) {
        this.rightDragging = true;
        this.lastRightX = e.clientX;
        this.lastRightY = e.clientY;
        return;
      }

      if (e.button === 0) {
        const existing = this.sim.getStarAt(world.x, world.y);
        if (existing) {
          this.draggingStar = existing;
          existing.isDragging = true;
          existing.dragOffsetX = world.x - existing.x;
          existing.dragOffsetY = world.y - existing.y;
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.dragMoved = false;
          this.renderer.draggingStar = existing;
          this.renderer.dragMouseX = world.x;
          this.renderer.dragMouseY = world.y;
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      if (this.draggingStar) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.dragMoved = true;
        }
        this.draggingStar.x = world.x - this.draggingStar.dragOffsetX;
        this.draggingStar.y = world.y - this.draggingStar.dragOffsetY;
        this.draggingStar.vx = 0;
        this.draggingStar.vy = 0;
        this.renderer.dragMouseX = world.x;
        this.renderer.dragMouseY = world.y;
      }

      if (this.rightDragging) {
        const dx = e.clientX - this.lastRightX;
        const dy = e.clientY - this.lastRightY;
        this.sim.targetZoom = Math.max(0.5, Math.min(3, this.sim.targetZoom + (dx + dy) * 0.002));
        this.renderer.zoom = this.sim.zoom;
        this.lastRightX = e.clientX;
        this.lastRightY = e.clientY;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      if (e.button === 2) {
        this.rightDragging = false;
        return;
      }

      if (e.button === 0) {
        if (this.draggingStar) {
          this.draggingStar.isDragging = false;
          if (this.dragMoved) {
            const targetX = world.x - this.draggingStar.dragOffsetX;
            const targetY = world.y - this.draggingStar.dragOffsetY;
            const vx = (targetX - this.draggingStar.x) * 3;
            const vy = (targetY - this.draggingStar.y) * 3;
            this.draggingStar.vx = vx;
            this.draggingStar.vy = vy;
          }
          this.draggingStar = null;
          this.renderer.draggingStar = null;
        } else {
          this.sim.addStar(world.x, world.y);
        }
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      this.sim.targetZoom = Math.max(0.5, Math.min(3, this.sim.targetZoom + delta));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.sim.togglePause();
      }
    });

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.sim.resize(w, h);
      this.renderer.resize(w, h);
      this.controls.rebuild();
    });
  }

  private startLoop() {
    this.lastTime = performance.now();

    const tick = (now: number) => {
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (dt > 0.05) dt = 0.05;

      this.sim.update(dt);
      this.renderer.zoom = this.sim.zoom;

      this.renderer.draw(
        dt,
        this.sim.stars,
        this.sim.halos,
        this.sim.particles,
        this.sim.fragments,
        this.sim.vortex,
        this.sim.supernova,
        this.sim.paused
      );

      this.controls.updateStarCount(this.sim.stars.length);

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
