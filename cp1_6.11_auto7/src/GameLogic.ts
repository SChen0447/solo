import { Board, Block, Point, PathResult } from './Board';

export interface GameStateSnapshot {
  grid: (Block | null)[][];
  score: number;
  eliminatedCount: number;
  combo: number;
  maxCombo: number;
}

export interface GameStats {
  score: number;
  eliminatedCount: number;
  combo: number;
  maxCombo: number;
}

export enum GameState {
  IDLE = 'idle',
  SELECTING = 'selecting',
  ANIMATING = 'animating',
  CHAIN_REACTION = 'chain_reaction',
  GAME_OVER = 'game_over',
}

export type EliminatedPair = [Point, Point, string];

export class GameLogic {
  board: Board;
  state: GameState;
  selectedBlock: Point | null;
  score: number;
  eliminatedCount: number;
  combo: number;
  maxCombo: number;
  currentPath: PathResult | null;
  pathVisible: boolean;
  eliminatedPairs: EliminatedPair[];
  private history: GameStateSnapshot[];
  private historyLimit: number = 1;
  onCombo: ((combo: number) => void) | null = null;
  onScoreChange: ((score: number) => void) | null = null;
  onEliminate: ((pairs: EliminatedPair[]) => void) | null = null;

  constructor(board: Board) {
    this.board = board;
    this.state = GameState.IDLE;
    this.selectedBlock = null;
    this.score = 0;
    this.eliminatedCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentPath = null;
    this.pathVisible = false;
    this.eliminatedPairs = [];
    this.history = [];
  }

  reset(): void {
    this.state = GameState.IDLE;
    this.selectedBlock = null;
    this.score = 0;
    this.eliminatedCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentPath = null;
    this.pathVisible = false;
    this.eliminatedPairs = [];
    this.history = [];
    this.board.initialize(3);
  }

  getStats(): GameStats {
    return {
      score: this.score,
      eliminatedCount: this.eliminatedCount,
      combo: this.combo,
      maxCombo: this.maxCombo,
    };
  }

  canUndo(): boolean {
    return this.history.length > 0 && this.state === GameState.IDLE;
  }

  saveHistory(): void {
    const snapshot: GameStateSnapshot = {
      grid: this.board.cloneState(),
      score: this.score,
      eliminatedCount: this.eliminatedCount,
      combo: this.combo,
      maxCombo: this.maxCombo,
    };
    this.history.push(snapshot);
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const snapshot = this.history.pop()!;
    this.board.restoreState(snapshot.grid);
    this.score = snapshot.score;
    this.eliminatedCount = snapshot.eliminatedCount;
    this.combo = snapshot.combo;
    this.maxCombo = snapshot.maxCombo;
    this.selectedBlock = null;
    this.currentPath = null;
    this.pathVisible = false;
    this.state = GameState.IDLE;

    return true;
  }

  handleClick(point: Point): {
    action: 'none' | 'select' | 'deselect' | 'eliminate' | 'invalid';
    pathResult?: PathResult;
  } {
    if (this.state !== GameState.IDLE && this.state !== GameState.SELECTING) {
      return { action: 'none' };
    }

    const block = this.board.getBlock(point.row, point.col);
    if (!block || block.removed || block.removing) {
      return { action: 'none' };
    }

    if (!this.selectedBlock) {
      this.selectedBlock = point;
      this.state = GameState.SELECTING;
      return { action: 'select' };
    }

    if (this.selectedBlock.row === point.row && this.selectedBlock.col === point.col) {
      this.selectedBlock = null;
      this.state = GameState.IDLE;
      return { action: 'deselect' };
    }

    const firstBlock = this.board.getBlock(this.selectedBlock.row, this.selectedBlock.col);
    if (!firstBlock || firstBlock.type !== block.type) {
      this.triggerShake(point);
      this.selectedBlock = point;
      return { action: 'select' };
    }

    const pathResult = this.board.findPath(this.selectedBlock, point);
    this.currentPath = pathResult;
    this.pathVisible = true;

    if (pathResult.valid) {
      this.saveHistory();

      const result: EliminatedPair = [
        { ...this.selectedBlock },
        { ...point },
        firstBlock.color,
      ];
      this.eliminatedPairs = [result];

      this.markForRemoval(this.selectedBlock);
      this.markForRemoval(point);
      this.addScore(pathResult.turnCount);
      this.eliminatedCount += 2;
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      if (this.onCombo && this.combo >= 2) {
        this.onCombo(this.combo);
      }
      if (this.onScoreChange) {
        this.onScoreChange(this.score);
      }
      if (this.onEliminate) {
        this.onEliminate(this.eliminatedPairs);
      }

      this.selectedBlock = null;
      this.state = GameState.ANIMATING;
      return { action: 'eliminate', pathResult };
    } else {
      this.triggerShake(point);
      this.triggerShake(this.selectedBlock);
      this.selectedBlock = null;
      this.state = GameState.IDLE;
      return { action: 'invalid' };
    }
  }

  markForRemoval(point: Point): void {
    const block = this.board.getBlock(point.row, point.col);
    if (block) {
      block.removing = true;
      block.removeProgress = 0;
    }
  }

  triggerShake(point: Point): void {
    const block = this.board.getBlock(point.row, point.col);
    if (block) {
      block.shakeProgress = 0;
      block.shakeX = 0;
      block.shakeY = 0;
    }
  }

  addScore(turnCount: number): void {
    const baseScore = 100;
    const turnBonus = (2 - turnCount) * 25;
    const comboBonus = this.combo * 50;
    this.score += baseScore + turnBonus + comboBonus;
  }

  updateAnimations(dt: number): {
    falling: boolean;
    removing: boolean;
    chainReactionReady: boolean;
  } {
    let anyFalling = false;
    let anyRemoving = false;
    let allRemovedDone = true;

    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const block = this.board.getBlock(r, c);
        if (!block) continue;

        if (block.removing) {
          block.removeProgress += dt / 0.35;
          anyRemoving = true;
          if (block.removeProgress < 1) {
            allRemovedDone = false;
          }
        }

        if (block.shakeProgress < 1) {
          block.shakeProgress += dt / 0.3;
          const t = block.shakeProgress;
          block.shakeX = Math.sin(t * Math.PI * 6) * (1 - t) * 5;
          block.shakeY = Math.sin(t * Math.PI * 4 + 1) * (1 - t) * 3;
        } else {
          block.shakeX = 0;
          block.shakeY = 0;
        }

        if (block.fadeIn && block.fadeInProgress < 1) {
          block.fadeInProgress = Math.min(1, block.fadeInProgress + dt / 0.4);
          block.rotation = (1 - block.fadeInProgress) * Math.PI * 2;
          block.scale = 0.5 + block.fadeInProgress * 0.5;
        } else if (block.fadeIn) {
          block.fadeIn = false;
          block.rotation = 0;
          block.scale = 1;
        }

        if (block.falling) {
          anyFalling = true;
          block.fallProgress += dt / block.fallDuration;

          if (block.fallProgress >= 1) {
            block.falling = false;
            block.fallProgress = 1;
            block.row = block.fallTargetRow;
          }
        }
      }
    }

    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const block = this.board.getBlock(r, c);
        if (block && block.removing && block.removeProgress >= 1) {
          block.removed = true;
        }
      }
    }

    const chainReady = allRemovedDone && !anyRemoving && this.eliminatedPairs.length > 0;

    return {
      falling: anyFalling,
      removing: anyRemoving,
      chainReactionReady: chainReady,
    };
  }

  processGravity(): boolean {
    const fell = this.board.applyGravity();
    this.pathVisible = false;
    this.currentPath = null;
    return fell;
  }

  checkAndProcessChainReaction(): boolean {
    const anyPairs = this.board.findAnyValidPair();
    if (!anyPairs) {
      this.combo = 0;
      this.eliminatedPairs = [];
      this.state = GameState.IDLE;
      return false;
    }

    const result = this.handleClick(anyPairs[1]);
    if (result.action === 'eliminate') {
      this.state = GameState.CHAIN_REACTION;
      return true;
    }

    this.combo = 0;
    this.eliminatedPairs = [];
    this.state = GameState.IDLE;
    return false;
  }

  shuffleBoard(): void {
    this.board.shuffleRemaining();
    this.selectedBlock = null;
    this.currentPath = null;
    this.pathVisible = false;
    this.combo = 0;
    this.history = [];
  }

  clearPath(): void {
    this.pathVisible = false;
    this.currentPath = null;
  }

  isAnimating(): boolean {
    return (
      this.state === GameState.ANIMATING ||
      this.state === GameState.CHAIN_REACTION
    );
  }

  hasValidMoves(): boolean {
    return this.board.findAnyValidPair() !== null;
  }

  checkGameOver(): boolean {
    if (this.board.isGameComplete()) {
      this.state = GameState.GAME_OVER;
      return true;
    }
    if (!this.hasValidMoves() && this.board.hasAnyBlocks()) {
      return false;
    }
    return false;
  }
}
