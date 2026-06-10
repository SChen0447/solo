import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MindMapNode, MindMapStore, Connection } from '../utils/store';

interface MapCanvasProps {
  store: MindMapStore;
  selectedNode: MindMapNode | null;
  onSelectNode: (node: MindMapNode | null) => void;
}

interface PanState {
  isPanning: boolean;
  startX: number;
  startY: number;
  offsetStartX: number;
  offsetStartY: number;
}

interface DragState {
  isDragging: boolean;
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  isConnecting: boolean;
  fromNodeId: string;
  mouseX: number;
  mouseY: number;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ store, selectedNode, onSelectNode }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<PanState>({
    isPanning: false,
    startX: 0,
    startY: 0,
    offsetStartX: 0,
    offsetStartY: 0
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: '',
    offsetX: 0,
    offsetY: 0
  });
  const [connectState, setConnectState] = useState<ConnectState>({
    isConnecting: false,
    fromNodeId: '',
    mouseX: 0,
    mouseY: 0
  });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [animatingConnections, setAnimatingConnections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newConnections = store.state.connections;
    newConnections.forEach(c => {
      if (!animatingConnections.has(c.id)) {
        setAnimatingConnections(prev => new Set([...prev, c.id]));
        setTimeout(() => {
          setAnimatingConnections(prev => {
            const next = new Set(prev);
            next.delete(c.id);
            return next;
          });
        }, 300);
      }
    });
  }, [store.state.connections]);

  const canvasToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale
    };
  }, [offset, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => {
      const next = Math.min(3, Math.max(0.5, prev + delta));
      return Math.round(next * 10) / 10;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.mindmap-node')) return;
    if ((e.target as HTMLElement).closest('.connection-point')) return;

    setPanState({
      isPanning: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetStartX: offset.x,
      offsetStartY: offset.y
    });
    onSelectNode(null);
  }, [offset, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panState.isPanning) {
      setOffset({
        x: panState.offsetStartX + (e.clientX - panState.startX),
        y: panState.offsetStartY + (e.clientY - panState.startY)
      });
    }

    if (dragState.isDragging) {
      const worldPos = canvasToWorld(e.clientX, e.clientY);
      const node = store.state.nodes.find(n => n.id === dragState.nodeId);
      if (node) {
        store.updateNode({
          ...node,
          x: worldPos.x - dragState.offsetX,
          y: worldPos.y - dragState.offsetY
        });
      }
    }

    if (connectState.isConnecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectState(prev => ({
          ...prev,
          mouseX: (e.clientX - rect.left - offset.x) / scale,
          mouseY: (e.clientY - rect.top - offset.y) / scale
        }));
      }
    }
  }, [panState, dragState, connectState, canvasToWorld, store, offset, scale]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (connectState.isConnecting) {
      const worldPos = canvasToWorld(e.clientX, e.clientY);
      const targetNode = store.state.nodes.find(n => {
        return (
          worldPos.x >= n.x &&
          worldPos.x <= n.x + n.width &&
          worldPos.y >= n.y &&
          worldPos.y <= n.y + n.height
        );
      });
      if (targetNode && targetNode.id !== connectState.fromNodeId) {
        const connection = store.createConnection(connectState.fromNodeId, targetNode.id);
        store.addConnection(connection);
      }
      setConnectState({ isConnecting: false, fromNodeId: '', mouseX: 0, mouseY: 0 });
    }

    setPanState({ isPanning: false, startX: 0, startY: 0, offsetStartX: 0, offsetStartY: 0 });
    setDragState({ isDragging: false, nodeId: '', offsetX: 0, offsetY: 0 });
  }, [connectState, canvasToWorld, store]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mindmap-node')) return;
    const worldPos = canvasToWorld(e.clientX, e.clientY);
    const node = store.createNode(worldPos.x - 60, worldPos.y - 25);
    store.addNode(node);
  }, [canvasToWorld, store]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    const worldPos = canvasToWorld(e.clientX, e.clientY);
    setDragState({
      isDragging: true,
      nodeId: node.id,
      offsetX: worldPos.x - node.x,
      offsetY: worldPos.y - node.y
    });
    onSelectNode(node);
  }, [canvasToWorld, onSelectNode]);

  const handleConnectionStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setConnectState({
      isConnecting: true,
      fromNodeId: nodeId,
      mouseX: (e.clientX - rect.left - offset.x) / scale,
      mouseY: (e.clientY - rect.top - offset.y) / scale
    });
  }, [offset, scale]);

  const getConnectionPath = useCallback((fromNode: MindMapNode, toNode: MindMapNode): string => {
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromBottomY = fromNode.y + fromNode.height;
    const toCenterX = toNode.x + toNode.width / 2;
    const toTopY = toNode.y;

    const startX = fromCenterX;
    const startY = fromBottomY;
    const endX = toCenterX;
    const endY = toTopY;

    const midY = (startY + endY) / 2;
    const controlY1 = startY + (midY - startY) * 0.7;
    const controlY2 = endY - (endY - midY) * 0.7;

    const dx = endX - startX;
    const controlX1 = startX + dx * 0.3;
    const controlX2 = startX + dx * 0.7;

    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  }, []);

  const getArrowPath = useCallback((endX: number, endY: number, prevX: number, prevY: number): string => {
    const angle = Math.atan2(endY - prevY, endX - prevX);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    const x1 = endX - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = endY - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = endX - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = endY - arrowLength * Math.sin(angle + arrowAngle);

    return `M ${endX} ${endY} L ${x1} ${y1} M ${endX} ${endY} L ${x2} ${y2}`;
  }, []);

  const getPointOnCurve = useCallback((fromNode: MindMapNode, toNode: MindMapNode, t: number): { x: number; y: number } => {
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromBottomY = fromNode.y + fromNode.height;
    const toCenterX = toNode.x + toNode.width / 2;
    const toTopY = toNode.y;

    const startX = fromCenterX;
    const startY = fromBottomY;
    const endX = toCenterX;
    const endY = toTopY;

    const midY = (startY + endY) / 2;
    const controlY1 = startY + (midY - startY) * 0.7;
    const controlY2 = endY - (endY - midY) * 0.7;

    const dx = endX - startX;
    const controlX1 = startX + dx * 0.3;
    const controlX2 = startX + dx * 0.7;

    const x = Math.pow(1 - t, 3) * startX + 3 * Math.pow(1 - t, 2) * t * controlX1 + 3 * (1 - t) * t * t * controlX2 + Math.pow(t, 3) * endX;
    const y = Math.pow(1 - t, 3) * startY + 3 * Math.pow(1 - t, 2) * t * controlY1 + 3 * (1 - t) * t * t * controlY2 + Math.pow(t, 3) * endY;

    return { x, y };
  }, []);

  const connectionsWithNodes = useMemo(() => {
    return store.state.connections.map(conn => {
      const fromNode = store.state.nodes.find(n => n.id === conn.from);
      const toNode = store.state.nodes.find(n => n.id === conn.to);
      return { connection: conn, fromNode, toNode };
    }).filter(c => c.fromNode && c.toNode);
  }, [store.state.connections, store.state.nodes]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: panState.isPanning ? 'grabbing' : dragState.isDragging ? 'grabbing' : 'grab',
    overflow: 'hidden',
    background: '#ecf0f1'
  };

  const worldStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    width: '5000px',
    height: '5000px'
  };

  const scaleIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'rgba(44, 62, 80, 0.9)',
    color: '#ecf0f1',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    zIndex: 100,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease'
  };

  const fontSize = Math.max(12, Math.round(14 * scale));

  return (
    <div
      ref={canvasRef}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <div style={worldStyle}>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
            </marker>
          </defs>
          {connectionsWithNodes.map(({ connection, fromNode, toNode }) => {
            if (!fromNode || !toNode) return null;
            const path = getConnectionPath(fromNode, toNode);
            const isAnimating = animatingConnections.has(connection.id);
            const prevPoint = getPointOnCurve(fromNode, toNode, 0.9);
            const endPoint = getPointOnCurve(fromNode, toNode, 1);
            const arrowPath = getArrowPath(endPoint.x, endPoint.y, prevPoint.x, prevPoint.y);

            return (
              <g key={connection.id} style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.3s ease' }}>
                <path
                  d={path}
                  fill="none"
                  stroke="#555"
                  strokeWidth={2}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    store.deleteConnection(connection.id);
                  }}
                />
                <path
                  d={arrowPath}
                  fill="none"
                  stroke="#555"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {connectState.isConnecting && (() => {
            const fromNode = store.state.nodes.find(n => n.id === connectState.fromNodeId);
            if (!fromNode) return null;
            const fromCenterX = fromNode.x + fromNode.width / 2;
            const fromBottomY = fromNode.y + fromNode.height;
            const midY = (fromBottomY + connectState.mouseY) / 2;
            return (
              <path
                d={`M ${fromCenterX} ${fromBottomY} Q ${fromCenterX} ${midY}, ${connectState.mouseX} ${connectState.mouseY}`}
                fill="none"
                stroke="#3498db"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })()}
        </svg>

        {store.state.nodes.map(node => {
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNodeId === node.id;

          const nodeStyle: React.CSSProperties = {
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
            background: node.color,
            border: isSelected ? '2px solid #2980b9' : '1px solid #ddd',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: dragState.isDragging && dragState.nodeId === node.id ? 'grabbing' : 'grab',
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: isSelected ? '0 4px 12px rgba(41, 128, 185, 0.3)' : isHovered ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            fontSize: fontSize,
            color: '#2d3436',
            fontWeight: 500,
            padding: '4px 8px',
            textAlign: 'center',
            wordBreak: 'break-word',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            zIndex: isSelected ? 10 : 1
          };

          const topConnectorStyle: React.CSSProperties = {
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isHovered ? '#3498db' : '#888',
            cursor: 'crosshair',
            transition: 'background 0.2s ease, transform 0.2s ease',
            zIndex: 20
          };

          const bottomConnectorStyle: React.CSSProperties = {
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isHovered ? '#3498db' : '#888',
            cursor: 'crosshair',
            transition: 'background 0.2s ease, transform 0.2s ease',
            zIndex: 20
          };

          return (
            <div
              key={node.id}
              className="mindmap-node"
              style={nodeStyle}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {node.title}
              <div
                className="connection-point"
                style={topConnectorStyle}
                onMouseDown={(e) => handleConnectionStart(e, node.id)}
              />
              <div
                className="connection-point"
                style={bottomConnectorStyle}
                onMouseDown={(e) => handleConnectionStart(e, node.id)}
              />
            </div>
          );
        })}
      </div>

      <div style={scaleIndicatorStyle}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default MapCanvas;
