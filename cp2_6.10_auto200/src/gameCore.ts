import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

export interface Dice {
  id: string;
  sides: number;
}

export interface EventRange {
  min: number;
  max: number;
  name: string;
  icon: string;
  color: string;
}

export interface EventConfig {
  [sides: number]: EventRange[];
}

export interface RollResult {
  dice: Dice[];
  values: { id: string; sides: number; value: number }[];
  average: number;
  event: EventRange;
  duration: number;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  diceCombo: string;
  average: number;
  eventName: string;
  eventIcon: string;
  duration: number;
  timestamp: number;
}

export interface ProbabilityData {
  value: number;
  count: number;
  percentage: number;
}

const STORAGE_KEY_EVENT_CONFIG = 'dungeon_dice_event_config';
const STORAGE_KEY_HISTORY = 'dungeon_dice_history';

const DEFAULT_EVENT_CONFIG: EventConfig = {
  6: [
    { min: 1, max: 2, name: '发现陷阱', icon: '🔴', color: '#ff5252' },
    { min: 3, max: 4, name: '遭遇怪物', icon: '👹', color: '#7843e9' },
    { min: 5, max: 6, name: '捡到宝箱', icon: '💰', color: '#f6d365' }
  ],
  8: [
    { min: 1, max: 2, name: '发现陷阱', icon: '🔴', color: '#ff5252' },
    { min: 3, max: 4, name: '遭遇怪物', icon: '👹', color: '#7843e9' },
    { min: 5, max: 6, name: '捡到宝箱', icon: '💰', color: '#f6d365' },
    { min: 7, max: 8, name: '发现暗道', icon: '🚪', color: '#40916c' }
  ],
  10: [
    { min: 1, max: 3, name: '发现陷阱', icon: '🔴', color: '#ff5252' },
    { min: 4, max: 6, name: '遭遇怪物', icon: '👹', color: '#7843e9' },
    { min: 7, max: 8, name: '捡到宝箱', icon: '💰', color: '#f6d365' },
    { min: 9, max: 10, name: '发现暗道', icon: '🚪', color: '#40916c' }
  ],
  20: [
    { min: 1, max: 5, name: '触发机关', icon: '⚙️', color: '#ff5252' },
    { min: 6, max: 15, name: '无事发生', icon: '🌫️', color: '#6b7280' },
    { min: 16, max: 20, name: '发现暗道', icon: '🚪', color: '#40916c' }
  ]
};

export class GameCore {
  private dicePool: Dice[] = [];
  private eventConfig: EventConfig;
  private history: HistoryEntry[] = [];
  private rollHistory: number[] = [];
  private maxDicePerType: number = 5;
  private maxHistory: number = 20;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.eventConfig = this.loadEventConfig();
    this.history = this.loadHistory();
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public getDicePool(): Dice[] {
    return [...this.dicePool];
  }

  public addDice(sides: number): boolean {
    const count = this.dicePool.filter((d) => d.sides === sides).length;
    if (count >= this.maxDicePerType) return false;

    this.dicePool.push({ id: uuidv4(), sides });
    this.notify();
    return true;
  }

  public removeDice(id: string): void {
    this.dicePool = this.dicePool.filter((d) => d.id !== id);
    this.notify();
  }

  public clearDicePool(): void {
    this.dicePool = [];
    this.rollHistory = [];
    this.notify();
  }

  public getDiceCount(sides: number): number {
    return this.dicePool.filter((d) => d.sides === sides).length;
  }

  public getMaxDicePerType(): number {
    return this.maxDicePerType;
  }

  public getEventConfig(): EventConfig {
    return _.cloneDeep(this.eventConfig);
  }

  public setEventRange(sides: number, index: number, range: EventRange): void {
    if (!this.eventConfig[sides] || !this.eventConfig[sides][index]) return;
    this.eventConfig[sides][index] = { ...range };
    this.saveEventConfig();
    this.notify();
  }

  public addEventRange(sides: number, range: EventRange): void {
    if (!this.eventConfig[sides]) {
      this.eventConfig[sides] = [];
    }
    this.eventConfig[sides].push({ ...range });
    this.saveEventConfig();
    this.notify();
  }

  public removeEventRange(sides: number, index: number): void {
    if (!this.eventConfig[sides]) return;
    this.eventConfig[sides].splice(index, 1);
    this.saveEventConfig();
    this.notify();
  }

  public resetEventConfig(): void {
    this.eventConfig = _.cloneDeep(DEFAULT_EVENT_CONFIG);
    this.saveEventConfig();
    this.notify();
  }

  public determineEvent(average: number, sidesList: number[]): EventRange {
    const allRanges: EventRange[] = [];
    sidesList.forEach((sides) => {
      if (this.eventConfig[sides]) {
        allRanges.push(...this.eventConfig[sides]);
      }
    });

    if (allRanges.length === 0) {
      return { min: 1, max: 1, name: '未知事件', icon: '❓', color: '#666666' };
    }

    const globalMin = Math.min(...allRanges.map((r) => r.min));
    const globalMax = Math.max(...allRanges.map((r) => r.max));
    const normalizedAvg = this.normalizeValue(average, globalMin, globalMax);

    let closestRange = allRanges[0];
    let closestDist = Infinity;

    for (const range of allRanges) {
      const rangeMid = (range.min + range.max) / 2;
      const dist = Math.abs(normalizedAvg - rangeMid);
      if (dist < closestDist) {
        closestDist = dist;
        closestRange = range;
      }
    }

    return { ...closestRange };
  }

  private normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return (min + max) / 2;
    return min + ((value - 1) / 19) * (max - min);
  }

  public getProbabilities(): ProbabilityData[] {
    if (this.rollHistory.length === 0) {
      return this.getTheoreticalProbabilities();
    }

    const counts: Record<number, number> = {};
    this.rollHistory.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });

    const total = this.rollHistory.length;
    return Object.entries(counts)
      .map(([value, count]) => ({
        value: parseInt(value),
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => a.value - b.value);
  }

  private getTheoreticalProbabilities(): ProbabilityData[] {
    if (this.dicePool.length === 0) return [];

    const allPossible: number[] = [];
    const diceList = this.dicePool;

    this.generateCombinations(diceList, 0, [], allPossible);

    const counts: Record<number, number> = {};
    allPossible.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });

    const total = allPossible.length;
    return Object.entries(counts)
      .map(([value, count]) => ({
        value: parseInt(value),
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => a.value - b.value);
  }

  private generateCombinations(
    dice: Dice[],
    index: number,
    current: number[],
    results: number[]
  ): void {
    if (index >= dice.length) {
      const avg = current.reduce((a, b) => a + b, 0) / current.length;
      results.push(Math.round(avg * 10) / 10);
      return;
    }

    for (let i = 1; i <= dice[index].sides; i++) {
      this.generateCombinations(dice, index + 1, [...current, i], results);
    }
  }

  public recordRoll(
    values: { id: string; sides: number; value: number }[],
    duration: number
  ): RollResult {
    const dice = [...this.dicePool];
    const average = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    const sidesList = [...new Set(values.map((v) => v.sides))];
    const event = this.determineEvent(average, sidesList);

    values.forEach((v) => this.rollHistory.push(v.value));

    const result: RollResult = {
      dice,
      values,
      average: Math.round(average * 10) / 10,
      event,
      duration: Math.round(duration * 10) / 10,
      timestamp: Date.now()
    };

    this.addHistory(result);
    this.notify();
    return result;
  }

  private addHistory(result: RollResult): void {
    const diceCombo = this.formatDiceCombo(result.dice);
    const entry: HistoryEntry = {
      id: uuidv4(),
      diceCombo,
      average: result.average,
      eventName: result.event.name,
      eventIcon: result.event.icon,
      duration: result.duration,
      timestamp: result.timestamp
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
    this.saveHistory();
  }

  private formatDiceCombo(dice: Dice[]): string {
    const counts: Record<number, number> = {};
    dice.forEach((d) => {
      counts[d.sides] = (counts[d.sides] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([sides, count]) => `d${sides}x${count}`)
      .join('+');
  }

  public getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.rollHistory = [];
    this.saveHistory();
    this.notify();
  }

  private loadEventConfig(): EventConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENT_CONFIG);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // 忽略解析错误
    }
    return _.cloneDeep(DEFAULT_EVENT_CONFIG);
  }

  private saveEventConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY_EVENT_CONFIG, JSON.stringify(this.eventConfig));
    } catch {
      // 忽略存储错误
    }
  }

  private loadHistory(): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // 忽略解析错误
    }
    return [];
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history));
    } catch {
      // 忽略存储错误
    }
  }
}
