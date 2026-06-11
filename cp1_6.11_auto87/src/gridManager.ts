import type { CreaseLine, FoldType } from './presets';
import { GRID_SIZE } from './presets';

interface Point {
  x: number;
  y: number;
}

interface HistoryEntry {
  creases: CreaseLine[];
  description: string;
}

const COLORS = {
  paper: '#f5f0e1',
  paperDark: '#e8dcc8',
  grid: '#d4c9a8',
  mountain: '#ffa500',
  valley: '#1e90ff',
  creaseStart: '#87ceeb',
  creaseEnd: '#9370db',
  highlight: 'rgba(255, 255, 255, 0.8)'
};

export class GridManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private creases: CreaseLine[] = [];
  private history: HistoryEntry[] = [];
  private maxHistory = 10;
  private foldType: FoldType = 'mountain';
  private isDrawing = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private gridPixelSize = 0;
  private highlightCreaseIndex: number = -1;
  private highlightTimer: number | null = null;
  private onCreasesChangeCallback: (() => void) | null = null;
  private onHistoryChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.bindEvents();
  }

  setOnCreasesChange(callback: () => void): void {
    this.onCreasesChangeCallback = callback;
  }

  setOnHistoryChange(callback: () => void): void {
    this.onHistoryChangeCallback = callback;
  }

  setFoldType(type: FoldType): void {
    this.foldType = type;
    this.draw();
  }

  getFoldType(): FoldType {
    return this.foldType;
  }

  getCreases(): CreaseLine[] {
    return [...this.creases];
  }

  setCreases(creases: CreaseLine[], description: string = '加载预设'): void {
    this.pushHistory(description);
    this.creases = [...creases];
    this.notifyChange();
    this.draw();
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  getHistoryDescriptions(): string[] {
    return this.history.map(h => h.description);
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    const entry = this.history.pop()!;
    this.creases = entry.creases;
    this.notifyChange();
    this.notifyHistoryChange();
    this.draw();
    return true;
  }

  clear(): void {
    if (this.creases.length === 0) return;
    this.pushHistory('清空折痕');
    this.creases = [];
    this.notifyChange();
    this.draw();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.calculateGrid();
    this.draw();
  }

  private calculateGrid(): void {
    const padding = 40;
    const availableWidth = this.canvas.width - padding * 2;
    const availableHeight = this.canvas.height - padding * 2;
    this.gridPixelSize = Math.min(availableWidth, availableHeight);
    this.cellSize = this.gridPixelSize / GRID_SIZE;
    this.offsetX = (this.canvas.width - this.gridPixelSize) / 2;
    this.offsetY = (this.canvas.height - this.gridPixelSize) / 2;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private getGridPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.offsetX;
    const y = clientY - rect.top - this.offsetY;
    return { x, y };
  }

  private snapToGrid(point: Point): Point {
    const gridX = Math.round(point.x / this.cellSize);
    const gridY = Math.round(point.y / this.cellSize);
    return {
      x: Math.max(0, Math.min(GRID_SIZE, gridX)),
      y: Math.max(0, Math.min(GRID_SIZE, gridY))
    };
  }

  private gridToPixel(gx: number, gy: number): Point {
    return {
      x: this.offsetX + gx * this.cellSize,
      y: this.offsetY + gy * this.cellSize
    };
  }

  private isInGrid(point: Point): boolean {
    return point.x >= 0 && point.x <= GRID_SIZE && point.y >= 0 && point.y <= GRID_SIZE;
  }

  private handleMouseDown(e: MouseEvent): void {
    const gridPoint = this.getGridPoint(e.clientX, e.clientY);
    const snapped = this.snapToGrid(gridPoint);
    
    if (!this.isInGrid(snapped)) return;
    
    const clickedCreaseIndex = this.findCreaseAtPoint(gridPoint);
    if (clickedCreaseIndex >= 0) {
      this.highlightCrease(clickedCreaseIndex);
      return;
    }
    
    this.isDrawing = true;
    this.startPoint = snapped;
    this.currentPoint = snapped;
    this.draw();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const gridPoint = this.getGridPoint(e.clientX, e.clientY);
    this.currentPoint = this.snapToGrid(gridPoint);
    this.draw();
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.currentPoint) {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
      return;
    }

    const dx = Math.abs(this.currentPoint.x - this.startPoint.x);
    const dy = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    if (dx + dy > 0.5) {
      const newCrease: CreaseLine = {
        startX: this.startPoint.x,
        startY: this.startPoint.y,
        endX: this.currentPoint.x,
        endY: this.currentPoint.y,
        type: this.foldType
      };
      
      if (!this.creaseExists(newCrease)) {
        this.pushHistory('添加折痕');
        this.creases.push(newCrease);
        this.highlightCreaseIndex = this.creases.length - 1;
        this.startHighlightTimer();
        this.notifyChange();
      }
    }

    this.isDrawing = false;
    this.startPoint = null;
    this.currentPoint = null;
    this.draw();
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
      this.draw();
    }
  }

  private handleClick(e: MouseEvent): void {
    const gridPoint = this.getGridPoint(e.clientX, e.clientY);
    const creaseIndex = this.findCreaseAtPoint(gridPoint);
    
    if (creaseIndex >= 0) {
      this.pushHistory('删除折痕');
      this.creases.splice(creaseIndex, 1);
      this.highlightCreaseIndex = -1;
      this.notifyChange();
      this.draw();
    }
  }

  private findCreaseAtPoint(point: Point): number {
    const threshold = this.cellSize * 0.2;
    
    for (let i = this.creases.length - 1; i >= 0; i--) {
      const crease = this.creases[i];
      const start = { x: crease.startX * this.cellSize, y: crease.startY * this.cellSize };
      const end = { x: crease.endX * this.cellSize, y: crease.endY * this.cellSize };
      
      const dist = this.pointToLineDistance(point, start, end);
      if (dist < threshold) return i;
    }
    return -1;
  }

  private pointToLineDistance(p: Point, a: Point, b: Point): number {
    const A = p.x - a.x;
    const B = p.y - a.y;
    const C = b.x - a.x;
    const D = b.y - a.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = a.x;
      yy = a.y;
    } else if (param > 1) {
      xx = b.x;
      yy = b.y;
    } else {
      xx = a.x + param * C;
      yy = a.y + param * D;
    }
    
    const dx = p.x - xx;
    const dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private creaseExists(newCrease: CreaseLine): boolean {
    return this.creases.some(c => {
      const sameStartEnd = 
        c.startX === newCrease.startX && c.startY === newCrease.startY &&
        c.endX === newCrease.endX && c.endY === newCrease.endY;
      const reversed = 
        c.startX === newCrease.endX && c.startY === newCrease.endY &&
        c.endX === newCrease.startX && c.endY === newCrease.startY;
      return sameStartEnd || reversed;
    });
  }

  private pushHistory(description: string): void {
    this.history.push({
      creases: [...this.creases],
      description
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.notifyHistoryChange();
  }

  private highlightCrease(index: number): void {
    this.highlightCreaseIndex = index;
    this.startHighlightTimer();
    this.draw();
  }

  private startHighlightTimer(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = window.setTimeout(() => {
      this.highlightCreaseIndex = -1;
      this.draw();
    }, 300);
  }

  private notifyChange(): void {
    if (this.onCreasesChangeCallback) {
      this.onCreasesChangeCallback();
    }
  }

  private notifyHistoryChange(): void {
    if (this.onHistoryChangeCallback) {
      this.onHistoryChangeCallback();
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    this.drawPaper();
    this.drawGrid();
    this.drawCreases();
    this.drawCurrentLine();
  }

  private drawPaper(): void {
    const ctx = this.ctx;
    const x = this.offsetX;
    const y = this.offsetY;
    const size = this.gridPixelSize;
    
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, COLORS.paper);
    gradient.addColorStop(1, COLORS.paperDark);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    
    ctx.strokeStyle = 'rgba(212, 201, 168, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
    
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i - size * 0.3, y + size);
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = this.offsetX + i * this.cellSize;
      const y = this.offsetY + i * this.cellSize;
      
      ctx.beginPath();
      ctx.moveTo(x, this.offsetY);
      ctx.lineTo(x, this.offsetY + this.gridPixelSize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + this.gridPixelSize, y);
      ctx.stroke();
    }
    
    ctx.fillStyle = COLORS.grid;
    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        const x = this.offsetX + i * this.cellSize;
        const y = this.offsetY + j * this.cellSize;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCreases(): void {
    this.creases.forEach((crease, index) => {
      const isHighlighted = index === this.highlightCreaseIndex;
      this.drawCreaseLine(crease, isHighlighted);
    });
  }

  private drawCreaseLine(crease: CreaseLine, highlighted: boolean): void {
    const ctx = this.ctx;
    const start = this.gridToPixel(crease.startX, crease.startY);
    const end = this.gridToPixel(crease.endX, crease.endY);
    
    const color = crease.type === 'mountain' ? COLORS.mountain : COLORS.valley;
    
    ctx.save();
    
    if (highlighted) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4;
    } else {
      ctx.lineWidth = 2;
    }
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(start.x, start.y, highlighted ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(end.x, end.y, highlighted ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private drawCurrentLine(): void {
    if (!this.isDrawing || !this.startPoint || !this.currentPoint) return;
    
    const ctx = this.ctx;
    const start = this.gridToPixel(this.startPoint.x, this.startPoint.y);
    const end = this.gridToPixel(this.currentPoint.x, this.currentPoint.y);
    
    ctx.save();
    
    const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, COLORS.creaseStart);
    gradient.addColorStop(1, COLORS.creaseEnd);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([8, 6]);
    ctx.globalAlpha = 0.7;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = COLORS.creaseStart;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = COLORS.creaseEnd;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  destroy(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
  }
}
