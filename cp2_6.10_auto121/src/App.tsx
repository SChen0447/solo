import React, { useState, useRef, useCallback, useMemo } from 'react';
import MapCanvas from './components/MapCanvas';
import NodeEditor from './components/NodeEditor';
import HistoryPanel from './components/HistoryPanel';
import { useMindMapStore, MindMapNode, MindMapStore } from './utils/store';

const App: React.FC = () => {
  const store = useMindMapStore();
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      nodes: store.state.nodes,
      connections: store.state.connections
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [store.state.nodes, store.state.connections]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.nodes && data.connections) {
          store.importData(data.nodes, data.connections);
          setSelectedNode(null);
        }
      } catch (err) {
        alert('文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [store]);

  const handleAddNode = useCallback(() => {
    const node = store.createNode(200 + Math.random() * 200, 200 + Math.random() * 200);
    store.addNode(node);
  }, [store]);

  const appStyle = useMemo<React.CSSProperties>(() => ({
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    background: '#2c3e50',
    position: 'relative'
  }), [isMobile]);

  const toolbarStyle = useMemo<React.CSSProperties>(() => ({
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    background: '#2c3e50',
    padding: isMobile ? '8px 16px' : '16px 8px',
    gap: '12px',
    alignItems: 'center',
    justifyContent: isMobile ? 'flex-start' : 'flex-start',
    borderRight: isMobile ? 'none' : '1px solid #34495e',
    borderBottom: isMobile ? '1px solid #34495e' : 'none',
    width: isMobile ? '100%' : 50,
    height: isMobile ? 50 : '100%',
    flexShrink: 0,
    zIndex: 10
  }), [isMobile]);

  const buttonStyle = useMemo<React.CSSProperties>(() => ({
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 8,
    background: '#34495e',
    color: '#ecf0f1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    transition: 'all 0.2s ease'
  }), []);

  const canvasContainerStyle = useMemo<React.CSSProperties>(() => ({
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#ecf0f1'
  }), []);

  const historyButtonBaseStyle = useMemo<React.CSSProperties>(() => ({
    ...buttonStyle,
    position: 'relative'
  }), [buttonStyle]);

  return (
    <div style={appStyle}>
      <div style={toolbarStyle}>
        <button
          style={buttonStyle}
          title="新建节点"
          onClick={handleAddNode}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#34495e'; }}
        >
          ＋
        </button>
        <button
          style={buttonStyle}
          title="导出JSON"
          onClick={handleExport}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#34495e'; }}
        >
          ⬇
        </button>
        <button
          style={buttonStyle}
          title="导入JSON"
          onClick={handleImport}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#34495e'; }}
        >
          ⬆
        </button>
        <button
          style={buttonStyle}
          title="回退一步 (Ctrl+Z)"
          onClick={() => store.undo()}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#2980b9'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#34495e'; }}
        >
          ↩
        </button>
        <button
          style={historyButtonBaseStyle}
          title="历史记录"
          onClick={() => setShowHistory(!showHistory)}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = showHistory ? '#2980b9' : '#2980b9'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = showHistory ? '#2980b9' : '#34495e'; }}
        >
          {showHistory ? '✕' : '📜'}
        </button>
      </div>

      <div style={canvasContainerStyle}>
        <MapCanvas
          store={store}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
        />
      </div>

      {selectedNode && (
        <NodeEditor
          node={selectedNode}
          onUpdate={(node) => {
            store.updateNode(node);
            setSelectedNode(node);
          }}
          onClose={() => setSelectedNode(null)}
          onDelete={(id) => {
            store.deleteNode(id);
            setSelectedNode(null);
          }}
        />
      )}

      {showHistory && (
        <HistoryPanel
          store={store}
          onClose={() => setShowHistory(false)}
          isMobile={isMobile}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default App;
