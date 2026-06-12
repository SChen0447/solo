import { playShakeAnimation, playRedFlash, playWhiteFlash, playGoldGlow, createLightningBolt, getElementCenter } from './effects';

interface CardData {
  id: number;
  symbol: string;
  symbolColor: string;
  isFlipped: boolean;
  isMatched: boolean;
  element: HTMLElement | null;
}

const SYMBOLS = [
  { symbol: '◆', color: '#00FFFF' },
  { symbol: '▲', color: '#FF00FF' },
  { symbol: '●', color: '#00FF88' },
  { symbol: '★', color: '#FFFF00' },
  { symbol: '✦', color: '#FF6600' },
  { symbol: '❖', color: '#00AAFF' },
  { symbol: '◉', color: '#FF0088' },
  { symbol: '✧', color: '#88FF00' }
];

export type GameState = 'idle' | 'playing' | 'checking' | 'ended';

export class CardGrid {
  private container: HTMLElement;
  private gridElement: HTMLElement;
  private cards: CardData[] = [];
  private flippedCards: CardData[] = [];
  private gameState: GameState = 'idle';
  private score: number = 0;
  private matchedPairs: number = 0;
  private totalPairs: number = 8;

  public onScoreChange: ((score: number) => void) | null = null;
  public onGameComplete: (() => void) | null = null;
  public onCardFlip: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.gridElement = document.createElement('div');
    this.gridElement.className = 'card-grid';
    this.gridElement.style.position = 'relative';
    this.gridElement.style.display = 'grid';
    this.gridElement.style.gridTemplateColumns = 'repeat(4, 1fr)';
    this.gridElement.style.gridTemplateRows = 'repeat(4, 1fr)';
    this.gridElement.style.gap = '6px';
    this.gridElement.style.padding = '6px';
    this.gridElement.style.width = 'min(70vh, 80vw)';
    this.gridElement.style.height = 'min(70vh, 80vw)';
    this.gridElement.style.minWidth = '320px';
    this.gridElement.style.minHeight = '320px';
    this.gridElement.style.zIndex = '10';

    container.appendChild(this.gridElement);

    this.initCards();
    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes halo-pulse {
        0%, 100% { 
          box-shadow: 0 0 10px #00FFFF, inset 0 0 10px rgba(0, 255, 255, 0.3);
          border-color: #00FFFF;
        }
        50% { 
          box-shadow: 0 0 25px #FF00FF, inset 0 0 20px rgba(255, 0, 255, 0.3);
          border-color: #FF00FF;
        }
      }

      @keyframes start-pulse {
        0%, 100% {
          box-shadow: 0 0 20px #00FFFF, 0 0 40px rgba(0, 255, 255, 0.5);
        }
        50% {
          box-shadow: 0 0 40px #FF00FF, 0 0 80px rgba(255, 0, 255, 0.5);
        }
      }

      @keyframes timer-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      .card {
        position: relative;
        width: 100%;
        height: 100%;
        cursor: pointer;
        transform-style: preserve-3d;
        transition: transform 400ms ease-in-out;
        border-radius: 8px;
      }

      .card.flipped {
        transform: rotateY(180deg);
      }

      .card.matched {
        opacity: 0.6;
        pointer-events: none;
      }

      .card-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #00FFFF;
        background: rgba(10, 10, 26, 0.9);
        box-shadow: 0 0 10px #00FFFF, inset 0 0 10px rgba(0, 255, 255, 0.3);
        animation: halo-pulse 2s ease-in-out infinite;
      }

      .card-back {
        background: linear-gradient(135deg, rgba(20, 20, 50, 0.95) 0%, rgba(30, 20, 60, 0.95) 100%);
      }

      .card-front {
        transform: rotateY(180deg);
        background: rgba(10, 10, 26, 0.95);
      }

      .card-symbol {
        font-size: clamp(24px, 6vh, 48px);
        font-weight: bold;
        text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
      }

      .card-grid::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(0, 255, 255, 0.3) 50%, 
          transparent 100%
        );
        pointer-events: none;
        z-index: -1;
        filter: blur(3px);
      }
    `;
    document.head.appendChild(style);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private initCards(): void {
    const cardSymbols: { symbol: string; color: string }[] = [];
    for (let i = 0; i < 2; i++) {
      SYMBOLS.forEach(s => cardSymbols.push(s));
    }

    const shuffledSymbols = this.shuffleArray(cardSymbols);

    this.cards = shuffledSymbols.map((s, index) => ({
      id: index,
      symbol: s.symbol,
      symbolColor: s.color,
      isFlipped: false,
      isMatched: false,
      element: null
    }));

    this.renderCards();
  }

  private renderCards(): void {
    this.gridElement.innerHTML = '';

    for (const card of this.cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.dataset.id = card.id.toString();

      const cardBack = document.createElement('div');
      cardBack.className = 'card-face card-back';

      const cardFront = document.createElement('div');
      cardFront.className = 'card-face card-front';
      cardFront.style.animation = 'none';
      cardFront.style.borderColor = card.symbolColor;
      cardFront.style.boxShadow = `0 0 15px ${card.symbolColor}, inset 0 0 15px ${card.symbolColor}40`;

      const symbolEl = document.createElement('span');
      symbolEl.className = 'card-symbol';
      symbolEl.textContent = card.symbol;
      symbolEl.style.color = card.symbolColor;

      cardFront.appendChild(symbolEl);
      cardEl.appendChild(cardBack);
      cardEl.appendChild(cardFront);

      cardEl.addEventListener('click', () => this.handleCardClick(card));

      this.gridElement.appendChild(cardEl);
      card.element = cardEl;
    }
  }

  private handleCardClick(card: CardData): void {
    if (this.gameState !== 'playing') return;
    if (card.isFlipped || card.isMatched) return;
    if (this.flippedCards.length >= 2) return;

    this.flipCard(card);
    this.flippedCards.push(card);

    if (this.onCardFlip) {
      this.onCardFlip();
    }

    if (this.flippedCards.length === 2) {
      this.gameState = 'checking';
      this.checkMatch();
    }
  }

  private flipCard(card: CardData): void {
    if (!card.element) return;
    card.isFlipped = true;
    card.element.classList.add('flipped');
    playWhiteFlash(card.element, 200);
  }

  private unflipCard(card: CardData): void {
    if (!card.element) return;
    card.isFlipped = false;
    card.element.classList.remove('flipped');
  }

  private checkMatch(): void {
    const [card1, card2] = this.flippedCards;

    if (card1.symbol === card2.symbol) {
      this.handleMatch(card1, card2);
    } else {
      this.handleMismatch(card1, card2);
    }
  }

  private handleMatch(card1: CardData, card2: CardData): void {
    card1.isMatched = true;
    card2.isMatched = true;

    if (card1.element) {
      card1.element.classList.add('matched');
      playGoldGlow(card1.element, 500);
    }
    if (card2.element) {
      card2.element.classList.add('matched');
      playGoldGlow(card2.element, 500);
    }

    setTimeout(() => {
      if (card1.element && card2.element) {
        const pos1 = getElementCenter(card1.element, this.container);
        const pos2 = getElementCenter(card2.element, this.container);
        createLightningBolt(this.container, pos1.x, pos1.y, pos2.x, pos2.y, 600);
      }
    }, 100);

    this.score += 100;
    this.matchedPairs++;

    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }

    setTimeout(() => {
      this.flippedCards = [];
      this.gameState = 'playing';

      if (this.matchedPairs >= this.totalPairs) {
        this.gameState = 'ended';
        if (this.onGameComplete) {
          this.onGameComplete();
        }
      }
    }, 600);
  }

  private handleMismatch(card1: CardData, card2: CardData): void {
    if (card1.element) {
      playShakeAnimation(card1.element, 300, 5, 3);
      playRedFlash(card1.element, 3, 100);
    }
    if (card2.element) {
      playShakeAnimation(card2.element, 300, 5, 3);
      playRedFlash(card2.element, 3, 100);
    }

    this.score = Math.max(0, this.score - 20);
    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }

    setTimeout(() => {
      this.unflipCard(card1);
      this.unflipCard(card2);
      this.flippedCards = [];
      this.gameState = 'playing';
    }, 1000);
  }

  public startGame(): void {
    this.resetGame();
    this.gameState = 'playing';
  }

  public resetGame(): void {
    this.score = 0;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.gameState = 'idle';

    const cardSymbols: { symbol: string; color: string }[] = [];
    for (let i = 0; i < 2; i++) {
      SYMBOLS.forEach(s => cardSymbols.push(s));
    }

    const shuffledSymbols = this.shuffleArray(cardSymbols);

    this.cards.forEach((card, index) => {
      card.symbol = shuffledSymbols[index].symbol;
      card.symbolColor = shuffledSymbols[index].color;
      card.isFlipped = false;
      card.isMatched = false;
    });

    this.renderCards();

    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }
  }

  public getScore(): number {
    return this.score;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getMatchedPairs(): number {
    return this.matchedPairs;
  }

  public getTotalPairs(): number {
    return this.totalPairs;
  }

  public destroy(): void {
    this.gridElement.remove();
  }
}
