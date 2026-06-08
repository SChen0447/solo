import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MindMapData,
  MindMapNode,
  depthFirstTraverse,
  getBranchColor,
  snapToGrid,
  calculateNodeWidth,
  NODE_HEIGHT,
  DEFAULT_COLOR,
} from '../utils/mapLogic';

interface MapCanvasProps {
  data: MindMapData;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onAddNode: (x: number, y: number, parentId: string | null) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onUpdateNodeText: (id: string, text: string) => void;
  onToggleCollapse: (id: string) => void;
  readOnly?: boolean;
}

const GRID_SIZE = 20;
const CANVAS_PADDING = 200;

const MapCanvas: React.FC<MapCanvasProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  onUpdateNodePosition,
  onUpdateNodeText,
  onToggleCollapse,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [animatingPositions, setAnimatingPositions] = useState<Record<string, { x: number; y: number }>>({});
  const animationRef = useRef<number>();

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const drawConnections = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5 * dpr;

    for (let x = 0; x <= canvas.width; x += GRID_SIZE * dpr) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SIZE * dpr) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (!data.rootId) return;

    const drawBezierCurve = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x1 * dpr, y1 * dpr);

      const midX = (x1 + x2) / 2;
      ctx.bezierCurveTo(
        midX * dpr,
        y1 * dpr,
        midX * dpr,
        y2 * dpr,
        x2 * dpr,
        y2 * dpr
      );
      ctx.stroke();
    };

    depthFirstTraverse(data, data.rootId, (nodeId, node) => {
      if (node.parentId && data.nodes[node.parentId]) {
        const parent = data.nodes[node.parentId];
        if (parent.collapsed) return;

        const parentPos = animatingPositions[parent.id] || { x: parent.x, y: parent.y };
        const childPos = animatingPositions[node.id] || { x: node.x, y: node.y };
        const color = getBranchColor(data, nodeId);

        const parentRight = parentPos.x + parent.width;
        const parentCenterY = parentPos.y + parent.height / 2;
        const childLeft = childPos.x;
        const childCenterY = childPos.y + node.height / 2;

        drawBezierCurve(
          parentRight,
          parentCenterY,
          childLeft,
          childCenterY,
          color
        );
      }
    });
  }, [data, animatingPositions]);

  useEffect(() => {
    drawConnections();
  }, [drawConnections]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      setCanvasSize({ width: rect.width, height: rect.height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onAddNode(x, y, selectedNodeId);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === containerRef.current) {
      onSelectNode(null);
      setEditingNodeId(null);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();

    const node = data.nodes[nodeId];
    if (!node) return;

    const pos = animatingPositions[nodeId] || { x: node.x, y: node.y };
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - rect.left - pos.x,
      y: e.clientY - rect.top - pos.y,
    });
    onSelectNode(nodeId);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingNodeId) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      let newX = e.clientX - rect.left - dragOffset.x;
      let newY = e.clientY - rect.top - dragOffset.y;

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      const node = data.nodes[draggingNodeId];
      if (node) {
        newX = Math.min(canvasSize.width - node.width, newX);
        newY = Math.min(canvasSize.height - node.height, newY);
      }

      setAnimatingPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    };

    const handleMouseUp = () => {
      if (draggingNodeId) {
        const pos = animatingPositions[draggingNodeId];
        if (pos) {
          const snappedX = snapToGrid(pos.x);
          const snappedY = snapToGrid(pos.y);
          onUpdateNodePosition(draggingNodeId, snappedX, snappedY);
        }
        setDraggingNodeId(null);

        setTimeout(() => {
          setAnimatingPositions({});
        }, 200);
      }
    };

    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, dragOffset, data, canvasSize, animatingPositions, onUpdateNodePosition]);

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();

    const node = data.nodes[nodeId];
    if (!node) return;

    setEditingNodeId(nodeId);
    setEditingText(node.text);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingNodeId) {
        onUpdateNodeText(editingNodeId, editingText);
      }
      setEditingNodeId(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingNodeId(null);
    }
  };

  const handleTextBlur = () => {
    if (editingNodeId) {
      onUpdateNodeText(editingNodeId, editingText);
    }
    setEditingNodeId(null);
  };

  const handleCollapseClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onToggleCollapse(nodeId);
  };

  const isNodeVisible = (nodeId: string): boolean => {
    const node = data.nodes[nodeId];
    if (!node) return false;
    if (!node.parentId) return true;

    let currentId: string | null = node.parentId;
    while (currentId) {
      const parent: MindMapNode | undefined = data.nodes[currentId];
      if (!parent) return false;
      if (parent.collapsed) return false;
      currentId = parent.parentId;
    }
    return true;
  };

  const renderNodes = () => {
    const nodes: React.ReactNode[] = [];

    if (!data.rootId) return nodes;

    depthFirstTraverse(data, data.rootId, (nodeId, node) => {
      const isVisible = isNodeVisible(nodeId);
      if (!isVisible) return;

      const pos = animatingPositions[nodeId] || { x: node.x, y: node.y };
      const isSelected = selectedNodeId === nodeId;
      const isEditing = editingNodeId === nodeId;
      const color = getBranchColor(data, nodeId);
      const hasChildren = node.children.length > 0;
      const nodeWidth = calculateNodeWidth(node.text);

      nodes.push(
        <div
          key={nodeId}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: nodeWidth,
            height: NODE_HEIGHT,
            backgroundColor: '#ffffff',
            border: `2px solid ${color}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            cursor: readOnly ? 'default' : 'move',
            userSelect: 'none',
            transition: draggingNodeId === nodeId ? 'none' : 'left 0.2s ease-out, top 0.2s ease-out',
            boxShadow: isSelected ? '0 0 8px #007AFF' : 'none',
            borderColor: isSelected ? '#007AFF' : color,
            fontSize: 14,
            color: '#333',
            zIndex: isSelected ? 10 : 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
          onMouseDown={(e) => handleNodeMouseDown(e, nodeId)}
          onDoubleClick={(e) => handleNodeDoubleClick(e, nodeId)}
        >
          {hasChildren && !readOnly && (
            <div
              style={{
                position: 'absolute',
                left: -10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: color,
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 20,
              }}
              onClick={(e) => handleCollapseClick(e, nodeId)}
            >
              {node.collapsed ? '+' : '-'}
            </div>
          )}

          {isEditing ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={handleTextKeyDown}
              onBlur={handleTextBlur}
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'inherit',
                backgroundColor: 'transparent',
              }}
            />
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.text}
            </span>
          )}
        </div>
      );
    });

    return nodes;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
      {renderNodes()}

      {readOnly && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0, 122, 255, 0.9)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 100,
          }}
        >
          只读视图
        </div>
      )}
    </div>
  );
};

export default MapCanvas;
