export type Element = 'fire' | 'water' | 'wind' | 'earth' | 'major';

export type ArcanaType = 'major' | 'minor';

export interface Card {
  id: string;
  name: string;
  element: Element;
  energyValue: number;
  arcanaType: ArcanaType;
  effect: string;
  description: string;
  symbol: string;
  suppressed?: boolean;
  suppressionTurns?: number;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  energy: number;
  boardEnergy: number;
  isBurstReady: boolean;
}

export type GridCell = Card | null;

export type GameGrid = GridCell[][];

export interface ComboResult {
  score: number;
  comboName: string;
  positions: { row: number; col: number }[];
}

export interface GameState {
  players: [Player, Player];
  currentPlayerIndex: number;
  grid: GameGrid;
  turn: number;
  gameOver: boolean;
  winner: number | null;
  isBurstMode: boolean;
  burstTargetPlayer: number | null;
}
