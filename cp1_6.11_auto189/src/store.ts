import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export enum TeaType {
  Matcha = 'matcha',
  Sencha = 'sencha',
  Hojicha = 'hojicha',
  Oolong = 'oolong',
  PuEr = 'puer',
}

export interface TeaInfo {
  name: string;
  nameJa: string;
  aroma: string;
  gradientFrom: string;
  gradientTo: string;
  cardColor: string;
  texture: string;
}

export const TEA_INFO: Record<TeaType, TeaInfo> = {
  [TeaType.Matcha]: {
    name: '抹茶',
    nameJa: '抹茶',
    aroma: '清新草香，海苔般的鲜味在鼻尖轻舞',
    gradientFrom: '#7ec850',
    gradientTo: '#a8d882',
    cardColor: '#6aad3d',
    texture: 'radial-gradient(circle at 30% 30%, #8dd460, #5a9e2f)',
  },
  [TeaType.Sencha]: {
    name: '煎茶',
    nameJa: '煎茶',
    aroma: '甘甜的蒸汽中透着嫩叶的清新芬芳',
    gradientFrom: '#8db87c',
    gradientTo: '#b5d4a8',
    cardColor: '#7aad68',
    texture: 'radial-gradient(circle at 30% 30%, #9cc88b, #689950)',
  },
  [TeaType.Hojicha]: {
    name: '焙茶',
    nameJa: '焙茶',
    aroma: '温暖焙火香，如秋日午后阳光般的抚慰',
    gradientFrom: '#6b4a2a',
    gradientTo: '#8b6b4a',
    cardColor: '#5c3d1e',
    texture: 'radial-gradient(circle at 30% 30%, #7a5939, #4d2e15)',
  },
  [TeaType.Oolong]: {
    name: '乌龙',
    nameJa: '烏龍',
    aroma: '花果馥郁，山韵悠远，如入幽兰之谷',
    gradientFrom: '#c49a3c',
    gradientTo: '#d4b464',
    cardColor: '#b08828',
    texture: 'radial-gradient(circle at 30% 30%, #d4aa4c, #9a7520)',
  },
  [TeaType.PuEr]: {
    name: '普洱',
    nameJa: '普洱',
    aroma: '沉稳木香，大地与岁月的深厚底蕴',
    gradientFrom: '#3d2814',
    gradientTo: '#5a3d22',
    cardColor: '#2e1d0c',
    texture: 'radial-gradient(circle at 30% 30%, #4d3820, #1e120a)',
  },
};

export interface BrewRecord {
  id: string;
  teaType: TeaType;
  waterTemp: number;
  brewTime: number;
  teaColorHex: string;
  teaColorRgb: string;
  date: string;
  note: string;
}

interface TeaStore {
  selectedTea: TeaType | null;
  waterTemp: number;
  isBrewing: boolean;
  showBrewCard: boolean;
  activeRecordId: string | null;
  records: BrewRecord[];
  steamIntensity: number;
  brewStartTime: number;

  selectTea: (tea: TeaType) => void;
  setWaterTemp: (temp: number) => void;
  startBrew: () => void;
  setShowBrewCard: (show: boolean) => void;
  addRecord: (record: Omit<BrewRecord, 'id' | 'date'>) => void;
  setActiveRecordId: (id: string | null) => void;
  setSteamIntensity: (intensity: number) => void;
  deleteOldestRecord: () => void;
  getRecordById: (id: string) => BrewRecord | undefined;
}

const MAX_RECORDS = 50;

export const useTeaStore = create<TeaStore>((set, get) => ({
  selectedTea: null,
  waterTemp: 80,
  isBrewing: false,
  showBrewCard: false,
  activeRecordId: null,
  records: [],
  steamIntensity: 1,
  brewStartTime: Date.now(),

  selectTea: (tea) => set({ selectedTea: tea }),

  setWaterTemp: (temp) => set({ waterTemp: temp }),

  startBrew: () => set({ isBrewing: true, brewStartTime: Date.now() }),

  setShowBrewCard: (show) => set({ showBrewCard: show }),

  addRecord: (record) => {
    const newRecord: BrewRecord = {
      ...record,
      id: uuidv4(),
      date: new Date().toISOString(),
    };
    set((state) => {
      const updated = [newRecord, ...state.records];
      if (updated.length > MAX_RECORDS) {
        updated.pop();
      }
      return { records: updated, activeRecordId: newRecord.id };
    });
  },

  setActiveRecordId: (id) => set({ activeRecordId: id }),

  setSteamIntensity: (intensity) => set({ steamIntensity: intensity }),

  deleteOldestRecord: () =>
    set((state) => ({
      records: state.records.slice(0, -1),
    })),

  getRecordById: (id) => get().records.find((r) => r.id === id),
}));

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export function getTeaColor(teaType: TeaType, waterTemp: number): { hex: string; rgb: string } {
  const info = TEA_INFO[teaType];
  const factor = waterTemp / 100;
  const from = info.gradientFrom;
  const hex = factor > 0.5 ? info.gradientTo : from;
  const rgb = hexToRgb(hex);
  return { hex, rgb };
}

export function blendTeaColor(teaType: TeaType, waterTemp: number): string {
  const info = TEA_INFO[teaType];
  const factor = Math.min(waterTemp / 100, 1);
  const fromR = parseInt(info.gradientFrom.slice(1, 3), 16);
  const fromG = parseInt(info.gradientFrom.slice(3, 5), 16);
  const fromB = parseInt(info.gradientFrom.slice(5, 7), 16);
  const toR = parseInt(info.gradientTo.slice(1, 3), 16);
  const toG = parseInt(info.gradientTo.slice(3, 5), 16);
  const toB = parseInt(info.gradientTo.slice(5, 7), 16);
  const r = Math.round(fromR + (toR - fromR) * factor);
  const g = Math.round(fromG + (toG - fromG) * factor);
  const b = Math.round(fromB + (toB - fromB) * factor);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
