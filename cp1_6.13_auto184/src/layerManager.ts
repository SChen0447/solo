import type { Layer, Shape, ShapeType, Point } from './types';

type LayerChangeListener = (layers: Layer[]) => void;

export class LayerManager {
  private layers: Layer[] = [];
  private listeners: LayerChangeListener[] = [];
  private activeLayerId: string | null = null;
  private layerCounter = 0;

  constructor() {}

  getLayers(): Layer[] {
    return [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
  }

  getActiveLayer(): Layer | null {
    return this.layers.find(l => l.id === this.activeLayerId) || null;
  }

  setActiveLayer(id: string): void {
    this.activeLayerId = id;
    this.notifyListeners();
  }

  getActiveLayerId(): string | null {
    return this.activeLayerId;
  }

  addLayer(color: string = '#e74c3c'): Layer {
    this.layerCounter++;
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${this.layerCounter}`,
      name: `图层 ${this.layerCounter}`,
      color,
      opacity: 0.8,
      blendMode: 'multiply',
      halftoneDensity: 30,
      visible: true,
      shapes: [],
      zIndex: this.layers.length
    };

    this.layers.push(newLayer);
    this.activeLayerId = newLayer.id;
    this.notifyListeners();
    return newLayer;
  }

  removeLayer(id: string): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    this.layers.splice(index, 1);
    this.reorderZIndex();

    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers.length > 0 
        ? this.layers[Math.min(index, this.layers.length - 1)].id 
        : null;
    }

    this.notifyListeners();
  }

  updateLayer(id: string, updates: Partial<Layer>): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    Object.assign(layer, updates);
    this.notifyListeners();
  }

  toggleLayerVisibility(id: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.visible = !layer.visible;
    this.notifyListeners();
  }

  moveLayer(fromIndex: number, toIndex: number): void {
    const sorted = this.getLayers();
    if (fromIndex < 0 || fromIndex >= sorted.length) return;
    if (toIndex < 0 || toIndex >= sorted.length) return;

    const [removed] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, removed);

    sorted.forEach((layer, index) => {
      layer.zIndex = index;
    });

    this.notifyListeners();
  }

  addShape(layerId: string, shapeType: ShapeType, x: number, y: number, width: number, height: number): Shape | null {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return null;

    const shape: Shape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: shapeType,
      x,
      y,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };

    if (shapeType === 'polygon') {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;
      shape.points = this.generatePolygonPoints(centerX, centerY, radius, 6);
    }

    layer.shapes.push(shape);
    this.notifyListeners();
    return shape;
  }

  addSvgShape(layerId: string, svgPath: string, x: number, y: number, width: number, height: number): Shape | null {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return null;

    const shape: Shape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'svg',
      x,
      y,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      svgPath
    };

    layer.shapes.push(shape);
    this.notifyListeners();
    return shape;
  }

  updateShape(layerId: string, shapeId: string, updates: Partial<Shape>): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    const shape = layer.shapes.find(s => s.id === shapeId);
    if (!shape) return;

    Object.assign(shape, updates);
    this.notifyListeners();
  }

  removeShape(layerId: string, shapeId: string): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    const index = layer.shapes.findIndex(s => s.id === shapeId);
    if (index === -1) return;

    layer.shapes.splice(index, 1);
    this.notifyListeners();
  }

  getLayerCount(): number {
    return this.layers.length;
  }

  subscribe(listener: LayerChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const layers = this.getLayers();
    this.listeners.forEach(listener => listener(layers));
  }

  private reorderZIndex(): void {
    this.layers.forEach((layer, index) => {
      layer.zIndex = index;
    });
  }

  private generatePolygonPoints(cx: number, cy: number, radius: number, sides: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      });
    }
    return points;
  }
}

export default LayerManager;
