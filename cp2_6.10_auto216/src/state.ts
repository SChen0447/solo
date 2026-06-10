export type RuneType = 'fire' | 'ice' | 'thunder' | 'heal' | 'shadow';

export type EffectType = 'EXPLOSION' | 'FREEZE' | 'THUNDERSTORM' | 'HELLFIRE' | 'TEMPEST';

export interface Rune {
  type: RuneType;
  color: string;
  name: string;
}

export interface HexNode {
  id: string;
  q: number;
  r: number;
  x: number;
  y: number;
  rune: RuneType | null;
  isHighlighted: boolean;
  pulseProgress: number;
  fadeProgress: number;
  fadeOut: boolean;
}

export interface Spell {
  id: string;
  name: string;
  pattern: RuneType[];
  description: string;
  duration: number;
  effectType: EffectType;
}

export interface SpellRecord {
  id: string;
  spellId: string;
  spellName: string;
  runes: RuneType[];
  timestamp: number;
}

export const RUNES: Record<RuneType, Rune> = {
  fire: { type: 'fire', color: '#e74c3c', name: '火焰' },
  ice: { type: 'ice', color: '#3498db', name: '冰霜' },
  thunder: { type: 'thunder', color: '#f1c40f', name: '雷电' },
  heal: { type: 'heal', color: '#2ecc71', name: '治愈' },
  shadow: { type: 'shadow', color: '#9b59b6', name: '暗影' }
};

export const SPELLS: Spell[] = [
  {
    id: 'explosion',
    name: '爆裂',
    pattern: ['fire', 'fire', 'fire'],
    description: '全屏红色爆炸粒子效果',
    duration: 2000,
    effectType: 'EXPLOSION'
  },
  {
    id: 'freeze',
    name: '冻结',
    pattern: ['ice', 'ice', 'ice'],
    description: '六边形网格覆盖冰晶扩散动画',
    duration: 2000,
    effectType: 'FREEZE'
  },
  {
    id: 'thunderstorm',
    name: '闪电风暴',
    pattern: ['fire', 'thunder'],
    description: '从背景射下多个黄色闪电',
    duration: 1500,
    effectType: 'THUNDERSTORM'
  },
  {
    id: 'hellfire',
    name: '地狱火',
    pattern: ['shadow', 'shadow', 'fire'],
    description: '从地面升起暗红色火焰柱',
    duration: 2000,
    effectType: 'HELLFIRE'
  },
  {
    id: 'tempest',
    name: '风暴',
    pattern: ['thunder', 'ice', 'fire'],
    description: '旋转的雷电水龙卷',
    duration: 2500,
    effectType: 'TEMPEST'
  }
];

const STORAGE_KEY = 'magic_circle_history';
const MAX_HISTORY_LIMIT = 20;

export interface AppState {
  selectedRune: RuneType | null;
  hexNodes: HexNode[];
  currentSequence: { nodeId: string; rune: RuneType }[];
  spellRecords: SpellRecord[];
  activeSpell: Spell | null;
}

export class StateManager {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = {
      selectedRune: null,
      hexNodes: [],
      currentSequence: [],
      spellRecords: this.loadHistory(),
      activeSpell: null
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getState(): AppState {
    return this.state;
  }

  setSelectedRune(rune: RuneType | null): void {
    this.state.selectedRune = rune;
    this.notify();
  }

  setHexNodes(nodes: HexNode[]): void {
    this.state.hexNodes = nodes;
    this.notify();
  }

  updateHexNode(nodeId: string, updates: Partial<HexNode>): void {
    const node = this.state.hexNodes.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, updates);
      this.notify();
    }
  }

  addToSequence(nodeId: string, rune: RuneType): void {
    this.state.currentSequence.push({ nodeId, rune });
    this.notify();
  }

  removeLastFromSequence(): { nodeId: string; rune: RuneType } | null {
    const last = this.state.currentSequence.pop();
    this.notify();
    return last || null;
  }

  clearSequence(): void {
    this.state.currentSequence = [];
    this.notify();
  }

  getCurrentRunes(): RuneType[] {
    return this.state.currentSequence.map(item => item.rune);
  }

  setActiveSpell(spell: Spell | null): void {
    this.state.activeSpell = spell;
    this.notify();
  }

  addSpellRecord(spell: Spell, runes: RuneType[]): void {
    const record: SpellRecord = {
      id: crypto.randomUUID(),
      spellId: spell.id,
      spellName: spell.name,
      runes: [...runes],
      timestamp: Date.now()
    };
    this.state.spellRecords.unshift(record);
    if (this.state.spellRecords.length > MAX_HISTORY_LIMIT) {
      this.state.spellRecords.pop();
    }
    this.saveHistory();
    this.notify();
  }

  private loadHistory(): SpellRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.spellRecords));
    } catch {
    }
  }

  checkSpellCombination(): Spell | null {
    const currentRunes = this.getCurrentRunes();
    for (const spell of SPELLS) {
      if (this.matchPattern(currentRunes, spell.pattern)) {
        return spell;
      }
    }
    return null;
  }

  private matchPattern(current: RuneType[], pattern: RuneType[]): boolean {
    if (current.length < pattern.length) return false;
    const recent = current.slice(-pattern.length);
    return recent.every((rune, idx) => rune === pattern[idx];
  }

  clearAllRunes(): void {
    this.state.hexNodes.forEach(node => {
      node.rune = null;
      node.fadeOut = true;
    });
    this.clearSequence();
  }
}
