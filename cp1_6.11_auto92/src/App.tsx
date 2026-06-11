import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import { KnowledgeNode, KnowledgeEdge, CursorData, PRESET_RELATIONS } from './types';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [cursors, setCursors] = useState<CursorData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [projectName, setProjectName] = useState('Knowledge Galaxy');
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newNodeAnimations, setNewNodeAnimations] = useState<Set<string>>(new Set());
  const [edgeLabelModal, setEdgeLabelModal] = useState<{ edgeId: string; sourceId: string; targetId: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');
  const userColorRef = useRef<string>('');
  const cursorThrottleRef = useRef<number>(0);
  const targetPanRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:3001', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('init', (data: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; userId: string; userName: string; userColor: string }) => {
      setNodes(data.nodes);
      setEdges(data.edges);
      userIdRef.current = data.userId;
      userNameRef.current = data.userName;
      userColorRef.current = data.userColor;
    });

    socket.on('node-created', (node: KnowledgeNode) => {
      setNodes((prev) => {
        if (prev.find((n) => n.id === node.id)) return prev;
        return [...prev, node];
      });
    });

    socket.on('node-updated', (node: KnowledgeNode) => {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, ...node } : n)));
    });

    socket.on('node-moved', (data: { id: string; x: number; y: number }) => {
      setNodes((prev) => prev.map((n) => (n.id === data.id ? { ...n, x: data.x, y: data.y } : n)));
    });

    socket.on('node-deleted', (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    });

    socket.on('edge-created', (edge: KnowledgeEdge) => {
      setEdges((prev) => {
        if (prev.find((e) => e.id === edge.id)) return prev;
        return [...prev, edge];
      });
    });

    socket.on('edge-updated', (edge: KnowledgeEdge) => {
      setEdges((prev) => prev.map((e) => (e.id === edge.id ? { ...e, ...edge } : e)));
    });

    socket.on('edge-deleted', (id: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== id));
    });

    socket.on('cursor-update', (cursor: CursorData) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== cursor.userId);
        return [...filtered, cursor];
      });
    });

    socket.on('cursor-remove', (uid: string) => {
      setCursors((prev) => prev.filter((c) => c.userId !== uid));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!targetPanRef.current) return;
    const target = targetPanRef.current;
    const startX = panOffset.x;
    const startY = panOffset.y;
    const startTime = Date.now();
    const duration = 400;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setPanOffset({
        x: startX + (target.x - startX) * ease,
        y: startY + (target.y - startY) * ease,
      });
      if (t < 1) requestAnimationFrame(animate);
      else targetPanRef.current = null;
    };
    requestAnimationFrame(animate);
  }, [targetPanRef.current]);

  const handleNodeCreate = useCallback(
    (node: KnowledgeNode) => {
      const id = uuidv4();
      const newNode = { ...node, id };
      setNodes((prev) => [...prev, newNode]);
      setNewNodeAnimations((prev) => new Set(prev).add(id));
      socketRef.current?.emit('node-create', newNode);
      setSelectedNodeId(id);
    },
    []
  );

  const handleNodeMove = useCallback(
    (id: string, x: number, y: number) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
      socketRef.current?.emit('node-move', { id, x, y });
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (updates: Partial<KnowledgeNode>) => {
      if (!selectedNodeId) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNodeId ? { ...n, ...updates } : n))
      );
      socketRef.current?.emit('node-update', { id: selectedNodeId, ...updates });
    },
    [selectedNodeId]
  );

  const handleNodeDelete = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
      socketRef.current?.emit('node-delete', id);
      setSelectedNodeId(null);
    },
    []
  );

  const handleEdgeCreate = useCallback(
    (edge: KnowledgeEdge) => {
      const id = uuidv4();
      const newEdge = { ...edge, id };
      setEdges((prev) => [...prev, newEdge]);
      socketRef.current?.emit('edge-create', newEdge);
      setEdgeLabelModal({ edgeId: id, sourceId: edge.source, targetId: edge.target });
    },
    []
  );

  const handleEdgeLabelSelect = useCallback(
    (label: string) => {
      if (!edgeLabelModal) return;
      setEdges((prev) =>
        prev.map((e) => (e.id === edgeLabelModal.edgeId ? { ...e, label } : e))
      );
      socketRef.current?.emit('edge-update', { id: edgeLabelModal.edgeId, label });
      setEdgeLabelModal(null);
    },
    [edgeLabelModal]
  );

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;
      socketRef.current?.emit('cursor-move', { x, y });
    },
    []
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setHighlightedNodeIds(new Set());
        return;
      }
      const q = query.toLowerCase();
      const matched = new Set<string>();
      nodes.forEach((n) => {
        if (n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)) {
          matched.add(n.id);
        }
      });
      setHighlightedNodeIds(matched);

      if (matched.size > 0) {
        const firstId = matched.values().next().value;
        const firstNode = nodes.find((n) => n.id === firstId);
        if (firstNode) {
          const container = document.querySelector('.canvas-container') as HTMLElement;
          const w = container?.clientWidth || window.innerWidth;
          const h = container?.clientHeight || window.innerHeight;
          targetPanRef.current = {
            x: w / 2 - firstNode.x * zoom,
            y: h / 2 - firstNode.y * zoom,
          };
        }
      }
    },
    [nodes, zoom]
  );

  const handleZoomChange = useCallback(
    (newZoom: number) => {
      const container = document.querySelector('.canvas-container') as HTMLElement;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const centerX = w / 2;
      const centerY = h / 2;
      const canvasX = (centerX - panOffset.x) / zoom;
      const canvasY = (centerY - panOffset.y) / zoom;
      const newPanX = centerX - canvasX * newZoom;
      const newPanY = centerY - canvasY * newZoom;
      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    },
    [zoom, panOffset]
  );

  const handleWheelZoom = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
      const container = document.querySelector('.canvas-container') as HTMLElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasX = (mouseX - panOffset.x) / zoom;
      const canvasY = (mouseY - panOffset.y) / zoom;
      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;
      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    },
    [zoom, panOffset]
  );

  useEffect(() => {
    const container = document.querySelector('.canvas-container');
    if (container) {
      container.addEventListener('wheel', handleWheelZoom, { passive: false });
      return () => container.removeEventListener('wheel', handleWheelZoom);
    }
  }, [handleWheelZoom]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d1b2a' }}>
      <div
        style={{
          height: 50,
          background: '#1b2838',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 16,
          borderBottom: '1px solid #2a3b4c',
          zIndex: 200,
          position: 'relative',
        }}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            style={{
              background: 'rgba(13, 27, 42, 0.8)',
              border: '1px solid #5db8e8',
              borderRadius: 4,
              color: '#e8f0f8',
              fontSize: 14,
              fontWeight: 600,
              padding: '4px 8px',
              outline: 'none',
              width: 200,
            }}
          />
        ) : (
          <span
            onClick={() => setIsEditingName(true)}
            style={{
              color: '#e8f0f8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              padding: '4px 8px',
              borderRadius: 4,
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(42, 59, 76, 0.5)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {projectName}
          </span>
        )}

        <div style={{ width: 1, height: 24, background: '#2a3b4c' }} />

        <button
          onClick={handleFullscreen}
          style={{
            background: 'rgba(42, 59, 76, 0.5)',
            border: '1px solid #2a3b4c',
            borderRadius: 6,
            color: '#8899aa',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 16,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#e8f0f8')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#8899aa')}
        >
          ⛶
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#8899aa', fontSize: 11, whiteSpace: 'nowrap' }}>{Math.round(zoom * 100)}%</span>
          <input
            type="range"
            min={30}
            max={300}
            value={zoom * 100}
            onChange={(e) => handleZoomChange(Number(e.target.value) / 100)}
            style={{
              width: 120,
              accentColor: '#5db8e8',
              cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search nodes..."
            style={{
              width: 200,
              padding: '6px 12px 6px 30px',
              background: 'rgba(13, 27, 42, 0.6)',
              border: '1px solid #2a3b4c',
              borderRadius: 6,
              color: '#e8f0f8',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#5db8e8')}
            onBlur={(e) => (e.target.style.borderColor = '#2a3b4c')}
          />
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8899aa',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>

        <span style={{ color: '#5a6b7c', fontSize: 11, whiteSpace: 'nowrap' }}>
          Shift+Drag to connect
        </span>
      </div>

      <Canvas
        nodes={nodes}
        edges={edges}
        cursors={cursors}
        zoom={zoom}
        selectedNodeId={selectedNodeId}
        highlightedNodeIds={highlightedNodeIds}
        onNodeCreate={handleNodeCreate}
        onNodeMove={handleNodeMove}
        onNodeSelect={setSelectedNodeId}
        onEdgeCreate={handleEdgeCreate}
        onCursorMove={handleCursorMove}
        panOffset={panOffset}
        onPanChange={setPanOffset}
        newNodeAnimations={newNodeAnimations}
      />

      <EditPanel
        node={selectedNode}
        isOpen={!!selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
        onUpdate={handleNodeUpdate}
        onDelete={handleNodeDelete}
      />

      {edgeLabelModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
          }}
          onClick={() => setEdgeLabelModal(null)}
        >
          <div
            style={{
              background: '#1b2838',
              borderRadius: 10,
              padding: 24,
              minWidth: 260,
              border: '1px solid #2a3b4c',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 16px', color: '#e8f0f8', fontSize: 15 }}>Select Relationship</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PRESET_RELATIONS.map((rel) => (
                <button
                  key={rel}
                  onClick={() => handleEdgeLabelSelect(rel)}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(42, 59, 76, 0.5)',
                    border: '1px solid #2a3b4c',
                    borderRadius: 6,
                    color: '#c8d8e8',
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(93, 184, 232, 0.2)';
                    e.currentTarget.style.borderColor = '#5db8e8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(42, 59, 76, 0.5)';
                    e.currentTarget.style.borderColor = '#2a3b4c';
                  }}
                >
                  {rel}
                </button>
              ))}
              <button
                onClick={() => setEdgeLabelModal(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  color: '#8899aa',
                  cursor: 'pointer',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
