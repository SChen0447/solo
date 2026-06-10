export type Player = 1 | 2;
export type Position = { x: number; y: number };
export type GameStatus = 'playing' | 'ended';
export type SkillType = 'reinforce' | 'fuse';
export type SkillState = { reinforce: number; fuse: number };
export type ActiveSkill = { type: SkillType; player: Player } | null;

export interface CellState {
  owner: Player | null;
  isReinforced: boolean;
  reinforceEndTime: number;
  assimilating: boolean;
  assimilationProgress: number;
  assimilationFrom: Player | null;
  assimilationStartTime: number;
  placeAnimationProgress: number;
}

export type ScoreResult = { player1: number; player2: number };

export const BOARD_SIZE = 8;
export const REINFORCE_DURATION = 2000;
export const ASSIMILATION_DURATION = 400;
export const PLACE_ANIMATION_DURATION = 200;

export const PLAYER_COLORS: Record<Player, string> = {
  1: '#4A90D9',
  2: '#E74C3C'
};

export const PLAYER_NAMES: Record<Player, string> = {
  1: '蓝方',
  2: '红方'
};

const NEIGHBORS: Position[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },                    { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
];

function createEmptyCell(): CellState {
  return {
    owner: null,
    isReinforced: false,
    reinforceEndTime: 0,
    assimilating: false,
    assimilationProgress: 0,
    assimilationFrom: null,
    assimilationStartTime: 0,
    placeAnimationProgress: 1
  };
}

export class GameEngine {
  private board: CellState[][];
  private currentPlayer: Player;
  private status: GameStatus;
  private winner: Player | null;
  private player1Skills: SkillState;
  private player2Skills: SkillState;
  private activeSkill: ActiveSkill;
  private fuseFirstCell: Position | null;
  private stateChangeCallbacks: Array<() => void>;
  private gameEndCallbacks: Array<(winner: Player | null, scores: ScoreResult) => void>;
  private assimilationEvents: Array<{ pos: Position; from: Player; to: Player }>;
  private placeEvents: Array<{ pos: Position; player: Player }>;

  constructor() {
    this.board = [];
    this.currentPlayer = 1;
    this.status = 'playing';
    this.winner = null;
    this.player1Skills = { reinforce: 2, fuse: 1 };
    this.player2Skills = { reinforce: 2, fuse: 1 };
    this.activeSkill = null;
    this.fuseFirstCell = null;
    this.stateChangeCallbacks = [];
    this.gameEndCallbacks = [];
    this.assimilationEvents = [];
    this.placeEvents = [];
    this.initBoard();
  }

  private initBoard(): void {
    this.board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      const row: CellState[] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        row.push(createEmptyCell());
      }
      this.board.push(row);
    }
  }

  onStateChange(callback: () => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  onGameEnd(callback: (winner: Player | null, scores: ScoreResult) => void): void {
    this.gameEndCallbacks.push(callback);
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(cb => cb());
  }

  private notifyGameEnd(winner: Player | null, scores: ScoreResult): void {
    this.gameEndCallbacks.forEach(cb => cb(winner, scores));
  }

  getBoard(): CellState[][] {
    return this.board;
  }

  getCell(x: number, y: number): CellState | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.board[y][x];
  }

  getCurrentPlayer(): Player {
    return this.currentPlayer;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getWinner(): Player | null {
    return this.winner;
  }

  getSkills(player: Player): SkillState {
    return player === 1 ? { ...this.player1Skills } : { ...this.player2Skills };
  }

  getActiveSkill(): ActiveSkill {
    return this.activeSkill;
  }

  setActiveSkill(skill: ActiveSkill): void {
    this.activeSkill = skill;
    if (skill?.type !== 'fuse') {
      this.fuseFirstCell = null;
    }
    this.notifyStateChange();
  }

  getFuseFirstCell(): Position | null {
    return this.fuseFirstCell;
  }

  consumeAssimilationEvents(): Array<{ pos: Position; from: Player; to: Player }> {
    const events = [...this.assimilationEvents];
    this.assimilationEvents = [];
    return events;
  }

  consumePlaceEvents(): Array<{ pos: Position; player: Player }> {
    const events = [...this.placeEvents];
    this.placeEvents = [];
    return events;
  }

  getScore(): ScoreResult {
    let p1 = 0, p2 = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.board[y][x];
        if (cell.owner === 1) p1++;
        else if (cell.owner === 2) p2++;
      }
    }
    return { player1: p1, player2: p2 };
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
  }

  private isCellSurrounded(x: number, y: number, opponent: Player): boolean {
    for (const n of NEIGHBORS) {
      const nx = x + n.x;
      const ny = y + n.y;
      if (!this.isInBounds(nx, ny)) continue;
      const cell = this.board[ny][nx];
      if (cell.owner !== opponent) return false;
    }
    return true;
  }

  private findCellsToAssimilate(): Position[] {
    const toAssimilate: Position[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.board[y][x];
        if (!cell.owner || cell.isReinforced || cell.assimilating) continue;
        const opponent: Player = cell.owner === 1 ? 2 : 1;
        if (this.isCellSurrounded(x, y, opponent)) {
          toAssimilate.push({ x, y });
        }
      }
    }
    return toAssimilate;
  }

  startAssimilation(positions: Position[], now: number): void {
    for (const pos of positions) {
      const cell = this.board[pos.y][pos.x];
      if (!cell.owner || cell.assimilating) continue;
      cell.assimilating = true;
      cell.assimilationFrom = cell.owner;
      cell.assimilationStartTime = now;
      cell.assimilationProgress = 0;
    }
  }

  updateTimers(now: number): void {
    let needUpdate = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.board[y][x];
        
        if (cell.isReinforced && now >= cell.reinforceEndTime) {
          cell.isReinforced = false;
          cell.reinforceEndTime = 0;
          needUpdate = true;
        }

        if (cell.assimilating) {
          const elapsed = now - cell.assimilationStartTime;
          const progress = Math.min(1, elapsed / ASSIMILATION_DURATION);
          if (progress !== cell.assimilationProgress) {
            cell.assimilationProgress = progress;
            needUpdate = true;
          }
          if (progress >= 1 && cell.assimilationFrom !== null) {
            const from = cell.assimilationFrom;
            cell.owner = cell.assimilationFrom === 1 ? 2 : 1;
            const to = cell.owner;
            cell.assimilating = false;
            cell.assimilationProgress = 0;
            cell.assimilationFrom = null;
            cell.assimilationStartTime = 0;
            this.assimilationEvents.push({ pos: { x, y }, from, to });
            needUpdate = true;
          }
        }

        if (cell.placeAnimationProgress < 1) {
          cell.placeAnimationProgress = Math.min(1, cell.placeAnimationProgress + 0.05);
          needUpdate = true;
        }
      }
    }
    if (needUpdate) {
      this.notifyStateChange();
    }
  }

  placeStone(x: number, y: number): boolean {
    if (this.status !== 'playing') return false;
    if (!this.isInBounds(x, y)) return false;
    if (this.board[y][x].owner !== null) return false;
    if (this.activeSkill !== null) return false;

    const cell = this.board[y][x];
    cell.owner = this.currentPlayer;
    cell.placeAnimationProgress = 0;
    this.placeEvents.push({ pos: { x, y }, player: this.currentPlayer });

    this.endTurn();
    return true;
  }

  useReinforceSkill(x: number, y: number): boolean {
    if (this.status !== 'playing') return false;
    if (!this.isInBounds(x, y)) return false;
    const cell = this.board[y][x];
    if (cell.owner !== this.currentPlayer) return false;
    if (cell.isReinforced) return false;

    const skills = this.currentPlayer === 1 ? this.player1Skills : this.player2Skills;
    if (skills.reinforce <= 0) return false;

    skills.reinforce--;
    cell.isReinforced = true;
    cell.reinforceEndTime = performance.now() + REINFORCE_DURATION;
    this.activeSkill = null;
    this.endTurn();
    return true;
  }

  useFuseSkill(x: number, y: number): boolean {
    if (this.status !== 'playing') return false;
    if (!this.isInBounds(x, y)) return false;
    const cell = this.board[y][x];
    if (cell.owner !== this.currentPlayer) return false;

    const skills = this.currentPlayer === 1 ? this.player1Skills : this.player2Skills;
    if (skills.fuse <= 0) return false;

    if (!this.fuseFirstCell) {
      this.fuseFirstCell = { x, y };
      this.notifyStateChange();
      return true;
    }

    const first = this.fuseFirstCell;
    if (first.x !== x && first.y !== y) {
      this.fuseFirstCell = null;
      this.notifyStateChange();
      return false;
    }

    if (first.x === x && first.y === y) {
      this.fuseFirstCell = null;
      this.notifyStateChange();
      return false;
    }

    skills.fuse--;
    const minX = Math.min(first.x, x);
    const maxX = Math.max(first.x, x);
    const minY = Math.min(first.y, y);
    const maxY = Math.max(first.y, y);

    if (first.y === y) {
      for (let cx = minX; cx <= maxX; cx++) {
        const c = this.board[y][cx];
        if (c.owner === null) {
          c.owner = this.currentPlayer;
          c.placeAnimationProgress = 0;
          this.placeEvents.push({ pos: { x: cx, y }, player: this.currentPlayer });
        }
      }
    } else {
      for (let cy = minY; cy <= maxY; cy++) {
        const c = this.board[cy][x];
        if (c.owner === null) {
          c.owner = this.currentPlayer;
          c.placeAnimationProgress = 0;
          this.placeEvents.push({ pos: { x, y: cy }, player: this.currentPlayer });
        }
      }
    }

    this.fuseFirstCell = null;
    this.activeSkill = null;
    this.endTurn();
    return true;
  }

  private endTurn(): void {
    const toAssimilate = this.findCellsToAssimilate();
    if (toAssimilate.length > 0) {
      this.startAssimilation(toAssimilate, performance.now());
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

    if (this.checkGameEnd()) {
      this.status = 'ended';
      const scores = this.getScore();
      if (scores.player1 > scores.player2) {
        this.winner = 1;
      } else if (scores.player2 > scores.player1) {
        this.winner = 2;
      } else {
        this.winner = null;
      }
      this.notifyGameEnd(this.winner, scores);
    }

    this.notifyStateChange();
  }

  private checkGameEnd(): boolean {
    let emptyCount = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.board[y][x].owner === null) emptyCount++;
      }
    }
    if (emptyCount === 0) return true;
    return false;
  }

  resetGame(): void {
    this.initBoard();
    this.currentPlayer = 1;
    this.status = 'playing';
    this.winner = null;
    this.player1Skills = { reinforce: 2, fuse: 1 };
    this.player2Skills = { reinforce: 2, fuse: 1 };
    this.activeSkill = null;
    this.fuseFirstCell = null;
    this.assimilationEvents = [];
    this.placeEvents = [];
    this.notifyStateChange();
  }
}
