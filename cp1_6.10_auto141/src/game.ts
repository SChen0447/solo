export type ShapeType =
  | 'triangle'
  | 'star'
  | 'diamond'
  | 'hexagon'
  | 'circle'
  | 'square'
  | 'pentagon'
  | 'octagon'
  | 'heart'
  | 'cross'
  | 'arrow'
  | 'moon'
  | 'crescent'
  | 'trapezoid'
  | 'parallelogram'
  | 'ellipse'
  | 'ring'
  | 'flower';

export interface CardPattern {
  shape: ShapeType;
  color: string;
}

export interface Card {
  id: number;
  patternIndex: number;
  pattern: CardPattern;
  state: CardState;
  flipProgress: number;
  flipDirection: 'toFront' | 'toBack';
  matchGlowProgress: number;
  shakeProgress: number;
  isMatched: boolean;
  row: number;
  col: number;
}

export type CardState = 'hidden' | 'flipping' | 'shown' | 'matching' | 'matched';

export interface GameConfig {
  gridSize: 4 | 6;
}

export class Game {
  private cards: Card[] = [];
  private gridSize: 4 | 6 = 4;
  private steps: number = 0;
  private remainingPairs: number = 0;
  private firstSelected: Card | null = null;
  private secondSelected: Card | null = null;
  private isProcessing: boolean = false;
  private patterns: CardPattern[] = [];
  private onStateChange: (() => void) | null = null;
  private onWin: (() => void) | null = null;
  private gameWon: boolean = false;

  constructor(config?: GameConfig) {
    if (config) {
      this.gridSize = config.gridSize;
    }
    this.initPatterns();
  }

  private initPatterns(): void {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf',
      '#ff8b94', '#a29bfe', '#fd79a8', '#74b9ff',
      '#00cec9', '#55efc4', '#fab1a0', '#81ecec',
      '#ff7675', '#74b9ff', '#e17055', '#00b894',
      '#fdcb6e', '#e84393'
    ];

    const shapes: ShapeType[] = [
      'triangle', 'star', 'diamond', 'hexagon',
      'circle', 'square', 'pentagon', 'octagon',
      'heart', 'cross', 'arrow', 'moon',
      'crescent', 'trapezoid', 'parallelogram', 'ellipse',
      'ring', 'flower'
    ];

    this.patterns = shapes.map((shape, index) => ({
      shape,
      color: colors[index % colors.length],
    }));
  }

  public setOnStateChange(callback: () => void): void {
    this.onStateChange = callback;
  }

  public setOnWin(callback: () => void): void {
    this.onWin = callback;
  }

  public init(gridSize?: 4 | 6): void {
    if (gridSize !== undefined) {
      this.gridSize = gridSize;
    }
    this.gameWon = false;
    this.steps = 0;
    this.firstSelected = null;
    this.secondSelected = null;
    this.isProcessing = false;
    this.cards = this.generateCards();
    this.shuffleCards();
    this.remainingPairs = this.cards.length / 2;
    this.notifyStateChange();
  }

  private generateCards(): Card[] {
    const totalPairs = (this.gridSize * this.gridSize) / 2;
    const selectedPatterns = this.patterns.slice(0, totalPairs);
    const cards: Card[] = [];
    let id = 0;

    for (let i = 0; i < selectedPatterns.length; i++) {
      for (let j = 0; j < 2; j++) {
        cards.push({
          id: id++,
          patternIndex: i,
          pattern: selectedPatterns[i],
          state: 'hidden',
          flipProgress: 0,
          flipDirection: 'toFront',
          matchGlowProgress: 0,
          shakeProgress: 0,
          isMatched: false,
          row: 0,
          col: 0,
        });
      }
    }

    return cards;
  }

  private shuffleCards(): void {
    const n = this.cards.length;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    for (let i = 0; i < this.cards.length; i++) {
      this.cards[i].row = Math.floor(i / this.gridSize);
      this.cards[i].col = i % this.gridSize;
    }
  }

  public getCards(): Card[] {
    return this.cards;
  }

  public getGridSize(): 4 | 6 {
    return this.gridSize;
  }

  public getSteps(): number {
    return this.steps;
  }

  public getRemainingPairs(): number {
    return this.remainingPairs;
  }

  public isGameWon(): boolean {
    return this.gameWon;
  }

  public selectCard(card: Card): void {
    if (this.isProcessing || this.gameWon) return;
    if (card.state !== 'hidden' && card.state !== 'matched') return;
    if (this.firstSelected && this.firstSelected.id === card.id) return;
    if (card.isMatched) return;

    this.flipCardToFront(card);
    card.shakeProgress = 1;

    if (!this.firstSelected) {
      this.firstSelected = card;
    } else if (!this.secondSelected) {
      this.secondSelected = card;
      this.steps++;
      this.isProcessing = true;
      this.checkMatch();
    }
    this.notifyStateChange();
  }

  private flipCardToFront(card: Card): void {
    if (card.state === 'hidden') {
      card.state = 'flipping';
      card.flipProgress = 0;
      card.flipDirection = 'toFront';
    }
  }

  private flipCardToBack(card: Card): void {
    if (card.state === 'shown') {
      card.state = 'flipping';
      card.flipProgress = 0;
      card.flipDirection = 'toBack';
    }
  }

  private checkMatch(): void {
    if (!this.firstSelected || !this.secondSelected) return;

    if (this.firstSelected.patternIndex === this.secondSelected.patternIndex) {
      this.firstSelected.state = 'matching';
      this.secondSelected.state = 'matching';
      this.firstSelected.matchGlowProgress = 1;
      this.secondSelected.matchGlowProgress = 1;
      this.firstSelected.shakeProgress = 1;
      this.secondSelected.shakeProgress = 1;
      this.remainingPairs--;

      setTimeout(() => {
        if (this.firstSelected) {
          this.firstSelected.state = 'matched';
          this.firstSelected.isMatched = true;
        }
        if (this.secondSelected) {
          this.secondSelected.state = 'matched';
          this.secondSelected.isMatched = true;
        }
        this.resetSelection();
        this.notifyStateChange();
        if (this.remainingPairs === 0) {
          this.gameWon = true;
          if (this.onWin) this.onWin();
        }
      }, 800);
    } else {
      setTimeout(() => {
        if (this.firstSelected) {
          this.flipCardToBack(this.firstSelected);
          this.firstSelected.shakeProgress = 1;
        }
        if (this.secondSelected) {
          this.flipCardToBack(this.secondSelected);
          this.secondSelected.shakeProgress = 1;
        }
        this.notifyStateChange();
        setTimeout(() => {
          this.resetSelection();
          this.notifyStateChange();
        }, 550);
      }, 600);
    }
  }

  private resetSelection(): void {
    this.firstSelected = null;
    this.secondSelected = null;
    this.isProcessing = false;
  }

  public update(deltaTime: number): void {
    const flipSpeed = 2;
    for (const card of this.cards) {
      if (card.state === 'flipping') {
        card.flipProgress += deltaTime * flipSpeed;
        if (card.flipProgress >= 1) {
          card.flipProgress = 0;
          if (card.flipDirection === 'toFront') {
            card.state = 'shown';
          } else {
            card.state = 'hidden';
          }
        }
      }

      if (card.matchGlowProgress > 0) {
        card.matchGlowProgress -= deltaTime * 1.25;
        if (card.matchGlowProgress < 0) card.matchGlowProgress = 0;
      }

      if (card.shakeProgress > 0) {
        card.shakeProgress -= deltaTime * 10;
        if (card.shakeProgress < 0) card.shakeProgress = 0;
      }
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  public getCardAtPosition(x: number, y: number, cardWidth: number, cardHeight: number, gridOffsetX: number, gridOffsetY: number, gap: number): Card | null {
    for (const card of this.cards) {
      const cardX = gridOffsetX + card.col * (cardWidth + gap);
      const cardY = gridOffsetY + card.row * (cardHeight + gap);
      if (
        x >= cardX &&
        x <= cardX + cardWidth &&
        y >= cardY &&
        y <= cardY + cardHeight
      ) {
        return card;
      }
    }
    return null;
  }
}
