import { BrushEngine } from './brushEngine';
import { UndoManager } from './undoManager';
import { UIController, ThemeType, BrushType } from './uiController';

interface BambooParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  wobble: number;
  wobbleSpeed: number;
  alpha: number;
  drift: number;
}

class ZenCanvasApp {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private particlesCanvas: HTMLCanvasElement;
  private particlesCtx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private minScale = 0.5;
  private maxScale = 4;

  private isDrawing = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private brushEngine: BrushEngine;
  private undoManager: UndoManager;
  private uiController: UIController;

  private bambooParticles: BambooParticle[] = [];
  private readonly particleCount = 80;
  private animationFrameId: number = 0;

  private strokeComplete = false;

  constructor() {
    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.particlesCanvas = document.getElementById('particles-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('canvas-container') as HTMLElement;

    const mainCtx = this.mainCanvas.getContext('2d');
    const particlesCtx = this.particlesCanvas.getContext('2d');
    if (!mainCtx || !particlesCtx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.mainCtx = mainCtx;
    this.particlesCtx = particlesCtx;

    this.brushEngine = new BrushEngine(this.mainCtx);
    this.undoManager = new UndoManager(this.mainCtx);

    this.uiController = new UIController({
      onBrushChange: (brush: BrushType) => this.handleBrushChange(brush),
      onUndo: () => this.handleUndo(),
      onRedo: () => this.handleRedo(),
      onThemeChange: (theme: ThemeType) => this.handleThemeChange(theme),
      onExport: () => this.handleExport()
    });

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.initBambooParticles();
    this.bindEvents();
    this.clearCanvas();
    this.undoManager.saveState();
    this.updateUndoRedoButtons();
    this.animate();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.mainCanvas.width = width * dpr;
    this.mainCanvas.height = height * dpr;
    this.mainCanvas.style.width = width + 'px';
    this.mainCanvas.style.height = height + 'px';
    this.mainCtx.scale(dpr, dpr);

    this.particlesCanvas.width = width * dpr;
    this.particlesCanvas.height = height * dpr;
    this.particlesCanvas.style.width = width + 'px';
    this.particlesCanvas.style.height = height + 'px';
    this.particlesCtx.scale(dpr, dpr);

    this.brushEngine.setColor(this.uiController.getThemeConfig().brushColor);
  }

  private initBambooParticles(): void {
    this.bambooParticles = [];
    const theme = this.uiController.getTheme();
    const isDark = theme === 'ink';

    for (let i = 0; i < this.particleCount; i++) {
      this.bambooParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 0.5 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.8,
        angle: -Math.PI / 4 + (Math.random() - 0.5) * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        alpha: isDark ? 0.03 + Math.random() * 0.06 : 0.05 + Math.random() * 0.1,
        drift: Math.random() * 0.5
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.container.addEventListener('mousedown', this.handleMouseDown);
    this.container.addEventListener('mousemove', this.handleMouseMove);
    this.container.addEventListener('mouseup', this.handleMouseUp);
    this.container.addEventListener('mouseleave', this.handleMouseUp);
    this.container.addEventListener('wheel', this.handleWheel, { passive: false });

    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd);
    this.container.addEventListener('touchcancel', this.handleTouchEnd);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.lastMouseX = x;
    this.lastMouseY = y;

    if (e.button === 1 || e.shiftKey || e.altKey) {
      this.isPanning = true;
      this.container.style.cursor = 'grabbing';
      return;
    }

    const world = this.screenToWorld(x, y);
    this.isDrawing = true;
    this.strokeComplete = false;

    this.mainCtx.save();
    this.mainCtx.translate(this.offsetX, this.offsetY);
    this.mainCtx.scale(this.scale, this.scale);
    this.brushEngine.startStroke(world.x, world.y);
    this.mainCtx.restore();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPanning) {
      this.offsetX += x - this.lastMouseX;
      this.offsetY += y - this.lastMouseY;
      this.lastMouseX = x;
      this.lastMouseY = y;
      return;
    }

    if (!this.isDrawing) return;

    const world = this.screenToWorld(x, y);

    this.mainCtx.save();
    this.mainCtx.translate(this.offsetX, this.offsetY);
    this.mainCtx.scale(this.scale, this.scale);
    this.brushEngine.continueStroke(world.x, world.y);
    this.mainCtx.restore();
  };

  private handleMouseUp = (): void => {
    if (this.isPanning) {
      this.isPanning = false;
      this.container.style.cursor = 'crosshair';
      return;
    }

    if (!this.isDrawing) return;

    this.brushEngine.endStroke();
    this.isDrawing = false;
    this.strokeComplete = true;

    setTimeout(() => {
      if (this.strokeComplete && !this.brushEngine.hasActiveParticles()) {
        this.undoManager.saveState();
        this.updateUndoRedoButtons();
        this.strokeComplete = false;
      }
    }, 50);
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const rect = this.container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

    const worldX = (mouseX - this.offsetX) / this.scale;
    const worldY = (mouseY - this.offsetY) / this.scale;

    this.scale = newScale;
    this.offsetX = mouseX - worldX * this.scale;
    this.offsetY = mouseY - worldY * this.scale;

    this.uiController.setZoom(this.scale);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.handleMouseDown(mouseEvent);
    } else if (e.touches.length === 2) {
      this.isPanning = true;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.handleMouseMove(mouseEvent);
    }
  };

  private handleTouchEnd = (): void => {
    this.handleMouseUp();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.handleRedo();
      } else {
        this.handleUndo();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.handleRedo();
    }

    if (e.key === '1') this.uiController.setBrush('fine');
    if (e.key === '2') this.uiController.setBrush('wash');
    if (e.key === '3') this.uiController.setBrush('splatter');
  };

  private handleBrushChange(brush: BrushType): void {
    this.brushEngine.setBrush(brush);
  }

  private handleUndo(): void {
    if (this.undoManager.isTransitioning()) return;
    const success = this.undoManager.undo(() => {
      this.updateUndoRedoButtons();
    });
    if (success) {
      this.updateUndoRedoButtons();
    }
  }

  private handleRedo(): void {
    if (this.undoManager.isTransitioning()) return;
    const success = this.undoManager.redo(() => {
      this.updateUndoRedoButtons();
    });
    if (success) {
      this.updateUndoRedoButtons();
    }
  }

  private handleThemeChange(_theme: ThemeType): void {
    const config = this.uiController.getThemeConfig();
    this.brushEngine.setColor(config.brushColor);
    this.updateParticleAlpha();
  }

  private updateParticleAlpha(): void {
    const theme = this.uiController.getTheme();
    const isDark = theme === 'ink';

    this.bambooParticles.forEach(p => {
      p.alpha = isDark ? 0.03 + Math.random() * 0.06 : 0.05 + Math.random() * 0.1;
    });
  }

  private updateUndoRedoButtons(): void {
    this.uiController.setUndoEnabled(this.undoManager.canUndo());
    this.uiController.setRedoEnabled(this.undoManager.canRedo());
  }

  private handleExport(): void {
    const exportWidth = 1920;
    const exportHeight = 1080;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    const themeConfig = this.uiController.getThemeConfig();
    exportCtx.fillStyle = themeConfig.bgColor;
    exportCtx.fillRect(0, 0, exportWidth, exportHeight);

    const viewWorldWidth = window.innerWidth / this.scale;
    const viewWorldHeight = window.innerHeight / this.scale;

    const exportScale = Math.min(exportWidth / viewWorldWidth, exportHeight / viewWorldHeight);
    const drawWidth = viewWorldWidth * exportScale;
    const drawHeight = viewWorldHeight * exportScale;
    const offsetX = (exportWidth - drawWidth) / 2;
    const offsetY = (exportHeight - drawHeight) / 2;

    const sourceX = Math.max(0, -this.offsetX / this.scale);
    const sourceY = Math.max(0, -this.offsetY / this.scale);
    const sourceWidth = Math.min(this.mainCanvas.width / (window.devicePixelRatio || 1), window.innerWidth / this.scale);
    const sourceHeight = Math.min(this.mainCanvas.height / (window.devicePixelRatio || 1), window.innerHeight / this.scale);

    exportCtx.drawImage(
      this.mainCanvas,
      sourceX * (window.devicePixelRatio || 1),
      sourceY * (window.devicePixelRatio || 1),
      sourceWidth * (window.devicePixelRatio || 1),
      sourceHeight * (window.devicePixelRatio || 1),
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );

    this.addPaperTexture(exportCtx, exportWidth, exportHeight);

    const link = document.createElement('a');
    link.download = `zen-ink-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  private addPaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const theme = this.uiController.getTheme();
    const isDark = theme === 'ink';

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const intensity = isDark ? 8 : 12;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private clearCanvas(): void {
    const themeConfig = this.uiController.getThemeConfig();
    this.mainCtx.save();
    this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.mainCtx.restore();
    this.brushEngine.setColor(themeConfig.brushColor);
  }

  private animate = (): void => {
    this.updateBambooParticles();
    this.drawBambooParticles();

    if (this.brushEngine.hasActiveParticles()) {
      this.mainCtx.save();
      this.mainCtx.translate(this.offsetX, this.offsetY);
      this.mainCtx.scale(this.scale, this.scale);
      this.brushEngine.updateParticles();
      this.mainCtx.restore();

      if (!this.isDrawing && !this.brushEngine.hasActiveParticles() && this.strokeComplete) {
        this.undoManager.saveState();
        this.updateUndoRedoButtons();
        this.strokeComplete = false;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private updateBambooParticles(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.bambooParticles.forEach(p => {
      p.wobble += p.wobbleSpeed;
      const wobbleOffset = Math.sin(p.wobble) * p.drift;

      p.x += Math.cos(p.angle + wobbleOffset * 0.1) * p.speed;
      p.y += Math.sin(p.angle) * p.speed + wobbleOffset * 0.2;

      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    });
  }

  private drawBambooParticles(): void {
    const ctx = this.particlesCtx;
    const theme = this.uiController.getTheme();
    const isDark = theme === 'ink';
    const particleColor = isDark ? '200, 200, 200' : '100, 100, 100';

    ctx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);

    this.bambooParticles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgba(${particleColor}, 1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ZenCanvasApp();
});
