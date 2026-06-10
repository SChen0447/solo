export type RoastLevel = '浅' | '中' | '深';
export type ProcessMethod = '水洗' | '日晒' | '蜜处理';
export type PourMethod = '一刀流' | '三段式' | '搅拌法';

export interface FlavorTags {
  acidity: string;
  bitterness: string;
  sweetness: string;
  body: string;
  aftertaste: string;
}

export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  roastLevel: RoastLevel;
  processMethod: ProcessMethod;
  flavorDescription: string;
  colorTheme: {
    start: string;
    end: string;
  };
}

export interface ExtractionParams {
  beanId: string;
  dose: number;
  waterTemp: number;
  brewTime: number;
  pourMethod: PourMethod;
  flavorTags: FlavorTags;
  tastingNote?: string;
  photoPlaceholder?: string;
}

export interface RadarDimensions {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  aftertaste: number;
}

export interface RadarVersion {
  id: string;
  timestamp: number;
  dimensions: RadarDimensions;
  isAdjusted: boolean;
}

export interface ExtractionRecord {
  id: string;
  params: ExtractionParams;
  versions: RadarVersion[];
  currentVersionId: string;
}

export interface AppState {
  beans: CoffeeBean[];
  records: ExtractionRecord[];
  currentRecordId: string | null;
  compareVersionId: string | null;
  compareMode: boolean;
}

export type Action =
  | { type: 'ADD_BEAN'; payload: CoffeeBean }
  | { type: 'UPDATE_BEAN'; payload: CoffeeBean }
  | { type: 'ADD_RECORD'; payload: ExtractionRecord }
  | { type: 'UPDATE_RECORD'; payload: ExtractionRecord }
  | { type: 'SET_CURRENT_RECORD'; payload: string | null }
  | { type: 'ADD_VERSION'; payload: { recordId: string; version: RadarVersion } }
  | { type: 'SET_CURRENT_VERSION'; payload: { recordId: string; versionId: string } }
  | { type: 'SET_COMPARE_MODE'; payload: boolean }
  | { type: 'SET_COMPARE_VERSION'; payload: string | null }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };

export const DIMENSION_KEYS = ['acidity', 'bitterness', 'sweetness', 'body', 'aftertaste'] as const;
export const DIMENSION_LABELS: Record<typeof DIMENSION_KEYS[number], string> = {
  acidity: '酸度',
  bitterness: '苦度',
  sweetness: '甜度',
  body: '醇厚度',
  aftertaste: '回甘'
};

export const ACIDITY_LEVELS = ['低酸', '柔和', '明亮', '尖锐', '极高'];
export const BITTERNESS_LEVELS = ['极淡', '微苦', '适中', '浓郁', '焦苦'];
export const SWEETNESS_LEVELS = ['寡淡', '微甜', '清甜', '蜜甜', '浓郁'];
export const BODY_LEVELS = ['水薄', '轻盈', '中等', '饱满', '厚重'];
export const AFTERTASTE_LEVELS = ['短促', '短暂', '适中', '悠长', '持久'];
