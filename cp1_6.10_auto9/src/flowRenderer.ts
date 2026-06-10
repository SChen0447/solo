import type { FlowData, FlowNode, FlowEdge } from './astParser';

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface DragState {
  isDragging: boolean;
  isPanning: boolean;
  isNodeDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  nodeStartX: number;
  nodeStartY: number;
}

export interface RendererCallbacks {
  onNodeSelect: (node: FlowNode | null) => void;
  onNodeDoubleClick: (node: FlowNode) => void;
  onNodePositionChange: (nodeId: string, x: number, y: number) => void;
}

export class FlowRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private flowData: FlowData = { nodes: [], edges: [] };
  private view: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
  private drag: DragState = {
    isDragging: false,
    isPanning: false,
    isNodeDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0
  };
  private selectedNodeId: string | null = null;
  private hoveredEdgeId: string | null = null;
  private hoveredNodeId: string | null = null;
  private callbacks: RendererCallbacks;
  private animationFrame: number | null = null;
  private dpr: number = 1;
  private animatingNodes: Map<string, { startTime: number; startX: number; startY: number; endX: number; endY: number }> = new Map();

  constructor(canvas: HTMLCanvasElement, callbacks: RendererCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.dpr = window.devicePixelRatio || 1;
    this.setupEventListeners();
    this.resize();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    window.addEventListener('resize', this.resize);
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    window.removeEventListener('resize', this.resize);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  private resize = (): void => {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
    this.render();
  };

  public setFlowData(data: FlowData): void {
    this.flowData = data;
    this.selectedNodeId = null;
    this.centerView();
    this.render();
  }

  public updateNode(nodeId: string, updates: Partial<FlowNode>): void {
    const node = this.flowData.nodes.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, updates);
      this.render();
    }
  }

  public selectNode(nodeId: string | null): void {
    if (this.selectedNodeId === nodeId) return;
    this.selectedNodeId = nodeId;
    this.callbacks.onNodeSelect(nodeId ? this.flowData.nodes.find(n => n.id === nodeId) || null : null);
    this.render();
  }

  public resetView(): void {
    this.centerView();
    this.render();
  }

  private centerView(): void {
    if (this.flowData.nodes.length === 0) {
      this.view = { scale: 1, offsetX: 0, offsetY: 0 };
      return;
    }
    const xs = this.flowData.nodes.map(n => n.x + n.width / 2);
    const ys = this.flowData.nodes.map(n => n.y + n.height / 2);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 800;
    const height = rect?.height || 600;
    this.view.offsetX = width / 2 - centerX;
    this.view.offsetY = height / 2 - centerY;
    this.view.scale = 1;
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.view.offsetX) / this.view.scale,
      y: (sy - this.view.offsetY) / this.view.scale
    };
  }

  private hitTestNode(x: number, y: number): FlowNode | null {
    for (let i = this.flowData.nodes.length - 1; i >= 0; i--) {
      const node = this.flowData.nodes[i];
      if (this.isPointInNode(x, y, node)) {
        return node;
      }
    }
    return null;
  }

  private isPointInNode(x: number, y: number, node: FlowNode): boolean {
    if (node.type === 'condition') {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const dx = Math.abs(x - cx) / (node.width / 2);
      const dy = Math.abs(y - cy) / (node.height / 2);
      return dx + dy <= 1;
    }
    return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
  }

  private hitTestEdge(x: number, y: number): FlowEdge | null {
    for (const edge of this.flowData.edges) {
      const source = this.flowData.nodes.find(n => n.id === edge.source);
      const target = this.flowData.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;
      const points = this.computeEdgePoints(source, target);
      if (this.isPointNearPolyline(x, y, points, 8)) {
        return edge;
      }
    }
    return null;
  }

  private isPointNearPolyline(px: number, py: number, points: { x: number; y: number }[], threshold: number): boolean {
    for (let i = 0; i < points.length - 1; i++) {
      if (this.pointToSegmentDistance(px, py, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y) <= threshold) {
        return true;
      }
    }
    return false;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  private onMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.screenToWorld(sx, sy);

    const node = this.hitTestNode(x, y);
    if (node) {
      this.drag.isNodeDragging = true;
      this.drag.nodeId = node.id;
      this.drag.startX = sx;
      this.drag.startY = sy;
      this.drag.nodeStartX = node.x;
      this.drag.nodeStartY = node.y;
      this.selectNode(node.id);
      this.canvas.classList.add('dragging-node');
    } else {
      this.drag.isPanning = true;
      this.drag.startX = sx;
      this.drag.startY = sy;
      this.drag.nodeId = null;
      this.canvas.classList.remove('node-hover');
    }
    this.drag.isDragging = true;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.screenToWorld(sx, sy);

    if (this.drag.isPanning) {
      this.view.offsetX += sx - this.drag.startX;
      this.view.offsetY += sy - this.drag.startY;
      this.drag.startX = sx;
      this.drag.startY = sy;
      this.render();
      return;
    }

    if (this.drag.isNodeDragging && this.drag.nodeId) {
      const dx = (sx - this.drag.startX) / this.view.scale;
      const dy = (sy - this.drag.startY) / this.view.scale;
      const newX = this.drag.nodeStartX + dx;
      const newY = this.drag.nodeStartY + dy;
      this.updateNode(this.drag.nodeId, { x: newX, y: newY });
      this.callbacks.onNodePositionChange(this.drag.nodeId, newX, newY);
      return;
    }

    const node = this.hitTestNode(x, y);
    const edge = this.hitTestEdge(x, y);
    const newHoveredNodeId = node?.id || null;
    const newHoveredEdgeId = edge?.id || null;

    if (newHoveredNodeId !== this.hoveredNodeId || newHoveredEdgeId !== this.hoveredEdgeId) {
      this.hoveredNodeId = newHoveredNodeId;
      this.hoveredEdgeId = newHoveredEdgeId;
      if (this.hoveredNodeId) {
        this.canvas.classList.add('node-hover');
      } else {
        this.canvas.classList.remove('node-hover');
      }
      this.render();
    }
  };

  private onMouseUp = (): void => {
    this.drag.isDragging = false;
    this.drag.isPanning = false;
    this.drag.isNodeDragging = false;
    this.drag.nodeId = null;
    this.canvas.classList.remove('dragging-node');
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(2.5, this.view.scale * delta));

    const { x: wx, y: wy } = this.screenToWorld(sx, sy);
    this.view.scale = newScale;
    this.view.offsetX = sx - wx * newScale;
    this.view.offsetY = sy - wy * newScale;

    this.render();
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.screenToWorld(sx, sy);
    const node = this.hitTestNode(x, y);
    if (node) {
      this.callbacks.onNodeDoubleClick(node);
    }
  };

  private computeEdgePoints(source: FlowNode, target: FlowNode): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    let sourceX: number, sourceY: number;
    let targetX: number, targetY: number;

    if (source.type === 'condition') {
      sourceX = source.x + source.width / 2;
      sourceY = source.y + source.height;
    } else {
      sourceX = source.x + source.width / 2;
      sourceY = source.y + source.height;
    }

    if (target.type === 'condition') {
      targetX = target.x + target.width / 2;
      targetY = target.y;
    } else {
      targetX = target.x + target.width / 2;
      targetY = target.y;
    }

    if (sourceX === targetX) {
      points.push({ x: sourceX, y: sourceY });
      points.push({ x: targetX, y: targetY });
      return points;
    }

    const midY = (sourceY + targetY) / 2;

    points.push({ x: sourceX, y: sourceY });
    points.push({ x: sourceX, y: midY });
    points.push({ x: targetX, y: midY });
    points.push({ x: targetX, y: targetY });

    return points;
  }

  private render(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(() => this.drawFrame());
  }

  private drawFrame(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 800;
    const height = rect?.height || 600;

    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.fillStyle = '#FAFAFA';
    this.ctx.fillRect(0, 0, width, height);

    this.drawGrid(width, height);

    this.ctx.translate(this.view.offsetX, this.view.offsetY);
    this.ctx.scale(this.view.scale, this.view.scale);

    this.drawEdges();
    this.drawNodes();

    this.ctx.restore();
  }

  private drawGrid(width: number, height: number): void {
    const gridSize = 20 * this.view.scale;
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;

    const startX = -(this.view.offsetX % gridSize);
    const startY = -(this.view.offsetY % gridSize);

    this.ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }
    this.ctx.stroke();
  }

  private drawEdges(): void {
    for (const edge of this.flowData.edges) {
      const source = this.flowData.nodes.find(n => n.id === edge.source);
      const target = this.flowData.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;
      this.drawEdge(edge, source, target);
    }
  }

  private drawEdge(edge: FlowEdge, source: FlowNode, target: FlowNode): void {
    const points = this.computeEdgePoints(source, target);
    const isHovered = this.hoveredEdgeId === edge.id;

    this.ctx.strokeStyle = isHovered ? '#4A90D9' : '#666';
    this.ctx.lineWidth = isHovered ? 2.5 : 1.5;
    this.ctx.fillStyle = isHovered ? '#4A90D9' : '#666';

    const cornerRadius = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const r1 = Math.min(cornerRadius, len1 / 2);

      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const r2 = Math.min(cornerRadius, len2 / 2);

      const r = Math.min(r1, r2);

      this.ctx.lineTo(curr.x - (dx1 / len1) * r, curr.y - (dy1 / len1) * r);
      this.ctx.quadraticCurveTo(curr.x, curr.y, curr.x + (dx2 / len2) * r, curr.y + (dy2 / len2) * r);
    }

    if (points.length > 1) {
      this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    this.ctx.stroke();

    if (points.length >= 2) {
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      this.drawArrowHead(prev.x, prev.y, last.x, last.y);
    }

    if (edge.label && points.length >= 2) {
      const mid = points[Math.floor(points.length / 2)];
      this.ctx.font = '11px sans-serif';
      this.ctx.fillStyle = '#888';
      const textWidth = this.ctx.measureText(edge.label).width;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(mid.x - textWidth / 2 - 4, mid.y - 8, textWidth + 8, 16);
      this.ctx.fillStyle = '#666';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(edge.label, mid.x, mid.y);
    }

    if (isHovered) {
      const mid = points[Math.floor(points.length / 2)];
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.fillStyle = '#4A90D9';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`第${edge.order}步`, mid.x, mid.y - 20);
    }
  }

  private drawArrowHead(x1: number, y1: number, x2: number, y2: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - size * Math.cos(angle - Math.PI / 6),
      y2 - size * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      x2 - size * Math.cos(angle + Math.PI / 6),
      y2 - size * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawNodes(): void {
    for (const node of this.flowData.nodes) {
      this.drawNode(node);
    }
  }

  private drawNode(node: FlowNode): void {
    const isSelected = this.selectedNodeId === node.id;
    const isHovered = this.hoveredNodeId === node.id;

    let fillColor = '#4A90D9';
    let textColor = '#fff';

    switch (node.type) {
      case 'start':
      case 'end':
        fillColor = '#7ED321';
        break;
      case 'function':
        fillColor = '#7ED321';
        break;
      case 'condition':
        fillColor = '#F5A623';
        break;
      case 'loop':
        fillColor = '#9B59B6';
        break;
    }

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 2;

    if (node.type === 'condition') {
      this.drawDiamond(node, fillColor, isSelected, isHovered);
    } else {
      this.drawRoundedRect(node, fillColor, isSelected, isHovered);
    }

    this.ctx.restore();

    this.drawNodeText(node, textColor);
  }

  private drawRoundedRect(node: FlowNode, fillColor: string, isSelected: boolean, isHovered: boolean): void {
    const radius = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(node.x + radius, node.y);
    this.ctx.lineTo(node.x + node.width - radius, node.y);
    this.ctx.quadraticCurveTo(node.x + node.width, node.y, node.x + node.width, node.y + radius);
    this.ctx.lineTo(node.x + node.width, node.y + node.height - radius);
    this.ctx.quadraticCurveTo(node.x + node.width, node.y + node.height, node.x + node.width - radius, node.y + node.height);
    this.ctx.lineTo(node.x + radius, node.y + node.height);
    this.ctx.quadraticCurveTo(node.x, node.y + node.height, node.x, node.y + node.height - radius);
    this.ctx.lineTo(node.x, node.y + radius);
    this.ctx.quadraticCurveTo(node.x, node.y, node.x + radius, node.y);
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = isSelected ? '#FF6B6B' : (isHovered ? '#333' : 'rgba(255,255,255,0.3)');
    this.ctx.lineWidth = isSelected ? 3 : 1;
    this.ctx.stroke();
  }

  private drawDiamond(node: FlowNode, fillColor: string, isSelected: boolean, isHovered: boolean): void {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, node.y);
    this.ctx.lineTo(node.x + node.width, cy);
    this.ctx.lineTo(cx, node.y + node.height);
    this.ctx.lineTo(node.x, cy);
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = isSelected ? '#FF6B6B' : (isHovered ? '#333' : 'rgba(255,255,255,0.3)');
    this.ctx.lineWidth = isSelected ? 3 : 1;
    this.ctx.stroke();
  }

  private drawNodeText(node: FlowNode, textColor: string): void {
    this.ctx.fillStyle = textColor;
    this.ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    const maxWidth = node.width - 20;
    let text = node.label;

    if (this.ctx.measureText(text).width > maxWidth) {
      while (this.ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
      }
      text += '...';
    }

    this.ctx.fillText(text, cx, cy);
  }
}
