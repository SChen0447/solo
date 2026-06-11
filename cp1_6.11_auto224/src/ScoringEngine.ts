import { Card, GameGrid, ComboResult, Element } from './types';

export class ScoringEngine {
  private static readonly WINNING_ENERGY = 200;
  private static readonly COMBO_BONUS_ENERGY = 10;
  private static readonly COMBO_CARD_DRAW = 1;

  public static evaluateCombo(grid: GameGrid): ComboResult[] {
    const startTime = performance.now();
    const combos: ComboResult[] = [];
    const rows = grid.length;
    const cols = grid[0].length;

    combos.push(...this.checkHorizontalCombos(grid, rows, cols));
    combos.push(...this.checkVerticalCombos(grid, rows, cols));
    combos.push(...this.checkDiagonalCombos(grid, rows, cols));

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 15) {
      console.warn(`连击评分计算耗时 ${duration.toFixed(2)}ms，超过15ms限制`);
    }

    return combos;
  }

  private static checkHorizontalCombos(
    grid: GameGrid,
    rows: number,
    cols: number
  ): ComboResult[] {
    const combos: ComboResult[] = [];

    for (let row = 0; row < rows; row++) {
      let consecutiveCount = 1;
      let currentElement: Element | null = null;
      let startCol = 0;

      for (let col = 0; col < cols; col++) {
        const cell = grid[row][col];

        if (cell && cell.element !== 'major' && !cell.suppressed) {
          if (cell.element === currentElement) {
            consecutiveCount++;
          } else {
            if (consecutiveCount >= 3 && currentElement) {
              combos.push(this.createComboResult(
                'horizontal',
                currentElement,
                row,
                startCol,
                consecutiveCount
              ));
            }
            currentElement = cell.element;
            startCol = col;
            consecutiveCount = 1;
          }
        } else {
          if (consecutiveCount >= 3 && currentElement) {
            combos.push(this.createComboResult(
              'horizontal',
              currentElement,
              row,
              startCol,
              consecutiveCount
            ));
          }
          currentElement = null;
          consecutiveCount = 1;
        }
      }

      if (consecutiveCount >= 3 && currentElement) {
        combos.push(this.createComboResult(
          'horizontal',
          currentElement,
          row,
          startCol,
          consecutiveCount
        ));
      }
    }

    return combos;
  }

  private static checkVerticalCombos(
    grid: GameGrid,
    rows: number,
    cols: number
  ): ComboResult[] {
    const combos: ComboResult[] = [];

    for (let col = 0; col < cols; col++) {
      let consecutiveCount = 1;
      let currentElement: Element | null = null;
      let startRow = 0;

      for (let row = 0; row < rows; row++) {
        const cell = grid[row][col];

        if (cell && cell.element !== 'major' && !cell.suppressed) {
          if (cell.element === currentElement) {
            consecutiveCount++;
          } else {
            if (consecutiveCount >= 3 && currentElement) {
              combos.push(this.createVerticalComboResult(
                currentElement,
                startRow,
                col,
                consecutiveCount
              ));
            }
            currentElement = cell.element;
            startRow = row;
            consecutiveCount = 1;
          }
        } else {
          if (consecutiveCount >= 3 && currentElement) {
            combos.push(this.createVerticalComboResult(
              currentElement,
              startRow,
              col,
              consecutiveCount
            ));
          }
          currentElement = null;
          consecutiveCount = 1;
        }
      }

      if (consecutiveCount >= 3 && currentElement) {
        combos.push(this.createVerticalComboResult(
          currentElement,
          startRow,
          col,
          consecutiveCount
        ));
      }
    }

    return combos;
  }

  private static checkDiagonalCombos(
    grid: GameGrid,
    rows: number,
    cols: number
  ): ComboResult[] {
    const combos: ComboResult[] = [];

    for (let startRow = 0; startRow <= rows - 3; startRow++) {
      for (let startCol = 0; startCol <= cols - 3; startCol++) {
        combos.push(...this.checkDiagonalFromStart(grid, startRow, startCol, rows, cols, 1));
        combos.push(...this.checkDiagonalFromStart(grid, startRow, cols - 1 - startCol, rows, cols, -1));
      }
    }

    return combos;
  }

  private static checkDiagonalFromStart(
    grid: GameGrid,
    startRow: number,
    startCol: number,
    rows: number,
    cols: number,
    direction: number
  ): ComboResult[] {
    const combos: ComboResult[] = [];
    const positions: { row: number; col: number }[] = [];
    let currentElement: Element | null = null;
    let consecutiveCount = 0;

    let row = startRow;
    let col = startCol;

    while (row < rows && col >= 0 && col < cols) {
      const cell = grid[row][col];

      if (cell && cell.element !== 'major' && !cell.suppressed) {
        if (cell.element === currentElement || currentElement === null) {
          currentElement = cell.element;
          consecutiveCount++;
          positions.push({ row, col });
        } else {
          if (consecutiveCount >= 3 && currentElement) {
            combos.push({
              score: this.COMBO_BONUS_ENERGY,
              comboName: `${this.getElementName(currentElement)}元素共鸣`,
              positions: [...positions],
            });
          }
          currentElement = cell.element;
          consecutiveCount = 1;
          positions.length = 0;
          positions.push({ row, col });
        }
      } else {
        if (consecutiveCount >= 3 && currentElement) {
          combos.push({
            score: this.COMBO_BONUS_ENERGY,
            comboName: `${this.getElementName(currentElement)}元素共鸣`,
            positions: [...positions],
          });
        }
        currentElement = null;
        consecutiveCount = 0;
        positions.length = 0;
      }

      row++;
      col += direction;
    }

    if (consecutiveCount >= 3 && currentElement) {
      combos.push({
        score: this.COMBO_BONUS_ENERGY,
        comboName: `${this.getElementName(currentElement)}元素共鸣`,
        positions: [...positions],
      });
    }

    return combos;
  }

  private static createComboResult(
    direction: string,
    element: Element,
    row: number,
    startCol: number,
    count: number
  ): ComboResult {
    const positions: { row: number; col: number }[] = [];
    for (let i = 0; i < count; i++) {
      positions.push({ row, col: startCol + i });
    }
    return {
      score: this.COMBO_BONUS_ENERGY,
      comboName: `${this.getElementName(element)}元素共鸣`,
      positions,
    };
  }

  private static createVerticalComboResult(
    element: Element,
    startRow: number,
    col: number,
    count: number
  ): ComboResult {
    const positions: { row: number; col: number }[] = [];
    for (let i = 0; i < count; i++) {
      positions.push({ row: startRow + i, col });
    }
    return {
      score: this.COMBO_BONUS_ENERGY,
      comboName: `${this.getElementName(element)}元素共鸣`,
      positions,
    };
  }

  private static getElementName(element: Element): string {
    const names: Record<Element, string> = {
      fire: '火',
      water: '水',
      wind: '风',
      earth: '土',
      major: '大阿卡那',
    };
    return names[element] || '未知';
  }

  public static calculateBoardEnergy(grid: GameGrid): number {
    let totalEnergy = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell && !cell.suppressed) {
          totalEnergy += cell.energyValue;
        }
      }
    }
    return totalEnergy;
  }

  public static checkWinCondition(boardEnergy: number): boolean {
    return boardEnergy >= this.WINNING_ENERGY;
  }

  public static getComboBonusEnergy(): number {
    return this.COMBO_BONUS_ENERGY;
  }

  public static getComboCardDraw(): number {
    return this.COMBO_CARD_DRAW;
  }

  public static getWinningEnergy(): number {
    return this.WINNING_ENERGY;
  }
}
