import { StarField, Star, CustomConnection, Constellation } from './starField';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraAnimation {
  active: boolean;
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  startTime: number;
  duration: number;
  ease: (t: number) => number;
}

export interface DragLineState {
  isDragging: boolean;
  isPanning: boolean;
  panStartX: number;
  panStartY: number;
  camStartX: number;
  camStartY: number;
  fromStar: Star | null;
  currentWorldX: number;
  currentWorldY: number;
  moved: boolean;
}

export type StarClickCallback = (star: Star, screenX: number, screenY: number) => void;
export type SearchFailCallback = () => void;

export class InteractionManager {
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  cameraAnimation: CameraAnimation | null = null;
  dragLine: DragLineState = {
    isDragging: false, isPanning: false,
    panStartX: 0, panStartY: 0,
    camStartX: 0, camStartY: 0,
    fromStar: null,
    currentWorldX: 0, currentWorldY: 0,
    moved: false
  };
  minZoom = 0.3;
  maxZoom = 5;
  starField: StarField;
  canvas: HTMLCanvasElement;
  onStarClick: StarClickCallback | null = null;
  onSearchFail: SearchFailCallback | null = null;

  constructor(canvas: HTMLCanvasElement, starField: StarField) {
    this.canvas = canvas;
    this.starField = starField;
    this.resetCamera(true);
  }

  resetCamera(immediate = false): void {
    const viewport = this.getViewport();
    const centerX = this.starField.worldWidth / 2;
    const centerY = this.starField.worldHeight / 2;
    const targetZoom = Math.min(
      viewport.w / this.starField.worldWidth,
      viewport.h / this.starField.worldHeight
    ) * 0.95;

    if (immediate) {
      this.camera.x = centerX;
      this.camera.y = centerY;
      this.camera.zoom = targetZoom;
    } else {
      this.animateCameraTo(centerX, centerY, targetZoom, 600);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  animateCameraTo(x: number, y: number, zoom: number, duration: number): void {
    this.cameraAnimation = {
      active: true,
      fromX: this.camera.x,
      fromY: this.camera.y,
      fromZoom: this.camera.zoom,
      toX: x,
      toY: y,
      toZoom: zoom,
      startTime: performance.now(),
      duration,
      ease: this.easeOutCubic
    };
  }

  focusConstellation(constellation: Constellation): void {
    const center = this.starField.getConstellationCenter(constellation);
    const viewport = this.getViewport();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const sid of constellation.starIds) {
      const star = this.starField.stars[sid];
      if (star) {
        minX = Math.min(minX, star.x);
        minY = Math.min(minY, star.y);
        maxX = Math.max(maxX, star.x);
        maxY = Math.max(maxY, star.y);
      }
    }
    const padding = 150;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const targetZoom = Math.min(viewport.w / w, viewport.h / h, 2);
    this.animateCameraTo(center.x, center.y, targetZoom, 800);
    this.starField.highlightConstellation(constellation);
  }

  searchConstellation(query: string): boolean {
    const c = this.starField.findConstellationByName(query);
    if (c) {
      this.focusConstellation(c);
      return true;
    }
    return false;
  }

  private getViewport(): { w: number; h: number } {
    return { w: this.canvas.width, h: this.canvas.height };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (sx - rect.left) * (this.canvas.width / rect.width);
    const y = (sy - rect.top) * (this.canvas.height / rect.height);
    const viewport = this.getViewport();
    return {
      x: (x - viewport.w / 2) / this.camera.zoom + this.camera.x,
      y: (y - viewport.h / 2) / this.camera.zoom + this.camera.y
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const viewport = this.getViewport();
    return {
      x: (wx - this.camera.x) * this.camera.zoom + viewport.w / 2,
      y: (wy - this.camera.y) * this.camera.zoom + viewport.h / 2
    };
  }

  handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) return;
    const world = this.screenToWorld(e.clientX, e.clientY);
    const hitRadius = 12 / this.camera.zoom;
    const star = this.starField.findStarAt(world.x, world.y, hitRadius);

    if (star) {
      this.dragLine.isDragging = true;
      this.dragLine.fromStar = star;
      this.dragLine.currentWorldX = world.x;
      this.dragLine.currentWorldY = world.y;
      this.dragLine.moved = false;
      this.dragLine.panStartX = e.clientX;
      this.dragLine.panStartY = e.clientY;
    } else {
      this.dragLine.isPanning = true;
      this.dragLine.panStartX = e.clientX;
      this.dragLine.panStartY = e.clientY;
      this.dragLine.camStartX = this.camera.x;
      this.dragLine.camStartY = this.camera.y;
      this.dragLine.moved = false;
    }
    this.cameraAnimation = null;
  }

  handleMouseMove(e: MouseEvent): void {
    const world = this.screenToWorld(e.clientX, e.clientY);

    if (this.dragLine.isDragging) {
      this.dragLine.currentWorldX = world.x;
      this.dragLine.currentWorldY = world.y;
      const dx = e.clientX - this.dragLine.panStartX;
      const dy = e.clientY - this.dragLine.panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.dragLine.moved = true;
      }
    } else if (this.dragLine.isPanning) {
      const dx = e.clientX - this.dragLine.panStartX;
      const dy = e.clientY - this.dragLine.panStartY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragLine.moved = true;
      }
      this.camera.x = this.dragLine.camStartX - dx / this.camera.zoom;
      this.camera.y = this.dragLine.camStartY - dy / this.camera.zoom;
    }
  }

  handleMouseUp(e: MouseEvent): void {
    const world = this.screenToWorld(e.clientX, e.clientY);

    if (this.dragLine.isDragging) {
      const hitRadius = 15 / this.camera.zoom;
      const targetStar = this.starField.findStarAt(world.x, world.y, hitRadius);

      if (this.dragLine.moved && this.dragLine.fromStar && targetStar && targetStar.id !== this.dragLine.fromStar.id) {
        this.starField.addCustomConnection(this.dragLine.fromStar.id, targetStar.id);
      } else if (!this.dragLine.moved && this.dragLine.fromStar) {
        const screen = this.worldToScreen(this.dragLine.fromStar.x, this.dragLine.fromStar.y);
        this.onStarClick?.(this.dragLine.fromStar, screen.x, screen.y);
      }
    } else if (this.dragLine.isPanning && !this.dragLine.moved) {
      const hitRadius = 10 / this.camera.zoom;
      const star = this.starField.findStarAt(world.x, world.y, hitRadius);
      if (star) {
        const screen = this.worldToScreen(star.x, star.y);
        this.onStarClick?.(star, screen.x, screen.y);
      }
    }

    this.dragLine.isDragging = false;
    this.dragLine.isPanning = false;
    this.dragLine.fromStar = null;
  }

  handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const world = this.screenToWorld(e.clientX, e.clientY);
    const threshold = 8 / this.camera.zoom;
    const conn = this.starField.findCustomConnectionAt(world.x, world.y, threshold);
    if (conn) {
      this.starField.removeCustomConnection(conn.id);
    }
  }

  handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const viewport = this.getViewport();
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const worldBefore = {
      x: (mx - viewport.w / 2) / this.camera.zoom + this.camera.x,
      y: (my - viewport.h / 2) / this.camera.zoom + this.camera.y
    };

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    let newZoom = this.camera.zoom * factor;
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    this.camera.zoom = newZoom;

    this.camera.x = worldBefore.x - (mx - viewport.w / 2) / this.camera.zoom;
    this.camera.y = worldBefore.y - (my - viewport.h / 2) / this.camera.zoom;
    this.cameraAnimation = null;
  }

  handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const fakeEvent = { clientX: t.clientX, clientY: t.clientY, button: 0 } as MouseEvent;
      this.handleMouseDown(fakeEvent);
    }
  }

  handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const fakeEvent = { clientX: t.clientX, clientY: t.clientY } as MouseEvent;
      this.handleMouseMove(fakeEvent);
    }
  }

  handleTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0];
    if (t) {
      const fakeEvent = { clientX: t.clientX, clientY: t.clientY, button: 0, preventDefault: () => {} } as unknown as MouseEvent;
      this.handleMouseUp(fakeEvent);
    }
  }

  update(currentTime: number): void {
    if (this.cameraAnimation && this.cameraAnimation.active) {
      const a = this.cameraAnimation;
      const elapsed = currentTime - a.startTime;
      const t = Math.min(1, elapsed / a.duration);
      const eased = a.ease(t);
      this.camera.x = a.fromX + (a.toX - a.fromX) * eased;
      this.camera.y = a.fromY + (a.toY - a.fromY) * eased;
      this.camera.zoom = a.fromZoom + (a.toZoom - a.fromZoom) * eased;
      if (t >= 1) {
        a.active = false;
        this.cameraAnimation = null;
      }
    }
  }
}
