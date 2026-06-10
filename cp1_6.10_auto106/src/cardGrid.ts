export interface Card {
  id: number;
  symbol: string;
  pairId: number;
  colorIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
  gridX: number;
  gridY: number;
  element: HTMLElement;
}

export type Difficulty = 'easy' | 'normal' | 'hard';
export type CardSize = 'small' | 'medium' | 'large';

export interface GameStats {
  matchCount: number;
  errorCount: number;
  consecutiveErrors: number;
  startTime: number;
  matchTimes: number[];
  totalPairs: number;
  hintUsed: number;
}

export interface MatchResult {
  success: boolean;
  card1: Card;
  card2: Card;
  gameComplete: boolean;
  firstCardFlipTime?: number;
}

const SYMBOLS_EASY = ['◆', '◇', '○', '●', '□', '■', '△', '▲', '☆', '★', '♡', '♥', '♢', '♦', '♧', '♣'];
const SYMBOLS_NORMAL = ['◈', '◉', '◎', '◐', '◑', '◒', '◓', '⬡', '⬢', '⬣', '⌬', '⎔', '◬', '⟁', '⟟', '⌖'];
const SYMBOLS_HARD = ['ᗅ', 'ᗆ', 'ᗇ', 'ᗈ', 'ᗉ', 'ᗊ', 'ᗋ', 'ᗌ', 'ᗍ', 'ᗎ', 'ᗏ', 'ᗐ', 'ᗑ', 'ᗒ', 'ᗓ', 'ᗔ', 'ᗕ', 'ᗖ'];

export class CardGrid {
  private container: HTMLElement;
  private cards: Card[] = [];
  private cols: number = 4;
  private rows: number = 4;
  private firstCard: Card | null = null;
  private secondCard: Card | null = null;
  private isChecking: boolean = false;
  private size: CardSize = 'medium';
  private difficulty: Difficulty = 'easy';
  private round: number = 1;
  private matchInterval: number = 3000;
  private lastMatchTime: number = 0;
  private firstCardFlipTime: number = 0;

  public stats: GameStats = {
    matchCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    startTime: 0,
    matchTimes: [],
    totalPairs: 0,
    hintUsed: 0
  };

  public onMatchSuccess?: (card1: Card, card2: Card, flipDuration: number) => void;
  public onMatchFail?: (card1: Card, card2: Card) => void;
  public onGameComplete?: () => void;
  public onCardClick?: (card: Card) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  private getSymbolsForDifficulty(diff: Difficulty, count: number): string[] {
    let pool: string[];
    switch (diff) {
      case 'easy': pool = SYMBOLS_EASY; break;
      case 'normal': pool = SYMBOLS_NORMAL; break;
      case 'hard': pool = SYMBOLS_HARD; break;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    switch (diff) {
      case 'easy': this.cols = 4; this.rows = 4; break;
      case 'normal': this.cols = 5; this.rows = 4; break;
      case 'hard': this.cols = 6; this.rows = 6; break;
    }
  }

  setSize(size: CardSize): void {
    this.size = size;
    this.cards.forEach(card => {
      card.element.classList.remove('size-small', 'size-medium', 'size-large');
      card.element.classList.add(`size-${size}`);
    });
  }

  getSize(): CardSize {
    return this.size;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getCards(): Card[] {
    return this.cards;
  }

  getMatchInterval(): number {
    return this.matchInterval;
  }

  initGame(nextRound: boolean = false): void {
    this.container.innerHTML = '';
    this.cards = [];
    this.firstCard = null;
    this.secondCard = null;
    this.isChecking = false;

    if (!nextRound) {
      this.round = 1;
      this.matchInterval = 3000;
    } else {
      this.round++;
      this.matchInterval = Math.max(1000, this.matchInterval - 300);
    }

    const totalCards = this.cols * this.rows;
    const pairCount = Math.floor(totalCards / 2);
    const symbols = this.getSymbolsForDifficulty(this.difficulty, pairCount);

    const cardData: { symbol: string; pairId: number; colorIndex: number }[] = [];
    symbols.forEach((sym, idx) => {
      cardData.push({ symbol: sym, pairId: idx, colorIndex: idx % 10 });
      cardData.push({ symbol: sym, pairId: idx, colorIndex: idx % 10 });
    });

    for (let i = cardData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
    }

    this.container.style.gridTemplateColumns = `repeat(${this.cols}, auto)`;
    this.container.style.gridTemplateRows = `repeat(${this.rows}, auto)`;

    for (let i = 0; i < cardData.length; i++) {
      const data = cardData[i];
      const gx = i % this.cols;
      const gy = Math.floor(i / this.cols);

      const cardEl = document.createElement('div');
      cardEl.className = `card size-${this.size}`;
      cardEl.dataset.id = String(i);

      const back = document.createElement('div');
      back.className = 'card-face card-back';

      const front = document.createElement('div');
      front.className = 'card-face card-front';
      front.textContent = data.symbol;
      front.style.color = this.getColorFromIndex(data.colorIndex);

      cardEl.appendChild(back);
      cardEl.appendChild(front);

      cardEl.addEventListener('click', () => this.handleCardClick(i));

      this.container.appendChild(cardEl);

      this.cards.push({
        id: i,
        symbol: data.symbol,
        pairId: data.pairId,
        colorIndex: data.colorIndex,
        isFlipped: false,
        isMatched: false,
        gridX: gx,
        gridY: gy,
        element: cardEl
      });
    }

    this.stats = {
      matchCount: 0,
      errorCount: 0,
      consecutiveErrors: 0,
      startTime: performance.now(),
      matchTimes: [],
      totalPairs: pairCount,
      hintUsed: 0
    };
    this.lastMatchTime = performance.now();
  }

  private getColorFromIndex(idx: number): string {
    const colors = [
      '#55ddff', '#ff6b9d', '#ffd93d', '#6bcb77', '#c780ff',
      '#ff8c42', '#4ecdc4', '#ff6b6b', '#a8e6cf', '#ffd3b6'
    ];
    return colors[idx % colors.length];
  }

  private handleCardClick(cardId: number): void {
    if (this.isChecking) return;
    const card = this.cards[cardId];
    if (!card || card.isFlipped || card.isMatched) return;

    this.onCardClick?.(card);
    this.flipCard(card, true);

    if (!this.firstCard) {
      this.firstCard = card;
      this.firstCardFlipTime = performance.now();
    } else if (!this.secondCard && card.id !== this.firstCard.id) {
      this.secondCard = card;
      this.isChecking = true;
      this.checkMatch();
    }
  }

  private flipCard(card: Card, flipped: boolean): void {
    card.isFlipped = flipped;
    if (flipped) {
      card.element.classList.add('flipped');
    } else {
      card.element.classList.remove('flipped');
    }
  }

  private checkMatch(): void {
    if (!this.firstCard || !this.secondCard) return;
    const c1 = this.firstCard;
    const c2 = this.secondCard;
    const flipDuration = performance.now() - this.firstCardFlipTime;

    if (c1.pairId === c2.pairId) {
      c1.isMatched = true;
      c2.isMatched = true;
      c1.element.classList.add('matched');
      c2.element.classList.add('matched');
      this.stats.matchCount++;
      this.stats.consecutiveErrors = 0;
      this.stats.matchTimes.push(flipDuration);
      this.lastMatchTime = performance.now();

      setTimeout(() => {
        this.onMatchSuccess?.(c1, c2, flipDuration);
        this.resetSelection();
        if (this.stats.matchCount >= this.stats.totalPairs) {
          this.onGameComplete?.();
        }
      }, 100);
    } else {
      this.stats.errorCount++;
      this.stats.consecutiveErrors++;

      setTimeout(() => {
        c1.element.classList.add('shaking');
        c2.element.classList.add('shaking');
      }, 400);

      setTimeout(() => {
        this.flipCard(c1, false);
        this.flipCard(c2, false);
        c1.element.classList.remove('shaking');
        c2.element.classList.remove('shaking');
        this.onMatchFail?.(c1, c2);
        this.resetSelection();
      }, 1000);
    }
  }

  private resetSelection(): void {
    this.firstCard = null;
    this.secondCard = null;
    this.isChecking = false;
  }

  findRandomMatchPair(): Card[] | null {
    const unmatched = this.cards.filter(c => !c.isMatched);
    if (unmatched.length < 2) return null;
    const pairIds = new Set(unmatched.map(c => c.pairId));
    for (const pid of pairIds) {
      const pair = unmatched.filter(c => c.pairId === pid);
      if (pair.length >= 2) {
        return [pair[0], pair[1]];
      }
    }
    return null;
  }

  showHintOnCard(card: Card): void {
    let glow = card.element.querySelector('.hint-glow') as HTMLElement | null;
    if (!glow) {
      glow = document.createElement('div');
      glow.className = 'hint-glow';
      card.element.appendChild(glow);
    }
    setTimeout(() => {
      if (glow && glow.parentNode) {
        glow.parentNode.removeChild(glow);
      }
    }, 3000);
  }

  getCardCenter(card: Card): { x: number; y: number } {
    const rect = card.element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  calculateScore(): number {
    let score = 100;
    score -= this.stats.errorCount * 5;
    score -= this.stats.hintUsed * 15;
    return Math.max(0, score);
  }
}
