import { TableEngine, cellToLetter } from './tableEngine';
import { TableRenderer } from './tableRenderer';
import { ChartGenerator } from './chartGenerator';
import type { CellPosition, CellRange, ChartType, ChartData } from './types';

class App {
  private engine: TableEngine;
  private renderer: TableRenderer;
  private chart: ChartGenerator;
  private currentChartType: ChartType = 'bar';

  private tableCanvas!: HTMLCanvasElement;
  private chartCanvas!: HTMLCanvasElement;
  private cellEditor!: HTMLDivElement;
  private cellInput!: HTMLInputElement;
  private rangeDisplay!: HTMLElement;

  private editingCell: CellPosition | null = null;

  constructor() {
    this.engine = new TableEngine(6, 5);
    this.renderer = new TableRenderer(this.getTableCanvas(), {
      onCellClick: this.onCellClick.bind(this),
      onCellDoubleClick: this.onCellDoubleClick.bind(this),
      onSelectionEnd: this.onSelectionEnd.bind(this),
      onSelectionDrag: this.onSelectionDrag.bind(this),
    });
    this.chart = new ChartGenerator(this.getChartCanvas());

    this.bindToolbarEvents();
    this.bindChartTypeEvents();
    this.bindEditorEvents();
    this.syncRendererData();
    this.updateRangeDisplay();
    this.adjustChartSize();
    this.renderDefaultChart();
  }

  private getTableCanvas(): HTMLCanvasElement {
    if (!this.tableCanvas) {
      this.tableCanvas = document.getElementById('table-canvas') as HTMLCanvasElement;
    }
    return this.tableCanvas;
  }

  private getChartCanvas(): HTMLCanvasElement {
    if (!this.chartCanvas) {
      this.chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
    }
    return this.chartCanvas;
  }

  private getCellEditor(): HTMLDivElement {
    if (!this.cellEditor) {
      this.cellEditor = document.getElementById('cell-editor') as HTMLDivElement;
    }
    return this.cellEditor;
  }

  private getCellInput(): HTMLInputElement {
    if (!this.cellInput) {
      this.cellInput = document.getElementById('cell-input') as HTMLInputElement;
    }
    return this.cellInput;
  }

  private getRangeDisplay(): HTMLElement {
    if (!this.rangeDisplay) {
      this.rangeDisplay = document.getElementById('range-display') as HTMLElement;
    }
    return this.rangeDisplay;
  }

  private bindToolbarEvents(): void {
    document.getElementById('btn-add-row')?.addEventListener('click', () => {
      this.engine.addRow();
      this.syncRendererData();
    });

    document.getElementById('btn-add-col')?.addEventListener('click', () => {
      this.engine.addColumn();
      this.syncRendererData();
    });

    document.getElementById('btn-del-row')?.addEventListener('click', () => {
      const rows = this.renderer.getSelectedRows();
      if (rows.length > 0) {
        rows.sort((a, b) => b - a).forEach((r) => this.engine.deleteRow(r));
        this.renderer.setSelection(null);
        this.syncRendererData();
        this.updateRangeDisplay();
        this.renderDefaultChart();
      }
    });

    document.getElementById('btn-del-col')?.addEventListener('click', () => {
      const col = this.renderer.getSelectedColumn();
      if (col !== null) {
        this.engine.deleteColumn(col);
        this.renderer.setSelection(null);
        this.syncRendererData();
        this.updateRangeDisplay();
        this.renderDefaultChart();
      }
    });

    document.getElementById('btn-sort-asc')?.addEventListener('click', () => {
      const col = this.renderer.getSelectedColumn();
      if (col !== null) {
        this.engine.sortByColumn(col, 'asc');
        this.syncRendererData();
      }
    });

    document.getElementById('btn-sort-desc')?.addEventListener('click', () => {
      const col = this.renderer.getSelectedColumn();
      if (col !== null) {
        this.engine.sortByColumn(col, 'desc');
        this.syncRendererData();
      }
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exportCSV();
    });
  }

  private bindChartTypeEvents(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.chart-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentChartType = btn.dataset.type as ChartType;
        this.renderChartFromSelection();
      });
    });
  }

  private bindEditorEvents(): void {
    const input = this.getCellInput();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEdit();
      }
    });

    input.addEventListener('blur', () => {
      this.commitEdit();
    });
  }

  private onCellClick(pos: CellPosition): void {
    this.renderer.setSelection(pos);
    this.updateRangeDisplay();
  }

  private onCellDoubleClick(pos: CellPosition): void {
    this.startEditing(pos);
  }

  private onSelectionDrag(_pos: CellPosition): void {
    this.updateRangeDisplay();
  }

  private onSelectionEnd(_pos: CellPosition): void {
    this.updateRangeDisplay();
    this.renderChartFromSelection();
  }

  private startEditing(pos: CellPosition): void {
    this.editingCell = pos;
    const cell = this.engine.getCell(pos.row, pos.col);
    const input = this.getCellInput();
    const editor = this.getCellEditor();
    const wrapper = document.querySelector('.table-wrapper') as HTMLElement;

    input.value = cell.rawValue;

    const colWidth = 120;
    const headerHeight = 40;
    const rowHeight = 36;

    const left = pos.col * colWidth;
    const top = pos.row === 0 ? 0 : headerHeight + (pos.row - 1) * rowHeight;
    const height = pos.row === 0 ? headerHeight : rowHeight;

    editor.style.left = `${left}px`;
    editor.style.top = `${top}px`;
    editor.style.width = `${colWidth}px`;
    editor.style.height = `${height}px`;
    editor.classList.remove('hidden');

    wrapper.appendChild(editor);

    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  private commitEdit(): void {
    if (!this.editingCell) return;

    const input = this.getCellInput();
    const value = input.value.trim();
    this.engine.setCell(this.editingCell.row, this.editingCell.col, value);
    this.syncRendererData();
    this.cancelEdit();
    this.renderChartFromSelection();
  }

  private cancelEdit(): void {
    this.editingCell = null;
    this.getCellEditor().classList.add('hidden');
  }

  private syncRendererData(): void {
    this.renderer.setData(this.engine.getData());
  }

  private updateRangeDisplay(): void {
    const range = this.renderer.getSelectionRange();
    const display = this.getRangeDisplay();

    if (!range) {
      display.textContent = '未选择';
      return;
    }

    const { startRow, startCol, endRow, endCol } = range;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const startRef = `${cellToLetter(minCol)}${minRow + 1}`;
    const endRef = `${cellToLetter(maxCol)}${maxRow + 1}`;
    display.textContent = startRef === endRef ? startRef : `${startRef} : ${endRef}`;
  }

  private adjustChartSize(): void {
    const wrapper = document.querySelector('.chart-wrapper') as HTMLElement;
    if (!wrapper) return;

    const updateSize = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(480, rect.width - 20);
      const height = 360;
      this.chart.setSize(width, height);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
  }

  private renderDefaultChart(): void {
    const { rows, cols } = this.engine.getDimensions();
    const defaultRange: CellRange = {
      startRow: 0,
      startCol: 0,
      endRow: Math.min(rows - 1, 5),
      endCol: Math.min(cols - 1, 3),
    };

    const { labels, series } = this.engine.getRangeData(defaultRange);
    if (labels.length > 0 && series.length > 0) {
      const data: ChartData = { type: this.currentChartType, labels, series };
      this.chart.renderChart(data);
    } else {
      this.chart.renderChart({ type: this.currentChartType, labels: [], series: [] });
    }
  }

  private renderChartFromSelection(): void {
    const range = this.renderer.getSelectionRange();
    let chartData: ChartData;

    if (range) {
      const { startRow, startCol, endRow, endCol } = range;
      const rowSpan = Math.abs(endRow - startRow);
      const colSpan = Math.abs(endCol - startCol);

      if (rowSpan >= 1 && colSpan >= 1) {
        const { labels, series } = this.engine.getRangeData(range);
        chartData = { type: this.currentChartType, labels, series };
      } else {
        return;
      }
    } else {
      return;
    }

    this.chart.renderChart(chartData);
  }

  private exportCSV(): void {
    let csv = this.engine.exportCSV();
    csv = '\uFEFF' + csv;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `table_data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
