import { SceneController } from './sceneController';
import { TrajectoryManager } from './trajectoryManager';
import { UIController, Mode } from './uiController';
import * as THREE from 'three';

class App {
  private sceneController: SceneController;
  private trajectoryManager: TrajectoryManager;
  private uiController: UIController;

  private currentMode: Mode = 'draw';
  private isMouseDown: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private hasDragged: boolean = false;
  private dragThreshold: number = 5;

  private lastTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  constructor() {
    const container = document.getElementById('canvas-container') as HTMLElement;
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.sceneController = new SceneController(container);
    this.trajectoryManager = new TrajectoryManager(this.sceneController);

    this.uiController = new UIController(
      this.trajectoryManager,
      this.sceneController,
      {
        onModeChange: (mode: Mode) => this.handleModeChange(mode),
        onSymmetricToggle: (enabled: boolean) => this.handleSymmetricToggle(enabled),
        onWidthChange: (width: number) => this.handleWidthChange(width),
        onOpacityChange: (opacity: number) => this.handleOpacityChange(opacity),
        onDeleteSelected: () => this.handleDeleteSelected(),
        onClearAll: () => this.handleClearAll(),
        onExport: () => this.handleExport(),
        onImport: (file: File) => this.handleImport(file),
      }
    );

    this.setupEventListeners();
    this.sceneController.startAnimationLoop(() => this.onFrame());
  }

  private setupEventListeners(): void {
    const canvas = this.sceneController.getRendererDomElement();

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    this.isMouseDown = true;
    this.hasDragged = false;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };

    if (this.currentMode === 'draw') {
      this.trajectoryManager.startDrawing(e.clientX, e.clientY);
    } else if (this.currentMode === 'rotate') {
      this.sceneController.startRotation(e.clientX, e.clientY);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown) return;

    const dx = Math.abs(e.clientX - this.mouseDownPos.x);
    const dy = Math.abs(e.clientY - this.mouseDownPos.y);
    if (dx > this.dragThreshold || dy > this.dragThreshold) {
      this.hasDragged = true;
    }

    if (this.currentMode === 'draw') {
      this.trajectoryManager.updateDrawing(e.clientX, e.clientY);
    } else if (this.currentMode === 'rotate') {
      this.sceneController.updateRotation(e.clientX, e.clientY);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;

    if (this.currentMode === 'draw') {
      if (!this.hasDragged) {
        const clicked = this.trajectoryManager.handleClick(e.clientX, e.clientY);
        this.uiController.updateSelectedInfo();
      } else {
        this.trajectoryManager.endDrawing();
        this.uiController.updateStatusBar();
        this.uiController.updateSelectedInfo();
      }
    } else if (this.currentMode === 'rotate') {
      this.sceneController.endRotation();
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.sceneController.handleZoom(e.deltaY);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isMouseDown = true;
      this.hasDragged = false;
      this.mouseDownPos = { x: touch.clientX, y: touch.clientY };

      if (this.currentMode === 'draw') {
        this.trajectoryManager.startDrawing(touch.clientX, touch.clientY);
      } else if (this.currentMode === 'rotate') {
        this.sceneController.startRotation(touch.clientX, touch.clientY);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isMouseDown || e.touches.length !== 1) return;

    const touch = e.touches[0];

    const dx = Math.abs(touch.clientX - this.mouseDownPos.x);
    const dy = Math.abs(touch.clientY - this.mouseDownPos.y);
    if (dx > this.dragThreshold || dy > this.dragThreshold) {
      this.hasDragged = true;
    }

    if (this.currentMode === 'draw') {
      this.trajectoryManager.updateDrawing(touch.clientX, touch.clientY);
    } else if (this.currentMode === 'rotate') {
      this.sceneController.updateRotation(touch.clientX, touch.clientY);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;

    const touch = e.changedTouches[0];

    if (this.currentMode === 'draw') {
      if (!this.hasDragged) {
        this.trajectoryManager.handleClick(touch.clientX, touch.clientY);
        this.uiController.updateSelectedInfo();
      } else {
        this.trajectoryManager.endDrawing();
        this.uiController.updateStatusBar();
        this.uiController.updateSelectedInfo();
      }
    } else if (this.currentMode === 'rotate') {
      this.sceneController.endRotation();
    }
  }

  private handleModeChange(mode: Mode): void {
    this.currentMode = mode;
  }

  private handleSymmetricToggle(enabled: boolean): void {
    this.trajectoryManager.setSymmetricMode(enabled);
  }

  private handleWidthChange(width: number): void {
    this.trajectoryManager.updateSelectedWidth(width);
  }

  private handleOpacityChange(opacity: number): void {
    this.trajectoryManager.updateSelectedOpacity(opacity);
  }

  private handleDeleteSelected(): void {
    this.trajectoryManager.deleteSelectedTrajectory();
    this.uiController.updateSelectedInfo();
    this.uiController.updateStatusBar();
  }

  private handleClearAll(): void {
    this.trajectoryManager.clearAllTrajectories();
    this.uiController.updateSelectedInfo();
    this.uiController.updateStatusBar();
  }

  private handleExport(): void {
    const json = this.trajectoryManager.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sculpture_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.uiController.showNotification('导出成功！');
  }

  private handleImport(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = this.trajectoryManager.importFromJSON(content);

      if (success) {
        this.uiController.updateStatusBar();
        this.uiController.updateSelectedInfo();
        this.uiController.showNotification('导入成功！');
      } else {
        this.uiController.showNotification('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  }

  private onFrame(): void {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime > 500) {
      this.fps = Math.round(this.frameCount / ((now - this.fpsUpdateTime) / 1000));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    const time = now / 1000;
    this.trajectoryManager.updatePulse(time);
  }

  public dispose(): void {
    this.sceneController.dispose();
    this.uiController.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  (window as any).app = app;
});
