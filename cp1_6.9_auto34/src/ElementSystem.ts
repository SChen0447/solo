export type ElementType = 'fire' | 'water' | 'wind' | 'earth';
export type FusionResultType =
  | 'steam'
  | 'firestorm'
  | 'mud'
  | 'lava'
  | 'ice'
  | 'sand'
  | 'lightning'
  | 'storm'
  | 'earth_wind'
  | 'fire_water';

export interface FusionRecipe {
  elements: ElementType[];
  result: FusionResultType;
  resultName: string;
  emoji: string;
}

export interface RecipeRecord {
  id: string;
  elements: ElementType[];
  result: FusionResultType;
  resultName: string;
  timestamp: number;
}

export interface FusionResult {
  recipe: FusionRecipe | null;
  success: boolean;
}

const ELEMENT_INFO: Record<ElementType, { name: string; color: number; emoji: string }> = {
  fire: { name: '火', color: 0xff4500, emoji: '🔥' },
  water: { name: '水', color: 0x1e90ff, emoji: '💧' },
  wind: { name: '风', color: 0x32cd32, emoji: '🌪' },
  earth: { name: '土', color: 0x8b4513, emoji: '🪨' }
};

const RESULT_INFO: Record<FusionResultType, { name: string; emoji: string }> = {
  steam: { name: '蒸汽', emoji: '💨' },
  firestorm: { name: '火焰旋风', emoji: '🔥' },
  mud: { name: '泥浆', emoji: '🟤' },
  lava: { name: '岩浆', emoji: '🌋' },
  ice: { name: '冰霜', emoji: '❄️' },
  sand: { name: '沙尘', emoji: '🏜' },
  lightning: { name: '闪电', emoji: '⚡' },
  storm: { name: '风暴', emoji: '⛈' },
  earth_wind: { name: '沙尘暴', emoji: '🌪' },
  fire_water: { name: '蒸汽', emoji: '💨' }
};

const FUSION_RECIPES: FusionRecipe[] = [
  { elements: ['fire', 'water'], result: 'steam', resultName: '蒸汽', emoji: '💨' },
  { elements: ['fire', 'wind'], result: 'firestorm', resultName: '火焰旋风', emoji: '🔥' },
  { elements: ['water', 'earth'], result: 'mud', resultName: '泥浆', emoji: '🟤' },
  { elements: ['fire', 'earth'], result: 'lava', resultName: '岩浆', emoji: '🌋' },
  { elements: ['water', 'wind'], result: 'ice', resultName: '冰霜', emoji: '❄️' },
  { elements: ['wind', 'earth'], result: 'sand', resultName: '沙尘', emoji: '🏜' },
  { elements: ['fire', 'water', 'wind'], result: 'lightning', resultName: '闪电', emoji: '⚡' },
  { elements: ['water', 'wind', 'earth'], result: 'storm', resultName: '风暴', emoji: '⛈' },
  { elements: ['fire', 'wind', 'earth'], result: 'earth_wind', resultName: '沙尘暴', emoji: '🌪' },
  { elements: ['fire', 'water', 'earth'], result: 'fire_water', resultName: '热泉', emoji: '♨️' }
];

export class ElementSystem {
  public energy: number = 100;
  public maxEnergy: number = 100;
  public energyRegenAmount: number = 5;
  public energyRegenInterval: number = 5000;
  public minFusionEnergy: number = 10;

  public cooldownTime: number = 60;
  public cooldownRemaining: number = 0;
  public isOnCooldown: boolean = false;
  public consecutiveFusions: number = 0;
  public cooldownTriggerThreshold: number = 3;

  private energyRegenTimer: number = 0;
  private onEnergyChangeCallbacks: ((energy: number, maxEnergy: number, isLow: boolean) => void)[] = [];
  private onCooldownChangeCallbacks: ((remaining: number, total: number, active: boolean) => void)[] = [];
  private onFusionCallbacks: ((result: FusionResult, elements: ElementType[]) => void)[] = [];

  public static getElementInfo(type: ElementType) {
    return ELEMENT_INFO[type];
  }

  public static getResultInfo(type: FusionResultType) {
    return RESULT_INFO[type];
  }

  public update(delta: number): void {
    if (this.isOnCooldown) {
      this.cooldownRemaining -= delta;
      if (this.cooldownRemaining <= 0) {
        this.cooldownRemaining = 0;
        this.isOnCooldown = false;
        this.consecutiveFusions = 0;
      }
      this.notifyCooldownChange();
    }

    this.energyRegenTimer += delta * 1000;
    if (this.energyRegenTimer >= this.energyRegenInterval) {
      this.energyRegenTimer = 0;
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenAmount);
      this.notifyEnergyChange();
    }
  }

  public canFuse(): boolean {
    return !this.isOnCooldown && this.energy >= this.minFusionEnergy;
  }

  public canReplayRecipe(): boolean {
    return !this.isOnCooldown && this.energy >= 1;
  }

  public findRecipe(elements: ElementType[]): FusionRecipe | null {
    if (elements.length < 2) return null;

    const sortedElements = [...elements].sort();
    for (const recipe of FUSION_RECIPES) {
      const sortedRecipe = [...recipe.elements].sort();
      if (
        sortedRecipe.length === sortedElements.length &&
        sortedRecipe.every((el, i) => el === sortedElements[i])
      ) {
        return recipe;
      }
    }
    return null;
  }

  public attemptFusion(elements: ElementType[]): FusionResult {
    if (!this.canFuse()) {
      return { recipe: null, success: false };
    }

    const recipe = this.findRecipe(elements);
    if (!recipe) {
      return { recipe: null, success: false };
    }

    this.energy = Math.max(0, this.energy - 5);
    this.consecutiveFusions++;

    if (this.consecutiveFusions >= this.cooldownTriggerThreshold) {
      this.isOnCooldown = true;
      this.cooldownRemaining = this.cooldownTime;
      this.consecutiveFusions = 0;
    }

    this.notifyEnergyChange();
    this.notifyCooldownChange();
    this.notifyFusion({ recipe, success: true }, elements);

    return { recipe, success: true };
  }

  public replayRecipe(elements: ElementType[]): FusionResult {
    if (!this.canReplayRecipe()) {
      return { recipe: null, success: false };
    }

    const recipe = this.findRecipe(elements);
    if (!recipe) {
      return { recipe: null, success: false };
    }

    this.energy = Math.max(0, this.energy - 1);
    this.notifyEnergyChange();
    this.notifyFusion({ recipe, success: true }, elements);

    return { recipe, success: true };
  }

  public onEnergyChange(callback: (energy: number, maxEnergy: number, isLow: boolean) => void): void {
    this.onEnergyChangeCallbacks.push(callback);
  }

  public onCooldownChange(callback: (remaining: number, total: number, active: boolean) => void): void {
    this.onCooldownChangeCallbacks.push(callback);
  }

  public onFusion(callback: (result: FusionResult, elements: ElementType[]) => void): void {
    this.onFusionCallbacks.push(callback);
  }

  private notifyEnergyChange(): void {
    const isLow = this.energy < this.minFusionEnergy;
    this.onEnergyChangeCallbacks.forEach(cb => cb(this.energy, this.maxEnergy, isLow));
  }

  private notifyCooldownChange(): void {
    this.onCooldownChangeCallbacks.forEach(cb =>
      cb(this.cooldownRemaining, this.cooldownTime, this.isOnCooldown)
    );
  }

  private notifyFusion(result: FusionResult, elements: ElementType[]): void {
    this.onFusionCallbacks.forEach(cb => cb(result, elements));
  }

  public isLowEnergy(): boolean {
    return this.energy < this.minFusionEnergy;
  }
}
