import { store, type StickyNote, type Shape, type Group, type AppState } from './store';

interface InteractionState {
  isDragging: boolean;
  dragType: 'none' | 'pan' | 'note' | 'draw' | 'marquee' | 'group';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetId: string | null;
  dragOffsets: Map<string, { dx: number; dy: number }>;
  drawingShape: Shape | null;
  marqueeRect: { x: number; y: number; w: number; h: number } | null;
}

export class Whiteboard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private editorContainer: HTMLElement;
  private state: AppState;
  private interaction: InteractionState;
  private rafId: number | null = null;
  private dirty = true;
  private resizeObserver: ResizeObserver | null = null;
  private noteEls: Map<string, HTMLDivElement> = new Map();
  private groupEls: Map<string, HTMLDivElement> = new Map();
  private ripples: { x: number; y: number; startTime: number }[] = [];
  private gridSize = 40;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = store.getState();
    this.interaction = {
      isDragging: false,
      dragType: 'none',
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      targetId: null,
      dragOffsets: new Map(),
      drawingShape: null,
      marqueeRect: null
    };

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.display = 'block';

    this.editorContainer = document.createElement('div');
    this.editorContainer.style.position = 'absolute';
    this.editorContainer.style.inset = '0';
    this.editorContainer.style.pointerEvents = 'none';
    this.editorContainer.style.overflow = 'hidden';

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.editorContainer);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.setupEventListeners();
    this.resize();
    this.renderLoop();

    store.subscribe((state) => {
      this.state = state;
      this.markDirty();
      this.syncNoteElements();
      this.syncGroupElements();
    });
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.markDirty();
    });
    this.resizeObserver.observe(this.container);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.state.panOffset.x) / this.state.zoom,
      y: (sy - this.state.panOffset.y) / this.state.zoom
    };
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.state.zoom + this.state.panOffset.x,
      y: wy * this.state.zoom + this.state.panOffset.y
    };
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({ x, y, startTime: performance.now() });
    this.markDirty();
  }

  markDirty(): void {
    this.dirty = true;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.handlePointerDown(sx, sy, e.button === 1 || e.buttons === 4);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.handlePointerMove(sx, sy);
  };

  private onMouseUp = (): void => {
    this.handlePointerUp();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.handlePointerDown(t.clientX - rect.left, t.clientY - rect.top, false);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.handlePointerMove(t.clientX - rect.left, t.clientY - rect.top);
  };

  private onTouchEnd = (): void => {
    this.handlePointerUp();
  };

  private handlePointerDown(sx: number, sy: number, isPanButton: boolean): void {
    this.addRipple(sx, sy);
    const world = this.screenToWorld(sx, sy);
    const tool = this.state.activeTool;

    const noteHit = this.hitTestNote(world.x, world.y);
    const groupHit = this.hitTestGroup(world.x, world.y);

    if (isPanButton || (tool === 'select' && noteHit === null && groupHit === null)) {
      this.interaction.isDragging = true;
      this.interaction.dragType = 'pan';
      this.interaction.startX = sx;
      this.interaction.startY = sy;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    switch (tool) {
      case 'select': {
        if (noteHit) {
          this.interaction.isDragging = true;
          this.interaction.dragType = 'note';
          this.interaction.targetId = noteHit.id;
          this.interaction.startX = world.x;
          this.interaction.startY = world.y;
          this.interaction.dragOffsets.clear();
          const selected = this.state.selectedIds.includes(noteHit.id)
            ? this.state.selectedIds
            : [noteHit.id];
          for (const nid of selected) {
            const n = this.state.notes.find((x) => x.id === nid);
            if (n) this.interaction.dragOffsets.set(nid, { dx: world.x - n.x, dy: world.y - n.y });
          }
          if (this.state.selectedIds.length <= 1 || !this.state.selectedIds.includes(noteHit.id)) {
            store.setSelectedIds(selected);
          }
          store.bringNoteToFront(noteHit.id);
          return;
        }
        if (groupHit && !groupHit.collapsed && world.y < groupHit.y + 32) {
          this.interaction.isDragging = true;
          this.interaction.dragType = 'group';
          this.interaction.targetId = groupHit.id;
          this.interaction.startX = world.x;
          this.interaction.startY = world.y;
          return;
        }
        store.setSelectedIds([]);
        return;
      }
      case 'sticky': {
        const note = store.addNote(world.x - 90, world.y - 70, '');
        setTimeout(() => this.startEditing(note.id), 50);
        return;
      }
      case 'pen':
      case 'line':
      case 'eraser': {
        this.interaction.isDragging = true;
        this.interaction.dragType = 'draw';
        this.interaction.startX = world.x;
        this.interaction.startY = world.y;
        this.interaction.drawingShape = {
          id: '',
          type: tool,
          color: tool === 'eraser' ? '#F5F5F5' : this.state.penColor,
          thickness: tool === 'eraser' ? this.state.penThickness * 3 : this.state.penThickness,
          points: [{ x: world.x, y: world.y }]
        };
        this.markDirty();
        return;
      }
      case 'marquee': {
        this.interaction.isDragging = true;
        this.interaction.dragType = 'marquee';
        this.interaction.startX = world.x;
        this.interaction.startY = world.y;
        this.interaction.marqueeRect = { x: world.x, y: world.y, w: 0, h: 0 };
        this.markDirty();
        return;
      }
    }
  }

  private handlePointerMove(sx: number, sy: number): void {
    this.interaction.currentX = sx;
    this.interaction.currentY = sy;
    const world = this.screenToWorld(sx, sy);

    if (!this.interaction.isDragging) {
      const tool = this.state.activeTool;
      if (tool === 'select') {
        const n = this.hitTestNote(world.x, world.y);
        const g = this.hitTestGroup(world.x, world.y);
        if (n) this.canvas.style.cursor = 'move';
        else if (g) this.canvas.style.cursor = 'default';
        else this.canvas.style.cursor = 'default';
      } else if (tool === 'pen' || tool === 'line' || tool === 'eraser') {
        this.canvas.style.cursor = 'crosshair';
      } else if (tool === 'sticky') {
        this.canvas.style.cursor = 'copy';
      } else if (tool === 'marquee') {
        this.canvas.style.cursor = 'crosshair';
      }
      return;
    }

    switch (this.interaction.dragType) {
      case 'pan': {
        const dx = sx - this.interaction.startX;
        const dy = sy - this.interaction.startY;
        this.interaction.startX = sx;
        this.interaction.startY = sy;
        store.setPanOffset(
          this.state.panOffset.x + dx,
          this.state.panOffset.y + dy
        );
        return;
      }
      case 'note': {
        for (const [nid, offset] of this.interaction.dragOffsets) {
          store.updateNote(nid, {
            x: world.x - offset.dx,
            y: world.y - offset.dy
          });
        }
        return;
      }
      case 'group': {
        const group = this.state.groups.find((g) => g.id === this.interaction.targetId);
        if (group) {
          const dx = world.x - this.interaction.startX;
          const dy = world.y - this.interaction.startY;
          this.interaction.startX = world.x;
          this.interaction.startY = world.y;
          store.updateGroup(group.id, {
            x: group.x + dx,
            y: group.y + dy
          });
        }
        return;
      }
      case 'draw': {
        if (this.interaction.drawingShape) {
          this.interaction.drawingShape.points.push({ x: world.x, y: world.y });
          this.markDirty();
        }
        return;
      }
      case 'marquee': {
        const x = Math.min(this.interaction.startX, world.x);
        const y = Math.min(this.interaction.startY, world.y);
        const w = Math.abs(world.x - this.interaction.startX);
        const h = Math.abs(world.y - this.interaction.startY);
        this.interaction.marqueeRect = { x, y, w, h };
        const selected = this.state.notes
          .filter((n) =>
            n.x + n.width > x && n.x < x + w &&
            n.y + n.height > y && n.y < y + h
          )
          .map((n) => n.id);
        store.setSelectedIds(selected);
        this.markDirty();
        return;
      }
    }
  }

  private handlePointerUp(): void {
    if (!this.interaction.isDragging) return;

    if (this.interaction.dragType === 'draw' && this.interaction.drawingShape) {
      const shape = this.interaction.drawingShape;
      if (shape.points.length >= 2) {
        store.addShape(shape.type, shape.points);
      }
      this.interaction.drawingShape = null;
    }

    if (this.interaction.dragType === 'marquee') {
      this.interaction.marqueeRect = null;
    }

    this.interaction.isDragging = false;
    this.interaction.dragType = 'none';
    this.canvas.style.cursor = 'default';
    this.markDirty();
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldBefore = this.screenToWorld(sx, sy);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, this.state.zoom * factor));
    if (newZoom === this.state.zoom) return;
    store.setZoom(newZoom);
    const worldAfter = this.screenToWorld(sx, sy);
    store.setPanOffset(
      this.state.panOffset.x + (worldAfter.x - worldBefore.x) * newZoom,
      this.state.panOffset.y + (worldAfter.y - worldBefore.y) * newZoom
    );
  };

  private onDoubleClick = (e: MouseEvent): void => {
    if (this.state.activeTool !== 'select') return;
    const rect = this.canvas.getBoundingClientRect();
    const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const note = this.hitTestNote(world.x, world.y);
    if (note) {
      this.startEditing(note.id);
    }
  };

  private hitTestNote(wx: number, wy: number): StickyNote | null {
    for (let i = this.state.notes.length - 1; i >= 0; i--) {
      const n = this.state.notes[i];
      const group = n.groupId ? this.state.groups.find((g) => g.id === n.groupId) : null;
      if (group && group.collapsed) continue;
      if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
        return n;
      }
    }
    return null;
  }

  private hitTestGroup(wx: number, wy: number): Group | null {
    for (let i = this.state.groups.length - 1; i >= 0; i--) {
      const g = this.state.groups[i];
      const hitY = g.collapsed ? g.y + 32 : g.y + g.height;
      if (wx >= g.x && wx <= g.x + g.width && wy >= g.y && wy <= hitY) {
        return g;
      }
    }
    return null;
  }

  private startEditing(noteId: string): void {
    const note = this.state.notes.find((n) => n.id === noteId);
    if (!note) return;
    store.setActiveTool('select');
    const screen = this.worldToScreen(note.x, note.y);
    const ta = document.createElement('textarea');
    ta.value = note.content;
    ta.style.position = 'absolute';
    ta.style.left = screen.x + 'px';
    ta.style.top = screen.y + 'px';
    ta.style.width = (note.width * this.state.zoom) + 'px';
    ta.style.height = (note.height * this.state.zoom) + 'px';
    ta.style.backgroundColor = note.color;
    ta.style.border = '2px solid #87CEEB';
    ta.style.borderRadius = '6px';
    ta.style.padding = '10px';
    ta.style.fontSize = (13 * this.state.zoom) + 'px';
    ta.style.lineHeight = '1.4';
    ta.style.resize = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    ta.style.zIndex = '10000';
    ta.style.pointerEvents = 'auto';
    ta.style.fontFamily = 'inherit';
    ta.style.boxSizing = 'border-box';

    const finish = () => {
      store.updateNote(noteId, { content: ta.value });
      ta.remove();
    };
    ta.addEventListener('blur', finish);
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') finish();
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) finish();
    });

    this.editorContainer.appendChild(ta);
    ta.focus();
    ta.select();
  }

  private renderMarkdown(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];
    for (const line of lines) {
      let l = line;
      l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      l = l.replace(/\*(.+?)\*/g, '<em>$1</em>');
      l = l.replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px">$1</code>');
      const hMatch = l.match(/^(#{1,6})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const size = 20 - level * 2;
        l = `<div style="font-size:${size}px;font-weight:600;margin:4px 0">${hMatch[2]}</div>`;
      }
      out.push(l);
    }
    return out.join('<br/>');
  }

  private syncNoteElements(): void {
    const currentIds = new Set(this.state.notes.map((n) => n.id));
    for (const [id, el] of this.noteEls) {
      if (!currentIds.has(id)) {
        el.remove();
        this.noteEls.delete(id);
      }
    }
    const visibleNotes = this.state.notes.filter((n) => {
      const g = n.groupId ? this.state.groups.find((x) => x.id === n.groupId) : null;
      return !(g && g.collapsed);
    });
    for (const note of visibleNotes) {
      let el = this.noteEls.get(note.id);
      if (!el) {
        el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'move';
        el.style.borderRadius = '6px';
        el.style.overflow = 'hidden';
        el.style.transition = 'box-shadow 0.15s';
        el.style.willChange = 'transform, left, top';
        el.style.userSelect = 'none';
        el.style.boxSizing = 'border-box';
        this.editorContainer.appendChild(el);
        this.noteEls.set(note.id, el);
      }
      const screen = this.worldToScreen(note.x, note.y);
      el.style.left = screen.x + 'px';
      el.style.top = screen.y + 'px';
      el.style.width = (note.width * this.state.zoom) + 'px';
      el.style.height = (note.height * this.state.zoom) + 'px';
      el.style.backgroundColor = note.color;
      el.style.zIndex = String(note.zIndex + 10);
      el.style.padding = (10 * this.state.zoom) + 'px';
      el.style.fontSize = (13 * this.state.zoom) + 'px';
      el.style.lineHeight = '1.4';
      el.style.color = '#333';
      const selected = this.state.selectedIds.includes(note.id);
      el.style.boxShadow = selected
        ? '0 2px 8px rgba(0,0,0,0.12), 0 0 0 2px #87CEEB'
        : '0 2px 8px rgba(0,0,0,0.12)';
      el.innerHTML = `<div style="width:100%;height:100%;overflow:hidden;word-break:break-word">${
        this.renderMarkdown(note.content) || '<span style="opacity:0.4">双击编辑...</span>'
      }</div>`;
    }
  }

  private syncGroupElements(): void {
    const currentIds = new Set(this.state.groups.map((g) => g.id));
    for (const [id, el] of this.groupEls) {
      if (!currentIds.has(id)) {
        el.remove();
        this.groupEls.delete(id);
      }
    }
    for (const group of this.state.groups) {
      let el = this.groupEls.get(group.id);
      if (!el) {
        el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.pointerEvents = 'auto';
        el.style.borderRadius = '8px';
        el.style.border = '2px dashed rgba(135, 206, 235, 0.6)';
        el.style.backgroundColor = 'rgba(135, 206, 235, 0.05)';
        el.style.overflow = 'hidden';
        el.style.willChange = 'transform, left, top';
        this.editorContainer.appendChild(el);
        this.groupEls.set(group.id, el);
      }
      const screen = this.worldToScreen(group.x, group.y);
      el.style.left = screen.x + 'px';
      el.style.top = screen.y + 'px';
      el.style.zIndex = '5';
      if (group.collapsed) {
        el.style.width = (group.width * this.state.zoom) + 'px';
        el.style.height = (32 * this.state.zoom) + 'px';
      } else {
        el.style.width = (group.width * this.state.zoom) + 'px';
        el.style.height = (group.height * this.state.zoom) + 'px';
      }
      while (el.firstChild) el.removeChild(el.firstChild);
      const titleBar = document.createElement('div');
      titleBar.style.display = 'flex';
      titleBar.style.alignItems = 'center';
      titleBar.style.padding = `0 ${8 * this.state.zoom}px`;
      titleBar.style.height = (32 * this.state.zoom) + 'px';
      titleBar.style.backgroundColor = 'rgba(135, 206, 235, 0.15)';
      titleBar.style.borderBottom = group.collapsed ? 'none' : '1px solid rgba(135, 206, 235, 0.3)';
      titleBar.style.cursor = 'move';
      titleBar.style.gap = `${4 * this.state.zoom}px`;

      const toggle = document.createElement('span');
      toggle.textContent = group.collapsed ? '▶' : '▼';
      toggle.style.cursor = 'pointer';
      toggle.style.fontSize = (12 * this.state.zoom) + 'px';
      toggle.style.color = '#555';
      toggle.style.width = (16 * this.state.zoom) + 'px';
      toggle.style.textAlign = 'center';
      toggle.style.flexShrink = '0';

      const titleEl = document.createElement('div');
      titleEl.contentEditable = 'true';
      titleEl.style.flex = '1';
      titleEl.style.fontSize = (13 * this.state.zoom) + 'px';
      titleEl.style.fontWeight = '600';
      titleEl.style.color = '#333';
      titleEl.style.outline = 'none';
      titleEl.style.userSelect = 'text';
      titleEl.textContent = group.title;

      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.fontSize = (12 * this.state.zoom) + 'px';
      deleteBtn.style.color = '#999';
      deleteBtn.style.padding = `0 ${4 * this.state.zoom}px`;
      deleteBtn.style.flexShrink = '0';

      toggle.onclick = (e) => { e.stopPropagation(); store.toggleGroupCollapsed(group.id); };
      titleEl.onblur = () => { if (titleEl.textContent !== group.title) store.updateGroup(group.id, { title: titleEl.textContent || '分组' }); };
      titleEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } };
      deleteBtn.onclick = (e) => { e.stopPropagation(); store.deleteGroup(group.id); };

      titleBar.appendChild(toggle);
      titleBar.appendChild(titleEl);
      titleBar.appendChild(deleteBtn);
      el.appendChild(titleBar);
    }
  }

  private renderLoop = (): void => {
    this.rafId = requestAnimationFrame(this.renderLoop);
    const now = performance.now();
    const beforeLen = this.ripples.length;
    this.ripples = this.ripples.filter((r) => now - r.startTime < 500);
    if (this.ripples.length !== beforeLen) this.dirty = true;
    if (this.dirty) {
      this.render();
      this.dirty = false;
    }
  };

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, width, height);
    this.drawGrid(width, height);
    this.drawShapes();
    if (this.interaction.drawingShape) {
      this.drawShape(this.interaction.drawingShape);
    }
    if (this.interaction.marqueeRect) {
      this.drawMarquee();
    }
    this.drawRipples();
  }

  private drawGrid(w: number, h: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#F5F5F5';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    this.ctx.lineWidth = 1;
    const gs = this.gridSize * this.state.zoom;
    const offsetX = this.state.panOffset.x % gs;
    const offsetY = this.state.panOffset.y % gs;
    this.ctx.beginPath();
    for (let x = offsetX; x < w; x += gs) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }
    for (let y = offsetY; y < h; y += gs) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawShapes(): void {
    for (const shape of this.state.shapes) {
      this.drawShape(shape);
    }
  }

  private drawShape(shape: Shape): void {
    if (shape.points.length < 2) return;
    this.ctx.save();
    this.ctx.translate(this.state.panOffset.x, this.state.panOffset.y);
    this.ctx.scale(this.state.zoom, this.state.zoom);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = shape.thickness;
    this.ctx.strokeStyle = shape.color;
    if (shape.type === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
    }
    this.ctx.beginPath();
    if (shape.type === 'line') {
      const first = shape.points[0];
      const last = shape.points[shape.points.length - 1];
      this.ctx.moveTo(first.x, first.y);
      this.ctx.lineTo(last.x, last.y);
    } else {
      this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawMarquee(): void {
    const r = this.interaction.marqueeRect!;
    const s = this.worldToScreen(r.x, r.y);
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(135, 206, 235, 0.8)';
    this.ctx.fillStyle = 'rgba(135, 206, 235, 0.12)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 5]);
    this.ctx.fillRect(s.x, s.y, r.w * this.state.zoom, r.h * this.state.zoom);
    this.ctx.strokeRect(s.x, s.y, r.w * this.state.zoom, r.h * this.state.zoom);
    this.ctx.restore();
  }

  private drawRipples(): void {
    const now = performance.now();
    for (const ripple of this.ripples) {
      const progress = (now - ripple.startTime) / 500;
      const radius = 8 + progress * 30;
      const alpha = 1 - progress;
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(135, 206, 235, ${alpha * 0.5})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
}
