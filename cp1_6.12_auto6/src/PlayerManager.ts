import type { Player, Position } from './GameBoard';
import { Board } from './GameBoard';

export type GameMode = 'pvp' | 'pve';
export type GamePhase = 'playing' | 'eliminating' | 'ended';

export interface GameState {
  currentPlayer: Player;
  scores: { red: number; blue: number };
  turnCount: number;
  phase: GamePhase;
  winner: Player | 'draw' | null;
  mode: GameMode;
}

type EventCallback = (state: GameState) => void;
type MoveCallback = (pos: Position, player: Player) => void;
type ToastCallback = (msg: string) => void;

export class PlayerManager {
  private board: Board;
  private currentPlayer: Player = 'red';
  private scores = { red: 0, blue: 0 };
  private turnCount: number = 1;
  private phase: GamePhase = 'playing';
  private winner: Player | 'draw' | null = null;
  private mode: GameMode = 'pve';
  private aiThinkingTimeout: number | null = null;
  private aiPlayer: Player = 'blue';

  private listeners: Set<EventCallback> = new Set();
  private moveListeners: Set<MoveCallback> = new Set();
  private toastListeners: Set<ToastCallback> = new Set();
  private gameOverListeners: Set<(state: GameState) => void> = new Set();

  constructor(board: Board) {
    this.board = board;
  }

  public setState(mode: GameMode): void {
    this.mode = mode;
    this.reset();
  }

  public getMode(): GameMode {
    return this.mode;
  }

  public getState(): GameState {
    return {
      currentPlayer: this.currentPlayer,
      scores: { ...this.scores },
      turnCount: this.turnCount,
      phase: this.phase,
      winner: this.winner,
      mode: this.mode
    };
  }

  public reset(): void {
    this.currentPlayer = 'red';
    this.scores = { red: 0, blue: 0 };
    this.turnCount = 1;
    this.phase = 'playing';
    this.winner = null;
    this.clearAiTimeout();
    this.emit();
  }

  public onStateChange(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public onMove(callback: MoveCallback): () => void {
    this.moveListeners.add(callback);
    return () => this.moveListeners.delete(callback);
  }

  public onToast(callback: ToastCallback): () => void {
    this.toastListeners.add(callback);
    return () => this.toastListeners.delete(callback);
  }

  public onGameOver(callback: (state: GameState) => void): () => void {
    this.gameOverListeners.add(callback);
    return () => this.gameOverListeners.delete(callback);
  }

  private emitToast(msg: string): void {
    this.toastListeners.forEach(fn => fn(msg));
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  private emitMove(pos: Position, player: Player): void {
    this.moveListeners.forEach(fn => fn(pos, player));
  }

  public isPlayerTurn(player: Player): boolean {
    if (this.phase !== 'playing') return false;
    if (this.mode === 'pve' && player === this.aiPlayer) return false;
    return this.currentPlayer === player;
  }

  public canHumanPlay(): boolean {
    if (this.phase !== 'playing') return false;
    if (this.mode === 'pvp') return true;
    return this.currentPlayer !== this.aiPlayer;
  }

  public handlePlayerMove(row: number, col: number): boolean {
    if (!this.canHumanPlay()) return false;
    return this.attemptMove(row, col, this.currentPlayer);
  }

  private attemptMove(row: number, col: number, player: Player): boolean {
    if (this.phase !== 'playing') return false;

    if (!this.board.canPlace(row, col)) {
      this.emitToast('该位置已被占用！');
      return false;
    }

    const now = performance.now();
    const placed = this.board.placePiece(row, col, player, now);
    if (!placed) return false;

    this.emitMove({ row, col }, player);
    this.checkForEliminations(player);
    return true;
  }

  private checkForEliminations(player: Player): void {
    const lines = this.board.findMatchingLines(player);
    if (lines.length > 0) {
      this.phase = 'eliminating';
      this.board.setLocked(true);
      const enemies = this.board.getEnemiesOnLines(lines, player);
      if (enemies.length > 0) {
        const now = performance.now();
        this.board.markForElimination(enemies, now);
        setTimeout(() => {
          this.board.finalizeElimination();
          this.board.setLocked(false);
          this.afterMoveCheck(player);
        }, 320);
      } else {
        this.board.setLocked(false);
        this.afterMoveCheck(player);
      }
    } else {
      this.afterMoveCheck(player);
    }
  }

  private afterMoveCheck(justPlayed: Player): void {
    this.updateScores();

    const redCount = this.board.countPieces('red');
    const blueCount = this.board.countPieces('blue');

    if (redCount === 0 && this.turnCount > 1) {
      this.endGame('blue');
      return;
    }
    if (blueCount === 0 && this.turnCount > 1) {
      this.endGame('red');
      return;
    }

    if (this.board.isFull()) {
      this.endGame(null);
      return;
    }

    this.switchPlayer(justPlayed);
    this.phase = 'playing';
    this.emit();

    if (this.mode === 'pve' && this.currentPlayer === this.aiPlayer) {
      this.scheduleAiMove();
    }
  }

  private updateScores(): void {
    this.scores.red = this.board.calculateScore('red');
    this.scores.blue = this.board.calculateScore('blue');
  }

  private switchPlayer(justPlayed: Player): void {
    if (justPlayed === 'red') {
      this.currentPlayer = 'blue';
    } else {
      this.currentPlayer = 'red';
      this.turnCount++;
    }
  }

  private endGame(winner: Player | null): void {
    this.phase = 'ended';
    this.clearAiTimeout();

    if (winner === null) {
      if (this.scores.red > this.scores.blue) {
        this.winner = 'red';
      } else if (this.scores.blue > this.scores.red) {
        this.winner = 'blue';
      } else {
        this.winner = 'draw';
      }
    } else {
      this.winner = winner;
    }

    const state = this.getState();
    this.emit();
    this.gameOverListeners.forEach(fn => fn(state));
  }

  private scheduleAiMove(): void {
    if (this.phase !== 'playing') return;
    this.clearAiTimeout();
    const delay = 300 + Math.random() * 200;
    this.aiThinkingTimeout = window.setTimeout(() => this.performAiMove(), delay);
  }

  private performAiMove(): void {
    if (this.phase !== 'playing' || this.currentPlayer !== this.aiPlayer) return;
    const empty = this.board.getEmptyPositions();
    if (empty.length === 0) return;

    const choice = empty[Math.floor(Math.random() * empty.length)];
    this.attemptMove(choice.row, choice.col, this.aiPlayer);
  }

  private clearAiTimeout(): void {
    if (this.aiThinkingTimeout !== null) {
      clearTimeout(this.aiThinkingTimeout);
      this.aiThinkingTimeout = null;
    }
  }

  public toggleMode(): GameMode {
    this.clearAiTimeout();
    this.mode = this.mode === 'pvp' ? 'pve' : 'pvp';
    return this.mode;
  }
}
