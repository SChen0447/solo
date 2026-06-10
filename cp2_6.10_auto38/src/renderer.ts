import type { GridEngine, GridNodeData, ContentBlock } from './gridEngine';

interface DragState {
  blockId: string | null;
  mode: 'move' | 'resize-right' | null;
  startX: number;
  startY: number;
  startColumn: number;
  startSpan: number;
  offsetX: number;
}

const HANDLE_WIDTH = 8;
const PADDING_X = 40;
const PADDING_TOP = 30;

export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GridEngine;
  private dragState: DragState;
  private hoveredBlockId: string | null = null;
  private selectedBlockId: string | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GridEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.engine = engine;
    this.dragState = { blockId: null, mode: null, startX: 0, startY: 0, startColumn: 0, startSpan: 0, offsetX: 0 };

    this.setupCanvasSize();
    this.bindEvents();
    window.addEventListener('resize', () => this.setupCanvasSize());
  }

  private setupCanvasSize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = parent.clientWidth;
    const cssHeight = Math.max(500, parent.clientHeight);
    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', e => this.onTouchEnd(e));
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - PADDING_X,
      y: e.clientY - rect.top - PADDING_TOP
    };
  }

  private getBlockRect(block: ContentBlock, grid: GridNodeData): { x: number; y: number; width: number; height: number } {
    const startCol = grid.columns[block.startColumn];
    const endColIndex = Math.min(block.startColumn + block.spanColumns - 1, grid.columns.length - 1);
    const endCol = grid.columns[endColIndex];
    return {
      x: startCol.x,
      y: block.y,
      width: (endCol.x + endCol.width) - startCol.x,
      height: block.height
    };
  }

  private hitTest(x: number, y: number): { blockId: string | null; mode: 'move' | 'resize-right' | null } {
    const grid = this.engine.computeGrid();
    const blocks = this.engine.getBlocks();
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      const r = this.getBlockRect(block, grid);
      if (y >= r.y && y <= r.y + r.height) {
        if (x >= r.x + r.width - HANDLE_WIDTH && x <= r.x + r.width + HANDLE_WIDTH) {
          return { blockId: block.id, mode: 'resize-right' };
        }
        if (x >= r.x && x <= r.x + r.width) {
          return { blockId: block.id, mode: 'move' };
        }
      }
    }
    return { blockId: null, mode: null };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const hit = this.hitTest(pos.x, pos.y);
    if (hit.blockId && hit.mode) {
      const block = this.engine.getBlocks().find(b => b.id === hit.blockId);
      if (block) {
        this.selectedBlockId = hit.blockId;
        this.dragState = {
          blockId: hit.blockId,
          mode: hit.mode,
          startX: pos.x,
          startY: pos.y,
          startColumn: block.startColumn,
          startSpan: block.spanColumns,
          offsetX: pos.x - this.engine.computeGrid().columns[block.startColumn].x
        };
        this.canvas.style.cursor = hit.mode === 'resize-right' ? 'ew-resize' : 'grabbing';
      }
    } else {
      this.selectedBlockId = null;
    }
    this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    if (this.dragState.blockId && this.dragState.mode) {
      this.handleDrag(pos.x);
    } else {
      const hit = this.hitTest(pos.x, pos.y);
      this.hoveredBlockId = hit.blockId;
      this.canvas.style.cursor = hit.mode === 'resize-right' ? 'ew-resize'
        : hit.mode === 'move' ? 'grab'
        : 'default';
      this.render();
    }
  }

  private onMouseUp(): void {
    if (this.dragState.blockId && this.dragState.mode) {
      this.dragState = { blockId: null, mode: null, startX: 0, startY: 0, startColumn: 0, startSpan: 0, offsetX: 0 };
      this.canvas.style.cursor = 'default';
    }
    this.render();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getMousePos(touch);
    const hit = this.hitTest(pos.x, pos.y);
    if (hit.blockId && hit.mode) {
      const block = this.engine.getBlocks().find(b => b.id === hit.blockId);
      if (block) {
        this.selectedBlockId = hit.blockId;
        this.dragState = {
          blockId: hit.blockId,
          mode: hit.mode,
          startX: pos.x,
          startY: pos.y,
          startColumn: block.startColumn,
          startSpan: block.spanColumns,
          offsetX: pos.x - this.engine.computeGrid().columns[block.startColumn].x
        };
      }
    }
    this.render();
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0 || !this.dragState.blockId) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getMousePos(touch);
    this.handleDrag(pos.x);
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.onMouseUp();
  }

  private handleDrag(currentX: number): void {
    if (!this.dragState.blockId || !this.dragState.mode) return;
    const grid = this.engine.computeGrid();

    if (this.dragState.mode === 'move') {
      const snappedX = this.engine.snapToGrid(currentX - this.dragState.offsetX);
      const newCol = this.engine.getColumnFromX(snappedX);
      this.engine.updateBlock(this.dragState.blockId, { startColumn: newCol });
    } else if (this.dragState.mode === 'resize-right') {
      const block = this.engine.getBlocks().find(b => b.id === this.dragState.blockId);
      if (!block) return;
      const blockStartX = grid.columns[block.startColumn].x;
      const snappedRight = this.engine.snapToGrid(currentX);
      const newSpan = this.engine.getSpanFromWidth(snappedRight - blockStartX);
      this.engine.updateBlock(this.dragState.blockId, { spanColumns: newSpan });
    }
  }

  render(): void {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.lastFrameTime = now;
      this.frameCount = 0;
    }

    const cssWidth = parseFloat(this.canvas.style.width);
    const cssHeight = parseFloat(this.canvas.style.height);
    this.ctx.clearRect(0, 0, cssWidth, cssHeight);

    const grid = this.engine.computeGrid();

    this.ctx.save();
    this.ctx.translate(PADDING_X, PADDING_TOP);

    this.drawGuides(grid, cssWidth, cssHeight);
    this.drawGrid(grid);
    this.drawBlocks(grid);

    this.ctx.restore();
  }

  private drawGuides(_grid: GridNodeData, cssWidth: number, cssHeight: number): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#BEE3F8';
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 1;

    const grid = this.engine.computeGrid();
    const totalHeight = cssHeight - PADDING_TOP - 20;
    this.ctx.beginPath();
    this.ctx.moveTo(-10, 0);
    this.ctx.lineTo(grid.totalWidth + 10, 0);
    this.ctx.moveTo(-10, totalHeight);
    this.ctx.lineTo(grid.totalWidth + 10, totalHeight);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.ctx.fillStyle = '#718096';
    this.ctx.font = '11px system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${grid.totalWidth}px`, -10, -8);
    this.ctx.restore();
  }

  private drawGrid(grid: GridNodeData): void {
    const totalHeight = parseFloat(this.canvas.style.height) - PADDING_TOP - 20;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(43, 108, 176, 0.1)';
    this.ctx.fillRect(0, 0, grid.totalWidth, totalHeight);
    this.ctx.restore();

    grid.columns.forEach(col => {
      this.ctx.save();
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(col.x, 0, col.width, totalHeight);
      this.ctx.restore();
    });

    this.ctx.save();
    this.ctx.strokeStyle = '#E2E8F0';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    grid.columns.forEach(col => {
      this.ctx.moveTo(col.x, 0);
      this.ctx.lineTo(col.x, totalHeight);
    });
    this.ctx.moveTo(grid.totalWidth, 0);
    this.ctx.lineTo(grid.totalWidth, totalHeight);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#A0AEC0';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    grid.columns.forEach(col => {
      this.ctx.fillText(String(col.index + 1), col.x + col.width / 2, totalHeight + 14);
    });
    this.ctx.restore();
  }

  private drawBlocks(grid: GridNodeData): void {
    const blocks = this.engine.getBlocks();
    const isDragging = this.dragState.blockId !== null;

    blocks.forEach(block => {
      const r = this.getBlockRect(block, grid);
      const isHovered = this.hoveredBlockId === block.id;
      const isSelected = this.selectedBlockId === block.id;
      const isThisDragging = isDragging && this.dragState.blockId === block.id;

      this.ctx.save();

      if (isThisDragging) {
        const scale = 1.05;
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        this.ctx.translate(cx, cy);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-cx, -cy);
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 16;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 4;
      }

      this.ctx.fillStyle = block.color;
      this.ctx.beginPath();
      const radius = 2;
      this.ctx.moveTo(r.x + radius, r.y);
      this.ctx.lineTo(r.x + r.width - radius, r.y);
      this.ctx.quadraticCurveTo(r.x + r.width, r.y, r.x + r.width, r.y + radius);
      this.ctx.lineTo(r.x + r.width, r.y + r.height - radius);
      this.ctx.quadraticCurveTo(r.x + r.width, r.y + r.height, r.x + r.width - radius, r.y + r.height);
      this.ctx.lineTo(r.x + radius, r.y + r.height);
      this.ctx.quadraticCurveTo(r.x, r.y + r.height, r.x, r.y + r.height - radius);
      this.ctx.lineTo(r.x, r.y + radius);
      this.ctx.quadraticCurveTo(r.x, r.y, r.x + radius, r.y);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 13px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${block.spanColumns} 列`, r.x + r.width / 2, r.y + r.height / 2);

      if (isSelected || isHovered || isThisDragging) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(r.x + r.width - 3, r.y + r.height / 2 - 10, 6, 20);
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(r.x + r.width - 2, r.y + r.height / 2 - 6, 4, 12);
      }

      this.ctx.restore();
    });
  }

  scheduleRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
