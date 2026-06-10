import {
  CoffeeBean,
  ExtractionParams,
  RadarDimensions,
  RadarVersion,
  ExtractionRecord,
  AppState,
  ACIDITY_LEVELS,
  BITTERNESS_LEVELS,
  SWEETNESS_LEVELS,
  BODY_LEVELS,
  AFTERTASTE_LEVELS
} from '../types';

const STORAGE_KEY = 'coffee_extraction_tracker_data';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const defaultBeans: CoffeeBean[] = [
  {
    id: 'bean-yirgacheffe',
    name: '埃塞俄比亚 耶加雪菲',
    origin: '埃塞俄比亚',
    roastLevel: '浅',
    processMethod: '水洗',
    flavorDescription: '柑橘、茉莉花香、蜂蜜甜感，明亮果酸',
    colorTheme: { start: '#a8d5ba', end: '#f4e58a' }
  },
  {
    id: 'bean-cerrado',
    name: '巴西 喜拉朵',
    origin: '巴西',
    roastLevel: '中',
    processMethod: '日晒',
    flavorDescription: '坚果、巧克力、焦糖甜，低酸醇厚',
    colorTheme: { start: '#c4a77d', end: '#8b5a2b' }
  },
  {
    id: 'bean-puer',
    name: '云南 普洱',
    origin: '中国云南',
    roastLevel: '深',
    processMethod: '蜜处理',
    flavorDescription: '熟果香、红糖甜感，厚重顺滑',
    colorTheme: { start: '#9c6b4d', end: '#5c3a21' }
  }
];

export const getLevelIndex = (level: string, levels: string[]): number => {
  const idx = levels.indexOf(level);
  return idx >= 0 ? idx : 2;
};

export const calculateDimensions = (params: ExtractionParams): RadarDimensions => {
  const { dose, waterTemp, brewTime, pourMethod, flavorTags } = params;

  const acidityTag = getLevelIndex(flavorTags.acidity, ACIDITY_LEVELS);
  const bitternessTag = getLevelIndex(flavorTags.bitterness, BITTERNESS_LEVELS);
  const sweetnessTag = getLevelIndex(flavorTags.sweetness, SWEETNESS_LEVELS);
  const bodyTag = getLevelIndex(flavorTags.body, BODY_LEVELS);
  const aftertasteTag = getLevelIndex(flavorTags.aftertaste, AFTERTASTE_LEVELS);

  let pourAcidityMod = 0;
  let pourSweetnessMod = 0;
  let pourBodyMod = 0;

  switch (pourMethod) {
    case '一刀流':
      pourAcidityMod = -0.5;
      pourSweetnessMod = 0.3;
      pourBodyMod = 0.5;
      break;
    case '三段式':
      pourAcidityMod = 0.5;
      pourSweetnessMod = 0.2;
      pourBodyMod = -0.3;
      break;
    case '搅拌法':
      pourAcidityMod = -0.3;
      pourSweetnessMod = -0.2;
      pourBodyMod = 0.8;
      break;
  }

  const tempAcidityMod = (waterTemp - 92) * 0.15;
  const timeBitternessMod = Math.max(0, (brewTime - 120) / 60) * 0.8;
  const doseBodyMod = (dose - 15) * 0.3;

  const clamp = (v: number) => Math.max(0, Math.min(10, v));

  return {
    acidity: clamp((acidityTag + 1) * 1.6 + pourAcidityMod - tempAcidityMod),
    bitterness: clamp((bitternessTag + 1) * 1.6 + timeBitternessMod),
    sweetness: clamp((sweetnessTag + 1) * 1.6 + pourSweetnessMod),
    body: clamp((bodyTag + 1) * 1.6 + pourBodyMod + doseBodyMod),
    aftertaste: clamp((aftertasteTag + 1) * 1.6 + brewTime / 60)
  };
};

export const createInitialVersion = (dimensions: RadarDimensions): RadarVersion => ({
  id: generateId(),
  timestamp: Date.now(),
  dimensions: { ...dimensions },
  isAdjusted: false
});

export const createAdjustedVersion = (dimensions: RadarDimensions): RadarVersion => ({
  id: generateId(),
  timestamp: Date.now(),
  dimensions: { ...dimensions },
  isAdjusted: true
});

export const saveState = (state: Partial<AppState>): void => {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

export const loadState = (): Partial<AppState> | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Partial<AppState>;
  } catch (e) {
    console.error('加载数据失败:', e);
    return null;
  }
};

export const exportJSON = (state: AppState): void => {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `coffee_records_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ImportResult {
  beans: CoffeeBean[];
  records: ExtractionRecord[];
  conflicts: string[];
}

export const parseImportJSON = async (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as AppState;
        resolve(parsed);
      } catch (err) {
        reject(new Error('JSON解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

export const mergeImportData = (
  existingBeans: CoffeeBean[],
  existingRecords: ExtractionRecord[],
  imported: AppState,
  conflictResolution: 'overwrite' | 'skip'
): { beans: CoffeeBean[]; records: ExtractionRecord[] } => {
  const existingBeanNames = new Set(existingBeans.map(b => b.name));
  let newBeans = [...existingBeans];
  let newRecords = [...existingRecords];

  if (imported.beans) {
    for (const bean of imported.beans) {
      if (existingBeanNames.has(bean.name)) {
        if (conflictResolution === 'overwrite') {
          newBeans = newBeans.map(b => b.name === bean.name ? bean : b);
        }
      } else {
        newBeans.push(bean);
      }
    }
  }

  if (imported.records) {
    const existingRecordIds = new Set(existingRecords.map(r => r.id));
    for (const record of imported.records) {
      if (!existingRecordIds.has(record.id)) {
        newRecords.push(record);
      }
    }
  }

  return { beans: newBeans, records: newRecords };
};

export const findConflicts = (existingBeans: CoffeeBean[], imported: AppState): string[] => {
  const existingNames = new Set(existingBeans.map(b => b.name));
  const conflicts: string[] = [];
  if (imported.beans) {
    for (const bean of imported.beans) {
      if (existingNames.has(bean.name)) {
        conflicts.push(bean.name);
      }
    }
  }
  return conflicts;
};
