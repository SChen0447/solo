import type { DataMatrix, CellPosition, CellRange } from './types';

interface RendererOptions {
  rowHeight: number;
  colWidth: number;
  headerHeight: number;
  headerBg: string;
  headerColor: string;
  evenRowBg: string;
  oddRowBg: string;
  selectedBg: string;
  calculatedBg: string;
  gridColor: string;
  fontSize: number;
  fontFamily: string;
  dpr: number;
}

export interface TableRendererCallbacks {
  onCellClick?: (pos: CellPosition) => void;
  onCellDoubleClick?: (pos: CellPosition) => void;
  onSelectionStart?: (pos: CellPosition) => void;
  onSelectionEnd?: (pos: CellPosition) => void;
  onSelectionDrag?: (pos: CellPosition) => void;
}

const DEFAULT_OPTIONS: RendererOptions = {
  rowHeight: 36,
  colWidth: 120,
  headerHeight: 40,
  headerBg: '#2c3e50',
  headerColor: '#ffffff',
  evenRowBg: '#f0f2f5',
  oddRowBg: '#ffffff',
  selectedBg: 'rgba(52, 152, 219, 0.2)',
  calculatedBg: '#fff9c4',
  gridColor: '#d0d7de',
  fontSize: 14,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  dpr: window.devicePixelRatio || 1,
};

export class TableRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: RendererOptions;
  private data: DataMatrix = [];
  private rows: number = 0;
  private cols: number = 0;
  private selectedCell: CellPosition | null = null;
  private selectionRange: CellRange | null = null;
  private hoverCell: CellPosition | null = null;
  private isDragging: boolean = false;
  private dragStart: CellPosition | null = null;
  private callbacks: TableRendererCallbacks;
  private animationProgress: number = 1;
  private pendingRender: number | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: TableRendererCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.options = { ...DEFAULT_OPTIONS };
    this.callbacks = callbacks;
    this.bindEvents();
    this.updateFontSize();
  }

  private updateFontSize(): void {
    if (window.innerWidth < 768) {
      this.options.fontSize = 12;
    } else {
      this.options.fontSize = 14;
    }
  }

  setData(data: DataMatrix, animate: boolean = true): void {
    this.data = data;
    this.rows = data.length;
    this.cols = data[0]?.length || 0;
    this.resizeCanvas();
    if (animate) {
      this.animateRender();
    } else {
      this.animationProgress = 1;
      this.render();
    }
  }

  setSelection(cell: CellPosition | null): void {
    this.selectedCell = cell;
    this.selectionRange = cell ? { startRow: cell.row, startCol: cell.col, endRow: cell.row, endCol: cell.col } : null;
    this.render();
  }

  setSelectionRange(range: CellRange | null): void {
    this.selectionRange = range;
    if (range) {
      this.selectedCell = { row: range.endRow, col: range.endCol };
    } else {
      this.selectedCell = null;
    }
    this.render();
  }

  getSelectionRange(): CellRange | null {
    return this.selectionRange;
  }

  getSelectedColumn(): number | null {
    if (this.selectionRange) {
      return this.selectionRange.startCol;
    }
    return this.selectedCell?.col ?? null;
  }

  getSelectedRows(): number[] {
    if (this.selectionRange) {
      const { startRow, endRow } = this.selectionRange;
      const min = Math.min(startRow, endRow);
      const max = Math.max(startRow, endRow);
      const rows: number[] = [];
      for (let r = min; r <= max; r++) rows.push(r);
      return rows;
    }
    return this.selectedCell ? [this.selectedCell.row] : [];
  }

  getCellBounds(row: number, col: number): { x: number; y: number; width: number; height: number } {
    const x = col * this.options.colWidth;
    const y = row === 0 ? 0 : this.options.headerHeight + (row - 1) * this.options.rowHeight;
    const height = row === 0 ? this.options.headerHeight : this.options.rowHeight;
    return { x, y, width: this.options.colWidth, height };
  }

  private resizeCanvas(): void {
    const { colWidth, rowHeight, headerHeight, dpr } = this.options;
    const width = this.cols * colWidth;
    const height = headerHeight + (this.rows - 1) * rowHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.updateFontSize();
    this.resizeCanvas();
    this.render();
  }

  private getCellFromEvent(e: MouseEvent): CellPosition | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / this.options.colWidth);
    const { headerHeight, rowHeight } = this.options;

    let row: number;
    if (y < headerHeight) {
      row = 0;
    } else {
      row = 1 + Math.floor((y - headerHeight) / rowHeight);
    }

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return { row, col };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCellFromEvent(e);
    if (!pos) return;

    this.isDragging = true;
    this.dragStart = pos;
    this.setSelection(pos);

    if (this.callbacks.onSelectionStart) {
      this.callbacks.onSelectionStart(pos);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCellFromEvent(e);
    this.hoverCell = pos;

    if (this.isDragging && this.dragStart && pos) {
      const range: CellRange = {
        startRow: this.dragStart.row,
        startCol: this.dragStart.col,
        endRow: pos.row,
        endCol: pos.col,
      };
      this.selectionRange = range;
      this.selectedCell = pos;
      this.render();

      if (this.callbacks.onSelectionDrag) {
        this.callbacks.onSelectionDrag(pos);
      }
    } else {
      this.render();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const pos = this.getCellFromEvent(e);
    if (pos && this.callbacks.onCellClick) {
      this.callbacks.onCellClick(pos);
    }
    if (this.callbacks.onSelectionEnd) {
      this.callbacks.onSelectionEnd(pos || this.dragStart!);
    }

    this.dragStart = null;
  }

  private onMouseLeave(): void {
    this.hoverCell = null;
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStart = null;
    }
    this.render();
  }

  private onDoubleClick(e: MouseEvent): void {
    const pos = this.getCellFromEvent(e);
    if (pos && this.callbacks.onCellDoubleClick) {
      this.callbacks.onCellDoubleClick(pos);
    }
  }

  private animateRender(): void {
    if (this.pendingRender) cancelAnimationFrame(this.pendingRender);
    this.animationProgress = 0;
    const startTime = performance.now();
    const duration = 300;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      this.animationProgress = Math.min(elapsed / duration, 1);
      this.render();
      if (this.animationProgress < 1) {
        this.pendingRender = requestAnimationFrame(animate);
      }
    };

    this.pendingRender = requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  render(): void {
    const { ctx, options } = this;
    const { colWidth, rowHeight, headerHeight, headerBg, headerColor, evenRowBg, oddRowBg, gridColor, fontSize, fontFamily } = options;

    const width = this.cols * colWidth;
    const height = headerHeight + (this.rows - 1) * rowHeight;
    const progress = this.easeOutCubic(this.animationProgress);

    ctx.clearRect(0, 0, width, height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const bounds = this.getCellBounds(r, c);
        let bg = r === 0 ? headerBg : (r % 2 === 0 ? evenRowBg : oddRowBg);

        const cell = this.data[r]?.[c];
        if (cell?.isCalculated) {
          bg = options.calculatedBg;
        }

        if (this.isCellInSelection(r, c)) {
          bg = options.selectedBg;
        }

        const scaleY = progress;
        const drawHeight = bounds.height * scaleY;
        const drawY = r === 0 ? bounds.y : bounds.y + (bounds.height - drawHeight);

        ctx.fillStyle = bg;
        ctx.fillRect(bounds.x, drawY, bounds.width, drawHeight);
      }
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let c = 0; c <= this.cols; c++) {
      const x = c * colWidth + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height * progress);
      ctx.stroke();
    }

    for (let r = 0; r <= this.rows; r++) {
      let y: number;
      if (r === 0) {
        y = 0.5;
      } else {
        y = headerHeight + (r - 1) * rowHeight + 0.5;
      }
      y = y * progress;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const bounds = this.getCellBounds(r, c);
        const cell = this.data[r]?.[c];
        if (!cell || !cell.value) continue;

        ctx.fillStyle = r === 0 ? headerColor : '#2c3e50';
        ctx.textAlign = r === 0 ? 'center' : 'left';

        const text = cell.value;
        const maxWidth = bounds.width - 16;
        let displayText = text;
        if (ctx.measureText(text).width > maxWidth) {
          while (displayText.length > 0 && ctx.measureText(displayText + '…').width > maxWidth) {
            displayText = displayText.slice(0, -1);
          }
          displayText += '…';
        }

        ctx.globalAlpha = progress;
        ctx.fillText(displayText, bounds.x + 8, bounds.y + bounds.height / 2);
        ctx.globalAlpha = 1;
      }
    }

    if (this.selectedCell && this.selectionRange) {
      this.drawSelectionBorder();
    }
  }

  private drawSelectionBorder(): void {
    const range = this.selectionRange!;
    const { startRow, startCol, endRow, endCol } = range;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const topLeft = this.getCellBounds(minRow, minCol);
    const bottomRight = this.getCellBounds(maxRow, maxCol);

    const x = topLeft.x;
    const y = topLeft.y;
    const w = bottomRight.x + bottomRight.width - topLeft.x;
    const h = bottomRight.y + bottomRight.height - topLeft.y;

    const t = (Date.now() % 2000) / 2000;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = `rgba(52, 152, 219, ${0.6 + 0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (this.selectedCell) {
      const cellBounds = this.getCellBounds(this.selectedCell.row, this.selectedCell.col);
      ctx.strokeStyle = `rgba(41, 128, 185, ${0.8 + 0.2 * pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(cellBounds.x + 1.5, cellBounds.y + 1.5, cellBounds.width - 3, cellBounds.height - 3);
    }
    ctx.restore();
  }

  private isCellInSelection(row: number, col: number): boolean {
    if (!this.selectionRange) return false;
    const { startRow, startCol, endRow, endCol } = this.selectionRange;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }

  destroy(): void {
    if (this.pendingRender) cancelAnimationFrame(this.pendingRender);
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
