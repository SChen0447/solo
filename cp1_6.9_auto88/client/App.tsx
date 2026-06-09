import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import html2canvas from 'html2canvas';
import MindMapCanvas, { NodeData, User, generateId, getChildNodeSize, ROOT_NODE_SIZE } from './MindMapCanvas';

const ROOT_COLOR = '#4A90D9';
const CHILD_COLORS = [
  '#2C3E50', '#8E44AD', '#16A085', '#C0392B',
  '#D35400', '#2980B9', '#7F8C8D'
];

function getRandomChildColor(): string {
  return CHILD_COLORS[Math.floor(Math.random() * CHILD_COLORS.length)];
}

function randomUsername(): string {
  const names = ['小明', '小红', '小华', '阿强', '阿伟', '小李', '张三', '李四', '王五', '赵六'];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
}

interface HistoryState {
  index: number;
  length: number;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState<HistoryState>({ index: -1, length: 0 });
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Map<string, NodeData>>(new Map());

  useEffect(() => {
    nodesRef.current = new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);
    setCurrentUserId(newSocket.id);

    newSocket.on('connect', () => {
      setCurrentUserId(newSocket.id);
      newSocket.emit('join-room', {
        roomId: 'default-brainstorm-room',
        username: randomUsername()
      });
    });

    newSocket.on('room-state', (data: { nodes: NodeData[]; users: User[]; historyIndex: number; historyLength: number }) => {
      setNodes(data.nodes);
      setUsers(data.users);
      setHistory({ index: data.historyIndex, length: data.historyLength });
    });

    newSocket.on('user-joined', ({ user }: { user: User }) => {
      setUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    newSocket.on('user-left', ({ userId }: { userId: string }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    newSocket.on('cursor-update', ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, x, y } : u
      ));
    });

    newSocket.on('node-added', ({ node }: { node: NodeData }) => {
      setNodes(prev => {
        if (prev.find(n => n.id === node.id)) return prev;
        return [...prev, node];
      });
    });

    newSocket.on('node-moved', ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) => {
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, x, y } : n
      ));
    });

    newSocket.on('node-text-updated', ({ nodeId, text }: { nodeId: string; text: string }) => {
      setNodes(prev => prev.map(n => {
        if (n.id !== nodeId) return n;
        const size = getChildNodeSize(text);
        return { ...n, text, width: size.width, height: size.height };
      }));
    });

    newSocket.on('node-deleted', ({ nodeId }: { nodeId: string }) => {
      const idsToDelete = new Set<string>();
      const collectChildren = (parentId: string) => {
        idsToDelete.add(parentId);
        nodesRef.current.forEach(n => {
          if (n.parentId === parentId) collectChildren(n.id);
        });
      };
      collectChildren(nodeId);
      setNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
      if (selectedNodeId && idsToDelete.has(selectedNodeId)) {
        setSelectedNodeId(null);
      }
    });

    newSocket.on('history-update', ({ historyIndex, historyLength }: { historyIndex: number; historyLength: number }) => {
      setHistory({ index: historyIndex, length: historyLength });
    });

    newSocket.on('undone', ({ nodes, historyIndex, historyLength }: { nodes: NodeData[]; historyIndex: number; historyLength: number }) => {
      setNodes(nodes);
      setHistory({ index: historyIndex, length: historyLength });
    });

    newSocket.on('redone', ({ nodes, historyIndex, historyLength }: { nodes: NodeData[]; historyIndex: number; historyLength: number }) => {
      setNodes(nodes);
      setHistory({ index: historyIndex, length: historyLength });
    });

    newSocket.on('resetted', ({ nodes, historyIndex, historyLength }: { nodes: NodeData[]; historyIndex: number; historyLength: number }) => {
      setNodes(nodes);
      setHistory({ index: historyIndex, length: historyLength });
      setSelectedNodeId(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!socket) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        socket.emit('undo');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        socket.emit('redo');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [socket]);

  const handleAddNode = useCallback((node: NodeData) => {
    if (!socket) return;
    socket.emit('node-add', { node });
    setNodes(prev => [...prev, node]);
  }, [socket]);

  const handleMoveNode = useCallback((nodeId: string, x: number, y: number) => {
    if (!socket) return;
    socket.emit('node-move', { nodeId, x, y });
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
  }, [socket]);

  const handleUpdateText = useCallback((nodeId: string, text: string) => {
    if (!socket) return;
    socket.emit('node-update-text', { nodeId, text });
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const size = getChildNodeSize(text);
      return { ...n, text, width: size.width, height: size.height };
    }));
  }, [socket]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!socket) return;
    socket.emit('node-delete', { nodeId });
    const idsToDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      idsToDelete.add(parentId);
      nodesRef.current.forEach(n => {
        if (n.parentId === parentId) collectChildren(n.id);
      });
    };
    collectChildren(nodeId);
    setNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
    setSelectedNodeId(null);
  }, [socket]);

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (!socket) return;
    socket.emit('cursor-move', { x, y });
  }, [socket]);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    if (nodes.some(n => n.type === 'root')) return;
    const newNode: NodeData = {
      id: generateId(),
      parentId: null,
      text: '中心主题',
      x,
      y,
      color: ROOT_COLOR,
      type: 'root',
      width: ROOT_NODE_SIZE,
      height: ROOT_NODE_SIZE
    };
    handleAddNode(newNode);
    setSelectedNodeId(newNode.id);
  }, [nodes, handleAddNode]);

  const handleTabFromNode = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const isRight = Math.random() > 0.5;
    const size = getChildNodeSize('新节点');
    const offsetX = parent.type === 'root'
      ? (isRight ? ROOT_NODE_SIZE / 2 + 100 : -ROOT_NODE_SIZE / 2 - 100 - size.width)
      : (isRight ? parent.width + 100 : -100 - size.width);
    const newNode: NodeData = {
      id: generateId(),
      parentId,
      text: '新节点',
      x: (parent.type === 'root' ? parent.x - ROOT_NODE_SIZE / 2 : parent.x) + (isRight ? parent.width + 100 : -100 - size.width),
      y: (parent.type === 'root' ? parent.y - ROOT_NODE_SIZE / 2 : parent.y) + Math.random() * 40 - 20,
      color: getRandomChildColor(),
      type: 'child',
      width: size.width,
      height: size.height
    };
    handleAddNode(newNode);
    setSelectedNodeId(newNode.id);
  }, [nodes, handleAddNode]);

  const handleUndo = () => {
    if (!socket) return;
    socket.emit('undo');
  };

  const handleRedo = () => {
    if (!socket) return;
    socket.emit('redo');
  };

  const handleReset = () => {
    if (!socket) return;
    if (window.confirm('确定要新建画布吗？当前所有节点将被清除。')) {
      socket.emit('reset');
    }
  };

  const handleExport = async () => {
    if (!canvasWrapperRef.current) return;
    try {
      const container = canvasWrapperRef.current;
      const canvas = await html2canvas(container, {
        backgroundColor: darkMode ? '#1E1E1E' : '#F5F5F5',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `思维导图_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const toolbarBg = darkMode ? '#2D2D2D' : '#FFFFFF';
  const toolbarBorder = darkMode ? '#3D3D3D' : '#E5E5E5';
  const toolbarText = darkMode ? '#E0E0E0' : '#333333';
  const btnBg = darkMode ? '#3D3D3D' : '#F5F5F5';
  const btnHover = darkMode ? '#4D4D4D' : '#E8E8E8';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 50,
          backgroundColor: toolbarBg,
          borderBottom: `1px solid ${toolbarBorder}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          flexShrink: 0,
          zIndex: 1000,
          boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
          <h1 style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            marginRight: 20,
            color: toolbarText
          }}>
            团队头脑风暴
          </h1>

          <button
            onClick={handleReset}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: btnBg,
              color: toolbarText,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = btnHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            新建
          </button>

          <button
            onClick={handleUndo}
            disabled={history.index < 0}
            title="Ctrl+Z"
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: history.index < 0 ? (darkMode ? '#333' : '#EDEDED') : btnBg,
              color: history.index < 0 ? (darkMode ? '#666' : '#AAA') : toolbarText,
              fontSize: 13,
              cursor: history.index < 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => { if (history.index >= 0) e.currentTarget.style.backgroundColor = btnHover; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = history.index < 0 ? (darkMode ? '#333' : '#EDEDED') : btnBg}
          >
            ↶ 撤销
          </button>

          <button
            onClick={handleRedo}
            disabled={history.index >= history.length - 1}
            title="Ctrl+Shift+Z"
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: history.index >= history.length - 1 ? (darkMode ? '#333' : '#EDEDED') : btnBg,
              color: history.index >= history.length - 1 ? (darkMode ? '#666' : '#AAA') : toolbarText,
              fontSize: 13,
              cursor: history.index >= history.length - 1 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => { if (history.index < history.length - 1) e.currentTarget.style.backgroundColor = btnHover; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = history.index >= history.length - 1 ? (darkMode ? '#333' : '#EDEDED') : btnBg}
          >
            ↷ 重做
          </button>

          <span style={{
            fontSize: 12,
            color: darkMode ? '#999' : '#666',
            marginLeft: 8
          }}>
            {history.length > 0 ? `第${history.index + 1}步/共${history.length}步` : '暂无操作'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            fontSize: 12,
            color: darkMode ? '#999' : '#666',
            backgroundColor: btnBg,
            padding: '6px 12px',
            borderRadius: 8
          }}>
            {users.length}人协作
          </div>

          <button
            onClick={() => setDarkMode(d => !d)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: btnBg,
              color: toolbarText,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = btnHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            {darkMode ? '☀️ 浅色' : '🌙 深色'}
          </button>

          <button
            onClick={handleExport}
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#357ABD')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4A90D9')}
          >
            导出
          </button>
        </div>
      </div>

      <div ref={canvasWrapperRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {nodes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: darkMode ? '#666' : '#999',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>双击画布创建中心节点</div>
            <div style={{ fontSize: 13 }}>选中节点后按 Tab 键创建子节点</div>
          </div>
        )}
        <MindMapCanvas
          nodes={nodes}
          users={users}
          currentUserId={currentUserId}
          darkMode={darkMode}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onAddNode={handleAddNode}
          onMoveNode={handleMoveNode}
          onUpdateText={handleUpdateText}
          onDeleteNode={handleDeleteNode}
          onCursorMove={handleCursorMove}
          onDoubleClick={handleCanvasDoubleClick}
          onTabFromNode={handleTabFromNode}
        />
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
