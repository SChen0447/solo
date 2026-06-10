export interface CellData {
  value: string;
  rawValue: string;
  isFormula: boolean;
  isCalculated: boolean;
  computedValue: number | null;
}

export type DataMatrix = CellData[][];

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface TableState {
  data: DataMatrix;
  selectedCell: CellPosition | null;
  selectionRange: CellRange | null;
  editingCell: CellPosition | null;
  rowCount: number;
  colCount: number;
}

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartData {
  labels: string[];
  series: {
    name: string;
    values: number[];
  }[];
  type: ChartType;
}

export type SortOrder = 'asc' | 'desc';

export type FormulaFunction = 'SUM' | 'AVERAGE' | 'MAX' | 'MIN';

export interface TableEngineEvents {
  onDataChange?: (data: DataMatrix) => void;
  onSelectionChange?: (range: CellRange | null) => void;
}
