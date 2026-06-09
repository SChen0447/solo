import { SpellResult, RuneElement, parseSpell, RUNE_SLOTS } from './runeManager';

export type TurnPhase = 'player' | 'ai' | 'playerAction' | 'aiAction' | 'gameover';

export interface CombatantState {
  hp: number;
  maxHp: number;
  defenseTurns: number;
  defenseRatio: number;
}

export interface BattleState {
  round: number;
  phase: TurnPhase;
  player: CombatantState;
  ai: CombatantState;
  winner: 'player' | 'ai' | null;
  lastAction: BattleAction | null;
  log: string[];
}

export interface BattleAction {
  caster: 'player' | 'ai';
  spell: SpellResult;
  damage: number;
  heal: number;
  defense: number;
}

export interface SavedProgress {
  wins: number;
  bestStreak: number;
  currentStreak: number;
}

const STORAGE_KEY = 'pixel-magic-runes-progress';

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {
    // ignore
  }
  return { wins: 0, bestStreak: 0, currentStreak: 0 };
}

export function saveProgress(p: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch (_) {
    // ignore
  }
}

export class BattleSystem {
  state: BattleState;
  progress: SavedProgress;
  private listeners: Set<() => void>;
  private actionListeners: Set<(action: BattleAction) => void>;
  private gameOverListeners: Set<(winner: 'player' | 'ai') => void>;

  constructor() {
    this.state = this.createInitialState();
    this.progress = loadProgress();
    this.listeners = new Set();
    this.actionListeners = new Set();
    this.gameOverListeners = new Set();
  }

  createInitialState(): BattleState {
    return {
      round: 1,
      phase: 'player',
      player: { hp: 10, maxHp: 10, defenseTurns: 0, defenseRatio: 0 },
      ai: { hp: 10, maxHp: 10, defenseTurns: 0, defenseRatio: 0 },
      winner: null,
      lastAction: null,
      log: []
    };
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onAction(fn: (a: BattleAction) => void) {
    this.actionListeners.add(fn);
    return () => this.actionListeners.delete(fn);
  }

  onGameOver(fn: (winner: 'player' | 'ai') => void) {
    this.gameOverListeners.add(fn);
    return () => this.gameOverListeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach(fn => fn());
  }

  reset() {
    this.state = this.createInitialState();
    this.emit();
  }

  private computeDamage(spell: SpellResult, target: CombatantState): number {
    if (spell.category !== 'attack') return 0;
    const base = Math.min(3, Math.max(1, spell.strength));
    let damage = base;
    if (target.defenseTurns > 0 && target.defenseRatio > 0) {
      damage = Math.max(0, Math.floor(damage * (1 - target.defenseRatio)));
    }
    return damage;
  }

  private computeHeal(spell: SpellResult, _target: CombatantState): number {
    if (spell.category !== 'heal') return 0;
    return Math.min(2, Math.max(1, Math.ceil(spell.strength / 2)));
  }

  private computeDefenseTurns(spell: SpellResult): number {
    if (spell.category !== 'defense') return 0;
    return Math.min(3, Math.max(1, Math.ceil(spell.strength / 2)));
  }

  applyPlayerSpell(spell: SpellResult): BattleAction {
    const damage = this.computeDamage(spell, this.state.ai);
    const heal = this.computeHeal(spell, this.state.player);
    const defenseTurns = this.computeDefenseTurns(spell);

    this.state.ai.hp = Math.max(0, this.state.ai.hp - damage);
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
    if (defenseTurns > 0) {
      this.state.player.defenseTurns = defenseTurns;
      this.state.player.defenseRatio = 0.5;
    }

    const action: BattleAction = {
      caster: 'player',
      spell,
      damage,
      heal,
      defense: defenseTurns
    };

    this.state.lastAction = action;
    this.state.log.unshift(`玩家施放【${spell.name}】${damage > 0 ? '造成' + damage + '伤害' : ''}${heal > 0 ? '恢复' + heal + '生命' : ''}${defenseTurns > 0 ? '获得' + defenseTurns + '回合护盾' : ''}`);
    if (this.state.log.length > 20) this.state.log.length = 20;

    this.actionListeners.forEach(fn => fn(action));

    if (this.state.ai.hp <= 0) {
      this.state.winner = 'player';
      this.state.phase = 'gameover';
      this.progress.wins++;
      this.progress.currentStreak++;
      if (this.progress.currentStreak > this.progress.bestStreak) {
        this.progress.bestStreak = this.progress.currentStreak;
      }
      saveProgress(this.progress);
      this.gameOverListeners.forEach(fn => fn('player'));
    } else {
      this.state.phase = 'ai';
    }

    this.emit();
    return action;
  }

  generateAISpell(): SpellResult {
    const aiHp = this.state.ai.hp;
    const playerHp = this.state.player.hp;

    let pool: RuneElement[];
    const r = Math.random();

    if (aiHp <= 3 && r < 0.5) {
      pool = ['wind', 'water', 'wind', 'water', 'light', 'shield'];
    } else if (playerHp <= 3 && r < 0.6) {
      pool = ['fire', 'thunder', 'ice', 'fire', 'thunder', 'ice'];
    } else if (this.state.ai.defenseTurns === 0 && r < 0.3) {
      pool = ['shield', 'light', 'shield', 'light', 'fire', 'ice'];
    } else {
      pool = [...RUNE_SLOTS, 'water'];
    }

    const count = 1 + Math.floor(Math.random() * 3);
    const elements: RuneElement[] = [];
    const useSameElement = Math.random() < 0.4;
    if (useSameElement && count >= 2) {
      const e = pool[Math.floor(Math.random() * pool.length)];
      for (let i = 0; i < count; i++) elements.push(e);
    } else {
      for (let i = 0; i < count; i++) {
        elements.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    return parseSpell(elements);
  }

  applyAISpell(spell: SpellResult): BattleAction {
    const damage = this.computeDamage(spell, this.state.player);
    const heal = this.computeHeal(spell, this.state.ai);
    const defenseTurns = this.computeDefenseTurns(spell);

    this.state.player.hp = Math.max(0, this.state.player.hp - damage);
    this.state.ai.hp = Math.min(this.state.ai.maxHp, this.state.ai.hp + heal);
    if (defenseTurns > 0) {
      this.state.ai.defenseTurns = defenseTurns;
      this.state.ai.defenseRatio = 0.5;
    }

    const action: BattleAction = {
      caster: 'ai',
      spell,
      damage,
      heal,
      defense: defenseTurns
    };

    this.state.lastAction = action;
    this.state.log.unshift(`AI施放【${spell.name}】${damage > 0 ? '造成' + damage + '伤害' : ''}${heal > 0 ? '恢复' + heal + '生命' : ''}${defenseTurns > 0 ? '获得' + defenseTurns + '回合护盾' : ''}`);
    if (this.state.log.length > 20) this.state.log.length = 20;

    this.actionListeners.forEach(fn => fn(action));

    if (this.state.player.hp <= 0) {
      this.state.winner = 'ai';
      this.state.phase = 'gameover';
      this.progress.currentStreak = 0;
      saveProgress(this.progress);
      this.gameOverListeners.forEach(fn => fn('ai'));
    } else {
      this.state.round++;
      this.state.phase = 'player';
      if (this.state.player.defenseTurns > 0) {
        this.state.player.defenseTurns--;
        if (this.state.player.defenseTurns === 0) this.state.player.defenseRatio = 0;
      }
      if (this.state.ai.defenseTurns > 0) {
        this.state.ai.defenseTurns--;
        if (this.state.ai.defenseTurns === 0) this.state.ai.defenseRatio = 0;
      }
    }

    this.emit();
    return action;
  }

  isPlayerTurn(): boolean {
    return this.state.phase === 'player' && this.state.winner === null;
  }

  isGameOver(): boolean {
    return this.state.winner !== null;
  }
}
