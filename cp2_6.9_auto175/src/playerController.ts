import type { Player, TrailPoint } from './types';

export class PlayerController {
  player: Player;
  private canvas: HTMLCanvasElement;
  private keys: Set<string>;
  private isMobile: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isMobile = this.detectMobile();
    this.keys = new Set();
    this.player = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 8,
      speed: 4,
      trail: [],
      isDragging: false,
    };
    this.bindEvents();
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    let isMouseDown = false;
    this.canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      this.player.isDragging = true;
      this.updateFromPointer(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('mouseup', () => {
      isMouseDown = false;
      this.player.isDragging = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        this.updateFromPointer(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.player.isDragging = true;
      this.updateFromPointer(touch.clientX, touch.clientY);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.updateFromPointer(touch.clientX, touch.clientY);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.isDragging = false;
    }, { passive: false });
  }

  private updateFromPointer(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.player.x = (clientX - rect.left) * scaleX;
    this.player.y = (clientY - rect.top) * scaleY;
  }

  update(canvasWidth: number, canvasHeight: number): void {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * this.player.speed;
      dy = (dy / len) * this.player.speed;
      this.player.x += dx;
      this.player.y += dy;
    }

    this.player.x = Math.max(this.player.radius, Math.min(canvasWidth - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(canvasHeight - this.player.radius, this.player.y));

    const trailPoint: TrailPoint = {
      x: this.player.x,
      y: this.player.y,
      opacity: 0.7,
    };
    this.player.trail.unshift(trailPoint);

    const maxTrail = this.isMobile ? 18 : 30;
    if (this.player.trail.length > maxTrail) {
      this.player.trail.pop();
    }

    for (let i = 0; i < this.player.trail.length; i++) {
      this.player.trail[i].opacity = Math.max(0, 0.7 - (i / maxTrail));
    }
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.player.x = canvasWidth / 2;
    this.player.y = canvasHeight / 2;
    this.player.trail = [];
    this.player.isDragging = false;
  }

  get isMobileDevice(): boolean {
    return this.isMobile;
  }
}
