import { Card, CardData } from './Card';

export type GamePhase =
  | 'player_select'
  | 'player_flying'
  | 'ai_flying'
  | 'battle'
  | 'result'
  | 'game_over';

export interface BattleResult {
  playerDamage: number;
  aiDamage: number;
  playerCard: Card | null;
  aiCard: Card | null;
}

const CARD_TEMPLATES: CardData[] = [
  { id: 't1', name: '星际战士', attack: 5, defense: 3, effect: '普通', themeColor: '#8B4513' },
  { id: 't2', name: '宇宙法师', attack: 7, defense: 2, effect: '魔法', themeColor: '#4B0082' },
  { id: 't3', name: '银河守卫', attack: 3, defense: 6, effect: '防御', themeColor: '#2F4F4F' },
  { id: 't4', name: '黑洞吞噬', attack: 9, defense: 1, effect: '爆发', themeColor: '#000000' },
  { id: 't5', name: '光子护盾', attack: 2, defense: 8, effect: '护盾', themeColor: '#00CED1' },
  { id: 't6', name: '彗星突袭', attack: 6, defense: 4, effect: '突击', themeColor: '#FF8C00' },
  { id: 't7', name: '暗物质', attack: 4, defense: 5, effect: '平衡', themeColor: '#483D8B' },
  { id: 't8', name: '超新星', attack: 8, defense: 2, effect: '毁灭', themeColor: '#FF4500' },
  { id: 't9', name: '量子迷宫', attack: 3, defense: 7, effect: '迷惑', themeColor: '#9932CC' },
  { id: 't10', name: '虫洞使者', attack: 5, defense: 5, effect: '传送', themeColor: '#20B2AA' },
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 20; i++) {
    const template = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
    const card = new Card({
      ...template,
      id: template.id + '_' + i + '_' + Math.random().toString(36).substr(2, 5),
    });
    deck.push(card);
  }
  return shuffle(deck);
}

export class Game {
  public playerHp: number = 20;
  public aiHp: number = 20;
  public playerMaxHp: number = 20;
  public aiMaxHp: number = 20;
  public playerDeck: Card[] = [];
  public aiDeck: Card[] = [];
  public playerHand: Card[] = [];
  public aiHand: Card[] = [];
  public phase: GamePhase = 'player_select';
  public selectedCard: Card | null = null;
  public battleResult: BattleResult | null = null;
  public battleCardPlayer: Card | null = null;
  public battleCardAi: Card | null = null;
  public playerHpShake: number = 0;
  public aiHpShake: number = 0;
  public winner: 'player' | 'ai' | null = null;
  public turn: number = 1;
  public message: string = '选择一张卡牌出战！';

  constructor() {
    this.reset();
  }

  reset(): void {
    this.playerHp = 20;
    this.aiHp = 20;
    this.playerMaxHp = 20;
    this.aiMaxHp = 20;
    this.playerDeck = generateDeck();
    this.aiDeck = generateDeck();
    this.playerHand = [];
    this.aiHand = [];
    this.phase = 'player_select';
    this.selectedCard = null;
    this.battleResult = null;
    this.battleCardPlayer = null;
    this.battleCardAi = null;
    this.playerHpShake = 0;
    this.aiHpShake = 0;
    this.winner = null;
    this.turn = 1;
    this.message = '选择一张卡牌出战！';

    for (let i = 0; i < 4; i++) {
      this.drawPlayerCard();
      this.drawAiCard();
    }
  }

  private drawPlayerCard(): void {
    if (this.playerDeck.length > 0 && this.playerHand.length < 7) {
      const card = this.playerDeck.pop()!;
      this.playerHand.push(card);
    }
  }

  private drawAiCard(): void {
    if (this.aiDeck.length > 0 && this.aiHand.length < 7) {
      const card = this.aiDeck.pop()!;
      this.aiHand.push(card);
    }
  }

  selectCard(card: Card): void {
    if (this.phase !== 'player_select') return;
    if (this.selectedCard) {
      this.selectedCard.isSelected = false;
      this.selectedCard.selectedTime = 0;
    }
    this.selectedCard = card;
    card.isSelected = true;
    card.selectedTime = 0;
  }

  confirmPlay(): boolean {
    if (this.phase !== 'player_select') return false;
    if (!this.selectedCard) {
      this.message = '请先选择一张卡牌';
      return false;
    }
    const idx = this.playerHand.indexOf(this.selectedCard);
    if (idx >= 0) {
      this.playerHand.splice(idx, 1);
    }
    this.battleCardPlayer = this.selectedCard;
    this.phase = 'player_flying';
    this.message = '玩家出牌中...';
    return true;
  }

  aiSelectCard(): Card | null {
    if (this.aiHand.length === 0) return null;
    let bestCard: Card = this.aiHand[0];
    for (const card of this.aiHand) {
      if (card.attack > bestCard.attack) {
        bestCard = card;
      }
    }
    return bestCard;
  }

  startAiTurn(): void {
    const aiCard = this.aiSelectCard();
    if (!aiCard) {
      this.message = 'AI 跳过回合';
      this.settleBattle(null);
      return;
    }
    const idx = this.aiHand.indexOf(aiCard);
    if (idx >= 0) {
      this.aiHand.splice(idx, 1);
    }
    this.battleCardAi = aiCard;
    this.phase = 'ai_flying';
    this.message = 'AI 出牌中...';
  }

  resolveBattle(): void {
    const pCard = this.battleCardPlayer;
    const aCard = this.battleCardAi;
    let playerDamage = 0;
    let aiDamage = 0;

    if (pCard && aCard) {
      aiDamage = Math.max(0, pCard.attack - aCard.defense);
      playerDamage = Math.max(0, aCard.attack - pCard.defense);
    } else if (pCard && !aCard) {
      aiDamage = pCard.attack;
    } else if (!pCard && aCard) {
      playerDamage = aCard.attack;
    }

    this.aiHp = Math.max(0, this.aiHp - aiDamage);
    this.playerHp = Math.max(0, this.playerHp - playerDamage);

    if (aiDamage > 0) this.aiHpShake = 0.2;
    if (playerDamage > 0) this.playerHpShake = 0.2;

    this.battleResult = {
      playerDamage,
      aiDamage,
      playerCard: pCard,
      aiCard: aCard,
    };

    this.phase = 'result';
    this.message = `玩家-${playerDamage}  AI-${aiDamage}`;
  }

  settleBattle(_aiCard: Card | null): void {
    this.phase = 'battle';
  }

  nextTurn(): void {
    if (this.playerHp <= 0 || this.aiHp <= 0) {
      this.phase = 'game_over';
      this.winner = this.playerHp <= 0 ? 'ai' : 'player';
      this.message = this.winner === 'player' ? '胜利！' : '失败...';
      return;
    }
    this.battleCardPlayer = null;
    this.battleCardAi = null;
    this.battleResult = null;
    this.selectedCard = null;
    this.drawPlayerCard();
    this.drawAiCard();
    this.turn++;
    this.phase = 'player_select';
    this.message = '选择一张卡牌出战！';
  }

  update(deltaTime: number): void {
    if (this.playerHpShake > 0) this.playerHpShake -= deltaTime;
    if (this.aiHpShake > 0) this.aiHpShake -= deltaTime;

    for (const card of this.playerHand) card.update(deltaTime);
    for (const card of this.aiHand) card.update(deltaTime);
    if (this.battleCardPlayer) this.battleCardPlayer.update(deltaTime);
    if (this.battleCardAi) this.battleCardAi.update(deltaTime);
  }
}
