import type { LightSpot } from './types';
import type { Organism } from './organisms';

export class InteractionManager {
  lightSpots: LightSpot[] = [];
  private canvas: HTMLCanvasElement;
  private organisms: Organism[];
  private onDepthChange: ((depth: number) => void) | null = null;
  private onReset: (() => void) | null = null;
  private sliderDragging: boolean = false;
  private sliderRect: { x: number; y: number; width: number; height: number } | null = null;
  private resetButtonRect: { x: number; y: number; width: number; height: number } | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    organisms: Organism[],
    onDepthChange: (depth: number) => void,
    onReset: () => void
  ) {
    this.canvas = canvas;
    this.organisms = organisms;
    this.onDepthChange = onDepthChange;
    this.onReset = onReset;
    this.setupEvents();
  }

  setSliderRect(rect: { x: number; y: number; width: number; height: number }): void {
    this.sliderRect = rect;
  }

  setResetButtonRect(rect: { x: number; y: number; width: number; height: number }): void {
    this.resetButtonRect = rect;
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('click', (e) => this.onClick(e));
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    if (this.sliderRect && this.isInSliderTrack(x, y)) {
      this.sliderDragging = true;
      this.updateSliderFromY(y);
    }
    if (this.resetButtonRect && this.isInResetButton(x, y)) {
      if (this.onReset) this.onReset();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.mouseX = x;
    this.mouseY = y;

    if (this.sliderDragging) {
      this.updateSliderFromY(y);
    }

    let hovering = false;
    for (const org of this.organisms) {
      org.hovered = org.isPointInside(x, y);
      if (org.hovered) hovering = true;
    }
    this.canvas.style.cursor = hovering ? 'crosshair' : 'default';
  }

  private onMouseUp(): void {
    this.sliderDragging = false;
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    if (this.sliderRect && this.isInSliderTrack(x, y)) return;
    if (this.resetButtonRect && this.isInResetButton(x, y)) return;
    if (this.isInInfoPanel(x, y)) return;

    this.createLightSpot(x, y, performance.now());
  }

  private isInSliderTrack(x: number, y: number): boolean {
    if (!this.sliderRect) return false;
    return (
      x >= this.sliderRect.x - 15 &&
      x <= this.sliderRect.x + this.sliderRect.width + 15 &&
      y >= this.sliderRect.y &&
      y <= this.sliderRect.y + this.sliderRect.height
    );
  }

  private isInResetButton(x: number, y: number): boolean {
    if (!this.resetButtonRect) return false;
    return (
      x >= this.resetButtonRect.x &&
      x <= this.resetButtonRect.x + this.resetButtonRect.width &&
      y >= this.resetButtonRect.y &&
      y <= this.resetButtonRect.y + this.resetButtonRect.height
    );
  }

  private isInInfoPanel(x: number, y: number): boolean {
    return x < 220;
  }

  private updateSliderFromY(y: number): void {
    if (!this.sliderRect || !this.onDepthChange) return;
    const relY = y - this.sliderRect.y;
    const ratio = Math.max(0, Math.min(1, relY / this.sliderRect.height));
    const depth = Math.round((ratio * 1000) / 10) * 10;
    this.onDepthChange(depth);
  }

  createLightSpot(x: number, y: number, time: number): void {
    const radius = 50 + Math.random() * 70;
    this.lightSpots.push({
      x,
      y,
      radius,
      maxRadius: radius,
      startTime: time,
      duration: 1500,
    });
    this.checkCollisions(x, y, radius, time);
  }

  private checkCollisions(x: number, y: number, radius: number, time: number): void {
    for (const org of this.organisms) {
      const dx = org.x - x;
      const dy = org.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + org.getCollisionRadius()) {
        org.triggerGlow(time);
      }
    }
  }

  updateLightSpots(time: number): void {
    for (let i = this.lightSpots.length - 1; i >= 0; i--) {
      const spot = this.lightSpots[i];
      if (time - spot.startTime > spot.duration) {
        this.lightSpots.splice(i, 1);
      }
    }
  }

  drawLightSpots(ctx: CanvasRenderingContext2D, time: number): void {
    for (const spot of this.lightSpots) {
      const elapsed = time - spot.startTime;
      const progress = elapsed / spot.duration;
      const alpha = 1 - progress;
      const currentRadius = spot.maxRadius * (0.3 + 0.7 * progress);
      const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, currentRadius);
      gradient.addColorStop(0, `rgba(0, 255, 204, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(0, 255, 204, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(0, 255, 204, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }
}
