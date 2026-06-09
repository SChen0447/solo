import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface NodeData {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  color: string;
  type: 'root' | 'child';
  width: number;
  height: number;
}

export interface User {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

interface MindMapCanvasProps {
  nodes: NodeData[];
  users: User[];
  currentUserId: string;
  darkMode: boolean;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onAddNode: (node: NodeData) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onUpdateText: (nodeId: string, text: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onCursorMove: (x: number, y: number) => void;
  onDoubleClick: (x: number, y: number) => void;
  onTabFromNode: (parentId: string) => void;
}

const GRID_SIZE = 40;
const ROOT_NODE_SIZE = 80;
const CONNECTION_COLOR = '#CCCCCC';
const CONNECTION_WIDTH = 2;
const MAX_TEXT_LENGTH = 50;
const PADDING_X = 20;
const PADDING_Y = 12;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function measureTextWidth(text: string, fontSize: number = 14): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSize;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  return ctx.measureText(text).width;
}

function getChildNodeSize(text: string): { width: number; height: number } {
  const w = Math.max(80, measureTextWidth(text || '新节点') + PADDING_X * 2);
  const h = 36 + PADDING_Y;
  return { width: w, height: h };
}

function bezierPath(
  x1: number, y1: number, w1: number, h1: number, type1: 'root' | 'child',
  x2: number, y2: number, w2: number, h2: number, _type2: 'root' | 'child'
): string {
  let sx: number, sy: number, ex: number, ey: number;

  if (type1 === 'root') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    sx = x1 + Math.cos(angle) * ROOT_NODE_SIZE / 2;
    sy = y1 + Math.sin(angle) * ROOT_NODE_SIZE / 2;
  } else {
    const fromLeft = x2 < x1;
    sx = fromLeft ? x1 : x1 + w1;
    sy = y1 + h1 / 2;
  }

  ex = x2 + w2 / 2;
  ey = y2 + h2 / 2;

  const dx = Math.abs(ex - sx) * 0.5;
  const c1x = sx + dx;
  const c1y = sy;
  const c2x = ex - dx;
  const c2y = ey;

  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  users,
  currentUserId,
  darkMode,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  onMoveNode,
  onUpdateText,
  onDeleteNode,
  onCursorMove,
  onDoubleClick,
  onTabFromNode
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const cursorThrottleRef = useRef<number>(0);
  const nodeMapRef = useRef<Map<string, NodeData>>(new Map());

  useEffect(() => {
    nodeMapRef.current = new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scale = windowWidth < 768 ? 0.8 : 1;
  const useVirtualScroll = windowWidth < 768;

  const viewportRect = useRef({ left: 0, top: 0, right: 0, bottom: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const updateViewport = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      viewportRect.current = {
        left: -pan.x / scale,
        top: -pan.y / scale,
        right: (-pan.x + rect.width) / scale,
        bottom: (-pan.y + rect.height) / scale
      };
    };
    updateViewport();
  }, [pan, scale]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale
    };
  }, [pan, scale]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      onSelectNode(null);
      setEditingNodeId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current > 16) {
      cursorThrottleRef.current = now;
      const pos = getCanvasPos(e.clientX, e.clientY);
      onCursorMove(pos.x, pos.y);
    }

    if (isPanning) {
      setPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y)
      });
    }

    if (draggingNodeId) {
      const pos = getCanvasPos(e.clientX, e.clientY);
      const nx = pos.x - dragOffsetRef.current.x;
      const ny = pos.y - dragOffsetRef.current.y;
      onMoveNode(draggingNodeId, nx, ny);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      const pos = getCanvasPos(e.clientX, e.clientY);
      onDoubleClick(pos.x, pos.y);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    onSelectNode(node.id);
    if (editingNodeId !== node.id) {
      setEditingNodeId(null);
    }
    const pos = getCanvasPos(e.clientX, e.clientY);
    const nodeLeft = node.type === 'root' ? node.x - ROOT_NODE_SIZE / 2 : node.x;
    const nodeTop = node.type === 'root' ? node.y - ROOT_NODE_SIZE / 2 : node.y;
    dragOffsetRef.current = { x: pos.x - nodeLeft, y: pos.y - nodeTop };
    setDraggingNodeId(node.id);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditingText(node.text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, MAX_TEXT_LENGTH);
    setEditingText(val);
  };

  const handleTextBlur = () => {
    if (editingNodeId && editingText.trim()) {
      onUpdateText(editingNodeId, editingText.trim());
    }
    setEditingNodeId(null);
    setEditingText('');
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setEditingNodeId(null);
      setEditingText('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return;
      if (e.key === 'Tab' && selectedNodeId) {
        e.preventDefault();
        onTabFromNode(selectedNodeId);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !editingNodeId) {
        onDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, editingNodeId, onTabFromNode, onDeleteNode]);

  const bgColor = darkMode ? '#1E1E1E' : '#F5F5F5';
  const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)';

  const visibleNodes = useVirtualScroll
    ? nodes.filter(n => {
        const v = viewportRect.current;
        const margin = 200;
        return (
          n.x + (n.width || 100) > v.left - margin &&
          n.x < v.right + margin &&
          n.y + (n.height || 50) > v.top - margin &&
          n.y < v.bottom + margin
        );
      })
    : nodes;

  return (
    <div
      ref={canvasRef}
      className="canvas-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 1024,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        backgroundColor: bgColor,
        userSelect: 'none'
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <div
        className="canvas-bg"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          pointerEvents: 'none'
        }}
      />

      <div
        className="content-wrapper"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        <svg
          className="connections-layer"
          style={{
            position: 'absolute',
            top: -5000,
            left: -5000,
            width: 10000,
            height: 10000,
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          <g transform="translate(5000, 5000)">
            {nodes.map(node => {
              if (!node.parentId) return null;
              const parent = nodeMapRef.current.get(node.parentId);
              if (!parent) return null;
              const pW = parent.type === 'root' ? ROOT_NODE_SIZE : parent.width;
              const pH = parent.type === 'root' ? ROOT_NODE_SIZE : parent.height;
              const pX = parent.type === 'root' ? parent.x - ROOT_NODE_SIZE / 2 : parent.x;
              const pY = parent.type === 'root' ? parent.y - ROOT_NODE_SIZE / 2 : parent.y;
              const cW = node.type === 'root' ? ROOT_NODE_SIZE : node.width;
              const cH = node.type === 'root' ? ROOT_NODE_SIZE : node.height;
              const cX = node.type === 'root' ? node.x - ROOT_NODE_SIZE / 2 : node.x;
              const cY = node.type === 'root' ? node.y - ROOT_NODE_SIZE / 2 : node.y;
              const d = bezierPath(
                pX, pY, pW, pH, parent.type,
                cX, cY, cW, cH, node.type
              );
              return (
                <path
                  key={`conn-${node.id}`}
                  d={d}
                  stroke={CONNECTION_COLOR}
                  strokeWidth={CONNECTION_WIDTH}
                  fill="none"
                />
              );
            })}
          </g>
        </svg>

        {visibleNodes.map(node => {
          const isRoot = node.type === 'root';
          const isSelected = selectedNodeId === node.id;
          const isEditing = editingNodeId === node.id;
          const w = isRoot ? ROOT_NODE_SIZE : (node.width || 100);
          const h = isRoot ? ROOT_NODE_SIZE : (node.height || 44);
          const left = isRoot ? node.x - ROOT_NODE_SIZE / 2 : node.x;
          const top = isRoot ? node.y - ROOT_NODE_SIZE / 2 : node.y;

          return (
            <div
              key={node.id}
              className="mindmap-node"
              style={{
                position: 'absolute',
                left,
                top,
                width: w,
                height: h,
                backgroundColor: node.color,
                color: '#FFFFFF',
                borderRadius: isRoot ? '50%' : 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'move',
                fontSize: isRoot ? 14 : 13,
                fontWeight: 500,
                textAlign: 'center',
                padding: isRoot ? 0 : `${PADDING_Y / 2}px ${PADDING_X / 2}px`,
                boxSizing: 'border-box',
                boxShadow: isSelected ? `0 0 0 0 ${node.color}99` : '0 2px 6px rgba(0,0,0,0.15)',
                animation: isSelected ? `pulse-glow-${node.id.replace(/[^a-zA-Z]/g, '')} 1s infinite` : 'node-enter 0.3s ease-out',
                zIndex: isSelected ? 10 : 1,
                transition: 'box-shadow 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
            >
              <style>{`
                @keyframes pulse-glow-${node.id.replace(/[^a-zA-Z]/g, '')} {
                  0%, 100% { box-shadow: 0 0 0 0 ${node.color}99; }
                  50% { box-shadow: 0 0 8px 4px ${node.color}99; }
                }
              `}</style>
              {isEditing ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={handleTextChange}
                  onBlur={handleTextBlur}
                  onKeyDown={handleTextKeyDown}
                  autoFocus
                  style={{
                    width: '90%',
                    border: 'none',
                    outline: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    fontSize: 'inherit',
                    textAlign: 'center',
                    borderRadius: 4,
                    padding: '2px 4px'
                  }}
                  maxLength={MAX_TEXT_LENGTH}
                />
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.text}</span>
              )}
            </div>
          );
        })}

        {users.filter(u => u.id !== currentUserId).map(user => (
          <div
            key={`cursor-${user.id}`}
            className="remote-cursor"
            style={{
              position: 'absolute',
              left: user.x - 6,
              top: user.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: user.color,
              opacity: 0.7,
              pointerEvents: 'none',
              zIndex: 100,
              transition: 'left 0.05s linear, top 0.05s linear'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: -6,
                backgroundColor: user.color,
                color: '#FFFFFF',
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                opacity: 0.9
              }}
            >
              {user.username}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes node-enter {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        .mindmap-node {
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default MindMapCanvas;
export { generateId, getChildNodeSize, ROOT_NODE_SIZE };
