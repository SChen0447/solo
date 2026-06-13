export const PALETTE: string[] = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#a29bfe',
  '#f368e0',
  '#7bed9f'
];

export const SYMBOL_TYPES = ['triangle', 'diamond', 'star', 'circle', 'pentagon'] as const;
export type SymbolType = typeof SYMBOL_TYPES[number];

export type ShapeType = 'line' | 'L' | 'T' | 'diagonal' | 'corner';

export interface RuneCombination {
  id: string;
  shape: ShapeType;
  positions: [number, number][];
  completed: boolean;
  spell: string;
}

export interface LevelData {
  id: number;
  name: string;
  combinations: RuneCombination[];
}

const generateLineH = (row: number, startCol: number): [number, number][] => [
  [row, startCol], [row, startCol + 1], [row, startCol + 2]
];

const generateLineV = (col: number, startRow: number): [number, number][] => [
  [startRow, col], [startRow + 1, col], [startRow + 2, col]
];

const generateL = (cornerRow: number, cornerCol: number, dir: 'BR' | 'BL' | 'TR' | 'TL'): [number, number][] => {
  switch (dir) {
    case 'BR': return [[cornerRow, cornerCol], [cornerRow + 1, cornerCol], [cornerRow + 1, cornerCol + 1]];
    case 'BL': return [[cornerRow, cornerCol], [cornerRow + 1, cornerCol], [cornerRow + 1, cornerCol - 1]];
    case 'TR': return [[cornerRow, cornerCol], [cornerRow - 1, cornerCol], [cornerRow - 1, cornerCol + 1]];
    case 'TL': return [[cornerRow, cornerCol], [cornerRow - 1, cornerCol], [cornerRow - 1, cornerCol - 1]];
  }
};

const generateT = (centerRow: number, centerCol: number): [number, number][] => [
  [centerRow, centerCol - 1], [centerRow, centerCol], [centerRow, centerCol + 1], [centerRow + 1, centerCol]
].slice(0, 3) as [number, number][];

const generateDiag = (startRow: number, startCol: number, down: boolean): [number, number][] => {
  if (down) return [[startRow, startCol], [startRow + 1, startCol + 1], [startRow + 2, startCol + 2]];
  return [[startRow, startCol], [startRow + 1, startCol - 1], [startRow + 2, startCol - 2]];
};

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: '星辉初启',
    combinations: [
      { id: 'l1-1', shape: 'line', positions: generateLineH(2, 1), completed: false, spell: '✦ 星 · 辉 · 启 ✦' },
      { id: 'l1-2', shape: 'line', positions: generateLineV(2, 1), completed: false, spell: '✧ 光 · 华 · 现 ✧' },
      { id: 'l1-3', shape: 'diagonal', positions: generateDiag(0, 0, true), completed: false, spell: '✦ 灵 · 光 · 闪 ✦' },
      { id: 'l1-4', shape: 'L', positions: generateL(1, 1, 'BR'), completed: false, spell: '✧ 神 · 韵 · 生 ✧' },
      { id: 'l1-5', shape: 'line', positions: generateLineH(4, 1), completed: false, spell: '✦ 合 · 一 · 成 ✦' }
    ]
  },
  {
    id: 2,
    name: '符咒流彩',
    combinations: [
      { id: 'l2-1', shape: 'L', positions: generateL(2, 2, 'BL'), completed: false, spell: '✦ 风 · 起 · 涌 ✦' },
      { id: 'l2-2', shape: 'diagonal', positions: generateDiag(0, 4, false), completed: false, spell: '✧ 炎 · 焰 · 升 ✧' },
      { id: 'l2-3', shape: 'T', positions: generateT(2, 2), completed: false, spell: '✦ 雷 · 霆 · 震 ✦' },
      { id: 'l2-4', shape: 'line', positions: generateLineV(0, 2), completed: false, spell: '✧ 水 · 润 · 下 ✧' },
      { id: 'l2-5', shape: 'L', positions: generateL(2, 2, 'TR'), completed: false, spell: '✦ 山 · 稳 · 立 ✦' },
      { id: 'l2-6', shape: 'line', positions: generateLineH(0, 1), completed: false, spell: '✧ 泽 · 被 · 远 ✧' }
    ]
  },
  {
    id: 3,
    name: '光影迷宫',
    combinations: [
      { id: 'l3-1', shape: 'corner', positions: generateL(1, 3, 'BL'), completed: false, spell: '✦ 玄 · 机 · 藏 ✦' },
      { id: 'l3-2', shape: 'diagonal', positions: generateDiag(2, 1, true), completed: false, spell: '✧ 暗 · 流 · 动 ✧' },
      { id: 'l3-3', shape: 'T', positions: generateT(1, 2), completed: false, spell: '✦ 幻 · 境 · 开 ✦' },
      { id: 'l3-4', shape: 'line', positions: generateLineV(4, 0), completed: false, spell: '✧ 真 · 我 · 现 ✧' },
      { id: 'l3-5', shape: 'L', positions: generateL(3, 1, 'TL'), completed: false, spell: '✦ 破 · 迷 · 雾 ✦' },
      { id: 'l3-6', shape: 'diagonal', positions: generateDiag(0, 2, true), completed: false, spell: '✧ 见 · 明 · 月 ✧' },
      { id: 'l3-7', shape: 'line', positions: generateLineH(2, 0), completed: false, spell: '✦ 登 · 顶 · 峰 ✦' }
    ]
  },
  {
    id: 4,
    name: '星辰大道',
    combinations: [
      { id: 'l4-1', shape: 'line', positions: generateLineH(0, 0), completed: false, spell: '✦ 天 · 门 · 开 ✦' },
      { id: 'l4-2', shape: 'L', positions: generateL(0, 2, 'BR'), completed: false, spell: '✧ 龙 · 飞 · 翔 ✧' },
      { id: 'l4-3', shape: 'diagonal', positions: generateDiag(1, 3, false), completed: false, spell: '✦ 凤 · 鸣 · 霄 ✦' },
      { id: 'l4-4', shape: 'T', positions: generateT(3, 2), completed: false, spell: '✧ 神 · 兽 · 聚 ✧' },
      { id: 'l4-5', shape: 'line', positions: generateLineV(2, 2), completed: false, spell: '✦ 圣 · 道 · 显 ✦' },
      { id: 'l4-6', shape: 'L', positions: generateL(4, 2, 'TL'), completed: false, spell: '✧ 大 · 道 · 成 ✧' }
    ]
  }
];

export const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
