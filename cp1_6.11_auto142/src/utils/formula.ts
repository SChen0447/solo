import { v4 as uuidv4 } from 'uuid';

export type NoteType = 'top' | 'middle' | 'base';

export interface Scent {
  id: string;
  name: string;
  type: NoteType;
  color: string;
  attributes: {
    longevity: number;
    sillage: number;
    warmth: number;
    freshness: number;
    sweetness: number;
    thickness: number;
  };
}

export interface PlacedScent extends Scent {
  concentration: number;
  slotIndex: number;
}

export interface Formula {
  id: string;
  name: string;
  themeColor: string;
  createdAt: number;
  topNotes: (PlacedScent | null)[];
  middleNotes: (PlacedScent | null)[];
  baseNotes: (PlacedScent | null)[];
}

export interface RadarData {
  longevity: number;
  sillage: number;
  warmth: number;
  freshness: number;
  sweetness: number;
  thickness: number;
}

export const RADAR_DIMENSIONS: (keyof RadarData)[] = [
  'longevity',
  'sillage',
  'warmth',
  'freshness',
  'sweetness',
  'thickness',
];

export const RADAR_LABELS: Record<keyof RadarData, string> = {
  longevity: '持久度',
  sillage: '扩散度',
  warmth: '温暖度',
  freshness: '清新度',
  sweetness: '甜度',
  thickness: '厚度',
};

export const TOP_NOTES: Scent[] = [
  { id: 't1', name: '柠檬', type: 'top', color: '#FFD700', attributes: { longevity: 30, sillage: 60, warmth: 20, freshness: 95, sweetness: 40, thickness: 15 } },
  { id: 't2', name: '佛手柑', type: 'top', color: '#98FB98', attributes: { longevity: 35, sillage: 55, warmth: 30, freshness: 85, sweetness: 50, thickness: 20 } },
  { id: 't3', name: '葡萄柚', type: 'top', color: '#FFA07A', attributes: { longevity: 25, sillage: 65, warmth: 25, freshness: 90, sweetness: 45, thickness: 18 } },
  { id: 't4', name: '薄荷', type: 'top', color: '#98FF98', attributes: { longevity: 20, sillage: 70, warmth: 10, freshness: 100, sweetness: 20, thickness: 10 } },
  { id: 't5', name: '橙花', type: 'top', color: '#FFE4E1', attributes: { longevity: 40, sillage: 50, warmth: 45, freshness: 70, sweetness: 65, thickness: 30 } },
];

export const MIDDLE_NOTES: Scent[] = [
  { id: 'm1', name: '玫瑰', type: 'middle', color: '#FF69B4', attributes: { longevity: 60, sillage: 70, warmth: 55, freshness: 40, sweetness: 75, thickness: 50 } },
  { id: 'm2', name: '茉莉', type: 'middle', color: '#FFFACD', attributes: { longevity: 55, sillage: 75, warmth: 50, freshness: 45, sweetness: 70, thickness: 45 } },
  { id: 'm3', name: '薰衣草', type: 'middle', color: '#E6E6FA', attributes: { longevity: 65, sillage: 60, warmth: 40, freshness: 60, sweetness: 45, thickness: 40 } },
  { id: 'm4', name: '牡丹', type: 'middle', color: '#FFB6C1', attributes: { longevity: 50, sillage: 65, warmth: 45, freshness: 55, sweetness: 60, thickness: 48 } },
  { id: 'm5', name: '依兰', type: 'middle', color: '#FFFF00', attributes: { longevity: 70, sillage: 80, warmth: 65, freshness: 30, sweetness: 80, thickness: 60 } },
];

export const BASE_NOTES: Scent[] = [
  { id: 'b1', name: '檀香', type: 'base', color: '#D2B48C', attributes: { longevity: 95, sillage: 50, warmth: 85, freshness: 15, sweetness: 55, thickness: 90 } },
  { id: 'b2', name: '麝香', type: 'base', color: '#F5DEB3', attributes: { longevity: 90, sillage: 65, warmth: 75, freshness: 20, sweetness: 50, thickness: 85 } },
  { id: 'b3', name: '雪松', type: 'base', color: '#8B4513', attributes: { longevity: 85, sillage: 55, warmth: 70, freshness: 25, sweetness: 30, thickness: 80 } },
  { id: 'b4', name: '香草', type: 'base', color: '#DEB887', attributes: { longevity: 88, sillage: 60, warmth: 90, freshness: 10, sweetness: 95, thickness: 88 } },
  { id: 'b5', name: '琥珀', type: 'base', color: '#FFBF00', attributes: { longevity: 92, sillage: 70, warmth: 88, freshness: 12, sweetness: 75, thickness: 92 } },
];

export interface Preset {
  name: string;
  themeColor: string;
  topNotes: { scentId: string; concentration: number; slotIndex: number }[];
  middleNotes: { scentId: string; concentration: number; slotIndex: number }[];
  baseNotes: { scentId: string; concentration: number; slotIndex: number }[];
}

export const PRESETS: Preset[] = [
  {
    name: '柑橘清新调',
    themeColor: '#FFA500',
    topNotes: [
      { scentId: 't1', concentration: 80, slotIndex: 0 },
      { scentId: 't3', concentration: 60, slotIndex: 1 },
    ],
    middleNotes: [{ scentId: 'm3', concentration: 50, slotIndex: 0 }],
    baseNotes: [{ scentId: 'b3', concentration: 40, slotIndex: 0 }],
  },
  {
    name: '优雅花香调',
    themeColor: '#FF69B4',
    topNotes: [{ scentId: 't5', concentration: 70, slotIndex: 0 }],
    middleNotes: [
      { scentId: 'm1', concentration: 85, slotIndex: 0 },
      { scentId: 'm2', concentration: 60, slotIndex: 1 },
    ],
    baseNotes: [{ scentId: 'b2', concentration: 50, slotIndex: 0 }],
  },
  {
    name: '东方木质调',
    themeColor: '#8B4513',
    topNotes: [{ scentId: 't2', concentration: 50, slotIndex: 0 }],
    middleNotes: [{ scentId: 'm5', concentration: 70, slotIndex: 0 }],
    baseNotes: [
      { scentId: 'b1', concentration: 85, slotIndex: 0 },
      { scentId: 'b5', concentration: 70, slotIndex: 1 },
    ],
  },
  {
    name: '海洋清新调',
    themeColor: '#00CED1',
    topNotes: [
      { scentId: 't4', concentration: 75, slotIndex: 0 },
      { scentId: 't3', concentration: 55, slotIndex: 1 },
    ],
    middleNotes: [{ scentId: 'm3', concentration: 45, slotIndex: 0 }],
    baseNotes: [{ scentId: 'b2', concentration: 35, slotIndex: 0 }],
  },
  {
    name: '甜蜜美食调',
    themeColor: '#DEB887',
    topNotes: [{ scentId: 't1', concentration: 45, slotIndex: 0 }],
    middleNotes: [
      { scentId: 'm4', concentration: 70, slotIndex: 0 },
      { scentId: 'm1', concentration: 50, slotIndex: 1 },
    ],
    baseNotes: [
      { scentId: 'b4', concentration: 90, slotIndex: 0 },
      { scentId: 'b5', concentration: 60, slotIndex: 1 },
    ],
  },
  {
    name: '草本芳香调',
    themeColor: '#228B22',
    topNotes: [
      { scentId: 't4', concentration: 85, slotIndex: 0 },
      { scentId: 't2', concentration: 50, slotIndex: 1 },
    ],
    middleNotes: [{ scentId: 'm3', concentration: 75, slotIndex: 0 }],
    baseNotes: [{ scentId: 'b3', concentration: 55, slotIndex: 0 }],
  },
  {
    name: '神秘东方调',
    themeColor: '#800080',
    topNotes: [{ scentId: 't5', concentration: 55, slotIndex: 0 }],
    middleNotes: [
      { scentId: 'm5', concentration: 80, slotIndex: 0 },
      { scentId: 'm2', concentration: 60, slotIndex: 1 },
    ],
    baseNotes: [
      { scentId: 'b1', concentration: 75, slotIndex: 0 },
      { scentId: 'b5', concentration: 80, slotIndex: 1 },
    ],
  },
  {
    name: '淡雅醛香调',
    themeColor: '#E0E0E0',
    topNotes: [
      { scentId: 't1', concentration: 65, slotIndex: 0 },
      { scentId: 't4', concentration: 45, slotIndex: 1 },
    ],
    middleNotes: [{ scentId: 'm2', concentration: 65, slotIndex: 0 }],
    baseNotes: [
      { scentId: 'b2', concentration: 60, slotIndex: 0 },
      { scentId: 'b1', concentration: 50, slotIndex: 1 },
    ],
  },
  {
    name: '森林木质调',
    themeColor: '#2F4F4F',
    topNotes: [{ scentId: 't3', concentration: 50, slotIndex: 0 }],
    middleNotes: [{ scentId: 'm3', concentration: 60, slotIndex: 0 }],
    baseNotes: [
      { scentId: 'b3', concentration: 85, slotIndex: 0 },
      { scentId: 'b1', concentration: 70, slotIndex: 1 },
    ],
  },
  {
    name: '浪漫果香调',
    themeColor: '#FF6347',
    topNotes: [
      { scentId: 't1', concentration: 70, slotIndex: 0 },
      { scentId: 't5', concentration: 60, slotIndex: 1 },
    ],
    middleNotes: [
      { scentId: 'm1', concentration: 75, slotIndex: 0 },
      { scentId: 'm4', concentration: 55, slotIndex: 1 },
    ],
    baseNotes: [{ scentId: 'b4', concentration: 45, slotIndex: 0 }],
  },
];

const STORAGE_KEY = 'digital_perfumer_formulas';

export function createEmptySlots(): (PlacedScent | null)[] {
  return Array(5).fill(null);
}

export function calculateRadarData(
  topNotes: (PlacedScent | null)[],
  middleNotes: (PlacedScent | null)[],
  baseNotes: (PlacedScent | null)[],
): RadarData {
  const result: RadarData = {
    longevity: 0,
    sillage: 0,
    warmth: 0,
    freshness: 0,
    sweetness: 0,
    thickness: 0,
  };

  let totalWeight = 0;

  const processNote = (note: PlacedScent | null, weight: number) => {
    if (!note) return;
    const concentrationWeight = note.concentration / 100;
    const finalWeight = weight * concentrationWeight;
    RADAR_DIMENSIONS.forEach((dim) => {
      result[dim] += note.attributes[dim] * finalWeight;
    });
    totalWeight += finalWeight;
  };

  topNotes.forEach((note) => processNote(note, 1));
  middleNotes.forEach((note) => processNote(note, 1.5));
  baseNotes.forEach((note) => processNote(note, 2));

  if (totalWeight > 0) {
    RADAR_DIMENSIONS.forEach((dim) => {
      result[dim] = Math.min(100, result[dim] / totalWeight);
    });
  }

  return result;
}

export function getTotalConcentration(
  topNotes: (PlacedScent | null)[],
  middleNotes: (PlacedScent | null)[],
  baseNotes: (PlacedScent | null)[],
): number {
  const sum = (arr: (PlacedScent | null)[]) =>
    arr.reduce((acc, note) => acc + (note?.concentration || 0), 0);
  return sum(topNotes) + sum(middleNotes) + sum(baseNotes);
}

export function getAllPlacedScents(
  topNotes: (PlacedScent | null)[],
  middleNotes: (PlacedScent | null)[],
  baseNotes: (PlacedScent | null)[],
): PlacedScent[] {
  return [...topNotes, ...middleNotes, ...baseNotes].filter(
    (n): n is PlacedScent => n !== null,
  );
}

export function saveFormula(
  name: string,
  themeColor: string,
  topNotes: (PlacedScent | null)[],
  middleNotes: (PlacedScent | null)[],
  baseNotes: (PlacedScent | null)[],
): Formula {
  const formula: Formula = {
    id: uuidv4(),
    name,
    themeColor,
    createdAt: Date.now(),
    topNotes: [...topNotes],
    middleNotes: [...middleNotes],
    baseNotes: [...baseNotes],
  };

  const formulas = loadFormulas();
  formulas.unshift(formula);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formulas));

  return formula;
}

export function loadFormulas(): Formula[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteFormula(id: string): void {
  const formulas = loadFormulas();
  const filtered = formulas.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function loadPreset(preset: Preset): {
  topNotes: (PlacedScent | null)[];
  middleNotes: (PlacedScent | null)[];
  baseNotes: (PlacedScent | null)[];
  themeColor: string;
} {
  const findScent = (type: NoteType, id: string): Scent | undefined => {
    const list = type === 'top' ? TOP_NOTES : type === 'middle' ? MIDDLE_NOTES : BASE_NOTES;
    return list.find((s) => s.id === id);
  };

  const mapToPlaced = (
    items: { scentId: string; concentration: number; slotIndex: number }[],
    type: NoteType,
  ): (PlacedScent | null)[] => {
    const slots = createEmptySlots();
    items.forEach((item) => {
      const scent = findScent(type, item.scentId);
      if (scent) {
        slots[item.slotIndex] = {
          ...scent,
          concentration: item.concentration,
          slotIndex: item.slotIndex,
        };
      }
    });
    return slots;
  };

  return {
    topNotes: mapToPlaced(preset.topNotes, 'top'),
    middleNotes: mapToPlaced(preset.middleNotes, 'middle'),
    baseNotes: mapToPlaced(preset.baseNotes, 'base'),
    themeColor: preset.themeColor,
  };
}

export function getFormulaRadarData(formula: Formula): RadarData {
  return calculateRadarData(formula.topNotes, formula.middleNotes, formula.baseNotes);
}
