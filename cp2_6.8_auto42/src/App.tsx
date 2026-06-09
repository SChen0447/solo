import { useState, useEffect, useCallback } from 'react';
import GraphCanvas from './GraphCanvas';
import TimelineView from './TimelineView';
import type { GraphNode, GraphEdge, TopologyResult, ViewMode } from './types';

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [topology, setTopology] = useState<TopologyResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [selectedCategory, setSelectedCategory] = useState<'math' | 'programming' | 'design'>('programming');
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setToolbarCollapsed(window.innerWidth < 800);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/edges'),
      ]);
      const nodesData = await nodesRes.json();
      const edgesData = await edgesRes.json();
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err) {
      console.error('获取数据失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addNode = useCallback(async (x: number, y: number) => {
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新节点',
          x,
          y,
          category: selectedCategory,
        }),
      });
      const newNode = await res.json();
      setNodes((prev) => [...prev, newNode]);
    } catch (err) {
      console.error('添加节点失败:', err);
    }
  }, [selectedCategory]);

  const updateNode = useCallback(async (id: string, updates: Partial<GraphNode>) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setNodes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error('更新节点失败:', err);
    }
  }, []);

  const deleteNode = useCallback(async (id: string) => {
    try {
      await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    } catch (err) {
      console.error('删除节点失败:', err);
    }
  }, []);

  const addEdge = useCallback(async (source: string, target: string) => {
    try {
      const res = await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          target,
          style: 'solid',
          label: '必须先修',
        }),
      });
      if (res.status === 201) {
        const newEdge = await res.json();
        setEdges((prev) => [...prev, newEdge]);
      }
    } catch (err) {
      console.error('添加边失败:', err);
    }
  }, []);

  const updateEdge = useCallback(async (id: string, updates: Partial<GraphEdge>) => {
    try {
      const res = await fetch(`/api/edges/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setEdges((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      console.error('更新边失败:', err);
    }
  }, []);

  const toggleEdgeStyle = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;
      const newStyle = edge.style === 'solid' ? 'dashed' : 'solid';
      const newLabel = newStyle === 'solid' ? '必须先修' : '建议先修';
      updateEdge(edgeId, { style: newStyle, label: newLabel });
    },
    [edges, updateEdge]
  );

  const calculateTopology = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/topology');
      const result = await res.json();
      setTopology(result);
      setShowTimeline(true);
    } catch (err) {
      console.error('计算拓扑排序失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
  };

  const categoryColors: Record<string, string> = {
    math: '#4a90d9',
    programming: '#4ab97a',
    design: '#e8a849',
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.title}>先修依赖图编辑器</div>
        {!toolbarCollapsed ? (
          <div style={styles.toolbar}>
            <div style={styles.toolGroup}>
              <span style={styles.toolLabel}>领域:</span>
              {(['math', 'programming', 'design'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    ...styles.categoryBtn,
                    backgroundColor:
                      selectedCategory === cat
                        ? categoryColors[cat]
                        : 'rgba(255,255,255,0.1)',
                    borderColor:
                      selectedCategory === cat ? categoryColors[cat] : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {cat === 'math' ? '数学' : cat === 'programming' ? '编程' : '设计'}
                </button>
              ))}
            </div>
            <div style={styles.toolGroup}>
              <button onClick={calculateTopology} style={styles.primaryBtn} disabled={loading}>
                {loading ? '计算中...' : '计算路径'}
              </button>
              <button onClick={toggleViewMode} style={styles.secondaryBtn}>
                {viewMode === 'edit' ? '预览模式' : '编辑模式'}
              </button>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                style={styles.secondaryBtn}
              >
                {showTimeline ? '隐藏路径' : '显示路径'}
              </button>
            </div>
          </div>
        ) : (
          <button style={styles.hamburgerBtn}>☰</button>
        )}
      </div>

      <div style={styles.mainContent}>
        <div style={{ ...styles.canvasContainer, flex: showTimeline ? 3 : 1 }}>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            viewMode={viewMode}
            topology={topology}
            onAddNode={addNode}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
            onAddEdge={addEdge}
            onToggleEdgeStyle={toggleEdgeStyle}
          />
        </div>

        {showTimeline && (
          <div style={styles.timelineContainer}>
            <TimelineView
              nodes={nodes}
              edges={edges}
              topology={topology}
              viewMode={viewMode}
            />
          </div>
        )}
      </div>

      {viewMode === 'edit' && (
        <div style={styles.footerHint}>
          💡 点击空白处创建节点 · 从节点拖拽到另一节点创建依赖 · 双击节点编辑标题 · 右键节点更多操作
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(26, 26, 46, 0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  secondaryBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  hamburgerBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  timelineContainer: {
    width: '320px',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    overflowY: 'auto',
  },
  footerHint: {
    padding: '10px 24px',
    background: 'rgba(26, 26, 46, 0.6)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
};

export default App;
