export type ElementType = 'fire' | 'water' | 'earth' | 'air';

export interface IConstellation {
  id: string;
  name: string;
  nameEn: string;
  element: ElementType;
  energy: number;
  symbol: string;
  iconColor: string;
}

export interface IStarlight {
  id: string;
  constellationId: string;
  slotIndex: number;
  energy: number;
  chargeCount: number;
  isPlayer: boolean;
}

export interface IHandCard {
  id: string;
  constellationId: string;
}

export interface IComboGroup {
  id: string;
  name: string;
  element: ElementType;
  constellations: [string, string, string];
  damage: number;
}

export interface IGameState {
  playerHealth: number;
  opponentHealth: number;
  currentTurn: 'player' | 'opponent';
  turnCount: number;
  playerStarlights: IStarlight[];
  opponentStarlights: IStarlight[];
  playerHand: IHandCard[];
  isGameOver: boolean;
  winner: 'player' | 'opponent' | null;
}

export interface IChargeResult {
  newEnergy: number;
  canAttack: boolean;
}

export interface IBeamResult {
  damage: number;
  targetEnergy: number;
}

export interface IComboResult {
  damage: number;
  removeRandom: boolean;
  shockwave: boolean;
}
