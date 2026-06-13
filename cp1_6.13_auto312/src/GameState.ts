export type GamePhase = 'menu' | 'playing' | 'paused' | 'ended';

export class GameState {
  phase: GamePhase = 'menu';
  currentTurn: number = 1;
  currentPlayer: 0 | 1 = 0;
  timeRemaining: number = 300;
  elapsedTime: number = 0;
  winner: 0 | 1 | null = null;
  endTimer: number = 0;

  private lastTime: number = 0;

  update(deltaTime: number): void {
    if (this.phase !== 'playing') return;

    this.elapsedTime += deltaTime;
    this.timeRemaining -= deltaTime;

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
    }
  }

  startGame(): void {
    this.phase = 'playing';
    this.currentTurn = 1;
    this.currentPlayer = 0;
    this.timeRemaining = 300;
    this.elapsedTime = 0;
    this.winner = null;
    this.endTimer = 0;
    this.lastTime = performance.now();
  }

  togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastTime = performance.now();
    }
  }

  switchTurn(): void {
    this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
    if (this.currentPlayer === 0) {
      this.currentTurn++;
    }
  }

  getEruptionInterval(): number {
    if (this.elapsedTime < 60) return 5000;
    if (this.elapsedTime < 120) return 3000;
    return 1500;
  }

  endGame(winner: 0 | 1): void {
    this.phase = 'ended';
    this.winner = winner;
    this.endTimer = 5000;
  }

  formatTime(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = Math.floor(this.timeRemaining % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
