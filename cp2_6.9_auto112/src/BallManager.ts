export interface Ball {
  id: string;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPotted: boolean;
  isCue: boolean;
}

export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

const BALL_COLORS: { [key: number]: string } = {
  1: '#FFD700',
  2: '#0055A4',
  3: '#FF3B30',
  4: '#7B3F00',
  5: '#FF8C00',
  6: '#228B22',
  7: '#8B0000',
  8: '#000000',
  9: '#FFD700',
  10: '#0055A4',
  11: '#FF3B30',
  12: '#7B3F00',
  13: '#FF8C00',
  14: '#228B22',
  15: '#8B0000'
};

const BALL_RADIUS = 12;
const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 500;
const BORDER_WIDTH = 30;
const POCKET_RADIUS = 18;
const FRICTION = 0.98;
const MIN_SPEED = 0.1;

export class BallManager {
  balls: Ball[] = [];
  pockets: Pocket[] = [];
  score: number = 0;
  remainingBalls: number = 15;
  cueResetCount: number = 0;
  onScoreChange?: () => void;
  onBallPotted?: (x: number, y: number, color: string) => void;

  constructor() {
    this.initPockets();
    this.createInitialBalls();
  }

  private initPockets(): void {
    this.pockets = [
      { x: BORDER_WIDTH, y: BORDER_WIDTH, radius: POCKET_RADIUS },
      { x: TABLE_WIDTH / 2, y: BORDER_WIDTH, radius: POCKET_RADIUS },
      { x: TABLE_WIDTH - BORDER_WIDTH, y: BORDER_WIDTH, radius: POCKET_RADIUS },
      { x: BORDER_WIDTH, y: TABLE_HEIGHT - BORDER_WIDTH, radius: POCKET_RADIUS },
      { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - BORDER_WIDTH, radius: POCKET_RADIUS },
      { x: TABLE_WIDTH - BORDER_WIDTH, y: TABLE_HEIGHT - BORDER_WIDTH, radius: POCKET_RADIUS }
    ];
  }

  private createInitialBalls(): void {
    this.balls = [];
    this.score = 0;
    this.remainingBalls = 15;
    this.cueResetCount = 0;

    const cueBall: Ball = {
      id: 'cue',
      number: 0,
      x: TABLE_WIDTH * 0.25,
      y: TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: '#FFFFFF',
      isPotted: false,
      isCue: true
    };
    this.balls.push(cueBall);

    const startX = TABLE_WIDTH * 0.7;
    const startY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2 + 0.5;

    let number = 1;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = startX + row * spacing * Math.cos(Math.PI / 6);
        const y = startY + (col - row / 2) * spacing;

        const ball: Ball = {
          id: `ball-${number}`,
          number: number,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: BALL_COLORS[number] || '#FFFFFF',
          isPotted: false,
          isCue: false
        };
        this.balls.push(ball);
        number++;
      }
    }

    this.notifyScoreChange();
  }

  getActiveBalls(): Ball[] {
    return this.balls.filter(b => !b.isPotted);
  }

  getCueBall(): Ball | undefined {
    return this.balls.find(b => b.isCue);
  }

  updatePhysics(): void {
    const activeBalls = this.getActiveBalls();

    for (const ball of activeBalls) {
      if (ball.isPotted) continue;

      ball.x += ball.vx;
      ball.y += ball.vy;

      ball.vx *= FRICTION;
      ball.vy *= FRICTION;

      if (Math.abs(ball.vx) < MIN_SPEED) ball.vx = 0;
      if (Math.abs(ball.vy) < MIN_SPEED) ball.vy = 0;

      this.handleWallCollision(ball);
    }

    this.handleBallCollisions();
    this.checkPockets();
  }

  private handleWallCollision(ball: Ball): void {
    const leftLimit = BORDER_WIDTH + ball.radius;
    const rightLimit = TABLE_WIDTH - BORDER_WIDTH - ball.radius;
    const topLimit = BORDER_WIDTH + ball.radius;
    const bottomLimit = TABLE_HEIGHT - BORDER_WIDTH - ball.radius;

    if (ball.x <= leftLimit) {
      ball.x = leftLimit;
      ball.vx = -ball.vx;
    } else if (ball.x >= rightLimit) {
      ball.x = rightLimit;
      ball.vx = -ball.vx;
    }

    if (ball.y <= topLimit) {
      ball.y = topLimit;
      ball.vy = -ball.vy;
    } else if (ball.y >= bottomLimit) {
      ball.y = bottomLimit;
      ball.vy = -ball.vy;
    }
  }

  private handleBallCollisions(): void {
    const activeBalls = this.getActiveBalls();
    const cellSize = BALL_RADIUS * 2;
    const grid: { [key: string]: Ball[] } = {};

    for (const ball of activeBalls) {
      const cellX = Math.floor(ball.x / cellSize);
      const cellY = Math.floor(ball.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(ball);
    }

    const checked = new Set<string>();

    for (const ball of activeBalls) {
      const cellX = Math.floor(ball.x / cellSize);
      const cellY = Math.floor(ball.y / cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          const cellBalls = grid[key];
          if (!cellBalls) continue;

          for (const other of cellBalls) {
            if (ball.id >= other.id) continue;
            const pairKey = `${ball.id}-${other.id}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);

            this.resolveBallCollision(ball, other);
          }
        }
      }
    }
  }

  private resolveBallCollision(ball1: Ball, ball2: Ball): void {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = ball1.radius + ball2.radius;

    if (distance < minDist && distance > 0) {
      const nx = dx / distance;
      const ny = dy / distance;

      const overlap = minDist - distance;
      const halfOverlap = overlap / 2;

      ball1.x -= nx * halfOverlap;
      ball1.y -= ny * halfOverlap;
      ball2.x += nx * halfOverlap;
      ball2.y += ny * halfOverlap;

      const dvx = ball1.vx - ball2.vx;
      const dvy = ball1.vy - ball2.vy;
      const dvDotN = dvx * nx + dvy * ny;

      if (dvDotN > 0) {
        ball1.vx -= dvDotN * nx;
        ball1.vy -= dvDotN * ny;
        ball2.vx += dvDotN * nx;
        ball2.vy += dvDotN * ny;
      }
    }
  }

  private checkPockets(): void {
    const activeBalls = this.getActiveBalls();

    for (const ball of activeBalls) {
      if (ball.isPotted) continue;

      for (const pocket of this.pockets) {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < pocket.radius) {
          this.potBall(ball);
          break;
        }
      }
    }
  }

  private potBall(ball: Ball): void {
    ball.isPotted = true;
    ball.vx = 0;
    ball.vy = 0;

    if (ball.isCue) {
      this.cueResetCount++;
      this.resetCueBall();
    } else {
      this.score += ball.number;
      this.remainingBalls--;
      if (this.onBallPotted) {
        this.onBallPotted(ball.x, ball.y, ball.color);
      }
    }

    this.notifyScoreChange();
  }

  private resetCueBall(): void {
    const cueBall = this.getCueBall();
    if (cueBall) {
      cueBall.isPotted = false;
      cueBall.x = TABLE_WIDTH * 0.25;
      cueBall.y = TABLE_HEIGHT / 2;
      cueBall.vx = 0;
      cueBall.vy = 0;
    }
  }

  areAllBallsStopped(): boolean {
    const activeBalls = this.getActiveBalls();
    return activeBalls.every(b => b.vx === 0 && b.vy === 0);
  }

  strikeCueBall(angle: number, power: number): void {
    const cueBall = this.getCueBall();
    if (cueBall) {
      cueBall.vx = Math.cos(angle) * power;
      cueBall.vy = Math.sin(angle) * power;
    }
  }

  reset(): void {
    this.createInitialBalls();
  }

  private notifyScoreChange(): void {
    if (this.onScoreChange) {
      this.onScoreChange();
    }
  }
}
