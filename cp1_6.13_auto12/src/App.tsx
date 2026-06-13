import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './components/Editor';
import HistoryPanel from './components/HistoryPanel';
import { MindNode, Connection, Snapshot, HistoryState } from './types';

const MAX_HISTORY = 50;
const SNAPSHOT_INTERVAL = 5;

function createInitialNodes(): { nodes: MindNode[]; connections: Connection[] } {
  const rootId = uuidv4();
  const root: MindNode = {
    id: rootId,
    text: '中心主题',
    x: 0,
    y: 0,
    parentId: null,
    color: '#4A90D9',
    collapsed: false,
    width: 140,
    height: 50
  };
  return { nodes: [root], connections: [] };
}

const App: React.FC = () => {
  const initial = useRef(createInitialNodes());
  const [nodes, setNodes] = useState<MindNode[]>(initial.current.nodes);
  const [connections, setConnections] = useState<Connection[]>(initial.current.connections);

  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [operationCount, setOperationCount] = useState(0);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<HistoryState | null>(null);

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (viewportWidth < 1024 && !panelCollapsed) {
      setPanelCollapsed(true);
    } else if (viewportWidth >= 1024 && panelCollapsed) {
      setPanelCollapsed(false);
    }
  }, [viewportWidth]);

  const saveHistory = useCallback(() => {
    const state: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    };
    setUndoStack(prev => {
      const next = [...prev, state];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, [nodes, connections]);

  const applyOperation = useCallback((newNodes: MindNode[], newConnections: Connection[]) => {
    saveHistory();
    setNodes(newNodes);
    setConnections(newConnections);
    setOperationCount(prev => {
      const next = prev + 1;
      if (next % SNAPSHOT_INTERVAL === 0) {
        const snapshot: Snapshot = {
          id: uuidv4(),
          timestamp: Date.now(),
          nodes: JSON.parse(JSON.stringify(newNodes)),
          connections: JSON.parse(JSON.stringify(newConnections)),
          name: `快照 #${Math.floor(next / SNAPSHOT_INTERVAL)}`
        };
        setSnapshots(prevSnapshots => [...prevSnapshots, snapshot]);
      }
      return next;
    });
  }, [saveHistory]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) }]);
    setNodes(prev.nodes);
    setConnections(prev.connections);
  }, [undoStack, nodes, connections]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) }]);
    setNodes(next.nodes);
    setConnections(next.connections);
  }, [redoStack, nodes, connections]);

  const handleRollback = useCallback((snapshot: Snapshot) => {
    if (!isHistoryMode) {
      setLiveState({
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections))
      });
    }
    setIsHistoryMode(true);
    setCurrentSnapshotId(snapshot.id);
    setNodes(JSON.parse(JSON.stringify(snapshot.nodes)));
    setConnections(JSON.parse(JSON.stringify(snapshot.connections)));
  }, [isHistoryMode, nodes, connections]);

  const handleRestoreLatest = useCallback(() => {
    if (liveState) {
      setNodes(liveState.nodes);
      setConnections(liveState.connections);
    }
    setIsHistoryMode(false);
    setCurrentSnapshotId(null);
    setLiveState(null);
  }, [liveState]);

  const handleExportSVG = useCallback(() => {
    const svg = generateSVG(nodes, connections);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, connections]);

  const handleAddRootNode = useCallback(() => {
    if (isHistoryMode) return;
    const newNode: MindNode = {
      id: uuidv4(),
      text: '新主题',
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      parentId: null,
      color: '#4A90D9',
      collapsed: false,
      width: 120,
      height: 44
    };
    applyOperation([...nodes, newNode], connections);
  }, [nodes, connections, isHistoryMode, applyOperation]);

  function getNodeLevel(nodeId: string, nodeMap: Map<string, MindNode>): number {
    let level = 0;
    let current: MindNode | undefined = nodeMap.get(nodeId);
    while (current && current.parentId) {
      level++;
      current = nodeMap.get(current.parentId);
    }
    return level;
  }

  function generateSVG(nodes: MindNode[], connections: Connection[]): string {
    if (nodes.length === 0) return '';
    const padding = 60;
    const minX = Math.min(...nodes.map(n => n.x - n.width / 2)) - padding;
    const maxX = Math.max(...nodes.map(n => n.x + n.width / 2)) + padding;
    const minY = Math.min(...nodes.map(n => n.y - n.height / 2)) - padding;
    const maxY = Math.max(...nodes.map(n => n.y + n.height / 2)) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const levelColors: Record<number, string> = { 0: '#4A90D9', 1: '#9B59B6', 2: '#E91E63' };

    let connectionsSvg = '';
    for (const conn of connections) {
      const from = nodeMap.get(conn.fromId);
      const to = nodeMap.get(conn.toId);
      if (!from || !to) continue;
      const level = getNodeLevel(conn.toId, nodeMap);
      const color = levelColors[level] || levelColors[2];
      const sx = from.x + (to.x > from.x ? from.width / 2 : -from.width / 2);
      const sy = from.y;
      const ex = to.x + (from.x > to.x ? to.width / 2 : -to.width / 2);
      const ey = to.y;
      const mx = (sx + ex) / 2;
      const d = `M ${sx - minX} ${sy - minY} C ${mx - minX} ${sy - minY}, ${mx - minX} ${ey - minY}, ${ex - minX} ${ey - minY}`;
      connectionsSvg += `<path d="${d}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    }

    let nodesSvg = '';
    for (const node of nodes) {
      const level = getNodeLevel(node.id, nodeMap);
      const color = levelColors[level] || levelColors[2];
      const nx = node.x - minX - node.width / 2;
      const ny = node.y - minY - node.height / 2;
      nodesSvg += `
        <rect x="${nx}" y="${ny}" width="${node.width}" height="${node.height}" rx="10" ry="10"
              fill="white" stroke="${color}" stroke-width="2"
              style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.08));"/>
        <text x="${node.x - minX}" y="${node.y - minY + 5}" text-anchor="middle"
              font-family="-apple-system, sans-serif" font-size="14" font-weight="500" fill="#1F2937">
          ${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#FAFBFC;">
  ${connectionsSvg}
  ${nodesSvg}
</svg>`;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FAFBFC' }}>
      <div
        style={{
          height: 56,
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #4A90D9 0%, #9B59B6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="6" r="2" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="5" cy="18" r="2" />
              <circle cx="19" cy="18" r="2" />
              <line x1="9.5" y1="10.5" x2="6.5" y2="7.5" />
              <line x1="14.5" y1="10.5" x2="17.5" y2="7.5" />
              <line x1="9.5" y1="13.5" x2="6.5" y2="16.5" />
              <line x1="14.5" y1="13.5" x2="17.5" y2="16.5" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>协作思维导图</span>
        </div>

        <div style={{ height: 28, width: 1, background: '#E5E7EB', margin: '0 4px' }} />

        <ToolbarButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          label="新建节点"
          onClick={handleAddRootNode}
          disabled={isHistoryMode}
        />

        <ToolbarButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          }
          label="撤销"
          onClick={handleUndo}
          disabled={undoStack.length === 0 || isHistoryMode}
        />

        <ToolbarButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
          label="重做"
          onClick={handleRedo}
          disabled={redoStack.length === 0 || isHistoryMode}
        />

        <div style={{ flex: 1 }} />

        <ToolbarButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
          label="导出 SVG"
          onClick={handleExportSVG}
          primary
        />
      </div>

      {isHistoryMode && (
        <div
          style={{
            background: '#FEF3C7',
            color: '#92400E',
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexShrink: 0,
            borderBottom: '1px solid #FDE68A'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          当前处于历史版本预览模式，所有编辑操作已禁用
          <button
            onClick={handleRestoreLatest}
            style={{
              padding: '5px 14px',
              background: '#F59E0B',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              marginLeft: 8
            }}
          >
            恢复最新版本
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <HistoryPanel
          snapshots={snapshots}
          currentSnapshotId={currentSnapshotId}
          isHistoryMode={isHistoryMode}
          onRollback={handleRollback}
          onRestoreLatest={handleRestoreLatest}
          isCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
        />
        <Editor
          nodes={nodes}
          connections={connections}
          onChange={applyOperation}
          readonly={isHistoryMode}
        />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, disabled, primary }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 14px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 500,
      background: primary ? '#4A90D9' : 'transparent',
      color: primary ? '#fff' : disabled ? '#D1D5DB' : '#374151',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.5 : 1
    }}
    onMouseEnter={(e) => {
      if (!disabled && !primary) {
        (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6';
      }
    }}
    onMouseLeave={(e) => {
      if (!primary) {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default App;
