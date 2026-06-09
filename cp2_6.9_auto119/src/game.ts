import { Snake, Direction, Point } from './snake';

export const GRID_SIZE = 15;
export const CELL_SIZE = 30;

export type GameStatus = 'playing' | 'player1_win' | 'player2_win' | 'draw';

export class Game {
  gridSize: number;
  snake1: Snake;
  snake2: Snake;
  food: Point;
  status: GameStatus;
  aiMode: boolean;
  score1: number;
  score2: number;

  constructor() {
    this.gridSize = GRID_SIZE;
    this.snake1 = new Snake(2, 3, 'down', '#4A90D9');
    this.snake2 = new Snake(12, 11, 'up', '#D94A4A');
    this.food = { x: 7, y: 7 };
    this.status = 'playing';
    this.aiMode = false;
    this.score1 = 0;
    this.score2 = 0;
    this.spawnFood();
  }

  reset(): void {
    this.snake1 = new Snake(2, 3, 'down', '#4A90D9');
    this.snake2 = new Snake(12, 11, 'up', '#D94A4A');
    if (this.aiMode) {
      this.snake2.isAI = true;
    }
    this.status = 'playing';
    this.spawnFood();
  }

  toggleAIMode(): void {
    this.aiMode = !this.aiMode;
    this.snake2.isAI = this.aiMode;
  }

  setDirection(player: 1 | 2, dir: Direction): void {
    if (this.status !== 'playing') return;
    if (player === 1) {
      this.snake1.setDirection(dir);
    } else if (player === 2 && !this.snake2.isAI) {
      this.snake2.setDirection(dir);
    }
  }

  spawnFood(): void {
    const occupied = new Set<string>();
    for (const seg of this.snake1.body) occupied.add(`${seg.x},${seg.y}`);
    for (const seg of this.snake2.body) occupied.add(`${seg.x},${seg.y}`);

    const empties: Point[] = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          empties.push({ x, y });
        }
      }
    }

    if (empties.length === 0) {
      this.status = 'draw';
      return;
    }

    this.food = empties[Math.floor(Math.random() * empties.length)];
  }

  tick(): void {
    if (this.status !== 'playing') return;

    if (this.snake2.isAI) {
      this.snake2.aiDecide(this.gridSize, this.food, this.snake1, this.snake2);
    }

    this.snake1.move();
    this.snake2.move();

    if (this.snake1.head.x === this.food.x && this.snake1.head.y === this.food.y) {
      this.snake1.grow();
      this.score1++;
      this.spawnFood();
    }
    if (this.snake2.head.x === this.food.x && this.snake2.head.y === this.food.y) {
      this.snake2.grow();
      this.score2++;
      this.spawnFood();
    }

    const s1Out = this.isOutOfBounds(this.snake1.head);
    const s2Out = this.isOutOfBounds(this.snake2.head);
    const s1Self = this.snake1.checkSelfCollision();
    const s2Self = this.snake2.checkSelfCollision();
    const s1HitOther = this.snake1.checkOtherCollision(this.snake2);
    const s2HitOther = this.snake2.checkOtherCollision(this.snake1);
    const headCollision =
      this.snake1.head.x === this.snake2.head.x && this.snake1.head.y === this.snake2.head.y;

    const s1Dead = s1Out || s1Self || s1HitOther;
    const s2Dead = s2Out || s2Self || s2HitOther;

    if (headCollision) {
      if (this.snake1.body.length > this.snake2.body.length) {
        this.status = 'player1_win';
      } else if (this.snake2.body.length > this.snake1.body.length) {
        this.status = 'player2_win';
      } else {
        this.status = 'draw';
      }
      return;
    }

    if (s1Dead && s2Dead) {
      this.status = 'draw';
    } else if (s1Dead) {
      this.status = 'player2_win';
    } else if (s2Dead) {
      this.status = 'player1_win';
    }
  }

  private isOutOfBounds(p: Point): boolean {
    return p.x < 0 || p.x >= this.gridSize || p.y < 0 || p.y >= this.gridSize;
  }
}
