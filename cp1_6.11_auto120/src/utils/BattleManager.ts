import type {
  IGameState,
  IStarlight,
  IHandCard,
  IChargeResult,
  IBeamResult,
  IComboResult
} from '../types/game';
import { getAllConstellations } from './ConstellationData';

const MAX_HEALTH = 40;
const MAX_ENERGY = 100;
const CHARGE_PER_ENERGY = 10;
const CHARGES_FOR_ATTACK = 3;
const BEAM_DAMAGE = 2;
const COMBO_DAMAGE = 5;
const ENERGY_LOSS_PER_HIT = 20;
const HAND_SIZE = 5;

export class BattleManager {
  private state: IGameState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): IGameState {
    return {
      playerHealth: MAX_HEALTH,
      opponentHealth: MAX_HEALTH,
      currentTurn: 'player',
      turnCount: 1,
      playerStarlights: [],
      opponentStarlights: [],
      playerHand: this.generateHand(),
      isGameOver: false,
      winner: null
    };
  }

  private generateHand(): IHandCard[] {
    const allConstellations = getAllConstellations();
    const hand: IHandCard[] = [];

    for (let i = 0; i < HAND_SIZE; i++) {
      const randomConstellation =
        allConstellations[Math.floor(Math.random() * allConstellations.length)];
      hand.push({
        id: `card-${Date.now()}-${i}`,
        constellationId: randomConstellation.id
      });
    }

    return hand;
  }

  private getNextAvailableSlot(starlights: IStarlight[]): number {
    const occupiedSlots = new Set(starlights.map(s => s.slotIndex));
    for (let i = 0; i < 12; i++) {
      if (!occupiedSlots.has(i)) return i;
    }
    return -1;
  }

  updateHealth(isPlayer: boolean, delta: number): number {
    if (this.state.isGameOver) return isPlayer ? this.state.playerHealth : this.state.opponentHealth;

    if (isPlayer) {
      this.state.playerHealth = Math.max(0, Math.min(MAX_HEALTH, this.state.playerHealth + delta));
    } else {
      this.state.opponentHealth = Math.max(0, Math.min(MAX_HEALTH, this.state.opponentHealth + delta));
    }

    this.checkGameOver();
    return isPlayer ? this.state.playerHealth : this.state.opponentHealth;
  }

  getHealth(isPlayer: boolean): number {
    return isPlayer ? this.state.playerHealth : this.state.opponentHealth;
  }

  getMaxHealth(): number {
    return MAX_HEALTH;
  }

  switchTurn(): void {
    if (this.state.isGameOver) return;

    this.state.currentTurn = this.state.currentTurn === 'player' ? 'opponent' : 'player';
    if (this.state.currentTurn === 'player') {
      this.state.turnCount++;
    }
  }

  getCurrentTurn(): 'player' | 'opponent' {
    return this.state.currentTurn;
  }

  getTurnCount(): number {
    return this.state.turnCount;
  }

  placeStarlight(cardId: string, isPlayer: boolean): IStarlight | null {
    if (this.state.isGameOver) return null;
    if (this.state.currentTurn !== (isPlayer ? 'player' : 'opponent')) return null;

    const hand = isPlayer ? this.state.playerHand : [];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;

    const card = hand[cardIndex];
    const starlights = isPlayer ? this.state.playerStarlights : this.state.opponentStarlights;
    const slotIndex = this.getNextAvailableSlot(starlights);

    if (slotIndex === -1) return null;

    const starlight: IStarlight = {
      id: `starlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      constellationId: card.constellationId,
      slotIndex,
      energy: 0,
      chargeCount: 0,
      isPlayer
    };

    if (isPlayer) {
      this.state.playerStarlights.push(starlight);
      this.state.playerHand.splice(cardIndex, 1);
    } else {
      this.state.opponentStarlights.push(starlight);
    }

    return starlight;
  }

  removeStarlight(starlightId: string, isPlayer: boolean): boolean {
    const starlights = isPlayer ? this.state.playerStarlights : this.state.opponentStarlights;
    const index = starlights.findIndex(s => s.id === starlightId);
    if (index !== -1) {
      starlights.splice(index, 1);
      return true;
    }
    return false;
  }

  removeRandomStarlight(isPlayer: boolean): IStarlight | null {
    const starlights = isPlayer ? this.state.playerStarlights : this.state.opponentStarlights;
    if (starlights.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * starlights.length);
    const removed = starlights.splice(randomIndex, 1)[0];
    return removed;
  }

  triggerConstellation(_comboType: string): IComboResult {
    this.updateHealth(false, -COMBO_DAMAGE);
    return {
      damage: COMBO_DAMAGE,
      removeRandom: true,
      shockwave: true
    };
  }

  chargeStarlight(starlightId: string, isPlayer: boolean): IChargeResult {
    if (this.state.isGameOver) {
      return { newEnergy: 0, canAttack: false };
    }
    if (this.state.currentTurn !== (isPlayer ? 'player' : 'opponent')) {
      return { newEnergy: 0, canAttack: false };
    }

    const starlights = isPlayer ? this.state.playerStarlights : this.state.opponentStarlights;
    const starlight = starlights.find(s => s.id === starlightId);

    if (!starlight) {
      return { newEnergy: 0, canAttack: false };
    }

    starlight.energy = Math.min(MAX_ENERGY, starlight.energy + CHARGE_PER_ENERGY);
    starlight.chargeCount++;

    const canAttack = starlight.chargeCount >= CHARGES_FOR_ATTACK;

    return {
      newEnergy: starlight.energy,
      canAttack
    };
  }

  fireBeam(attackerId: string, isPlayerAttacker: boolean): IBeamResult {
    if (this.state.isGameOver) {
      return { damage: 0, targetEnergy: 0 };
    }

    const attackerStarlights = isPlayerAttacker
      ? this.state.playerStarlights
      : this.state.opponentStarlights;
    const attacker = attackerStarlights.find(s => s.id === attackerId);

    if (!attacker || attacker.chargeCount < CHARGES_FOR_ATTACK) {
      return { damage: 0, targetEnergy: 0 };
    }

    const targetStarlights = isPlayerAttacker
      ? this.state.opponentStarlights
      : this.state.playerStarlights;

    if (targetStarlights.length === 0) {
      this.updateHealth(!isPlayerAttacker, -BEAM_DAMAGE);
      attacker.chargeCount = 0;
      return { damage: BEAM_DAMAGE, targetEnergy: 0 };
    }

    const targetIndex = Math.floor(Math.random() * targetStarlights.length);
    const target = targetStarlights[targetIndex];
    target.energy = Math.max(0, target.energy - ENERGY_LOSS_PER_HIT);

    this.updateHealth(!isPlayerAttacker, -BEAM_DAMAGE);
    attacker.chargeCount = 0;

    return {
      damage: BEAM_DAMAGE,
      targetEnergy: target.energy
    };
  }

  getStarlights(isPlayer: boolean): IStarlight[] {
    return isPlayer ? [...this.state.playerStarlights] : [...this.state.opponentStarlights];
  }

  getHand(): IHandCard[] {
    return [...this.state.playerHand];
  }

  drawCard(): IHandCard | null {
    if (this.state.playerHand.length >= HAND_SIZE) return null;

    const allConstellations = getAllConstellations();
    const randomConstellation =
      allConstellations[Math.floor(Math.random() * allConstellations.length)];

    const newCard: IHandCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      constellationId: randomConstellation.id
    };

    this.state.playerHand.push(newCard);
    return newCard;
  }

  checkGameOver(): 'player' | 'opponent' | null {
    if (this.state.playerHealth <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'opponent';
      return 'opponent';
    }
    if (this.state.opponentHealth <= 0) {
      this.state.isGameOver = true;
      this.state.winner = 'player';
      return 'player';
    }
    return null;
  }

  getWinner(): 'player' | 'opponent' | null {
    return this.state.winner;
  }

  isGameOver(): boolean {
    return this.state.isGameOver;
  }

  resetGame(): void {
    this.state = this.createInitialState();
  }

  getState(): IGameState {
    return { ...this.state };
  }

  getStarlightById(id: string, isPlayer: boolean): IStarlight | undefined {
    const starlights = isPlayer ? this.state.playerStarlights : this.state.opponentStarlights;
    return starlights.find(s => s.id === id);
  }
}
