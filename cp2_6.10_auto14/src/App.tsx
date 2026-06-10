import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MindMap from './components/MindMap';
import { set as saveToStorage, get as loadFromStorage } from './utils/storage';
import type { MindMapData, MindMapNode, MindMapEdge, HistoryState } from './types';

const MAX_HISTORY = 20;
const DEFAULT_DATA: MindMapData = { nodes: [], edges: [] };

function createInitialData(): MindMapData {
  const stored = loadFromStorage();
  if (stored && stored.nodes && stored.edges) {
    return stored;
  }
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  return {
    nodes: [
      {
        id: uuidv4(),
        text: '中心主题',
        x: centerX,
        y: centerY,
        width: 120,
        height: 50,
        shape: 'rect',
        collapsed: false,
        parentId: null,
      },
    ],
    edges: [],
  };
}

export default function App() {
  const [data, setData] = useState<MindMapData>(() => createInitialData());
  const historyRef = useRef<HistoryState[]>([{ data: createInitialData(), timestamp: Date.now() }]);
  const historyIndexRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const pushHistory = useCallback((newData: MindMapData) => {
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    history.splice(idx + 1);
    history.push({ data: JSON.parse(JSON.stringify(newData)), timestamp: Date.now() });
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    historyIndexRef.current = history.length - 1;
  }, []);

  const updateData = useCallback((newData: MindMapData) => {
    setData(newData);
    pushHistory(newData);
  }, [pushHistory]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];
    setData(JSON.parse(JSON.stringify(state.data)));
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    setData(JSON.parse(JSON.stringify(state.data)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleCreateNode = useCallback(() => {
    const newNode: MindMapNode = {
      id: uuidv4(),
      text: '新节点',
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
      width: 100,
      height: 44,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      collapsed: false,
      parentId: null,
    };
    updateData({
      nodes: [...data.nodes, newNode],
      edges: data.edges,
    });
  }, [data, updateData]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(String(ev.target?.result)) as MindMapData;
        if (imported.nodes && imported.edges) {
          updateData(imported);
        } else {
          alert('导入失败：文件格式不正确');
        }
      } catch {
        alert('导入失败：无法解析 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [updateData]);

  return (
    <div className="app-container">
      <div className="toolbar">
        <button
          className="toolbar-btn"
          onClick={handleCreateNode}
          title="创建节点"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="toolbar-label">新建</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.7 3L3 13"></path>
          </svg>
          <span className="toolbar-label">撤销</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6"></path>
            <path d="M3 17a9 9 0 019-9 9 9 0 016.7 3L21 13"></path>
          </svg>
          <span className="toolbar-label">重做</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={handleExport}
          title="导出 JSON"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span className="toolbar-label">导出</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={handleImport}
          title="导入 JSON"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span className="toolbar-label">导入</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <MindMap
        data={data}
        onDataChange={setData}
        onHistoryPush={pushHistory}
      />
    </div>
  );
}
