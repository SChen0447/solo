import { Board, HexCoord, TerrainType } from './board';

export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
}

export enum CardType {
  RESHAPE = 'reshape',
  EARTHQUAKE = 'earthquake',
  TIDE = 'tide',
  RESOURCE = 'resource',
}

export enum CardIcon {
  MOUNTAIN = 'mountain',
  WATER = 'water',
  LIGHTNING = 'lightning',
  STAR = 'star',
}

export interface CardEffectResult {
  success: boolean;
  affectedCells: HexCoord[];
}

export interface Card {
  id: string;
  name: string;
  description: string;
  type: CardType;
  icon: CardIcon;
  cost: number;
  rarity: Rarity;
  targetTerrain?: TerrainType;
  requiresTarget: boolean;
  execute: (board: Board, target?: HexCoord, sourceCoord?: HexCoord) => CardEffectResult;
}

let cardIdCounter = 0;
function generateCardId(): string {
  return `card_${Date.now()}_${cardIdCounter++}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createReshapeCard(targetTerrain: TerrainType, name: string, description: string, icon: CardIcon): Card {
  return {
    id: generateCardId(),
    name,
    description,
    type: CardType.RESHAPE,
    icon,
    cost: 1,
    rarity: Rarity.COMMON,
    targetTerrain,
    requiresTarget: true,
    execute: (board: Board, target?: HexCoord): CardEffectResult => {
      if (!target) return { success: false, affectedCells: [] };
      const now = performance.now();
      const success = board.setTerrain(target, targetTerrain, now);
      return { success, affectedCells: success ? [target] : [] };
    },
  };
}

function createEarthquakeCard(): Card {
  return {
    id: generateCardId(),
    name: '地裂',
    description: '在目标格与相邻格制造山脉阻挡对手',
    type: CardType.EARTHQUAKE,
    icon: CardIcon.MOUNTAIN,
    cost: 2,
    rarity: Rarity.RARE,
    requiresTarget: true,
    execute: (board: Board, target?: HexCoord): CardEffectResult => {
      if (!target) return { success: false, affectedCells: [] };
      const now = performance.now();
      const affected: HexCoord[] = [];
      const targetCell = board.getCell(target);
      if (targetCell && !targetCell.isBasePlayer1 && !targetCell.isBasePlayer2) {
        if (board.setTerrain(target, TerrainType.MOUNTAIN, now)) {
          affected.push(target);
        }
      }
      const neighbors = board.getNeighbors(target);
      for (const neighbor of neighbors) {
        if (!neighbor.isBasePlayer1 && !neighbor.isBasePlayer2) {
          if (board.setTerrain(neighbor.coord, TerrainType.MOUNTAIN, now)) {
            affected.push(neighbor.coord);
          }
        }
      }
      return { success: affected.length > 0, affectedCells: affected };
    },
  };
}

function createTideCard(): Card {
  return {
    id: generateCardId(),
    name: '潮涌',
    description: '将目标格及周围一片区域变为水域',
    type: CardType.TIDE,
    icon: CardIcon.WATER,
    cost: 2,
    rarity: Rarity.RARE,
    requiresTarget: true,
    execute: (board: Board, target?: HexCoord): CardEffectResult => {
      if (!target) return { success: false, affectedCells: [] };
      const now = performance.now();
      const affected: HexCoord[] = [];
      const targetCell = board.getCell(target);
      if (targetCell && !targetCell.isBasePlayer1 && !targetCell.isBasePlayer2) {
        if (board.setTerrain(target, TerrainType.WATER, now)) {
          affected.push(target);
        }
      }
      const neighbors = board.getNeighbors(target);
      for (const neighbor of neighbors) {
        if (!neighbor.isBasePlayer1 && !neighbor.isBasePlayer2) {
          if (board.setTerrain(neighbor.coord, TerrainType.WATER, now)) {
            affected.push(neighbor.coord);
          }
        }
      }
      return { success: affected.length > 0, affectedCells: affected };
    },
  };
}

function createResourceCard(): Card {
  return {
    id: generateCardId(),
    name: '资源补给',
    description: '立即获得2点额外行动点',
    type: CardType.RESOURCE,
    icon: CardIcon.STAR,
    cost: 0,
    rarity: Rarity.EPIC,
    requiresTarget: false,
    execute: (): CardEffectResult => {
      return { success: true, affectedCells: [] };
    },
  };
}

export const CARD_TEMPLATES: (() => Card)[] = [
  () => createReshapeCard(TerrainType.PLAIN, '平原化', '将目标格子变为平原', CardIcon.STAR),
  () => createReshapeCard(TerrainType.PLAIN, '平原化', '将目标格子变为平原', CardIcon.STAR),
  () => createReshapeCard(TerrainType.FOREST, '森林化', '将目标格子变为森林', CardIcon.LIGHTNING),
  () => createReshapeCard(TerrainType.FOREST, '森林化', '将目标格子变为森林', CardIcon.LIGHTNING),
  () => createReshapeCard(TerrainType.MOUNTAIN, '山石化', '将目标格子变为山脉', CardIcon.MOUNTAIN),
  () => createReshapeCard(TerrainType.MOUNTAIN, '山石化', '将目标格子变为山脉', CardIcon.MOUNTAIN),
  () => createReshapeCard(TerrainType.WATER, '水泽化', '将目标格子变为水域', CardIcon.WATER),
  () => createReshapeCard(TerrainType.WATER, '水泽化', '将目标格子变为水域', CardIcon.WATER),
  createEarthquakeCard,
  createEarthquakeCard,
  createTideCard,
  createTideCard,
  createResourceCard,
  createResourceCard,
  createResourceCard,
  createResourceCard,
  () => createReshapeCard(TerrainType.PLAIN, '沃野千里', '将目标变为平原', CardIcon.STAR),
  () => createReshapeCard(TerrainType.FOREST, '密林丛生', '将目标变为森林', CardIcon.LIGHTNING),
  () => createReshapeCard(TerrainType.MOUNTAIN, '奇峰突起', '将目标变为山脉', CardIcon.MOUNTAIN),
  () => createReshapeCard(TerrainType.WATER, '洪水泛滥', '将目标变为水域', CardIcon.WATER),
];

export class CardDeck {
  private deck: Card[] = [];
  private discard: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    this.deck = [];
    for (const template of CARD_TEMPLATES) {
      this.deck.push(template());
      this.deck.push(template());
    }
    this.deck = shuffleArray(this.deck);
    this.discard = [];
  }

  public draw(): Card | null {
    if (this.deck.length === 0) {
      if (this.discard.length === 0) return null;
      this.deck = shuffleArray(this.discard);
      this.discard = [];
    }
    return this.deck.pop() || null;
  }

  public discardCard(card: Card): void {
    this.discard.push(card);
  }

  public remainingCount(): number {
    return this.deck.length;
  }

  public reset(): void {
    this.initializeDeck();
  }
}

export interface CardUseRecord {
  playerId: number;
  card: Card;
  target?: HexCoord;
  timestamp: number;
}

export class CardHistory {
  private records: CardUseRecord[] = [];

  public addRecord(record: CardUseRecord): void {
    this.records.push(record);
  }

  public getRecords(): CardUseRecord[] {
    return [...this.records];
  }

  public reset(): void {
    this.records = [];
  }
}
