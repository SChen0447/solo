import p5 from 'p5';
import { FluidSolver } from './fluid_solver';
import { Renderer, RenderMode } from './renderer';

export class InteractionManager {
  private readonly p: p5;
  private readonly solver: FluidSolver;
  private readonly renderer: Renderer;
  private readonly gridSize: number;
  private canvasSize: number;

  private mousePrevX: number = 0;
  private mousePrevY: number = 0;
  private isMouseDown: boolean = false;
  private isMouseInCanvas: boolean = false;

  private onModeChange: ((mode: RenderMode) => void) | null = null;

  private readonly moveForceMagnitude: number = 50;
  private readonly clickForceMagnitude: number = 200;
  private readonly clickRadiusPx: number = 30;
  private readonly densityAmount: number = 50;

  constructor(p: p5, solver: FluidSolver, renderer: Renderer, canvasSize: number) {
    this.p = p;
    this.solver = solver;
    this.renderer = renderer;
    this.gridSize = solver.N;
    this.canvasSize = canvasSize;
  }

  resize(canvasSize: number): void {
    this.canvasSize = canvasSize;
  }

  setModeChangeCallback(callback: (mode: RenderMode) => void): void {
    this.onModeChange = callback;
  }

  setup(): void {
    const p = this.p;

    p.mousePressed = () => this.handleMousePressed();
    p.mouseReleased = () => this.handleMouseReleased();
    p.mouseMoved = () => this.handleMouseMoved();
    p.mouseDragged = () => this.handleMouseDragged();
    p.keyPressed = () => this.handleKeyPressed();
  }

  private checkMouseInCanvas(): boolean {
    const p = this.p;
    return p.mouseX >= 0 && p.mouseX <= this.canvasSize &&
           p.mouseY >= 0 && p.mouseY <= this.canvasSize;
  }

  update(): void {
    this.isMouseInCanvas = this.checkMouseInCanvas();
    if (this.isMouseInCanvas) {
      this.handleContinuousInjection();
    }
  }

  private screenToGrid(sx: number, sy: number): { gx: number; gy: number } {
    const gx = (sx / this.canvasSize) * this.gridSize;
    const gy = (sy / this.canvasSize) * this.gridSize;
    return {
      gx: Math.max(1, Math.min(this.gridSize, Math.floor(gx))),
      gy: Math.max(1, Math.min(this.gridSize, Math.floor(gy)))
    };
  }

  private pxToGridUnits(px: number): number {
    return (px / this.canvasSize) * this.gridSize;
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;
    let r: number, g: number, b: number;

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
    return { r, g, b };
  }

  private getColorFromMouseX(mouseX: number): { r: number; g: number; b: number } {
    const hue = (mouseX / this.canvasSize) * 360;
    return this.hslToRgb(hue, 80, 60);
  }

  private handleContinuousInjection(): void {
    const p = this.p;

    const dx = p.mouseX - this.mousePrevX;
    const dy = p.mouseY - this.mousePrevY;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const { gx, gy } = this.screenToGrid(p.mouseX, p.mouseY);
      const color = this.getColorFromMouseX(p.mouseX);

      this.solver.addDensityRadial(gx, gy, 2, color.r, color.g, color.b, this.densityAmount);
      this.solver.addVelocity(gx, gy, dx * this.moveForceMagnitude * 0.1, dy * this.moveForceMagnitude * 0.1);
    }

    this.mousePrevX = p.mouseX;
    this.mousePrevY = p.mouseY;
  }

  private handleMousePressed(): void {
    const p = this.p;
    if (p.mouseX < 0 || p.mouseX > this.canvasSize ||
        p.mouseY < 0 || p.mouseY > this.canvasSize) {
      return;
    }

    this.isMouseDown = true;

    const { gx, gy } = this.screenToGrid(p.mouseX, p.mouseY);
    const radiusGrid = this.pxToGridUnits(this.clickRadiusPx);

    this.solver.addVelocityRadial(gx, gy, radiusGrid, 0, 0, this.clickForceMagnitude);
    this.solver.addDensityRadial(gx, gy, radiusGrid, 1, 1, 1, this.densityAmount * 2);
  }

  private handleMouseReleased(): void {
    this.isMouseDown = false;
  }

  private handleMouseMoved(): void {
    const p = this.p;
    this.mousePrevX = p.mouseX;
    this.mousePrevY = p.mouseY;
  }

  private handleMouseDragged(): void {
    this.handleContinuousInjection();
  }

  private handleKeyPressed(): void {
    const p = this.p;
    const key = p.key;

    if (key === 'p' || key === 'P') {
      const newMode: RenderMode = this.renderer.mode === 'fluid' ? 'particles' : 'fluid';
      this.renderer.setMode(newMode);
      if (this.onModeChange) {
        this.onModeChange(newMode);
      }
    }

    if (p.keyCode === 32) {
      this.solver.reset();
      this.renderer.resetParticles();
    }
  }
}
