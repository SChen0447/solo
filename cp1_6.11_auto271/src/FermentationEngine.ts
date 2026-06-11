export type TeaVariety = 'puer_raw' | 'minbei_oolong' | 'qimen_black';

export type TurnFrequency = 2 | 4 | 8;

export interface AromaMolecule {
  id: string;
  name: string;
  symbol: string;
  color: string;
  intensity: number;
  description: string;
}

export interface TeaState {
  color: { r: number; g: number; b: number };
  colorHex: string;
  teaSoupColor: { r: number; g: number; b: number };
  teaSoupColorHex: string;
  teaSoupOpacity: number;
  aromaMolecules: AromaMolecule[];
  progress: number;
  day: number;
}

export interface FermentationParams {
  temperature: number;
  humidity: number;
  turnFrequency: TurnFrequency;
}

export interface TeaVarietyConfig {
  id: TeaVariety;
  name: string;
  description: string;
  initialColor: { r: number; g: number; b: number };
  finalColor: { r: number; g: number; b: number };
  initialSoupColor: { r: number; g: number; b: number };
  finalSoupColor: { r: number; g: number; b: number };
  initialMolecules: AromaMolecule[];
  finalMolecules: AromaMolecule[];
  tempRange: { min: number; max: number; optimal: number };
  humidityRange: { min: number; max: number; optimal: number };
  fermentationDays: number;
  tasteProfile: {
    sweetness: number;
    bitterness: number;
    astringency: number;
    thickness: number;
    aroma: number;
    aftertaste: number;
  };
}

const TEA_VARIETIES: Record<TeaVariety, TeaVarietyConfig> = {
  puer_raw: {
    id: 'puer_raw',
    name: '普洱生茶',
    description: '云南大叶种晒青毛茶，经自然陈化，口感醇厚回甘',
    initialColor: { r: 107, g: 142, b: 95 },
    finalColor: { r: 139, g: 69, b: 19 },
    initialSoupColor: { r: 230, g: 240, b: 220 },
    finalSoupColor: { r: 180, g: 80, b: 30 },
    initialMolecules: [
      { id: 'beta-ionone', name: 'β-紫罗兰酮', symbol: 'β-I', color: '#9B7B6B', intensity: 0.8, description: '紫罗兰花香' },
      { id: 'linalool', name: '芳樟醇', symbol: 'Lin', color: '#A8C97A', intensity: 0.6, description: '铃兰花香' }
    ],
    finalMolecules: [
      { id: 'geraniol', name: '香叶醇', symbol: 'Ger', color: '#E8B86D', intensity: 0.9, description: '玫瑰花香' },
      { id: 'theabrownin', name: '茶褐素', symbol: 'TB', color: '#8B4513', intensity: 0.85, description: '陈香醇厚' },
      { id: 'gamma-nonalactone', name: 'γ-壬内酯', symbol: 'γ-N', color: '#C4A77D', intensity: 0.7, description: '椰香蜜甜' }
    ],
    tempRange: { min: 20, max: 40, optimal: 28 },
    humidityRange: { min: 50, max: 85, optimal: 70 },
    fermentationDays: 30,
    tasteProfile: {
      sweetness: 6,
      bitterness: 4,
      astringency: 5,
      thickness: 7,
      aroma: 8,
      aftertaste: 9
    }
  },
  minbei_oolong: {
    id: 'minbei_oolong',
    name: '闽北乌龙',
    description: '武夷岩茶，岩骨花香，口感丰富层次分明',
    initialColor: { r: 120, g: 130, b: 100 },
    finalColor: { r: 90, g: 60, b: 40 },
    initialSoupColor: { r: 220, g: 230, b: 210 },
    finalSoupColor: { r: 200, g: 140, b: 60 },
    initialMolecules: [
      { id: 'hexenal', name: '青叶醛', symbol: 'Hex', color: '#7CB342', intensity: 0.7, description: '青草香' },
      { id: 'benzaldehyde', name: '苯甲醛', symbol: 'Ben', color: '#FFB74D', intensity: 0.5, description: '杏仁香' }
    ],
    finalMolecules: [
      { id: 'nerolidol', name: '橙花叔醇', symbol: 'Ner', color: '#FFAB91', intensity: 0.85, description: '花果香' },
      { id: 'farnesene', name: '法尼烯', symbol: 'Far', color: '#FFCC80', intensity: 0.75, description: '柑橘香' },
      { id: 'indole', name: '吲哚', symbol: 'Ind', color: '#BA68C8', intensity: 0.6, description: '茉莉花香' }
    ],
    tempRange: { min: 22, max: 35, optimal: 28 },
    humidityRange: { min: 60, max: 85, optimal: 75 },
    fermentationDays: 15,
    tasteProfile: {
      sweetness: 5,
      bitterness: 5,
      astringency: 6,
      thickness: 8,
      aroma: 9,
      aftertaste: 7
    }
  },
  qimen_black: {
    id: 'qimen_black',
    name: '祁门红茶',
    description: '世界三大高香红茶之一，祁门香馥郁持久',
    initialColor: { r: 150, g: 160, b: 120 },
    finalColor: { r: 60, g: 30, b: 20 },
    initialSoupColor: { r: 240, g: 235, b: 220 },
    finalSoupColor: { r: 180, g: 40, b: 40 },
    initialMolecules: [
      { id: 'chlorophyll', name: '叶绿素', symbol: 'Chl', color: '#4CAF50', intensity: 0.9, description: '青草气' },
      { id: 'carotene', name: '胡萝卜素', symbol: 'Car', color: '#FF9800', intensity: 0.4, description: '胡萝卜香' }
    ],
    finalMolecules: [
      { id: 'linalool-oxide', name: '芳樟醇氧化物', symbol: 'LO', color: '#E1BEE7', intensity: 0.9, description: '铃兰花香' },
      { id: 'geranial', name: '香叶醛', symbol: 'Gal', color: '#FFD54F', intensity: 0.8, description: '柠檬香' },
      { id: 'theaflavin', name: '茶黄素', symbol: 'TF', color: '#FFD700', intensity: 0.75, description: '鲜爽金毫' }
    ],
    tempRange: { min: 24, max: 45, optimal: 32 },
    humidityRange: { min: 70, max: 90, optimal: 82 },
    fermentationDays: 10,
    tasteProfile: {
      sweetness: 7,
      bitterness: 3,
      astringency: 4,
      thickness: 6,
      aroma: 9,
      aftertaste: 8
    }
  }
};

export class FermentationEngine {
  private variety: TeaVariety;
  private params: FermentationParams;
  private currentDay: number = 0;
  private config: TeaVarietyConfig;

  constructor(variety: TeaVariety, params: FermentationParams) {
    this.variety = variety;
    this.params = params;
    this.config = TEA_VARIETIES[variety];
  }

  getConfig(): TeaVarietyConfig {
    return this.config;
  }

  getParams(): FermentationParams {
    return this.params;
  }

  setParams(params: FermentationParams): void {
    this.params = params;
  }

  getTotalDays(): number {
    return this.config.fermentationDays;
  }

  getEfficiencyFactor(): number {
    const { temperature, humidity, turnFrequency } = this.params;
    const { tempRange, humidityRange } = this.config;

    const tempOptimal = tempRange.optimal;
    const tempDeviation = Math.abs(temperature - tempOptimal) / (tempRange.max - tempRange.min);
    const tempFactor = Math.max(0.3, 1 - tempDeviation * 0.8);

    const humOptimal = humidityRange.optimal;
    const humDeviation = Math.abs(humidity - humOptimal) / (humidityRange.max - humidityRange.min);
    const humFactor = Math.max(0.3, 1 - humDeviation * 0.6);

    const turnFactor = turnFrequency === 2 ? 1.1 : turnFrequency === 4 ? 1.0 : 0.85;

    return tempFactor * humFactor * turnFactor;
  }

  interpolateColor(
    start: { r: number; g: number; b: number },
    end: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t)
    };
  }

  rgbToHex(r: number, g: number, b: number): string {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  getStateAtDay(day: number): TeaState {
    const progress = Math.min(1, Math.max(0, day / this.config.fermentationDays));
    const effectiveProgress = this.applyEfficiencyCurve(progress);

    const teaColor = this.interpolateColor(
      this.config.initialColor,
      this.config.finalColor,
      effectiveProgress
    );

    const soupColor = this.interpolateColor(
      this.config.initialSoupColor,
      this.config.finalSoupColor,
      effectiveProgress
    );

    const aromaMolecules = this.calculateAromaMolecules(effectiveProgress);

    return {
      color: teaColor,
      colorHex: this.rgbToHex(teaColor.r, teaColor.g, teaColor.b),
      teaSoupColor: soupColor,
      teaSoupColorHex: this.rgbToHex(soupColor.r, soupColor.g, soupColor.b),
      teaSoupOpacity: 0.3 + effectiveProgress * 0.7,
      aromaMolecules,
      progress: effectiveProgress,
      day
    };
  }

  private applyEfficiencyCurve(progress: number): number {
    const efficiency = this.getEfficiencyFactor();
    if (efficiency >= 1) {
      return Math.min(1, progress * efficiency);
    }
    return progress * efficiency + (1 - efficiency) * progress * progress;
  }

  private calculateAromaMolecules(progress: number): AromaMolecule[] {
    const molecules: AromaMolecule[] = [];

    for (const mol of this.config.initialMolecules) {
      const intensity = mol.intensity * Math.max(0, 1 - progress * 1.2);
      if (intensity > 0.05) {
        molecules.push({ ...mol, intensity });
      }
    }

    for (const mol of this.config.finalMolecules) {
      const startAppear = 0.15 + Math.random() * 0.25;
      const intensity = mol.intensity * Math.max(0, Math.min(1, (progress - startAppear) / (1 - startAppear)));
      if (intensity > 0.05) {
        molecules.push({ ...mol, intensity });
      }
    }

    return molecules.sort((a, b) => b.intensity - a.intensity);
  }

  getTasteScores(day: number): Record<string, number> {
    const state = this.getStateAtDay(day);
    const progress = state.progress;
    const baseProfile = this.config.tasteProfile;
    const efficiency = this.getEfficiencyFactor();

    const sweetness = baseProfile.sweetness * (0.5 + progress * 0.5) * efficiency;
    const bitterness = baseProfile.bitterness * (1 - progress * 0.4);
    const astringency = baseProfile.astringency * (1 - progress * 0.3);
    const thickness = baseProfile.thickness * (0.6 + progress * 0.4) * efficiency;
    const aroma = baseProfile.aroma * (0.4 + progress * 0.6) * efficiency;
    const aftertaste = baseProfile.aftertaste * (0.5 + progress * 0.5) * efficiency;

    return {
      sweetness: Math.round(Math.min(10, Math.max(1, sweetness)) * 10) / 10,
      bitterness: Math.round(Math.min(10, Math.max(1, bitterness)) * 10) / 10,
      astringency: Math.round(Math.min(10, Math.max(1, astringency)) * 10) / 10,
      thickness: Math.round(Math.min(10, Math.max(1, thickness)) * 10) / 10,
      aroma: Math.round(Math.min(10, Math.max(1, aroma)) * 10) / 10,
      aftertaste: Math.round(Math.min(10, Math.max(1, aftertaste)) * 10) / 10
    };
  }

  getAromaTimeline(days: number): Array<{ day: number; molecules: AromaMolecule[] }> {
    const timeline = [];
    const step = Math.max(1, Math.floor(days / 20));
    for (let d = 0; d <= days; d += step) {
      timeline.push({
        day: d,
        molecules: this.getStateAtDay(d).aromaMolecules
      });
    }
    return timeline;
  }

  static getVarieties(): TeaVarietyConfig[] {
    return Object.values(TEA_VARIETIES);
  }

  static getVariety(variety: TeaVariety): TeaVarietyConfig {
    return TEA_VARIETIES[variety];
  }
}

export { TEA_VARIETIES };
