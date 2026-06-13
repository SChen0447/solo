export interface LayerData {
  id: number;
  name: string;
  thickness: number;
  colors: string[];
  opacity: number;
  minerals: string[];
  age: number;
  depthStart: number;
  depthEnd: number;
  visible: boolean;
  roughness: number;
  metalness: number;
  hasParticles?: boolean;
  hasPulse?: boolean;
}

export interface GlobalSettings {
  depth: number;
  opacity: number;
  brightness: number;
}

export class LayerManager {
  private layers: LayerData[] = [];
  private globalSettings: GlobalSettings = {
    depth: 0,
    opacity: 1,
    brightness: 1
  };
  private readonly TOTAL_HEIGHT = 10;
  private readonly BASE_RADIUS = 5;

  constructor() {
    this.initializeLayers();
  }

  private initializeLayers(): void {
    const layerConfigs: Omit<LayerData, 'depthStart' | 'depthEnd' | 'visible' | 'id'>[] = [
      {
        name: '地表植被层',
        thickness: 1,
        colors: ['#4CAF50', '#2E7D32'],
        opacity: 0.8,
        minerals: ['苔藓', '草本纤维', '腐殖质'],
        age: 0.01,
        roughness: 0.9,
        metalness: 0.0
      },
      {
        name: '腐殖质土壤层',
        thickness: 1.5,
        colors: ['#5D4037', '#3E2723'],
        opacity: 0.7,
        minerals: ['有机质', '黏土矿物', '石英砂'],
        age: 0.5,
        roughness: 0.8,
        metalness: 0.05
      },
      {
        name: '沉积岩层',
        thickness: 2,
        colors: ['#A1887F', '#6D4C41'],
        opacity: 0.6,
        minerals: ['方解石', '白云石', '页岩', '砂岩'],
        age: 120,
        roughness: 0.6,
        metalness: 0.1
      },
      {
        name: '基岩层',
        thickness: 2.5,
        colors: ['#78909C', '#455A64'],
        opacity: 0.5,
        minerals: ['石英', '长石', '云母', '角闪石'],
        age: 250,
        roughness: 0.5,
        metalness: 0.15
      },
      {
        name: '矿脉层',
        thickness: 1.5,
        colors: ['#FFD54F', '#FF8F00'],
        opacity: 0.6,
        minerals: ['黄铁矿', '黄铜矿', '方铅矿', '闪锌矿', '自然金'],
        age: 180,
        roughness: 0.3,
        metalness: 0.8,
        hasParticles: true
      },
      {
        name: '岩浆房层',
        thickness: 1.5,
        colors: ['#D84315', '#BF360C'],
        opacity: 0.9,
        minerals: ['橄榄石', '辉石', '斜长石', '磁铁矿'],
        age: 320,
        roughness: 0.4,
        metalness: 0.2,
        hasPulse: true
      }
    ];

    let currentDepth = 0;
    this.layers = layerConfigs.map((config, index) => {
      const depthStart = currentDepth;
      const depthEnd = currentDepth + config.thickness;
      currentDepth = depthEnd;
      return {
        ...config,
        id: index,
        depthStart,
        depthEnd,
        visible: true
      };
    });
  }

  public getLayerData(): LayerData[] {
    return this.layers.map(layer => ({ ...layer }));
  }

  public getLayerById(id: number): LayerData | undefined {
    return this.layers.find(l => l.id === id);
  }

  public getTotalHeight(): number {
    return this.TOTAL_HEIGHT;
  }

  public getBaseRadius(): number {
    return this.BASE_RADIUS;
  }

  public updateLayerVisibility(id: number, visible: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
    }
  }

  public setGlobalDepth(depth: number): void {
    this.globalSettings.depth = Math.max(0, Math.min(this.TOTAL_HEIGHT, depth));
  }

  public setGlobalOpacity(opacity: number): void {
    this.globalSettings.opacity = Math.max(0, Math.min(1, opacity));
  }

  public setGlobalBrightness(brightness: number): void {
    this.globalSettings.brightness = Math.max(0.5, Math.min(2, brightness));
  }

  public getGlobalSettings(): GlobalSettings {
    return { ...this.globalSettings };
  }

  public getDigProgress(): number {
    return this.globalSettings.depth / this.TOTAL_HEIGHT;
  }

  public getLayerDigAmount(layerId: number): number {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return 0;

    const globalDepth = this.globalSettings.depth;

    if (globalDepth <= layer.depthStart) return 0;
    if (globalDepth >= layer.depthEnd) return 1;

    return (globalDepth - layer.depthStart) / layer.thickness;
  }

  public resetAll(): void {
    this.globalSettings = {
      depth: 0,
      opacity: 1,
      brightness: 1
    };
    this.layers.forEach(layer => {
      layer.visible = true;
    });
  }
}
