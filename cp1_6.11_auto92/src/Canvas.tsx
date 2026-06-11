import React, { useRef, useEffect, useCallback, useState } from 'react';
import { KnowledgeNode, KnowledgeEdge, CursorData, NODE_RADIUS, NODE_COLORS, NodeType } from './types';

interface CanvasProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  cursors: CursorData[];
  zoom: number;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onNodeCreate: (node: KnowledgeNode) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeSelect: (id: string | null) => void;
  onEdgeCreate: (edge: KnowledgeEdge) => void;
  onCanvasClick?: () => void;
  onCursorMove?: (x: number, y: number) => void;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
  newNodeAnimations: Set<string>;
}

const GRID_SIZE = 50;

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  cursors,
  zoom,
  selectedNodeId,
  highlightedNodeIds,
  onNodeCreate,
  onNodeMove,
  onNodeSelect,
  onEdgeCreate,
  onCanvasClick,
  onCursorMove,
  panOffset,
  onPanChange,
  newNodeAnimations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [edgeDrag, setEdgeDrag] = useState<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });
  const nodeAnimations = useRef<Map<string, number>>(new Map());
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }>>([]);

  const screenToCanvas = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - panOffset.x) / zoom,
        y: (sy - rect.top - panOffset.y) / zoom,
      };
    },
    [zoom, panOffset]
  );

  const findNodeAt = useCallback(
    (cx: number, cy: number): KnowledgeNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = cx - n.x;
        const dy = cy - n.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return n;
      }
      return null;
    },
    [nodes]
  );

  const findEdgeAt = useCallback(
    (cx: number, cy: number): KnowledgeEdge | null => {
      for (const edge of edges) {
        const src = nodes.find((n) => n.id === edge.source);
        const tgt = nodes.find((n) => n.id === edge.target);
        if (!src || !tgt) continue;
        const dist = pointToLineDistance(cx, cy, src.x, src.y, tgt.x, tgt.y);
        if (dist < 8) return edge;
      }
      return null;
    },
    [edges, nodes]
  );

  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  };

  useEffect(() => {
    const count = 60;
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * 4000 - 2000,
          y: Math.random() * 4000 - 2000,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: Math.random() * 0.5 + 0.1,
          size: Math.random() * 1.5 + 0.5,
        });
      }
    }
  }, []);

  useEffect(() => {
    newNodeAnimations.forEach((id) => {
      nodeAnimations.current.set(id, Date.now());
    });
  }, [newNodeAnimations]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    const gridSize = GRID_SIZE;
    const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize;
    const endX = startX + w / zoom + gridSize * 2;
    const endY = startY + h / zoom + gridSize * 2;

    ctx.strokeStyle = '#2a3b4c';
    ctx.lineWidth = 0.5 / zoom;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    const particles = particlesRef.current;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > 2000) p.x = -2000;
      if (p.x < -2000) p.x = 2000;
      if (p.y > 2000) p.y = -2000;
      if (p.y < -2000) p.y = 2000;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${p.alpha})`;
      ctx.fill();
    }

    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const isHovered = hoveredEdge === edge.id;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isHovered ? '#aabbcc' : '#8899aa';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      if (edge.label) {
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        const textWidth = ctx.measureText(edge.label).width;
        ctx.fillStyle = 'rgba(13, 27, 42, 0.7)';
        ctx.fillRect(mx - textWidth / 2 - 6, my - 10, textWidth + 12, 20);
        ctx.fillStyle = '#c8d8e8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.label, mx, my);
      }
    }

    if (edgeDrag) {
      const srcNode = nodes.find((n) => n.id === edgeDrag.sourceId);
      if (srcNode) {
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(srcNode.x, srcNode.y);
        ctx.lineTo(edgeDrag.mouseX, edgeDrag.mouseY);
        const dx = edgeDrag.mouseX - srcNode.x;
        const dy = edgeDrag.mouseY - srcNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(dist / 500, 1);
        const r = Math.round(136 + t * (232 - 136));
        const g = Math.round(153 + t * (168 - 153));
        const b = Math.round(170 + t * (124 - 170));
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const node of nodes) {
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNodeId === node.id;
      const isHighlighted = highlightedNodeIds.has(node.id);

      let scale = 1;
      const animStart = nodeAnimations.current.get(node.id);
      if (animStart) {
        const elapsed = Date.now() - animStart;
        if (elapsed < 300) {
          const t = elapsed / 300;
          scale = 1 + 0.3 * Math.sin(t * Math.PI) * (1 - t);
        } else {
          nodeAnimations.current.delete(node.id);
        }
      }

      const r = NODE_RADIUS * scale * (isHovered ? 1.08 : 1);

      ctx.save();
      ctx.translate(node.x, node.y);

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#e8d75d';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const gradient = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
      gradient.addColorStop(0, lightenColor(node.color, 30));
      gradient.addColorStop(1, node.color);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = isHovered ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxTextWidth = r * 1.6;
      let title = node.title;
      if (ctx.measureText(title).width > maxTextWidth) {
        while (ctx.measureText(title + '…').width > maxTextWidth && title.length > 0) {
          title = title.slice(0, -1);
        }
        title += '…';
      }
      ctx.fillText(title, 0, 0);

      ctx.restore();
    }

    for (const cursor of cursors) {
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = cursor.color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = cursor.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(cursor.name, cursor.x + 14, cursor.y - 4);
    }

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [nodes, edges, cursors, zoom, panOffset, selectedNodeId, highlightedNodeIds, hoveredNode, hoveredEdge, edgeDrag, newNodeAnimations]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panOffsetStart.current = { ...panOffset };
        return;
      }

      const pos = screenToCanvas(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);

      if (node && e.shiftKey) {
        setEdgeDrag({ sourceId: node.id, mouseX: pos.x, mouseY: pos.y });
        return;
      }

      if (node) {
        setDraggingNode(node.id);
        onNodeSelect(node.id);
      } else {
        onNodeSelect(null);
      }
    },
    [screenToCanvas, findNodeAt, onNodeSelect, panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);

      if (onCursorMove) {
        onCursorMove(pos.x, pos.y);
      }

      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        onPanChange({
          x: panOffsetStart.current.x + dx,
          y: panOffsetStart.current.y + dy,
        });
        return;
      }

      if (edgeDrag) {
        setEdgeDrag({ ...edgeDrag, mouseX: pos.x, mouseY: pos.y });
        return;
      }

      if (draggingNode) {
        onNodeMove(draggingNode, pos.x, pos.y);
        return;
      }

      const node = findNodeAt(pos.x, pos.y);
      setHoveredNode(node ? node.id : null);

      if (!node) {
        const edge = findEdgeAt(pos.x, pos.y);
        setHoveredEdge(edge ? edge.id : null);
      } else {
        setHoveredEdge(null);
      }
    },
    [screenToCanvas, draggingNode, edgeDrag, findNodeAt, findEdgeAt, onNodeMove, onCursorMove, onPanChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }

      if (edgeDrag) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const targetNode = findNodeAt(pos.x, pos.y);
        if (targetNode && targetNode.id !== edgeDrag.sourceId) {
          onEdgeCreate({
            id: '',
            source: edgeDrag.sourceId,
            target: targetNode.id,
            label: '',
            createdAt: Date.now(),
          });
        }
        setEdgeDrag(null);
        return;
      }

      setDraggingNode(null);
    },
    [edgeDrag, screenToCanvas, findNodeAt, onEdgeCreate]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const existingNode = findNodeAt(pos.x, pos.y);
      if (existingNode) return;

      const types: NodeType[] = ['person', 'event', 'concept'];
      const defaultType = types[Math.floor(Math.random() * types.length)];
      const newNode: KnowledgeNode = {
        id: '',
        title: 'New Node',
        description: '',
        type: defaultType,
        color: NODE_COLORS[defaultType],
        x: pos.x,
        y: pos.y,
        links: [],
        createdAt: Date.now(),
      };
      onNodeCreate(newNode);
    },
    [screenToCanvas, findNodeAt, onNodeCreate]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
    },
    []
  );

  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 50px)',
        position: 'relative',
        overflow: 'hidden',
        cursor: edgeDrag ? 'crosshair' : draggingNode ? 'grabbing' : isPanning.current ? 'grabbing' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setDraggingNode(null);
          isPanning.current = false;
          if (edgeDrag) setEdgeDrag(null);
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Canvas;
