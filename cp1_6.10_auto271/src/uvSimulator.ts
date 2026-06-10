export enum Stage {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGER = 'danger',
  BURN = 'burn'
}

export interface SkinType {
  id: number;
  name: string;
  description: string;
  baseColor: string;
  sensitivity: number;
  pigmentTendency: number;
}

export const SKIN_TYPES: SkinType[] = [
  {
    id: 1,
    name: 'I型',
    description: '极浅肤色，极易晒伤',
    baseColor: '#FCE4D6',
    sensitivity: 1.0,
    pigmentTendency: 0.1
  },
  {
    id: 2,
    name: 'II型',
    description: '浅肤色，容易晒伤',
    baseColor: '#F5D0B5',
    sensitivity: 0.85,
    pigmentTendency: 0.25
  },
  {
    id: 3,
    name: 'III型',
    description: '中等肤色，偶尔晒伤',
    baseColor: '#E8B88F',
    sensitivity: 0.65,
    pigmentTendency: 0.45
  },
  {
    id: 4,
    name: 'IV型',
    description: '橄榄肤色，很少晒伤',
    baseColor: '#C68863',
    sensitivity: 0.5,
    pigmentTendency: 0.65
  },
  {
    id: 5,
    name: 'V型',
    description: '深棕肤色，极少晒伤',
    baseColor: '#8D5524',
    sensitivity: 0.3,
    pigmentTendency: 0.8
  },
  {
    id: 6,
    name: 'VI型',
    description: '极深肤色，几乎不会晒伤',
    baseColor: '#3E2723',
    sensitivity: 0.2,
    pigmentTendency: 0.9
  }
];

export const STAGE_INFO: Record<Stage, {
  name: string;
  color: string;
  icon: string;
  description: string;
  advice: string;
}> = {
  [Stage.SAFE]: {
    name: '安全',
    color: '#4CAF50',
    icon: '🛡️',
    description: '紫外线强度低，皮肤无不良反应',
    advice: '可正常户外活动，无需特别防护'
  },
  [Stage.WARNING]: {
    name: '预警',
    color: '#FFC107',
    icon: '⚠️',
    description: '紫外线中等，敏感皮肤开始泛红',
    advice: '建议涂抹SPF30防晒霜，佩戴遮阳帽'
  },
  [Stage.DANGER]: {
    name: '危险',
    color: '#FF9800',
    icon: '🔥',
    description: '紫外线较强，皮肤明显受损，可能脱皮',
    advice: '务必涂抹SPF50+防晒霜，避免正午暴晒'
  },
  [Stage.BURN]: {
    name: '灼伤',
    color: '#F44336',
    icon: '💀',
    description: '紫外线极强，皮肤严重灼伤、起水泡',
    advice: '尽量避免外出，如必须外出需全面防护'
  }
};

export const UV_ADVICE: { max: number; text: string }[] = [
  { max: 2, text: '安全，可正常户外活动' },
  { max: 4, text: '轻度敏感，建议涂抹SPF30' },
  { max: 5, text: '中等强度，建议SPF30+遮阳帽' },
  { max: 7, text: '高强度，务必SPF50+避免暴晒' },
  { max: 9, text: '很高强度，减少外出，全面防护' },
  { max: 11, text: '极高强度，尽量避免外出' }
];

export class UVSimulator {
  private _currentSkinType: SkinType;
  private _uvIndex: number;
  private _listeners: Set<() => void> = new Set();

  constructor() {
    this._currentSkinType = SKIN_TYPES[1];
    this._uvIndex = 0;
  }

  get currentSkinType(): SkinType {
    return this._currentSkinType;
  }

  get uvIndex(): number {
    return this._uvIndex;
  }

  setSkinType(id: number): void {
    const skinType = SKIN_TYPES.find(s => s.id === id);
    if (skinType) {
      this._currentSkinType = skinType;
      this._notify();
    }
  }

  setUVIndex(value: number): void {
    this._uvIndex = Math.max(0, Math.min(11, value));
    this._notify();
  }

  getErythemaIntensity(): number {
    if (this._uvIndex <= 5) return 0;
    const base = (this._uvIndex - 5) / 6;
    return Math.min(1, base * this._currentSkinType.sensitivity);
  }

  getPigmentationLevel(): number {
    return Math.min(1, (this._uvIndex / 11) * this._currentSkinType.pigmentTendency);
  }

  getCurrentStage(): Stage {
    if (this._uvIndex <= 2) return Stage.SAFE;
    if (this._uvIndex <= 5) return Stage.WARNING;
    if (this._uvIndex <= 7) return Stage.DANGER;
    return Stage.BURN;
  }

  getEstimatedBurnTime(): number {
    if (this._uvIndex <= 0) return Infinity;
    const baseTime = 200;
    const burnTime = baseTime / (this._uvIndex * this._currentSkinType.sensitivity);
    return Math.max(5, Math.round(burnTime));
  }

  getUVAdviceText(): string {
    for (const advice of UV_ADVICE) {
      if (this._uvIndex <= advice.max) {
        return advice.text;
      }
    }
    return UV_ADVICE[UV_ADVICE.length - 1].text;
  }

  getRednessPercentage(): number {
    return Math.round(this.getErythemaIntensity() * 100);
  }

  getPigmentationPercentage(): number {
    const level = this.getPigmentationLevel();
    return Math.round(5 + level * 10);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    this._listeners.forEach(listener => listener());
  }
}
