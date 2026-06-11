import React, { useRef, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from './store';
import { themes, getUserColor } from './themes';
import { sendCursorMove } from './websocket';
import type { Action, MindMapNode } from './types';

interface CanvasProps {
  dispatch: (action: Action) => void;
}

function Canvas({ dispatch }: CanvasProps) {
  const { state } = useAppContext();
  const t = themes[state.theme];
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(3.0, Math.max(0.3, prev + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const screenToCanvas = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - pan.x) / scale,
        y: (sy - rect.top - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.mindmap-node')) return;
      const pos = screenToCanvas(e.clientX, e.clientY);
      const id = uuidv4();
      dispatch({
        type: 'ADD_NODE',
        payload: { id, text: '', x: pos.x - 60, y: pos.y - 20, parentId: null, userId: state.userId },
      });
      setEditingId(id);
    },
    [screenToCanvas, dispatch, state.userId]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOrigin({ x: pan.x, y: pan.y });
  }, [pan]);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      setPan({
        x: panOrigin.x + (e.clientX - panStart.x),
        y: panOrigin.y + (e.clientY - panStart.y),
      });
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning, panStart, panOrigin]);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, node: MindMapNode) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pos = screenToCanvas(e.clientX, e.clientY);
      dragRef.current = { nodeId: node.id, offsetX: pos.x - node.x, offsetY: pos.y - node.y, moved: false };
      dispatch({ type: 'SELECT_NODE', payload: { id: node.id } });
    },
    [screenToCanvas, dispatch]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (state.connected) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        sendCursorMove(state.userId, pos.x, pos.y, state.selectedNodeId);
      }
      if (!dragRef.current) return;
      const pos = screenToCanvas(e.clientX, e.clientY);
      const newX = pos.x - dragRef.current.offsetX;
      const newY = pos.y - dragRef.current.offsetY;
      dragRef.current.moved = true;
      dispatch({
        type: 'MOVE_NODE',
        payload: { id: dragRef.current.nodeId, x: newX, y: newY, userId: state.userId },
      });
    };
    const onMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [screenToCanvas, dispatch, state.userId, state.connected, state.selectedNodeId]);

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, node: MindMapNode) => {
      e.stopPropagation();
      setEditingId(node.id);
      dispatch({ type: 'SET_EDITING', payload: { id: node.id, userId: state.userId } });
    },
    [dispatch, state.userId]
  );

  const handleTextBlur = useCallback(
    (nodeId: string, text: string) => {
      setEditingId(null);
      dispatch({ type: 'UPDATE_NODE_TEXT', payload: { id: nodeId, text, userId: state.userId } });
      dispatch({ type: 'SET_EDITING', payload: { id: null, userId: state.userId } });
    },
    [dispatch, state.userId]
  );

  const handleAddChild = useCallback(
    (e: React.MouseEvent, parentNode: MindMapNode) => {
      e.stopPropagation();
      const id = uuidv4();
      const offsetY = state.nodes.filter((n) => n.parentId === parentNode.id).length * 70;
      dispatch({
        type: 'ADD_NODE',
        payload: {
          id,
          text: '',
          x: parentNode.x + 200,
          y: parentNode.y + offsetY,
          parentId: parentNode.id,
          userId: state.userId,
        },
      });
      setEditingId(id);
    },
    [dispatch, state.userId, state.nodes]
  );

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      dispatch({ type: 'DELETE_NODE', payload: { id: nodeId, userId: state.userId } });
    },
    [dispatch, state.userId]
  );

  const getVisibleNodeIds = useCallback((): Set<string> => {
    const visible = new Set<string>();
    const addVisible = (parentId: string | null) => {
      state.nodes
        .filter((n) => n.parentId === parentId)
        .forEach((n) => {
          visible.add(n.id);
          if (!n.collapsed) addVisible(n.id);
        });
    };
    addVisible(null);
    return visible;
  }, [state.nodes]);

  const visibleIds = getVisibleNodeIds();
  const visibleNodes = state.nodes.filter((n) => visibleIds.has(n.id));
  const visibleEdges = state.edges.filter((e) => visibleIds.has(e.sourceId) && visibleIds.has(e.targetId));

  const gridSize = 15 * scale;

  const renderEdge = (edge: typeof state.edges[0]) => {
    const source = state.nodes.find((n) => n.id === edge.sourceId);
    const target = state.nodes.find((n) => n.id === edge.targetId);
    if (!source || !target) return null;

    const sw = Math.max(80, source.text.length * source.fontSize * 0.6 + 32);
    const tw = Math.max(80, target.text.length * target.fontSize * 0.6 + 32);
    const sx = source.x + sw;
    const sy = source.y + 20;
    const tx = target.x;
    const ty = target.y + 20;
    const cpx = (sx + tx) / 2;

    return (
      <path
        key={edge.id}
        d={`M ${sx} ${sy} C ${cpx} ${sy}, ${cpx} ${ty}, ${tx} ${ty}`}
        fill="none"
        stroke={t.lineColor}
        strokeWidth={2}
        opacity={0.6}
        style={{ transition: 'stroke 0.5s ease' }}
      />
    );
  };

  const renderNode = (node: MindMapNode) => {
    const isSelected = state.selectedNodeId === node.id;
    const isHovered = hoveredId === node.id;
    const isEditing = editingId === node.id;
    const editingUser = node.editingUserId && node.editingUserId !== state.userId
      ? state.remoteUsers[node.editingUserId]
      : null;
    const borderColor = editingUser
      ? editingUser.color
      : isSelected
        ? t.selectedBorder
        : isHovered
          ? t.accent
          : t.cardBorder;

    const hasChildren = state.nodes.some((n) => n.parentId === node.id);
    const shapeStyle: React.CSSProperties =
      node.shape === 'ellipse'
        ? { borderRadius: '50%' }
        : node.shape === 'rounded'
          ? { borderRadius: 12 }
          : { borderRadius: 4 };

    const nodeWidth = Math.max(80, node.text.length * node.fontSize * 0.6 + 32);

    return (
      <div
        key={node.id}
        className="mindmap-node"
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          minWidth: nodeWidth,
          padding: '8px 14px',
          background: t.cardBg,
          border: `2px solid ${borderColor}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${t.accent}33, ${t.shadow}`
            : isHovered
              ? `0 4px 16px ${t.accent}22, ${t.shadow}`
              : t.shadow,
          backdropFilter: 'blur(8px)',
          cursor: 'grab',
          userSelect: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.5s ease, left 0.05s linear, top 0.05s linear',
          ...shapeStyle,
          zIndex: isSelected ? 10 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isEditing ? (
            <input
              autoFocus
              defaultValue={node.text}
              onBlur={(e) => handleTextBlur(node.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: t.cardText,
                fontSize: node.fontSize,
                outline: 'none',
                width: '100%',
                minWidth: 40,
                fontFamily: 'inherit',
                transition: 'color 0.5s ease',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: node.fontSize,
                color: node.color,
                whiteSpace: 'nowrap',
                transition: 'color 0.5s ease',
              }}
            >
              {node.text || '...'}
            </span>
          )}

          {editingUser && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: editingUser.color,
                flexShrink: 0,
              }}
              title={editingUser.name}
            />
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            display: 'flex',
            gap: 2,
            opacity: isSelected || isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <button
            onClick={(e) => handleAddChild(e, node)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1px solid ${t.panelBorder}`,
              background: t.panelBg,
              color: t.accent,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            title="添加子节点"
          >
            +
          </button>
          <button
            onClick={(e) => handleDeleteNode(e, node.id)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1px solid ${t.panelBorder}`,
              background: t.panelBg,
              color: '#f87171',
              fontSize: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            title="删除节点"
          >
            ×
          </button>
        </div>

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_COLLAPSE', payload: { id: node.id } });
            }}
            style={{
              position: 'absolute',
              right: -12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1px solid ${t.panelBorder}`,
              background: t.panelBg,
              color: t.cardText,
              fontSize: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={node.collapsed ? '展开' : '折叠'}
          >
            {node.collapsed ? '▶' : '▼'}
          </button>
        )}
      </div>
    );
  };

  const renderRemoteCursors = () => {
    return Object.values(state.remoteUsers).map((user) => {
      if (!user.cursorX && !user.cursorY) return null;
      return (
        <div
          key={user.id}
          style={{
            position: 'absolute',
            left: user.cursorX,
            top: user.cursorY,
            pointerEvents: 'none',
            zIndex: 100,
            transition: 'left 0.1s linear, top 0.1s linear',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: user.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              boxShadow: `0 2px 8px ${user.color}66`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 16,
              top: 16,
              background: user.color,
              color: '#fff',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {user.name}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        background: t.bg,
        transition: 'background 0.5s ease',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            x={pan.x % gridSize}
            y={pan.y % gridSize}
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={t.gridColor}
              strokeWidth={1}
              style={{ transition: 'stroke 0.5s ease' }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {visibleEdges.map(renderEdge)}
        </svg>

        {visibleNodes.map(renderNode)}
        {renderRemoteCursors()}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 4,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setScale((s) => Math.min(3.0, s + 0.1))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(8px)',
            color: t.cardText,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.5s ease, color 0.5s ease',
          }}
        >
          +
        </button>
        <div
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 6,
            border: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(8px)',
            color: t.cardText,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.5s ease, color 0.5s ease',
          }}
        >
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={() => setScale((s) => Math.max(0.3, s - 0.1))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(8px)',
            color: t.cardText,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.5s ease, color 0.5s ease',
          }}
        >
          −
        </button>
        <button
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 6,
            border: `1px solid ${t.panelBorder}`,
            background: t.panelBg,
            backdropFilter: 'blur(8px)',
            color: t.cardText,
            cursor: 'pointer',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.5s ease, color 0.5s ease',
          }}
        >
          重置
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          fontSize: 11,
          color: t.cardText,
          opacity: 0.4,
          zIndex: 20,
          transition: 'color 0.5s ease',
        }}
      >
        双击创建节点 · 右键拖拽平移 · 滚轮缩放
      </div>
    </div>
  );
}

export default Canvas;
