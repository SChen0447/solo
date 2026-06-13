import { Kite, COLORS } from './kite';
import { Renderer } from './renderer';

export class InteractionManager {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  kites: Kite[];
  maxKites: number = 5;
  private kiteIdCounter: number = 0;
  private dragKite: Kite | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private windAngle: number = Math.random() * Math.PI * 2;
  private windSpeed: number = 1;
  private windTimer: number = 0;
  private targetWindAngle: number = 0;
  private targetWindSpeed: number = 1;
  private pointerDown: boolean = false;
  private downX: number = 0;
  private downY: number = 0;
  private hasDragged: boolean = false;

  constructor(canvas: HTMLCanvasElement, renderer: Renderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.kites = [];
    this.targetWindAngle = Math.random() * Math.PI * 2;
    this.targetWindSpeed = 1 + Math.random() * 2;
    this.bindEvents();
  }

  bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    this.canvas.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('mouseleave', this.onPointerUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  unbindEvents(): void {
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    this.canvas.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('mouseleave', this.onPointerUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.renderer.resize();
  };

  private getPointerPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private onPointerDown = (e: MouseEvent): void => {
    const pos = this.getPointerPos(e);
    this.handlePointerDown(pos.x, pos.y);
  };

  private onPointerMove = (e: MouseEvent): void => {
    const pos = this.getPointerPos(e);
    this.handlePointerMove(pos.x, pos.y);
  };

  private onPointerUp = (e: MouseEvent): void => {
    const pos = this.getPointerPos(e);
    this.handlePointerUp(pos.x, pos.y);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const pos = this.getPointerPos(e.touches[0]);
    this.handlePointerDown(pos.x, pos.y);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const pos = this.getPointerPos(e.touches[0]);
    this.handlePointerMove(pos.x, pos.y);
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    const pos = { x: this.mouseX, y: this.mouseY };
    if (e.changedTouches.length > 0) {
      const p = this.getPointerPos(e.changedTouches[0]);
      pos.x = p.x;
      pos.y = p.y;
    }
    this.handlePointerUp(pos.x, pos.y);
  };

  private handlePointerDown(x: number, y: number): void {
    this.pointerDown = true;
    this.downX = x;
    this.downY = y;
    this.hasDragged = false;
    this.mouseX = x;
    this.mouseY = y;

    const hitKite = this.findKiteAt(x, y);
    if (hitKite) {
      this.dragKite = hitKite;
      hitKite.animatePress();
      hitKite.startDrag(x, y);
    }
  }

  private handlePointerMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;

    if (this.pointerDown && this.dragKite) {
      const dx = x - this.downX;
      const dy = y - this.downY;
      if (dx * dx + dy * dy > 16) {
        this.hasDragged = true;
      }
      this.dragKite.updateDrag(x, y);
    }

    for (const kite of this.kites) {
      kite.setHovered(kite === this.dragKite || (kite.hitTest(x, y) && !this.pointerDown));
    }
  }

  private handlePointerUp(x: number, y: number): void {
    if (this.pointerDown && !this.hasDragged && !this.dragKite) {
      this.spawnKite(x, y);
    }

    if (this.dragKite) {
      this.dragKite.endDrag();
      this.dragKite = null;
    }

    this.pointerDown = false;
    this.hasDragged = false;

    for (const kite of this.kites) {
      kite.setHovered(kite.hitTest(x, y));
    }
  }

  private findKiteAt(x: number, y: number): Kite | null {
    for (let i = this.kites.length - 1; i >= 0; i--) {
      const kite = this.kites[i];
      if (kite.hitTest(x, y)) {
        return kite;
      }
    }
    return null;
  }

  spawnKite(x: number, y: number): void {
    if (this.kites.length >= this.maxKites) {
      this.kites.shift();
    }
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const kite = new Kite(x, y, color, this.renderer, ++this.kiteIdCounter);
    this.kites.push(kite);
  }

  update(dt: number): void {
    this.windTimer += dt;
    if (this.windTimer >= 1500) {
      this.windTimer = 0;
      this.targetWindAngle = Math.random() * Math.PI * 2;
      this.targetWindSpeed = 1 + Math.random() * 2;
    }

    let angleDiff = this.targetWindAngle - this.windAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.windAngle += angleDiff * 0.02;
    this.windSpeed += (this.targetWindSpeed - this.windSpeed) * 0.02;

    const wx = Math.cos(this.windAngle) * this.windSpeed;
    const wy = Math.sin(this.windAngle) * this.windSpeed;

    for (const kite of this.kites) {
      kite.setWind(wx, wy);
      kite.update(dt);
    }

    this.kites = this.kites.filter(k => !k.isDead());
  }

  getWindX(): number { return Math.cos(this.windAngle) * this.windSpeed; }
  getWindY(): number { return Math.sin(this.windAngle) * this.windSpeed; }
}
