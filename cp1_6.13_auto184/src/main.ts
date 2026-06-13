import { LayerManager } from './layerManager';
import { Renderer } from './renderer';
import { UIController } from './uiController';
import './styles.css';

class App {
  private canvas: HTMLCanvasElement;
  private layerManager: LayerManager;
  private renderer: Renderer;
  private _uiController: UIController;
  private animationFrameId: number | null = null;
  private needsRender: boolean = true;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.layerManager = new LayerManager();
    this.renderer = new Renderer(this.canvas);
    this._uiController = new UIController(this.layerManager, this.renderer);

    this.init();
  }

  private init(): void {
    this.setupLayerSubscription();
    this.addDefaultLayers();
    this.startRenderLoop();
  }

  private setupLayerSubscription(): void {
    this.layerManager.subscribe(() => {
      this.scheduleRender();
    });
  }

  private addDefaultLayers(): void {
    const colors = ['#e74c3c', '#3498db', '#f1c40f'];
    
    colors.forEach((color, index) => {
      const layer = this.layerManager.addLayer(color);
      
      const x = 150 + index * 80;
      const y = 150 + index * 60;
      const size = 200;
      
      let shapeType: 'rectangle' | 'circle' | 'polygon';
      if (index === 0) shapeType = 'rectangle';
      else if (index === 1) shapeType = 'circle';
      else shapeType = 'polygon';
      
      this.layerManager.addShape(layer.id, shapeType, x, y, size, size);
    });

    const firstLayer = this.layerManager.getLayers()[0];
    if (firstLayer) {
      this.layerManager.setActiveLayer(firstLayer.id);
    }
  }

  private scheduleRender(): void {
    this.needsRender = true;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const layers = this.layerManager.getLayers();
    this.renderer.render(layers);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    void this._uiController;
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
    app = null;
  }
});

export default App;
