import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MindMapNode as MindMapNodeType, User } from '../types';

interface MindMapCanvasProps {
  nodes: Record<string, MindMapNodeType>;
  users: User[];
  currentUser: User | null;
  onAddNode: (parentId: string) => void;
  onUpdateNode: (nodeId: string, updates: Partial<MindMapNodeType>) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onToggleCollapse: (nodeId: string) => void;
  onChangeNodeColor: (nodeId: string, color: string) => void;
  onSendCursor: (nodeId: string | null, offset: number) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const COLOR_OPTIONS = ['#ffffff', '#ffe0e0', '#e0f0ff', '#fff3e0', '#f0e0ff', '#e8f5e9'];

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  users,
  currentUser,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onMoveNode,
  onToggleCollapse,
  onChangeNodeColor,
  onSendCursor,
  canvasRef,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const visibleNodes = useMemo(() => {
    const result: string[] = [];
    const rootNodes = Object.values(nodes).filter((n) => n.parentId === null);

    const collectVisible = (nodeId: string) => {
      result.push(nodeId);
      const node = nodes[nodeId];
      if (node && !node.collapsed) {
        node.children.forEach(collectVisible);
      }
    };

    rootNodes.forEach((n) => collectVisible(n.id));
    return result;
  }, [nodes]);

  const getNodePosition = useCallback(
    (node: MindMapNodeType) => {
      return {
        x: node.x * scale + pan.x,
        y: node.y * scale + pan.y,
        width: NODE_WIDTH * scale,
        height: NODE_HEIGHT * scale,
      };
    },
    [scale, pan]
  );

  const getConnectionPath = useCallback(
    (parent: MindMapNodeType, child: MindMapNodeType) => {
      const parentPos = getNodePosition(parent);
      const childPos = getNodePosition(child);

      const startX = parentPos.x + parentPos.width;
      const startY = parentPos.y + parentPos.height / 2;
      const endX = childPos.x;
      const endY = childPos.y + childPos.height / 2;

      const controlOffset = Math.abs(endX - startX) * 0.5;
      const cp1x = startX + controlOffset;
      const cp1y = startY;
      const cp2x = endX - controlOffset;
      const cp2y = endY;

      return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    },
    [getNodePosition]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(3, Math.max(0.3, prev * delta)));
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedNodeId(null);
        setEditingNodeId(null);
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (draggingNodeId && nodes[draggingNodeId]) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - dragOffset.x - pan.x) / scale;
        const y = (e.clientY - rect.top - dragOffset.y - pan.y) / scale;

        onMoveNode(draggingNodeId, x, y);
      }
    },
    [isPanning, panStart, draggingNodeId, dragOffset, pan, scale, onMoveNode, nodes]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodes[nodeId];
      if (!node) return;

      const pos = getNodePosition(node);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragOffset({
        x: e.clientX - rect.left - pos.x,
        y: e.clientY - rect.top - pos.y,
      });
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);

      const nodeEl = e.currentTarget as HTMLElement;
      const rect2 = nodeEl.getBoundingClientRect();
      setToolbarPosition({
        x: rect2.left + rect2.width / 2,
        y: rect2.top - 10,
      });
    },
    [nodes, getNodePosition]
  );

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setEditingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 10);
    },
    []
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, nodeId: string) => {
      const value = e.target.value;
      onUpdateNode(nodeId, { text: value });
      onSendCursor(nodeId, value.length);
    },
    [onUpdateNode, onSendCursor]
  );

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, nodeId: string) => {
      if (e.key === 'Enter') {
        setEditingNodeId(null);
        onSendCursor(null, 0);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
      }
    },
    [onSendCursor]
  );

  const handleTextBlur = useCallback(() => {
    setEditingNodeId(null);
    onSendCursor(null, 0);
  }, [onSendCursor]);

  const handleAddChild = useCallback(() => {
    if (selectedNodeId) {
      onAddNode(selectedNodeId);
    }
  }, [selectedNodeId, onAddNode]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId && nodes[selectedNodeId]?.parentId) {
      onDeleteNode(selectedNodeId);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, nodes, onDeleteNode]);

  const handleToggleCollapse = useCallback(() => {
    if (selectedNodeId) {
      onToggleCollapse(selectedNodeId);
    }
  }, [selectedNodeId, onToggleCollapse]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedNodeId) {
        onChangeNodeColor(selectedNodeId, color);
      }
      setShowColorPicker(false);
    },
    [selectedNodeId, onChangeNodeColor]
  );

  const renderConnections = () => {
    const paths: JSX.Element[] = [];

    visibleNodes.forEach((nodeId) => {
      const node = nodes[nodeId];
      if (node && node.parentId && nodes[node.parentId] && visibleNodes.includes(node.parentId)) {
        paths.push(
          <path
            key={`edge-${node.parentId}-${nodeId}`}
            d={getConnectionPath(nodes[node.parentId], node)}
            stroke="#c0c4b8"
            strokeWidth={2 * scale}
            fill="none"
            style={{ transition: 'd 0.3s ease-out' }}
          />
        );
      }
    });

    return paths;
  };

  const renderCursors = () => {
    return users
      .filter((u) => u.id !== currentUser?.id && u.cursorPosition)
      .map((user) => {
        const cursor = user.cursorPosition!;
        const node = nodes[cursor.nodeId];
        if (!node || !visibleNodes.includes(cursor.nodeId)) return null;

        const pos = getNodePosition(node);
        const charWidth = 8 * scale;
        const cursorX = pos.x + 10 * scale + cursor.offset * charWidth;
        const cursorY = pos.y + pos.height / 2;

        return (
          <g key={`cursor-${user.id}`} className="remote-cursor">
            <line
              x1={cursorX}
              y1={pos.y + 8 * scale}
              x2={cursorX}
              y2={pos.y + pos.height - 8 * scale}
              stroke={user.color}
              strokeWidth={2}
            />
            <rect
              x={cursorX}
              y={pos.y - 18 * scale}
              width={user.name.length * 8 * scale + 8 * scale}
              height={16 * scale}
              rx={3 * scale}
              fill={user.color}
            />
            <text
              x={cursorX + 4 * scale}
              y={pos.y - 6 * scale}
              fill="white"
              fontSize={10 * scale}
              fontFamily="sans-serif"
            >
              {user.name}
            </text>
          </g>
        );
      });
  };

  const renderNodes = () => {
    return visibleNodes.map((nodeId) => {
      const node = nodes[nodeId];
      if (!node) return null;

      const pos = getNodePosition(node);
      const isSelected = selectedNodeId === nodeId;
      const isEditing = editingNodeId === nodeId;
      const hasChildren = node.children.length > 0;

      return (
        <g
          key={node.id}
          className="mindmap-node"
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
          style={{ cursor: 'move' }}
        >
          {isSelected && (
            <rect
              className="selected-border"
              x={pos.x - 4}
              y={pos.y - 4}
              width={pos.width + 8}
              height={pos.height + 8}
              rx={(8 + 4) * scale}
              fill="none"
              stroke={currentUser?.color || '#4ECDC4'}
              strokeWidth={2}
              strokeDasharray="6,4"
            />
          )}

          <rect
            x={pos.x}
            y={pos.y}
            width={pos.width}
            height={pos.height}
            rx={8 * scale}
            fill={node.color}
            stroke={node.creatorColor}
            strokeWidth={2 * scale}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }}
          />

          {isEditing ? (
            <foreignObject x={pos.x + 5} y={pos.y + 5} width={pos.width - 10} height={pos.height - 10}>
              <input
                ref={editInputRef}
                type="text"
                value={node.text}
                onChange={(e) => handleTextChange(e, node.id)}
                onKeyDown={(e) => handleTextKeyDown(e, node.id)}
                onBlur={handleTextBlur}
                className="node-input"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14 * scale,
                  textAlign: 'center',
                  fontFamily: 'sans-serif',
                }}
              />
            </foreignObject>
          ) : (
            <text
              x={pos.x + pos.width / 2}
              y={pos.y + pos.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14 * scale}
              fontFamily="sans-serif"
              fill="#333"
              style={{ pointerEvents: 'none' }}
            >
              {node.text}
            </text>
          )}

          {hasChildren && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse();
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={pos.x + pos.width}
                cy={pos.y + pos.height / 2}
                r={8 * scale}
                fill="white"
                stroke={node.creatorColor}
                strokeWidth={1.5 * scale}
              />
              <text
                x={pos.x + pos.width}
                y={pos.y + pos.height / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12 * scale}
                fill={node.creatorColor}
                style={{ pointerEvents: 'none' }}
              >
                {node.collapsed ? '+' : '−'}
              </text>
            </g>
          )}

          {isSelected && !hasChildren && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild();
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={pos.x + pos.width}
                cy={pos.y + pos.height / 2}
                r={10 * scale}
                fill="#4ECDC4"
                className="add-btn"
              />
              <text
                x={pos.x + pos.width}
                y={pos.y + pos.height / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14 * scale}
                fill="white"
                style={{ pointerEvents: 'none' }}
              >
                +
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div
      ref={canvasRef}
      className="mindmap-canvas-container"
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        className="mindmap-svg"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect className="canvas-bg" width="100%" height="100%" fill="#f5f7f2" />

        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e4d8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

        <g className="connections">{renderConnections()}</g>
        <g className="nodes">{renderNodes()}</g>
        <g className="cursors">{renderCursors()}</g>
      </svg>

      {selectedNodeId && !editingNodeId && (
        <div
          className={`floating-toolbar ${isMobile ? 'mobile' : ''}`}
          style={
            isMobile
              ? {
                  position: 'relative',
                  marginTop: '10px',
                }
              : {
                  left: toolbarPosition.x,
                  top: toolbarPosition.y,
                  transform: 'translate(-50%, -100%)',
                }
          }
        >
          <button className="toolbar-btn" onClick={handleAddChild} title="添加子节点">
            ➕
          </button>
          <button
            className="toolbar-btn"
            onClick={handleDeleteNode}
            title="删除节点"
            disabled={!nodes[selectedNodeId]?.parentId}
          >
            🗑️
          </button>
          <div className="toolbar-color-wrapper">
            <button
              className="toolbar-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="更改颜色"
            >
              🎨
            </button>
            {showColorPicker && (
              <div className="color-picker">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className="color-option"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            )}
          </div>
          <button className="toolbar-btn" onClick={handleToggleCollapse} title="收起/展开">
            {nodes[selectedNodeId]?.collapsed ? '📂' : '📁'}
          </button>
        </div>
      )}

      <div className="zoom-controls">
        <button onClick={() => setScale((s) => Math.min(3, s * 1.2))}>+</button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.max(0.3, s * 0.8))}>−</button>
        <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}>⟲</button>
      </div>
    </div>
  );
};
