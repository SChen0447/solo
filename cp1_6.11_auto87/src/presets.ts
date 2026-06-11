export type FoldType = 'mountain' | 'valley';

export interface CreaseLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: FoldType;
}

export interface PresetModel {
  name: string;
  creases: CreaseLine[];
  foldAngle: number;
}

const GRID_SIZE = 8;

export const presets: Record<string, PresetModel> = {
  crane: {
    name: '纸鹤',
    foldAngle: 120,
    creases: [
      { startX: 4, startY: 0, endX: 4, endY: 8, type: 'valley' },
      { startX: 0, startY: 4, endX: 8, endY: 4, type: 'valley' },
      { startX: 0, startY: 0, endX: 8, endY: 8, type: 'mountain' },
      { startX: 8, startY: 0, endX: 0, endY: 8, type: 'mountain' },
      { startX: 2, startY: 2, endX: 6, endY: 2, type: 'valley' },
      { startX: 2, startY: 6, endX: 6, endY: 6, type: 'valley' },
      { startX: 2, startY: 2, endX: 2, endY: 6, type: 'mountain' },
      { startX: 6, startY: 2, endX: 6, endY: 6, type: 'mountain' },
      { startX: 4, startY: 2, endX: 2, endY: 4, type: 'valley' },
      { startX: 4, startY: 2, endX: 6, endY: 4, type: 'valley' },
      { startX: 2, startY: 4, endX: 4, endY: 6, type: 'mountain' },
      { startX: 6, startY: 4, endX: 4, endY: 6, type: 'mountain' },
      { startX: 0, startY: 2, endX: 2, endY: 4, type: 'valley' },
      { startX: 8, startY: 2, endX: 6, endY: 4, type: 'valley' },
      { startX: 0, startY: 6, endX: 2, endY: 4, type: 'mountain' },
      { startX: 8, startY: 6, endX: 6, endY: 4, type: 'mountain' },
    ]
  },

  boat: {
    name: '纸船',
    foldAngle: 100,
    creases: [
      { startX: 4, startY: 0, endX: 4, endY: 8, type: 'valley' },
      { startX: 0, startY: 4, endX: 8, endY: 4, type: 'mountain' },
      { startX: 0, startY: 0, endX: 4, endY: 4, type: 'valley' },
      { startX: 8, startY: 0, endX: 4, endY: 4, type: 'valley' },
      { startX: 0, startY: 8, endX: 4, endY: 4, type: 'mountain' },
      { startX: 8, startY: 8, endX: 4, endY: 4, type: 'mountain' },
      { startX: 2, startY: 2, endX: 6, endY: 2, type: 'valley' },
      { startX: 2, startY: 6, endX: 6, endY: 6, type: 'valley' },
    ]
  },

  plane: {
    name: '纸飞机',
    foldAngle: 110,
    creases: [
      { startX: 4, startY: 0, endX: 4, endY: 8, type: 'mountain' },
      { startX: 0, startY: 0, endX: 4, endY: 3, type: 'valley' },
      { startX: 8, startY: 0, endX: 4, endY: 3, type: 'valley' },
      { startX: 0, startY: 2, endX: 4, endY: 5, type: 'mountain' },
      { startX: 8, startY: 2, endX: 4, endY: 5, type: 'mountain' },
      { startX: 1, startY: 4, endX: 4, endY: 6, type: 'valley' },
      { startX: 7, startY: 4, endX: 4, endY: 6, type: 'valley' },
    ]
  },

  pinwheel: {
    name: '纸风车',
    foldAngle: 80,
    creases: [
      { startX: 4, startY: 0, endX: 4, endY: 8, type: 'valley' },
      { startX: 0, startY: 4, endX: 8, endY: 4, type: 'valley' },
      { startX: 0, startY: 0, endX: 8, endY: 8, type: 'mountain' },
      { startX: 8, startY: 0, endX: 0, endY: 8, type: 'mountain' },
      { startX: 0, startY: 0, endX: 4, endY: 2, type: 'valley' },
      { startX: 8, startY: 0, endX: 4, endY: 2, type: 'valley' },
      { startX: 0, startY: 8, endX: 4, endY: 6, type: 'mountain' },
      { startX: 8, startY: 8, endX: 4, endY: 6, type: 'mountain' },
      { startX: 2, startY: 4, endX: 4, endY: 2, type: 'mountain' },
      { startX: 6, startY: 4, endX: 4, endY: 2, type: 'mountain' },
      { startX: 2, startY: 4, endX: 4, endY: 6, type: 'valley' },
      { startX: 6, startY: 4, endX: 4, endY: 6, type: 'valley' },
    ]
  },

  frog: {
    name: '纸青蛙',
    foldAngle: 95,
    creases: [
      { startX: 4, startY: 0, endX: 4, endY: 8, type: 'valley' },
      { startX: 0, startY: 2, endX: 8, endY: 2, type: 'mountain' },
      { startX: 0, startY: 6, endX: 8, endY: 6, type: 'mountain' },
      { startX: 0, startY: 0, endX: 4, endY: 2, type: 'valley' },
      { startX: 8, startY: 0, endX: 4, endY: 2, type: 'valley' },
      { startX: 0, startY: 2, endX: 2, endY: 4, type: 'mountain' },
      { startX: 8, startY: 2, endX: 6, endY: 4, type: 'mountain' },
      { startX: 2, startY: 4, endX: 6, endY: 4, type: 'valley' },
      { startX: 2, startY: 4, endX: 4, endY: 6, type: 'mountain' },
      { startX: 6, startY: 4, endX: 4, endY: 6, type: 'mountain' },
      { startX: 0, startY: 6, endX: 2, endY: 4, type: 'valley' },
      { startX: 8, startY: 6, endX: 6, endY: 4, type: 'valley' },
      { startX: 0, startY: 8, endX: 2, endY: 6, type: 'mountain' },
      { startX: 8, startY: 8, endX: 6, endY: 6, type: 'mountain' },
      { startX: 2, startY: 6, endX: 6, endY: 6, type: 'valley' },
    ]
  }
};

export function getPreset(name: string): PresetModel | null {
  return presets[name] || null;
}

export function getAllPresetNames(): string[] {
  return Object.keys(presets);
}

export function validateCrease(crease: CreaseLine): boolean {
  const inRange = (v: number) => v >= 0 && v <= GRID_SIZE;
  return (
    inRange(crease.startX) &&
    inRange(crease.startY) &&
    inRange(crease.endX) &&
    inRange(crease.endY) &&
    (crease.type === 'mountain' || crease.type === 'valley')
  );
}

export { GRID_SIZE };
