export type RuneElement = 'fire' | 'thunder' | 'ice' | 'shield' | 'light' | 'wind' | 'water';
export type SpellCategory = 'attack' | 'defense' | 'heal';

export interface Rune {
  id: string;
  element: RuneElement;
  name: string;
  color: string;
  category: SpellCategory;
}

export interface SpellResult {
  valid: boolean;
  name: string;
  category: SpellCategory;
  elements: RuneElement[];
  primaryElement: RuneElement;
  strength: number;
  color: string;
  description: string;
}

export const RUNES: Rune[] = [
  { id: 'fire',    element: 'fire',    name: '火',  color: '#FF4500', category: 'attack' },
  { id: 'thunder', element: 'thunder', name: '雷',  color: '#FFD700', category: 'attack' },
  { id: 'ice',     element: 'ice',     name: '冰',  color: '#00BFFF', category: 'attack' },
  { id: 'shield',  element: 'shield',  name: '盾',  color: '#888888', category: 'defense' },
  { id: 'light',   element: 'light',   name: '光',  color: '#FFFFFF', category: 'defense' },
  { id: 'wind',    element: 'wind',    name: '风',  color: '#2ECC71', category: 'heal' },
  { id: 'water',   element: 'water',   name: '水',  color: '#9B59B6', category: 'heal' }
];

export const RUNE_SLOTS: RuneElement[] = ['fire', 'thunder', 'ice', 'shield', 'light', 'wind'];

export function getRune(element: RuneElement): Rune {
  return RUNES.find(r => r.element === element)!;
}

function countElements(elements: RuneElement[]): Map<RuneElement, number> {
  const counts = new Map<RuneElement, number>();
  for (const e of elements) {
    counts.set(e, (counts.get(e) || 0) + 1);
  }
  return counts;
}

function getCategoryCount(elements: RuneElement[]): Record<SpellCategory, number> {
  const result: Record<SpellCategory, number> = { attack: 0, defense: 0, heal: 0 };
  for (const e of elements) {
    const rune = getRune(e);
    result[rune.category]++;
  }
  return result;
}

function getDominantCategory(elements: RuneElement[]): SpellCategory {
  const counts = getCategoryCount(elements);
  let max: SpellCategory = 'attack';
  let maxCount = 0;
  (['attack', 'defense', 'heal'] as SpellCategory[]).forEach(cat => {
    if (counts[cat] > maxCount) {
      maxCount = counts[cat];
      max = cat;
    }
  });
  return max;
}

function getPrimaryElement(elements: RuneElement[], category: SpellCategory): RuneElement {
  const counts = countElements(elements);
  const categoryElements = elements.filter(e => getRune(e).category === category);
  if (categoryElements.length === 0) {
    return elements[0];
  }
  let primary = categoryElements[0];
  let maxCount = 0;
  for (const e of categoryElements) {
    const c = counts.get(e) || 0;
    if (c > maxCount) {
      maxCount = c;
      primary = e;
    }
  }
  return primary;
}

const ATTACK_NAMES: Record<string, string> = {
  'fire': '火焰弹',
  'thunder': '雷击',
  'ice': '冰锥',
  'fire-fire': '烈焰爆发',
  'thunder-thunder': '连锁闪电',
  'ice-ice': '冰霜爆发',
  'fire-fire-fire': '烈焰风暴',
  'thunder-thunder-thunder': '雷神之怒',
  'ice-ice-ice': '绝对零度',
  'fire-thunder': '爆裂火花',
  'fire-ice': '蒸汽爆发',
  'thunder-ice': '雷霜冲击',
  'fire-thunder-ice': '元素风暴',
  'fire-fire-thunder': '大范围烈焰风暴',
  'fire-fire-ice': '灼热冰刃',
  'thunder-thunder-fire': '爆裂雷火',
  'thunder-thunder-ice': '极寒雷霆',
  'ice-ice-fire': '冰焰双生',
  'ice-ice-thunder': '雷鸣冰刺'
};

const DEFENSE_NAMES: Record<string, string> = {
  'shield': '护盾术',
  'light': '圣光护佑',
  'shield-shield': '钢铁壁垒',
  'light-light': '神圣屏障',
  'shield-light': '圣光护盾',
  'shield-shield-shield': '绝对防御',
  'light-light-light': '圣光结界',
  'shield-shield-light': '守护圣盾',
  'shield-light-light': '神圣壁垒',
  'shield-fire': '火焰护盾',
  'shield-ice': '冰霜护盾',
  'light-fire': '烈焰圣光',
  'light-thunder': '雷霆圣盾',
  'light-ice': '圣冰之壁',
  'shield-wind': '风之守护',
  'light-wind': '治愈圣光',
  'light-water': '净化之泉'
};

const HEAL_NAMES: Record<string, string> = {
  'wind': '微风治愈',
  'water': '泉水治疗',
  'wind-wind': '自然之息',
  'water-water': '生命之泉',
  'wind-water': '生命之风',
  'wind-wind-wind': '生命风暴',
  'water-water-water': '神圣圣水',
  'wind-wind-water': '净化之风',
  'wind-water-water': '治疗潮汐',
  'wind-light': '圣光治愈',
  'water-light': '生命光辉',
  'wind-ice': '寒冰复原',
  'water-ice': '冰疗术',
  'wind-water-light': '圣泉之风'
};

function lookupSpellName(elements: RuneElement[], category: SpellCategory): string {
  const key = elements.join('-');
  const dict = category === 'attack' ? ATTACK_NAMES : category === 'defense' ? DEFENSE_NAMES : HEAL_NAMES;
  if (dict[key]) return dict[key];
  const sortedKey = [...elements].sort().join('-');
  if (dict[sortedKey]) return dict[sortedKey];
  for (let i = elements.length; i > 0; i--) {
    const sub = elements.slice(0, i).join('-');
    if (dict[sub]) return dict[sub];
  }
  if (category === 'attack') return '攻击法术';
  if (category === 'defense') return '防御法术';
  return '治疗法术';
}

export function parseSpell(elements: RuneElement[]): SpellResult {
  if (elements.length === 0) {
    return {
      valid: false,
      name: '空',
      category: 'attack',
      elements: [],
      primaryElement: 'fire',
      strength: 0,
      color: '#888888',
      description: '请放置符文'
    };
  }

  const category = getDominantCategory(elements);
  const primary = getPrimaryElement(elements, category);
  const primaryRune = getRune(primary);
  const counts = countElements(elements);
  const categoryCounts = getCategoryCount(elements);
  const categoryMatchRatio = categoryCounts[category] / elements.length;

  let strength = elements.length;
  const sameElementMax = Math.max(...Array.from(counts.values()));
  strength += sameElementMax - 1;
  if (categoryMatchRatio < 0.5 && elements.length >= 2) {
    strength = Math.max(1, strength - 1);
  }
  if (categoryMatchRatio === 1 && elements.length >= 2) {
    strength += 1;
  }

  const valid = true;
  const name = lookupSpellName(elements, category);

  let description = '';
  if (category === 'attack') {
    description = `攻击伤害: ${Math.min(3, Math.max(1, strength))}`;
  } else if (category === 'defense') {
    description = `减伤50%，持续${Math.min(3, Math.max(1, Math.ceil(strength / 2)))}回合`;
  } else {
    description = `恢复生命: ${Math.min(3, Math.max(1, Math.ceil(strength / 2)))}`;
  }

  return {
    valid,
    name,
    category,
    elements: [...elements],
    primaryElement: primary,
    strength,
    color: primaryRune.color,
    description
  };
}

export interface DragState {
  isDragging: boolean;
  draggedElement: RuneElement | null;
  dragX: number;
  dragY: number;
  offsetX: number;
  offsetY: number;
  sourceSlotIndex: number | null;
}

export class RuneManager {
  slotRunes: (RuneElement | null)[];
  circleRunes: (RuneElement | null)[];
  maxCircleRunes: number;
  dragState: DragState;
  hoveredSlot: number | null;
  hoveredCircle: number | null;
  circleHighlight: boolean;
  flashType: 'success' | 'error' | null;
  flashTimer: number;
  private listeners: Set<() => void>;
  private spellListeners: Set<(spell: SpellResult) => void>;

  constructor() {
    this.slotRunes = [...RUNE_SLOTS];
    this.circleRunes = [null, null, null];
    this.maxCircleRunes = 3;
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      dragX: 0,
      dragY: 0,
      offsetX: 0,
      offsetY: 0,
      sourceSlotIndex: null
    };
    this.hoveredSlot = null;
    this.hoveredCircle = null;
    this.circleHighlight = false;
    this.flashType = null;
    this.flashTimer = 0;
    this.listeners = new Set();
    this.spellListeners = new Set();
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onSpell(fn: (spell: SpellResult) => void) {
    this.spellListeners.add(fn);
    return () => this.spellListeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach(fn => fn());
  }

  getCircleCount(): number {
    return this.circleRunes.filter(r => r !== null).length;
  }

  isCircleFull(): boolean {
    return this.getCircleCount() >= this.maxCircleRunes;
  }

  startDrag(element: RuneElement, slotIndex: number, x: number, y: number, offsetX: number, offsetY: number) {
    this.dragState = {
      isDragging: true,
      draggedElement: element,
      dragX: x,
      dragY: y,
      offsetX,
      offsetY,
      sourceSlotIndex: slotIndex
    };
    this.emit();
  }

  updateDragPosition(x: number, y: number) {
    if (!this.dragState.isDragging) return;
    this.dragState.dragX = x;
    this.dragState.dragY = y;
    this.emit();
  }

  setCircleHover(hovering: boolean) {
    this.circleHighlight = hovering;
    this.emit();
  }

  endDrag(targetCircle: boolean, circleIndex: number | null) {
    if (!this.dragState.isDragging) return;
    const element = this.dragState.draggedElement!;
    const sourceIsCircle = this.dragState.sourceSlotIndex === null;

    if (targetCircle) {
      if (!this.isCircleFull() || sourceIsCircle) {
        if (circleIndex !== null && circleIndex >= 0 && circleIndex < this.maxCircleRunes) {
          if (this.circleRunes[circleIndex] === null) {
            this.circleRunes[circleIndex] = element;
            this.triggerFlash('success');
          } else if (sourceIsCircle) {
            const oldIdx = this.circleRunes.indexOf(element);
            if (oldIdx !== -1 && oldIdx !== circleIndex) {
              const temp = this.circleRunes[circleIndex];
              this.circleRunes[circleIndex] = element;
              this.circleRunes[oldIdx] = temp;
            }
          } else {
            const emptyIdx = this.circleRunes.findIndex(r => r === null);
            if (emptyIdx !== -1) {
              this.circleRunes[emptyIdx] = element;
              this.triggerFlash('success');
            }
          }
        } else {
          const emptyIdx = this.circleRunes.findIndex(r => r === null);
          if (emptyIdx !== -1) {
            this.circleRunes[emptyIdx] = element;
            this.triggerFlash('success');
          }
        }
      } else {
        this.triggerFlash('error');
      }
    }

    this.dragState = {
      isDragging: false,
      draggedElement: null,
      dragX: 0,
      dragY: 0,
      offsetX: 0,
      offsetY: 0,
      sourceSlotIndex: null
    };
    this.circleHighlight = false;
    this.emit();
  }

  removeFromCircle(index: number) {
    if (index >= 0 && index < this.maxCircleRunes) {
      this.circleRunes[index] = null;
      this.emit();
    }
  }

  clearCircle() {
    this.circleRunes = [null, null, null];
    this.emit();
  }

  castSpell(): SpellResult {
    const elements = this.circleRunes.filter((r): r is RuneElement => r !== null);
    const spell = parseSpell(elements);
    if (spell.valid) {
      this.spellListeners.forEach(fn => fn(spell));
    }
    return spell;
  }

  triggerFlash(type: 'success' | 'error') {
    this.flashType = type;
    this.flashTimer = type === 'success' ? 300 : 500;
  }

  update(dt: number) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashType = null;
        this.emit();
      }
    }
  }
}
