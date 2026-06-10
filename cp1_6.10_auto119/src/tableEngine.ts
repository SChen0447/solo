import type {
  CellData,
  DataMatrix,
  CellPosition,
  CellRange,
  SortOrder,
  FormulaFunction,
  TableEngineEvents,
} from './types';

function createEmptyCell(): CellData {
  return {
    value: '',
    rawValue: '',
    isFormula: false,
    isCalculated: false,
    computedValue: null,
  };
}

function createSampleData(rows: number, cols: number): DataMatrix {
  const headers = ['产品', '一月', '二月', '三月', '四月'];
  const products = ['产品A', '产品B', '产品C', '产品D', '总计'];
  const data: DataMatrix = [];

  for (let r = 0; r < rows; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = createEmptyCell();
      if (r === 0 && c < headers.length) {
        cell.value = headers[c];
        cell.rawValue = headers[c];
      } else if (c === 0 && r > 0 && r < products.length + 1) {
        cell.value = products[r - 1];
        cell.rawValue = products[r - 1];
      } else if (r > 0 && c > 0 && r < products.length) {
        const val = Math.floor(Math.random() * 500) + 100;
        cell.value = String(val);
        cell.rawValue = String(val);
      }
      row.push(cell);
    }
    data.push(row);
  }
  return data;
}

function parseCellRef(ref: string): CellPosition | null {
  const match = ref.match(/^([A-Z])(\d+)$/i);
  if (!match) return null;
  const col = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2], 10) - 1;
  return { row, col };
}

function cellToLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

export class TableEngine {
  private data: DataMatrix;
  private events: TableEngineEvents;
  private rows: number;
  private cols: number;

  constructor(initialRows: number = 6, initialCols: number = 5, events: TableEngineEvents = {}) {
    this.rows = initialRows;
    this.cols = initialCols;
    this.data = createSampleData(initialRows, initialCols);
    this.events = events;
  }

  getData(): DataMatrix {
    return this.data.map((row) => row.map((cell) => ({ ...cell })));
  }

  getDimensions(): { rows: number; cols: number } {
    return { rows: this.rows, cols: this.cols };
  }

  getCell(row: number, col: number): CellData {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return createEmptyCell();
    }
    return { ...this.data[row][col] };
  }

  setCell(row: number, col: number, rawValue: string): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;

    const cell = this.data[row][col];
    cell.rawValue = rawValue;
    cell.isFormula = rawValue.startsWith('=');
    cell.isCalculated = false;
    cell.computedValue = null;

    if (cell.isFormula) {
      const result = this.evaluateFormula(rawValue);
      cell.value = result !== null ? String(Number(result.toFixed(2))) : '#ERROR';
      cell.isCalculated = result !== null;
      cell.computedValue = result;
    } else {
      cell.value = rawValue;
    }

    this.recalculateAllFormulas();
    this.emitChange();
  }

  private evaluateFormula(formula: string): number | null {
    const expr = formula.substring(1).toUpperCase().trim();
    const funcMatch = expr.match(/^(SUM|AVERAGE|MAX|MIN)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);

    if (funcMatch) {
      const funcName = funcMatch[1] as FormulaFunction;
      const startRef = parseCellRef(funcMatch[2]);
      const endRef = parseCellRef(funcMatch[3]);

      if (!startRef || !endRef) return null;

      const values: number[] = [];
      const minRow = Math.min(startRef.row, endRef.row);
      const maxRow = Math.max(startRef.row, endRef.row);
      const minCol = Math.min(startRef.col, endRef.col);
      const maxCol = Math.max(startRef.col, endRef.col);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = this.data[r]?.[c];
          if (cell) {
            const num = this.getNumericValue(cell);
            if (num !== null) values.push(num);
          }
        }
      }

      return this.applyFormulaFunction(funcName, values);
    }

    return null;
  }

  private getNumericValue(cell: CellData): number | null {
    if (cell.isCalculated && cell.computedValue !== null) {
      return cell.computedValue;
    }
    const num = parseFloat(cell.value);
    return isNaN(num) ? null : num;
  }

  private applyFormulaFunction(func: FormulaFunction, values: number[]): number | null {
    if (values.length === 0) return null;

    switch (func) {
      case 'SUM':
        return values.reduce((a, b) => a + b, 0);
      case 'AVERAGE':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MAX':
        return Math.max(...values);
      case 'MIN':
        return Math.min(...values);
      default:
        return null;
    }
  }

  private recalculateAllFormulas(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.data[r][c];
        if (cell.isFormula) {
          const result = this.evaluateFormula(cell.rawValue);
          cell.value = result !== null ? String(Number(result.toFixed(2))) : '#ERROR';
          cell.isCalculated = result !== null;
          cell.computedValue = result;
        }
      }
    }
  }

  addRow(): void {
    const newRow: CellData[] = [];
    for (let c = 0; c < this.cols; c++) {
      newRow.push(createEmptyCell());
    }
    this.data.push(newRow);
    this.rows++;
    this.emitChange();
  }

  addColumn(): void {
    for (let r = 0; r < this.rows; r++) {
      this.data[r].push(createEmptyCell());
    }
    this.cols++;
    this.emitChange();
  }

  deleteRow(rowIndex: number): void {
    if (this.rows <= 1 || rowIndex < 0 || rowIndex >= this.rows) return;
    this.data.splice(rowIndex, 1);
    this.rows--;
    this.recalculateAllFormulas();
    this.emitChange();
  }

  deleteColumn(colIndex: number): void {
    if (this.cols <= 1 || colIndex < 0 || colIndex >= this.cols) return;
    for (let r = 0; r < this.rows; r++) {
      this.data[r].splice(colIndex, 1);
    }
    this.cols--;
    this.recalculateAllFormulas();
    this.emitChange();
  }

  sortByColumn(colIndex: number, order: SortOrder = 'asc'): void {
    if (colIndex < 0 || colIndex >= this.cols) return;

    const rows = this.data.slice(1);
    rows.sort((a, b) => {
      const valA = this.getSortValue(a[colIndex]);
      const valB = this.getSortValue(b[colIndex]);

      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    this.data = [this.data[0], ...rows];
    this.recalculateAllFormulas();
    this.emitChange();
  }

  private getSortValue(cell: CellData): number | string {
    if (cell.isCalculated && cell.computedValue !== null) {
      return cell.computedValue;
    }
    const num = parseFloat(cell.value);
    return isNaN(num) ? cell.value : num;
  }

  getRangeData(range: CellRange): { labels: string[]; series: { name: string; values: number[] }[] } {
    const minRow = Math.min(range.startRow, range.endRow);
    const maxRow = Math.max(range.startRow, range.endRow);
    const minCol = Math.min(range.startCol, range.endCol);
    const maxCol = Math.max(range.startCol, range.endCol);

    const labels: string[] = [];
    const series: { name: string; values: number[] }[] = [];

    for (let c = minCol + 1; c <= maxCol; c++) {
      const nameCell = this.data[minRow]?.[c];
      series.push({
        name: nameCell?.value || `${cellToLetter(c)}列`,
        values: [],
      });
    }

    for (let r = minRow + 1; r <= maxRow; r++) {
      const labelCell = this.data[r]?.[minCol];
      labels.push(labelCell?.value || `第${r}行`);

      for (let c = minCol + 1; c <= maxCol; c++) {
        const sIdx = c - minCol - 1;
        const cell = this.data[r]?.[c];
        const num = cell ? this.getNumericValue(cell) : null;
        series[sIdx]?.values.push(num ?? 0);
      }
    }

    return { labels, series };
  }

  exportCSV(): string {
    const rows: string[] = [];

    for (let r = 0; r < this.rows; r++) {
      const cells: string[] = [];
      for (let c = 0; c < this.cols; c++) {
        const cell = this.data[r][c];
        let val = cell.value;
        if (r === 0) {
          val = `**${val}**`;
        } else if (cell.isCalculated && cell.computedValue !== null) {
          val = cell.computedValue.toFixed(2);
        } else {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            val = num.toFixed(2);
          }
        }
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        cells.push(val);
      }
      rows.push(cells.join(','));
    }

    return rows.join('\n');
  }

  private emitChange(): void {
    if (this.events.onDataChange) {
      this.events.onDataChange(this.getData());
    }
  }
}

export { cellToLetter };
