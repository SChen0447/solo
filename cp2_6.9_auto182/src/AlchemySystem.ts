export type ElementType = 'fire' | 'water' | 'earth' | 'wind';

export interface ElementInfo {
  type: ElementType;
  name: string;
  color: string;
  logColor: string;
}

export type SubstanceType =
  | 'steam'
  | 'lava'
  | 'mud'
  | 'frost'
  | 'obsidian'
  | 'storm'
  | 'glass'
  | 'dust'
  | 'none';

export interface SubstanceInfo {
  type: SubstanceType;
  name: string;
  color: string;
  description: string;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  elements: ElementType[];
  result: SubstanceType;
}

export const ELEMENTS: Record<ElementType, ElementInfo> = {
  fire: { type: 'fire', name: '火', color: '#FF4500', logColor: '#FF6347' },
  water: { type: 'water', name: '水', color: '#1E90FF', logColor: '#4682B4' },
  earth: { type: 'earth', name: '土', color: '#8B4513', logColor: '#A0522D' },
  wind: { type: 'wind', name: '风', color: '#98FB98', logColor: '#66CDAA' }
};

export const SUBSTANCES: Record<SubstanceType, SubstanceInfo> = {
  steam: { type: 'steam', name: '蒸汽', color: '#E8E8E8', description: '白色半透明气雾' },
  lava: { type: 'lava', name: '岩浆', color: '#FF4500', description: '橙红色液体' },
  mud: { type: 'mud', name: '泥浆', color: '#7B5A3A', description: '棕色粘稠物质' },
  frost: { type: 'frost', name: '冰霜', color: '#ADD8E6', description: '淡蓝色结晶' },
  obsidian: { type: 'obsidian', name: '黑曜石', color: '#1C1C1C', description: '黑色发光晶体' },
  storm: { type: 'storm', name: '风暴', color: '#6A5ACD', description: '紫色雷电风暴' },
  glass: { type: 'glass', name: '玻璃', color: '#E0FFFF', description: '透明玻璃晶体' },
  dust: { type: 'dust', name: '尘埃', color: '#D2B48C', description: '金色尘埃' },
  none: { type: 'none', name: '无', color: 'transparent', description: '空容器' }
};

export class AlchemySystem {
  private container: ElementType[] = [];
  private currentSubstance: SubstanceType = 'none';
  private logs: LogEntry[] = [];
  private logIdCounter = 0;
  private fusionCount = 0;
  private maxContainerSize = 3;
  private maxLogs = 50;
  private onStateChange?: () => void;
  private onLogChange?: () => void;
  private onFusion?: () => void;

  setOnStateChange(callback: () => void): void {
    this.onStateChange = callback;
  }

  setOnLogChange(callback: () => void): void {
    this.onLogChange = callback;
  }

  setOnFusion(callback: () => void): void {
    this.onFusion = callback;
  }

  getContainer(): ElementType[] {
    return [...this.container];
  }

  getCurrentSubstance(): SubstanceType {
    return this.currentSubstance;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getFusionCount(): number {
    return this.fusionCount;
  }

  canAddElement(): boolean {
    return this.container.length < this.maxContainerSize;
  }

  addElement(element: ElementType): boolean {
    if (!this.canAddElement()) {
      return false;
    }

    this.container.push(element);
    this.fuseElements();

    if (this.onStateChange) {
      this.onStateChange();
    }

    return true;
  }

  private fuseElements(): void {
    if (this.container.length === 0) {
      this.currentSubstance = 'none';
      return;
    }

    const sortedElements = [...this.container].sort();
    const key = sortedElements.join('+');
    const recipe = this.RECIPES[key];

    if (recipe) {
      this.currentSubstance = recipe;
      this.fusionCount++;

      this.addLogEntry([...this.container], recipe);

      if (this.onFusion) {
        this.onFusion();
      }
    } else {
      this.currentSubstance = 'none';
    }
  }

  private addLogEntry(elements: ElementType[], result: SubstanceType): void {
    const entry: LogEntry = {
      id: this.logIdCounter++,
      timestamp: Date.now(),
      elements: [...elements],
      result
    };

    this.logs.unshift(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (this.onLogChange) {
      this.onLogChange();
    }
  }

  clearContainer(): void {
    this.container = [];
    this.currentSubstance = 'none';

    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  getMixedColor(): string {
    if (this.container.length === 0) {
      return 'rgba(30, 10, 50, 0.8)';
    }

    if (this.currentSubstance !== 'none') {
      return SUBSTANCES[this.currentSubstance].color;
    }

    const colors = this.container.map(e => ELEMENTS[e].color);
    return this.blendColors(colors);
  }

  private blendColors(colors: string[]): string {
    let r = 0, g = 0, b = 0;

    for (const color of colors) {
      const parsed = this.parseHexColor(color);
      r += parsed.r;
      g += parsed.g;
      b += parsed.b;
    }

    r = Math.floor(r / colors.length);
    g = Math.floor(g / colors.length);
    b = Math.floor(b / colors.length);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  private RECIPES: Record<string, SubstanceType> = {
    'fire+water': 'steam',
    'fire+earth': 'lava',
    'earth+water': 'mud',
    'water+wind': 'frost',
    'fire+wind': 'storm',
    'earth+wind': 'dust',
    'earth+fire+water': 'obsidian',
    'fire+water+wind': 'storm',
    'earth+fire+wind': 'glass',
    'earth+water+wind': 'frost'
  };
}
