import type { RuneType, SpellType } from './types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const MIN_SCALE = 600 / CANVAS_WIDTH;

export const BOOKSHELF_X = 100;
export const BOOKSHELF_Y = 120;
export const BOOKSHELF_WIDTH = 650;
export const BOOKSHELF_HEIGHT = 500;
export const BOOKSHELF_COLS = 3;
export const BOOKSHELF_ROWS = 2;

export const SPELL_BOOK_X = 850;
export const SPELL_BOOK_Y = 160;
export const SPELL_BOOK_WIDTH = 300;
export const SPELL_BOOK_HEIGHT = 400;
export const MAX_SPELL_SLOTS = 3;

export const RUNE_SIZE = 50;
export const FLY_DURATION = 300;

export const GATE_X = 80;
export const GATE_Y = 180;
export const GATE_WIDTH = 80;
export const GATE_HEIGHT = 400;
export const GATE_CENTER_X = GATE_X + GATE_WIDTH / 2;
export const GATE_CENTER_Y = GATE_Y + GATE_HEIGHT / 2;
export const GATE_RADIUS = 50;

export const HINT_BUTTON_X = 600;
export const HINT_BUTTON_Y = 660;
export const HINT_BUTTON_WIDTH = 160;
export const HINT_BUTTON_HEIGHT = 50;
export const HINT_COOLDOWN_MS = 30000;
export const HINT_SHOW_DURATION = 4000;

export const RESET_BUTTON_X = 1220;
export const RESET_BUTTON_Y = 40;
export const RESET_BUTTON_RADIUS = 25;

export const RUNE_COLORS: Record<RuneType, { base: string; glow: string; edge: string }> = {
  fire:  { base: '#c9302c', glow: '#ff6b35', edge: '#8b1a1a' },
  water: { base: '#2874a6', glow: '#5dade2', edge: '#1a4a6e' },
  wind:  { base: '#7dcea0', glow: '#abebc6', edge: '#458b6a' },
  earth: { base: '#8b6914', glow: '#c9a227', edge: '#5a4510' },
  light: { base: '#f7dc6f', glow: '#fdf6b0', edge: '#b7950b' },
  dark:  { base: '#6c3483', glow: '#a569bd', edge: '#4a235a' }
};

export const RUNE_NAMES: Record<RuneType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '土',
  light: '光',
  dark: '暗'
};

export const SPELL_COLORS: Record<SpellType, string> = {
  firestorm: '#ff6b35',
  mudslide: '#8b6914',
  shadowbind: '#a569bd',
  holylight: '#fdf6b0',
  unknown: '#888888'
};

export const SPELL_NAMES: Record<SpellType, string> = {
  firestorm: '烈焰风暴',
  mudslide: '泥石流',
  shadowbind: '暗影束缚',
  holylight: '圣光术',
  unknown: '未知咒语'
};

export const SPELL_COMBINATIONS: Record<string, SpellType> = {
  'fire+wind': 'firestorm',
  'wind+fire': 'firestorm',
  'water+earth': 'mudslide',
  'earth+water': 'mudslide',
  'dark+dark': 'shadowbind',
  'light+light': 'holylight',
  'dark+light': 'shadowbind',
  'light+dark': 'holylight',
  'fire+water+wind': 'firestorm',
  'fire+wind+earth': 'firestorm',
  'water+earth+dark': 'mudslide',
  'earth+water+light': 'mudslide',
  'dark+dark+dark': 'shadowbind',
  'light+light+light': 'holylight',
  'dark+light+dark': 'shadowbind',
  'light+dark+light': 'holylight'
};

export const REQUIRED_SPELLS: SpellType[] = ['firestorm', 'mudslide', 'holylight'];

export const HINT_TEXTS: string[] = [
  '火焰与风可照亮第一道机关……',
  '水土交融能解开第二道封印……',
  '最后需要纯粹的光辉驱散黑暗……',
  '将三个符文依次放入咒语书中……',
  '顺序决定咒语的最终形态……'
];

export const EDGE_FLAME_DURATION = 500;
export const CAST_BEAM_DURATION = 1000;
export const GATE_SHAKE_DURATION = 300;
export const GATE_ERROR_DURATION = 500;
export const OPEN_LIGHT_DURATION = 2000;
export const RIPPLE_DURATION = 500;
export const BREATH_CYCLE = 1500;
