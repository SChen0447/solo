export type Player = 'red' | 'blue';
export type CellState = Player | null;

export interface Position {
  row: number;
  col: number;
}

export interface PlacedPiece {
  player: Player;
  scale: number;
  placedAt: number;
  isEliminating: boolean;
  eliminateStart: number;
  eliminated: boolean;
}

export interface LineResult {
  positions: Position[];
  player: Player;
}

export class Board {
  public readonly size = 4;
  private grid: (PlacedPiece | null)[][] = [];
  private isLocked: boolean = false;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.grid = [];
    for (let r = 0; r < this.size; r++) {
      const row: (PlacedPiece | null)[] = [];
      for (let c = 0; c < this.size; c++) {
        row.push(null);
      }
      this.grid.push(row);
    }
    this.isLocked = false;
  }

  public getCell(row: number, col: number): PlacedPiece | null {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
    return this.grid[row][col];
  }

  public getAllCells(): (PlacedPiece | null)[][] {
    return this.grid;
  }

  public canPlace(row: number, col: number): boolean {
    if (this.isLocked) return false;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
    const cell = this.grid[row][col];
    if (cell === null) return true;
    if (cell.eliminated) return true;
    return false;
  }

  public placePiece(row: number, col: number, player: Player, now: number): boolean {
    if (!this.canPlace(row, col)) return false;
    this.grid[row][col] = {
      player,
      scale: 0,
      placedAt: now,
      isEliminating: false,
      eliminateStart: 0,
      eliminated: false
    };
    return true;
  }

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  public getLocked(): boolean {
    return this.isLocked;
  }

  public findMatchingLines(placedBy: Player): LineResult[] {
    const lines: LineResult[] = [];
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 }
    ];

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (!cell || cell.player !== placedBy || cell.eliminated) continue;

        for (const { dr, dc } of directions) {
          const positions: Position[] = [{ row: r, col: c }];
          let rr = r + dr;
          let cc = c + dc;
          while (rr >= 0 && rr < this.size && cc >= 0 && cc < this.size) {
            const nextCell = this.grid[rr][cc];
            if (nextCell && nextCell.player === placedBy && !nextCell.eliminated) {
              positions.push({ row: rr, col: cc });
              rr += dr;
              cc += dc;
            } else {
              break;
            }
          }
          if (positions.length >= 3) {
            const startR = positions[0].row;
            const startC = positions[0].col;
            const prevR = startR - dr;
            const prevC = startC - dc;
            const isStartOfLine = !(prevR >= 0 && prevR < this.size && prevC >= 0 && prevC < this.size &&
              this.grid[prevR] && this.grid[prevR][prevC] &&
              this.grid[prevR][prevC]!.player === placedBy &&
              !this.grid[prevR][prevC]!.eliminated);
            if (isStartOfLine) {
              lines.push({ positions, player: placedBy });
            }
          }
        }
      }
    }

    return lines;
  }

  public getEnemiesOnLines(lines: LineResult[], attacker: Player): Position[] {
    const enemySet = new Set<string>();
    for (const line of lines) {
      for (const pos of line.positions) {
        const cell = this.grid[pos.row][pos.col];
        if (cell && cell.player !== attacker && !cell.eliminated && !cell.isEliminating) {
          enemySet.add(`${pos.row},${pos.col}`);
        }
      }
    }

    for (const line of lines) {
      const rows = line.positions.map(p => p.row);
      const cols = line.positions.map(p => p.col);
      const minR = Math.min(...rows);
      const maxR = Math.max(...rows);
      const minC = Math.min(...cols);
      const maxC = Math.max(...cols);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = this.grid[r][c];
          if (cell && cell.player !== attacker && !cell.eliminated && !cell.isEliminating) {
            enemySet.add(`${r},${c}`);
          }
        }
      }
    }

    const result: Position[] = [];
    enemySet.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      result.push({ row: r, col: c });
    });
    return result;
  }

  public markForElimination(positions: Position[], now: number): void {
    for (const pos of positions) {
      const cell = this.grid[pos.row][pos.col];
      if (cell) {
        cell.isEliminating = true;
        cell.eliminateStart = now;
      }
    }
  }

  public finalizeElimination(): void {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (cell && cell.isEliminating) {
          cell.eliminated = true;
          cell.isEliminating = false;
          this.grid[r][c] = null;
        }
      }
    }
  }

  public countPieces(player: Player): number {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (cell && cell.player === player && !cell.eliminated) {
          count++;
        }
      }
    }
    return count;
  }

  public countAllPieces(): number {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] && !this.grid[r][c]!.eliminated) count++;
      }
    }
    return count;
  }

  public isFull(): boolean {
    return this.countAllPieces() >= this.size * this.size;
  }

  public getEmptyPositions(): Position[] {
    const positions: Position[] = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.canPlace(r, c)) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  }

  public calculateScore(player: Player): number {
    return this.countPieces(player);
  }
}
