import type { ShapeData, MouseState, RippleEffect, GlazeInfo } from './types';

const INITIAL_HEIGHT = 160;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 250;
const INITIAL_RADIUS = 80;
const MIN_RADIUS = 40;
const MAX_RADIUS = 120;
const HEIGHT_SEGMENTS = 50;
const RADIAL_SEGMENTS = 20;
const BASE_COLOR = '#A0A0A0';
const ROTATION_STEP = 15;
const RIPPLE_DURATION = 500;

export class PotteryController {
  private shape: ShapeData;
  private mouse: MouseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.shape = this.createInitialShape();
    this.mouse = {
      isDragging: false,
      lastX: 0,
      lastY: 0,
      lastMoveTime: 0,
      velocityX: 0,
      velocityY: 0
    };
  }

  private createInitialShape(): ShapeData {
    const radii: number[] = [];
    for (let i = 0; i < HEIGHT_SEGMENTS; i++) {
      radii.push(INITIAL_RADIUS);
    }
    return {
      height: INITIAL_HEIGHT,
      radii,
      heightSegments: HEIGHT_SEGMENTS,
      radialSegments: RADIAL_SEGMENTS,
      viewAngle: 25,
      targetViewAngle: 25,
      glazeMap: new Map(),
      baseColor: BASE_COLOR,
      isGlazing: false,
      selectedGlazeColor: null,
      glazeThickness: 3,
      animationTime: 0,
      ripples: []
    };
  }

  public getShapeData(): ShapeData {
    return this.shape;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public onMouseDown(x: number, y: number): void {
    this.mouse.isDragging = true;
    this.mouse.lastX = x;
    this.mouse.lastY = y;
    this.mouse.lastMoveTime = performance.now();
    this.mouse.velocityX = 0;
    this.mouse.velocityY = 0;
  }

  public onMouseMove(x: number, y: number, canvasRect: { width: number; height: number }): void {
    if (!this.mouse.isDragging) return;

    const now = performance.now();
    const dt = Math.max(1, now - this.mouse.lastMoveTime);
    const dx = x - this.mouse.lastX;
    const dy = y - this.mouse.lastY;

    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    let multiplier = 1;
    if (speed > 0.8) multiplier = 1.5;
    else if (speed < 0.2) multiplier = 0.5;

    this.mouse.velocityX = dx / dt;
    this.mouse.velocityY = dy / dt;

    if (this.shape.isGlazing) {
      this.applyGlazeAtPoint(x, y, canvasRect);
    } else {
      this.deformPottery(dx, dy, multiplier, canvasRect);
    }

    this.mouse.lastX = x;
    this.mouse.lastY = y;
    this.mouse.lastMoveTime = now;

    this.notify();
  }

  public onMouseUp(x: number, y: number, canvasRect: { width: number; height: number }): void {
    if (this.mouse.isDragging && this.shape.isGlazing) {
      this.applyGlazeAtPoint(x, y, canvasRect);
    }
    this.mouse.isDragging = false;
  }

  private deformPottery(dx: number, dy: number, multiplier: number, canvasRect: { width: number; height: number }): void {
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const touchY = this.mouse.lastY - centerY;
    const normalizedY = Math.max(-1, Math.min(1, (touchY + this.shape.height / 2) / this.shape.height));

    if (Math.abs(dy) > Math.abs(dx)) {
      const deltaHeight = -dy * 0.5 * multiplier;
      this.shape.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, this.shape.height + deltaHeight));
    } else {
      const heightIndex = Math.floor(normalizedY * (this.shape.heightSegments - 1));
      const clampedIndex = Math.max(0, Math.min(this.shape.heightSegments - 1, heightIndex));
      const deltaRadius = dx * 0.4 * multiplier;

      const affectRadius = 6;
      for (let i = 0; i < this.shape.heightSegments; i++) {
        const distance = Math.abs(i - clampedIndex);
        if (distance <= affectRadius) {
          const falloff = 1 - (distance / affectRadius);
          const newRadius = this.shape.radii[i] + deltaRadius * falloff;
          this.shape.radii[i] = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, newRadius));
        }
      }
    }
  }

  private applyGlazeAtPoint(x: number, y: number, canvasRect: { width: number; height: number }): void {
    if (!this.shape.selectedGlazeColor) return;

    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;

    const angleRad = (this.shape.viewAngle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);

    for (let h = 0; h < this.shape.heightSegments; h++) {
      const normalizedH = h / (this.shape.heightSegments - 1);
      const worldY = centerY + this.shape.height / 2 - normalizedH * this.shape.height;
      const dyCanvas = y - worldY;
      if (Math.abs(dyCanvas) > 20) continue;

      const radius = this.shape.radii[h];
      const frontZ = radius * cosA;
      const dxFromCenter = x - centerX;

      if (Math.abs(dxFromCenter) <= radius + 5) {
        const key = h;
        const glazeInfo: GlazeInfo = {
          color: this.shape.selectedGlazeColor,
          thickness: this.shape.glazeThickness
        };
        this.shape.glazeMap.set(key, glazeInfo);

        const ripple: RippleEffect = {
          heightIndex: h,
          startTime: performance.now(),
          duration: RIPPLE_DURATION,
          color: this.shape.selectedGlazeColor,
          thickness: this.shape.glazeThickness
        };
        this.shape.ripples.push(ripple);
      }
    }
  }

  public onWheel(deltaY: number): void {
    const direction = deltaY > 0 ? 1 : -1;
    this.shape.targetViewAngle = (this.shape.targetViewAngle + direction * ROTATION_STEP) % 360;
    if (this.shape.targetViewAngle < 0) this.shape.targetViewAngle += 360;
    this.notify();
  }

  public setGlazingMode(enabled: boolean): void {
    this.shape.isGlazing = enabled;
    this.notify();
  }

  public setSelectedGlazeColor(color: string | null): void {
    this.shape.selectedGlazeColor = color;
    if (color) {
      this.shape.isGlazing = true;
    }
    this.notify();
  }

  public setGlazeThickness(thickness: number): void {
    this.shape.glazeThickness = Math.max(1, Math.min(5, thickness));
    this.notify();
  }

  public update(deltaTime: number): void {
    this.shape.animationTime += deltaTime;

    if (this.shape.viewAngle !== this.shape.targetViewAngle) {
      const diff = this.shape.targetViewAngle - this.shape.viewAngle;
      const step = diff * Math.min(1, deltaTime / 1000);
      if (Math.abs(diff) < 0.5) {
        this.shape.viewAngle = this.shape.targetViewAngle;
      } else {
        this.shape.viewAngle += step;
      }
    }

    const now = performance.now();
    this.shape.ripples = this.shape.ripples.filter(r => now - r.startTime < r.duration);
  }

  public reset(): void {
    this.shape = this.createInitialShape();
    this.notify();
  }
}
