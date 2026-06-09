import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, DiagramNode, DiagramEdge, RemoteUser } from './components/Canvas';
import { PropertyPanel } from './components/PropertyPanel';
import { WebSocketClient, WSMessage, UserInfo, InitPayload } from './utils/websocket';
import { HistoryStack } from './utils/history';

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#2D2D3F',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 320,
          color: '#fff',
          fontFamily: 'Inter',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#ccc', marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              background: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: 500,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              background: '#FF6B6B',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: 500,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            确定清空
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef(new HistoryStack<DiagramState>(20));
  const wsRef = useRef<WebSocketClient | null>(null);
  const remoteUpdateRef = useRef(false);
  const cursorTimerRef = useRef<any>(null);

  const pushHistory = useCallback(() => {
    if (remoteUpdateRef.current) return;
    historyRef.current.push({ nodes, edges });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, [nodes, edges]);

  const applyState = useCallback((state: DiagramState) => {
    setNodes(state.nodes);
    setEdges(state.edges);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo({ nodes, edges });
    if (prev) {
      remoteUpdateRef.current = true;
      applyState(prev);
      if (wsRef.current) {
        wsRef.current.send('clear', null);
        prev.nodes.forEach(n => wsRef.current!.send('node-add', n));
        prev.edges.forEach(e => wsRef.current!.send('edge-add', e));
      }
      setTimeout(() => (remoteUpdateRef.current = false), 0);
    }
  }, [nodes, edges, applyState]);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo({ nodes, edges });
    if (next) {
      remoteUpdateRef.current = true;
      applyState(next);
      if (wsRef.current) {
        wsRef.current.send('clear', null);
        next.nodes.forEach(n => wsRef.current!.send('node-add', n));
        next.edges.forEach(e => wsRef.current!.send('edge-add', e));
      }
      setTimeout(() => (remoteUpdateRef.current = false), 0);
    }
  }, [nodes, edges, applyState]);

  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:4000');
    wsRef.current = ws;

    const unsub = ws.onMessage((msg: WSMessage) => {
      switch (msg.type) {
        case 'init': {
          const payload = msg.payload as InitPayload;
          remoteUpdateRef.current = true;
          setNodes(payload.diagram.nodes || []);
          setEdges(payload.diagram.edges || []);
          setCurrentUser({ id: payload.clientId, name: payload.name, color: payload.color });
          setRemoteUsers(payload.users.filter(u => u.id !== payload.clientId).map(u => ({ ...u })));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'node-add': {
          remoteUpdateRef.current = true;
          setNodes(ns => (ns.find(n => n.id === msg.payload.id) ? ns : [...ns, msg.payload]));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'node-update': {
          remoteUpdateRef.current = true;
          setNodes(ns => ns.map(n => (n.id === msg.payload.id ? { ...n, ...msg.payload } : n)));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'node-delete': {
          remoteUpdateRef.current = true;
          setNodes(ns => ns.filter(n => n.id !== msg.payload.id));
          setEdges(es => es.filter(e => e.sourceId !== msg.payload.id && e.targetId !== msg.payload.id));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'edge-add': {
          remoteUpdateRef.current = true;
          setEdges(es => (es.find(e => e.id === msg.payload.id) ? es : [...es, msg.payload]));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'edge-update': {
          remoteUpdateRef.current = true;
          setEdges(es => es.map(e => (e.id === msg.payload.id ? { ...e, ...msg.payload } : e)));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'edge-delete': {
          remoteUpdateRef.current = true;
          setEdges(es => es.filter(e => e.id !== msg.payload.id));
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'clear': {
          remoteUpdateRef.current = true;
          setNodes([]);
          setEdges([]);
          setTimeout(() => (remoteUpdateRef.current = false), 0);
          break;
        }
        case 'cursor': {
          if (!msg.clientId || msg.clientId === currentUser?.id) break;
          setRemoteUsers(us => {
            const exists = us.find(u => u.id === msg.clientId);
            if (exists) {
              return us.map(u => (u.id === msg.clientId ? { ...u, x: msg.payload.x, y: msg.payload.y } : u));
            }
            return us;
          });
          break;
        }
        case 'user-join': {
          const u = msg.payload as UserInfo;
          setRemoteUsers(us => (us.find(x => x.id === u.id) ? us : [...us, { ...u }]));
          break;
        }
        case 'user-leave': {
          setRemoteUsers(us => us.filter(u => u.id !== msg.payload.id));
          break;
        }
      }
    });

    ws.connect();

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      unsub();
      ws.disconnect();
    };
  }, [applyState, handleUndo, handleRedo, currentUser?.id]);

  const nodeAdd = (node: DiagramNode) => {
    pushHistory();
    setNodes(ns => [...ns, node]);
    wsRef.current?.send('node-add', node);
  };

  const nodeUpdate = (patch: Partial<DiagramNode> & { id: string }) => {
    const existing = nodes.find(n => n.id === patch.id);
    const isSame = existing && Object.keys(patch).every(k => (existing as any)[k] === (patch as any)[k]);
    if (isSame) return;

    const changedKeys = Object.keys(patch).filter(k => k !== 'id');
    const structuralChange = changedKeys.some(k => !['x', 'y'].includes(k));
    if (structuralChange) pushHistory();

    setNodes(ns => ns.map(n => (n.id === patch.id ? { ...n, ...patch } : n)));
    wsRef.current?.send('node-update', patch);
  };

  const nodeDelete = (id: string) => {
    pushHistory();
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.sourceId !== id && e.targetId !== id));
    wsRef.current?.send('node-delete', { id });
  };

  const edgeAdd = (edge: DiagramEdge) => {
    pushHistory();
    setEdges(es => [...es, edge]);
    wsRef.current?.send('edge-add', edge);
  };

  const edgeUpdate = (patch: Partial<DiagramEdge> & { id: string }) => {
    pushHistory();
    setEdges(es => es.map(e => (e.id === patch.id ? { ...e, ...patch } : e)));
    wsRef.current?.send('edge-update', patch);
  };

  const edgeDelete = (id: string) => {
    pushHistory();
    setEdges(es => es.filter(e => e.id !== id));
    wsRef.current?.send('edge-delete', { id });
  };

  const handleCursorMove = (x: number, y: number) => {
    if (cursorTimerRef.current) return;
    cursorTimerRef.current = setTimeout(() => {
      cursorTimerRef.current = null;
      wsRef.current?.send('cursor', { x, y });
    }, 50);
  };

  const handleClear = () => {
    pushHistory();
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    wsRef.current?.send('clear', null);
    setShowClearDialog(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedId) || null;
  const selectedEdge = edges.find(e => e.id === selectedId) || null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#1E1E2E' }}>
      <div
        style={{
          height: 48,
          background: '#2D2D3F',
          borderBottom: '1px solid #ffffff10',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: 'Inter' }}>
            ⚡ Flow Editor
          </h1>
          {currentUser && (
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
                background: currentUser.color + '30',
                color: currentUser.color,
                fontFamily: 'Inter',
                fontWeight: 500,
                border: `1px solid ${currentUser.color}50`,
              }}
            >
              {currentUser.name}
            </span>
          )}
          {remoteUsers.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
              {remoteUsers.slice(0, 5).map(u => (
                <span
                  key={u.id}
                  title={u.name}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: u.color,
                    border: '2px solid #2D2D3F',
                    display: 'inline-block',
                  }}
                />
              ))}
              {remoteUsers.length > 5 && (
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'Inter' }}>+{remoteUsers.length - 5}</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: canUndo ? '#fff' : '#555',
              border: '1px solid #ffffff20',
              borderRadius: 6,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter',
              fontSize: 12,
              opacity: canUndo ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => canUndo && (e.currentTarget.style.opacity = '0.7')}
            onMouseOut={e => canUndo && (e.currentTarget.style.opacity = '1')}
          >
            ↶ 撤销
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: canRedo ? '#fff' : '#555',
              border: '1px solid #ffffff20',
              borderRadius: 6,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter',
              fontSize: 12,
              opacity: canRedo ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => canRedo && (e.currentTarget.style.opacity = '0.7')}
            onMouseOut={e => canRedo && (e.currentTarget.style.opacity = '1')}
          >
            ↷ 重做
          </button>
          <button
            onClick={() => setShowClearDialog(true)}
            style={{
              padding: '6px 12px',
              background: '#FF6B6B20',
              color: '#FF6B6B',
              border: '1px solid #FF6B6B50',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: 500,
              transition: 'opacity 0.2s',
              marginLeft: 8,
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            🗑 清空画布
          </button>
          <button
            onClick={() => navigate('/exit')}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: '#888',
              border: '1px solid #ffffff15',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 12,
              transition: 'all 0.2s',
              marginLeft: 8,
            }}
            onMouseOver={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#ffffff30';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.borderColor = '#ffffff15';
            }}
          >
            退出
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, paddingLeft: 20, display: 'flex', minWidth: 0 }}>
          <Canvas
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            remoteUsers={remoteUsers}
            onSelect={setSelectedId}
            onNodeAdd={nodeAdd}
            onNodeUpdate={nodeUpdate}
            onNodeDelete={nodeDelete}
            onEdgeAdd={edgeAdd}
            onEdgeUpdate={edgeUpdate}
            onEdgeDelete={edgeDelete}
            onCursorMove={handleCursorMove}
          />
        </div>
        <PropertyPanel
          node={selectedNode}
          edge={selectedEdge}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(c => !c)}
          onNodeUpdate={nodeUpdate}
          onEdgeUpdate={edgeUpdate}
        />
      </div>

      <ConfirmDialog
        open={showClearDialog}
        title="确认清空画布"
        message="这将删除所有节点和连线，且可以通过撤销恢复。确定要清空吗？"
        onConfirm={handleClear}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
};

export default App;
