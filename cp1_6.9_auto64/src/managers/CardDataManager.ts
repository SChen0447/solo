import cardData from '../data/cardData.json';

export type ElementType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export interface CardData {
  id: string;
  name: string;
  element: ElementType;
  attack: number;
  health: number;
  skill: string;
  skillMultiplier: number;
  defenseBonus?: number;
}

export interface CardInstance extends CardData {
  instanceId: string;
  currentHealth: number;
}

export const ElementColors: Record<ElementType, number> = {
  fire: 0xff4422,
  water: 0x2288ff,
  wind: 0x44dd66,
  earth: 0x996633,
  light: 0xffdd33,
  dark: 0x9933cc
};

export const ElementNames: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '土',
  light: '光',
  dark: '暗'
};

export class CardDataManager {
  private static instance: CardDataManager;
  private cardCache: Map<string, CardData> = new Map();

  private constructor() {
    this.loadCards();
  }

  public static getInstance(): CardDataManager {
    if (!CardDataManager.instance) {
      CardDataManager.instance = new CardDataManager();
    }
    return CardDataManager.instance;
  }

  private loadCards(): void {
    (cardData as CardData[]).forEach((card) => {
      this.cardCache.set(card.id, card);
    });
  }

  public getCard(cardId: string): CardData | undefined {
    return this.cardCache.get(cardId);
  }

  public getAllCards(): CardData[] {
    return Array.from(this.cardCache.values());
  }

  public createCardInstance(cardId: string): CardInstance | null {
    const cardData = this.getCard(cardId);
    if (!cardData) return null;
    return {
      ...cardData,
      instanceId: `${cardId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentHealth: cardData.health
    };
  }

  public getRandomCards(count: number): CardInstance[] {
    const allCards = this.getAllCards();
    const result: CardInstance[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * allCards.length);
      const card = this.createCardInstance(allCards[randomIndex].id);
      if (card) result.push(card);
    }
    return result;
  }
}
