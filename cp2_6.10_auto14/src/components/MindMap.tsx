import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MindMapData, MindMapNode, MindMapEdge, CanvasState } from '../types';

interface MindMapProps {
  data: MindMapData;
  onDataChange: (data: MindMapData) => void;
  onHistoryPush: (data: MindMapData) => void;
}

const EDGE_THRESHOLD = 10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const COLLAPSE_BTN_SIZE = 18;

function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize = 14
): number {
  ctx.save();
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
  const metrics = ctx.measureText(text);
  ctx.restore();
  return metrics.width;
}

function getNodeRadius(node: MindMapNode): number {
  return Math.max(node.width, node.height) / 2;
}

function isPointInNode(
  px: number,
  py: number,
  node: MindMapNode
): boolean {
  if (node.shape === 'circle') {
    const r = getNodeRadius(node);
    const dx = px - node.x;
    const dy = py - node.y;
    return dx * dx + dy * dy <= r * r;
  }
  return (
    px >= node.x - node.width / 2 &&
    px <= node.x + node.width / 2 &&
    py >= node.y - node.height / 2 &&
    py <= node.y + node.height / 2
  );
}

function isPointOnNodeEdge(
  px: number,
  py: number,
  node: MindMapNode
): boolean {
  if (node.shape === 'circle') {
    const r = getNodeRadius(node);
    const dx = px - node.x;
    const dy = py - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(dist - r) <= EDGE_THRESHOLD + 4;
  }
  const withinX =
    Math.abs(px - (node.x - node.width / 2)) <= EDGE_THRESHOLD ||
    Math.abs(px - (node.x + node.width / 2)) <= EDGE_THRESHOLD;
  const withinY =
    Math.abs(py - (node.y - node.height / 2)) <= EDGE_THRESHOLD ||
    Math.abs(py - (node.y + node.height / 2)) <= EDGE_THRESHOLD;
  const inNodeBounds =
    px >= node.x - node.width / 2 - EDGE_THRESHOLD &&
    px <= node.x + node.width / 2 + EDGE_THRESHOLD &&
    py >= node.y - node.height / 2 - EDGE_THRESHOLD &&
    py <= node.y + node.height / 2 + EDGE_THRESHOLD;
  return inNodeBounds && ((withinX && py >= node.y - node.height / 2 && py <= node.y + node.height / 2) || (withinY && px >= node.x - node.width / 2 && px <= node.x + node.width / 2));
}

function isPointOnCollapseBtn(
  px: number,
  py: number,
  node: MindMapNode,
  childCount: number
): boolean {
  if (childCount === 0) return false;
  const btnX = node.x + node.width / 2 + 2;
  const btnY = node.y;
  return (
    px >= btnX - COLLAPSE_BTN_SIZE / 2 &&
    px <= btnX + COLLAPSE_BTN_SIZE / 2 &&
    py >= btnY - COLLAPSE_BTN_SIZE / 2 &&
    py <= btnY + COLLAPSE_BTN_SIZE / 2
  );
}

function getNodeEdgePoint(
  node: MindMapNode,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - node.x;
  const dy = ty - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

  if (node.shape === 'circle') {
    const r = getNodeRadius(node);
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: node.x + (dx / len) * r, y: node.y + (dy / len) * r };
  }
  const hw = node.width / 2;
  const hh = node.height / 2;
  const scale = Math.min(hw / Math.abs(dx || 0.0001), hh / Math.abs(dy || 0.0001));
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

function getDescendantIds(
  nodeId: string,
  edges: MindMapEdge[]
): Set<string> {
  const result = new Set<string>();
  const stack = [nodeId];
  while (stack.length) {
    const current = stack.pop()!;
    edges
      .filter((e) => e.sourceId === current)
      .forEach((e) => {
        if (!result.has(e.targetId)) {
          result.add(e.targetId);
          stack.push(e.targetId);
        }
      });
  }
  return result;
}

function getChildIds(nodeId: string, edges: MindMapEdge[]): string[] {
  return edges.filter((e) => e.sourceId === nodeId).map((e) => e.targetId);
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string
) {
  const size = 8;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - size * Math.cos(angle - Math.PI / 6),
    y - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x - size * Math.cos(angle + Math.PI / 6),
    y - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function MindMap({ data, onDataChange, onHistoryPush }: MindMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasStateRef = useRef<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  const dragStateRef = useRef<{
    mode:
      | 'none'
      | 'node'
      | 'pan'
      | 'connect'
      | 'pendingClick';
    nodeId: string | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    connectSourceId: string | null;
    connectMouseX: number;
    connectMouseY: number;
    moved: boolean;
  }>({
    mode: 'none',
    nodeId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    connectSourceId: null,
    connectMouseX: 0,
    connectMouseY: 0,
    moved: false,
  });

  const rafRef = useRef<number | null>(null);
  const pendingDataRef = useRef<MindMapData | null>(null);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cs = canvasStateRef.current;
    return {
      x: (sx - cs.offsetX) / cs.scale,
      y: (sy - cs.offsetY) / cs.scale,
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scheduleDraw();
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cs = canvasStateRef.current;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f0f4ff');
    gradient.addColorStop(1, '#e8f0fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cs.offsetX, cs.offsetY);
    ctx.scale(cs.scale, cs.scale);

    const collapsedHidden = new Set<string>();
    data.nodes.forEach((node) => {
      if (node.collapsed) {
        getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
      }
    });

    const ds = dragStateRef.current;
    if (ds.mode === 'connect' && ds.connectSourceId) {
      const src = data.nodes.find((n) => n.id === ds.connectSourceId);
      if (src) {
        const startPt = getNodeEdgePoint(src, ds.connectMouseX, ds.connectMouseY);
        drawBezierCurve(ctx, startPt.x, startPt.y, ds.connectMouseX, ds.connectMouseY, '#4a90d9', 2, true);
      }
    }

    data.edges.forEach((edge) => {
      const source = data.nodes.find((n) => n.id === edge.sourceId);
      const target = data.nodes.find((n) => n.id === edge.targetId);
      if (!source || !target) return;
      if (collapsedHidden.has(edge.sourceId) || collapsedHidden.has(edge.targetId)) return;
      if (collapsedHidden.has(source.id) || collapsedHidden.has(target.id)) return;

      const startPt = getNodeEdgePoint(source, target.x, target.y);
      const endPt = getNodeEdgePoint(target, source.x, source.y);
      const isHover = hoverEdgeId === edge.id;
      const color = isHover ? '#4a90d9' : '#8899aa';
      const width = isHover ? 3 : 2;
      drawBezierCurve(ctx, startPt.x, startPt.y, endPt.x, endPt.y, color, width, false);
    });

    data.nodes.forEach((node) => {
      if (collapsedHidden.has(node.id)) return;
      if (node.id === editingNodeId) return;
      drawNode(ctx, node, node.id === activeNodeId, getChildIds(node.id, data.edges).length);
    });

    ctx.restore();
  }, [data, activeNodeId, hoverEdgeId, editingNodeId]);

  const drawBezierCurve = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
    dashed: boolean
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([6, 4]);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cpOffset = Math.min(Math.abs(dx) * 0.5, 120);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!dashed) {
      const angle = Math.atan2(y2 - (x2 - cpOffset === x2 ? y2 : 0), 1);
      const t = 0.98;
      const cpx1 = x1 + cpOffset;
      const cpx2 = x2 - cpOffset;
      const ax = (1 - t) * (1 - t) * (1 - t) * x1 + 3 * (1 - t) * (1 - t) * t * cpx1 + 3 * (1 - t) * t * t * cpx2 + t * t * t * x2;
      const ay = (1 - t) * (1 - t) * (1 - t) * y1 + 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t * y2;
      const bx = x2;
      const by = y2;
      const arrowAngle = Math.atan2(by - ay, bx - ax);
      drawArrowHead(ctx, x2, y2, arrowAngle, color);
    }
    ctx.restore();
  };

  const drawNode = (
    ctx: CanvasRenderingContext2D,
    node: MindMapNode,
    active: boolean,
    childCount: number
  ) => {
    ctx.save();

    if (active) {
      ctx.shadowColor = 'rgba(74, 144, 217, 0.35)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = active ? '#4a90d9' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = active ? 2 : 1;

    if (node.shape === 'circle') {
      const r = getNodeRadius(node);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const radius = 10;
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + node.width - radius, y);
      ctx.quadraticCurveTo(x + node.width, y, x + node.width, y + radius);
      ctx.lineTo(x + node.width, y + node.height - radius);
      ctx.quadraticCurveTo(x + node.width, y + node.height, x + node.width - radius, y + node.height);
      ctx.lineTo(x + radius, y + node.height);
      ctx.quadraticCurveTo(x, y + node.height, x, y + node.height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#2c3e50';
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxW = node.width - 16;
    const displayText = truncateText(ctx, node.text, maxW);
    ctx.fillText(displayText, node.x, node.y);

    if (childCount > 0) {
      const btnX = node.x + node.width / 2 + 2;
      const btnY = node.y;
      ctx.fillStyle = node.collapsed ? '#4a90d9' : '#ffffff';
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(btnX, btnY, COLLAPSE_BTN_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = node.collapsed ? '#ffffff' : '#4a90d9';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.collapsed ? '+' : '−', btnX, btnY + 0.5);
    }

    ctx.restore();
  };

  const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let left = 0;
    let right = text.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = text.slice(0, mid) + '…';
      if (ctx.measureText(candidate).width <= maxWidth) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return text.slice(0, Math.max(0, left - 1)) + '…';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    const collapsedHidden = new Set<string>();
    data.nodes.forEach((node) => {
      if (node.collapsed) {
        getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
      }
    });

    for (let i = data.nodes.length - 1; i >= 0; i--) {
      const node = data.nodes[i];
      if (collapsedHidden.has(node.id)) continue;
      const childCount = getChildIds(node.id, data.edges).length;
      if (isPointOnCollapseBtn(wx, wy, node, childCount)) {
        const newNodes = data.nodes.map((n) =>
          n.id === node.id ? { ...n, collapsed: !n.collapsed } : n
        );
        const newData = { nodes: newNodes, edges: data.edges };
        onDataChange(newData);
        onHistoryPush(newData);
        scheduleDraw();
        return;
      }
    }

    for (let i = data.nodes.length - 1; i >= 0; i--) {
      const node = data.nodes[i];
      if (collapsedHidden.has(node.id)) continue;
      if (isPointOnNodeEdge(wx, wy, node) && !isPointInNode(wx, wy, node)) {
        dragStateRef.current = {
          mode: 'connect',
          nodeId: null,
          startX: sx,
          startY: sy,
          offsetX: 0,
          offsetY: 0,
          connectSourceId: node.id,
          connectMouseX: wx,
          connectMouseY: wy,
          moved: false,
        };
        setActiveNodeId(node.id);
        return;
      }
    }

    for (let i = data.nodes.length - 1; i >= 0; i--) {
      const node = data.nodes[i];
      if (collapsedHidden.has(node.id)) continue;
      if (isPointInNode(wx, wy, node)) {
        dragStateRef.current = {
          mode: 'node',
          nodeId: node.id,
          startX: sx,
          startY: sy,
          offsetX: wx - node.x,
          offsetY: wy - node.y,
          connectSourceId: null,
          connectMouseX: 0,
          connectMouseY: 0,
          moved: false,
        };
        setActiveNodeId(node.id);
        return;
      }
    }

    dragStateRef.current = {
      mode: 'pan',
      nodeId: null,
      startX: sx,
      startY: sy,
      offsetX: canvasStateRef.current.offsetX,
      offsetY: canvasStateRef.current.offsetY,
      connectSourceId: null,
      connectMouseX: 0,
      connectMouseY: 0,
      moved: false,
    };
    setActiveNodeId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const ds = dragStateRef.current;

    if (ds.mode === 'node' && ds.nodeId) {
      const newX = wx - ds.offsetX;
      const newY = wy - ds.offsetY;
      const currentNode = data.nodes.find((n) => n.id === ds.nodeId);
      if (currentNode && (Math.abs(newX - currentNode.x) > 0.5 || Math.abs(newY - currentNode.y) > 0.5)) {
        if (!pendingDataRef.current) {
          pendingDataRef.current = JSON.parse(JSON.stringify(data));
        }
        pendingDataRef.current.nodes = pendingDataRef.current.nodes.map((n: MindMapNode) =>
          n.id === ds.nodeId ? { ...n, x: newX, y: newY } : n
        );
        ds.moved = true;
        scheduleDrawData(pendingDataRef.current);
      }
      return;
    }

    if (ds.mode === 'pan') {
      const dx = sx - ds.startX;
      const dy = sy - ds.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        canvasStateRef.current.offsetX = ds.offsetX + dx;
        canvasStateRef.current.offsetY = ds.offsetY + dy;
        ds.moved = true;
        scheduleDraw();
      }
      return;
    }

    if (ds.mode === 'connect' && ds.connectSourceId) {
      ds.connectMouseX = wx;
      ds.connectMouseY = wy;
      ds.moved = true;
      scheduleDraw();
      return;
    }

    const collapsedHidden = new Set<string>();
    data.nodes.forEach((node) => {
      if (node.collapsed) {
        getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
      }
    });

    let foundEdge: string | null = null;
    for (const edge of data.edges) {
      const source = data.nodes.find((n) => n.id === edge.sourceId);
      const target = data.nodes.find((n) => n.id === edge.targetId);
      if (!source || !target) continue;
      if (collapsedHidden.has(source.id) || collapsedHidden.has(target.id)) continue;
      if (pointNearBezier(wx, wy, source, target, 6)) {
        foundEdge = edge.id;
        break;
      }
    }
    if (foundEdge !== hoverEdgeId) {
      setHoverEdgeId(foundEdge);
    }
  };

  const pointNearBezier = (
    px: number,
    py: number,
    source: MindMapNode,
    target: MindMapNode,
    threshold: number
  ): boolean => {
    const startPt = getNodeEdgePoint(source, target.x, target.y);
    const endPt = getNodeEdgePoint(target, source.x, source.y);
    const x1 = startPt.x;
    const y1 = startPt.y;
    const x2 = endPt.x;
    const y2 = endPt.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cpOffset = Math.min(Math.abs(dx) * 0.5, 120);
    const cpx1 = x1 + cpOffset;
    const cpy1 = y1;
    const cpx2 = x2 - cpOffset;
    const cpy2 = y2;
    for (let t = 0; t <= 1; t += 0.05) {
      const mt = 1 - t;
      const bx = mt * mt * mt * x1 + 3 * mt * mt * t * cpx1 + 3 * mt * t * t * cpx2 + t * t * t * x2;
      const by = mt * mt * mt * y1 + 3 * mt * mt * t * cpy1 + 3 * mt * t * t * cpy2 + t * t * t * y2;
      const dist = Math.sqrt((bx - px) * (bx - px) + (by - py) * (by - py));
      if (dist < threshold) return true;
    }
    return false;
  };

  const scheduleDrawData = (d: MindMapData) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cs = canvasStateRef.current;
      ctx.clearRect(0, 0, w, h);
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#f0f4ff');
      gradient.addColorStop(1, '#e8f0fe');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cs.offsetX, cs.offsetY);
      ctx.scale(cs.scale, cs.scale);

      const collapsedHidden = new Set<string>();
      d.nodes.forEach((node) => {
        if (node.collapsed) {
          getDescendantIds(node.id, d.edges).forEach((id) => collapsedHidden.add(id));
        }
      });

      d.edges.forEach((edge) => {
        const source = d.nodes.find((n) => n.id === edge.sourceId);
        const target = d.nodes.find((n) => n.id === edge.targetId);
        if (!source || !target) return;
        if (collapsedHidden.has(source.id) || collapsedHidden.has(target.id)) return;
        const startPt = getNodeEdgePoint(source, target.x, target.y);
        const endPt = getNodeEdgePoint(target, source.x, source.y);
        drawBezierCurve(ctx, startPt.x, startPt.y, endPt.x, endPt.y, '#8899aa', 2, false);
      });

      d.nodes.forEach((node) => {
        if (collapsedHidden.has(node.id)) return;
        drawNode(ctx, node, node.id === activeNodeId, getChildIds(node.id, d.edges).length);
      });

      ctx.restore();
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const ds = dragStateRef.current;

    if (ds.mode === 'node' && ds.nodeId) {
      if (ds.moved && pendingDataRef.current) {
        onDataChange(pendingDataRef.current);
        onHistoryPush(pendingDataRef.current);
        pendingDataRef.current = null;
      }
      ds.mode = 'none';
      ds.nodeId = null;
      return;
    }

    if (ds.mode === 'connect' && ds.connectSourceId) {
      const collapsedHidden = new Set<string>();
      data.nodes.forEach((node) => {
        if (node.collapsed) {
          getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
        }
      });
      for (let i = data.nodes.length - 1; i >= 0; i--) {
        const node = data.nodes[i];
        if (collapsedHidden.has(node.id)) continue;
        if (node.id === ds.connectSourceId) continue;
        if (isPointInNode(wx, wy, node)) {
          const exists = data.edges.some(
            (e) => e.sourceId === ds.connectSourceId && e.targetId === node.id
          );
          if (!exists) {
            const newEdge: MindMapEdge = {
              id: uuidv4(),
              sourceId: ds.connectSourceId!,
              targetId: node.id,
            };
            const newNodes = data.nodes.map((n) =>
              n.id === node.id && n.parentId === null ? { ...n, parentId: ds.connectSourceId } : n
            );
            const newData = {
              nodes: newNodes,
              edges: [...data.edges, newEdge],
            };
            onDataChange(newData);
            onHistoryPush(newData);
          }
          break;
        }
      }
      ds.mode = 'none';
      ds.connectSourceId = null;
      scheduleDraw();
      return;
    }

    if (ds.mode === 'pan') {
      ds.mode = 'none';
      return;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    const collapsedHidden = new Set<string>();
    data.nodes.forEach((node) => {
      if (node.collapsed) {
        getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
      }
    });

    for (let i = data.nodes.length - 1; i >= 0; i--) {
      const node = data.nodes[i];
      if (collapsedHidden.has(node.id)) continue;
      if (isPointInNode(wx, wy, node)) {
        setEditingNodeId(node.id);
        setEditText(node.text);
        setActiveNodeId(node.id);
        return;
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ds = dragStateRef.current;
    if (ds.moved) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    const collapsedHidden = new Set<string>();
    data.nodes.forEach((node) => {
      if (node.collapsed) {
        getDescendantIds(node.id, data.edges).forEach((id) => collapsedHidden.add(id));
      }
    });

    for (let i = data.nodes.length - 1; i >= 0; i--) {
      const node = data.nodes[i];
      if (collapsedHidden.has(node.id)) continue;
      if (isPointInNode(wx, wy, node)) {
        return;
      }
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    const defaultWidth = 100;
    const defaultHeight = 44;
    let width = defaultWidth;
    if (ctx) {
      const textW = measureTextWidth(ctx, '新节点') + 24;
      width = Math.max(defaultWidth, Math.min(200, textW));
    }

    const newNode: MindMapNode = {
      id: uuidv4(),
      text: '新节点',
      x: wx,
      y: wy,
      width,
      height: defaultHeight,
      shape: 'rect',
      collapsed: false,
      parentId: null,
    };
    const newData = { nodes: [...data.nodes, newNode], edges: data.edges };
    onDataChange(newData);
    onHistoryPush(newData);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cs = canvasStateRef.current;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cs.scale * delta));
    const ratio = newScale / cs.scale;

    cs.offsetX = sx - (sx - cs.offsetX) * ratio;
    cs.offsetY = sy - (sy - cs.offsetY) * ratio;
    cs.scale = newScale;

    scheduleDraw();
  };

  const commitEditText = useCallback(() => {
    if (!editingNodeId) return;
    const trimmed = editText.trim() || '新节点';
    const canvas = canvasRef.current;
    let width = 100;
    let height = 44;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const textW = measureTextWidth(ctx, trimmed) + 24;
        width = Math.max(60, Math.min(260, textW));
      }
    }
    const newNodes = data.nodes.map((n) =>
      n.id === editingNodeId ? { ...n, text: trimmed, width, height } : n
    );
    const newData = { nodes: newNodes, edges: data.edges };
    onDataChange(newData);
    onHistoryPush(newData);
    setEditingNodeId(null);
    setEditText('');
  }, [editingNodeId, editText, data, onDataChange, onHistoryPush]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const interval = setInterval(() => {
      forceRender((x) => x + 1);
    }, 1000);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearInterval(interval);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    scheduleDraw();
  }, [data, scheduleDraw]);

  useEffect(() => {
    if (!editingNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEditText();
      } else if (e.key === 'Escape') {
        setEditingNodeId(null);
        setEditText('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingNodeId, commitEditText]);

  const getEditingInputStyle = (): React.CSSProperties | null => {
    if (!editingNodeId) return null;
    const node = data.nodes.find((n) => n.id === editingNodeId);
    if (!node) return null;
    const cs = canvasStateRef.current;
    const left = cs.offsetX + (node.x - node.width / 2) * cs.scale;
    const top = cs.offsetY + (node.y - node.height / 2) * cs.scale;
    const width = node.width * cs.scale;
    const height = Math.max(node.height * cs.scale, 44);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${Math.max(14, 14 * cs.scale)}px`,
    };
  };

  const inputStyle = getEditingInputStyle();

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="mindmap-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />
      {inputStyle && editingNodeId && (
        <input
          className="node-edit-input"
          style={inputStyle}
          value={editText}
          autoFocus
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEditText}
        />
      )}
    </div>
  );
}
