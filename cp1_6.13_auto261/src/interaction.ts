import { ParticleSystem, DragMode, Utils } from './particles';

export interface DragPoint {
  x: number;
  y: number;
  time: number;
}

export class InteractionManager {
  canvas!: HTMLCanvasElement;
  mouseX: number = 0;
  mouseY: number = 0;
  isDragging: boolean = false;
  dragStartTime: number = 0;
  dragPath: DragPoint[] = [];
  currentMode: DragMode = 1;
  particleSystem!: ParticleSystem;
  lastJellyfishTime: number = 0;
  onModeChange: ((mode: DragMode) => void) | null = null;

  private isMouseDown: boolean = false;
  private lastMoveTime: number = 0;
  private flowParticleTimer: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  constructor() {}

  init(canvas: HTMLCanvasElement, particleSystem: ParticleSystem): void {
    this.canvas = canvas;
    this.particleSystem = particleSystem;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));

    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  handleMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.lastMoveTime = performance.now();

    if (this.isDragging) {
      this.addDragPoint(coords.x, coords.y);
      this.processDrag(coords.x, coords.y);
    }
  }

  handleMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.dragStartX = coords.x;
    this.dragStartY = coords.y;
    this.isMouseDown = true;
  }

  handleMouseUp(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    void coords;

    if (this.isDragging) {
      this.isDragging = false;
      this.dragPath = [];
    }

    this.isMouseDown = false;
  }

  handleClick(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    const dragDist = Utils.distance(this.dragStartX, this.dragStartY, coords.x, coords.y);

    if (dragDist < 5) {
      this.particleSystem.createRipple(coords.x, coords.y);
    }
  }

  handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
      this.dragStartX = coords.x;
      this.dragStartY = coords.y;
      this.isMouseDown = true;
    }
  }

  handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
      this.lastMoveTime = performance.now();

      if (this.isDragging) {
        this.addDragPoint(coords.x, coords.y);
        this.processDrag(coords.x, coords.y);
      }
    }
  }

  handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    if (this.isDragging) {
      this.isDragging = false;
      this.dragPath = [];
    }

    this.isMouseDown = false;

    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      const dragDist = Utils.distance(this.dragStartX, this.dragStartY, coords.x, coords.y);

      if (dragDist < 5 && this.dragPath.length < 3) {
        this.particleSystem.createRipple(coords.x, coords.y);
      }
    }
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.setMode(1);
    } else if (e.key === '2') {
      this.setMode(2);
    } else if (e.key === '3') {
      this.setMode(3);
    }
  }

  private setMode(mode: DragMode): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.particleSystem.setMode(mode);
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  private addDragPoint(x: number, y: number): void {
    const now = performance.now();
    this.dragPath.push({ x, y, time: now });

    if (this.dragPath.length > 20) {
      this.dragPath.shift();
    }
  }

  private processDrag(x: number, y: number): void {
    if (this.dragPath.length < 2) return;

    const prev = this.dragPath[this.dragPath.length - 2];
    const vx = (x - prev.x) * 0.3;
    const vy = (y - prev.y) * 0.3;

    switch (this.currentMode) {
      case 1:
        this.processDragMode1(x, y, vx, vy);
        break;
      case 2:
        this.processDragMode2(x, y, vx, vy);
        break;
      case 3:
        this.processDragMode3(x, y);
        break;
    }
  }

  private processDragMode1(x: number, y: number, vx: number, vy: number): void {
    this.flowParticleTimer += 16;
    if (this.flowParticleTimer >= 30) {
      this.flowParticleTimer = 0;
      this.particleSystem.createFlowParticle(x, y, vx, vy);
    }
  }

  private processDragMode2(x: number, y: number, vx: number, vy: number): void {
    this.flowParticleTimer += 16;
    if (this.flowParticleTimer >= 20) {
      this.flowParticleTimer = 0;

      const particleCount = 3;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Utils.randomRange(1, 1.5);
        const sprayVx = Math.cos(angle) * speed + vx * 0.5;
        const sprayVy = Math.sin(angle) * speed + vy * 0.5;
        this.particleSystem.createFlowParticle(x, y, sprayVx, sprayVy);
      }
    }
  }

  private processDragMode3(x: number, y: number): void {
    this.flowParticleTimer += 16;
    if (this.flowParticleTimer >= 40) {
      this.flowParticleTimer = 0;

      const angle = Math.random() * Math.PI * 2;
      const radius = Utils.randomRange(10, 30);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      const tangentAngle = angle + Math.PI / 2;
      const vx = Math.cos(tangentAngle) * 0.8;
      const vy = Math.sin(tangentAngle) * 0.8;

      this.particleSystem.createFlowParticle(px, py, vx, vy);
    }
  }

  update(_deltaTime: number): void {
    if (this.isMouseDown && !this.isDragging) {
      const now = performance.now();
      const moveDelta = now - this.lastMoveTime;

      if (moveDelta < 100) {
        this.isDragging = true;
        this.dragStartTime = now;
        this.lastJellyfishTime = now;
        this.dragPath = [];
        this.addDragPoint(this.mouseX, this.mouseY);
      }
    }

    if (this.isDragging) {
      const now = performance.now();
      const dragDuration = now - this.dragStartTime;
      const timeSinceLastJellyfish = now - this.lastJellyfishTime;

      if (dragDuration > 2000 && timeSinceLastJellyfish > 3000) {
        const jellyfishCount = Math.floor(Utils.randomRange(3, 6));
        this.particleSystem.createJellyfish(jellyfishCount);
        this.lastJellyfishTime = now;
      }
    }
  }

  getDragPoints(): { x: number; y: number }[] {
    return this.dragPath.map((p) => ({ x: p.x, y: p.y }));
  }
}
