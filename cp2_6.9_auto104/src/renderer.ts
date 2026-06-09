import { OrigamiModel, FaceTransform } from './origamiModel';

export interface RendererCallbacks {
  onProgressUpdate: (percent: string) => void;
  onFoldStateChange: (isFolded: boolean) => void;
}

export class OrigamiRenderer {
  private model: OrigamiModel;
  private stage: HTMLElement;
  private faceElements: Map<number, HTMLDivElement> = new Map();
  private callbacks: RendererCallbacks;
  private rafId: number | null = null;

  private rotationX: number = 0;
  private rotationY: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private dragStopTime: number = 0;
  private readonly DRAG_DAMPING: number = 0.9;
  private readonly INERTIA_DURATION: number = 500;

  private readonly MIN_X: number = -30;
  private readonly MAX_X: number = 30;
  private readonly MIN_Y: number = -180;
  private readonly MAX_Y: number = 180;

  private hoveredFaceId: number | null = null;

  constructor(
    model: OrigamiModel,
    stage: HTMLElement,
    callbacks: RendererCallbacks
  ) {
    this.model = model;
    this.stage = stage;
    this.callbacks = callbacks;
    this.createFaceElements();
    this.bindEvents();
  }

  private createFaceElements(): void {
    const faceColors = this.model.getAllFaceColors();
    const faceCount = this.model.getFaceCount();

    for (let i = 0; i < faceCount; i++) {
      const faceData = this.model.getFaceData(i);
      if (!faceData) continue;

      const el = document.createElement('div');
      el.className = 'origami-face';
      el.dataset.faceId = String(i);
      el.style.backgroundColor = faceColors.get(i) || '#FF6B6B';

      const minX = Math.min(
        faceData.vertices[0].x,
        faceData.vertices[1].x,
        faceData.vertices[2].x
      );
      const maxX = Math.max(
        faceData.vertices[0].x,
        faceData.vertices[1].x,
        faceData.vertices[2].x
      );
      const minY = Math.min(
        faceData.vertices[0].y,
        faceData.vertices[1].y,
        faceData.vertices[2].y
      );
      const maxY = Math.max(
        faceData.vertices[0].y,
        faceData.vertices[1].y,
        faceData.vertices[2].y
      );
      const width = Math.max(maxX - minX, 20);
      const height = Math.max(maxY - minY, 20);

      el.style.width = width + 'px';
      el.style.height = height + 'px';

      this.faceElements.set(i, el);
      this.stage.appendChild(el);
    }
  }

  private bindEvents(): void {
    this.stage.addEventListener('mousedown', this.onPointerDown.bind(this));
    window.addEventListener('mousemove', this.onPointerMove.bind(this));
    window.addEventListener('mouseup', this.onPointerUp.bind(this));

    this.stage.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false
    });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false
    });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.stage.addEventListener('click', this.onStageClick.bind(this));

    for (const [faceId, el] of this.faceElements) {
      el.addEventListener('mouseenter', () => this.onFaceHover(faceId));
      el.addEventListener('mouseleave', () => this.onFaceLeave());
    }
  }

  private onPointerDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  private onPointerMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;

    this.velocityY = dx * 0.5;
    this.velocityX = dy * 0.5;

    this.rotationY += this.velocityY;
    this.rotationX += this.velocityX;

    this.clampRotation();

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  private onPointerUp(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStopTime = performance.now();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    this.isDragging = true;
    this.lastPointerX = e.touches[0].clientX;
    this.lastPointerY = e.touches[0].clientY;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - this.lastPointerX;
    const dy = e.touches[0].clientY - this.lastPointerY;

    this.velocityY = dx * 0.5;
    this.velocityX = dy * 0.5;

    this.rotationY += this.velocityY;
    this.rotationX += this.velocityX;

    this.clampRotation();

    this.lastPointerX = e.touches[0].clientX;
    this.lastPointerY = e.touches[0].clientY;
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStopTime = performance.now();
    }
  }

  private clampRotation(): void {
    this.rotationX = Math.max(this.MIN_X, Math.min(this.MAX_X, this.rotationX));
    if (this.rotationY > this.MAX_Y) this.rotationY -= 360;
    if (this.rotationY < this.MIN_Y) this.rotationY += 360;
  }

  private onStageClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('origami-face')) {
      this.model.toggleFold();
    }
  }

  private onFaceHover(faceId: number): void {
    this.hoveredFaceId = faceId;
  }

  private onFaceLeave(): void {
    this.hoveredFaceId = null;
  }

  public toggleFold(): void {
    this.model.toggleFold();
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.loop();
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    this.update(now);
    this.render(now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(now: number): void {
    this.model.update(now);

    if (!this.isDragging && (this.velocityX !== 0 || this.velocityY !== 0)) {
      const elapsed = now - this.dragStopTime;
      if (elapsed < this.INERTIA_DURATION) {
        this.velocityX *= this.DRAG_DAMPING;
        this.velocityY *= this.DRAG_DAMPING;

        if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
        if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;

        this.rotationX += this.velocityX;
        this.rotationY += this.velocityY;
        this.clampRotation();
      } else {
        this.velocityX = 0;
        this.velocityY = 0;
      }
    }
  }

  private render(_now: number): void {
    const stageTransform =
      `rotateX(${this.rotationX}deg) rotateY(${this.rotationY}deg) translateZ(0)`;
    this.stage.style.transform = stageTransform;

    const faceCount = this.model.getFaceCount();
    const hoveredId = this.hoveredFaceId;

    for (let i = 0; i < faceCount; i++) {
      const el = this.faceElements.get(i);
      if (!el) continue;

      const ft: FaceTransform | null = this.model.computeFaceTransform(i);
      if (!ft) continue;

      el.style.transform = ft.transform;
      el.style.clipPath = ft.clipPath;
      (el.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = ft.clipPath;

      let opacity = ft.opacity;
      if (hoveredId !== null && hoveredId !== i) {
        opacity = Math.max(0.3, opacity - 0.1);
      }
      el.style.opacity = String(opacity);
    }

    this.callbacks.onProgressUpdate(this.model.getProgressPercent());
    this.callbacks.onFoldStateChange(this.model.getTargetProgress() > 0.5);
  }

  public getRotationX(): number {
    return this.rotationX;
  }

  public getRotationY(): number {
    return this.rotationY;
  }
}
