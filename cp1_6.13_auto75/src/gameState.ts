export type Player = 'red' | 'blue';
export type PieceType = 'infantry' | 'knight';
export type GameStatus = 'playing' | 'ended';

export interface Piece {
  id: string;
  owner: Player;
  type: PieceType;
  row: number;
  col: number;
  alive: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface MoveResult {
  success: boolean;
  attack?: {
    attacker: Piece;
    defender: Piece;
  };
  moved?: {
    piece: Piece;
    from: Position;
    to: Position;
  };
  gameOver?: Player;
}

export interface Footprint {
  row: number;
  col: number;
  startTime: number;
  duration: number;
}

export interface AttackEffect {
  row: number;
  col: number;
  startTime: number;
  duration: number;
  attacker: Piece;
  defender: Piece;
}

export interface RevealedPiece {
  piece: Piece;
  startTime: number;
  duration: number;
}

const BOARD_SIZE = 6;
const INFANTRY_COUNT = 3;
const KNIGHT_COUNT = 2;

export class GameState {
  private board: (Piece | null)[][] = [];
  private pieces: Piece[] = [];
  private currentPlayer: Player = 'red';
  private selectedPiece: Piece | null = null;
  private gameStatus: GameStatus = 'playing';
  private winner: Player | null = null;
  private footprints: Footprint[] = [];
  private attackEffects: AttackEffect[] = [];
  private revealedPieces: RevealedPiece[] = [];
  private logs: string[] = [];
  private turnStartTime: number = 0;
  private readonly turnDuration = 30000;

  constructor() {
    this.initBoard();
  }

  private initBoard(): void {
    this.board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      this.board[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        this.board[row][col] = null;
      }
    }

    this.pieces = [];
    this.placePieces('red', 0);
    this.placePieces('blue', BOARD_SIZE - 1);

    this.currentPlayer = 'red';
    this.selectedPiece = null;
    this.gameStatus = 'playing';
    this.winner = null;
    this.footprints = [];
    this.attackEffects = [];
    this.revealedPieces = [];
    this.logs = [];
    this.turnStartTime = Date.now();

    this.addLog('游戏开始！红方先行。');
  }

  private placePieces(player: Player, row: number): void {
    const cols = this.shuffleArray([0, 1, 2, 3, 4, 5]);
    let pieceIndex = 0;

    for (let i = 0; i < INFANTRY_COUNT; i++) {
      const col = cols[pieceIndex++];
      const piece: Piece = {
        id: `${player}-infantry-${i}`,
        owner: player,
        type: 'infantry',
        row,
        col,
        alive: true
      };
      this.pieces.push(piece);
      this.board[row][col] = piece;
    }

    for (let i = 0; i < KNIGHT_COUNT; i++) {
      const col = cols[pieceIndex++];
      const piece: Piece = {
        id: `${player}-knight-${i}`,
        owner: player,
        type: 'knight',
        row,
        col,
        alive: true
      };
      this.pieces.push(piece);
      this.board[row][col] = piece;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  getBoardSize(): number {
    return BOARD_SIZE;
  }

  getCurrentPlayer(): Player {
    return this.currentPlayer;
  }

  getSelectedPiece(): Piece | null {
    return this.selectedPiece;
  }

  getPieceAt(row: number, col: number): Piece | null {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null;
    }
    return this.board[row][col];
  }

  getAlivePieces(player: Player): Piece[] {
    return this.pieces.filter(p => p.owner === player && p.alive);
  }

  getGameStatus(): GameStatus {
    return this.gameStatus;
  }

  getWinner(): Player | null {
    return this.winner;
  }

  getFootprints(): Footprint[] {
    const now = Date.now();
    this.footprints = this.footprints.filter(f => now - f.startTime < f.duration);
    return this.footprints;
  }

  getAttackEffects(): AttackEffect[] {
    const now = Date.now();
    this.attackEffects = this.attackEffects.filter(e => now - e.startTime < e.duration);
    return this.attackEffects;
  }

  getRevealedPieces(): RevealedPiece[] {
    const now = Date.now();
    this.revealedPieces = this.revealedPieces.filter(r => now - r.startTime < r.duration);
    return this.revealedPieces;
  }

  getLogs(): string[] {
    return this.logs;
  }

  getTurnTimeRemaining(): number {
    const elapsed = Date.now() - this.turnStartTime;
    return Math.max(0, this.turnDuration - elapsed);
  }

  getTurnDuration(): number {
    return this.turnDuration;
  }

  selectPiece(row: number, col: number): boolean {
    if (this.gameStatus !== 'playing') return false;

    const piece = this.getPieceAt(row, col);
    if (!piece || piece.owner !== this.currentPlayer || !piece.alive) {
      this.selectedPiece = null;
      return false;
    }

    this.selectedPiece = piece;
    return true;
  }

  deselectPiece(): void {
    this.selectedPiece = null;
  }

  getValidMoves(piece: Piece): Position[] {
    if (!piece.alive) return [];

    const moves: Position[] = [];
    const { row, col } = piece;

    if (piece.type === 'infantry') {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];

      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (this.isValidPosition(newRow, newCol)) {
          const targetPiece = this.board[newRow][newCol];
          if (!targetPiece || targetPiece.owner !== piece.owner) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
    } else if (piece.type === 'knight') {
      const knightMoves = [
        [-2, -1], [-2, 1], [2, -1], [2, 1],
        [-1, -2], [-1, 2], [1, -2], [1, 2]
      ];

      for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (this.isValidPosition(newRow, newCol)) {
          if (this.isKnightPathClear(row, col, newRow, newCol)) {
            const targetPiece = this.board[newRow][newCol];
            if (!targetPiece || targetPiece.owner !== piece.owner) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        }
      }
    }

    return moves;
  }

  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  private isKnightPathClear(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const midRow = fromRow + (toRow - fromRow) / 2;
    const midCol = fromCol + (toCol - fromCol) / 2;

    if (Number.isInteger(midRow) && Number.isInteger(midCol)) {
      if (this.board[midRow][midCol] !== null) {
        return false;
      }
    }

    return true;
  }

  movePiece(targetRow: number, targetCol: number): MoveResult {
    if (this.gameStatus !== 'playing' || !this.selectedPiece) {
      return { success: false };
    }

    const piece = this.selectedPiece;
    const validMoves = this.getValidMoves(piece);
    const isValidMove = validMoves.some(m => m.row === targetRow && m.col === targetCol);

    if (!isValidMove) {
      return { success: false };
    }

    const fromPos = { row: piece.row, col: piece.col };
    const targetPiece = this.board[targetRow][targetCol];

    this.footprints.push({
      row: targetRow,
      col: targetCol,
      startTime: Date.now(),
      duration: 500
    });

    if (targetPiece && targetPiece.owner !== piece.owner) {
      this.attackEffects.push({
        row: targetRow,
        col: targetCol,
        startTime: Date.now(),
        duration: 300,
        attacker: piece,
        defender: targetPiece
      });

      this.revealedPieces.push({
        piece,
        startTime: Date.now(),
        duration: 500
      });
      this.revealedPieces.push({
        piece: targetPiece,
        startTime: Date.now(),
        duration: 500
      });

      targetPiece.alive = false;
      this.board[targetRow][targetCol] = null;

      const attackerType = piece.type === 'infantry' ? '步兵' : '骑士';
      const defenderType = targetPiece.type === 'infantry' ? '步兵' : '骑士';
      this.addLog(`${piece.owner === 'red' ? '红方' : '蓝方'}${attackerType}攻击并消灭了${targetPiece.owner === 'red' ? '红方' : '蓝方'}${defenderType}！`, 'attack');

      const result: MoveResult = {
        success: true,
        attack: {
          attacker: piece,
          defender: targetPiece
        },
        moved: {
          piece,
          from: fromPos,
          to: { row: targetRow, col: targetCol }
        }
      };

      const winner = this.checkWinCondition();
      if (winner) {
        this.gameStatus = 'ended';
        this.winner = winner;
        result.gameOver = winner;
        this.addLog(`游戏结束！${winner === 'red' ? '红方' : '蓝方'}获胜！`, 'attack');
      }

      this.board[piece.row][piece.col] = null;
      piece.row = targetRow;
      piece.col = targetCol;
      this.board[targetRow][targetCol] = piece;

      this.selectedPiece = null;
      this.switchPlayer();

      return result;
    }

    this.board[piece.row][piece.col] = null;
    piece.row = targetRow;
    piece.col = targetCol;
    this.board[targetRow][targetCol] = piece;

    const pieceType = piece.type === 'infantry' ? '步兵' : '骑士';
    this.addLog(`${piece.owner === 'red' ? '红方' : '蓝方'}${pieceType}移动到(${targetRow + 1}, ${targetCol + 1})`, 'move');

    const result: MoveResult = {
      success: true,
      moved: {
        piece,
        from: fromPos,
        to: { row: targetRow, col: targetCol }
      }
    };

    this.selectedPiece = null;
    this.switchPlayer();

    return result;
  }

  private switchPlayer(): void {
    this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
    this.turnStartTime = Date.now();
  }

  private checkWinCondition(): Player | null {
    const redAlive = this.getAlivePieces('red').length;
    const blueAlive = this.getAlivePieces('blue').length;

    if (redAlive === 0) return 'blue';
    if (blueAlive === 0) return 'red';
    return null;
  }

  private addLog(message: string, type: 'move' | 'attack' | 'system' = 'system'): void {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const prefix = type === 'attack' ? '⚔️ ' : type === 'move' ? '👣 ' : '📢 ';
    this.logs.push(`[${timestamp}] ${prefix}${message}`);

    if (this.logs.length > 15) {
      this.logs.shift();
    }
  }

  reset(): void {
    this.initBoard();
  }

  timeoutTurn(): void {
    if (this.gameStatus !== 'playing') return;

    this.addLog(`${this.currentPlayer === 'red' ? '红方' : '蓝方'}回合超时，跳过回合。`);
    this.selectedPiece = null;
    this.switchPlayer();
  }
}
