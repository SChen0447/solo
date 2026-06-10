export type SkillType = 'light' | 'heavy' | 'upper' | 'down';

export interface SkillNode {
  id: string;
  name: string;
  type: SkillType;
  key: string;
  x: number;
  y: number;
  startup: number;
  recovery: number;
  cancelable: boolean;
  cancelWindow: number;
  damage: number;
  spriteFrame: number;
}

export interface SkillEdge {
  id: string;
  from: string;
  to: string;
}

export interface EditorState {
  nodes: SkillNode[];
  edges: SkillEdge[];
  selectedNodeId: string | null;
}

export interface ExportData {
  nodes: SkillNode[];
  edges: SkillEdge[];
  keySequence: KeyRecord[];
}

export interface KeyRecord {
  key: string;
  type: SkillType;
  timestamp: number;
}

export const SKILL_COLORS: Record<SkillType, string> = {
  light: '#4ade80',
  heavy: '#f87171',
  upper: '#60a5fa',
  down: '#fbbf24',
};

export const SKILL_TYPE_NAMES: Record<SkillType, string> = {
  light: '轻击',
  heavy: '重击',
  upper: '上挑',
  down: '下劈',
};

export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 50;
export const NODE_RADIUS = 10;

export class ComboEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: EditorState;
  private onStateChange?: (state: EditorState) => void;
  private onNodeSelect?: (node: SkillNode | null) => void;
  private onContextMenu?: (x: number, y: number, type: 'canvas' | 'node', node?: SkillNode) => void;

  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1;

  private isDraggingNode: boolean = false;
  private draggedNodeId: string | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panCameraStartX: number = 0;
  private panCameraStartY: number = 0;

  private isConnecting: boolean = false;
  private connectFromId: string | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private hoveredNodeId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      nodes: this.createDefaultNodes(),
      edges: [],
      selectedNodeId: null,
    };
    this.bindEvents();
    this.render();
  }

  private createDefaultNodes(): SkillNode[] {
    return [
      this.createNode('light', 'A', '轻击1', 100, 150),
      this.createNode('light', 'A', '轻击2', 300, 150),
      this.createNode('heavy', 'B', '重击', 500, 150),
      this.createNode('upper', 'X', '上挑', 300, 300),
      this.createNode('down', 'Y', '下劈', 500, 300),
    ];
  }

  private createNode(type: SkillType, key: string, name: string, x: number, y: number): SkillNode {
    return {
      id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name,
      type,
      key,
      x,
      y,
      startup: 0.15,
      recovery: 0.3,
      cancelable: true,
      cancelWindow: 0.1,
      damage: 5,
      spriteFrame: 0,
    };
  }

  setStateChangeListener(callback: (state: EditorState) => void): void {
    this.onStateChange = callback;
  }

  setNodeSelectListener(callback: (node: SkillNode | null) => void): void {
    this.onNodeSelect = callback;
  }

  setContextMenuListener(callback: (x: number, y: number, type: 'canvas' | 'node', node?: SkillNode) => void): void {
    this.onContextMenu = callback;
  }

  getState(): EditorState {
    return this.state;
  }

  getSelectedNode(): SkillNode | null {
    if (!this.state.selectedNodeId) return null;
    return this.state.nodes.find((n) => n.id === this.state.selectedNodeId) || null;
  }

  selectNode(nodeId: string | null): void {
    this.state.selectedNodeId = nodeId;
    this.emitStateChange();
    if (this.onNodeSelect) {
      this.onNodeSelect(this.getSelectedNode());
    }
    this.render();
  }

  updateNode(nodeId: string, updates: Partial<SkillNode>): void {
    const idx = this.state.nodes.findIndex((n) => n.id === nodeId);
    if (idx !== -1) {
      this.state.nodes[idx] = { ...this.state.nodes[idx], ...updates };
      this.emitStateChange();
      if (this.onNodeSelect && this.state.selectedNodeId === nodeId) {
        this.onNodeSelect(this.getSelectedNode());
      }
      this.render();
    }
  }

  addNode(x: number, y: number, type: SkillType = 'light', key: string = 'A', name?: string): SkillNode {
    const worldPos = this.screenToWorld(x, y);
    const node = this.createNode(type, key, name || SKILL_TYPE_NAMES[type], worldPos.x, worldPos.y);
    this.state.nodes.push(node);
    this.emitStateChange();
    this.render();
    return node;
  }

  deleteNode(nodeId: string): void {
    this.state.nodes = this.state.nodes.filter((n) => n.id !== nodeId);
    this.state.edges = this.state.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
    if (this.state.selectedNodeId === nodeId) {
      this.selectNode(null);
    }
    this.emitStateChange();
    this.render();
  }

  addEdge(fromId: string, toId: string): void {
    if (fromId === toId) return;
    if (this.state.edges.some((e) => e.from === fromId && e.to === toId)) return;
    this.state.edges.push({
      id: 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      from: fromId,
      to: toId,
    });
    this.emitStateChange();
    this.render();
  }

  deleteEdge(edgeId: string): void {
    this.state.edges = this.state.edges.filter((e) => e.id !== edgeId);
    this.emitStateChange();
    this.render();
  }

  startConnection(fromId: string): void {
    this.isConnecting = true;
    this.connectFromId = fromId;
  }

  cancelConnection(): void {
    this.isConnecting = false;
    this.connectFromId = null;
    this.render();
  }

  getConnectedNodes(nodeId: string): SkillNode[] {
    const outEdges = this.state.edges.filter((e) => e.from === nodeId);
    return outEdges
      .map((e) => this.state.nodes.find((n) => n.id === e.to))
      .filter((n): n is SkillNode => !!n);
  }

  exportToJSON(keySequence: KeyRecord[]): string {
    const data: ExportData = {
      nodes: this.state.nodes,
      edges: this.state.edges,
      keySequence,
    };
    return JSON.stringify(data, null, 2);
  }

  importFromJSON(json: string): { success: boolean; keySequence: KeyRecord[]; error?: string } {
    try {
      const data = JSON.parse(json) as ExportData;
      if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('nodes 数据格式错误');
      if (!data.edges || !Array.isArray(data.edges)) throw new Error('edges 数据格式错误');
      if (!data.keySequence || !Array.isArray(data.keySequence)) throw new Error('keySequence 数据格式错误');

      this.state.nodes = data.nodes;
      this.state.edges = data.edges;
      this.state.selectedNodeId = null;
      this.emitStateChange();
      if (this.onNodeSelect) this.onNodeSelect(null);
      this.render();
      return { success: true, keySequence: data.keySequence };
    } catch (e) {
      return { success: false, keySequence: [], error: (e as Error).message };
    }
  }

  private emitStateChange(): void {
    if (this.onStateChange) this.onStateChange(this.state);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenuHandler.bind(this));
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.cameraX) / this.zoom,
      y: (sy - this.cameraY) / this.zoom,
    };
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.zoom + this.cameraX,
      y: wy * this.zoom + this.cameraY,
    };
  }

  private getNodeAt(sx: number, sy: number): SkillNode | null {
    const world = this.screenToWorld(sx, sy);
    for (let i = this.state.nodes.length - 1; i >= 0; i--) {
      const n = this.state.nodes[i];
      if (
        world.x >= n.x - NODE_WIDTH / 2 &&
        world.x <= n.x + NODE_WIDTH / 2 &&
        world.y >= n.y - NODE_HEIGHT / 2 &&
        world.y <= n.y + NODE_HEIGHT / 2
      ) {
        return n;
      }
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.mouseX = sx;
    this.mouseY = sy;

    const node = this.getNodeAt(sx, sy);

    if (this.isConnecting && this.connectFromId) {
      if (node && node.id !== this.connectFromId) {
        this.addEdge(this.connectFromId, node.id);
      }
      this.cancelConnection();
      return;
    }

    if (e.button === 0) {
      if (node) {
        this.selectNode(node.id);
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;
        const world = this.screenToWorld(sx, sy);
        this.dragOffsetX = world.x - node.x;
        this.dragOffsetY = world.y - node.y;
      } else if (e.button === 0) {
        this.selectNode(null);
        this.isPanning = true;
        this.panStartX = sx;
        this.panStartY = sy;
        this.panCameraStartX = this.cameraX;
        this.panCameraStartY = this.cameraY;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.mouseX = sx;
    this.mouseY = sy;

    const node = this.getNodeAt(sx, sy);
    const newHoveredId = node ? node.id : null;

    if (this.isDraggingNode && this.draggedNodeId) {
      const world = this.screenToWorld(sx, sy);
      this.updateNode(this.draggedNodeId, {
        x: world.x - this.dragOffsetX,
        y: world.y - this.dragOffsetY,
      });
    } else if (this.isPanning) {
      this.cameraX = this.panCameraStartX + (sx - this.panStartX);
      this.cameraY = this.panCameraStartY + (sy - this.panStartY);
      this.render();
    }

    if (newHoveredId !== this.hoveredNodeId || this.isConnecting) {
      this.hoveredNodeId = newHoveredId;
      this.render();
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldBefore = this.screenToWorld(sx, sy);
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.3, Math.min(3, this.zoom * (1 + delta)));

    if (newZoom !== this.zoom) {
      this.zoom = newZoom;
      const worldAfter = this.screenToWorld(sx, sy);
      this.cameraX += (worldAfter.x - worldBefore.x) * this.zoom;
      this.cameraY += (worldAfter.y - worldBefore.y) * this.zoom;
      this.render();
    }
  }

  private onContextMenuHandler(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = this.getNodeAt(sx, sy);

    if (this.onContextMenu) {
      if (node) {
        this.onContextMenu(sx, sy, 'node', node);
      } else {
        this.onContextMenu(sx, sy, 'canvas');
      }
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.cameraX, this.cameraY);
    ctx.scale(this.zoom, this.zoom);

    this.drawGrid(ctx);
    this.drawEdges(ctx);

    if (this.isConnecting && this.connectFromId) {
      this.drawConnectingLine(ctx);
    }

    for (const node of this.state.nodes) {
      this.drawNode(ctx, node);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const gridSize = 50;
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const startY = Math.floor(topLeft.y / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;

    for (let x = startX; x < bottomRight.x; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, topLeft.y);
      ctx.lineTo(x, bottomRight.y);
      ctx.stroke();
    }
    for (let y = startY; y < bottomRight.y; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(topLeft.x, y);
      ctx.lineTo(bottomRight.x, y);
      ctx.stroke();
    }
  }

  private drawEdges(ctx: CanvasRenderingContext2D): void {
    for (const edge of this.state.edges) {
      const fromNode = this.state.nodes.find((n) => n.id === edge.from);
      const toNode = this.state.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;
      this.drawArrow(ctx, fromNode.x + NODE_WIDTH / 2, fromNode.y, toNode.x - NODE_WIDTH / 2, toNode.y);
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const nx = dx / len;
    const ny = dy / len;

    const arrowSize = 8 / this.zoom;
    const endX = x2 - nx * (NODE_WIDTH / 2);
    const endY = y2 - ny * (NODE_HEIGHT / 2);
    const startX = x1 + nx * (NODE_WIDTH / 2);
    const startY = y1 + ny * (NODE_HEIGHT / 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const angle = Math.atan2(dy, dx);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  private drawConnectingLine(ctx: CanvasRenderingContext2D): void {
    const fromNode = this.state.nodes.find((n) => n.id === this.connectFromId);
    if (!fromNode) return;
    const world = this.screenToWorld(this.mouseX, this.mouseY);

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 2 / this.zoom;
    ctx.setLineDash([6 / this.zoom, 6 / this.zoom]);
    ctx.beginPath();
    ctx.moveTo(fromNode.x + NODE_WIDTH / 2, fromNode.y);
    ctx.lineTo(world.x, world.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: SkillNode): void {
    const isSelected = this.state.selectedNodeId === node.id;
    const isHovered = this.hoveredNodeId === node.id;
    const isDragging = this.draggedNodeId === node.id;

    const color = SKILL_COLORS[node.type];
    const drawScale = isDragging ? 1.1 : isHovered ? 1.03 : 1;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.scale(drawScale, drawScale);

    if (isDragging || isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = isDragging ? 20 : 12;
    }

    const w = NODE_WIDTH;
    const h = NODE_HEIGHT;
    const r = NODE_RADIUS;

    ctx.fillStyle = color;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fill();

    ctx.shadowBlur = 0;

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      this.roundRect(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.name, 0, -h / 2 + 8);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this.roundRect(ctx, w / 2 - 28, -h / 2 + 6, 22, 22, 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.key, w / 2 - 17, -h / 2 + 17);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.onWheel.bind(this));
    this.canvas.removeEventListener('contextmenu', this.onContextMenuHandler.bind(this));
  }
}
