import { CanvasController } from './canvasController';
import { Toolbar } from './toolbar';
import { PropertyPanel } from './propertyPanel';

class LogoDesignerApp {
  private canvasController: CanvasController;
  private toolbar: Toolbar;
  private propertyPanel: PropertyPanel;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const toolbarPanel = document.getElementById('toolbarPanel') as HTMLElement;
    const propertyPanel = document.getElementById('propertyPanel') as HTMLElement;

    this.canvasController = new CanvasController(canvas);
    this.toolbar = new Toolbar(toolbarPanel, this.canvasController);
    this.propertyPanel = new PropertyPanel(propertyPanel, this.canvasController);

    this.syncCanvasState();
  }

  private syncCanvasState(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const updateState = () => {
      (canvas as any).scale = (this.canvasController as any).scale;
      (canvas as any).offsetX = (this.canvasController as any).offsetX;
      (canvas as any).offsetY = (this.canvasController as any).offsetY;
      requestAnimationFrame(updateState);
    };
    updateState();
  }

  destroy(): void {
    this.canvasController.destroy();
    this.toolbar.destroy();
    this.propertyPanel.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new LogoDesignerApp();
  (window as any).logoApp = app;
});
