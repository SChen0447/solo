import Phaser from 'phaser';

export type EventType =
  | 'skill:selected'
  | 'skill:used'
  | 'turn:end'
  | 'character:death'
  | 'combo:trigger'
  | 'target:selected'
  | 'battle:start'
  | 'battle:end'
  | 'ui:update'
  | 'effect:play'
  | 'shake:screen'
  | 'element:advantage'
  | 'combo:bonus'
  | 'ai:action'
  | 'turn:start';

export interface SkillUsedPayload {
  attackerId: string;
  targetIds: string[];
  skillId: string;
  damage: number;
  isAoe: boolean;
  elementMultiplier: number;
}

export interface CharacterDeathPayload {
  characterId: string;
  team: 'player' | 'enemy';
  killedByCombo: boolean;
}

export interface ComboTriggerPayload {
  comboCount: number;
  bonusType: 'extra_turn' | 'damage_boost' | null;
}

export interface UIUpdatePayload {
  playerTeam: any[];
  enemyTeam: any[];
  currentTurn: number;
  currentActorId: string | null;
  comboCount: number;
  turnPhase: 'player' | 'enemy' | 'selecting' | 'animating' | 'ended';
  battleMessage: string;
}

class EventBus {
  private emitter: Phaser.Events.EventEmitter;

  constructor() {
    this.emitter = new Phaser.Events.EventEmitter();
  }

  on(event: EventType, callback: (...args: any[]) => void, context?: any): void {
    this.emitter.on(event, callback, context);
  }

  once(event: EventType, callback: (...args: any[]) => void, context?: any): void {
    this.emitter.once(event, callback, context);
  }

  off(event: EventType, callback: (...args: any[]) => void, context?: any): void {
    this.emitter.off(event, callback, context);
  }

  emit(event: EventType, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }

  removeAllListeners(event?: EventType): void {
    this.emitter.removeAllListeners(event);
  }
}

export const eventBus = new EventBus();
