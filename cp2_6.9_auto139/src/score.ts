import type { Stone } from './stone';

export interface RoundScore {
  red: number;
  blue: number;
}

export class ScoreBoard {
  roundHistory: RoundScore[];
  currentRound: number;
  totalRed: number;
  totalBlue: number;

  constructor() {
    this.roundHistory = [];
    this.currentRound = 1;
    this.totalRed = 0;
    this.totalBlue = 0;
  }

  calculateDistances(stones: Stone[], centerX: number, centerY: number): Map<Stone, number> {
    const distances = new Map<Stone, number>();
    for (const stone of stones) {
      const dx = stone.x - centerX;
      const dy = stone.y - centerY;
      distances.set(stone, Math.sqrt(dx * dx + dy * dy));
    }
    return distances;
  }

  calculateRoundScore(stones: Stone[], centerX: number, centerY: number): RoundScore {
    if (stones.length === 0) {
      return { red: 0, blue: 0 };
    }

    const distances = this.calculateDistances(stones, centerX, centerY);

    const sortedStones = Array.from(stones).sort(
      (a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity)
    );

    const closest = sortedStones[0];
    const closestColor = closest.color;
    const closestDist = distances.get(closest) ?? Infinity;

    let score = 0;
    for (const stone of sortedStones) {
      if (stone.color !== closestColor) break;
      const dist = distances.get(stone) ?? Infinity;
      if (dist <= 60) {
        score++;
      }
    }

    const roundScore: RoundScore = {
      red: closestColor === 'red' ? score : 0,
      blue: closestColor === 'blue' ? score : 0
    };

    this.roundHistory.push(roundScore);
    this.totalRed += roundScore.red;
    this.totalBlue += roundScore.blue;
    this.currentRound++;

    return roundScore;
  }

  reset(): void {
    this.roundHistory = [];
    this.currentRound = 1;
    this.totalRed = 0;
    this.totalBlue = 0;
  }
}
