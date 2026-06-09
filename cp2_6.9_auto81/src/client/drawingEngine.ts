import { v4 as uuidv4 } from 'uuid';
import type {
  DrawElement,
  PenElement,
  RectElement,
  CircleElement,
  TextElement,
  Point,
  ToolType,
  ViewTransform,
  Operation,
} from '../shared/types';

type Handler = (op: Operation) => void;

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private elements: DrawElement[] = [];
  private selectedId: string | null = null;
  private tool: ToolType = 'pen';
  private color: string = '#000000';
  private lineWidth: number = 2;
  private isDrawing: boolean = false;
  private tempElement: DrawElement | null = null;
  private startPoint: Point | null = null;
  private view: ViewTransform = { x: 0, y: 0, scale: 1 };
  private onOperation: Handler | null = null;
  private isPanning: boolean = false;
  private panStart: Point | null = null;
  private viewStart: ViewTransform | null = null;
  private draggingAnchor: string | null = null;
  private selectedStartPos: { x: number; y: number; w: number; h: number } | null = null;
  private animatingElements: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
  }

  setOperationHandler(handler: Handler) {
    this.onOperation = handler;
  }

  setElements(elements: DrawElement[]) {
    this.elements = elements.map((e) => ({ ...e }));
    this.render();
  }

  getElements(): DrawElement[] {
    return this.elements.map((e) => ({ ...e }));
  }

  setTool(tool: ToolType) {
    this.tool = tool;
    this.selectedId = null;
    this.render();
  }

  getTool(): ToolType {
    return this.tool;
  }

  setColor(color: string) {
    this.color = color;
  }

  getColor(): string {
    return this.color;
  }

  setLineWidth(width: number) {
    this.lineWidth = width;
  }

  getView(): ViewTransform {
    return { ...this.view };
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  private screenToWorld(sx: number, sy: number): Point {
    return {
      x: (sx - this.view.x) / this.view.scale,
      y: (sy - this.view.y) / this.view.scale,
    };
  }

  private worldToScreen(wx: number, wy: number): Point {
    return {
      x: wx * this.view.scale + this.view.x,
      y: wy * this.view.scale + this.view.y,
    };
  }

  handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      this.isPanning = true;
      this.panStart = { x: sx, y: sy };
      this.viewStart = { ...this.view };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const wp = this.screenToWorld(sx, sy);

    if (this.tool === 'select') {
      const anchor = this.hitTestAnchor(sx, sy);
      if (anchor) {
        this.draggingAnchor = anchor;
        const sel = this.elements.find((el) => el.id === this.selectedId);
        if (sel) {
          const bbox = this.getBoundingBox(sel);
          this.selectedStartPos = { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
        }
        return;
      }
      const hit = this.hitTest(wp);
      if (hit) {
        this.selectedId = hit.id;
        this.startPoint = wp;
        const bbox = this.getBoundingBox(hit);
        this.selectedStartPos = { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
      } else {
        this.selectedId = null;
      }
      this.render();
      return;
    }

    if (this.tool === 'eraser') {
      const hit = this.hitTest(wp);
      if (hit) {
        this.deleteElement(hit.id);
      }
      return;
    }

    if (this.tool === 'text') {
      const text = window.prompt('请输入文本:', '文本');
      if (text && text.trim()) {
        this.addTextElement(wp, text);
      }
      return;
    }

    this.isDrawing = true;
    this.startPoint = wp;

    if (this.tool === 'pen') {
      this.tempElement = {
        id: uuidv4(),
        type: 'pen',
        color: this.color,
        lineWidth: this.lineWidth,
        opacity: 1,
        createdAt: Date.now(),
        points: [wp],
      } as PenElement;
    } else if (this.tool === 'rect') {
      this.tempElement = {
        id: uuidv4(),
        type: 'rect',
        color: this.color,
        lineWidth: this.lineWidth,
        opacity: 1,
        createdAt: Date.now(),
        x: wp.x,
        y: wp.y,
        width: 0,
        height: 0,
      } as RectElement;
    } else if (this.tool === 'circle') {
      this.tempElement = {
        id: uuidv4(),
        type: 'circle',
        color: this.color,
        lineWidth: this.lineWidth,
        opacity: 1,
        createdAt: Date.now(),
        cx: wp.x,
        cy: wp.y,
        r: 0,
      } as CircleElement;
    }
  }

  handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (this.isPanning && this.panStart && this.viewStart) {
      this.view.x = this.viewStart.x + (sx - this.panStart.x);
      this.view.y = this.viewStart.y + (sy - this.panStart.y);
      this.render();
      return;
    }

    if (this.tool === 'select' && this.draggingAnchor && this.selectedId && this.selectedStartPos) {
      const wp = this.screenToWorld(sx, sy);
      this.resizeSelected(this.draggingAnchor, wp);
      this.render();
      return;
    }

    if (this.tool === 'select' && this.selectedId && this.startPoint && this.selectedStartPos) {
      const wp = this.screenToWorld(sx, sy);
      const dx = wp.x - this.startPoint.x;
      const dy = wp.y - this.startPoint.y;
      this.moveSelected(dx, dy);
      this.render();
      return;
    }

    if (!this.isDrawing || !this.tempElement || !this.startPoint) return;

    const wp = this.screenToWorld(sx, sy);

    if (this.tempElement.type === 'pen') {
      (this.tempElement as PenElement).points.push(wp);
    } else if (this.tempElement.type === 'rect') {
      (this.tempElement as RectElement).width = wp.x - this.startPoint.x;
      (this.tempElement as RectElement).height = wp.y - this.startPoint.y;
    } else if (this.tempElement.type === 'circle') {
      const dx = wp.x - this.startPoint.x;
      const dy = wp.y - this.startPoint.y;
      (this.tempElement as CircleElement).r = Math.sqrt(dx * dx + dy * dy);
    }
    this.render();
  }

  handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (this.isPanning) {
      this.isPanning = false;
      this.panStart = null;
      this.viewStart = null;
      this.canvas.style.cursor = this.getCursor();
      return;
    }

    if (this.tool === 'select' && this.draggingAnchor && this.selectedId) {
      this.draggingAnchor = null;
      const sel = this.elements.find((el) => el.id === this.selectedId);
      if (sel) {
        this.emitOperation({ type: 'modify', elementId: sel.id, modifications: { ...sel } });
      }
      this.selectedStartPos = null;
      return;
    }

    if (this.tool === 'select' && this.selectedId && this.startPoint && this.selectedStartPos) {
      const sel = this.elements.find((el) => el.id === this.selectedId);
      if (sel) {
        this.emitOperation({ type: 'move', elementId: sel.id, modifications: { ...sel } });
      }
      this.startPoint = null;
      this.selectedStartPos = null;
      return;
    }

    if (!this.isDrawing || !this.tempElement) return;
    this.isDrawing = false;

    if (this.tempElement.type === 'pen') {
      const pen = this.tempElement as PenElement;
      if (pen.points.length > 1) {
        this.addElement(pen);
      }
    } else if (this.tempElement.type === 'rect') {
      const r = this.tempElement as RectElement;
      if (Math.abs(r.width) > 2 && Math.abs(r.height) > 2) {
        if (r.width < 0) { r.x += r.width; r.width = Math.abs(r.width); }
        if (r.height < 0) { r.y += r.height; r.height = Math.abs(r.height); }
        this.addElement(r);
      }
    } else if (this.tempElement.type === 'circle') {
      const c = this.tempElement as CircleElement;
      if (c.r > 2) {
        this.addElement(c);
      }
    }
    this.tempElement = null;
    this.startPoint = null;
  }

  handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(5, Math.max(0.1, this.view.scale * delta));

    const worldX = (sx - this.view.x) / this.view.scale;
    const worldY = (sy - this.view.y) / this.view.scale;

    this.view.scale = newScale;
    this.view.x = sx - worldX * newScale;
    this.view.y = sy - worldY * newScale;

    this.render();
  }

  handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) {
      e.preventDefault();
      this.deleteElement(this.selectedId);
    }
  }

  getCursor(): string {
    switch (this.tool) {
      case 'pen': return 'crosshair';
      case 'eraser': return 'cell';
      case 'rect':
      case 'circle':
      case 'text': return 'crosshair';
      case 'select': return 'default';
      default: return 'default';
    }
  }

  private addElement(element: DrawElement) {
    element.isNew = true;
    this.elements.push(element);
    this.animatingElements.set(element.id, Date.now());
    setTimeout(() => {
      const el = this.elements.find((e) => e.id === element.id);
      if (el) el.isNew = false;
      this.animatingElements.delete(element.id);
      this.render();
    }, 200);
    this.emitOperation({ type: 'add', element: { ...element, isNew: false } });
    this.render();
  }

  private addTextElement(point: Point, text: string) {
    const element: TextElement = {
      id: uuidv4(),
      type: 'text',
      color: this.color,
      lineWidth: this.lineWidth,
      opacity: 1,
      createdAt: Date.now(),
      x: point.x,
      y: point.y,
      text,
      fontSize: 18,
      isNew: true,
    };
    this.elements.push(element);
    this.animatingElements.set(element.id, Date.now());
    setTimeout(() => {
      const el = this.elements.find((e) => e.id === element.id);
      if (el) el.isNew = false;
      this.animatingElements.delete(element.id);
      this.render();
    }, 200);
    this.emitOperation({ type: 'add', element: { ...element, isNew: false } });
    this.render();
  }

  private deleteElement(id: string) {
    const el = this.elements.find((e) => e.id === id);
    if (!el) return;
    el.isDeleting = true;
    this.render();
    setTimeout(() => {
      this.elements = this.elements.filter((e) => e.id !== id);
      this.selectedId = null;
      this.render();
    }, 150);
    this.emitOperation({ type: 'delete', elementId: id });
  }

  private emitOperation(partial: Partial<Operation>) {
    if (!this.onOperation) return;
    const op: Operation = {
      id: uuidv4(),
      type: partial.type || 'add',
      userId: '',
      timestamp: Date.now(),
      element: partial.element,
      elementId: partial.elementId,
      modifications: partial.modifications,
    };
    this.onOperation(op);
  }

  applyOperation(op: Operation) {
    switch (op.type) {
      case 'add':
        if (op.element) {
          const el = { ...op.element, isNew: true };
          this.elements.push(el);
          setTimeout(() => {
            const e = this.elements.find((x) => x.id === op.element!.id);
            if (e) e.isNew = false;
            this.render();
          }, 200);
        }
        break;
      case 'modify':
      case 'move':
        if (op.elementId && op.modifications) {
          const idx = this.elements.findIndex((e) => e.id === op.elementId);
          if (idx !== -1) {
            this.elements[idx] = { ...this.elements[idx], ...op.modifications } as DrawElement;
          }
        }
        break;
      case 'delete':
        if (op.elementId) {
          const el = this.elements.find((e) => e.id === op.elementId);
          if (el) {
            el.isDeleting = true;
            setTimeout(() => {
              this.elements = this.elements.filter((e) => e.id !== op.elementId);
              if (this.selectedId === op.elementId) this.selectedId = null;
              this.render();
            }, 150);
          }
        }
        break;
    }
    this.render();
  }

  restoreElements(elements: DrawElement[]) {
    this.elements = elements.map((e) => ({ ...e, isNew: true }));
    this.selectedId = null;
    setTimeout(() => {
      this.elements.forEach((e) => (e.isNew = false));
      this.render();
    }, 200);
    this.render();
  }

  private hitTest(p: Point): DrawElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.pointInElement(p, this.elements[i])) {
        return this.elements[i];
      }
    }
    return null;
  }

  private pointInElement(p: Point, el: DrawElement): boolean {
    const tol = 5 / this.view.scale;
    switch (el.type) {
      case 'pen': {
        const pts = (el as PenElement).points;
        for (let i = 1; i < pts.length; i++) {
          if (this.distToSegment(p, pts[i - 1], pts[i]) < tol + el.lineWidth / 2) return true;
        }
        return false;
      }
      case 'rect': {
        const r = el as RectElement;
        return p.x >= r.x - tol && p.x <= r.x + r.width + tol && p.y >= r.y - tol && p.y <= r.y + r.height + tol;
      }
      case 'circle': {
        const c = el as CircleElement;
        const d = Math.sqrt((p.x - c.cx) ** 2 + (p.y - c.cy) ** 2);
        return d <= c.r + tol;
      }
      case 'text': {
        const t = el as TextElement;
        const w = t.text.length * t.fontSize * 0.6;
        const h = t.fontSize * 1.2;
        return p.x >= t.x - tol && p.x <= t.x + w + tol && p.y >= t.y - h - tol && p.y <= t.y + tol;
      }
    }
    return false;
  }

  private distToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    return Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2);
  }

  private hitTestAnchor(sx: number, sy: number): string | null {
    if (!this.selectedId) return null;
    const sel = this.elements.find((el) => el.id === this.selectedId);
    if (!sel) return null;
    const bbox = this.getBoundingBox(sel);
    const tl = this.worldToScreen(bbox.x, bbox.y);
    const br = this.worldToScreen(bbox.x + bbox.w, bbox.y + bbox.h);
    const size = 8;
    const anchors: { name: string; x: number; y: number }[] = [
      { name: 'tl', x: tl.x, y: tl.y },
      { name: 'tr', x: br.x, y: tl.y },
      { name: 'bl', x: tl.x, y: br.y },
      { name: 'br', x: br.x, y: br.y },
      { name: 't', x: (tl.x + br.x) / 2, y: tl.y },
      { name: 'b', x: (tl.x + br.x) / 2, y: br.y },
      { name: 'l', x: tl.x, y: (tl.y + br.y) / 2 },
      { name: 'r', x: br.x, y: (tl.y + br.y) / 2 },
    ];
    for (const a of anchors) {
      if (Math.abs(sx - a.x) <= size && Math.abs(sy - a.y) <= size) return a.name;
    }
    return null;
  }

  private getBoundingBox(el: DrawElement): { x: number; y: number; w: number; h: number } {
    switch (el.type) {
      case 'pen': {
        const pts = (el as PenElement).points;
        if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = pts[0].x, minY = pts[0].y, maxX = pts[0].x, maxY = pts[0].y;
        pts.forEach((p) => {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
      case 'rect':
        return { x: el.x, y: el.y, w: el.width, h: el.height };
      case 'circle':
        return { x: el.cx - el.r, y: el.cy - el.r, w: el.r * 2, h: el.r * 2 };
      case 'text': {
        const w = el.text.length * el.fontSize * 0.6;
        return { x: el.x, y: el.y - el.fontSize * 1.2, w, h: el.fontSize * 1.2 };
      }
    }
  }

  private moveSelected(dx: number, dy: number) {
    const sel = this.elements.find((el) => el.id === this.selectedId);
    if (!sel || !this.selectedStartPos) return;
    if (sel.type === 'pen') {
      const pts = (sel as PenElement).points;
      const firstPt = this.selectedStartPos;
      const origFirst = pts[0];
      pts.forEach((p, i) => {
        p.x = origFirst.x + dx + (p.x - origFirst.x);
        p.y = origFirst.y + dy + (p.y - origFirst.y);
      });
    } else if (sel.type === 'rect') {
      sel.x = this.selectedStartPos.x + dx;
      sel.y = this.selectedStartPos.y + dy;
    } else if (sel.type === 'circle') {
      sel.cx = this.selectedStartPos.x + this.selectedStartPos.w / 2 + dx;
      sel.cy = this.selectedStartPos.y + this.selectedStartPos.h / 2 + dy;
    } else if (sel.type === 'text') {
      sel.x = this.selectedStartPos.x + dx;
      sel.y = this.selectedStartPos.y + this.selectedStartPos.h + dy;
    }
  }

  private resizeSelected(anchor: string, wp: Point) {
    const sel = this.elements.find((el) => el.id === this.selectedId);
    if (!sel || !this.selectedStartPos) return;
    const b = this.selectedStartPos;
    if (sel.type === 'rect') {
      let x = b.x, y = b.y, w = b.w, h = b.h;
      if (anchor.includes('r')) w = Math.max(5, wp.x - x);
      if (anchor.includes('l')) { w = Math.max(5, x + w - wp.x); x = wp.x; }
      if (anchor.includes('b')) h = Math.max(5, wp.y - y);
      if (anchor.includes('t')) { h = Math.max(5, y + h - wp.y); y = wp.y; }
      sel.x = x; sel.y = y; sel.width = w; sel.height = h;
    } else if (sel.type === 'circle') {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      sel.r = Math.max(2, Math.sqrt((wp.x - cx) ** 2 + (wp.y - cy) ** 2));
    } else if (sel.type === 'pen') {
      const pts = (sel as PenElement).points;
      const minX = b.x, minY = b.y;
      const maxX = b.x + b.w, maxY = b.y + b.h;
      let nx = b.x, ny = b.y, nw = b.w, nh = b.h;
      if (anchor.includes('r')) nw = Math.max(5, wp.x - nx);
      if (anchor.includes('l')) { nw = Math.max(5, nx + nw - wp.x); nx = wp.x; }
      if (anchor.includes('b')) nh = Math.max(5, wp.y - ny);
      if (anchor.includes('t')) { nh = Math.max(5, ny + nh - wp.y); ny = wp.y; }
      pts.forEach((p) => {
        const rx = (p.x - minX) / b.w;
        const ry = (p.y - minY) / b.h;
        p.x = nx + rx * nw;
        p.y = ny + ry * nh;
      });
    }
  }

  render() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, rect.width, rect.height);

    this.drawGrid(ctx, rect);

    ctx.save();
    ctx.translate(this.view.x, this.view.y);
    ctx.scale(this.view.scale, this.view.scale);

    this.elements.forEach((el) => this.drawElement(ctx, el));

    if (this.tempElement) {
      this.drawElement(ctx, this.tempElement);
    }

    if (this.selectedId) {
      this.drawSelection(ctx);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, rect: DOMRect) {
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 1;
    const step = 40 * this.view.scale;
    const offsetX = this.view.x % step;
    const offsetY = this.view.y % step;
    ctx.beginPath();
    for (let x = offsetX; x < rect.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
    }
    for (let y = offsetY; y < rect.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
    }
    ctx.stroke();
  }

  private drawElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
    ctx.save();
    ctx.globalAlpha = el.isNew ? 0 : el.isDeleting ? 0.3 : el.opacity;
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = el.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el.type) {
      case 'pen': {
        const pts = (el as PenElement).points;
        if (pts.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        break;
      }
      case 'rect': {
        const r = el as RectElement;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        break;
      }
      case 'circle': {
        const c = el as CircleElement;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'text': {
        const t = el as TextElement;
        ctx.font = `${t.fontSize}px sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(t.text, t.x, t.y);
        break;
      }
    }
    ctx.restore();
  }

  private drawSelection(ctx: CanvasRenderingContext2D) {
    const sel = this.elements.find((el) => el.id === this.selectedId);
    if (!sel) return;
    const bbox = this.getBoundingBox(sel);
    const pad = 4;
    ctx.save();
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1 / this.view.scale;
    ctx.setLineDash([4 / this.view.scale, 4 / this.view.scale]);
    ctx.strokeRect(bbox.x - pad, bbox.y - pad, bbox.w + pad * 2, bbox.h + pad * 2);
    ctx.setLineDash([]);

    const anchors = [
      { x: bbox.x - pad, y: bbox.y - pad },
      { x: bbox.x + bbox.w + pad, y: bbox.y - pad },
      { x: bbox.x - pad, y: bbox.y + bbox.h + pad },
      { x: bbox.x + bbox.w + pad, y: bbox.y + bbox.h + pad },
      { x: (bbox.x + bbox.x + bbox.w) / 2, y: bbox.y - pad },
      { x: (bbox.x + bbox.x + bbox.w) / 2, y: bbox.y + bbox.h + pad },
      { x: bbox.x - pad, y: (bbox.y + bbox.y + bbox.h) / 2 },
      { x: bbox.x + bbox.w + pad, y: (bbox.y + bbox.y + bbox.h) / 2 },
    ];
    ctx.fillStyle = '#FFFFFF';
    anchors.forEach((a) => {
      ctx.fillRect(a.x - 4 / this.view.scale, a.y - 4 / this.view.scale, 8 / this.view.scale, 8 / this.view.scale);
      ctx.strokeRect(a.x - 4 / this.view.scale, a.y - 4 / this.view.scale, 8 / this.view.scale, 8 / this.view.scale);
    });
    ctx.restore();
  }
}
