import { CardDataManager, CardInstance } from './CardDataManager';

export type PlayerId = 'player' | 'enemy';

export interface BattleState {
  playerHealth: number;
  enemyHealth: number;
  playerHand: CardInstance[];
  enemyHand: CardInstance[];
  turnCount: number;
  currentPhase: BattlePhase;
  playedPlayerCard: CardInstance | null;
  playedEnemyCard: CardInstance | null;
  isGameOver: boolean;
  winner: PlayerId | null;
}

export type BattlePhase = 'idle' | 'playerTurn' | 'enemyTurn' | 'resolving' | 'gameOver';

export interface DamageResult {
  playerCardDamage: number;
  enemyCardDamage: number;
  playerHeroDamage: number;
  enemyHeroDamage: number;
  playerCardDestroyed: boolean;
  enemyCardDestroyed: boolean;
}

export interface BattleEventMap {
  'cardPlayed': { playerId: PlayerId; card: CardInstance };
  'damageDealt': DamageResult;
  'turnEnded': { turnCount: number };
  'gameOver': { winner: PlayerId };
  'stateChanged': BattleState;
}

type EventCallback<K extends keyof BattleEventMap> = (data: BattleEventMap[K]) => void;

export const MAX_HERO_HEALTH = 100;
export const HAND_SIZE = 4;

export class BattleManager {
  private static instance: BattleManager;
  private state: BattleState;
  private cardDataManager: CardDataManager;
  private listeners: Map<keyof BattleEventMap, EventCallback<any>[]> = new Map();

  private constructor() {
    this.cardDataManager = CardDataManager.getInstance();
    this.state = this.createInitialState();
  }

  public static getInstance(): BattleManager {
    if (!BattleManager.instance) {
      BattleManager.instance = new BattleManager();
    }
    return BattleManager.instance;
  }

  private createInitialState(): BattleState {
    return {
      playerHealth: MAX_HERO_HEALTH,
      enemyHealth: MAX_HERO_HEALTH,
      playerHand: this.cardDataManager.getRandomCards(HAND_SIZE),
      enemyHand: this.cardDataManager.getRandomCards(HAND_SIZE),
      turnCount: 1,
      currentPhase: 'playerTurn',
      playedPlayerCard: null,
      playedEnemyCard: null,
      isGameOver: false,
      winner: null
    };
  }

  public on<K extends keyof BattleEventMap>(event: K, callback: EventCallback<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off<K extends keyof BattleEventMap>(event: K, callback: EventCallback<K>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof BattleEventMap>(event: K, data: BattleEventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
    this.listeners.get('stateChanged')?.forEach((cb) => cb(this.state));
  }

  public getState(): BattleState {
    return { ...this.state };
  }

  public resetGame(): void {
    this.state = this.createInitialState();
    this.emit('stateChanged', this.state);
  }

  public playCard(playerId: PlayerId, instanceId: string): boolean {
    if (this.state.isGameOver) return false;

    const hand = playerId === 'player' ? this.state.playerHand : this.state.enemyHand;
    const cardIndex = hand.findIndex((c) => c.instanceId === instanceId);

    if (cardIndex === -1) return false;

    if (playerId === 'player' && this.state.currentPhase !== 'playerTurn') return false;
    if (playerId === 'enemy' && this.state.currentPhase !== 'enemyTurn') return false;

    const card = hand[cardIndex];
    hand.splice(cardIndex, 1);

    if (playerId === 'player') {
      this.state.playedPlayerCard = card;
      this.state.currentPhase = 'enemyTurn';
    } else {
      this.state.playedEnemyCard = card;
      this.state.currentPhase = 'resolving';
    }

    this.emit('cardPlayed', { playerId, card });
    return true;
  }

  public enemyPlayRandomCard(): CardInstance | null {
    if (this.state.currentPhase !== 'enemyTurn' || this.state.isGameOver) return null;
    if (this.state.enemyHand.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * this.state.enemyHand.length);
    const card = this.state.enemyHand[randomIndex];
    this.playCard('enemy', card.instanceId);
    return card;
  }

  public resolveBattle(): DamageResult | null {
    if (this.state.currentPhase !== 'resolving') return null;
    if (!this.state.playedPlayerCard || !this.state.playedEnemyCard) return null;

    const playerCard = this.state.playedPlayerCard;
    const enemyCard = this.state.playedEnemyCard;

    const playerDefenseBonus = playerCard.defenseBonus ?? 0;
    const enemyDefenseBonus = enemyCard.defenseBonus ?? 0;

    const playerAttackDamage = Math.floor(playerCard.attack * playerCard.skillMultiplier);
    const enemyAttackDamage = Math.floor(enemyCard.attack * enemyCard.skillMultiplier);

    const enemyCardDamage = Math.max(0, Math.floor(playerAttackDamage * (1 - enemyDefenseBonus)));
    const playerCardDamage = Math.max(0, Math.floor(enemyAttackDamage * (1 - playerDefenseBonus)));

    enemyCard.currentHealth -= enemyCardDamage;
    playerCard.currentHealth -= playerCardDamage;

    const enemyCardDestroyed = enemyCard.currentHealth <= 0;
    const playerCardDestroyed = playerCard.currentHealth <= 0;

    let enemyHeroDamage = 0;
    let playerHeroDamage = 0;

    if (!playerCardDestroyed) {
      enemyHeroDamage = playerCard.attack;
      this.state.enemyHealth = Math.max(0, this.state.enemyHealth - enemyHeroDamage);
    }

    if (!enemyCardDestroyed) {
      playerHeroDamage = enemyCard.attack;
      this.state.playerHealth = Math.max(0, this.state.playerHealth - playerHeroDamage);
    }

    const result: DamageResult = {
      playerCardDamage,
      enemyCardDamage,
      playerHeroDamage,
      enemyHeroDamage,
      playerCardDestroyed,
      enemyCardDestroyed
    };

    this.emit('damageDealt', result);

    if (this.state.enemyHealth <= 0 && this.state.playerHealth <= 0) {
      this.state.isGameOver = true;
      this.state.winner = null;
      this.state.currentPhase = 'gameOver';
      this.emit('gameOver', { winner: 'player' });
    } else if (this.state.enemyHealth <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'player';
      this.state.currentPhase = 'gameOver';
      this.emit('gameOver', { winner: 'player' });
    } else if (this.state.playerHealth <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'enemy';
      this.state.currentPhase = 'gameOver';
      this.emit('gameOver', { winner: 'enemy' });
    } else {
      this.nextTurn();
    }

    return result;
  }

  private nextTurn(): void {
    this.state.turnCount++;
    this.state.playedPlayerCard = null;
    this.state.playedEnemyCard = null;

    while (this.state.playerHand.length < HAND_SIZE) {
      const newCards = this.cardDataManager.getRandomCards(1);
      if (newCards.length > 0) {
        this.state.playerHand.push(newCards[0]);
      } else {
        break;
      }
    }

    while (this.state.enemyHand.length < HAND_SIZE) {
      const newCards = this.cardDataManager.getRandomCards(1);
      if (newCards.length > 0) {
        this.state.enemyHand.push(newCards[0]);
      } else {
        break;
      }
    }

    this.state.currentPhase = 'playerTurn';
    this.emit('turnEnded', { turnCount: this.state.turnCount });
  }

  public clearPlayedCards(): void {
    this.state.playedPlayerCard = null;
    this.state.playedEnemyCard = null;
  }
}
