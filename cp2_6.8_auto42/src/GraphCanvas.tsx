import { useRef, useEffect, useState, useCallback } from 'react';
import type { GraphNode, GraphEdge, TopologyResult, ViewMode, ContextMenuState } from './types';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewMode: ViewMode;
  topology: TopologyResult | null;
  onAddNode: (x: number, y: number) => void;
  onUpdateNode: (id: string, updates: Partial<GraphNode>) => void;
  onDeleteNode: (id: string) => void;
  onAddEdge: (source: string, target: string) => void;
  onToggleEdgeStyle: (edgeId: string) => void;
}

const NODE_RADIUS = 30;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

function GraphCanvas({
  nodes,
  edges,
  viewMode,
  topology,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onToggleEdgeStyle,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [edgeDrawing, setEdgeDrawing] = useState<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const animFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (screenX - rect.left - offset.x) / scale;
      const y = (screenY - rect.top - offset.y) / scale;
      return { x, y };
    },
    [offset, scale]
  );

  const getNodeAtPosition = useCallback(
    (worldX: number, worldY: number): GraphNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const dx = worldX - node.x;
        const dy = worldY - node.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
          return node;
        }
      }
      return null;
    },
    [nodes]
  );

  const getEdgeAtPosition = useCallback(
    (worldX: number, worldY: number): GraphEdge | null => {
      for (const edge of edges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        const dist = pointToLineDistance(
          worldX,
          worldY,
          sourceNode.x,
          sourceNode.y,
          targetNode.x,
          targetNode.y
        );
        if (dist < 8) {
          return edge;
        }
      }
      return null;
    },
    [edges, nodes]
  );

  const pointToLineDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    drawGrid(ctx, rect.width / scale, rect.height / scale, offset.x / scale, offset.y / scale);

    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const isHovered = hoveredEdge === edge.id;
      const isCycle = !!(
        topology?.hasCycle &&
        topology.cycleNodes.includes(edge.source) &&
        topology.cycleNodes.includes(edge.target)
      );

      drawEdge(ctx, sourceNode, targetNode, edge, isHovered, isCycle);
    });

    if (edgeDrawing) {
      const sourceNode = nodes.find((n) => n.id === edgeDrawing.sourceId);
      if (sourceNode) {
        const worldMouse = screenToWorld(edgeDrawing.mouseX, edgeDrawing.mouseY);
        drawTempEdge(ctx, sourceNode.x, sourceNode.y, worldMouse.x, worldMouse.y);
      }
    }

    nodes.forEach((node) => {
      const isDragging = draggingNode === node.id;
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;
      const isCycle = !!(topology?.cycleNodes.includes(node.id));

      drawNode(ctx, node, isDragging, isHovered, isSelected, isCycle);
    });

    ctx.restore();
  }, [nodes, edges, scale, offset, draggingNode, hoveredNode, hoveredEdge, edgeDrawing, selectedNode, topology, screenToWorld]);

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
  ) => {
    const gridSize = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    const startX = -offsetX - gridSize;
    const startY = -offsetY - gridSize;
    const endX = startX + width + gridSize * 2;
    const endY = startY + height + gridSize * 2;

    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  };

  const drawNode = (
    ctx: CanvasRenderingContext2D,
    node: GraphNode,
    isDragging: boolean,
    isHovered: boolean,
    isSelected: boolean,
    isCycle: boolean
  ) => {
    const radius = NODE_RADIUS * (isDragging ? 1.1 : 1);

    if (isDragging || isHovered || isSelected) {
      ctx.save();
      ctx.shadowColor = 'rgba(233, 69, 96, 0.6)';
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    ctx.lineWidth = 2;
    if (isCycle) {
      const time = Date.now() / 500;
      const alpha = (Math.sin(time) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + alpha * 0.5})`;
      ctx.lineWidth = 3;
    } else if (isSelected) {
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#fff';
    }
    ctx.stroke();

    if (isDragging || isHovered || isSelected) {
      ctx.restore();
    }

    ctx.fillStyle = '#fff';
    ctx.font = `${12 / scale}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = radius * 1.6;
    let title = node.title;
    if (ctx.measureText(title).width > maxWidth) {
      while (ctx.measureText(title + '...').width > maxWidth && title.length > 1) {
        title = title.slice(0, -1);
      }
      title += '...';
    }
    ctx.fillText(title, node.x, node.y);
  };

  const drawEdge = (
    ctx: CanvasRenderingContext2D,
    source: GraphNode,
    target: GraphNode,
    edge: GraphEdge,
    isHovered: boolean,
    isCycle: boolean
  ) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const unitX = dx / dist;
    const unitY = dy / dist;

    const startX = source.x + unitX * NODE_RADIUS;
    const startY = source.y + unitY * NODE_RADIUS;
    const endX = target.x - unitX * (NODE_RADIUS + 8);
    const endY = target.y - unitY * (NODE_RADIUS + 8);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    const color = isCycle ? '#ff0000' : edge.style === 'solid' ? '#e94560' : '#0f3460';
    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered ? 3 : 2;

    if (edge.style === 'dashed') {
      ctx.setLineDash([8, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    const arrowSize = 10;
    const angle = Math.atan2(dy, dx);
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
    ctx.fillStyle = color;
    ctx.fill();

    if (edge.label) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      ctx.font = `${10 / scale}px -apple-system, sans-serif`;
      const textWidth = ctx.measureText(edge.label).width;
      const bgPadding = 4;

      ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
      ctx.fillRect(
        midX - textWidth / 2 - bgPadding,
        midY - 8 - bgPadding,
        textWidth + bgPadding * 2,
        16 + bgPadding * 2
      );

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label, midX, midY);
    }
  };

  const drawTempEdge = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  useEffect(() => {
    const animate = (time: number) => {
      if (time - lastTimeRef.current >= 16) {
        draw();
        lastTimeRef.current = time;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      draw();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(worldPos.x, worldPos.y);

    if (viewMode === 'preview') {
      if (clickedNode) {
        setSelectedNode(clickedNode.id);
      } else {
        setSelectedNode(null);
      }
      return;
    }

    if (clickedNode) {
      setDraggingNode(clickedNode.id);
      setDragStart({ x: worldPos.x - clickedNode.x, y: worldPos.y - clickedNode.y });
      setSelectedNode(clickedNode.id);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y });
      setSelectedNode(null);
    }

    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (draggingNode && viewMode === 'edit') {
      const newX = worldPos.x - dragStart.x;
      const newY = worldPos.y - dragStart.y;
      onUpdateNode(draggingNode, { x: newX, y: newY });
      return;
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset({ x: panStart.offsetX + dx, y: panStart.offsetY + dy });
      return;
    }

    if (edgeDrawing) {
      setEdgeDrawing({ ...edgeDrawing, mouseX: e.clientX, mouseY: e.clientY });
    }

    const hoveredNodeEl = getNodeAtPosition(worldPos.x, worldPos.y);
    setHoveredNode(hoveredNodeEl?.id || null);

    if (!hoveredNodeEl) {
      const hoveredEdgeEl = getEdgeAtPosition(worldPos.x, worldPos.y);
      setHoveredEdge(hoveredEdgeEl?.id || null);
    } else {
      setHoveredEdge(null);
    }

    if (hoveredNodeEl) {
      (e.target as HTMLCanvasElement).style.cursor = 'move';
    } else if (edgeDrawing) {
      (e.target as HTMLCanvasElement).style.cursor = 'crosshair';
    } else {
      (e.target as HTMLCanvasElement).style.cursor = 'grab';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (edgeDrawing) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const targetNode = getNodeAtPosition(worldPos.x, worldPos.y);
      if (targetNode && targetNode.id !== edgeDrawing.sourceId) {
        onAddEdge(edgeDrawing.sourceId, targetNode.id);
      }
      setEdgeDrawing(null);
    }

    setDraggingNode(null);
    setIsPanning(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'edit') return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(worldPos.x, worldPos.y);

    if (clickedNode) {
      setEditingNode(clickedNode.id);
      setEditValue(clickedNode.title);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'edit') {
      if (hoveredEdge) {
        onToggleEdgeStyle(hoveredEdge);
      }
      return;
    }

    if (hoveredEdge && !draggingNode) {
      onToggleEdgeStyle(hoveredEdge);
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(worldPos.x, worldPos.y);

    if (!clickedNode && !isPanning && !edgeDrawing) {
      onAddNode(worldPos.x, worldPos.y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (viewMode !== 'edit') return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAtPosition(worldPos.x, worldPos.y);

    if (clickedNode) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        nodeId: clickedNode.id,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (viewMode !== 'edit') return;
    if (e.button === 0) {
      setEdgeDrawing({ sourceId: nodeId, mouseX: e.clientX, mouseY: e.clientY });
      e.stopPropagation();
    }
  };

  const handleEditSubmit = () => {
    if (editingNode && editValue.trim()) {
      onUpdateNode(editingNode, { title: editValue.trim().slice(0, 20) });
    }
    setEditingNode(null);
    setEditValue('');
  };

  const handleDeleteNode = () => {
    if (contextMenu.nodeId) {
      onDeleteNode(contextMenu.nodeId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleColorChange = (color: string) => {
    if (contextMenu.nodeId) {
      onUpdateNode(contextMenu.nodeId, { color });
    }
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const editingNodeData = nodes.find((n) => n.id === editingNode);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          display: 'block',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      />

      {viewMode === 'edit' &&
        nodes.map((node) => {
          const screenX = node.x * scale + offset.x;
          const screenY = node.y * scale + offset.y - NODE_RADIUS * scale - 10;

          if (hoveredNode === node.id || edgeDrawing?.sourceId === node.id) {
            return (
              <div
                key={`edge-handle-${node.id}`}
                style={{
                  position: 'absolute',
                  left: screenX - 8,
                  top: screenY,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#e94560',
                  border: '2px solid #fff',
                  cursor: 'crosshair',
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                title="拖拽创建依赖"
              />
            );
          }
          return null;
        })}

      {editingNode && editingNodeData && (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.slice(0, 20))}
          onBlur={handleEditSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditSubmit();
            if (e.key === 'Escape') {
              setEditingNode(null);
              setEditValue('');
            }
          }}
          autoFocus
          style={{
            position: 'absolute',
            left: editingNodeData.x * scale + offset.x - 60,
            top: editingNodeData.y * scale + offset.y - 12,
            width: 120,
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #e94560',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center',
            zIndex: 100,
          }}
        />
      )}

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onMouseLeave={() =>
            setContextMenu({ visible: false, x: 0, y: 0, nodeId: null })
          }
        >
          <div className="context-menu-item" onClick={handleDeleteNode}>
            删除节点
          </div>
          <div className="context-menu-item">修改颜色</div>
          <div style={{ display: 'flex', padding: '8px', gap: '8px' }}>
            {['#4a90d9', '#4ab97a', '#e8a849', '#e94560', '#9b59b6'].map((color) => (
              <div
                key={color}
                onClick={() => handleColorChange(color)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: '8px',
          background: 'rgba(26, 26, 46, 0.8)',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s * 0.8))}
          style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          −
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 50,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.25))}
          style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default GraphCanvas;
