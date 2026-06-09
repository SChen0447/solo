import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { StoryNode, StoryConnection, StoryGraph, NodeType, StoryChoice } from './types';
import { NODE_WIDTH, NODE_HEIGHT } from './types';
import NodePalette from './components/NodePalette';
import DialogEditor from './components/DialogEditor';
import NodeEditor from './components/NodeEditor';
import PreviewMode from './components/PreviewMode';
import Toast from './components/Toast';

function App() {
  const [graph, setGraph] = useState<StoryGraph>({
    nodes: [],
    connections: [],
    rootNodeId: null,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<StoryNode | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    const id = uuidv4();
    setToast({ message, id });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const res = await fetch('/api/graph');
        if (res.ok) {
          const data = (await res.json()) as StoryGraph;
          setGraph(data);
        }
      } catch {
        showToast('无法连接服务器，使用空画布');
      } finally {
        setIsLoading(false);
      }
    };
    loadGraph();
  }, [showToast]);

  const addNode = useCallback(
    (type: NodeType, parentNodeId?: string, dropX?: number, dropY?: number) => {
      const id = uuidv4();
      let x = dropX ?? 300;
      let y = dropY ?? 200;

      if (parentNodeId && dropX === undefined) {
        const parent = graph.nodes.find((n) => n.id === parentNodeId);
        if (parent) {
          x = parent.x + NODE_WIDTH + 80;
          y = parent.y;
        }
      }

      const defaults: Record<NodeType, Partial<StoryNode>> = {
        dialog: {
          title: '对话节点',
          content: '在此输入对话内容...',
        },
        choice: {
          title: '选择节点',
          content: '请做出选择：',
          choices: [
            { id: uuidv4(), label: '选项一', nextNodeId: null },
            { id: uuidv4(), label: '选项二', nextNodeId: null },
          ],
        },
        event: {
          title: '事件节点',
          content: '触发一个特殊事件...',
          eventData: '',
        },
      };

      const newNode: StoryNode = {
        id,
        type,
        title: defaults[type]?.title ?? '新节点',
        content: defaults[type]?.content ?? '',
        x,
        y,
        choices: defaults[type]?.choices,
        eventData: defaults[type]?.eventData,
      };

      setGraph((prev) => {
        const newConnections: StoryConnection[] = [...prev.connections];
        if (parentNodeId) {
          newConnections.push({
            id: uuidv4(),
            fromNodeId: parentNodeId,
            toNodeId: id,
            label: '继续',
          });
        }
        return {
          ...prev,
          nodes: [...prev.nodes, newNode],
          connections: newConnections,
          rootNodeId: prev.rootNodeId ?? id,
        };
      });

      showToast(`已创建${type === 'dialog' ? '对话' : type === 'choice' ? '选择' : '事件'}节点`);
    },
    [graph.nodes, showToast]
  );

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
      ),
    }));
  }, []);

  const updateNode = useCallback((updatedNode: StoryNode) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
    }));
    setEditingNode(null);
    showToast('节点已更新');
  }, [showToast]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setGraph((prev) => {
        const remainingNodes = prev.nodes.filter((n) => n.id !== nodeId);
        const remainingConnections = prev.connections.filter(
          (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
        );
        const newRoot = prev.rootNodeId === nodeId ? remainingNodes[0]?.id ?? null : prev.rootNodeId;

        const cleanedNodes = remainingNodes.map((n) => {
          if (n.choices) {
            return {
              ...n,
              choices: n.choices.map((ch) =>
                ch.nextNodeId === nodeId ? { ...ch, nextNodeId: null } : ch
              ),
            };
          }
          return n;
        });

        return {
          nodes: cleanedNodes,
          connections: remainingConnections,
          rootNodeId: newRoot,
        };
      });
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      showToast('节点已删除');
    },
    [selectedNodeId, showToast]
  );

  const addConnection = useCallback(
    (fromNodeId: string, toNodeId: string, fromChoiceId?: string, label?: string) => {
      if (fromNodeId === toNodeId) return;

      setGraph((prev) => {
        const exists = prev.connections.some(
          (c) =>
            c.fromNodeId === fromNodeId &&
            c.toNodeId === toNodeId &&
            (c.fromChoiceId ?? null) === (fromChoiceId ?? null)
        );
        if (exists) return prev;

        const newConn: StoryConnection = {
          id: uuidv4(),
          fromNodeId,
          toNodeId,
          fromChoiceId,
          label,
        };

        const updatedNodes = prev.nodes.map((n) => {
          if (n.id === fromNodeId && n.choices && fromChoiceId) {
            return {
              ...n,
              choices: n.choices.map((ch) =>
                ch.id === fromChoiceId ? { ...ch, nextNodeId: toNodeId } : ch
              ),
            };
          }
          return n;
        });

        return {
          ...prev,
          nodes: updatedNodes,
          connections: [...prev.connections, newConn],
        };
      });
    },
    []
  );

  const deleteConnection = useCallback((connId: string) => {
    setGraph((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connId),
    }));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '保存成功');
      } else {
        showToast(data.error || '保存失败');
      }
    } catch {
      showToast('保存失败：无法连接服务器');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-weaver-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出JSON');
  };

  const validateGraph = (data: unknown): data is StoryGraph => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.connections)) return false;
    return true;
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!validateGraph(data)) {
          showToast('导入失败：JSON格式不正确');
          return;
        }
        setGraph(data);
        showToast('导入成功');
      } catch {
        showToast('导入失败：无效的JSON文件');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const autoLayout = useCallback(() => {
    if (!graph.rootNodeId) {
      showToast('没有根节点，无法自动布局');
      return;
    }

    setIsAnimating(true);
    const LEVEL_GAP = 150;
    const NODE_GAP = 100;

    const levels: string[][] = [];
    const visited = new Set<string>();
    const queue: { id: string; level: number }[] = [{ id: graph.rootNodeId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (!levels[level]) levels[level] = [];
      levels[level].push(id);

      const outgoing = graph.connections.filter((c) => c.fromNodeId === id);
      for (const conn of outgoing) {
        if (!visited.has(conn.toNodeId)) {
          queue.push({ id: conn.toNodeId, level: level + 1 });
        }
      }
    }

    const orphanNodes = graph.nodes.filter((n) => !visited.has(n.id));
    if (orphanNodes.length > 0) {
      levels.push(orphanNodes.map((n) => n.id));
    }

    setGraph((prev) => {
      const newNodes = prev.nodes.map((node) => {
        let levelIdx = -1;
        let nodeIdx = -1;
        for (let l = 0; l < levels.length; l++) {
          const idx = levels[l].indexOf(node.id);
          if (idx !== -1) {
            levelIdx = l;
            nodeIdx = idx;
            break;
          }
        }
        if (levelIdx === -1) return node;

        const countInLevel = levels[levelIdx].length;
        const totalWidth = countInLevel * NODE_WIDTH + (countInLevel - 1) * NODE_GAP;
        const startX = 100;
        const x = startX + nodeIdx * (NODE_WIDTH + NODE_GAP);
        const y = 80 + levelIdx * (NODE_HEIGHT + LEVEL_GAP);

        return { ...node, x, y };
      });

      return { ...prev, nodes: newNodes };
    });

    setTimeout(() => setIsAnimating(false), 400);
    showToast('自动布局完成');
  }, [graph, showToast]);

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (isLoading) {
    return (
      <div className="app">
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#E94560',
          }}
        >
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="toolbar">
        <div className="toolbar-title">剧情编织者 v0.1</div>
        <div className="toolbar-actions">
          <button className="tool-btn" onClick={autoLayout}>
            自动排列
          </button>
          <button className="tool-btn" onClick={() => setIsPreviewMode(true)}>
            预览
          </button>
          <button className="tool-btn primary" onClick={handleSave}>
            保存
          </button>
          <button className="tool-btn" onClick={handleExport}>
            导出JSON
          </button>
          <button className="tool-btn" onClick={() => fileInputRef.current?.click()}>
            导入JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="file-input-hidden"
            accept=".json,application/json"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="main-content">
        <NodePalette onAddNode={addNode} />

        <DialogEditor
          graph={graph}
          canvasRef={canvasRef}
          isAnimating={isAnimating}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNodePosition={updateNodePosition}
          onAddNode={addNode}
          onEditNode={(n) => setEditingNode(n)}
          onDeleteNode={deleteNode}
          onAddConnection={addConnection}
          onDeleteConnection={deleteConnection}
        />
      </div>

      <div className="status-bar">
        <div className="status-info">
          <div className="status-item">
            节点数: <span>{graph.nodes.length}</span>
          </div>
          <div className="status-item">
            连接数: <span>{graph.connections.length}</span>
          </div>
          <div className="status-item">
            根节点: <span>{graph.rootNodeId ? '已设置' : '未设置'}</span>
          </div>
        </div>
        <div className="status-item">
          提示: 从左侧拖拽节点到画布 · 双击节点编辑 · 从端口拖出连线
        </div>
      </div>

      {editingNode && (
        <NodeEditor
          node={editingNode}
          allNodes={graph.nodes}
          onSave={updateNode}
          onCancel={() => setEditingNode(null)}
        />
      )}

      {isPreviewMode && (
        <PreviewMode
          graph={graph}
          onClose={() => setIsPreviewMode(false)}
        />
      )}

      {toast && <Toast message={toast.message} />}
    </div>
  );
}

export default App;
