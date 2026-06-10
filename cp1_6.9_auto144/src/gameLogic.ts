export type PotionColor = '#ff4466' | '#44ff88' | '#4488ff' | '#ffaa44';

export interface LiquidLayer {
  color: PotionColor;
  volume: number;
}

export interface Recipe {
  id: string;
  name: string;
  layers: { color: PotionColor; minPercent: number; maxPercent: number }[];
  particleColors: string[];
  glowColor: string;
}

export interface SynthesisResult {
  success: boolean;
  potionId?: string;
  potionName?: string;
  particleColors?: string[];
  glowColor?: string;
  message?: string;
}

export const BASE_COLORS: PotionColor[] = ['#ff4466', '#44ff88', '#4488ff', '#ffaa44'];

export const COLOR_NAMES: Record<PotionColor, string> = {
  '#ff4466': '烈焰红',
  '#44ff88': '翡翠绿',
  '#4488ff': '星辰蓝',
  '#ffaa44': '琥珀金'
};

export const RECIPES: Recipe[] = [
  {
    id: 'healing_light',
    name: '治愈之光',
    layers: [
      { color: '#44ff88', minPercent: 0.25, maxPercent: 0.35 },
      { color: '#ffaa44', minPercent: 0.15, maxPercent: 0.25 }
    ],
    particleColors: ['#44ff88', '#88ffaa', '#ccffdd', '#ffeeaa', '#ffdd88'],
    glowColor: '#88ffaa'
  },
  {
    id: 'shadow_blade',
    name: '暗影之刃',
    layers: [
      { color: '#ff4466', minPercent: 0.20, maxPercent: 0.30 },
      { color: '#4488ff', minPercent: 0.20, maxPercent: 0.30 }
    ],
    particleColors: ['#ff4466', '#ff6688', '#aa44ff', '#4488ff', '#6644aa'],
    glowColor: '#aa44ff'
  },
  {
    id: 'star_tear',
    name: '星辰之泪',
    layers: [
      { color: '#4488ff', minPercent: 0.20, maxPercent: 0.30 },
      { color: '#44ff88', minPercent: 0.15, maxPercent: 0.25 },
      { color: '#ffaa44', minPercent: 0.15, maxPercent: 0.25 }
    ],
    particleColors: ['#4488ff', '#66aaff', '#44ff88', '#ffee88', '#aaddff'],
    glowColor: '#66aaff'
  }
];

export const TEST_TUBE_CAPACITY = 100;
export const INJECT_VOLUME = 20;

export class GameLogic {
  private layers: LiquidLayer[] = [];
  private unlockedPotions: Set<string> = new Set();

  getLayers(): LiquidLayer[] {
    return [...this.layers];
  }

  getTotalVolume(): number {
    return this.layers.reduce((sum, layer) => sum + layer.volume, 0);
  }

  getUnlockedPotions(): string[] {
    return [...this.unlockedPotions];
  }

  isPotionUnlocked(id: string): boolean {
    return this.unlockedPotions.has(id);
  }

  injectLiquid(color: PotionColor): boolean {
    const total = this.getTotalVolume();
    if (total >= TEST_TUBE_CAPACITY) {
      return false;
    }
    const injectAmount = Math.min(INJECT_VOLUME, TEST_TUBE_CAPACITY - total);
    if (this.layers.length > 0 && this.layers[this.layers.length - 1].color === color) {
      this.layers[this.layers.length - 1].volume += injectAmount;
    } else {
      this.layers.push({ color, volume: injectAmount });
    }
    return true;
  }

  synthesize(): SynthesisResult {
    if (this.layers.length === 0) {
      return { success: false, message: '试管为空' };
    }
    for (const recipe of RECIPES) {
      if (this.matchRecipe(recipe)) {
        this.unlockedPotions.add(recipe.id);
        return {
          success: true,
          potionId: recipe.id,
          potionName: recipe.name,
          particleColors: recipe.particleColors,
          glowColor: recipe.glowColor
        };
      }
    }
    return { success: false, message: '配方不匹配' };
  }

  private matchRecipe(recipe: Recipe): boolean {
    if (this.layers.length !== recipe.layers.length) {
      return false;
    }
    for (let i = 0; i < recipe.layers.length; i++) {
      const required = recipe.layers[i];
      const actual = this.layers[i];
      if (actual.color !== required.color) {
        return false;
      }
      const percent = actual.volume / TEST_TUBE_CAPACITY;
      if (percent < required.minPercent || percent > required.maxPercent) {
        return false;
      }
    }
    return true;
  }

  clearTube(): void {
    this.layers = [];
  }
}
