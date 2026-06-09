import React, { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface DiagramNode {
  id: string;
  type: 'rect' | 'diamond' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
}

export interface DiagramEdge {
  id: string;
  type: 'edge';
  sourceId: string;
  targetId: string;
  label: string;
}

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  x?: number;
  y?: number;
}

interface CanvasProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  selectedId: string | null;
  remoteUsers: RemoteUser[];
  onSelect: (id: string | null) => void;
  onNodeAdd: (node: DiagramNode) => void;
  onNodeUpdate: (node: Partial<DiagramNode> & { id: string }) => void;
  onNodeDelete: (id: string) => void;
  onEdgeAdd: (edge: DiagramEdge) => void;
  onEdgeUpdate: (edge: Partial<DiagramEdge> & { id: string }) => void;
  onEdgeDelete: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
}

const GRID = 10;
const CANDY_COLORS = ['#FF6B6B', '#48C9B0', '#FFD93D', '#6C5CE7'];

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

function getNodeCenter(node: DiagramNode) {
  return {
    cx: node.x + node.width / 2,
    cy: node.y + node.height / 2,
  };
}

function getEdgePath(nodeA: DiagramNode, nodeB: DiagramNode) {
  const a = getNodeCenter(nodeA);
  const b = getNodeCenter(nodeB);
  return `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy}`;
}

function getEdgeMidpoint(nodeA: DiagramNode, nodeB: DiagramNode) {
  const a = getNodeCenter(nodeA);
  const b = getNodeCenter(nodeB);
  return {
    mx: (a.cx + b.cx) / 2,
    my: (a.cy + b.cy) / 2,
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let current = '';
  for (const ch of words) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  selectedId,
  remoteUsers,
  onSelect,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onEdgeAdd,
  onEdgeUpdate,
  onEdgeDelete,
  onCursorMove,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connecting, setConnecting] = useState<{
    sourceId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [editing, setEditing] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPos, setEditPos] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 2000, h: 1500 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; vbX: number; vbY: number } | null>(null);
  const [colorCursor, setColorCursor] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const pendingDragRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * scaleX,
      y: viewBox.y + (clientY - rect.top) * scaleY,
    };
  }, [viewBox]);

  const flushDragUpdate = useCallback(() => {
    if (pendingDragRef.current) {
      const { id, x, y } = pendingDragRef.current;
      onNodeUpdate({ id, x: snap(x), y: snap(y) });
      pendingDragRef.current = null;
    }
    rafRef.current = null;
  }, [onNodeUpdate]);

  const scheduleDrag = useCallback((id: string, x: number, y: number) => {
    pendingDragRef.current = { id, x, y };
    const now = performance.now();
    if (now - lastUpdateRef.current >= 16) {
      lastUpdateRef.current = now;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(flushDragUpdate);
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flushDragUpdate);
    }
  }, [flushDragUpdate]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const pt = getSvgPoint(e.clientX, e.clientY);
    onCursorMove(pt.x, pt.y);

    if (dragging) {
      const nx = pt.x - dragging.offsetX;
      const ny = pt.y - dragging.offsetY;
      scheduleDrag(dragging.id, nx, ny);
      return;
    }
    if (connecting) {
      setConnecting({ ...connecting, mouseX: pt.x, mouseY: pt.y });
    }
    if (panning) {
      const dx = (e.clientX - panning.startX) * (viewBox.w / (containerRef.current?.clientWidth || 1));
      const dy = (e.clientY - panning.startY) * (viewBox.h / (containerRef.current?.clientHeight || 1));
      setViewBox(v => ({ ...v, x: panning.vbX - dx, y: panning.vbY - dy }));
    }
  }, [dragging, connecting, panning, getSvgPoint, onCursorMove, scheduleDrag, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback((_e: MouseEvent) => {
    if (pendingDragRef.current) {
      flushDragUpdate();
    }
    setDragging(null);
    setPanning(null);
  }, [flushDragUpdate]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const addNode = (type: 'rect' | 'diamond' | 'circle') => {
    const w = type === 'circle' ? 100 : 120;
    const h = type === 'circle' ? 100 : 80;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const fill = CANDY_COLORS[colorCursor % CANDY_COLORS.length];
    setColorCursor(c => c + 1);
    onNodeAdd({
      id: uuidv4(),
      type,
      x: snap(cx - w / 2),
      y: snap(cy - h / 2),
      width: w,
      height: h,
      fill,
      stroke: '#FFFFFF40',
      strokeWidth: 2,
      text: type === 'rect' ? '开始' : type === 'diamond' ? '判断' : '结束',
    });
  };

  const startNodeEdit = (node: DiagramNode) => {
    setEditing({ kind: 'node', id: node.id });
    setEditValue(node.text);
    setEditPos({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
  };

  const startEdgeEdit = (edge: DiagramEdge) => {
    const a = nodes.find(n => n.id === edge.sourceId);
    const b = nodes.find(n => n.id === edge.targetId);
    if (!a || !b) return;
    const mid = getEdgeMidpoint(a, b);
    setEditing({ kind: 'edge', id: edge.id });
    setEditValue(edge.label);
    setEditPos(mid);
  };

  const commitEdit = () => {
    if (!editing) return;
    if (editing.kind === 'node') {
      onNodeUpdate({ id: editing.id, text: editValue });
    } else {
      onEdgeUpdate({ id: editing.id, label: editValue });
    }
    setEditing(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const pt = getSvgPoint(e.clientX, e.clientY);
    setViewBox(v => {
      const newW = Math.max(400, Math.min(4000, v.w * factor));
      const newH = Math.max(300, Math.min(3000, v.h * factor));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return v;
      const ratioX = (pt.x - v.x) / v.w;
      const ratioY = (pt.y - v.y) / v.h;
      return {
        x: pt.x - newW * ratioX,
        y: pt.y - newH * ratioY,
        w: newW,
        h: newH,
      };
    });
  };

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as SVGElement).tagName === 'svg') {
      onSelect(null);
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        vbX: viewBox.x,
        vbY: viewBox.y,
      });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    onSelect(node.id);
    const pt = getSvgPoint(e.clientX, e.clientY);
    setDragging({
      id: node.id,
      offsetX: pt.x - node.x,
      offsetY: pt.y - node.y,
    });
  };

  const handleNodeMouseUp = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    if (connecting && connecting.sourceId !== node.id) {
      onEdgeAdd({
        id: uuidv4(),
        type: 'edge',
        sourceId: connecting.sourceId,
        targetId: node.id,
        label: '',
      });
    }
    setConnecting(null);
  };

  const handleNodeDblClick = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    startNodeEdit(node);
  };

  const handleStartConnect = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    const pt = getSvgPoint(e.clientX, e.clientY);
    setConnecting({ sourceId: node.id, mouseX: pt.x, mouseY: pt.y });
  };

  const handleEdgeDblClick = (e: React.MouseEvent, edge: DiagramEdge) => {
    e.stopPropagation();
    startEdgeEdit(edge);
  };

  const handleEdgeClick = (e: React.MouseEvent, edge: DiagramEdge) => {
    e.stopPropagation();
    onSelect(edge.id);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (editing) {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') setEditing(null);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      if (nodes.find(n => n.id === selectedId)) {
        onNodeDelete(selectedId);
      } else if (edges.find(ed => ed.id === selectedId)) {
        onEdgeDelete(selectedId);
      }
      onSelect(null);
    }
    if (e.key === 'r' || e.key === 'R') addNode('rect');
    if (e.key === 'd' || e.key === 'D') addNode('diamond');
    if (e.key === 'c' || e.key === 'C') addNode('circle');
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderNodeShape = (node: DiagramNode) => {
    const selected = selectedId === node.id;
    const glow = selected ? 'drop-shadow(0 0 12px #6C5CE7)' : 'none';
    const common = {
      fill: node.fill,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      filter: glow,
      style: { cursor: 'move' },
      onMouseDown: (e: React.MouseEvent) => handleNodeMouseDown(e, node),
      onMouseUp: (e: React.MouseEvent) => handleNodeMouseUp(e, node),
      onDoubleClick: (e: React.MouseEvent) => handleNodeDblClick(e, node),
    } as any;

    if (node.type === 'rect') {
      return <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={8} ry={8} {...common} />;
    }
    if (node.type === 'circle') {
      return <ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} {...common} />;
    }
    if (node.type === 'diamond') {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const pts = `${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}`;
      return <polygon points={pts} {...common} />;
    }
    return null;
  };

  const renderConnectorHandle = (node: DiagramNode) => {
    if (selectedId !== node.id) return null;
    const c = getNodeCenter(node);
    return (
      <circle
        cx={c.cx + node.width / 2}
        cy={c.cy}
        r={8}
        fill="#6C5CE7"
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'crosshair' }}
        onMouseDown={(e) => handleStartConnect(e, node)}
      />
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden', background: '#1E1E2E' }}>
      <div style={{ position: 'absolute', top: 12, left: 32, display: 'flex', gap: 8, zIndex: 10 }}>
        {(['rect', 'diamond', 'circle'] as const).map(t => (
          <button
            key={t}
            onClick={() => addNode(t)}
            style={{
              padding: '6px 12px',
              background: '#2D2D3F',
              border: '1px solid #ffffff30',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 12,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = '#6C5CE7')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#ffffff30')}
          >
            {t === 'rect' ? '➕ 方形 (R)' : t === 'diamond' ? '◆ 菱形 (D)' : '● 圆形 (C)'}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleBgMouseDown}
        onWheel={handleWheel}
        style={{ display: 'block', userSelect: 'none' }}
      >
        <defs>
          <pattern id="grid" width={GRID * 10} height={GRID * 10} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID * 10} 0 L 0 0 0 ${GRID * 10}`} fill="none" stroke="#ffffff08" strokeWidth="1" />
          </pattern>
          <pattern id="grid-small" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={GRID} cy={GRID} r={0.5} fill="#ffffff10" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff80" />
          </marker>
        </defs>
        <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="url(#grid)" />
        <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="url(#grid-small)" />

        {edges.map(edge => {
          const a = nodes.find(n => n.id === edge.sourceId);
          const b = nodes.find(n => n.id === edge.targetId);
          if (!a || !b) return null;
          const selected = selectedId === edge.id;
          const mid = getEdgeMidpoint(a, b);
          return (
            <g key={edge.id}>
              <path
                d={getEdgePath(a, b)}
                fill="none"
                stroke={selected ? '#6C5CE7' : '#ffffff80'}
                strokeWidth={selected ? 3 : 2}
                markerEnd="url(#arrowhead)"
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleEdgeClick(e, edge)}
                onDoubleClick={(e) => handleEdgeDblClick(e, edge)}
              />
              {edge.label && (
                <g pointerEvents="none">
                  <rect
                    x={mid.mx - edge.label.length * 4 - 6}
                    y={mid.my - 10}
                    width={edge.label.length * 8 + 12}
                    height={20}
                    rx={4}
                    fill="#2D2D3F"
                    stroke="#ffffff30"
                  />
                  <text x={mid.mx} y={mid.my + 4} textAnchor="middle" fill="#fff" fontSize={12} fontFamily="Inter">
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {connecting && (() => {
          const src = nodes.find(n => n.id === connecting.sourceId);
          if (!src) return null;
          const c = getNodeCenter(src);
          return (
            <line
              x1={c.cx}
              y1={c.cy}
              x2={connecting.mouseX}
              y2={connecting.mouseY}
              stroke="#6C5CE7"
              strokeWidth={2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          );
        })()}

        {nodes.map(node => (
          <g key={node.id}>
            {renderNodeShape(node)}
            {renderConnectorHandle(node)}
            {editing?.id !== node.id && node.text && (
              <foreignObject x={node.x + 4} y={node.y + 4} width={node.width - 8} height={node.height - 8} pointerEvents="none">
                <NodeText text={node.text} />
              </foreignObject>
            )}
          </g>
        ))}

        {remoteUsers.map(u => u.x != null && u.y != null && (
          <g key={u.id} pointerEvents="none">
            <circle cx={u.x} cy={u.y} r={5} fill={u.color} />
            <rect x={u.x + 8} y={u.y - 12} width={u.name.length * 12 + 12} height={20} rx={6} fill={u.color + 'cc'} />
            <text x={u.x + 14} y={u.y + 2} fill="#fff" fontSize={12} fontFamily="Inter" fontWeight={500}>
              {u.name}
            </text>
          </g>
        ))}
      </svg>

      {editing && (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(null);
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${editPos.x - viewBox.x}px, ${editPos.y - viewBox.y}px) translate(-50%, -50%)`,
            padding: '4px 8px',
            background: '#2D2D3F',
            color: '#fff',
            border: '1px solid #6C5CE7',
            borderRadius: 4,
            fontFamily: 'Inter',
            fontSize: 14,
            maxWidth: 120,
            textAlign: 'center',
            zIndex: 100,
          }}
        />
      )}
    </div>
  );
};

const NodeText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'center',
        wordBreak: 'break-word',
        overflow: 'hidden',
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  );
};

export default Canvas;
