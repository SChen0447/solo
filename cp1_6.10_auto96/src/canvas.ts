import { v4 as uuidv4 } from 'uuid';

export type Tool = 'pen' | 'line' | 'rectangle' | 'circle' | 'note';

export interface Point {
  x: number;
  y: number;
}

export interface DrawOp {
  type: 'draw';
  id: string;
  userId: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  points?: Point[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  noteId?: string;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  userId: string;
}

export interface CanvasCallbacks {
  onDraw: (op: DrawOp) => void;
  onNoteUpdate?: (op: DrawOp) => void;
}

const GRID_SIZE = 50;
const GRID_LINE_WIDTH = 0.5;
const GRID_ALPHA = 0.3;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export class WhiteboardCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private callbacks: CanvasCallbacks;

  private offsetX = 0;
  private offsetY = 0;
  private scale = 1;

  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panOffsetStartX = 0;
  private panOffsetStartY = 0;

  private isDrawing = false;
  private currentTool: Tool = 'pen';
  private currentColor = '#ff6b6b';
  private currentStrokeWidth = 4;
  private currentPoints: Point[] = [];
  private drawStartX = 0;
  private drawStartY = 0;
  private drawEndX = 0;
  private drawEndY = 0;

  private operations: DrawOp[] = [];
  private notes: Note[] = [];
  private userId: string;

  private dpr: number;

  constructor(container: HTMLElement, userId: string, callbacks: CanvasCallbacks) {
    this.container = container;
    this.userId = userId;
    this.callbacks = callbacks;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.resize();
    this.bindEvents();
    this.render();
  }

  getScale(): number {
    return this.scale;
  }

  getTool(): Tool {
    return this.currentTool;
  }

  getStrokeWidth(): number {
    return this.currentStrokeWidth;
  }

  setTool(tool: Tool): void {
    this.currentTool = tool;
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  setStrokeWidth(width: number): void {
    this.currentStrokeWidth = Math.max(1, Math.min(20, width));
  }

  clear(): void {
    this.operations = [];
    this.notes = [];
    this.render();
  }

  handleRemoteDraw(op: DrawOp): void {
    if (op.tool === 'note') {
      const existingIndex = this.notes.findIndex(n => n.id === op.noteId);
      if (existingIndex >= 0) {
        if (op.text !== undefined) {
          this.notes[existingIndex].text = op.text;
        }
      } else if (op.x !== undefined && op.y !== undefined) {
        this.notes.push({
          id: op.noteId || op.id,
          x: op.x,
          y: op.y,
          text: op.text || '',
          color: op.color,
          userId: op.userId
        });
      }
    } else {
      this.operations.push(op);
    }
    this.render();
  }

  loadHistory(ops: DrawOp[]): void {
    for (const op of ops) {
      this.handleRemoteDraw(op);
    }
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.render();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    let lastTouchDistance = 0;
    let lastTouchCenter: Point | null = null;
    let touchStartOffset = { x: 0, y: 0 };
    let touchStartScale = 1;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const clientX = touch.clientX - rect.left;
        const clientY = touch.clientY - rect.top;
        this.startAction(clientX, clientY, e.shiftKey || e.touches.length > 1);
      } else if (e.touches.length === 2) {
        this.isDrawing = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        touchStartOffset = { x: this.offsetX, y: this.offsetY };
        touchStartScale = this.scale;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouchDistance === 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const clientX = touch.clientX - rect.left;
        const clientY = touch.clientY - rect.top;
        this.continueAction(clientX, clientY);
      } else if (e.touches.length === 2 && lastTouchCenter) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        if (lastTouchDistance > 0) {
          const deltaScale = distance / lastTouchDistance;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, touchStartScale * deltaScale));
          const rect = this.canvas.getBoundingClientRect();
          const cx = lastTouchCenter.x - rect.left;
          const cy = lastTouchCenter.y - rect.top;
          this.zoomAt(cx, cy, newScale);
        }
        const dx = center.x - lastTouchCenter.x;
        const dy = center.y - lastTouchCenter.y;
        this.offsetX += dx;
        this.offsetY += dy;
        this.render();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        this.endAction();
        lastTouchDistance = 0;
        lastTouchCenter = null;
      } else if (e.touches.length === 1) {
        lastTouchDistance = 0;
        lastTouchCenter = null;
      }
    }, { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    this.startAction(clientX, clientY, e.button === 1 || e.shiftKey || e.altKey);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    this.continueAction(clientX, clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    this.endAction();
  }

  private startAction(clientX: number, clientY: number, forcePan: boolean): void {
    const worldPos = this.screenToWorld(clientX, clientY);

    if (forcePan) {
      this.isPanning = true;
      this.isDrawing = false;
      this.panStartX = clientX;
      this.panStartY = clientY;
      this.panOffsetStartX = this.offsetX;
      this.panOffsetStartY = this.offsetY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'note') {
      const noteId = uuidv4();
      const op: DrawOp = {
        type: 'draw',
        id: uuidv4(),
        userId: this.userId,
        tool: 'note',
        color: this.currentColor,
        strokeWidth: this.currentStrokeWidth,
        x: worldPos.x,
        y: worldPos.y,
        text: '',
        noteId
      };
      this.notes.push({
        id: noteId,
        x: worldPos.x,
        y: worldPos.y,
        text: '',
        color: this.currentColor,
        userId: this.userId
      });
      this.callbacks.onDraw(op);
      this.render();
      this.openNoteEditor(noteId);
      return;
    }

    this.isDrawing = true;
    this.isPanning = false;
    this.drawStartX = worldPos.x;
    this.drawStartY = worldPos.y;
    this.drawEndX = worldPos.x;
    this.drawEndY = worldPos.y;

    if (this.currentTool === 'pen') {
      this.currentPoints = [{ x: worldPos.x, y: worldPos.y }];
    }
  }

  private continueAction(clientX: number, clientY: number): void {
    if (this.isPanning) {
      this.offsetX = this.panOffsetStartX + (clientX - this.panStartX);
      this.offsetY = this.panOffsetStartY + (clientY - this.panStartY);
      this.render();
      return;
    }

    if (!this.isDrawing) return;

    const worldPos = this.screenToWorld(clientX, clientY);
    this.drawEndX = worldPos.x;
    this.drawEndY = worldPos.y;

    if (this.currentTool === 'pen') {
      this.currentPoints.push({ x: worldPos.x, y: worldPos.y });
    }

    this.render();
  }

  private endAction(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    let op: DrawOp | null = null;

    switch (this.currentTool) {
      case 'pen': {
        if (this.currentPoints.length < 2) {
          this.currentPoints = [];
          break;
        }
        const smoothed = this.smoothCatmullRom(this.currentPoints);
        op = {
          type: 'draw',
          id: uuidv4(),
          userId: this.userId,
          tool: 'pen',
          color: this.currentColor,
          strokeWidth: this.currentStrokeWidth,
          points: smoothed
        };
        this.currentPoints = [];
        break;
      }
      case 'line': {
        if (this.drawStartX === this.drawEndX && this.drawStartY === this.drawEndY) break;
        op = {
          type: 'draw',
          id: uuidv4(),
          userId: this.userId,
          tool: 'line',
          color: this.currentColor,
          strokeWidth: this.currentStrokeWidth,
          startX: this.drawStartX,
          startY: this.drawStartY,
          endX: this.drawEndX,
          endY: this.drawEndY
        };
        break;
      }
      case 'rectangle': {
        const x = Math.min(this.drawStartX, this.drawEndX);
        const y = Math.min(this.drawStartY, this.drawEndY);
        const w = Math.abs(this.drawEndX - this.drawStartX);
        const h = Math.abs(this.drawEndY - this.drawStartY);
        if (w < 2 || h < 2) break;
        op = {
          type: 'draw',
          id: uuidv4(),
          userId: this.userId,
          tool: 'rectangle',
          color: this.currentColor,
          strokeWidth: this.currentStrokeWidth,
          x,
          y,
          width: w,
          height: h
        };
        break;
      }
      case 'circle': {
        const dx = this.drawEndX - this.drawStartX;
        const dy = this.drawEndY - this.drawStartY;
        const r = Math.hypot(dx, dy);
        if (r < 2) break;
        op = {
          type: 'draw',
          id: uuidv4(),
          userId: this.userId,
          tool: 'circle',
          color: this.currentColor,
          strokeWidth: this.currentStrokeWidth,
          x: this.drawStartX,
          y: this.drawStartY,
          radius: r
        };
        break;
      }
    }

    if (op) {
      this.operations.push(op);
      this.callbacks.onDraw(op);
    }

    this.render();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale * (1 + delta)));
    this.zoomAt(cx, cy, newScale);
    this.render();
  }

  private onDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(clientX, clientY);

    for (const note of this.notes) {
      if (
        worldPos.x >= note.x &&
        worldPos.x <= note.x + 160 &&
        worldPos.y >= note.y &&
        worldPos.y <= note.y + 120
      ) {
        this.openNoteEditor(note.id);
        break;
      }
    }
  }

  private openNoteEditor(noteId: string): void {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    const screenPos = this.worldToScreen(note.x, note.y);

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '10000';

    const editor = document.createElement('textarea');
    editor.value = note.text;
    editor.style.position = 'absolute';
    editor.style.left = screenPos.x + 'px';
    editor.style.top = screenPos.y + 'px';
    editor.style.width = 160 * this.scale + 'px';
    editor.style.height = 120 * this.scale + 'px';
    editor.style.backgroundColor = '#fff9c4';
    editor.style.border = '2px solid #1976d2';
    editor.style.borderRadius = '8px';
    editor.style.padding = (8 * this.scale) + 'px';
    editor.style.fontFamily = 'Inter, sans-serif';
    editor.style.fontSize = (14 * this.scale) + 'px';
    editor.style.lineHeight = '1.5';
    editor.style.boxShadow = `${4 * this.scale}px ${4 * this.scale}px ${8 * this.scale}px rgba(0,0,0,0.15)`;
    editor.style.resize = 'none';
    editor.style.outline = 'none';

    overlay.appendChild(editor);
    document.body.appendChild(overlay);
    editor.focus();

    const finish = () => {
      note.text = editor.value;
      const op: DrawOp = {
        type: 'draw',
        id: uuidv4(),
        userId: this.userId,
        tool: 'note',
        color: note.color,
        strokeWidth: this.currentStrokeWidth,
        noteId: note.id,
        text: note.text
      };
      if (this.callbacks.onNoteUpdate) {
        this.callbacks.onNoteUpdate(op);
      } else {
        this.callbacks.onDraw(op);
      }
      document.body.removeChild(overlay);
      this.render();
    };

    editor.addEventListener('blur', finish);
    editor.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        finish();
      }
    });
  }

  private zoomAt(cx: number, cy: number, newScale: number): void {
    const worldX = (cx - this.offsetX) / this.scale;
    const worldY = (cy - this.offsetY) / this.scale;
    this.scale = newScale;
    this.offsetX = cx - worldX * this.scale;
    this.offsetY = cy - worldY * this.scale;
  }

  private screenToWorld(sx: number, sy: number): Point {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  private worldToScreen(wx: number, wy: number): Point {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY
    };
  }

  private smoothCatmullRom(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const result: Point[] = [];
    result.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        result.push({ x, y });
      }
    }

    return result;
  }

  private render(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.ctx.fillStyle = '#f5f0e8';
    this.ctx.fillRect(0, 0, w, h);

    this.drawGrid(w, h);

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    for (const op of this.operations) {
      this.drawOperation(op);
    }

    if (this.isDrawing) {
      this.drawPreview();
    }

    this.drawNotes();

    this.ctx.restore();

    this.drawEdgeMasks(w, h);
  }

  private drawGrid(w: number, h: number): void {
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(180, 180, 180, ${GRID_ALPHA})`;
    this.ctx.lineWidth = GRID_LINE_WIDTH;

    const startX = ((-this.offsetX) % (GRID_SIZE * this.scale)) - (GRID_SIZE * this.scale);
    const startY = ((-this.offsetY) % (GRID_SIZE * this.scale)) - (GRID_SIZE * this.scale);
    const step = GRID_SIZE * this.scale;

    this.ctx.beginPath();
    for (let x = startX; x < w + step; x += step) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }
    for (let y = startY; y < h + step; y += step) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawOperation(op: DrawOp): void {
    this.ctx.save();
    this.ctx.strokeStyle = op.color;
    this.ctx.fillStyle = op.color;
    this.ctx.lineWidth = op.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (op.tool) {
      case 'pen':
        if (op.points && op.points.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(op.points[0].x, op.points[0].y);
          for (let i = 1; i < op.points.length; i++) {
            this.ctx.lineTo(op.points[i].x, op.points[i].y);
          }
          this.ctx.stroke();
        }
        break;

      case 'line':
        if (op.startX !== undefined && op.endX !== undefined) {
          this.ctx.beginPath();
          this.ctx.moveTo(op.startX, op.startY!);
          this.ctx.lineTo(op.endX, op.endY!);
          this.ctx.stroke();
        }
        break;

      case 'rectangle':
        if (op.x !== undefined && op.width !== undefined) {
          this.ctx.fillStyle = this.hexToRgba(op.color, 0.2);
          this.ctx.fillRect(op.x, op.y!, op.width, op.height!);
          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = op.color;
          this.ctx.strokeRect(op.x, op.y!, op.width, op.height!);
        }
        break;

      case 'circle':
        if (op.x !== undefined && op.radius !== undefined) {
          this.ctx.fillStyle = this.hexToRgba(op.color, 0.2);
          this.ctx.beginPath();
          this.ctx.arc(op.x, op.y!, op.radius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = op.color;
          this.ctx.stroke();
        }
        break;
    }

    this.ctx.restore();
  }

  private drawPreview(): void {
    this.ctx.save();
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.lineWidth = this.currentStrokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = 0.7;

    switch (this.currentTool) {
      case 'pen':
        if (this.currentPoints.length > 1) {
          const smoothed = this.smoothCatmullRom(this.currentPoints);
          this.ctx.beginPath();
          this.ctx.moveTo(smoothed[0].x, smoothed[0].y);
          for (let i = 1; i < smoothed.length; i++) {
            this.ctx.lineTo(smoothed[i].x, smoothed[i].y);
          }
          this.ctx.stroke();
        }
        break;

      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(this.drawStartX, this.drawStartY);
        this.ctx.lineTo(this.drawEndX, this.drawEndY);
        this.ctx.stroke();
        break;

      case 'rectangle': {
        const x = Math.min(this.drawStartX, this.drawEndX);
        const y = Math.min(this.drawStartY, this.drawEndY);
        const w = Math.abs(this.drawEndX - this.drawStartX);
        const h = Math.abs(this.drawEndY - this.drawStartY);
        this.ctx.fillStyle = this.hexToRgba(this.currentColor, 0.2);
        this.ctx.fillRect(x, y, w, h);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        const dx = this.drawEndX - this.drawStartX;
        const dy = this.drawEndY - this.drawStartY;
        const r = Math.hypot(dx, dy);
        this.ctx.fillStyle = this.hexToRgba(this.currentColor, 0.2);
        this.ctx.beginPath();
        this.ctx.arc(this.drawStartX, this.drawStartY, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        break;
      }
    }

    this.ctx.restore();
  }

  private drawNotes(): void {
    for (const note of this.notes) {
      this.ctx.save();

      this.ctx.fillStyle = '#fff9c4';
      this.ctx.shadowColor = 'rgba(0,0,0,0.15)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 4;
      this.roundRect(note.x, note.y, 160, 120, 8);
      this.ctx.fill();

      this.ctx.shadowColor = 'transparent';
      this.ctx.strokeStyle = note.color;
      this.ctx.lineWidth = 2;
      this.roundRect(note.x, note.y, 160, 120, 8);
      this.ctx.stroke();

      this.ctx.fillStyle = '#333';
      this.ctx.font = '14px Inter, sans-serif';
      this.ctx.textBaseline = 'top';
      this.wrapText(note.text || '双击编辑', note.x + 8, note.y + 8, 144, 18);

      this.ctx.restore();
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const chars = text.split('');
    let line = '';
    let currentY = y;

    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, currentY);
        line = chars[i];
        currentY += lineHeight;
        if (currentY - y > 104) return;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }

  private drawEdgeMasks(w: number, h: number): void {
    const maskSize = 60;
    const gradientLeft = this.ctx.createLinearGradient(0, 0, maskSize, 0);
    gradientLeft.addColorStop(0, 'rgba(245, 240, 232, 0.8)');
    gradientLeft.addColorStop(1, 'rgba(245, 240, 232, 0)');
    this.ctx.fillStyle = gradientLeft;
    this.ctx.fillRect(0, 0, maskSize, h);

    const gradientRight = this.ctx.createLinearGradient(w - maskSize, 0, w, 0);
    gradientRight.addColorStop(0, 'rgba(245, 240, 232, 0)');
    gradientRight.addColorStop(1, 'rgba(245, 240, 232, 0.8)');
    this.ctx.fillStyle = gradientRight;
    this.ctx.fillRect(w - maskSize, 0, maskSize, h);

    const gradientTop = this.ctx.createLinearGradient(0, 0, 0, maskSize);
    gradientTop.addColorStop(0, 'rgba(245, 240, 232, 0.8)');
    gradientTop.addColorStop(1, 'rgba(245, 240, 232, 0)');
    this.ctx.fillStyle = gradientTop;
    this.ctx.fillRect(0, 0, w, maskSize);

    const gradientBottom = this.ctx.createLinearGradient(0, h - maskSize, 0, h);
    gradientBottom.addColorStop(0, 'rgba(245, 240, 232, 0)');
    gradientBottom.addColorStop(1, 'rgba(245, 240, 232, 0.8)');
    this.ctx.fillStyle = gradientBottom;
    this.ctx.fillRect(0, h - maskSize, w, maskSize);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  destroy(): void {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
