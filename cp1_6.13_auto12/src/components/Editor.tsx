import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MindNode, Connection, THEME_COLORS, getLevelColor } from '../types';

interface EditorProps {
  nodes: MindNode[];
  connections: Connection[];
  onChange: (nodes: MindNode[], connections: Connection[]) => void;
  readonly?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  nodeStartX: number;
  nodeStartY: number;
}

interface ConnectingState {
  isConnecting: boolean;
  fromId: string | null;
  mouseX: number;
  mouseY: number;
}

const SPRING_STIFFNESS = 0.08;
const DAMPING = 0.7;
const MIN_DISTANCE = 150;

function getNodeLevel(nodeId: string, nodeMap: Map<string, MindNode>): number {
  let level = 0;
  let current = nodeMap.get(nodeId);
  while (current && current.parentId) {
    level++;
    current = nodeMap.get(current.parentId);
  }
  return level;
}

function collectDescendants(nodeId: string, nodeMap: Map<string, MindNode>): Set<string> {
  const result = new Set<string>();
  const stack = [nodeId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = nodeMap.get(id);
    if (node && !result.has(id)) {
      result.add(id);
      for (const n of nodeMap.values()) {
        if (n.parentId === id && !result.has(n.id)) {
          stack.push(n.id);
        }
      }
    }
  }
  return result;
}

function measureText(text: string, fontSize = 14): { width: number; height: number } {
  const lines = text.split('\n');
  let maxWidth = 60;
  for (const line of lines) {
    const w = Math.max(60, line.length * fontSize * 0.6 + 24);
    if (w > maxWidth) maxWidth = w;
  }
  const height = Math.max(44, lines.length * (fontSize + 6) + 16);
  return { width: Math.min(maxWidth, 280), height };
}

const Editor: React.FC<EditorProps> = ({ nodes, connections, onChange, readonly }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null });
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [appearIds, setAppearIds] = useState<Set<string>>(new Set());

  const dragRef = useRef<DragState>({ isDragging: false, nodeId: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0 });
  const connectingRef = useRef<ConnectingState>({ isConnecting: false, fromId: null, mouseX: 0, mouseY: 0 });
  const [, forceTick] = useState(0);

  const velocitiesRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    for (const n of nodes) {
      if (!nodePositionsRef.current.has(n.id)) {
        nodePositionsRef.current.set(n.id, { x: n.x, y: n.y });
        velocitiesRef.current.set(n.id, { vx: 0, vy: 0 });
      } else {
        const pos = nodePositionsRef.current.get(n.id)!;
        pos.x = n.x;
        pos.y = n.y;
      }
    }
    for (const id of Array.from(nodePositionsRef.current.keys())) {
      if (!nodes.find(n => n.id === id)) {
        nodePositionsRef.current.delete(id);
        velocitiesRef.current.delete(id);
      }
    }
  }, [nodes]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const visibleNodes = useMemo(() => {
    const hidden = new Set<string>();
    for (const n of nodes) {
      if (n.collapsed) {
        const descs = collectDescendants(n.id, nodeMap);
        descs.delete(n.id);
        for (const d of descs) hidden.add(d);
      }
    }
    return nodes.filter(n => !hidden.has(n.id));
  }, [nodes, nodeMap]);

  const visibleConnections = useMemo(() => {
    const hidden = new Set<string>();
    for (const n of nodes) {
      if (n.collapsed) {
        const descs = collectDescendants(n.id, nodeMap);
        for (const d of descs) hidden.add(d);
      }
    }
    return connections.filter(c => !hidden.has(c.toId));
  }, [connections, nodes, nodeMap]);

  const maxDepth = useMemo(() => {
    let d = 0;
    for (const n of nodes) {
      d = Math.max(d, getNodeLevel(n.id, nodeMap));
    }
    return d;
  }, [nodes, nodeMap]);

  const applySpringAvoidance = useCallback((draggedId: string, targetX: number, targetY: number) => {
    const positions = nodePositionsRef.current;
    const velocities = velocitiesRef.current;
    const dragged = positions.get(draggedId);
    if (!dragged) return;
    dragged.x = targetX;
    dragged.y = targetY;

    const visibleMap = new Map(visibleNodes.map(n => [n.id, n]));

    for (let iter = 0; iter < 6; iter++) {
      for (const node of visibleNodes) {
        if (node.id === draggedId) continue;
        const pos = positions.get(node.id);
        if (!pos) continue;
        let fx = 0, fy = 0;
        for (const other of visibleNodes) {
          if (other.id === node.id) continue;
          const otherPos = positions.get(other.id);
          if (!otherPos) continue;
          const dx = pos.x - otherPos.x;
          const dy = pos.y - otherPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < MIN_DISTANCE) {
            const force = (MIN_DISTANCE - dist) * SPRING_STIFFNESS;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }
        const vel = velocities.get(node.id) || { vx: 0, vy: 0 };
        vel.vx = (vel.vx + fx) * DAMPING;
        vel.vy = (vel.vy + fy) * DAMPING;
        velocities.set(node.id, vel);
        pos.x += vel.vx;
        pos.y += vel.vy;
      }
    }

    const newNodes = nodes.map(n => {
      const pos = positions.get(n.id);
      if (pos && n.id !== draggedId && visibleMap.has(n.id)) {
        return { ...n, x: pos.x, y: pos.y };
      }
      if (n.id === draggedId) {
        return { ...n, x: targetX, y: targetY };
      }
      return n;
    });
    onChange(newNodes, connections);
  }, [visibleNodes, nodes, connections, onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isDragging && dragRef.current.nodeId) {
        const vp = viewportRef.current;
        const dx = (e.clientX - dragRef.current.startX) / vp.scale;
        const dy = (e.clientY - dragRef.current.startY) / vp.scale;
        const targetX = dragRef.current.nodeStartX + dx;
        const targetY = dragRef.current.nodeStartY + dy;
        applySpringAvoidance(dragRef.current.nodeId, targetX, targetY);
      }
      if (connectingRef.current.isConnecting) {
        const vp = viewportRef.current;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          connectingRef.current.mouseX = (e.clientX - rect.left - vp.x) / vp.scale;
          connectingRef.current.mouseY = (e.clientY - rect.top - vp.y) / vp.scale;
          forceTick(t => t + 1);
        }
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (connectingRef.current.isConnecting && connectingRef.current.fromId) {
        const fromId = connectingRef.current.fromId;
        const fromNode = nodes.find(n => n.id === fromId);
        if (fromNode) {
          const vp = viewportRef.current;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const mx = (e.clientX - rect.left - vp.x) / vp.scale;
            const my = (e.clientY - rect.top - vp.y) / vp.scale;
            const newId = uuidv4();
            const level = getNodeLevel(fromId, nodeMap) + 1;
            const size = measureText('新节点');
            const newNode: MindNode = {
              id: newId,
              text: '新节点',
              x: mx,
              y: my,
              parentId: fromId,
              color: getLevelColor(level),
              collapsed: false,
              width: size.width,
              height: size.height
            };
            const newConn: Connection = {
              id: uuidv4(),
              fromId,
              toId: newId
            };
            nodePositionsRef.current.set(newId, { x: mx, y: my });
            velocitiesRef.current.set(newId, { vx: 0, vy: 0 });
            setAppearIds(prev => new Set(prev).add(newId));
            setTimeout(() => setAppearIds(prev => { const n = new Set(prev); n.delete(newId); return n; }), 400);
            onChange([...nodes, newNode], [...connections, newConn]);
          }
        }
      }
      dragRef.current.isDragging = false;
      dragRef.current.nodeId = null;
      connectingRef.current.isConnecting = false;
      connectingRef.current.fromId = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [nodes, connections, applySpringAvoidance, onChange, nodeMap]);

  const screenToWorld = (sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale
    };
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (readonly) return;
    if ((e.target as HTMLElement).dataset.nodeid) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const size = measureText('新主题');
    const newNode: MindNode = {
      id: uuidv4(),
      text: '新主题',
      x: world.x,
      y: world.y,
      parentId: null,
      color: '#4A90D9',
      collapsed: false,
      width: size.width,
      height: size.height
    };
    nodePositionsRef.current.set(newNode.id, { x: world.x, y: world.y });
    velocitiesRef.current.set(newNode.id, { vx: 0, vy: 0 });
    setAppearIds(prev => new Set(prev).add(newNode.id));
    setTimeout(() => setAppearIds(prev => { const n = new Set(prev); n.delete(newNode.id); return n; }), 400);
    onChange([...nodes, newNode], connections);
    setSelectedId(newNode.id);
    setEditingId(newNode.id);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).dataset.nodeid) {
      setSelectedId(null);
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
      setColorPickerFor(null);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    if (editingId === nodeId) return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedId(nodeId);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setColorPickerFor(null);
    dragRef.current = {
      isDragging: true,
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y
    };
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    e.stopPropagation();
    setSelectedId(nodeId);
    setEditingId(nodeId);
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (readonly) return;
    setSelectedId(nodeId);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, nodeId });
    setColorPickerFor(null);
  };

  const handleConnectorMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    e.stopPropagation();
    e.preventDefault();
    connectingRef.current = { isConnecting: true, fromId: nodeId, mouseX: 0, mouseY: 0 };
  };

  const handleTextChange = (nodeId: string, text: string) => {
    const size = measureText(text);
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, text, width: size.width, height: size.height } : n);
    onChange(newNodes, connections);
  };

  const handleDeleteNode = (nodeId: string) => {
    const toDelete = collectDescendants(nodeId, nodeMap);
    const newNodes = nodes.filter(n => !toDelete.has(n.id));
    const newConnections = connections.filter(c => !toDelete.has(c.fromId) && !toDelete.has(c.toId));
    onChange(newNodes, newConnections);
    if (selectedId === nodeId) setSelectedId(null);
    if (editingId === nodeId) setEditingId(null);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleToggleCollapse = (nodeId: string) => {
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n);
    onChange(newNodes, connections);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleChangeColor = (nodeId: string, color: string) => {
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, color } : n);
    onChange(newNodes, connections);
    setColorPickerFor(null);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleInsertSibling = (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    const fromNode = nodes.find(n => n.id === conn.fromId);
    const toNode = nodes.find(n => n.id === conn.toId);
    if (!fromNode || !toNode) return;

    const mx = (fromNode.x + toNode.x) / 2;
    const my = (fromNode.y + toNode.y) / 2;
    const level = getNodeLevel(conn.toId, nodeMap);
    const size = measureText('同级节点');

    const newId = uuidv4();
    const newNode: MindNode = {
      id: newId,
      text: '同级节点',
      x: mx,
      y: my,
      parentId: conn.fromId,
      color: getLevelColor(level),
      collapsed: false,
      width: size.width,
      height: size.height
    };

    const newConn: Connection = {
      id: uuidv4(),
      fromId: conn.fromId,
      toId: newId
    };

    nodePositionsRef.current.set(newId, { x: mx, y: my });
    velocitiesRef.current.set(newId, { vx: 0, vy: 0 });
    setAppearIds(prev => new Set(prev).add(newId));
    setTimeout(() => setAppearIds(prev => { const n = new Set(prev); n.delete(newId); return n; }), 400);

    onChange([...nodes, newNode], [...connections, newConn]);
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#FAFBFC',
        backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        cursor: readonly ? 'default' : 'crosshair'
      }}
      onDoubleClick={handleCanvasDoubleClick}
      onClick={handleCanvasClick}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          width: 1,
          height: 1
        }}
      >
        <svg
          style={{
            position: 'absolute',
            left: -5000,
            top: -5000,
            width: 10000,
            height: 10000,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <defs>
            {visibleConnections.map((_, idx) => (
              <path
                key={`motion-${idx}`}
                id={`motion-path-${idx}`}
                d=""
                style={{ display: 'none' }}
              />
            ))}
          </defs>

          {visibleConnections.map((conn, idx) => {
            const from = nodeMap.get(conn.fromId);
            const to = nodeMap.get(conn.toId);
            if (!from || !to) return null;
            const level = getNodeLevel(conn.toId, nodeMap);
            const color = getLevelColor(level);
            const sx = from.x + (to.x >= from.x ? from.width / 2 : -from.width / 2);
            const sy = from.y;
            const ex = to.x + (from.x >= to.x ? to.width / 2 : -to.width / 2);
            const ey = to.y;
            const mx = (sx + ex) / 2;
            const midX = mx;
            const midY = (sy + ey) / 2;
            const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
            return (
              <g key={conn.id}>
                <path
                  d={d}
                  stroke={color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <circle
                  cx={sx + (ex - sx) * 0.2}
                  cy={sy + (ey - sy) * 0.15}
                  r={3}
                  fill={color}
                  style={{
                    offsetPath: `path('${d}')`,
                    offsetDistance: '0%',
                    animation: `flowDot 2.5s linear ${idx * 0.4}s infinite`,
                    offsetRotate: 'auto'
                  } as React.CSSProperties}
                />
                <circle
                  cx={sx + (ex - sx) * 0.6}
                  cy={sy + (ey - sy) * 0.55}
                  r={2.5}
                  fill={color}
                  style={{
                    offsetPath: `path('${d}')`,
                    offsetDistance: '0%',
                    animation: `flowDot 2.5s linear ${idx * 0.4 + 1.2}s infinite`,
                    offsetRotate: 'auto',
                    opacity: 0.7
                  } as React.CSSProperties}
                />
                {!readonly && (
                  <g
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={(e) => { e.stopPropagation(); handleInsertSibling(conn.id); }}
                  >
                    <circle cx={midX} cy={midY} r={14} fill="#fff" stroke={color} strokeWidth={2} />
                    <line x1={midX - 5} y1={midY} x2={midX + 5} y2={midY} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
                    <line x1={midX} y1={midY - 5} x2={midX} y2={midY + 5} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
                  </g>
                )}
              </g>
            );
          })}

          {connectingRef.current.isConnecting && connectingRef.current.fromId && (() => {
            const from = nodeMap.get(connectingRef.current.fromId);
            if (!from) return null;
            const mx = (from.x + connectingRef.current.mouseX) / 2;
            const d = `M ${from.x + from.width / 2} ${from.y} C ${mx} ${from.y}, ${mx} ${connectingRef.current.mouseY}, ${connectingRef.current.mouseX} ${connectingRef.current.mouseY}`;
            return (
              <path
                d={d}
                stroke="#4A90D9"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                fill="none"
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          })()}
        </svg>

        {visibleNodes.map(node => {
          const level = getNodeLevel(node.id, nodeMap);
          const isSelected = selectedId === node.id;
          const isEditing = editingId === node.id;
          const isAppearing = appearIds.has(node.id);
          const borderColor = node.color || getLevelColor(level);
          return (
            <div
              key={node.id}
              data-nodeid={node.id}
              className={`${isSelected ? 'node-selected' : ''} ${isAppearing ? 'node-appear' : ''}`}
              style={{
                position: 'absolute',
                left: node.x - node.width / 2,
                top: node.y - node.height / 2,
                width: node.width,
                minHeight: node.height,
                background: '#fff',
                border: `2px solid ${borderColor}`,
                borderRadius: 12,
                padding: '10px 14px',
                boxShadow: isSelected
                  ? '0 4px 20px rgba(74, 144, 217, 0.25)'
                  : '0 2px 10px rgba(0, 0, 0, 0.06)',
                cursor: readonly ? 'default' : 'grab',
                userSelect: isEditing ? 'text' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'box-shadow 0.2s ease, height 0.3s ease',
                overflow: 'hidden'
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
            >
              {!readonly && (
                <div
                  data-nodeid={node.id}
                  onMouseDown={(e) => handleConnectorMouseDown(e, node.id)}
                  style={{
                    position: 'absolute',
                    right: -8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    border: `2px solid ${borderColor}`,
                    cursor: 'crosshair',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    zIndex: 2
                  }}
                >
                  <div data-nodeid={node.id} style={{ width: 4, height: 4, borderRadius: '50%', background: borderColor }} />
                </div>
              )}

              {node.collapsed && (() => {
                const descs = collectDescendants(node.id, nodeMap);
                const count = descs.size - 1;
                if (count <= 0) return null;
                return (
                  <div
                    data-nodeid={node.id}
                    style={{
                      position: 'absolute',
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      minWidth: 22,
                      height: 22,
                      padding: '0 6px',
                      borderRadius: 11,
                      background: borderColor,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +{count}
                  </div>
                );
              })()}

              {isEditing ? (
                <textarea
                  autoFocus
                  defaultValue={node.text}
                  onBlur={(e) => {
                    handleTextChange(node.id, e.target.value);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: node.height - 20,
                    resize: 'none',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1F2937',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <div
                  data-nodeid={node.id}
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1F2937',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {node.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span>节点数: <strong style={{ color: '#1F2937' }}>{nodes.length}</strong></span>
        </div>
        <div style={{ width: 1, height: 14, background: '#E5E7EB' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B59B6" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
          <span>层级深度: <strong style={{ color: '#1F2937' }}>{maxDepth}</strong></span>
        </div>
      </div>

      {contextMenu.visible && contextMenu.nodeId && !readonly && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: 6,
            minWidth: 160,
            zIndex: 1000
          }}
        >
          <ContextMenuItem
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /></svg>}
            label="删除节点"
            color="#E74C3C"
            onClick={() => handleDeleteNode(contextMenu.nodeId!)}
          />
          <ContextMenuItem
            icon={
              nodes.find(n => n.id === contextMenu.nodeId)?.collapsed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
              )
            }
            label={nodes.find(n => n.id === contextMenu.nodeId)?.collapsed ? '展开子分支' : '折叠子分支'}
            onClick={() => handleToggleCollapse(contextMenu.nodeId!)}
          />
          <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '6px 10px' }}
          >
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>修改颜色</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {THEME_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => handleChangeColor(contextMenu.nodeId!, color)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: color,
                    cursor: 'pointer',
                    border: nodes.find(n => n.id === contextMenu.nodeId)?.color === color ? '2px solid #1F2937' : '2px solid transparent',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ icon, label, onClick, color }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13,
      color: color || '#374151',
      fontWeight: 500,
      transition: 'background 0.15s ease'
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}
    <span>{label}</span>
  </div>
);

export default Editor;
