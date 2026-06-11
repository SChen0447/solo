export type ElementType = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface Herb {
  id: string;
  name: string;
  elements: { metal: number; wood: number; water: number; fire: number; earth: number };
  grade: number;
  color: string;
}

export interface Elixir {
  name: string;
  effect: string;
  element: ElementType;
  power: number;
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  metal: '#ffd700',
  wood: '#228b22',
  water: '#4682b4',
  fire: '#ff4500',
  earth: '#8b4513'
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土'
};

export const ELEMENTS: ElementType[] = ['metal', 'wood', 'water', 'fire', 'earth'];

export const GENERATING_CYCLE: Record<ElementType, ElementType> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood'
};

export const OVERCOMING_CYCLE: Record<ElementType, ElementType> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood'
};

export const HERBS: Herb[] = [
  {
    id: 'zhusha',
    name: '朱砂',
    elements: { metal: 5, wood: 0, water: 1, fire: 6, earth: 2 },
    grade: 2,
    color: '#c41e3a'
  },
  {
    id: 'xionghuang',
    name: '雄黄',
    elements: { metal: 2, wood: 1, water: 0, fire: 7, earth: 3 },
    grade: 2,
    color: '#ff6b35'
  },
  {
    id: 'cishi',
    name: '磁石',
    elements: { metal: 8, wood: 0, water: 3, fire: 0, earth: 2 },
    grade: 2,
    color: '#4a4a4a'
  },
  {
    id: 'yunmu',
    name: '云母',
    elements: { metal: 3, wood: 2, water: 2, fire: 1, earth: 5 },
    grade: 1,
    color: '#e6e6fa'
  },
  {
    id: 'kongqing',
    name: '空青',
    elements: { metal: 1, wood: 4, water: 6, fire: 0, earth: 1 },
    grade: 3,
    color: '#20b2aa'
  },
  {
    id: 'renshen',
    name: '人参',
    elements: { metal: 1, wood: 7, water: 2, fire: 1, earth: 3 },
    grade: 3,
    color: '#deb887'
  },
  {
    id: 'lingzhi',
    name: '灵芝',
    elements: { metal: 0, wood: 8, water: 3, fire: 2, earth: 1 },
    grade: 3,
    color: '#8b0000'
  },
  {
    id: 'fuling',
    name: '茯苓',
    elements: { metal: 2, wood: 3, water: 5, fire: 0, earth: 4 },
    grade: 2,
    color: '#f5f5dc'
  },
  {
    id: 'danshen',
    name: '丹参',
    elements: { metal: 1, wood: 3, water: 1, fire: 7, earth: 2 },
    grade: 2,
    color: '#b22222'
  },
  {
    id: 'huashi',
    name: '滑石',
    elements: { metal: 2, wood: 0, water: 6, fire: 0, earth: 5 },
    grade: 1,
    color: '#f0fff0'
  },
  {
    id: 'zihan',
    name: '紫河车',
    elements: { metal: 3, wood: 2, water: 4, fire: 3, earth: 3 },
    grade: 4,
    color: '#9370db'
  },
  {
    id: 'huangjing',
    name: '黄精',
    elements: { metal: 1, wood: 5, water: 3, fire: 1, earth: 5 },
    grade: 2,
    color: '#daa520'
  }
];

export const ELIXIR_EFFECTS: Record<string, { name: string; effect: string }> = {
  metal: [
    { name: '金精丹', effect: '淬炼筋骨，力大无穷' },
    { name: '太乙金丹', effect: '金刚不坏，百毒不侵' },
    { name: '太白金丹', effect: '飞升仙界，位列仙班' }
  ],
  wood: [
    { name: '青木丹', effect: '延年益寿，青春常驻' },
    { name: '太乙木丹', effect: '起死回生，肉白骨' },
    { name: '青帝长生丹', effect: '与天同寿，长生不老' }
  ],
  water: [
    { name: '玄水丹', effect: '清热解毒，明目清心' },
    { name: '太玄水丹', effect: '呼风唤雨，御水而行' },
    { name: '玄冥神丹', effect: '深渊之力，水遁无形' }
  ],
  fire: [
    { name: '炎火丹', effect: '阳气充盈，驱寒避邪' },
    { name: '太真火丹', effect: '三昧真火，焚尽万物' },
    { name: '朱雀神丹', effect: '浴火重生，不灭之体' }
  ],
  earth: [
    { name: '厚土丹', effect: '健脾养胃，气力绵长' },
    { name: '后土元丹', effect: '移山填海，大地之力' },
    { name: '黄天后土丹', effect: '大地之母，厚德载物' }
  ]
};

export const COLOR_SCHEME = {
  primary: '#2c1810',
  secondary: '#8b4513',
  accentGold: '#ffd700',
  accentGreen: '#32cd32',
  backgroundStart: '#2c1810',
  backgroundMid: '#1a2a1a',
  backgroundEnd: '#3a3a2a',
  smokeStart: '#d4c9a8',
  smokeEnd: '#a8a8a8'
};

export const FIRE_COLORS = {
  warm: ['#ff6347', '#ffa500', '#ffff00'],
  cool: ['#00bfff', '#7b68ee']
};
