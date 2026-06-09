import type { Player } from './player';
import type { Enemy } from './enemy';

export interface BattleLogEntry {
  round: number;
  playerDamage: number;
  enemyDamage: number;
  playerHp: number;
  enemyHp: number;
}

export type BattleResult = 'player_win' | 'enemy_win' | 'draw';

export interface BattleSummary {
  result: BattleResult;
  totalRounds: number;
  logs: BattleLogEntry[];
}

export interface BattleCallbacks {
  onRound: (log: BattleLogEntry) => void;
  onComplete: (summary: BattleSummary) => void;
}

const MAX_ROUNDS = 100;
const ROUND_INTERVAL_MS = 100;

export class BattleEngine {
  private player: Player;
  private enemy: Enemy;
  private callbacks: BattleCallbacks;
  private currentRound: number = 0;
  private logs: BattleLogEntry[] = [];
  private timerId: number | null = null;
  private isRunning: boolean = false;

  constructor(player: Player, enemy: Enemy, callbacks: BattleCallbacks) {
    this.player = player;
    this.enemy = enemy;
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentRound = 0;
    this.logs = [];
    this.player.resetHp();
    this.enemy.resetHp();
    this.scheduleNextRound();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextRound(): void {
    if (!this.isRunning) return;
    this.timerId = window.setTimeout(() => {
      this.executeRound();
    }, ROUND_INTERVAL_MS);
  }

  private executeRound(): void {
    if (!this.isRunning) return;

    this.currentRound++;

    const playerAttack = this.player.getAttack();
    const enemyAttack = this.enemy.getAttack();

    const enemyDamage = this.enemy.takeDamage(playerAttack);
    const playerDamage = this.player.takeDamage(enemyAttack);

    const log: BattleLogEntry = {
      round: this.currentRound,
      playerDamage,
      enemyDamage,
      playerHp: this.player.getCurrentHp(),
      enemyHp: this.enemy.getCurrentHp()
    };

    this.logs.push(log);
    this.callbacks.onRound(log);

    const playerDead = !this.player.isAlive();
    const enemyDead = !this.enemy.isAlive();
    const reachedMax = this.currentRound >= MAX_ROUNDS;

    if (playerDead || enemyDead || reachedMax) {
      this.finish(playerDead, enemyDead);
    } else {
      this.scheduleNextRound();
    }
  }

  private finish(playerDead: boolean, enemyDead: boolean): void {
    this.isRunning = false;
    this.timerId = null;

    let result: BattleResult;
    if (playerDead && enemyDead) {
      result = 'draw';
    } else if (enemyDead) {
      result = 'player_win';
    } else if (playerDead) {
      result = 'enemy_win';
    } else {
      result = 'draw';
    }

    const summary: BattleSummary = {
      result,
      totalRounds: this.currentRound,
      logs: this.logs
    };

    this.callbacks.onComplete(summary);
  }

  isInProgress(): boolean {
    return this.isRunning;
  }
}
